const mongoose = require('mongoose');

const fallEventSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
  },
  location: {
    type: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['detected', 'notified', 'responded'],
    default: 'detected'
  },
  notificationSent: {
    type: Boolean,
    default: false
  }
});

const FallEvent = mongoose.model('FallEvent', fallEventSchema);

module.exports = FallEvent;