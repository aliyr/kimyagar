/**
 * Kimyagar — ارتقای asset های حالت کلاسیک (state های لایه‌باز).
 *
 * ورودی:
 *  - master های AI با پیشوند classic_ در فولدر assets ایجنت
 *  - asset های موجود کلاسیک (بدنه/کوبه‌ی هاون، شعله‌های پایه) از Web/public/art
 *
 * خروجی (هم Art/UI Layers و هم Web/public/art):
 *  - هاون: mortar_back / mortar_front (نوار دیواره‌ی جلو با محوشدگی) و
 *    contents_{1..3}_{raw|ground} روی بوم مشترک بدنه (برای هم‌ترازی پیکسلی)
 *  - کوبه: pestle_{1..3} — سه فریم با چرخش پخته‌شده روی بوم مشترک
 *  - دیگ: potion_still / potion_swirl / potion_boil_{1,2}
 *  - آتش: fire_{low|medium|high}_{1..3} — فریم ۱ همان شعله‌ی موجود؛
 *    هر سه فریم یک سطح روی بوم مشترک (لنگر پایین-وسط) تا سوییچ بی‌پرش باشد
 *  - سطل: table/bucket.png — قفسه: shelf/shelf_board.png
 *  - مشتری: customer_{id}_{happy|sad}.png (حالت عادی همان تصویر موجود است)
 *
 * Usage:  node tools/build_classic_upgrade.mjs
 */

import sharp from 'sharp';
import { existsSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  blackToAlpha,
  clamp,
  ensureDirs,
  removeLightBackground,
  smoothstep,
} from './image_utils.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MASTERS = 'C:/Users/mkfar/.cursor/projects/d-Source-Kimiagar/assets';
const UI_LAYERS = join(ROOT, 'Art', 'UI Layers');
const WEB_ART = join(ROOT, 'Web', 'public', 'art');

const written = [];

async function saveOut(buf, layerRel, webRel, source, note) {
  const layerPath = join(UI_LAYERS, layerRel);
  const webPath = join(WEB_ART, webRel);
  ensureDirs(layerPath, webPath);
  await sharp(buf).png().toFile(layerPath);
  await sharp(buf).png().toFile(webPath);
  written.push({ file: webRel, source, ...(note ? { note } : {}) });
  console.log(`ok  ${webRel}`);
}

