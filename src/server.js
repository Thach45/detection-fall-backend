require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fallDetectionRoutes = require('./routes/fallDetection.routes');
const http = require('http');
const socketIo = require('socket.io');

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

// Serve test client
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-client.html'));
});

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  console.log('Transport used:', socket.conn.transport.name);

  socket.onAny((eventName, ...args) => {
    console.log('Received event:', eventName, 'with args:', args);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.emit('connection_confirmed', {
    socketId: socket.id,
    transport: socket.conn.transport.name
  });
});

app.set('io', io);

const PORT = process.env.PORT || 3000;

// Export for development
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Test client available at http://localhost:${PORT}/test`);
  console.log('👉 Waiting for Socket.IO connections...');
});

// Export both app and server for Vercel
module.exports = process.env.NODE_ENV === 'production' ? server : app;
