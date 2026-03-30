const User       = require('../models/User');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({
                message: 'User with this email or username already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            email,
            password: hashedPassword,
            profilePicture: `https://ui-avatars.com/api/?background=random&name=${username}`
        });

        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id:             user._id,
                username:       user.username,
                email:          user.email,
                role:           user.role,
                profilePicture: user.profilePicture
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id:             user._id,
                username:       user.username,
                email:          user.email,
                role:           user.role,
                profilePicture: user.profilePicture
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select('-password')
            .populate('solvedProblems', 'title difficulty');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * Admin-only: promote or demote a user's role.
 * PATCH /api/auth/users/:id/role  { role: 'user' | 'teacher' | 'admin' }
 */
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const allowedRoles = ['user', 'teacher', 'admin'];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}`
            });
        }

        // Prevent admin from accidentally demoting themselves
        if (req.params.id === req.userId && role !== 'admin') {
            return res.status(400).json({
                message: 'You cannot change your own role'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: `Role updated to '${role}' successfully`,
            user: {
                id:       user._id,
                username: user.username,
                email:    user.email,
                role:     user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * Admin-only: search users by username or email (for the admin role-manager UI).
 * GET /api/auth/users?search=<term>
 */
exports.searchUsers = async (req, res) => {
    try {
        const { search = '' } = req.query;
        const filter = search
            ? {
                $or: [
                    { username: { $regex: search, $options: 'i' } },
                    { email:    { $regex: search, $options: 'i' } }
                ]
              }
            : {};

        const users = await User.find(filter)
            .select('username email role profilePicture createdAt')
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({ users });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * Admin-only: platform-wide statistics.
 * GET /api/auth/admin/stats
 */
exports.getAdminStats = async (req, res) => {
    try {
        const Problem    = require('../models/Problem');
        const Submission = require('../models/Submission');
        const Contest    = require('../models/Contest');
        const now        = new Date();

        const [
            totalUsers, totalProblems, totalSubmissions, totalContests,
            activeContests, teacherCount, acceptedSubmissions
        ] = await Promise.all([
            User.countDocuments(),
            Problem.countDocuments(),
            Submission.countDocuments(),
            Contest.countDocuments(),
            // Count active contests
            Contest.countDocuments({ startTime: { $lte: now }, endTime: { $gte: now } }),
            // Count teachers
            User.countDocuments({ role: 'teacher' }),
            // Count accepted submissions
            Submission.countDocuments({ status: 'Accepted' })
        ]);

        res.json({
            totalUsers,
            totalProblems,
            totalSubmissions,
            totalContests,
            activeContests,
            teacherCount,
            acceptedSubmissions
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
