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

const Redis = require('ioredis');

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
    connectionName: 'codemaster-rate-limit',
});

redisClient.on('connect', () => {
    console.log('[redis] Connected to Redis at', process.env.REDIS_URL);
});

redisClient.on('ready', () => {
    console.log('[redis] Redis client ready — rate-limit stores active');
});

redisClient.on('error', (err) => {
    // Log but do NOT call process.exit(). ioredis retries automatically.
    // express-rate-limit will fall back to in-memory for the failing window.
    console.error('[redis] Redis client error:', err.message);
});

redisClient.on('close', () => {
    console.warn('[redis] Redis connection closed — retrying...');
});

redisClient.on('reconnecting', (delay) => {
    console.warn(`[redis] Reconnecting in ${delay}ms...`);
});

module.exports = redisClient;
