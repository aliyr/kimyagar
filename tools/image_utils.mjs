/**
 * Kimyagar — ابزارهای مشترک پردازش تصویر برای pipeline های asset.
 * استفاده در build_ui_layers.mjs (سبک painterly) و build_ui_styles.mjs (flat/pixel).
 */

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const smoothstep = (t) => t * t * (3 - 2 * t);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** میانه‌ی رنگ حاشیه‌ی تصویر را برمی‌گرداند */
export function borderMedian(data, w, h, ch) {
  const border = Math.max(8, Math.floor(Math.min(w, h) / 40));
  const rs = [], gs = [], bs = [];
  const push = (x, y) => {
    const i = (y * w + x) * ch;
    rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
  };
  for (let y = 0; y < h; y += 2) {
    if (y < border || y >= h - border) {
      for (let x = 0; x < w; x += 2) push(x, y);
    } else {
      for (let x = 0; x < border; x += 2) push(x, y);
      for (let x = w - border; x < w; x += 2) push(x, y);
    }
  }
  const med = (a) => a.sort((p, q) => p - q)[Math.floor(a.length / 2)];
  return [med(rs), med(gs), med(bs)];
}

/**
 * حذف پس‌زمینه‌ی روشن یکدست (نمونه‌گیری حاشیه + فاصله‌ی رنگی + unmix لبه).
 * خروجی: pipeline خام sharp با کانال آلفا.
 */
export async function removeLightBackground(inputPath) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const [br, bg, bb] = borderMedian(data, w, h, ch);
  const out = Buffer.alloc(w * h * 4);
  const NEAR = 10; // فاصله‌ی رنگی که هنوز کاملاً پس‌زمینه است
  const FAR = 42; // فاصله‌ای که از آن به بعد کاملاً پیش‌زمینه است
  const alphaF = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * ch;
    const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    alphaF[p] = smoothstep(clamp((dist - NEAR) / (FAR - NEAR), 0, 1));
  }
  // erosion یک‌پیکسلی برای حذف هاله‌ی روشن لبه
  const eroded = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = clamp(y + dy, 0, h - 1), xx = clamp(x + dx, 0, w - 1);
          m = Math.min(m, alphaF[yy * w + xx]);
        }
      }
      // میانگین erosion و مقدار اصلی: لبه نرم می‌ماند ولی هاله کم می‌شود
      eroded[y * w + x] = (m + alphaF[y * w + x]) / 2;
    }
  }
  for (let p = 0; p < w * h; p++) {
    const i = p * ch, o = p * 4;
    const a = eroded[p];
    if (a > 0.02 && a < 0.98) {
      // unmix: حذف سهم پس‌زمینه از پیکسل‌های لبه
      const safe = Math.max(a, 0.1);
      out[o] = clamp(Math.round((data[i] - (1 - a) * br) / safe), 0, 255);
      out[o + 1] = clamp(Math.round((data[i + 1] - (1 - a) * bg) / safe), 0, 255);
      out[o + 2] = clamp(Math.round((data[i + 2] - (1 - a) * bb) / safe), 0, 255);
    } else {
      out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2];
    }
    out[o + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

/** تبدیل محتوای روی مشکی خالص (آتش/بخار) به آلفا (max-channel unpremultiply) */
export async function blackToAlpha(inputPath) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const out = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const i = p * ch, o = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const aRaw = Math.max(r, g, b);
    // تقویت آلفا: محتوای نیمه‌تیره (هیزم/زغال) باید نزدیک به کدر باشد
    const a = Math.min(255, Math.round(aRaw * 1.55));
    if (a > 0) {
      // unmix با آلفای جدید: composite روی مشکی دقیقاً تصویر اصلی می‌شود
      const f = 255 / a;
      out[o] = clamp(Math.round(r * f), 0, 255);
      out[o + 1] = clamp(Math.round(g * f), 0, 255);
      out[o + 2] = clamp(Math.round(b * f), 0, 255);
    }
    out[o + 3] = a;
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

/** هاله‌ی درخشش طلایی گرم (FX کشف) */
export async function makeGlow(size = 512) {
  const out = Buffer.alloc(size * size * 4);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.sqrt((x - c) ** 2 + (y - c) ** 2) / c;
      const a = smoothstep(clamp(1 - d, 0, 1));
      const o = (y * size + x) * 4;
      out[o] = 255; out[o + 1] = 214; out[o + 2] = 130; // طلایی گرم
      out[o + 3] = Math.round(a * a * 235);
    }
  }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } });
}

export function ensureDirs(...files) {
  for (const f of files) mkdirSync(dirname(f), { recursive: true });
}
