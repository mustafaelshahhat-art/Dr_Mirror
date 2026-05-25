import { requireInternalApiKey } from '../auth/tokens.js';
import { logger } from '../config/logger.js';
import { renderTemplate } from '../templates/messages.js';

export function registerSendRoutes(app, config, client) {
  const auth = requireInternalApiKey(config);

  app.post('/send-message', auth, async (req, res) => {
    const startedAt = Date.now();
    try {
      const { phone, message, priority = 'normal' } = req.body ?? {};
      logger.info({ priority }, 'WhatsApp send request received');
      await client.sendMessage(phone, message, { priority });
      const elapsedMs = Date.now() - startedAt;
      logger.info({ priority, elapsedMs }, 'WhatsApp send request completed');
      res.json({ ok: true, elapsedMs });
    } catch (err) {
      logger.warn({ err, elapsedMs: Date.now() - startedAt }, 'WhatsApp send request failed');
      respondWithError(res, err);
    }
  });

  app.post('/send-template', auth, async (req, res) => {
    const startedAt = Date.now();
    try {
      const { phone, template, data, priority = 'normal' } = req.body ?? {};
      logger.info({ priority, template }, 'WhatsApp template send request received');
      const message = renderTemplate(template, data);
      await client.sendMessage(phone, message, { priority });
      const elapsedMs = Date.now() - startedAt;
      logger.info({ priority, template, elapsedMs }, 'WhatsApp template send request completed');
      res.json({ ok: true, elapsedMs });
    } catch (err) {
      logger.warn({ err, elapsedMs: Date.now() - startedAt }, 'WhatsApp template send request failed');
      respondWithError(res, err);
    }
  });
}

function respondWithError(res, err) {
  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  res.status(statusCode).json({ error: err instanceof Error ? err.message : 'send_failed' });
}
