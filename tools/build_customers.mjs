/**
 * مشتری‌های جدید — از تصاویر تولیدشده (پس‌زمینه‌ی #d8d2c8) به لایه‌ی شفاف trim‌شده.
 *
 * استفاده:
 *   node tools/build_customers.mjs <srcDir> [appearance ...]
 *
 * برای هر ظاهر سه فایل customer_<appearance>.png / _happy / _sad از srcDir
 * خوانده می‌شود (هر کدام نبود، رد می‌شود) و خروجی در:
 *   Web/public/art/customer/                       (کلاسیک — همه‌ی حالت‌ها)
 *   Art/UI Layers/70_Customer_Counter/             (آرشیو هنری)
 *   Web/public/art/{flat,pixel,engraved}/customer/ (فقط حالت عادی، تا v2 نشکند)
 *
 * سه حالت هر ظاهر با یک قاب مشترک trim می‌شوند (اجتماع bounding-box ها) تا در
 * Crossfade خوشحال/ناراحت چهره نپرد.
 */

import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureDirs, removeLightBackground } from './image_utils.mjs';

const [srcDir, ...names] = process.argv.slice(2);
if (!srcDir) {
  console.error('usage: node tools/build_customers.mjs <srcDir> [appearance ...]');
  process.exit(1);
}

const DEFAULT = ['woman_merchant', 'woman_scribe', 'woman_weaver', 'woman_healer', 'man_scholar', 'man_musician'];
const appearances = names.length > 0 ? names : DEFAULT;
const EMOTIONS = ['', '_happy', '_sad'];
const V2_STYLES = ['flat', 'pixel', 'engraved'];

const root = resolve(import.meta.dirname, '..');
const outWeb = (f) => resolve(root, 'Web/public/art/customer', f);
const outArt = (f) => resolve(root, 'Art/UI Layers/70_Customer_Counter', f);
const outV2 = (style, f) => resolve(root, `Web/public/art/${style}/customer`, f);

/** bounding-box پیکسل‌های غیرشفاف */
function alphaBounds(data, w, h) {
  let minx = w, maxx = -1, miny = h, maxy = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (y < miny) miny = y;
        if (y > maxy) maxy = y;
      }
    }
  }
  return maxx < 0 ? null : { minx, maxx, miny, maxy };
}

for (const appearance of appearances) {
  const variants = [];
  for (const emo of EMOTIONS) {
    const file = `customer_${appearance}${emo}.png`;
    const src = resolve(srcDir, file);
    if (!existsSync(src)) {
      console.warn(`skip (missing): ${src}`);
      continue;
    }
    const cut = await removeLightBackground(src);
    const { data, info } = await cut.raw().toBuffer({ resolveWithObject: true });
    variants.push({ file, emo, data, info, bounds: alphaBounds(data, info.width, info.height) });
  }
  if (variants.length === 0) continue;

  // قاب مشترک (همه‌ی نسخه‌ها از یک تولید با قاب یکسان‌اند؛ اجتماع ایمن است)
  const union = variants.reduce(
    (u, v) =>
      v.bounds
        ? {
            minx: Math.min(u.minx, v.bounds.minx),
            maxx: Math.max(u.maxx, v.bounds.maxx),
            miny: Math.min(u.miny, v.bounds.miny),
            maxy: Math.max(u.maxy, v.bounds.maxy),
          }
        : u,
    { minx: Infinity, maxx: -1, miny: Infinity, maxy: -1 },
  );
  const pad = 4;
  const { width: W, height: H } = variants[0].info;
  const left = Math.max(0, union.minx - pad);
  const top = Math.max(0, union.miny - pad);
  const width = Math.min(W, union.maxx + pad + 1) - left;
  const height = Math.min(H, union.maxy + pad + 1) - top;

  for (const v of variants) {
    const img = sharp(v.data, { raw: { width: W, height: H, channels: 4 } }).extract({ left, top, width, height }).png();
    const buf = await img.toBuffer();
    const targets = [outWeb(v.file), outArt(v.file)];
    if (v.emo === '') for (const style of V2_STYLES) targets.push(outV2(style, v.file));
    ensureDirs(...targets);
    for (const t of targets) await sharp(buf).toFile(t);
    console.log(`${v.file}  ${width}×${height}  → ${targets.length} file(s)`);
  }
}
