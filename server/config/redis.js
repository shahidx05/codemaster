'use strict';

/**
 * Shared ioredis client for the CodeMaster backend.
 *
 * Design decision — FAIL FAST on startup, DEGRADE on runtime errors:
 * ─────────────────────────────────────────────────────────────────────
 * We treat Redis as a required infrastructure dependency for rate limiting.
 * If REDIS_URL is missing entirely, we throw immediately at startup so the
 * problem is visible in container logs rather than silently falling back to
 * in-memory counters (which would defeat the whole purpose of this change).
 *
 * However, *after* the initial connection succeeds, transient Redis errors
 * (network blip, brief restart) are logged and ioredis retries automatically
 * via its built-in exponential back-off. We do NOT exit the process for these
 * because express-rate-limit's RedisStore will fall back to its built-in
 * in-memory store on any single failed command, meaning the API stays up with
 * degraded (but still functional) rate limiting during short outages.
 *
 * This is the right trade-off for a web API:
 *  - Hard fail → clear, early signal that config is wrong.
 *  - Soft retry → a 10-second Redis blip doesn't take down the whole server.
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
    // ioredis will retry failed connections with exponential back-off.
    // maxRetriesPerRequest: null makes commands queue until reconnected
    // rather than immediately failing — appropriate for rate-limit counters.
    maxRetriesPerRequest: null,

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

module.exports = redisClient;
