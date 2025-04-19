const express = require('express');
const router = express.Router();
const fallDetectionController = require('../controllers/fallDetection.controller');

// Report a new fall detection
router.post('/fall-detection', fallDetectionController.reportFall);
// Get all fall detection events
router.get('/fall-detection', fallDetectionController.getFallEvents);

module.exports = router;