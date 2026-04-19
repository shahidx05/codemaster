const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        required: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    examples: [{
        input: String,
        output: String,
        explanation: String
    }],
    constraints: [String],
    testCases: [{
        input: mongoose.Schema.Types.Mixed,
        expectedOutput: mongoose.Schema.Types.Mixed,
        // Plain-text stdin passed to C++/Python programs via Judge0
        stdin: { type: String, default: '' },
        // Plain-text expected stdout for C++/Python comparison (trimmed)
        expectedStdout: { type: String, default: '' },
        // true  → show full input/output to student on wrong answer
        // false → show only pass/fail, never reveal input or output
        isPublic: {
            type: Boolean,
            default: false
        }
    }],
    starterCode: {
        javascript: {
            type: String,
            default: 'function solution(input) {\n  // Write your code here\n  \n}'
        },
        cpp: {
            type: String,
            default: '#include <bits/stdc++.h>\nusing namespace std;\nclass Solution {\npublic:\n    // Write your solution here\n    // Example: vector<int> solution(vector<int> nums, int target) { }\n};'
        },
        python: {
            type: String,
            default: 'import json, sys\n\ndef solution(nums, target):\n    # Write your code here\n    pass'
        }
    },
    // C++ main() wrapper used by Piston executor.
    // Reads JSON from stdin, calls solution(), prints JSON to stdout.
    // Set automatically for seeded problems; teachers fill this when creating problems.
    cppWrapper: {
        type: String,
        default: ''
    },
    // Python wrapper used by Piston executor.
    pyWrapper: {
        type: String,
        default: ''
    },
    // Who created this problem (null for admin-seeded problems)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    acceptanceRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    totalSubmissions: {
        type: Number,
        default: 0,
        min: 0
    },
    acceptedSubmissions: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Indexes for fast filtering and searching
problemSchema.index({ difficulty: 1, createdAt: -1 });
problemSchema.index({ title: 'text' });
problemSchema.index({ tags: 1 });
problemSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Problem', problemSchema);
