'use strict';

/**
 * server/worker.js
 *
 * Standalone BullMQ Worker process for processing code submissions.
 *
 * Run as:  node worker.js   (docker-compose: worker service)
 *
 * Phase 7 additions:
 *  - Pino structured logging — every log line carries jobId + submissionId
 *  - Graceful shutdown on SIGTERM:
 *      · worker.close() drains any active jobs (BullMQ waits for them to finish)
 *      · Hard-kill timeout of WORKER_SHUTDOWN_TIMEOUT_MS (default 90s) prevents
 *        an infinite hang if a Judge0 call never returns
 *      · MongoDB and Redis are disconnected cleanly after draining
 *  - Unhandled rejection / uncaught exception guards
 *
 * Retry semantics (unchanged from Phase 6):
 * ─────────────────────────────────────────────────────────────────────────────
 * The processor THROWS only on unexpected infrastructure errors (Judge0 down,
 * network timeout, etc.) — these trigger BullMQ's 3-attempt exponential retry.
 *
 * It RESOLVES on any valid judge result (Wrong Answer, Compilation Error, etc.)
 * because those are correct, final results — retrying wouldn't change them.
 *
 * After all retries are exhausted, the failed-job handler marks the Submission
 * document as 'Error' so it never stays stuck in 'Queued' forever.
 */

require('dotenv').config();

const mongoose     = require('mongoose');
const { Worker }   = require('bullmq');

const logger      = require('./config/logger');
const { QUEUE_NAME, connection } = require('./queues/submissionQueue');
const Submission   = require('./models/Submission');
const Problem      = require('./models/Problem');
const User         = require('./models/User');
const codeExecutor = require('./utils/codeExecutor');
const cache        = require('./utils/cache');

// ── MongoDB connection ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('MongoDB connected'))
    .catch((err) => { logger.error({ err }, 'MongoDB connection failed'); process.exit(1); });

// ── Job processor ─────────────────────────────────────────────────────────────
async function processSubmission(job) {
    const { submissionId, problemId, code, language, contestId, userId } = job.data;

    // Child logger bound to this job — every line automatically includes jobId + submissionId
    const log = logger.child({ jobId: job.id, submissionId });

    log.info({ problemId, language }, 'Job picked up');

    // Mark as Processing so the frontend can show a progress state
    await Submission.findByIdAndUpdate(submissionId, { status: 'Processing' });

    // Fetch the full problem (needed for testCases + cppWrapper)
    const problem = await Problem.findById(problemId);
    if (!problem) {
        log.warn('Problem not found — resolving without retry (problem was deleted)');
        await Submission.findByIdAndUpdate(submissionId, { status: 'Error' });
        return; // Resolve — retrying won't help if the problem is gone
    }

    // ── Call Judge0 via codeExecutor ──────────────────────────────────────────
    // If this THROWS, BullMQ will retry (infrastructure failure).
    // If it RETURNS, we handle the result regardless of pass/fail (no retry).
    const t0 = Date.now();
    const executionResult = await codeExecutor.executeCode(
        code,
        problem.testCases,
        language,
        problem
    );
    const execMs = Date.now() - t0;

    const isAccepted = executionResult.status === 'Accepted';

    log.info(
        { status: executionResult.status, execMs, isAccepted },
        'Execution complete'
    );

    // ── Update Submission document ────────────────────────────────────────────
    await Submission.findByIdAndUpdate(submissionId, {
        status:      executionResult.status,
        testResults: executionResult.testResults,
        runtime:     executionResult.runtime,
        memory:      executionResult.memory,
    });

    // ── Update Problem counters ───────────────────────────────────────────────
    await Problem.findByIdAndUpdate(problemId, {
        $inc: {
            totalSubmissions: 1,
            ...(isAccepted ? { acceptedSubmissions: 1 } : {}),
        },
    });

    // Recalculate acceptanceRate
    const updated = await Problem.findById(problemId).select('totalSubmissions acceptedSubmissions');
    if (updated && updated.totalSubmissions > 0) {
        await Problem.findByIdAndUpdate(problemId, {
            $set: {
                acceptanceRate: (
                    (updated.acceptedSubmissions / updated.totalSubmissions) * 100
                ).toFixed(2),
            },
        });
    }

    // ── Update User.solvedProblems ────────────────────────────────────────────
    if (isAccepted && userId) {
        await User.findByIdAndUpdate(userId, {
            $addToSet: { solvedProblems: problemId },
        });
        log.info({ userId, problemId }, 'Problem marked as solved for user');
    }

    // ── Cache invalidation ────────────────────────────────────────────────────
    // acceptanceRate changed → flush problem list cache
    await cache.delPattern('problems:list:*');

    // Accepted contest submission → flush leaderboard cache
    if (contestId && isAccepted) {
        await cache.del(`contests:leaderboard:${contestId}`);
        log.info({ contestId }, 'Leaderboard cache invalidated');
    }

    log.info({ status: executionResult.status }, 'Job complete');
}

