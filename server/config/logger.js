'use strict';

/**
 * server/config/logger.js
 *
 * Pino logger singleton shared by server.js, worker.js, and any module that
 * needs structured logging.
 *
 * Output format:
 *   NODE_ENV=production  → NDJSON (machine-readable, for log aggregators)
 *   NODE_ENV=development → pretty-printed (human-readable, for local dev)
 *
 * Usage:
 *   const logger = require('./config/logger');
 *   logger.info({ userId, problemId }, 'Submission queued');
 *   logger.error({ err }, 'Job failed');
 *
 * Child loggers (attach fixed fields to every line):
 *   const jobLog = logger.child({ jobId, submissionId });
 *   jobLog.info('Processing started');
 */

const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',

    // In production: plain NDJSON — fast, structured, ready for Loki/Datadog/CloudWatch.
    // In development: pino-pretty transport for human-readable output.
    ...(isDev && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize:       true,
                translateTime:  'SYS:HH:MM:ss',
                ignore:         'pid,hostname',
                singleLine:     false,
            },
        },
    }),

    // Rename 'msg' → 'message' so it matches common log schema conventions
    // (optional — remove if your log aggregator expects 'msg')
    // messageKey: 'message',

    // Redact sensitive fields that might accidentally be logged
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'body.password',
            'body.token',
        ],
        censor: '[REDACTED]',
    },
});

module.exports = logger;
