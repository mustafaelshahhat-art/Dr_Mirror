import { requirePairingToken } from '../auth/tokens.js';

export function registerStatusRoutes(app, config, client) {
  const auth = requirePairingToken(config);

  app.get('/status', auth, (_req, res) => {
    res.json(client.status());
  });

  app.get(['/pair', '/qr', '/qr/:token', '/qr:token'], auth, (req, res) => {
    const pairing = client.pair();

    // Render HTML for browser requests or when using UI-friendly token routes
    const isBrowser = req.get('accept')?.includes('text/html');
    const isUrlToken = req.params.token || req.query.token;

    if (isBrowser || isUrlToken) {
      if (pairing.state === 'connected') {
        return res.send('<html><body style="background:#111;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>Already Connected</h1><p>WhatsApp is linked and ready.</p></body></html>');
      }
      if (!pairing.qrDataUri) {
        return res.send('<html><body style="background:#111;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h1>Waiting for QR...</h1><p>The service is initializing. Please refresh in 5 seconds.</p><script>setTimeout(()=>location.reload(),5000)</script></body></html>');
      }
      return res.send(`
        <html>
          <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#111; color:white; font-family:sans-serif; text-align:center;">
            <h1 style="color:#25D366;">Scan with WhatsApp</h1>
            <div style="background:white; padding:20px; border-radius:15px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
              <img src="${pairing.qrDataUri}" style="display:block;" />
            </div>
            <p style="margin-top:20px; opacity:0.8;">This QR code refreshes automatically.</p>
            <script>setTimeout(() => window.location.reload(), 30000);</script>
          </body>
        </html>
      `);
    }

    if (pairing.state === 'connected') return res.status(409).json({ error: 'already_connected' });
    return res.json(pairing);
  });
}
