const User = require('../models/User');

/**
 * Middleware: allows users with role === 'teacher' OR role === 'admin'.
 * Admins are a superset — they can do everything a teacher can.
 * Must be used AFTER authMiddleware so that req.userId is set.
 */
const teacherMiddleware = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).select('role');
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: teacher or admin access required' });
        }
        // Attach role to request so controllers can distinguish if needed
        req.userRole = user.role;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = teacherMiddleware;
