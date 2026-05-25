import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { MongoClient } from 'mongodb';
import qrcode from 'qrcode';

import { useMongoAuthState } from '../auth/mongoAuthState.js';
import { logger } from '../config/logger.js';
import { randomDelay } from '../utils/delay.js';
import { maskPhone, toWhatsAppJid } from '../utils/phone.js';

export class WhatsAppClientService {
  constructor(config, rateLimiter) {
    this.config = config;
    this.rateLimiter = rateLimiter;
    this.mongo = null;
    this.sock = null;
    this.starting = null;
    this.state = config.mongodbUri ? 'initializing' : 'configuration_error';
    this.qrDataUri = null;
    this.lastSentAt = null;
    this.lastError = config.mongodbUri ? null : 'MONGODB_URI is required';
    this.reconnectTimer = null;
  }

  async initialize() {
    if (!this.config.mongodbUri) return;
    if (this.starting) return this.starting;

    this.starting = this.connect().finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  async connect() {
    try {
      this.state = 'initializing';
      this.mongo ??= new MongoClient(this.config.mongodbUri, { maxPoolSize: 5 });
      await this.mongo.connect();
      const db = this.mongo.db();
      const collection = db.collection('baileys_auth_state');
      const { state, saveCreds } = await useMongoAuthState(collection);
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
          logger.info('WhatsApp QR refreshed');
        }

        if (connection === 'open') {
          this.state = 'connected';
          this.qrDataUri = null;
          this.lastError = null;
          logger.info('WhatsApp connected');
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const loggedOut = statusCode === DisconnectReason.loggedOut;
          this.sock = null;
          this.state = loggedOut ? 'auth_failed' : 'disconnected';
          this.lastError = lastDisconnect?.error?.message ?? 'connection_closed';
          logger.warn({ statusCode, loggedOut }, 'WhatsApp connection closed');
          if (!loggedOut) this.scheduleReconnect();
        }
      });
    } catch (err) {
      this.state = 'disconnected';
      this.lastError = err instanceof Error ? err.message : 'startup_failed';
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
    return {
      state: this.state,
      qrAvailable: Boolean(this.qrDataUri),
      lastSentAt: this.lastSentAt,
      error: this.lastError,
    };
  }

  pair() {
    return {
      state: this.state,
      qrAvailable: Boolean(this.qrDataUri),
      qrDataUri: this.qrDataUri,
    };
  }

  async sendMessage(phone, message) {
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

    await randomDelay(this.config.sendDelayMinMs, this.config.sendDelayMaxMs);
    await this.sock.sendMessage(jid, { text: String(message) });
    this.rateLimiter.record(phone);
    this.lastSentAt = new Date().toISOString();
    this.lastError = null;
    logger.info({ phone: maskPhone(phone) }, 'WhatsApp message sent');
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
  }
}
