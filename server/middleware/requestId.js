'use strict';

/**
 * server/middleware/requestId.js
 *
 * Correlation-ID middleware.
 *
 * For every incoming request:
 *   1. Reads X-Request-Id from the client (if present and valid UUID) — useful
 *      when an upstream proxy or load balancer already assigned an ID.
 *   2. Falls back to generating a new UUID v4.
 *   3. Writes the final ID back on the response as X-Request-Id so the client
 *      can report it when they encounter an error.
 *   4. Attaches it to `req.requestId` for use in controllers / error handlers.
 *   5. Creates a child pino logger bound to `{ requestId }` and attaches it to
 *      `req.log` — this is the logger controllers should use so every line
 *      automatically carries the correlation ID.
 *
 * This runs BEFORE pino-http so that pino-http can pick up req.log.
 */

const { randomUUID } = require('crypto');
const logger = require('../config/logger');

// Simple UUID v4 pattern check — prevents clients injecting arbitrary strings
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requestId(req, res, next) {
    const incomingId = req.headers['x-request-id'];
    const id = (incomingId && UUID_RE.test(incomingId))
        ? incomingId
        : randomUUID();

    req.requestId = id;
    res.setHeader('X-Request-Id', id);

    // Bind the correlation ID to every log line produced during this request
    req.log = logger.child({ requestId: id });

    next();
}

module.exports = requestId;
