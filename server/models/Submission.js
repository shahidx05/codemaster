const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    problem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Problem',
        required: true
    },
    // Null for standalone submissions; set when submitted during a contest
    contest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contest',
        default: null
    },
    code: {
        type: String,
        required: true,
        maxlength: 65536 // 64 KB code limit
    },
    language: {
        type: String,
        enum: ['javascript', 'cpp'],
        default: 'javascript'
    },
    status: {
        type: String,
        enum: [
            'Queued',
            'Processing',
            'Accepted',
            'Wrong Answer',
            'Runtime Error',
            'Time Limit Exceeded',
            'Memory Limit Exceeded',
            'Compilation Error',
            'Error',  // terminal error: all retries exhausted / unexpected failure
        ],
        default: 'Queued',
        required: true
    },
    testResults: [{
        testCase: Number,
        passed: Boolean,
        // These are null for private test cases in the API response (masked server-side)
        input: mongoose.Schema.Types.Mixed,
        expectedOutput: mongoose.Schema.Types.Mixed,
        actualOutput: mongoose.Schema.Types.Mixed,
        error: String,
        isPublic: Boolean
    }],
    runtime: {
        type: Number,
        default: 0
    },
    memory: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for profile page queries: user + sort by newest
submissionSchema.index({ user: 1, createdAt: -1 });
// Index for filtering by problem
submissionSchema.index({ problem: 1 });
// Index for contest leaderboard queries
submissionSchema.index({ contest: 1, user: 1 });
submissionSchema.index({ contest: 1, status: 1 });
// Index for status polling (GET /:id/status)
submissionSchema.index({ _id: 1, status: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
