const express = require('express');
const router = express.Router();
const medicationReminderController = require('../controllers/medicationReminder.controller');

// Create a new medication reminder
router.post('/medication-reminders', medicationReminderController.createReminder);

// Get all reminders for a user
router.get('/medication-reminders/user/:userId', medicationReminderController.getUserReminders);

// Delete a reminder
router.delete('/medication-reminders/:id', medicationReminderController.deleteReminder);

module.exports = router;