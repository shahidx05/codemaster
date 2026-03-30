const mongoose = require('mongoose');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [EMAIL_REGEX, 'Please provide a valid email address']
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['user', 'teacher', 'admin'],
        default: 'user'
    },
    solvedProblems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Problem'
    }],
    profilePicture: {
        type: String,
        default: 'https://ui-avatars.com/api/?background=random&name='
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
