require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fallDetectionRoutes = require('./routes/fallDetection.routes');

const app = express();
const server = http.createServer(app);

// Cấu hình Socket.IO với options đầy đủ
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

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve test client
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-client.html'));
});

// Socket.IO connection handling với debug logs
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  console.log('Transport used:', socket.conn.transport.name);

  // Log khi client gửi bất kỳ event nào
  socket.onAny((eventName, ...args) => {
    console.log('Received event:', eventName, 'with args:', args);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Gửi event xác nhận kết nối thành công về client
  socket.emit('connection_confirmed', {
    socketId: socket.id,
    transport: socket.conn.transport.name
  });
});

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api', fallDetectionRoutes);

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Test client available at http://localhost:${PORT}/test`);
  console.log('👉 Waiting for Socket.IO connections...');
});

module.exports = { app, io };