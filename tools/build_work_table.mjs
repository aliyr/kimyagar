/**
 * میز کار با کوره‌ی توکار — از تصویر تولیدشده (پس‌زمینه‌ی #d8d2c8) به لایه‌ی شفاف.
 *
 * استفاده:
 *   node tools/build_work_table.mjs <source.png>
 *
 * خروجی:
 *   Web/public/art/table/work_table.png
 *   Art/UI Layers/20_Work_Table/work_table.png
 * و گزارش مستطیل «دهانه‌ی کوره» (ناحیه‌ی تیره‌ی داخل طاق) نسبت به تصویر
 * trim‌شده تا FurnaceFire دقیقاً داخل طاقچه بنشیند (scene/furnaceGeometry.ts).
 */

import sharp from 'sharp';
import { resolve } from 'node:path';
import { ensureDirs, removeLightBackground } from './image_utils.mjs';

const src = process.argv[2];
if (!src) {
  console.error('usage: node tools/build_work_table.mjs <source.png>');
  process.exit(1);
}

const root = resolve(import.meta.dirname, '..');
const outWeb = resolve(root, 'Web/public/art/table/work_table.png');
const outArt = resolve(root, 'Art/UI Layers/20_Work_Table/work_table.png');
ensureDirs(outWeb, outArt);

const cut = await removeLightBackground(src);
const trimmed = await cut.png().toBuffer();
const { data, info } = await sharp(trimmed).trim({ threshold: 8 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;

// دهانه‌ی کوره: بزرگ‌ترین ناحیه‌ی بسیار تیره و کدر در نیمه‌ی پایین، نزدیک وسط
let minx = w, maxx = 0, miny = h, maxy = 0, count = 0;
for (let y = Math.floor(h * 0.45); y < h; y++) {
  for (let x = Math.floor(w * 0.3); x < Math.floor(w * 0.7); x++) {
    const i = (y * w + x) * 4;
    if (data[i + 3] > 200 && data[i] < 40 && data[i + 1] < 36 && data[i + 2] < 36) {
      if (x < minx) minx = x;
      if (x > maxx) maxx = x;
      if (y < miny) miny = y;
      if (y > maxy) maxy = y;
      count++;
    }
  }
}

await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toFile(outWeb);
await sharp(outWeb).toFile(outArt);

console.log(JSON.stringify({ width: w, height: h, furnace: { x: minx, y: miny, width: maxx - minx + 1, height: maxy - miny + 1, darkPixels: count } }, null, 2));
