/**
 * شیشه‌ی بی‌در — از bottle_empty.png (با چوب‌پنبه) نسخه‌ی «در برداشته» می‌سازد:
 *   - بالای لبه‌ی گردن (y < NECK_TOP) کاملاً شفاف می‌شود (چوب‌پنبه‌ی بیرون‌زده حذف).
 *   - داخل گردن، پیکسل‌های چوب‌پنبه (قهوه‌ای) با رنگ تیره‌ی درونِ شیشه پر می‌شوند
 *     تا دهانه‌ی باز و تاریک دیده شود؛ حلقه‌ی شیشه‌ای لبه از خود تصویر می‌ماند.
 *
 * خروجی: Web/public/art/bottles/bottle_open.png (همان ابعاد تا در همان Rect بنشیند)
 * استفاده: node tools/build_bottle_open.mjs
 */

import sharp from 'sharp';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const src = resolve(root, 'Web/public/art/bottles/bottle_empty.png');
const out = resolve(root, 'Web/public/art/bottles/bottle_open.png');

/** اولین ردیف لبه‌ی گردن (اندازه‌گیری: پهنای ناحیه‌ی مات در y≈118 ناگهان بیشتر می‌شود) */
const NECK_TOP = 118;
/** تا این ردیف هنوز چوب‌پنبه داخل گردن دیده می‌شود */
const CORK_BOTTOM = 165;

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

const isCork = (r, g, b) => r > g + 15 && r > b + 30;

/** بیضی دهانه: بالای این قوس (لبه‌ی پشتی گردن) شفاف می‌شود تا دهانه گرد دیده شود */
const MOUTH = { cx: 321, cy: NECK_TOP + 17, rx: 122, ry: 17 };
const aboveMouthArc = (x, y) => {
  if (y >= MOUTH.cy) return false;
  const nx = (x - MOUTH.cx) / MOUTH.rx;
  const ny = (y - MOUTH.cy) / MOUTH.ry;
  return nx * nx + ny * ny > 1;
};

for (let y = 0; y < Math.min(H, CORK_BOTTOM); y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (data[i + 3] < 8) continue;
    if (y < NECK_TOP) {
      data[i + 3] = 0;
      continue;
    }
    // بالای قوس دهانه (شامل خط تیره‌ی کناره‌های چوب‌پنبه) شفاف
    if (Math.abs(x - MOUTH.cx) <= MOUTH.rx + 4 && aboveMouthArc(x, y)) {
      data[i + 3] = 0;
      continue;
    }
    if (isCork(data[i], data[i + 1], data[i + 2])) {
      // درونِ تاریک شیشه: بالا تیره‌تر (سایه‌ی لبه)، پایین کمی روشن‌تر
      const t = (y - NECK_TOP) / (CORK_BOTTOM - NECK_TOP);
      data[i] = Math.round(12 + 18 * t);
      data[i + 1] = Math.round(44 + 30 * t);
      data[i + 2] = Math.round(46 + 30 * t);
      data[i + 3] = 255;
    }
  }
}

await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out);
console.log(`bottle_open.png ${W}×${H} → ${out}`);
