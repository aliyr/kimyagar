/**
 * کمک‌تابع‌های رنگ برای مایع پاتیل و placeholder ها.
 * رنگ مایع = ترکیب وزنی رنگ مواد افزوده‌شده (وزن = مقدار).
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** رنگ آب گل‌آلودِ پاتیل خالی */
export const MURKY_WATER: Rgb = { r: 74, g: 80, b: 66 };

export function parseColor(input: string): Rgb {
  const hex = input.trim().replace('#', '');
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }
  if (hex.length >= 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  return { ...MURKY_WATER };
}

export function rgbString(c: Rgb, alpha = 1): string {
  const q = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return alpha >= 1
    ? `rgb(${q(c.r)}, ${q(c.g)}, ${q(c.b)})`
    : `rgba(${q(c.r)}, ${q(c.g)}, ${q(c.b)}, ${alpha})`;
}

export function mixColors(items: { color: string; weight: number }[]): Rgb {
  let total = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (const item of items) {
    const w = Math.max(item.weight, 0.001);
    const c = parseColor(item.color);
    r += c.r * w;
    g += c.g * w;
    b += c.b * w;
    total += w;
  }
  if (total <= 0) return { ...MURKY_WATER };
  return { r: r / total, g: g / total, b: b / total };
}

export function shade(c: Rgb, amount: number): Rgb {
  // amount > 0 روشن‌تر، amount < 0 تیره‌تر
  if (amount >= 0) {
    return {
      r: c.r + (255 - c.r) * amount,
      g: c.g + (255 - c.g) * amount,
      b: c.b + (255 - c.b) * amount,
    };
  }
  const k = 1 + amount;
  return { r: c.r * k, g: c.g * k, b: c.b * k };
}

export function desaturate(c: Rgb, amount: number): Rgb {
  const gray = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
  return {
    r: c.r + (gray - c.r) * amount,
    g: c.g + (gray - c.g) * amount,
    b: c.b + (gray - c.b) * amount,
  };
}
