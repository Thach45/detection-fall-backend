const MedicationReminder = require('../models/medicationReminder.model');

// Create a new reminder
exports.createReminder = async (req, res) => {
    try {
        const { userId, deviceId, medicineName, schedule } = req.body;

        const reminder = new MedicationReminder({
            userId,
            deviceId,
            medicineName,
            schedule
        });

        await reminder.save();

        // Send real-time notification to device
        const io = req.app.get('io');
        const deviceSockets = req.app.get('deviceSockets');
        const socketId = deviceSockets.get(deviceId);

        if (socketId) {
            io.to(socketId).emit('medication_reminder', {
                type: 'MEDICATION_REMINDER',
                medicineName: reminder.medicineName,
                schedule: reminder.schedule,
                timestamp: new Date().toISOString()
            });
        }

        res.status(201).json({
            success: true,
            data: reminder
        });
    } catch (error) {
        console.error('Error creating reminder:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo nhắc nhở thuốc',
            error: error.message
        });
    }
};

// Get all reminders for a user
exports.getUserReminders = async (req, res) => {
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
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách nhắc nhở',
            error: error.message
        });
    }
};

// Delete a reminder
exports.deleteReminder = async (req, res) => {
    try {
        const { id } = req.params;

        const reminder = await MedicationReminder.findByIdAndDelete(id);
        if (!reminder) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhắc nhở'
            });
        }

        // Notify device about deletion
        const io = req.app.get('io');
        const deviceSockets = req.app.get('deviceSockets');
        const socketId = deviceSockets.get(reminder.deviceId);

        if (socketId) {
            io.to(socketId).emit('medication_reminder_update', {
                type: 'REMINDER_DELETED',
                reminderId: reminder._id,
                medicineName: reminder.medicineName,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'Đã xóa nhắc nhở thành công'
        });
    } catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa nhắc nhở',
            error: error.message
        });
    }
};