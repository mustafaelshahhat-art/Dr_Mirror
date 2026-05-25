export function toWhatsAppJid(phone) {
  let digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  // Strip IDD prefix (00 → international format)
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Egyptian local numbers: 11 digits starting with 0 followed by 1 → prepend country code 20
  if (digits.length === 11 && digits.startsWith('01')) digits = '20' + digits.slice(1);
  return `${digits}@s.whatsapp.net`;
}

export function normalizePhone(phone) {
  let digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('01')) digits = '20' + digits.slice(1);
  return digits;
}

export function maskPhone(phone) {
  const value = String(phone ?? '').trim();
  if (!value) return 'unknown';
  const digits = [...value].map((ch, index) => ({ ch, index })).filter((x) => /\d/.test(x.ch));
  if (digits.length <= 4) return '*'.repeat(value.length);
  const chars = [...value];
  for (const { index } of digits.slice(2, -4)) chars[index] = '*';
  return chars.join('');
}
