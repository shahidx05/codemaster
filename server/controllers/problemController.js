'use strict';

const Problem = require('../models/Problem');
const cache   = require('../utils/cache');

const ALLOWED_FIELDS = [
    'title', 'description', 'difficulty', 'tags', 'examples',
    'constraints', 'testCases', 'starterCode', 'cppWrapper'
];

// Cache TTL for the public problem list (seconds).
// The list changes only when a teacher/admin adds, edits, or deletes a problem.
// Submissions update acceptanceRate on individual problems — those writes also
// flush this cache so the next list read reflects the updated rates.
const PROBLEMS_LIST_TTL = 60;

function pickFields(body) {
    return ALLOWED_FIELDS.reduce((acc, key) => {
        if (body[key] !== undefined) acc[key] = body[key];
        return acc;
    }, {});
}

// ── GET /api/problems ─────────────────────────────────────────────────────────
// Public: filtered/sorted problem list.
//
// WHY CACHE THIS:
//   This endpoint performs a full-collection scan + sort on every request.
//   It is read-heavy (every user landing on the Problems page hits it) and
//   changes infrequently (only on admin create/update/delete, or when a
//   submission updates acceptanceRate).  A 60s cache dramatically reduces
//   MongoDB load without serving meaningfully stale data.
//
// CACHE KEY includes serialized filter params so different filter combinations
// get their own independent cache entries.
exports.getAllProblems = async (req, res) => {
    try {
        const { difficulty, tags, search } = req.query;

        // Build a stable, deterministic cache key from the active filters
        const filterKey = JSON.stringify({ difficulty: difficulty || '', tags: tags || '', search: search || '' });
        const cacheKey  = `problems:list:${filterKey}`;

        const result = await cache.getOrSet(cacheKey, PROBLEMS_LIST_TTL, async () => {
            const filter = {};
            if (difficulty) filter.difficulty = difficulty;
            if (tags)       filter.tags = { $in: tags.split(',') };
            if (search)     filter.$text = { $search: search };

            const problems = await Problem.find(filter)
                .select('title difficulty tags acceptanceRate totalSubmissions createdBy')
                .sort({ createdAt: -1 });

            return { problems };
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── GET /api/problems/:id ─────────────────────────────────────────────────────
// Public: full problem detail. NOT cached because:
//   - It strips private test-case I/O server-side on every request
//   - acceptanceRate changes on each submission
//   - The data is per-problem (not a shared list) — cache benefit is lower
exports.getProblemById = async (req, res) => {
    try {
        const problem = await Problem.findById(req.params.id);
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }
        // Never expose private test case inputs/outputs to the client
        // (they are only read server-side during execution)
        const safe = problem.toObject();
        safe.testCases = safe.testCases.map(tc => ({
            _id: tc._id,
            isPublic: tc.isPublic
            // input and expectedOutput intentionally omitted
        }));
        res.json({ problem: safe });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── POST /api/problems ────────────────────────────────────────────────────────
exports.createProblem = async (req, res) => {
    try {
        const data = pickFields(req.body);
        data.createdBy = req.userId;
        const problem = new Problem(data);
        await problem.save();

        // A new problem invalidates all cached problem lists
        await cache.delPattern('problems:list:*');

        res.status(201).json({ message: 'Problem created successfully', problem });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A problem with that title already exists' });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── PUT /api/problems/:id ─────────────────────────────────────────────────────
exports.updateProblem = async (req, res) => {
    try {
        const data = pickFields(req.body);
        const problem = await Problem.findByIdAndUpdate(
            req.params.id,
            data,
            { new: true, runValidators: true }
        );
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }

        // Updated problem (title, difficulty, tags, etc.) invalidates all cached lists
        await cache.delPattern('problems:list:*');

        res.json({ message: 'Problem updated successfully', problem });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── DELETE /api/problems/:id ──────────────────────────────────────────────────
exports.deleteProblem = async (req, res) => {
    try {
        const problem = await Problem.findByIdAndDelete(req.params.id);
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }

        // Cleanup orphaned references cascading from this deleted problem
        const Contest = require('../models/Contest');
        const User = require('../models/User');
        const Submission = require('../models/Submission');

        await Promise.all([
            Contest.updateMany(
                { 'problems.problem': problem._id },
                { $pull: { problems: { problem: problem._id } } }
            ),
            User.updateMany(
                { solvedProblems: problem._id },
                { $pull: { solvedProblems: problem._id } }
            ),
            Submission.deleteMany({ problem: problem._id }),
            // Deleted problem invalidates all cached problem lists
            cache.delPattern('problems:list:*'),
        ]);

        res.json({ message: 'Problem deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
