import express from 'express';

import { registerHealthRoutes } from './routes/health.js';
import { registerLogoutRoutes } from './routes/logout.js';
import { registerSendRoutes } from './routes/send.js';
import { registerStatusRoutes } from './routes/status.js';

export function createApp(config, client) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  registerHealthRoutes(app, client);
  registerStatusRoutes(app, config, client);
  registerSendRoutes(app, config, client);
  registerLogoutRoutes(app, config, client);

  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  return app;
}