// ── Create worker ─────────────────────────────────────────────────────────────
const worker = new Worker(QUEUE_NAME, processSubmission, {
    connection,
    // concurrency: 2 — process up to 2 jobs simultaneously per worker instance.
    // Scale horizontally via `docker compose up --scale worker=N` for more throughput.
    concurrency: 2,
});

worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed');
});

worker.on('failed', async (job, err) => {
    const log = logger.child({ jobId: job.id, submissionId: job.data?.submissionId });
    log.error(
        { err, attemptsMade: job.attemptsMade, maxAttempts: job.opts.attempts },
        'Job failed'
    );

    // After all retries exhausted, mark submission as Error so it never
    // gets stuck in 'Queued' or 'Processing' permanently.
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
        const submissionId = job.data?.submissionId;
        if (submissionId) {
            try {
                await Submission.findByIdAndUpdate(submissionId, { status: 'Error' });
                log.error('Marked submission as Error after exhausting all retries');
            } catch (updateErr) {
                log.error({ err: updateErr }, 'Could not mark submission as Error');
            }
        }
    }
});

worker.on('error', (err) => {
    logger.error({ err }, 'Worker internal error');
});

logger.info({ queue: QUEUE_NAME, concurrency: 2 }, 'Worker started');

// ── Graceful shutdown ─────────────────────────────────────────────────────────
//
// On SIGTERM (Docker stop / K8s rolling update):
//   1. worker.close() tells BullMQ to:
//      a. Stop picking up new jobs from the queue.
//      b. Wait for any currently-executing jobs to finish naturally.
//      This means a job that's mid-Judge0-call will run to completion before
//      the process exits — it won't be silently dropped.
//   2. After draining, disconnect Mongo and Redis cleanly.
//   3. A hard-kill timeout (default 90s) prevents hanging forever if a
//      Judge0 call stalls (e.g. a stuck infinite loop submission).
//
// WHY 90s (not 30s like the API server)?
//   A code execution job can take up to ~30s per test case × multiple cases.
//   We allow up to 90s to let the current job batch complete. If it still
//   hasn't finished, the job will be retried by another worker on restart.

const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.WORKER_SHUTDOWN_TIMEOUT_MS || '90000', 10);
let isShuttingDown = false;

async function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal }, 'Shutdown signal received — waiting for in-flight jobs to complete');

    // Hard-kill safety net
    const forceExit = setTimeout(() => {
        logger.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'Graceful shutdown timed out — forcing exit');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
        // worker.close() blocks until all active jobs finish (or forcibly drains after timeout)
        await worker.close();
        logger.info('Worker drained — all in-flight jobs completed');

        await mongoose.disconnect();
        logger.info('MongoDB disconnected');

        // Note: the shared ioredis connection from submissionQueue.js is managed
        // by BullMQ internally; it will be closed when the worker closes.
        logger.info('Redis connections closed via BullMQ worker teardown');
    } catch (err) {
        logger.error({ err }, 'Error during shutdown teardown');
    }

    clearTimeout(forceExit);
    logger.info('Worker shutdown complete');
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled error guards ────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection in worker — initiating shutdown');
    shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception in worker — exiting immediately');
    process.exit(1);
});
