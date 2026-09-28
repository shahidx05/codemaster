const express        = require('express');
const mongoose       = require('mongoose');
const cors           = require('cors');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
require('dotenv').config();

// Shared Redis client — connects on require(), logs errors, retries automatically.
// See config/redis.js for the fail-fast / degrade-gracefully decision.
const redisClient = require('./config/redis');

const authRoutes       = require('./routes/auth');
const problemRoutes    = require('./routes/problems');
const submissionRoutes = require('./routes/submissions');
const contestRoutes    = require('./routes/contests');

const app = express();

// Security headers
app.use(helmet());

// Restricted CORS — allow both Vite (5173) and CRA (3000) dev servers
// const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:3000').split(',');
const allowedOrigins = (process.env.CLIENT_ORIGIN ).split(',');
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true
}));

// Body size cap
app.use(express.json({ limit: '10kb' }));

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiters — backed by Redis via rate-limit-redis + ioredis
//
// WHY REDIS INSTEAD OF THE DEFAULT IN-MEMORY STORE:
//   1. Restart resilience: the in-memory store lived inside the Node process,
//      so every container restart silently reset all counters to zero — an
//      attacker could trivially bypass limits by triggering a restart.
//   2. Replica consistency: if the backend is ever scaled to multiple instances
//      (multiple containers behind a load balancer), each would have its own
//      isolated counter. An IP could hit N × limit requests per window by
//      spreading requests across replicas. A shared Redis store ensures all
//      instances see and update the same counter.
// ─────────────────────────────────────────────────────────────────────────────

// Global rate limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
    store: new RedisStore({
        // ioredis uses .call() instead of .sendCommand()
        sendCommand: (...args) => redisClient.call(...args),
        // Prefix isolates these keys from any other Redis usage
        prefix: 'rl:global:',
    }),
});

// Submission limiter: 10 per minute per IP
// Note: C++ submissions call Piston which adds ~3-5 s latency per test case,
// so 10/min is generous enough while preventing abuse.
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
app.use('/api/submissions', submissionLimiter);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth',        authRoutes);
app.use('/api/problems',    problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/contests',    contestRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'CodeMaster API is running.' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
