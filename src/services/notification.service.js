const admin = require('firebase-admin');

class NotificationService {
    constructor() {
        // Initialize Firebase Admin
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
                })
            });
        }
    }

    async sendPushNotification(deviceToken, title, body, data = {}) {
        try {
            const message = {
                notification: {
                    title,
                    body
                },
                data: {
                    ...data,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                token: deviceToken
            };

            const response = await admin.messaging().send(message);
            console.log('Successfully sent notification:', response);
            return response;
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }

    async sendToTopic(topic, title, body, data = {}) {
        try {
            const message = {
                notification: {
                    title,
                    body
                },
                data: {
                    ...data,
                    click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                topic: topic
            };

            const response = await admin.messaging().send(message);
            console.log('Successfully sent topic notification:', response);
            return response;
        } catch (error) {
            console.error('Error sending topic notification:', error);
            throw error;
        }
    }
}

module.exports = new NotificationService();