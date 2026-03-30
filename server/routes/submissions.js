const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const authMiddleware = require('../middleware/auth');

// POST /run must be declared BEFORE /:id to avoid express treating 'run' as an id
router.post('/run', authMiddleware, submissionController.runCode);

router.post('/', authMiddleware, submissionController.submitCode);
router.get('/', authMiddleware, submissionController.getSubmissions);
router.get('/:id', authMiddleware, submissionController.getSubmissionById);

module.exports = router;
