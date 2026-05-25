function bearerToken(req) {
  const header = req.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1] ?? null;
}

function constantTimeEquals(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export function requireInternalApiKey(config) {
  return (req, res, next) => {
    const token = req.get('x-internal-api-key') ?? bearerToken(req);
    if (!constantTimeEquals(token, config.internalApiKey)) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    return next();
  };
}

export function requirePairingToken(config) {
  return (req, res, next) => {
    const token = req.get('x-pairing-admin-token') ?? 
                  bearerToken(req) ?? 
                  req.get('x-internal-api-key') ?? 
                  req.query.token ??
                  req.params.token;
    if (!constantTimeEquals(token, config.pairingAdminToken) && !constantTimeEquals(token, config.internalApiKey)) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    return next();
  };
}
