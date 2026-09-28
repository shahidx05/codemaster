'use strict';

/**
 * server/worker.js
 *
 * Standalone BullMQ Worker process for processing code submissions.
 *
 * Run as:  node server/worker.js   (in docker-compose: worker service)
 *
 * Responsibilities:
 *  1. Dequeue submission jobs from the 'submissions' BullMQ queue.
 *  2. Call codeExecutor.executeCode() with the job payload.
 *  3. Update the Submission document with real results.
 *  4. Update Problem counters (totalSubmissions, acceptedSubmissions, acceptanceRate).
 *  5. Update User.solvedProblems if the submission is Accepted.
 *  6. Invalidate the Redis problem-list cache (acceptanceRate changed).
 *  7. Invalidate the Redis leaderboard cache if it's a contest submission.
 *
 * Retry semantics (critical design decision):
 * ─────────────────────────────────────────────────────────────────────────────
 * BullMQ retries a job when the processor function THROWS.
 * A processor that resolves (returns) is treated as success — no retry.
 *
 * We THROW only when codeExecutor itself throws an unexpected error
 * (e.g. Judge0 API is down, network timeout, unhandled exception).
 * In these cases, 3 attempts with exponential back-off (2s→4s→8s) fire.
 *
 * We do NOT throw — we resolve — when:
 *   - codeExecutor returns a result, even if status is Wrong Answer,
 *     Compilation Error, Runtime Error, Time/Memory Limit Exceeded.
 * These are semantically correct results from the judge. Retrying would
 * not change the outcome and would waste Judge0 API credits.
 *
 * After 3 failed attempts (all throwing), the failed-job event handler
 * marks the Submission document as 'Error' so it never stays in 'Queued'.
 */

// Load .env before anything else (important: worker is its own process)
require('dotenv').config();

const mongoose     = require('mongoose');
const { Worker }   = require('bullmq');
const { QUEUE_NAME, connection } = require('./queues/submissionQueue');
const Submission   = require('./models/Submission');
const Problem      = require('./models/Problem');
const User         = require('./models/User');
const codeExecutor = require('./utils/codeExecutor');
const cache        = require('./utils/cache');

// ── MongoDB connection ────────────────────────────────────────────────────────

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('[worker] MongoDB connected'))
    .catch(err => { console.error('[worker] MongoDB connection error:', err.message); process.exit(1); });

// ── Job processor ─────────────────────────────────────────────────────────────

async function processSubmission(job) {
    const { submissionId, problemId, code, language, contestId, userId } = job.data;
    console.log(`[worker] Processing job ${job.id} — submission ${submissionId}`);

    // Mark as Processing so the frontend can show an in-progress state
    await Submission.findByIdAndUpdate(submissionId, { status: 'Processing' });

    // Fetch the full problem (needed for testCases + cppWrapper)
    const problem = await Problem.findById(problemId);
    if (!problem) {
        // Problem was deleted between enqueue and processing — treat as error
        await Submission.findByIdAndUpdate(submissionId, { status: 'Error' });
        console.warn(`[worker] Problem ${problemId} not found for submission ${submissionId}`);
        return; // Resolve (don't retry — the problem is genuinely gone)
    }

    // ── Call Judge0 via codeExecutor ──────────────────────────────────────────
    // If this throws, BullMQ will retry (transient infrastructure failure).
    // If it returns, we handle the result regardless of pass/fail — no retry.
    const executionResult = await codeExecutor.executeCode(
        code,
        problem.testCases,
        language,
        problem
    );

    const isAccepted = executionResult.status === 'Accepted';

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

    // Recalculate acceptance rate
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
    }

    // ── Cache invalidation ────────────────────────────────────────────────────
    // acceptanceRate changed → flush problem list cache
    await cache.delPattern('problems:list:*');

    // Accepted contest submission → flush leaderboard cache
    if (contestId && isAccepted) {
        await cache.del(`contests:leaderboard:${contestId}`);
    }

    console.log(`[worker] Job ${job.id} done — submission ${submissionId} status: ${executionResult.status}`);
}

// ── Create worker ─────────────────────────────────────────────────────────────

const worker = new Worker(QUEUE_NAME, processSubmission, {
    connection,
    // Process one job at a time per worker instance.
    // Scale horizontally by running more worker containers.
    concurrency: 2,
});

worker.on('completed', (job) => {
    console.log(`[worker] Job ${job.id} completed`);
});

worker.on('failed', async (job, err) => {
    console.error(`[worker] Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}):`, err.message);

    // After all retries are exhausted, mark the submission as Error
    // so it never stays stuck in 'Queued' or 'Processing' forever.
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
        const submissionId = job.data?.submissionId;
        if (submissionId) {
            try {
                await Submission.findByIdAndUpdate(submissionId, { status: 'Error' });
                console.error(`[worker] Marked submission ${submissionId} as Error after ${job.attemptsMade} failed attempts`);
            } catch (updateErr) {
                console.error('[worker] Could not mark submission as Error:', updateErr.message);
            }
        }
    }
});

worker.on('error', (err) => {
    console.error('[worker] Worker error:', err.message);
});

console.log(`[worker] Listening on queue "${QUEUE_NAME}" (concurrency: 2)`);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[worker] SIGTERM received — closing worker gracefully...');
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
});
