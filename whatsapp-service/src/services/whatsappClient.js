import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { MongoClient } from 'mongodb';
import qrcode from 'qrcode';

import { useMongoAuthState } from '../auth/mongoAuthState.js';
import { logger } from '../config/logger.js';
import { randomDelay } from '../utils/delay.js';
import { maskPhone, toWhatsAppJid } from '../utils/phone.js';

function maskMongoUri(uri) {
  try {
    return String(uri).replace(/\/\/[^:@]+:[^@]*@/, '//<user>:<password>@');
  } catch {
    return '<invalid-uri>';
  }
}

function publicConnectionErrorCode(state, mongoError, lastError) {
  if (state === 'configuration_error') return 'configuration_error';
  if (state === 'auth_failed') return 'auth_failed';
  if (mongoError) return 'mongo_connection_failed';
  if (lastError) return 'connection_error';
  return null;
}

export class WhatsAppClientService {
  constructor(config, rateLimiter) {
    this.config = config;
    this.rateLimiter = rateLimiter;
    this.mongo = null;
    this.sock = null;
    this.starting = null;
    this.mongoConnected = false;
    this.mongoError = null;
    this.reconnectTimer = null;
    this.qrDataUri = null;
    this.lastSentAt = null;
    this.lastConnectedAt = null;
    this.lastDisconnectReason = null;

    const hasConfigErrors = config.configErrors.length > 0;
    this.state = hasConfigErrors ? 'configuration_error' : 'initializing';
    this.lastError = hasConfigErrors
      ? config.configErrors.map((e) => `${e.key}: ${e.reason}`).join('; ')
      : null;

    if (hasConfigErrors) {
      for (const { key, reason } of config.configErrors) {
        logger.error({ key, reason }, `WhatsApp client cannot start: ${key} — ${reason}`);
      }
    }
  }

  async initialize() {
    if (this.config.configErrors.length > 0) {
      logger.warn(
        { configErrors: this.config.configErrors },
        'WhatsApp initialization skipped — configuration errors must be resolved first',
      );
      return;
    }
    if (this.starting) return this.starting;

    this.starting = this.connect().finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  async connect() {
    logger.info('WhatsApp connect starting');
    try {
      this.state = 'initializing';
      this.mongoError = null;

      logger.info({ uri: maskMongoUri(this.config.mongodbUri) }, 'WhatsApp Mongo connecting');
      this.mongo ??= new MongoClient(this.config.mongodbUri, { maxPoolSize: 5 });
      const mongoStartedAt = Date.now();
      await this.mongo.connect();
      this.mongoConnected = true;
      this.mongoError = null;
      logger.info({ elapsedMs: Date.now() - mongoStartedAt }, 'WhatsApp Mongo connected');

      const db = this.mongo.db();
      const collection = db.collection('baileys_auth_state');
      const authStartedAt = Date.now();
      const { state, saveCreds } = await useMongoAuthState(collection);
      logger.info({ elapsedMs: Date.now() - authStartedAt }, 'WhatsApp Mongo auth state loaded');

      logger.info('WhatsApp Baileys socket starting');
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger,
      });

      this.sock.ev.on('creds.update', saveCreds);
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrDataUri = await qrcode.toDataURL(qr);
          this.state = 'qr_required';
          this.lastError = null;
          logger.info('WhatsApp QR generated — pairing required');
        }

        if (connection === 'open') {
          this.state = 'connected';
          this.qrDataUri = null;
          this.lastConnectedAt = new Date().toISOString();
          this.lastDisconnectReason = null;
          this.lastError = null;
          logger.info('WhatsApp connected');
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const loggedOut = statusCode === DisconnectReason.loggedOut;
          this.sock = null;
          this.state = loggedOut ? 'auth_failed' : 'disconnected';
          this.lastDisconnectReason = lastDisconnect?.error?.message ?? 'connection_closed';
          this.lastError = this.lastDisconnectReason;
          logger.warn({ statusCode, loggedOut }, 'WhatsApp connection closed');
          if (!loggedOut) this.scheduleReconnect();
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'startup_failed';
      if (!this.mongoConnected) {
        this.mongoError = message;
        await this.mongo?.close().catch(() => {});
        this.mongo = null;
      }
      this.state = 'disconnected';
      this.lastError = message;
      logger.error({ err }, 'WhatsApp connect failed');
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.initialize();
    }, 5000);
  }

  status() {
    const configurationValid = this.config.configErrors.length === 0;
    const whatsappConnected = this.state === 'connected';
    const pairingRequired = this.state === 'qr_required' || this.state === 'auth_failed';
    const errorCode = publicConnectionErrorCode(this.state, this.mongoError, this.lastError);

    return {
      serviceRunning: true,
      configurationValid,
      mongoConnected: this.mongoConnected,
      whatsappConnected,
      pairingRequired,
      connectionState: this.state,
      errorCode,
      errorMessage: errorCode,
      // Fields used by the backend /status contract (State, QrAvailable, LastSentAt, Error)
      state: this.state,
      qrAvailable: Boolean(this.qrDataUri),
      lastSentAt: this.lastSentAt,
      error: errorCode,
      // Extended fields for admin dashboard
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectReason: errorCode,
      pendingReconnect: Boolean(this.reconnectTimer),
    };
  }

  pair() {
    return {
      state: this.state,
      qrAvailable: Boolean(this.qrDataUri),
      qrDataUri: this.qrDataUri,
      configErrors: this.config.configErrors.length > 0 ? this.config.configErrors : undefined,
      mongoError: this.mongoError ?? undefined,
    };
  }

  async sendMessage(phone, message, options = {}) {
    if (!this.sock || this.state !== 'connected') {
      const err = new Error('not_connected');
      err.statusCode = 503;
      throw err;
    }

    const jid = toWhatsAppJid(phone);
    if (!jid || !message) {
      const err = new Error('phone_and_message_required');
      err.statusCode = 400;
      throw err;
    }

    const rate = this.rateLimiter.check(phone);
    if (!rate.ok) {
      const err = new Error(rate.reason);
      err.statusCode = 429;
      throw err;
    }

    const priority = String(options.priority ?? 'normal').toLowerCase();
    if (priority !== 'high') {
      await randomDelay(this.config.sendDelayMinMs, this.config.sendDelayMaxMs);
    }

    // Re-check after the delay — the connection may have dropped while waiting.
    const sock = this.sock;
    if (!sock || this.state !== 'connected') {
      const err = new Error('not_connected');
      err.statusCode = 503;
      throw err;
    }

    const sendStartedAt = Date.now();
    await sock.sendMessage(jid, { text: String(message) });
    this.rateLimiter.record(phone);
    this.lastSentAt = new Date().toISOString();
    this.lastError = null;
    logger.info({ phone: maskPhone(phone), priority, elapsedMs: Date.now() - sendStartedAt }, 'WhatsApp Baileys sendMessage completed');
  }

  async shutdown() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    try {
      this.sock?.end?.();
    } catch {
      // Baileys socket may already be closed during Render shutdown.
    }
    await this.mongo?.close();
    this.mongoConnected = false;
  }
}
