# MQTT Connection Guide

## Setup MQTT Broker (Mosquitto)

1. Install Mosquitto:
   - Windows: Download from https://mosquitto.org/download/
   - Linux: `sudo apt-get install mosquitto mosquitto-clients`
   - Mac: `brew install mosquitto`

2. Start Mosquitto:
   - Windows: Start the Mosquitto service
   - Linux/Mac: `mosquitto -v`

## Test MQTT Connection

1. Install dependencies:
```bash
npm install mqtt
```

2. Set environment variables in .env:
```
MQTT_BROKER_URL=mqtt://localhost:1883
```

3. Start the backend server:
```bash
npm run dev
```

4. In a new terminal, start the IoT device client:
```bash
node src/examples/iot-device-client.js
```

## Test Medication Reminders

1. Create a new reminder using the API:
```bash
curl -X POST http://localhost:3000/api/medication-reminders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "deviceId": "your_device_id",
    "medicineName": "Test Medicine",
    "schedule": "0 */1 * * * *"
  }'
```

2. Mark medication as taken:
```bash
curl -X POST http://localhost:3000/api/medication-reminders/REMINDER_ID/taken \
  -H "Content-Type: application/json" \
  -d '{
    "takenAt": "2024-04-22T08:30:00.000Z"
  }'
```

## MQTT Topics

1. `medication/reminder` - General medication reminders
2. `medication/taken` - Medication taken confirmations 
3. `device/{deviceId}/reminder` - Device-specific reminders

## Testing with MQTT CLI Tools

1. Subscribe to all medication topics:
```bash
mosquitto_sub -t "medication/#" -v
```

2. Publish a test reminder:
```bash
mosquitto_pub -t "medication/reminder" -m '{"type":"MEDICATION_REMINDER","deviceId":"your_device_id","medicineName":"Test Med","schedule":"*/5 * * * *"}'
```

## Troubleshooting

1. Make sure Mosquitto broker is running
2. Check MQTT broker URL in .env file
3. Verify device ID matches between server and client
4. Check port 1883 is open and accessible