'use strict';

/**
 * server/server.js
 *
 * Express application entry point.
 *
 * Observability & resilience additions (Phase 7):
 *  - Pino structured logging (JSON in prod, pretty in dev) via pino-http
 *  - Per-request correlation ID (X-Request-Id header, forwarded in error responses)
 *  - GET /health  — liveness probe  (is the process up?)
 *  - GET /ready   — readiness probe (can the process actually serve traffic?)
 *  - Graceful shutdown on SIGTERM: drain in-flight requests → close DB/Redis → exit
 *  - Unhandled rejection / uncaught exception handlers
 */

// ── Bootstrap ─────────────────────────────────────────────────────────────────
require('dotenv').config();

const express        = require('express');
const mongoose       = require('mongoose');
const cors           = require('cors');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const pinoHttp       = require('pino-http');

const logger      = require('./config/logger');
const redisClient = require('./config/redis');
const requestId   = require('./middleware/requestId');

const authRoutes       = require('./routes/auth');
const problemRoutes    = require('./routes/problems');
const submissionRoutes = require('./routes/submissions');
const contestRoutes    = require('./routes/contests');

// ── App setup ─────────────────────────────────────────────────────────────────
const app = express();

// 1. Correlation-ID first — every downstream middleware gets req.log
app.use(requestId);

// 2. pino-http request/response logging
//    Reuses req.log (already bound to requestId) so log lines are correlated.
app.use(pinoHttp({
    logger,
    // Use the child logger created by the requestId middleware so the
    // requestId field is automatically included in every request log line.
    genReqId: (req) => req.requestId,
    // Don't log health/ready probes — they'd flood the logs
    autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/ready',
    },
    customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },
    serializers: {
        req: (req) => ({
            method: req.method,
            url:    req.url,
            // Don't log body — may contain code/secrets
        }),
        res: (res) => ({
            statusCode: res.statusCode,
        }),
    },
}));

// 3. Security headers
app.use(helmet());

// 4. CORS
const allowedOrigins = (process.env.CLIENT_ORIGIN || '').split(',').filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));

// 5. Body size cap
app.use(express.json({ limit: '10kb' }));

// ── Rate limiters ─────────────────────────────────────────────────────────────
// Backed by shared Redis — restart-resilient and replica-consistent.

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:global:',
    }),
});

// Submission limiter: 10/min for actual POSTs only.
// GET /status polling is intentionally excluded so polling doesn't burn the quota.
const submissionLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { message: 'Too many submissions. Please wait before submitting again.' },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:submissions:',
    }),
});

app.use(globalLimiter);
app.use('/api/submissions', (req, res, next) => {
    if (req.method === 'POST') return submissionLimiter(req, res, next);
    next();
});

// ── MongoDB connection ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('MongoDB connected'))
    .catch((err) => logger.error({ err }, 'MongoDB connection error'));

// ── Liveness probe ────────────────────────────────────────────────────────────
// Returns 200 as long as the Node process is running.
// Used by Docker HEALTHCHECK and Kubernetes liveness probes.
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// ── Readiness probe ───────────────────────────────────────────────────────────
// Returns 200 only when the process can actually serve traffic:
//   - MongoDB is connected
//   - Redis is connected
// Used by Kubernetes readiness probes / load balancers.
// The /ready endpoint is excluded from the global rate limiter because
// orchestrators poll it frequently.
app.get('/ready', async (req, res) => {
    const checks = { mongo: false, redis: false };

    // MongoDB readiness
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db.admin().ping();
            checks.mongo = true;
        }
    } catch (err) {
        req.log.warn({ err }, 'Readiness check: MongoDB ping failed');
    }

    // Redis readiness
    try {
        const pong = await redisClient.ping();
        checks.redis = pong === 'PONG';
    } catch (err) {
        req.log.warn({ err }, 'Readiness check: Redis ping failed');
    }

    const ready = checks.mongo && checks.redis;
    res.status(ready ? 200 : 503).json({
        status: ready ? 'ready' : 'not ready',
        checks,
    });
});

// ── Application routes ────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ message: 'CodeMaster API is running.' });
});

app.use('/api/auth',        authRoutes);
app.use('/api/problems',    problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/contests',    contestRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
// Catches errors passed via next(err) from routes/middleware.
// Always includes the correlation ID so the client can report it.
app.use((err, req, res, next) => {  // eslint-disable-line no-unused-vars
    const log = req.log || logger;
    log.error({ err, requestId: req.requestId }, 'Unhandled route error');
    res.status(err.status || 500).json({
        message: err.expose ? err.message : 'Internal server error',
        requestId: req.requestId,  // client can quote this when reporting bugs
    });
});

// ── Server startup ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server listening');
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
//
// On SIGTERM (Docker stop / Kubernetes rolling update):
//   1. Stop accepting new connections immediately.
//   2. Wait up to SHUTDOWN_TIMEOUT_MS for in-flight requests to finish.
//   3. Close MongoDB and Redis connections cleanly.
//   4. Exit with code 0.
//
// If requests don't finish within the timeout, we force-exit with code 1 so
// the orchestrator doesn't wait forever.

const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '30000', 10);
let isShuttingDown = false;

async function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal }, 'Shutdown signal received — draining in-flight requests');

    // Hard-kill safety net: if shutdown takes too long, force exit
    const forceExit = setTimeout(() => {
        logger.error('Graceful shutdown timed out — forcing exit');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref(); // Don't keep the event loop alive just for this timer

    // Stop accepting new connections; wait for existing ones to finish
    server.close(async () => {
        logger.info('HTTP server closed — no new connections accepted');
        try {
            await mongoose.disconnect();
            logger.info('MongoDB disconnected');
            await redisClient.quit();
            logger.info('Redis disconnected');
        } catch (err) {
            logger.error({ err }, 'Error during connection teardown');
        }
        clearTimeout(forceExit);
        logger.info('Graceful shutdown complete');
        process.exit(0);
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled error guards ────────────────────────────────────────────────────
// These are last-resort handlers. A well-written app should never reach them,
// but they ensure we log clearly and trigger a clean shutdown instead of
// crashing silently or hanging with an undefined state.

process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise: String(promise) }, 'Unhandled promise rejection — initiating shutdown');
    shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception — initiating shutdown');
    // Synchronous shutdown: we can't trust the event loop after an uncaught exception
    process.exit(1);
});
