const User = require('../models/User');

/**
 * Middleware: only allows users with role === 'admin'.
 * Must be used AFTER authMiddleware so that req.userId is set.
 */
const adminMiddleware = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).select('role');
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: admin access required' });
        }
        req.userRole = 'admin';
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = adminMiddleware;
