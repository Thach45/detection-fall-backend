require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const fallDetectionRoutes = require('./routes/fallDetection.routes');
const userRoutes = require('./routes/user.routes');
const http = require('http');
const socketIo = require('socket.io');

// Kết nối MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    // Thoát khỏi quá trình nếu không thể kết nối database
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

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve test client
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-client.html'));
});

// Routes
app.use('/api', fallDetectionRoutes);
app.use('/api', userRoutes);

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    mongoDbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  console.log('Transport used:', socket.conn.transport.name);

  socket.onAny((eventName, ...args) => {
    console.log('Received event:', eventName, 'with args:', args);
  });

  // Handle fall detection events from devices
  socket.on('fall_detected', (data) => {
    console.log('📢 Fall detected:', data);
    // Broadcast to all connected clients
    io.emit('fall_alert', {
      ...data,
      timestamp: new Date().toISOString(),
      alertId: generateAlertId()
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.emit('connection_confirmed', {
    socketId: socket.id,
    transport: socket.conn.transport.name,
    serverTime: new Date().toISOString()
  });
});

// Helper function to generate alert IDs
function generateAlertId() {
  return `alert_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 3000;

// Xử lý lỗi process
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Kết nối DB và khởi động server
const startServer = async () => {
  await connectDB();
  
  server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📱 Test client available at http://localhost:${PORT}/test`);
    console.log('👉 Waiting for Socket.IO connections...');
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

// Xử lý khi process bị terminated
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});