async function trimBuffer(pngBuf, pad = 4) {
  return sharp(pngBuf)
    .trim({ threshold: 8 })
    .extend({
      top: pad, bottom: pad, left: pad, right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

/** master با پس‌زمینه‌ی روشن → PNG آلفادار trim شده */
async function lightMaster(name, pad = 4) {
  const input = join(MASTERS, name);
  if (!existsSync(input)) { console.warn(`MISSING master: ${name}`); return null; }
  const buf = await (await removeLightBackground(input)).png().toBuffer();
  return trimBuffer(buf, pad);
}

// ---------------------------------------------------------------------------
// ۱) ست هاون: back / front / contents — بوم مشترک با بدنه‌ی برنجی موجود
// ---------------------------------------------------------------------------

/**
 * هندسه‌ی هاون برنجی کلاسیک (کسرهایی از ارتفاع بدنه‌ی trim شده):
 * دهانه‌ی داخلی از ~۰٫۰۵ تا ~۰٫۳۱ ارتفاع؛ دیواره‌ی جلو از ~۰٫۲۹ به پایین.
 */
const GEOM = {
  pad: 14,
  frontFadeStart: 0.27, // بالاتر: دیواره‌ی جلو کاملاً شفاف (دهانه‌ی باز)
  frontFadeEnd: 0.4, // پایین‌تر: کاملاً کدر
  heapAnchor: 0.52, // خط کف تپه‌ی محتوا (پشت دیواره‌ی جلو پنهان می‌شود)
  heapHeights: { 1: 0.26, 2: 0.34, 3: 0.43 },
  heapMaxWidth: 0.78,
};

async function buildMortarSet() {
  const bodySrc = join(WEB_ART, 'mortar', 'mortar_body.png');
  if (!existsSync(bodySrc)) { console.warn('MISSING mortar_body.png'); return; }
  const bodyTrim = await sharp(bodySrc).ensureAlpha().trim({ threshold: 8 }).png().toBuffer();
  const meta = await sharp(bodyTrim).metadata();
  const W = meta.width, H = meta.height;
  const CW = W + GEOM.pad * 2, CH = H + GEOM.pad * 2;
  const blank = {
    create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  };

  const backBuf = await sharp(blank)
    .composite([{ input: bodyTrim, left: GEOM.pad, top: GEOM.pad }])
    .png()
    .toBuffer();
  await saveOut(backBuf, '40_Mortar/mortar_back.png', 'mortar/mortar_back.png', 'mortar_body.png', 'full body on shared canvas');

  // دیواره‌ی جلو: فقط نوار پایینی با محوشدگی نرم به سمت دهانه
  const { data, info } = await sharp(backBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const y1 = GEOM.pad + GEOM.frontFadeStart * H;
  const y2 = GEOM.pad + GEOM.frontFadeEnd * H;
  for (let y = 0; y < info.height; y++) {
    const t = smoothstep(clamp((y - y1) / (y2 - y1), 0, 1));
    if (t >= 1) break;
    for (let x = 0; x < info.width; x++) {
      const o = (y * info.width + x) * 4 + 3;
      data[o] = Math.round(data[o] * t);
    }
  }
  const frontBuf = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
  await saveOut(frontBuf, '40_Mortar/mortar_front.png', 'mortar/mortar_front.png', 'mortar_body.png', `front wall band (fade ${GEOM.frontFadeStart}–${GEOM.frontFadeEnd})`);

  for (const state of ['raw', 'ground']) {
    const heapTrim = await lightMaster(`classic_heap_${state}.png`);
    if (!heapTrim) continue;
    const hMeta = await sharp(heapTrim).metadata();
    for (const units of [1, 2, 3]) {
      let hu = Math.round(GEOM.heapHeights[units] * H);
      let wu = Math.round((hMeta.width / hMeta.height) * hu);
      const maxW = Math.round(GEOM.heapMaxWidth * W);
      if (wu > maxW) {
        wu = maxW;
        hu = Math.round((hMeta.height / hMeta.width) * wu);
      }
      const heapScaled = await sharp(heapTrim).resize(wu, hu, { fit: 'fill' }).png().toBuffer();
      const left = Math.round((CW - wu) / 2);
      const top = Math.round(GEOM.pad + GEOM.heapAnchor * H - hu);
      const buf = await sharp(blank)
        .composite([{ input: heapScaled, left, top }])
        .png()
        .toBuffer();
      await saveOut(
        buf,
        `40_Mortar/contents_${units}_${state}.png`, `mortar/contents_${units}_${state}.png`,
        `classic_heap_${state}.png`, `${units} unit(s), bottom-anchored at ${GEOM.heapAnchor}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// ۲) سه فریم کوبه — چرخش پخته‌شده روی بوم مشترک
// ---------------------------------------------------------------------------

const PESTLE_ANGLES = [14, 4, 24];

async function buildPestleFrames() {
  const src = join(WEB_ART, 'mortar', 'mortar_pestle.png');
  if (!existsSync(src)) { console.warn('MISSING mortar_pestle.png'); return; }
  const pestleTrim = await sharp(src).ensureAlpha().trim({ threshold: 8 }).png().toBuffer();

  const rotated = [];
  let maxW = 0, maxH = 0;
  for (const angle of PESTLE_ANGLES) {
    const buf = await sharp(pestleTrim)
      .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const m = await sharp(buf).metadata();
    rotated.push({ buf, w: m.width, h: m.height });
    maxW = Math.max(maxW, m.width);
    maxH = Math.max(maxH, m.height);
  }
  for (let i = 0; i < rotated.length; i++) {
    const { buf, w, h } = rotated[i];
    const frame = await sharp({
      create: { width: maxW, height: maxH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: buf, left: Math.round((maxW - w) / 2), top: Math.round((maxH - h) / 2) }])
      .png()
      .toBuffer();
    await saveOut(
      frame,
      `40_Mortar/pestle_${i + 1}.png`, `mortar/pestle_${i + 1}.png`,
      'mortar_pestle.png', `baked rotation ${PESTLE_ANGLES[i]}°`,
    );
  }
}

// ---------------------------------------------------------------------------
// ۳) سطح‌های معجون
// ---------------------------------------------------------------------------

async function buildPotionSet() {
  const jobs = [
    ['classic_potion_still.png', 'potion_still'],
    ['classic_potion_swirl.png', 'potion_swirl'],
    ['classic_potion_boil_1.png', 'potion_boil_1'],
    ['classic_potion_boil_2.png', 'potion_boil_2'],
  ];
  for (const [master, name] of jobs) {
    const buf = await lightMaster(master);
    if (!buf) continue;
    await saveOut(buf, `30_Cauldron/${name}.png`, `cauldron/${name}.png`, master, 'light-bg');
  }
}

// ---------------------------------------------------------------------------
// ۴) فریم‌های آتش — هر سطح ۳ فریم روی بوم مشترک (لنگر پایین-وسط)
// ---------------------------------------------------------------------------

async function buildFireFrames() {
  for (const level of ['low', 'medium', 'high']) {
    const frames = [];
    // فریم ۱: شعله‌ی موجود (از قبل آلفادار)
    const base = join(WEB_ART, 'heat', `fire_${level}.png`);
    if (!existsSync(base)) { console.warn(`MISSING fire_${level}.png`); continue; }
    frames.push({
      buf: await sharp(base).ensureAlpha().trim({ threshold: 8 }).png().toBuffer(),
      source: `fire_${level}.png`,
    });
    // فریم‌های ۲ و ۳: master های تازه روی مشکی خالص
    for (const n of [2, 3]) {
      const input = join(MASTERS, `classic_fire_${level}_${n}.png`);
      if (!existsSync(input)) { console.warn(`MISSING classic_fire_${level}_${n}.png`); continue; }
      const raw = await (await blackToAlpha(input)).png().toBuffer();
      frames.push({
        buf: await sharp(raw).trim({ threshold: 8 }).png().toBuffer(),
        source: `classic_fire_${level}_${n}.png`,
      });
    }
    let maxW = 0, maxH = 0;
    const metas = [];
    for (const f of frames) {
      const m = await sharp(f.buf).metadata();
      metas.push(m);
      maxW = Math.max(maxW, m.width);
      maxH = Math.max(maxH, m.height);
    }
    for (let i = 0; i < frames.length; i++) {
      const m = metas[i];
      const frame = await sharp({
        create: { width: maxW, height: maxH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .composite([{
          input: frames[i].buf,
          left: Math.round((maxW - m.width) / 2),
          top: maxH - m.height, // لنگر پایین: هیزم‌ها ثابت می‌مانند
        }])
        .png()
        .toBuffer();
      await saveOut(
        frame,
        `50_Heat_Source/fire_${level}_${i + 1}.png`, `heat/fire_${level}_${i + 1}.png`,
        frames[i].source, 'bottom-anchored on shared canvas',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// ۵) تک‌تصویرها: سطل، قفسه، حالات احساسی مشتری
// ---------------------------------------------------------------------------

async function buildSingles() {
  const jobs = [
    ['classic_bucket.png', '20_Work_Table/bucket.png', 'table/bucket.png'],
    ['classic_shelf_board.png', '15_Wall_Shelf/shelf_board.png', 'shelf/shelf_board.png'],
  ];
  const customers = ['woman_elder', 'man_worker', 'woman_young', 'man_elder'];
  for (const id of customers) {
    for (const emo of ['happy', 'sad']) {
      jobs.push([
        `classic_customer_${id}_${emo}.png`,
        `70_Customer_Counter/customer_${id}_${emo}.png`,
        `customer/customer_${id}_${emo}.png`,
      ]);
    }
  }
  for (const [master, layer, web] of jobs) {
    const buf = await lightMaster(master);
    if (!buf) continue;
    await saveOut(buf, layer, web, master, 'light-bg');
  }
}

async function main() {
  await buildMortarSet();
  await buildPestleFrames();
  await buildPotionSet();
  await buildFireFrames();
  await buildSingles();
  const manifestPath = join(UI_LAYERS, 'classic_upgrade_manifest.json');
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generated: new Date().toISOString(),
        source: 'AI masters (classic_*.png) + existing classic art, processed by tools/build_classic_upgrade.mjs',
        runtime: 'Web/public/art/',
        files: written,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
  console.log(`\nmanifest: ${written.length} files\ndone.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
