const MIN_SECRET_LENGTH = 32;

export function loadConfig() {
  const configErrors = [];

  const internalApiKey = process.env.INTERNAL_API_KEY ?? '';
  const pairingAdminToken = process.env.PAIRING_ADMIN_TOKEN ?? '';
  const mongodbUri = process.env.MONGODB_URI ?? '';

  // INTERNAL_API_KEY is security-critical — throw so startup fails hard.
  if (!internalApiKey) {
    throw new Error('INTERNAL_API_KEY environment variable is required but not set.');
  }
  if (internalApiKey.length < MIN_SECRET_LENGTH) {
    throw new Error(`INTERNAL_API_KEY must be at least ${MIN_SECRET_LENGTH} characters long.`);
  }
  // PAIRING_ADMIN_TOKEN is optional — when absent, the pairing endpoints accept
  // INTERNAL_API_KEY instead (see requirePairingToken in tokens.js).
  if (pairingAdminToken && pairingAdminToken.length < MIN_SECRET_LENGTH) {
    throw new Error(`PAIRING_ADMIN_TOKEN must be at least ${MIN_SECRET_LENGTH} characters long when set.`);
  }

  // Non-security required config — collect errors but allow service to start in degraded mode.
  if (!mongodbUri) {
    configErrors.push({ key: 'MONGODB_URI', reason: 'required but not set' });
  }

  return {
    port: intFromEnv('PORT', 3005),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    mongodbUri,
    internalApiKey,
    pairingAdminToken,
    enablePairingUi: boolFromEnv('ENABLE_PAIRING_UI', false),
    sendDelayMinMs: intFromEnv('SEND_DELAY_MIN_MS', 5000),
    sendDelayMaxMs: intFromEnv('SEND_DELAY_MAX_MS', 15000),
    dailyPhoneLimit: intFromEnv('DAILY_PHONE_LIMIT', 10),
    globalSendLimitPerMinute: intFromEnv('GLOBAL_SEND_LIMIT_PER_MINUTE', 60),
    configErrors,
  };
}

function intFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function boolFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}
