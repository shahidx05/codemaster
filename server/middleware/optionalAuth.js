const jwt = require('jsonwebtoken');

/**
 * optionalAuthMiddleware
 * Always calls next(). If a valid JWT is present in the Authorization header,
 * it populates req.userId and req.userRole so downstream handlers can use them.
 * Unlike authMiddleware, this does NOT reject unauthenticated requests.
 */
const optionalAuth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.userId   = decoded.userId;
            req.userRole = decoded.role;
        } catch {
            // Invalid or expired token — silently ignore, treat as unauthenticated
        }
    }
    next();
};

module.exports = optionalAuth;
