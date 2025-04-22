const express = require('express');
const router = express.Router();
const medicationReminderController = require('../controllers/medicationReminder.controller');

// Validation middleware
const validateReminderInput = (req, res, next) => {
    const { userId, deviceId, medicineName, schedule } = req.body;
    
    if (!userId || !deviceId || !medicineName || !schedule) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields',
            error: 'userId, deviceId, medicineName, and schedule are required'
        });
    }

    if (!Array.isArray(schedule)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid schedule format',
            error: 'schedule must be an array'
        });
    }

    for (const time of schedule) {
        if (!time.hours || !time.minutes ||
            typeof time.hours !== 'number' ||
            typeof time.minutes !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'Invalid time format in schedule',
                error: 'Each schedule item must have hours and minutes as numbers'
            });
        }
    }

    next();
};

// Create a new medication reminder
router.post('/medication-reminders', validateReminderInput, medicationReminderController.createReminder);

// Get all reminders for a user
router.get('/medication-reminders/user/:userId', medicationReminderController.getUserReminders);

// Delete a reminder
router.delete('/medication-reminders/:id', medicationReminderController.deleteReminder);

// Mark medication as taken
router.post('/medication-reminders/:reminderId/taken', medicationReminderController.medicationTaken);

module.exports = router;