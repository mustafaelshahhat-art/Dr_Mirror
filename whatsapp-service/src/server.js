import 'dotenv/config';
import { createServer } from 'node:http';

import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { logger } from './config/logger.js';
import { CircuitBreaker } from './services/circuitBreaker.js';
import { SendRateLimiter } from './services/rateLimiter.js';
import { WhatsAppClientService } from './services/whatsappClient.js';

const config = loadConfig();
const rateLimiter = new SendRateLimiter(config);
const client = new WhatsAppClientService(config, rateLimiter);
const circuitBreaker = new CircuitBreaker();
const app = createApp(config, client, circuitBreaker);
const server = createServer(app);

server.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'WhatsApp service listening');
  void client.initialize();
});

async function shutdown(signal) {
  logger.info({ signal }, 'WhatsApp service shutting down');
  server.close(async () => {
    await client.shutdown();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
