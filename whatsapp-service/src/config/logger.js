import pino from 'pino';

export const logger = pino({
  name: 'drmirror-whatsapp-service',
  level: process.env.LOG_LEVEL ?? 'info',
});
