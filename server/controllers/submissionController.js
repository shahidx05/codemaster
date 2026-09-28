'use strict';

const Submission  = require('../models/Submission');
const Problem     = require('../models/Problem');
const User        = require('../models/User');
const codeExecutor  = require('../utils/codeExecutor');
const cache         = require('../utils/cache');
const { submissionQueue } = require('../queues/submissionQueue');

/**
 * Strip input/expectedOutput/actualOutput from private test case results.
 * The full data is always stored in MongoDB — this mask is only applied
 * to API responses sent to the client.
 */
function maskPrivateResults(testResults) {
    return testResults.map(r => {
        if (r.isPublic) return r;
        return {
            testCase: r.testCase,
            passed:   r.passed,
            isPublic: false,
            input:         null,
            expectedOutput: null,
            actualOutput:  null,
            // Reveal that an error occurred but not the details for private cases
            error: r.error ? 'Error occurred on hidden test case' : null
        };
    });
}

// ── POST /api/submissions ─────────────────────────────────────────────────────
/**
 * Async submission flow (BullMQ):
 *
 *  1. Validate the request (problem exists, contest guard, join check).
 *  2. Create a Submission document with status 'Queued'.
 *  3. Enqueue a BullMQ job with the submission metadata.
 *  4. Return 202 immediately with the submission ID.
 *
 * The worker (server/worker.js) picks up the job, calls Judge0 via
 * codeExecutor, and updates the Submission document with the real result.
 * The client polls GET /api/submissions/:id/status until status is terminal.
 */
