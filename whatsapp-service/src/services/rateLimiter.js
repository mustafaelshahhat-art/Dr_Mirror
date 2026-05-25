import { normalizePhone } from '../utils/phone.js';

export class SendRateLimiter {
  constructor(config) {
    this.config = config;
    this.globalSends = [];
    this.dailyByPhone = new Map();
  }

  check(phone) {
    const now = Date.now();
    this.globalSends = this.globalSends.filter((timestamp) => now - timestamp < 60_000);
    if (this.globalSends.length >= this.config.globalSendLimitPerMinute) {
      return { ok: false, reason: 'global_rate_limit' };
    }

    const dayKey = new Date().toISOString().slice(0, 10);
    const normalized = normalizePhone(phone) ?? phone;
    const phoneKey = `${dayKey}:${normalized}`;
    const count = this.dailyByPhone.get(phoneKey) ?? 0;
    if (count >= this.config.dailyPhoneLimit) {
      return { ok: false, reason: 'daily_phone_limit' };
    }

    return { ok: true };
  }

  record(phone) {
    const now = Date.now();
    const dayKey = new Date().toISOString().slice(0, 10);
    const normalized = normalizePhone(phone) ?? phone;
    const phoneKey = `${dayKey}:${normalized}`;
    this.globalSends.push(now);
    this.dailyByPhone.set(phoneKey, (this.dailyByPhone.get(phoneKey) ?? 0) + 1);
  }
}
