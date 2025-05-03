const nodemailer = require('nodemailer');
const FallEvent = require('../models/fallEvent.model');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendFallDetectionAlert(location, to_email, timestamp) {
    try {
      console.log('Sending fall detection alert to:', location);
      const longitude = location.split(',')[0];
      const latitude = location.split(',')[1];
      // loại bỏ khoảng trắng
      const map = location.replace(/\s/g, '');
      
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: to_email,
        subject: 'URGENT: Fall Detection Alert!',
        html: `
          <h2>Fall Detection Alert</h2>
          <p>A fall has been detected from an IoT device.</p>
          <p><strong>Location:</strong> ${location || 'Unknown'}</p>
          <p><strong>Time:</strong> ${timestamp || new Date().toLocaleString()}</p>
          <p><strong>Map:</strong> https://www.google.com/maps?q=${map}</p>
          <p>Please check on the person immediately!</p>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
       

      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();