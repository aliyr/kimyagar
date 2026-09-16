/**
 * بذر تعیین‌پذیر شبیه‌سازی پخت از شناسه‌ی مشتری: هر سفارش انیمیشن یکتا ولی
 * تکرارپذیر دارد (FNV-1a 32 بیتی؛ خروجی هرگز صفر نیست چون Rng صفر را ۱ می‌کند).
 */
export function seedForCustomer(customerId: string, round = 0): number {
  let h = 0x811c9dc5;
  const text = `${customerId}#${round}`;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0 || 1;
}
