import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import itemRoutes from './routes/items.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';
import mlRoutes from './routes/ml.js';

dotenv.config();

console.log("🚀 Starting server...");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Make io globally accessible
global.io = io;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb' }));

// Simple request timing & logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  // set per-request timeout to protect against hanging requests
  res.setTimeout(30 * 1000, () => {
    console.warn(`Request timeout: ${req.method} ${req.originalUrl}`);
  });
  res.once('finish', () => {
    const duration = Date.now() - start;
    console.log(`[Request] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ml', mlRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  try {
    const handshakeUserId = socket.handshake?.auth?.userId;
    if (handshakeUserId) {
      console.log(`Auto-joining user room for ${handshakeUserId}`);
      socket.join(`user_${handshakeUserId}`);
    }
  } catch (e) {
    console.warn('Failed to auto-join user room from handshake', e);
  }

  socket.on("join_user", (userId, cb) => {
    console.log(`User ${userId} joined their room`);
    socket.join(`user_${userId}`);
    try {
      if (typeof cb === 'function') cb({ ok: true });
    } catch (e) {
      console.error('join_user callback failed', e);
    }
  });

  socket.on("join_conversation", (conversationId, cb) => {
    console.log(`Socket ${socket.id} joining conversation_${conversationId}`);
    socket.join(`conversation_${conversationId}`);
    try {
      if (typeof cb === 'function') cb({ ok: true });
    } catch (e) {
      console.error('join_conversation callback failed', e);
    }
  });

  socket.on('leave_conversation', (conversationId, cb) => {
    console.log(`Socket ${socket.id} leaving conversation_${conversationId}`);
    socket.leave(`conversation_${conversationId}`);
    try {
      if (typeof cb === 'function') cb({ ok: true });
    } catch (e) {
      console.error('leave_conversation callback failed', e);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

const start = async () => {
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    console.log(`Listening on ${host}:${port}`);
    server.listen(port, host, () => {
      console.log(`Server listening on ${host}:${port}`);
    });

    // Keep-alive mechanism for Render Free Tier (optional)
    const pingUrl = process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/health` : null;
    if (pingUrl) {
      console.log(`⏰ Setting up keep-alive ping for ${pingUrl}`);
      setInterval(async () => {
        try {
          await fetch(pingUrl);
        } catch (e) {
          console.error('Ping failed', e);
        }
      }, 14 * 60 * 1000); // 14 minutes
    }
  } catch (err) {
    console.error('❌ Error starting server:', err);
    process.exit(1);
  }
};

start();
