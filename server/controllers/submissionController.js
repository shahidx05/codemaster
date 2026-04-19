const Submission = require('../models/Submission');
const Problem    = require('../models/Problem');
const User       = require('../models/User');
const codeExecutor = require('../utils/codeExecutor');

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

exports.submitCode = async (req, res) => {
    try {
        const { problemId, code, language, contestId = null } = req.body;
        const userId = req.userId;

        // Fetch the full problem (including testCases with isPublic + cppWrapper)
        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }

        // Contest guard: if a contestId is provided, verify the contest is active
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
            // Check the user has joined
            const hasJoined = contest.participants.some(p => p.toString() === userId);
            if (!hasJoined) {
                return res.status(403).json({ message: 'You have not joined this contest' });
            }
        }

        // Execute code (pass problem so C++ executor can use cppWrapper)
        const executionResult = await codeExecutor.executeCode(
            code,
            problem.testCases,
            language,
            problem
        );

        // Build and save the submission (store full unmasked results)
        const submission = new Submission({
            user:        userId,
            problem:     problemId,
            contest:     contestId || null,
            code,
            language,
            status:      executionResult.status,
            testResults: executionResult.testResults,
            runtime:     executionResult.runtime,
            memory:      executionResult.memory
        });
        await submission.save();

        const isAccepted = executionResult.status === 'Accepted';

        // Atomic counters on Problem
        await Problem.findByIdAndUpdate(problemId, {
            $inc: {
                totalSubmissions: 1,
                ...(isAccepted ? { acceptedSubmissions: 1 } : {})
            }
        });

        // Recalculate acceptance rate
        const updated = await Problem.findById(problemId)
            .select('totalSubmissions acceptedSubmissions');
        if (updated.totalSubmissions > 0) {
            await Problem.findByIdAndUpdate(problemId, {
                $set: {
                    acceptanceRate: (
                        (updated.acceptedSubmissions / updated.totalSubmissions) * 100
                    ).toFixed(2)
                }
            });
        }

        // Update global solvedProblems regardless of contest context
        if (isAccepted) {
            await User.findByIdAndUpdate(userId, {
                $addToSet: { solvedProblems: problemId }
            });
        }

        // Return masked results to the client
        const maskedResults = maskPrivateResults(executionResult.testResults);

        res.json({
            message: 'Code submitted successfully',
            submission: {
                _id:         submission._id,
                status:      submission.status,
                testResults: maskedResults,
                runtime:     submission.runtime,
                memory:      submission.memory
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * POST /api/submissions/run
 * Run code against only PUBLIC test cases. Does NOT save a Submission document,
 * does NOT update solvedProblems[], does NOT update acceptanceRate.
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
 * Run code against a single user-provided stdin string. No DB save, no test
 * case comparison — returns raw stdout / stderr / compile_output from Judge0.
 * Used by the "Custom Input" panel in the frontend.
 */
exports.runCustom = async (req, res) => {
    try {
        const { code, language, stdin = '' } = req.body;

        if (!code || !language) {
            return res.status(400).json({ message: 'code and language are required' });
        }

        // Build a synthetic single test case with the user's stdin
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
