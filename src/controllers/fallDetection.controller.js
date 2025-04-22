const FallEvent = require('../models/fallEvent.model');
const User = require('../models/user.model');
const emailService = require('../services/email.service');

class FallDetectionController {
  async reportFall(req, res) {
    try {
      const { deviceId, location } = req.body;
      const timestamp = new Date().toLocaleString();
      const locationStr = location ? `${location.latitude}, ${location.longitude}` : 'Unknown';
      const respone = await User.findOne({ deviceId })
     
      if (!respone) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }
      const to_email = respone?.emailEmergency || "";
      const resp = await emailService.sendFallDetectionAlert(locationStr, to_email, timestamp);
      if(resp)
      {
        const messFall ={
          deviceId,
          location:{
            latitude: location.latitude,
            longitude: location.longitude,
          },
          timestamp
        }
       
        const newFallDetection = await FallEvent.create(messFall);
        console.log('Fall detection event saved:', newFallDetection);
      }
      
      // Gửi email

      // Lấy io instance và danh sách clients đã được lưu trong app
      const io = req.app.get('io');
      const connectedClients = req.app.get('connectedClients');
      console.log('Connected clients:', connectedClients);

      // Gửi thông báo đến tất cả mobile clients đã kết nối
      const notificationData = {
        type: 'fall_detected',
        deviceId,
        location,
        timestamp,
        message: `Phát hiện té ngã từ thiết bị ${deviceId} tại vị trí ${locationStr}`
      };

      // Đếm số mobile clients được thông báo
      let notifiedClients = 0;
      
      // Emit tới tất cả clients với event name 'fall_detected'
      io.emit('fall_detected', notificationData);
      notifiedClients = io.engine.clientsCount;
      res.status(200).json({
        success: true,
        message: 'Fall detection alert sent successfully',
        notifiedClients
      });
      
    } catch (error) {
      console.error('Error in fall detection:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing fall detection',
        error: error.message
      });
    }
  }

  async getFallEvents(req, res) {
    try {
      const { deviceId } = req.query;
      const fallEvents = await FallEvent.find({deviceId}).sort({ timestamp: -1 });
      res.status(200).json({
        success: true,
        data: fallEvents
      });
    } catch (error) {
      console.error('Error fetching fall events:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching fall events',
        error: error.message
      });
    }
  }
}

module.exports = new FallDetectionController();