/** رنگ‌های مشتق از مایعِ دورریخته — مشترک بین دیگِ پرنده و لکه‌ی دیوار */

import { hexToRgb, saturate, scaleRgb, tintWhite, type RGB } from '../../art/flat/kit/color.ts';

export interface DiscardTones {
  base: RGB;
  deep: RGB;
  light: RGB;
  glint: RGB;
}

export function tonesFor(hex: string, burnt: boolean): DiscardTones {
  const raw = hexToRgb(hex);
  // مایعِ ریخته غلیظ‌تر و پررنگ‌تر از سطحِ روشنِ داخل دیگ دیده می‌شود
  const base = burnt ? scaleRgb(raw, 0.7) : saturate(scaleRgb(raw, 0.9), 1.15);
  return { base, deep: scaleRgb(base, 0.5), light: tintWhite(base, 0.3), glint: tintWhite(base, 0.72) };
}

export function rgbA([r, g, b]: RGB, a: number): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
