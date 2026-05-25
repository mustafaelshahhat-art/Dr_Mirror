export function registerHealthRoutes(app, client) {
  app.get('/health', (_req, res) => {
    const s = client.status();
    res.json({
      serviceRunning: s.serviceRunning,
      configurationValid: s.configurationValid,
      mongoConnected: s.mongoConnected,
      whatsappConnected: s.whatsappConnected,
      pairingRequired: s.pairingRequired,
      connectionState: s.connectionState,
      errorCode: s.errorCode ?? null,
      errorMessage: s.errorMessage ?? null,
    });
  });

  app.get('/ready', (_req, res) => {
    const status = client.status();
    res.status(status.whatsappConnected && status.mongoConnected ? 200 : 503).json(status);
  });
}
