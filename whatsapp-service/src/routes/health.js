export function registerHealthRoutes(app, client) {
  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'drmirror-whatsapp-service', whatsappState: client.status().state });
  });
}
