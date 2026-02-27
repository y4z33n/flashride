/**
 * Entry point — loads config (fails fast on missing env vars),
 * then starts the Express server.
 */

import { config } from './config';
import { createApp } from './app';
import { logger } from './lib/logger';

const app = createApp();

const server = app.listen(config.server.port, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║            FlashRide API Server                  ║
╠══════════════════════════════════════════════════╣
║  Status  : Running                               ║
║  Port    : ${String(config.server.port).padEnd(38)}║
║  Env     : ${config.server.nodeEnv.padEnd(38)}║
║  Version : ${config.app.version.padEnd(38)}║
╚══════════════════════════════════════════════════╝
  `.trim());
  console.log(`  → http://localhost:${config.server.port}/health`);
  console.log(`  → http://localhost:${config.server.port}/version`);
  console.log(`  → http://localhost:${config.server.port}/me  (needs Bearer token)\n`);
});

// Friendly error if port is already in use (avoids cryptic Node crash)
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${config.server.port} is already in use.`);
    console.error(`    Kill the process holding it with:`);
    console.error(`    netstat -ano | findstr ":${config.server.port}"`);
    console.error(`    taskkill /PID <pid> /F\n`);
    process.exit(1);
  }
  throw err;
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});
