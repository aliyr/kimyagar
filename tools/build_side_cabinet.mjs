/**
 * کیمیاگر — ساخت کابینت ایستاده‌ی مواد برای صحنه‌ی کلاسیک.
 *
 * تاج و پایه با نسبت اصلی مقیاس می‌شوند و فقط بخش صاف میانی کش می‌آید؛
 * بنابراین کابینت بدون فشردگی افقی، قاب ۲× ناحیه‌ی ۲۷۰×۹۵۰ را پر می‌کند.
 *
 * Usage: node tools/build_side_cabinet.mjs
 */

import sharp from 'sharp';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDirs, removeLightBackground } from './image_utils.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MASTER =
  'C:/Users/mkfar/.cursor/projects/d-Source-Kimiagar/assets/side_cabinet_master.png';
const LAYER_OUT = join(
  ROOT,
  'Art',
  'UI Layers',
  '10_Ingredient_Cabinet',
  'side_cabinet.png',
);
const WEB_OUT = join(ROOT, 'Web', 'public', 'art', 'shelf', 'side_cabinet.png');

const TARGET_WIDTH = 540;
const TARGET_HEIGHT = 1900;

/**
 * خط‌ها در تصویر trim و سپس هم‌اندازه‌شده با عرض ۵۴۰ هستند. هر دو روی بخش
 * صاف ستون‌ها قرار دارند: اولی پایین‌تر از نگین بالا و دومی بالاتر از نگین پایین.
 */
const TOP_CUT = 400;
const BOTTOM_CUT = 995;

async function buildCabinet() {
  const transparent = await (await removeLightBackground(MASTER)).png().toBuffer();
  const trimmed = await sharp(transparent).trim({ threshold: 8 }).png().toBuffer();
  const normalized = await sharp(trimmed)
    .resize({ width: TARGET_WIDTH })
    .png()
    .toBuffer();
  const { width, height } = await sharp(normalized).metadata();

  if (width !== TARGET_WIDTH || !height) {
    throw new Error(`اندازه‌ی میانی نامعتبر است: ${width}×${height}`);
  }
  if (BOTTOM_CUT >= height) {
    throw new Error(`خط برش پایین بیرون تصویر است: ${BOTTOM_CUT} >= ${height}`);
  }

  const topHeight = TOP_CUT;
  const bottomHeight = height - BOTTOM_CUT;
  const middleSourceHeight = BOTTOM_CUT - TOP_CUT;
  const middleTargetHeight = TARGET_HEIGHT - topHeight - bottomHeight;

  const top = await sharp(normalized)
    .extract({ left: 0, top: 0, width, height: topHeight })
    .png()
    .toBuffer();
  const middle = await sharp(normalized)
    .extract({ left: 0, top: TOP_CUT, width, height: middleSourceHeight })
    .resize(width, middleTargetHeight, { fit: 'fill' })
    .png()
    .toBuffer();
  const bottom = await sharp(normalized)
    .extract({ left: 0, top: BOTTOM_CUT, width, height: bottomHeight })
    .png()
    .toBuffer();

  const output = await sharp({
    create: {
      width: TARGET_WIDTH,
      height: TARGET_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: top, left: 0, top: 0 },
      { input: middle, left: 0, top: topHeight },
      { input: bottom, left: 0, top: topHeight + middleTargetHeight },
    ])
    .png()
    .toBuffer();

  ensureDirs(LAYER_OUT, WEB_OUT);
  await Promise.all([
    sharp(output).toFile(LAYER_OUT),
    sharp(output).toFile(WEB_OUT),
  ]);

  console.log(`ok  ${TARGET_WIDTH}×${TARGET_HEIGHT}`);
  console.log(`cuts  ${TOP_CUT}, ${BOTTOM_CUT} (normalized ${width}×${height})`);
  console.log(`middle  ${middleSourceHeight} → ${middleTargetHeight}px`);
  console.log(`out  ${LAYER_OUT}`);
  console.log(`out  ${WEB_OUT}`);
}

buildCabinet().catch((error) => {
  console.error(error);
  process.exit(1);
});
