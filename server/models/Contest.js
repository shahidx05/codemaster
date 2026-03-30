const mongoose = require('mongoose');

const contestProblemSchema = new mongoose.Schema({
    problem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Problem',
        required: true
    },
    points: {
        type: Number,
        default: 100,
        min: 0
    }
}, { _id: false });

const contestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    problems: [contestProblemSchema],
    isPublic: {
        type: Boolean,
        default: true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual: derive status from current time
contestSchema.virtual('status').get(function () {
    const now = new Date();
    if (now < this.startTime) return 'upcoming';
    if (now <= this.endTime) return 'active';
    return 'ended';
});

// Useful indexes
contestSchema.index({ startTime: 1 });
contestSchema.index({ createdBy: 1 });
contestSchema.index({ participants: 1 });
contestSchema.index({ isPublic: 1, startTime: 1 });

module.exports = mongoose.model('Contest', contestSchema);
