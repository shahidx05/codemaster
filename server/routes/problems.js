const express  = require('express');
const router   = express.Router();
const problemController = require('../controllers/problemController');
const authMiddleware    = require('../middleware/auth');
const adminMiddleware   = require('../middleware/adminMiddleware');
const teacherMiddleware = require('../middleware/teacherMiddleware');

// Public routes
router.get('/',    problemController.getAllProblems);
router.get('/:id', problemController.getProblemById);

// Teacher and Admin: create and update problems
router.post('/',    authMiddleware, teacherMiddleware, problemController.createProblem);
router.put('/:id',  authMiddleware, teacherMiddleware, problemController.updateProblem);

// Admin-only: delete problems
router.delete('/:id', authMiddleware, adminMiddleware, problemController.deleteProblem);

module.exports = router;
