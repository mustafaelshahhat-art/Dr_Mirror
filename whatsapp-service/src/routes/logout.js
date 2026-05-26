import { requireInternalApiKey } from '../auth/tokens.js';

export function registerLogoutRoutes(app, config, client) {
  const auth = requireInternalApiKey(config);

  app.post('/api/logout', auth, async (_req, res) => {
    try {
      await client.logout();
      res.status(204).send();
    } catch (err) {
      const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
      res.status(statusCode).json({ error: err instanceof Error ? err.message : 'logout_failed' });
    }
  });
}
