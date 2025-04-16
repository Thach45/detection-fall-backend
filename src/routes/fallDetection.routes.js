const express = require('express');
const router = express.Router();
const fallDetectionController = require('../controllers/fallDetection.controller');

// Report a new fall detection
router.post('/fall-detection', fallDetectionController.reportFall);

module.exports = router;