const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env')
});

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectRedis } = require('./config/redis');
const { initFirebase } = require('./config/firebase');
const { initializeSocket } = require('./config/socket');
const { cleanExpiredTokens } = require('./utils/jwt');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Initialize connections
    await connectRedis();
    
    initFirebase();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO
    const io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    initializeSocket(io);

    // Periodic cleanup of expired refresh tokens (every hour) with retry
    setInterval(async () => {
      const MAX_RETRIES = 2;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const deleted = await cleanExpiredTokens();
          if (deleted > 0) console.log(`🧹 Cleaned ${deleted} expired refresh tokens`);
          break; // success — exit retry loop
        } catch (err) {
          if (attempt === MAX_RETRIES) {
            console.error(`Token cleanup failed after ${MAX_RETRIES} attempts:`, err.message);
          } else {
            console.warn(`Token cleanup attempt ${attempt} failed, retrying in 5s…`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      }
    }, 60 * 60 * 1000);


    // Start listening
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════╗
║  🏘️  Society Management API               ║
║  ✅  Server running on port ${PORT}          ║
║  📡  Socket.IO enabled                     ║
║  🌍  Environment: ${process.env.NODE_ENV?.padEnd(12)} ║
╚════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        try {
          const { pool } = require('./config/database');
          const { getRedisClient } = require('./config/redis');
          await pool.end();
          await getRedisClient().quit();
          console.log('Cleanup complete. Goodbye!');
          process.exit(0);
        } catch (err) {
          console.error('Cleanup error:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Unhandled errors
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      process.exit(1);
    });

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();