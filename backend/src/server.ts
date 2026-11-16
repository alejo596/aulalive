import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { setupSessionSockets } from './sockets/session.socket';
import prisma from './config/database';

const PORT = process.env.PORT || 4000;
const app = createApp();
const server = http.createServer(app);

// Socket.IO Server Setup
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

// Attach WebSockets
setupSessionSockets(io);

// Server startup
server.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🚀 AulaLive Backend Server is running on port ${PORT}`);
  console.log(`📡 WebSocket Engine active via Socket.IO`);
  console.log(`📊 PostgreSQL Database: ${process.env.DATABASE_URL ? 'Configured' : 'Default'}`);
  console.log(`🔗 Healthcheck available at: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});

// Graceful Shutdown
const shutdown = async () => {
  console.log('\n🛑 Shutting down AulaLive server gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('✅ PostgreSQL connection closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

