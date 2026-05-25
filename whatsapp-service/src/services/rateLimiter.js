import { normalizePhone } from '../utils/phone.js';

export class SendRateLimiter {
  constructor(config) {
    this.config = config;
    this.globalSends = [];
    this.dailyByPhone = new Map();
  }

  phoneKey(phone) {
    const dayKey = new Date().toISOString().slice(0, 10);
    const normalized = normalizePhone(phone) ?? phone;
    return `${dayKey}:${normalized}`;
  }

  pruneGlobal(now) {
    this.globalSends = this.globalSends.filter((timestamp) => now - timestamp < 60_000);
  }

  check(phone) {
    const now = Date.now();
    this.pruneGlobal(now);
    if (this.globalSends.length >= this.config.globalSendLimitPerMinute) {
      return { ok: false, reason: 'global_rate_limit' };
    }

    const phoneKey = this.phoneKey(phone);
    const count = this.dailyByPhone.get(phoneKey) ?? 0;
    if (count >= this.config.dailyPhoneLimit) {
      return { ok: false, reason: 'daily_phone_limit' };
    }

    return { ok: true };
  }

  reserve(phone) {
    const rate = this.check(phone);
    if (!rate.ok) return rate;

    const timestamp = Date.now();
    const phoneKey = this.phoneKey(phone);
    this.globalSends.push(timestamp);
    this.dailyByPhone.set(phoneKey, (this.dailyByPhone.get(phoneKey) ?? 0) + 1);

    let released = false;
    return {
      ok: true,
      release: () => {
        if (released) return;
        released = true;

        const index = this.globalSends.indexOf(timestamp);
        if (index >= 0) this.globalSends.splice(index, 1);

        const count = this.dailyByPhone.get(phoneKey) ?? 0;
        if (count <= 1) this.dailyByPhone.delete(phoneKey);
        else this.dailyByPhone.set(phoneKey, count - 1);
      },
    };
  }

  record(phone) {
    const now = Date.now();
    const phoneKey = this.phoneKey(phone);
    this.globalSends.push(now);
    this.dailyByPhone.set(phoneKey, (this.dailyByPhone.get(phoneKey) ?? 0) + 1);
  }
}
