/* GENERATED FROM Kimiagar.Works — do not edit.
 * source: src/animation/color.ts
 * sync:   npm run art:sync-works   (scripts/sync-works-flat.mjs)
 * works-commit: 689a5ea
 */
export type RGB = readonly [number, number, number];

const cache = new Map<string, RGB>();

export function hexToRgb(hex: string): RGB {
  const cached = cache.get(hex);
  if (cached) return cached;
  const n = parseInt(hex.slice(1), 16);
  const rgb: RGB = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  cache.set(hex, rgb);
  return rgb;
}

export function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((c) => Math.round(clamp(c)).toString(16).padStart(2, '0')).join('');
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

export function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Multiplies brightness; k > 1 lightens, k < 1 darkens. */
export function scaleRgb([r, g, b]: RGB, k: number): RGB {
  return [clamp(r * k), clamp(g * k), clamp(b * k)];
}

/** Pushes a colour away from its own grey so averaged pigments do not turn to mud. */
export function saturate([r, g, b]: RGB, k: number): RGB {
  const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [clamp(grey + (r - grey) * k), clamp(grey + (g - grey) * k), clamp(grey + (b - grey) * k)];
}

/** Moves a colour towards white by `t` (0..1). */
export function tintWhite(c: RGB, t: number): RGB {
  return lerpRgb(c, [255, 255, 255], t);
}
