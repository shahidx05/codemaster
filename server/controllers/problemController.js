const Problem = require('../models/Problem');

const ALLOWED_FIELDS = [
    'title', 'description', 'difficulty', 'tags', 'examples',
    'constraints', 'testCases', 'starterCode', 'cppWrapper'
];

function pickFields(body) {
    return ALLOWED_FIELDS.reduce((acc, key) => {
        if (body[key] !== undefined) acc[key] = body[key];
        return acc;
    }, {});
}

exports.getAllProblems = async (req, res) => {
    try {
        const { difficulty, tags, search } = req.query;

        const filter = {};
        if (difficulty) filter.difficulty = difficulty;
        if (tags)       filter.tags = { $in: tags.split(',') };
        if (search)     filter.$text = { $search: search };

        const problems = await Problem.find(filter)
            .select('title difficulty tags acceptanceRate totalSubmissions createdBy')
            .sort({ createdAt: -1 });

        res.json({ problems });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

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

exports.createProblem = async (req, res) => {
    try {
        const data = pickFields(req.body);
        data.createdBy = req.userId;
        const problem = new Problem(data);
        await problem.save();
        res.status(201).json({ message: 'Problem created successfully', problem });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A problem with that title already exists' });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

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
        res.json({ message: 'Problem updated successfully', problem });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

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
            Submission.deleteMany({ problem: problem._id })
        ]);

        res.json({ message: 'Problem deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
