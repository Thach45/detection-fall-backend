require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/user.model');
const fallDetectionRoutes = require('./routes/fallDetection.routes');
const userRoutes = require('./routes/user.routes');
const http = require('http');
const socketIo = require('socket.io');

// Store socket connections
const deviceSockets = new Map();  // deviceId -> socketId
const userSockets = new Map();    // phoneEmergency -> socketId
const socketInfo = new Map();     // socketId -> { deviceId?, phoneEmergency? }

// Kết nối MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Khởi tạo Express app
const app = express();
const server = http.createServer(app);

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

// Helper function to generate alert IDs
function generateAlertId() {
  return `alert_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
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
    console.log('👉 Waiting for Socket.IO connections...');
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});
