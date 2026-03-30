const express  = require('express');
const router   = express.Router();
const authController   = require('../controllers/authController');
const authMiddleware   = require('../middleware/auth');
const adminMiddleware  = require('../middleware/adminMiddleware');

router.post('/register', authController.register);
router.post('/login',    authController.login);
router.get('/profile',   authMiddleware, authController.getProfile);

// Admin-only: user management (role promotion)
router.get('/users',           authMiddleware, adminMiddleware, authController.searchUsers);
router.patch('/users/:id/role', authMiddleware, adminMiddleware, authController.updateUserRole);

// Admin-only: platform stats
router.get('/admin/stats', authMiddleware, adminMiddleware, authController.getAdminStats);

module.exports = router;
