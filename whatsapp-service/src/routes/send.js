import { requireInternalApiKey } from '../auth/tokens.js';
import { logger } from '../config/logger.js';
import { renderTemplate } from '../templates/messages.js';

export function registerSendRoutes(app, config, client, circuitBreaker) {
  const auth = requireInternalApiKey(config);

  app.post('/send-message', auth, async (req, res) => {
    if (circuitBreaker.isOpen()) {
      return res.status(503).json({ success: false, error: 'circuit_open', retryable: true });
    }
    try {
      const { phone, message } = req.body ?? {};
      await client.sendMessage(phone, message);
      circuitBreaker.recordSuccess();
      res.json({ success: true });
    } catch (err) {
      const statusCode = err?.statusCode ?? 500;
      if (statusCode !== 400 && statusCode !== 429) {
        circuitBreaker.recordFailure();
      }
      respondWithError(res, err);
    }
  });

  app.post('/send-template', auth, async (req, res) => {
    logger.warn('DEPRECATED: /send-template is not called by the outbox flow; this route will be removed in a future version');
    try {
      const { phone, template, data } = req.body ?? {};
      const message = renderTemplate(template, data);
      await client.sendMessage(phone, message);
      res.json({ success: true });
    } catch (err) {
      respondWithError(res, err);
    }
  });
}

function respondWithError(res, err) {
  const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  const retryable = statusCode !== 400;
  res.status(statusCode).json({
    success: false,
    error: err instanceof Error ? err.message : 'send_failed',
    retryable,
  });
}
