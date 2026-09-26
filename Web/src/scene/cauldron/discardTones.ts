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
  // همان فام مایع داخل دیگ، کمی اشباع‌تر تا روی چوب تیره زنده بماند.
  // سوخته تقریباً همان رنگ تیرهٔ داخل دیگ می‌ماند.
  const base = burnt ? scaleRgb(raw, 0.96) : saturate(raw, 1.22);
  return { base, deep: scaleRgb(base, 0.86), light: tintWhite(base, 0.14), glint: tintWhite(base, 0.32) };
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
