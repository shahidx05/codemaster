'use strict';

/**
 * server/utils/cache.js
 *
 * Thin Redis cache-aside helper using the shared ioredis client.
 *
 * API
 * ───
 *   getOrSet(key, ttlSeconds, fetchFn)
 *     → returns cached JSON value if key exists in Redis;
 *       otherwise calls fetchFn(), stores the result, and returns it.
 *
 *   del(key)
 *     → deletes a single key (point invalidation).
 *
 *   delPattern(pattern)
 *     → scans and deletes all keys matching a glob pattern, e.g. 'problems:list:*'.
 *       Uses SCAN (non-blocking) instead of KEYS to be production-safe.
 *
 * Error handling
 * ──────────────
 * Every Redis error is caught and logged.  The function falls through to the
 * database so a Redis hiccup never surfaces as a 5xx to the client.
 */

const redis = require('../config/redis');

/**
 * @param {string}   key          Redis key
 * @param {number}   ttlSeconds   Expiry in seconds
 * @param {Function} fetchFn      Async function that returns the value to cache
 * @returns {Promise<any>}
 */
async function getOrSet(key, ttlSeconds, fetchFn) {
    try {
        const cached = await redis.get(key);
        if (cached !== null) {
            console.log(`[cache] HIT  ${key}`);
            return JSON.parse(cached);
        }
    } catch (err) {
        console.error(`[cache] Redis GET error for key "${key}":`, err.message);
        // Fall through to DB
    }

    console.log(`[cache] MISS ${key}`);
    const value = await fetchFn();

    try {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
        console.error(`[cache] Redis SET error for key "${key}":`, err.message);
        // Non-fatal — return the value even if caching fails
    }

    return value;
}

/**
 * Delete a single cache key.
 * @param {string} key
 */
async function del(key) {
    try {
        const n = await redis.del(key);
        if (n > 0) console.log(`[cache] DEL  ${key}`);
    } catch (err) {
        console.error(`[cache] Redis DEL error for key "${key}":`, err.message);
    }
}

/**
 * Delete all keys matching a glob pattern using non-blocking SCAN.
 * @param {string} pattern  e.g. 'problems:list:*'
 */
async function delPattern(pattern) {
    try {
        let cursor = '0';
        let deleted = 0;
        do {
            const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = nextCursor;
            if (keys.length > 0) {
                await redis.del(...keys);
                deleted += keys.length;
            }
        } while (cursor !== '0');

        if (deleted > 0) console.log(`[cache] DEL  pattern="${pattern}" (${deleted} keys)`);
    } catch (err) {
        console.error(`[cache] Redis SCAN/DEL error for pattern "${pattern}":`, err.message);
    }
}

module.exports = { getOrSet, del, delPattern };
