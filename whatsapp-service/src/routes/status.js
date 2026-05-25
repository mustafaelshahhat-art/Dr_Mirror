import { requirePairingToken } from '../auth/tokens.js';

function htmlPage(title, bodyHtml) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escHtml(title)}</title></head><body style="background:#111;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;text-align:center;padding:2rem;box-sizing:border-box;">${bodyHtml}</body></html>`;
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function registerStatusRoutes(app, config, client) {
  const auth = requirePairingToken(config);

  app.get('/status', auth, (_req, res) => {
    res.json(client.status());
  });

  app.get(['/pair', '/qr', '/qr/:token', '/qr:token'], auth, (req, res) => {
    const pairing = client.pair();

    const isBrowser = req.get('accept')?.includes('text/html');
    const isUrlToken = req.params.token || req.query.token;

    if (isBrowser || isUrlToken) {
      if (pairing.state === 'connected') {
        return res.send(htmlPage('Already Connected',
          '<h1 style="color:#25D366;">Already Connected</h1><p>WhatsApp is linked and sending notifications.</p>'));
      }

      if (pairing.configErrors?.length > 0) {
        const list = pairing.configErrors
          .map((e) => `<li style="font-family:monospace;">${escHtml(e.key)}: ${escHtml(e.reason)}</li>`)
          .join('');
        return res.send(htmlPage('Configuration Error',
          `<h1 style="color:#ef4444;">Configuration Error</h1>
           <p>The service cannot connect because required configuration is missing:</p>
           <ul style="text-align:start;margin:1rem 0;">${list}</ul>
           <p style="opacity:0.6;font-size:0.85em;">Fix the environment variables and restart the service.</p>`));
      }

      if (pairing.mongoError) {
        return res.send(htmlPage('Mongo Connection Failed',
          `<h1 style="color:#ef4444;">Mongo Connection Failed</h1>
           <p>Could not connect to MongoDB. The service will retry automatically.</p>
           <p style="font-family:monospace;font-size:0.8em;opacity:0.6;word-break:break-all;">${escHtml(pairing.mongoError)}</p>
           <script>setTimeout(()=>location.reload(),10000)</script>`));
      }

      if (pairing.state === 'auth_failed') {
        return res.send(htmlPage('Authentication Failed',
          '<h1 style="color:#ef4444;">WhatsApp Authentication Failed</h1>' +
          '<p>The session was logged out. A new QR code will appear once the service reconnects.</p>' +
          '<script>setTimeout(()=>location.reload(),5000)</script>'));
      }

      if (pairing.qrDataUri) {
        return res.send(htmlPage('Scan with WhatsApp',
          `<h1 style="color:#25D366;">Scan with WhatsApp</h1>
           <div style="background:white;padding:20px;border-radius:15px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
             <img src="${pairing.qrDataUri}" style="display:block;" alt="WhatsApp QR code" />
           </div>
           <p style="margin-top:20px;opacity:0.8;">Open WhatsApp → Linked devices → Scan this code.</p>
           <p style="opacity:0.5;font-size:0.8em;">Refreshes automatically in 30 s.</p>
           <script>setTimeout(()=>location.reload(),30000)</script>`));
      }

      return res.send(htmlPage('Initializing',
        '<h1>Waiting for QR...</h1>' +
        '<p>The service is connecting to WhatsApp. Please refresh in a few seconds.</p>' +
        '<script>setTimeout(()=>location.reload(),5000)</script>'));
    }

    if (pairing.state === 'connected') return res.status(409).json({ error: 'already_connected' });
    return res.json(pairing);
  });
}
