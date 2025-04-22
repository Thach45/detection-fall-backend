const mqtt = require('mqtt');

require('dotenv').config();

// MQTT Broker configuration
const DEVICE_ID = 'your_device_id'; // Replace with actual device ID

// MQTT connection options
const mqttOptions = {
    host: process.env.MQTT_HOST,
    port: process.env.MQTT_PORT,
    protocol: 'wss',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    rejectUnauthorized: false
};

// MQTT Topics
const TOPICS = {
    MEDICATION_REMINDER: 'medication/reminder',
    MEDICATION_TAKEN: 'medication/taken',
    DEVICE_SPECIFIC: `device/${DEVICE_ID}/reminder`
};

// Connect to MQTT broker
const client = mqtt.connect(mqttOptions);

// Handle connection
client.on('connect', () => {
    console.log('Connected to MQTT broker');
    
    // Subscribe to topics
    client.subscribe(TOPICS.MEDICATION_REMINDER, (err) => {
        if (!err) {
            console.log('Subscribed to medication reminders');
        }
    });
    
    client.subscribe(TOPICS.DEVICE_SPECIFIC, (err) => {
        if (!err) {
            console.log('Subscribed to device-specific reminders');
        }
    });
});

// Handle incoming messages
client.on('message', (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);

        if (data.deviceId === DEVICE_ID) {
            switch (data.type) {
                case 'MEDICATION_REMINDER':
                    handleMedicationReminder(data);
                    break;
                case 'REMINDER_DELETED':
                    handleReminderDeleted(data);
                    break;
            }
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }
});

// Handle medication reminder
function handleMedicationReminder(data) {
    console.log(`⏰ Time to take ${data.medicineName}`);
    // TODO: Trigger local notification, buzzer, or display
    
    // Example: Mark medication as taken after user interaction
    const takenData = {
        type: 'MEDICATION_TAKEN',
        deviceId: DEVICE_ID,
        userId: data.userId,
        reminderId: data.reminderId,
        medicineName: data.medicineName,
        takenAt: new Date().toISOString()
    };
    
    client.publish(TOPICS.MEDICATION_TAKEN, JSON.stringify(takenData));
}

// Handle reminder deletion
function handleReminderDeleted(data) {
    console.log(`Reminder deleted for ${data.medicineName}`);
    // TODO: Remove from local storage/display
}

// Handle errors
client.on('error', (error) => {
    console.error('MQTT Error:', error);
});

// Handle reconnection
client.on('reconnect', () => {
    console.log('Attempting to reconnect to MQTT broker...');
});

// Clean up on exit
process.on('SIGINT', () => {
    client.end();
    process.exit();
});