'use strict';

/**
 * server/queues/submissionQueue.js
 *
 * Defines the shared BullMQ Queue used by the API to enqueue jobs,
 * and the shared QueueEvents used to observe job lifecycle.
 *
 * The Worker (server/worker.js) is intentionally defined separately so it
 * can run in its own process without importing the Express app.
 *
 * BullMQ requires its own ioredis connection — it cannot share the
 * connection used for rate-limiting or caching because BullMQ blocks
 * the connection during BRPOP. We create a dedicated connection here.
 */

const { Queue } = require('bullmq');

const QUEUE_NAME = 'submissions';

// BullMQ connection options — used by Queue (producer side).
// The Worker creates its own identical connection in worker.js.
const connection = {
    host: (() => {
        try {
            const url = new URL(process.env.REDIS_URL || 'redis://redis:6379');
            return url.hostname;
        } catch {
            return 'redis';
        }
    })(),
    port: (() => {
        try {
            const url = new URL(process.env.REDIS_URL || 'redis://redis:6379');
            return Number(url.port) || 6379;
        } catch {
            return 6379;
        }
    })(),
    maxRetriesPerRequest: null,
};

const submissionQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        // ── Retry policy ───────────────────────────────────────────────────────
        // We retry ONLY on transient infrastructure failures (network errors,
        // Judge0 API timeouts, unexpected exceptions in the worker).
        //
        // We do NOT retry on:
        //   - Wrong Answer     → correct result, user's code is wrong
        //   - Compilation Error → correct result, user's code won't compile
        //   - Runtime Error    → correct result, user's code crashed
        //   - Time/Memory Limit Exceeded → correct result
        //
        // The worker enforces this distinction: it only throws (triggering a
        // retry) when codeExecutor itself throws an unexpected error.
        // When codeExecutor returns a result — even a failing one — the worker
        // saves it and resolves the job successfully (no retry).
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,  // 2s → 4s → 8s
        },
        removeOnComplete: {
            age: 60 * 60 * 24,   // keep completed jobs 24h for debugging
            count: 500,
        },
        removeOnFail: {
            age: 60 * 60 * 24 * 7, // keep failed jobs 7 days for post-mortem
        },
    },
});

module.exports = { submissionQueue, QUEUE_NAME, connection };