exports.submitCode = async (req, res) => {
    try {
        const { problemId, code, language, contestId = null } = req.body;
        const userId = req.userId;

        // Validate problem exists
        const problem = await Problem.findById(problemId).select('_id title');
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }

        // Contest guard: verify contest is active and user has joined
        if (contestId) {
            const Contest = require('../models/Contest');
            const contest = await Contest.findById(contestId);
            if (!contest) {
                return res.status(404).json({ message: 'Contest not found' });
            }
            const now = new Date();
            if (now < contest.startTime) {
                return res.status(403).json({ message: 'Contest has not started yet' });
            }
            if (now > contest.endTime) {
                return res.status(403).json({ message: 'Contest has ended — submissions are closed' });
            }
            const hasJoined = contest.participants.some(p => p.toString() === userId);
            if (!hasJoined) {
                return res.status(403).json({ message: 'You have not joined this contest' });
            }
        }

        // Create the Submission document immediately (status: 'Queued')
        const submission = new Submission({
            user:     userId,
            problem:  problemId,
            contest:  contestId || null,
            code,
            language,
            status:   'Queued',
        });
        await submission.save();

        // Enqueue the job — the worker will do the actual Judge0 call
        const job = await submissionQueue.add('execute', {
            submissionId: submission._id.toString(),
            problemId:    problemId.toString(),
            code,
            language,
            contestId:    contestId || null,
            userId:       userId.toString(),
        });

        console.log(`[api] Submission ${submission._id} queued as job ${job.id}`);

        // 202 Accepted — client must poll GET /api/submissions/:id/status
        res.status(202).json({
            message:      'Submission queued — poll /api/submissions/:id/status for results',
            submissionId: submission._id,
            status:       'Queued',
            jobId:        job.id,
        });
    } catch (error) {
        console.error('[api] submitCode error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── GET /api/submissions/:id/status ──────────────────────────────────────────
/**
 * Lightweight polling endpoint. Returns only what the client needs to decide
 * whether to keep polling or render results.
 *
 * Terminal statuses (stop polling):
 *   Accepted, Wrong Answer, Runtime Error, Time Limit Exceeded,
 *   Memory Limit Exceeded, Compilation Error, Error
 *
 * Non-terminal statuses (keep polling):
 *   Queued, Processing
 */
const TERMINAL_STATUSES = new Set([
    'Accepted', 'Wrong Answer', 'Runtime Error',
    'Time Limit Exceeded', 'Memory Limit Exceeded',
    'Compilation Error', 'Error',
]);

exports.getSubmissionStatus = async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id)
            .populate('problem', 'title difficulty');

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Only the owner may poll their own submission
        if (submission.user.toString() !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const isTerminal = TERMINAL_STATUSES.has(submission.status);

        // If still pending, return lightweight response (no testResults needed yet)
        if (!isTerminal) {
            return res.json({
                submissionId: submission._id,
                status:       submission.status,
                isTerminal:   false,
            });
        }

        // Terminal — return full result (testResults masked for private cases)
        const obj = submission.toObject();
        obj.testResults = maskPrivateResults(obj.testResults || []);

        res.json({
            submissionId: submission._id,
            status:       submission.status,
            isTerminal:   true,
            submission:   {
                _id:         obj._id,
                status:      obj.status,
                testResults: obj.testResults,
                runtime:     obj.runtime,
                memory:      obj.memory,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── POST /api/submissions/run ─────────────────────────────────────────────────
/**
 * Run code against only PUBLIC test cases. Does NOT save a Submission document,
 * does NOT update solvedProblems[], does NOT update acceptanceRate.
 * This remains synchronous — it's fast (only public cases) and the
 * frontend expects an immediate result.
 */
exports.runCode = async (req, res) => {
    try {
        const { problemId, code, language } = req.body;

        if (!problemId || !code || !language) {
            return res.status(400).json({ message: 'problemId, code and language are required' });
        }

        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }

        // Only run against public test cases
        const publicTestCases = problem.testCases.filter(tc => tc.isPublic === true);

        if (publicTestCases.length === 0) {
            return res.status(400).json({ message: 'No public test cases available for this problem' });
        }

        // Execute code against only public test cases
        const executionResult = await codeExecutor.executeCode(
            code,
            publicTestCases,
            language,
            problem
        );

        res.json({
            isRun:       true,
            status:      executionResult.status,
            testResults: executionResult.testResults,   // all public, no masking needed
            runtime:     executionResult.runtime
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * POST /api/submissions/run-custom
 * Run code against a single user-provided stdin string. No DB save.
 */
exports.runCustom = async (req, res) => {
    try {
        const { code, language, stdin = '' } = req.body;

        if (!code || !language) {
            return res.status(400).json({ message: 'code and language are required' });
        }

        const syntheticTestCase = [{ stdin, expectedStdout: '', input: null, expectedOutput: null, isPublic: true }];

        const executionResult = await codeExecutor.executeCode(code, syntheticTestCase, language, null);

        const r = executionResult.testResults[0] || {};
        res.json({
            isCustomRun:    true,
            status:         executionResult.status,
            stdout:         r.stdout        ?? r.actualOutput ?? null,
            stderr:         r.stderr        ?? null,
            compileOutput:  r.compileOutput ?? null,
            error:          r.error         ?? null,
            runtime:        executionResult.runtime
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── GET /api/submissions ──────────────────────────────────────────────────────
exports.getSubmissions = async (req, res) => {
    try {
        const { problemId, contestId } = req.query;
        const userId = req.userId;

        const filter = { user: userId };
        if (problemId)  filter.problem = problemId;
        if (contestId)  filter.contest = contestId;

        const submissions = await Submission.find(filter)
            .populate('problem', 'title difficulty')
            .sort({ createdAt: -1 })
            .limit(50);

        // Mask private test results in list view
        const safe = submissions.map(s => {
            const obj = s.toObject();
            obj.testResults = maskPrivateResults(obj.testResults || []);
            return obj;
        });

        res.json({ submissions: safe });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ── GET /api/submissions/:id ──────────────────────────────────────────────────
exports.getSubmissionById = async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id)
            .populate('problem', 'title difficulty')
            .populate('user', 'username');

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Only the owner may view their own submission
        if (submission.user._id.toString() !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const obj = submission.toObject();
        obj.testResults = maskPrivateResults(obj.testResults || []);

        res.json({ submission: obj });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
