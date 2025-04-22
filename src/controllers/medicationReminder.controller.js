const MedicationReminder = require('../models/medicationReminder.model');

// Create a new reminder
exports.createReminder = async (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    try {
        const { userId, deviceId, medicineName, schedule } = req.body;

        const reminder = new MedicationReminder({
            userId,
            deviceId,
            medicineName,
            schedule
        });

        await reminder.save();

        // Send MQTT message to device
        const mqttClient = req.app.get('mqttClient');
        const TOPICS = req.app.get('mqttTopics');

        const reminderMessage = {
            type: 'MEDICATION_REMINDER',
            deviceId,
            userId,
            medicineName: reminder.medicineName,
            schedule: reminder.schedule,
            reminderId: reminder._id,
            timestamp: new Date().toISOString()
        };
        console.log('Publishing reminder message:', reminderMessage);

        // Publish to general reminder topic
        mqttClient.publish(TOPICS.MEDICATION_REMINDER, JSON.stringify(reminderMessage));
        // Publish to device-specific topic
        mqttClient.publish(`device/${deviceId}/reminder`, JSON.stringify(reminderMessage));

        res.status(201).json({
            success: true,
            data: reminder
        });
    } catch (error) {
        console.error('Error creating reminder:', error);
        // Pass error to error handling middleware
        next(error);
    }
};

// Get all reminders for a user
exports.getUserReminders = async (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    try {
        const { userId } = req.params;

        const reminders = await MedicationReminder.find({ userId })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: reminders
        });
    } catch (error) {
        console.error('Error getting reminders:', error);
        next(error);
    }
};

// Delete a reminder
exports.deleteReminder = async (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    try {
        const { id } = req.params;

        const reminder = await MedicationReminder.findByIdAndDelete(id);
        if (!reminder) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhắc nhở'
            });
        }

        // Notify device about deletion via MQTT
        const mqttClient = req.app.get('mqttClient');
        const TOPICS = req.app.get('mqttTopics');

        const deleteMessage = {
            type: 'REMINDER_DELETED',
            deviceId: reminder.deviceId,
            userId: reminder.userId,
            reminderId: reminder._id,
            medicineName: reminder.medicineName,
            timestamp: new Date().toISOString()
        };

        // Publish to general topic and device-specific topic
        mqttClient.publish(TOPICS.MEDICATION_REMINDER, JSON.stringify(deleteMessage));
        mqttClient.publish(`device/${reminder.deviceId}/reminder`, JSON.stringify(deleteMessage));

        res.json({
            success: true,
            message: 'Đã xóa nhắc nhở thành công'
        });
    } catch (error) {
        console.error('Error deleting reminder:', error);
        next(error);
    }
};

// Mark medication as taken
exports.medicationTaken = async (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    try {
        const { reminderId } = req.params;
        const { takenAt } = req.body;

        const reminder = await MedicationReminder.findById(reminderId);
        if (!reminder) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhắc nhở'
            });
        }

        // Update reminder status
        reminder.lastTaken = takenAt || new Date();
        await reminder.save();

        // Notify via MQTT
        const mqttClient = req.app.get('mqttClient');
        const TOPICS = req.app.get('mqttTopics');

        const takenMessage = {
            type: 'MEDICATION_TAKEN',
            deviceId: reminder.deviceId,
            userId: reminder.userId,
            reminderId: reminder._id,
            medicineName: reminder.medicineName,
            takenAt: reminder.lastTaken,
            timestamp: new Date().toISOString()
        };

        mqttClient.publish(TOPICS.MEDICATION_TAKEN, JSON.stringify(takenMessage));

        res.json({
            success: true,
            data: reminder
        });
    } catch (error) {
        console.error('Error marking medication as taken:', error);
        next(error);
    }
};