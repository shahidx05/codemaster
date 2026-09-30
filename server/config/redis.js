'use strict';

/**
 * Shared ioredis client for the CodeMaster backend.
 *
 * Design decision — FAIL FAST on startup, DEGRADE on runtime errors:
 * ─────────────────────────────────────────────────────────────────────
 * We treat Redis as a required infrastructure dependency for rate limiting.
 * If REDIS_URL is missing entirely, we throw immediately at startup so the
 * problem is visible in container logs.
 *
 * However, *after* the initial connection succeeds, if Redis goes down, we
 * want the API to continue serving requests rather than hanging indefinitely.
 * We configure the client to bound the worst-case wait using commandTimeout and
 * maxRetriesPerRequest, ensuring rate limiters fail-open immediately via
 * `passOnStoreError` instead of piling up pending requests and causing the app to hang.
 * We leave enableOfflineQueue as true (the default) so that critical startup
 * commands (like RedisStore.init) can queue briefly and recover if Redis comes back.
 *
 * This is the right trade-off for a web API:
 *  - Hard fail on missing config → clear, early signal.
 *  - Fail-fast on runtime commands → Redis blips don't take down the server.
 */

const Redis  = require('ioredis');
const logger = require('./logger');

if (!process.env.REDIS_URL) {
    throw new Error(
        '[redis] REDIS_URL environment variable is not set. ' +
        'Set it to a valid Redis connection string (e.g. redis://redis:6379) before starting the server.'
    );
}

const redisClient = new Redis(process.env.REDIS_URL, {
    // Instead of waiting infinitely, fail the command if retries are exhausted.
    maxRetriesPerRequest: 1,

    // Any command taking longer than 3 seconds will fail.
    // Together with maxRetriesPerRequest: 1, this bounds the worst-case wait
    // so no request can hang indefinitely during an outage.
    // Note: We leave enableOfflineQueue as true (default) so that early startup
    // commands (like RedisStore.init() SCRIPT LOAD) queue briefly and can succeed
    // if Redis reconnects, preventing permanent fail-open bugs.
    commandTimeout: 3000,

    // Log a clear error if the initial connection is refused, but don't crash
    // (ioredis will keep retrying; the 'error' event below handles logging).
    lazyConnect: false,

    // Identify this client in Redis CLIENT LIST output for debugging.
    connectionName: 'codemaster-api',
});

redisClient.on('connect',      () => logger.info({ url: process.env.REDIS_URL }, 'Redis connected'));
redisClient.on('ready',        () => logger.info('Redis client ready'));
redisClient.on('error',        (err) => logger.error({ err }, 'Redis client error'));
redisClient.on('close',        () => logger.warn('Redis connection closed — retrying...'));
redisClient.on('reconnecting', (delay) => logger.warn({ delay }, 'Redis reconnecting'));

/**
 * Returns a Promise that resolves when the Redis client emits 'ready'.
 * Rejects if the client doesn't become ready within timeoutMs.
 */
function waitForRedisReady(timeoutMs = 30000) {
    if (redisClient.status === 'ready') return Promise.resolve();

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            redisClient.removeListener('ready', onReady);
            reject(new Error(`Redis failed to become ready within ${timeoutMs}ms`));
        }, timeoutMs);

        const onReady = () => {
            clearTimeout(timeout);
            resolve();
        };

        redisClient.once('ready', onReady);
    });
}

module.exports = {
    redisClient,
    waitForRedisReady,
};
