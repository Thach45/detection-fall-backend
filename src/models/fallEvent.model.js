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
  day: {
    type: Number,
    default: () => new Date().getDate()
  },
  month: {
    type: Number,
    default: () => new Date().getMonth() + 1 // tháng bắt đầu từ 0 nên +1
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear()
  }
});

const FallEvent = mongoose.model('FallEvent', fallEventSchema);

module.exports = FallEvent;
