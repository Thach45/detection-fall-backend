require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const http = require('http');
const mongoose = require('mongoose');
const fallDetectionRoutes = require('./routes/fallDetection.routes');
const userRoutes = require('./routes/user.routes');
const medicationReminderRoutes = require('./routes/medicationReminder.routes');
const socketIo = require('socket.io');
// MQTT Topics
const TOPICS = {
  MEDICATION_REMINDER: 'medication/reminder',
  MEDICATION_TAKEN: 'medication/taken',
  FALL_DETECTED: 'fall/detected'
};
const app = express();
const server = http.createServer(app);
// Store socket connections
const deviceSockets = new Map();  // deviceId -> socketId
const userSockets = new Map();    // phoneEmergency -> socketId
const socketInfo = new Map();     // socketId -> { deviceId?, phoneEmergency? }
// MQTT URL and options
const MQTT_URL = `mqtts://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`;
const mqttOptions = {
  clientId: `server_${Math.random().toString(16).slice(3)}`,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
  rejectUnauthorized: false
};

console.log('🔧 Cấu hình MQTT:', {
  url: MQTT_URL,
  clientId: mqttOptions.clientId,
  username: mqttOptions.username
});

console.log('🔧 Cấu hình MQTT:', {
  hostname: mqttOptions.hostname,
  port: mqttOptions.port,
  protocol: mqttOptions.protocol,
  username: mqttOptions.username,
  clientId: mqttOptions.clientId
});

// Connect to MQTT broker
console.log('🔗 Đang kết nối tới:', MQTT_URL);
const mqttClient = mqtt.connect(MQTT_URL, mqttOptions);

// Log detailed connection state
mqttClient.on('connect', () => {
  console.log('✅ Kết nối thành công đến HiveMQ Cloud');
  console.log('🔐 Client ID:', mqttOptions.clientId);
});

mqttClient.on('close', () => {
  console.log('🔌 MQTT connection closed');
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT Error:', err.message);
  console.error('Chi tiết:', {
    code: err.code,
    errno: err.errno,
    syscall: err.syscall,
    address: err.address,
    port: err.port
  });
});

// Handle MQTT packets
mqttClient.on('packetreceive', (packet) => {
  console.log('📦 MQTT Packet nhận:', packet.cmd);
});

mqttClient.on('packetsend', (packet) => {
  console.log('📤 MQTT Packet gửi:', packet.cmd);
});



// Log MQTT connection states
mqttClient.on('connect', () => {
  console.log('✅ Connected to HiveMQ Cloud broker');
  console.log('🔐 Using credentials:', {
    host: mqttOptions.host,
    port: mqttOptions.port,
    protocol: mqttOptions.protocol,
    username: mqttOptions.username
  });
});

mqttClient.on('error', (error) => {
  console.error('❌ MQTT Error:', error);
});

mqttClient.on('offline', () => {
  console.log('🔌 MQTT Client is offline');
});

mqttClient.on('reconnect', () => {
  console.log('🔄 Trying to reconnect to MQTT broker...');
});


mqttClient.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  // Subscribe to relevant topics
  Object.values(TOPICS).forEach(topic => {
    mqttClient.subscribe(topic, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to ${topic}:`, err);
      } else {
        console.log(`📩 Subscribed to ${topic}`);
      }
    });
  });
});

// Handle MQTT messages
mqttClient.on('message', (topic, message) => {
  console.log(`📨 Received message on ${topic}:`, message.toString());
  
  switch (topic) {
    case TOPICS.MEDICATION_REMINDER:
      handleMedicationReminder(JSON.parse(message.toString()));
      break;
    case TOPICS.MEDICATION_TAKEN:
      handleMedicationTaken(JSON.parse(message.toString()));
      break;
    case TOPICS.FALL_DETECTED:
      handleFallDetected(JSON.parse(message.toString()));
      break;
  }
});

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Initialize Express app

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', fallDetectionRoutes);
app.use('/api', userRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Handle device connections
  socket.on('register_device', (deviceId) => {
    console.log(`📱 Device registering: ${deviceId}`);
    deviceSockets.set(deviceId, socket.id);
    socketInfo.set(socket.id, { deviceId });
    socket.deviceId = deviceId;
    socket.emit('registered', { success: true });
  });

  // Handle user authentication
  socket.on('authenticate', ({ phoneEmergency }) => {
    console.log(`👤 User authenticating: ${phoneEmergency}`);
    userSockets.set(phoneEmergency, socket.id);
    socketInfo.set(socket.id, { phoneEmergency });
    socket.phoneEmergency = phoneEmergency;
    socket.emit('authenticated', { success: true });
  });

  // Handle fall detection from IoT devices
  socket.on('fall_detected', (data) => {
    console.log('📢 Fall detected:', data);
    const { deviceId } = data;

    if (!deviceId) {
      console.error('❌ No deviceId provided');
      return;
    }

    // Broadcast to all clients with deviceId
    const alertData = {
      ...data,
      timestamp: new Date().toISOString(),
      alertId: generateAlertId()
    };
    
    // Broadcast to all clients - frontend will filter by deviceId
    io.emit('fall_detected', alertData);
    console.log(`🔔 Broadcasting fall alert for device: ${deviceId}`);
  });

  socket.on('disconnect', () => {
    const info = socketInfo.get(socket.id);
    if (info) {
      if (info.deviceId) {
        deviceSockets.delete(info.deviceId);
        console.log(`📱 Device disconnected: ${info.deviceId}`);
      }
      if (info.phoneEmergency) {
        userSockets.delete(info.phoneEmergency);
        console.log(`👤 User disconnected: ${info.phoneEmergency}`);
      }
      socketInfo.delete(socket.id);
    }
    console.log('❌ Client disconnected:', socket.id);
  });
});
// Make MQTT client accessible to routes
app.set('mqttClient', mqttClient);
app.set('mqttTopics', TOPICS);

// MQTT Message Handlers
async function handleMedicationReminder(data) {
  const { deviceId, userId, medicationName, time } = data;
  mqttClient.publish(`device/${deviceId}/notification`, JSON.stringify({
    type: 'MEDICATION_REMINDER',
    message: `Time to take ${medicationName}`,
    time
  }));
}

async function handleMedicationTaken(data) {
  const { deviceId, userId, medicationName, time } = data;
  // Update medication status in database
  // This will be handled by the medication reminder controller
}

async function handleFallDetected(data) {
  const { deviceId, userId, location, timestamp } = data;
  // Handle fall detection alert
  // This will be handled by the fall detection controller
}
// Make io accessible to routes
app.set('io', io);
app.set('deviceSockets', deviceSockets);
app.set('userSockets', userSockets);
const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  await connectDB();
  
  server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log('👉 Connected to MQTT broker and ready for messages');
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mqttClient.end(() => {
    console.log('MQTT connection closed');
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});


