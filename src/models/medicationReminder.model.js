const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  hours: {
    type: Number,
    required: true,
    min: 0,
    max: 23
  },
  minutes: {
    type: Number,
    required: true,
    min: 0,
    max: 59
  }
});

const medicationReminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  medicineName: {
    type: String,
    required: true,
    trim: true
  },
  schedule: {
    type: [scheduleSchema],
    required: true,
    validate: [arrayMinLength, 'Phải có ít nhất một thời gian uống thuốc']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

function arrayMinLength(val) {
  return val.length >= 1;
}

// Index for quick lookups
medicationReminderSchema.index({ userId: 1, deviceId: 1 });

const MedicationReminder = mongoose.model('MedicationReminder', medicationReminderSchema);

module.exports = MedicationReminder;