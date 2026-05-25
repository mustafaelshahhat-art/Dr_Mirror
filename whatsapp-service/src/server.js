import 'dotenv/config';
import { createServer } from 'node:http';

import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { logger } from './config/logger.js';
import { SendRateLimiter } from './services/rateLimiter.js';
import { WhatsAppClientService } from './services/whatsappClient.js';

let config;
try {
  config = loadConfig();
} catch (err) {
  logger.fatal({ err: err.message }, 'Fatal configuration error — service cannot start safely');
  process.exit(1);
}

if (config.configErrors.length > 0) {
  for (const { key, reason } of config.configErrors) {
    logger.error({ key, reason }, `Configuration error: ${key} — ${reason}`);
  }
  logger.warn('Service starting in degraded mode — WhatsApp will not connect until configuration is resolved');
} else {
  logger.info({ port: config.port, env: config.nodeEnv }, 'Configuration loaded successfully');
}

const rateLimiter = new SendRateLimiter(config);
const client = new WhatsAppClientService(config, rateLimiter);
const app = createApp(config, client);
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
