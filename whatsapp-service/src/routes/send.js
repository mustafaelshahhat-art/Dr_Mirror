import { requireInternalApiKey } from '../auth/tokens.js';
import { renderTemplate } from '../templates/messages.js';

export function registerSendRoutes(app, config, client) {
  const auth = requireInternalApiKey(config);

  app.post('/send-message', auth, async (req, res) => {
    try {
      const { phone, message } = req.body ?? {};
      await client.sendMessage(phone, message);
      res.json({ ok: true });
    } catch (err) {
      respondWithError(res, err);
    }
  });

  app.post('/send-template', auth, async (req, res) => {
    try {
      const { phone, template, data } = req.body ?? {};
      const message = renderTemplate(template, data);
      await client.sendMessage(phone, message);
      res.json({ ok: true });
    } catch (err) {
      respondWithError(res, err);
    }
  });
}

function respondWithError(res, err) {
  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  res.status(statusCode).json({ error: err instanceof Error ? err.message : 'send_failed' });
}
