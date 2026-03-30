const express  = require('express');
const router   = express.Router();
const contestController = require('../controllers/contestController');
const authMiddleware    = require('../middleware/auth');
const teacherMiddleware = require('../middleware/teacherMiddleware');
const optionalAuth      = require('../middleware/optionalAuth');

// Public routes
router.get('/', contestController.getAllContests);

// IMPORTANT: /my must be declared before /:id so Express doesn't treat "my" as a contest ID
router.get('/my', authMiddleware, teacherMiddleware, contestController.getMyContests);

// optionalAuth populates req.userId if a token is present (without rejecting unauthenticated requests)
// This fixes isParticipant always returning false for logged-in users navigating back to a contest
router.get('/:id', optionalAuth, contestController.getContestById);

// Teacher/Admin: contest management
router.post('/',         authMiddleware, teacherMiddleware, contestController.createContest);
router.put('/:id',       authMiddleware, teacherMiddleware, contestController.updateContest);
router.delete('/:id',    authMiddleware, teacherMiddleware, contestController.deleteContest);

// Authenticated students: join + leaderboard
router.post('/:id/join',        authMiddleware, contestController.joinContest);
router.get('/:id/leaderboard',  authMiddleware, contestController.getLeaderboard);

module.exports = router;
