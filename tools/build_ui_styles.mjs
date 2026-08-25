/**
 * Kimyagar — pipeline دو سبک هنری v2: «flat» (فلت 2D) و «pixel» (پیکسل‌آرت).
 *
 * ورودی: تصاویر master تولیدشده با AI در فولدر assets ایجنت
 *        (نام‌گذاری: {style}_{name}.png، پس‌زمینه‌ی روشن یکدست یا مشکی خالص)
 * خروجی:
 *  - «Art/UI Styles/{style}/NN_Group/…» (نسخه‌ی لایه‌باز طراحی + manifest.json)
 *  - «Web/public/art/{style}/…» (نام‌های قرارداد V2_ART در scene/v2/contracts.tsx)
 *
 * علاوه بر پردازش آلفا، asset های state-محور از master ها مشتق می‌شوند:
 *  - هاون: برش mortar_back (کل بدنه) و mortar_front (نوار دیواره‌ی جلویی با
 *    محوشدگی نرم؛ لایه‌ی جدا تا صحنه بتواند با opacity آن را شفاف کند)
 *  - محتوای هاون: heap_raw / heap_ground در ۳ اندازه (۱..۳ واحد) روی همان بوم
 *    هاون تا با object-fit: contain دقیقاً هم‌تراز شوند
 *  - کوبه: ۳ فریم انیمیشن با زاویه‌های پخته‌شده در تصویر (۱۶°، ۶°، ۲۶°)
 *  - FX: درخشش طلایی برنامه‌ای (بدون AI)
 *
 * Usage:  node tools/build_ui_styles.mjs [flat|pixel|engraved]   (بدون آرگومان: همه)
 *
 * سبک «engraved» (حکاکی) master هایش را prepare_engraved_masters.mjs از پک
 * vendor می‌سازد (از قبل شفاف؛ حذف پس‌زمینه اعمال نمی‌شود).
 */

import sharp from 'sharp';
import { existsSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  blackToAlpha,
  clamp,
  ensureDirs,
  makeGlow,
  removeLightBackground,
  smoothstep,
} from './image_utils.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MASTERS = 'C:/Users/mkfar/.cursor/projects/d-Source-Kimiagar/assets';
const UI_STYLES = join(ROOT, 'Art', 'UI Styles');
const WEB_ART = join(ROOT, 'Web', 'public', 'art');

const STYLES = process.argv[2] ? [process.argv[2]] : ['flat', 'pixel', 'engraved'];

/**
 * سبک‌هایی که master هایشان از قبل کانال آلفا دارند (پک vendor حکاکی که
 * prepare_engraved_masters.mjs می‌سازد) — حذف پس‌زمینه لازم ندارند.
 */
const ALPHA_STYLES = new Set(['engraved']);

/** master → pipeline آلفادار: برای سبک‌های آلفا فقط ensureAlpha، وگرنه حذف پس‌زمینه */
async function masterToAlpha(style, inputPath, mode = 'light-bg') {
  if (ALPHA_STYLES.has(style)) return sharp(inputPath).ensureAlpha();
  return mode === 'black-bg' ? blackToAlpha(inputPath) : removeLightBackground(inputPath);
}

const INGREDIENTS = ['chamomile', 'borage', 'mint', 'saffron', 'poppy', 'ginger'];

/** پردازش‌های ساده (یک master → یک خروجی) */
const SIMPLE_JOBS = [
  { master: 'shop_background', mode: 'opaque', layer: '00_Background/shop_background.png', web: 'background/shop_background.png' },
  { master: 'shelf_board', mode: 'light-bg', trim: true, layer: '10_Shelf/shelf_board.png', web: 'shelf/shelf_board.png' },
  ...INGREDIENTS.map((id) => ({
    master: `jar_${id}`, mode: 'light-bg', trim: true,
    layer: `10_Shelf/jar_${id}.png`, web: `shelf/jar_${id}.png`,
  })),
  { master: 'work_table', mode: 'light-bg', trim: true, layer: '20_Work_Table/work_table.png', web: 'table/work_table.png' },
  { master: 'cauldron_empty', mode: 'light-bg', trim: true, layer: '30_Cauldron/cauldron_empty.png', web: 'cauldron/cauldron_empty.png' },
  { master: 'potion_still', mode: 'light-bg', trim: true, layer: '30_Cauldron/potion_still.png', web: 'cauldron/potion_still.png' },
  { master: 'potion_boil_1', mode: 'light-bg', trim: true, layer: '30_Cauldron/potion_boil_1.png', web: 'cauldron/potion_boil_1.png' },
  { master: 'potion_boil_2', mode: 'light-bg', trim: true, layer: '30_Cauldron/potion_boil_2.png', web: 'cauldron/potion_boil_2.png' },
  { master: 'fire_low', mode: 'black-bg', trim: true, layer: '50_Heat_Source/fire_low.png', web: 'heat/fire_low.png' },
  { master: 'fire_medium', mode: 'black-bg', trim: true, layer: '50_Heat_Source/fire_medium.png', web: 'heat/fire_medium.png' },
  { master: 'fire_high', mode: 'black-bg', trim: true, layer: '50_Heat_Source/fire_high.png', web: 'heat/fire_high.png' },
  { master: 'bottle_empty', mode: 'light-bg', trim: true, layer: '60_Bottles/bottle_empty.png', web: 'bottles/bottle_empty.png' },
  { master: 'bottle_full', mode: 'light-bg', trim: true, layer: '60_Bottles/bottle_full.png', web: 'bottles/bottle_full.png' },
  { master: 'customer_counter', mode: 'light-bg', trim: true, layer: '70_Customer_Counter/counter.png', web: 'customer/counter.png' },
  { master: 'customer_woman_elder', mode: 'light-bg', trim: true, layer: '70_Customer_Counter/customer_woman_elder.png', web: 'customer/customer_woman_elder.png' },
  { master: 'customer_man_worker', mode: 'light-bg', trim: true, layer: '70_Customer_Counter/customer_man_worker.png', web: 'customer/customer_man_worker.png' },
  { master: 'customer_woman_young', mode: 'light-bg', trim: true, layer: '70_Customer_Counter/customer_woman_young.png', web: 'customer/customer_woman_young.png' },
  { master: 'customer_man_elder', mode: 'light-bg', trim: true, layer: '70_Customer_Counter/customer_man_elder.png', web: 'customer/customer_man_elder.png' },
  { master: 'goal_note', mode: 'light-bg', trim: true, layer: '80_Goal_Note/goal_note.png', web: 'goal/goal_note.png' },
];

/** هندسه‌ی برش/چیدمان هاون — کسرهایی از ارتفاع بدنه‌ی trim شده */
const MORTAR_GEOM = {
  pad: 14, // حاشیه‌ی شفاف بوم مشترک
  frontFadeStart: 0.26, // بالاتر از این: دیواره‌ی جلو کاملاً شفاف (دهانه‌ی باز)
  frontFadeEnd: 0.38, // پایین‌تر از این: دیواره‌ی جلو کاملاً کدر
  heapAnchor: 0.5, // خط کف تپه‌ی محتوا (پشت دیواره پنهان می‌شود)
  heapHeights: { 1: 0.24, 2: 0.33, 3: 0.42 }, // ارتفاع تپه بر حسب واحد
  heapMaxWidth: 0.86, // سقف پهنای تپه نسبت به پهنای بدنه
};

/** زاویه‌های ۳ فریم کوبه (درجه؛ ساعت‌گرد، هماهنگ با placeholder صحنه) */
const PESTLE_ANGLES = [16, 6, 26];

const written = new Map(); // style → [{file, source, note}]

function record(style, webRel, source, note) {
  if (!written.has(style)) written.set(style, []);
  written.get(style).push({ file: webRel, source, ...(note ? { note } : {}) });
}

async function saveOut(buf, style, layerRel, webRel, source, note) {
  const layerPath = join(UI_STYLES, style, layerRel);
  const webPath = join(WEB_ART, style, webRel);
  ensureDirs(layerPath, webPath);
  await sharp(buf).png().toFile(layerPath);
  await sharp(buf).png().toFile(webPath);
  record(style, webRel, source, note);
  console.log(`ok  [${style}] ${webRel}`);
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

async function runSimpleJobs(style) {
  for (const job of SIMPLE_JOBS) {
    const input = join(MASTERS, `${style}_${job.master}.png`);
    if (!existsSync(input)) {
      console.warn(`MISSING master: ${style}_${job.master}.png`);
      continue;
    }
    let buf;
    if (job.mode === 'opaque') {
      buf = await sharp(input).png().toBuffer();
    } else {
      const pipeline = await masterToAlpha(style, input, job.mode);
      buf = await pipeline.png().toBuffer();
      if (job.trim) buf = await trimBuffer(buf);
    }
    await saveOut(buf, style, job.layer, job.web, `${style}_${job.master}.png`, job.mode);
  }
}

/**
 * ست لایه‌باز هاون: back / front / محتوا در ۳ سطح × ۲ حالت.
 * همه روی یک بوم مشترک تا لایه‌های صحنه (object-fit: contain در یک باکس)
 * پیکسل-به-پیکسل هم‌تراز بمانند.
 */
async function buildMortarSet(style) {
  const g = MORTAR_GEOM;
  const mortarSrc = join(MASTERS, `${style}_mortar.png`);
  if (!existsSync(mortarSrc)) {
    console.warn(`MISSING master: ${style}_mortar.png — mortar set skipped`);
    return;
  }
  const bodyPng = await (await masterToAlpha(style, mortarSrc)).png().toBuffer();
  const bodyTrim = await sharp(bodyPng).trim({ threshold: 8 }).png().toBuffer();
  const meta = await sharp(bodyTrim).metadata();
  const W = meta.width, H = meta.height;
  const CW = W + g.pad * 2, CH = H + g.pad * 2;
  const blank = {
    create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  };

  // ۱) mortar_back: کل بدنه روی بوم مشترک
  const backBuf = await sharp(blank)
    .composite([{ input: bodyTrim, left: g.pad, top: g.pad }])
    .png()
    .toBuffer();
  await saveOut(backBuf, style, '40_Mortar/mortar_back.png', 'mortar/mortar_back.png', `${style}_mortar.png`, 'full body');

  // ۲) mortar_front: فقط نوار پایینی دیواره با محوشدگی نرم به سمت دهانه
  const { data, info } = await sharp(backBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const y1 = g.pad + g.frontFadeStart * H;
  const y2 = g.pad + g.frontFadeEnd * H;
  for (let y = 0; y < info.height; y++) {
    const t = smoothstep(clamp((y - y1) / (y2 - y1), 0, 1));
    if (t >= 1) break; // پایین‌تر از y2 دست‌نخورده می‌ماند
    for (let x = 0; x < info.width; x++) {
      const o = (y * info.width + x) * 4 + 3;
      data[o] = Math.round(data[o] * t);
    }
  }
  const frontBuf = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
  await saveOut(frontBuf, style, '40_Mortar/mortar_front.png', 'mortar/mortar_front.png', `${style}_mortar.png`, `front wall band (fade ${g.frontFadeStart}–${g.frontFadeEnd} of body height)`);

  // ۳) محتوا: تپه‌ی خام/کوبیده در ۳ اندازه، کف تپه پشت دیواره‌ی جلو
  for (const state of ['raw', 'ground']) {
    const heapSrc = join(MASTERS, `${style}_heap_${state}.png`);
    if (!existsSync(heapSrc)) {
      console.warn(`MISSING master: ${style}_heap_${state}.png — contents skipped`);
      continue;
    }
    const heapPng = await (await masterToAlpha(style, heapSrc)).png().toBuffer();
    const heapTrim = await sharp(heapPng).trim({ threshold: 8 }).png().toBuffer();
    const hMeta = await sharp(heapTrim).metadata();
    for (const units of [1, 2, 3]) {
      let hu = Math.round(g.heapHeights[units] * H);
      let wu = Math.round((hMeta.width / hMeta.height) * hu);
      const maxW = Math.round(g.heapMaxWidth * W);
      if (wu > maxW) {
        wu = maxW;
        hu = Math.round((hMeta.height / hMeta.width) * wu);
      }
      const heapScaled = await sharp(heapTrim).resize(wu, hu, { fit: 'fill' }).png().toBuffer();
      const left = Math.round((CW - wu) / 2);
      const top = Math.round(g.pad + g.heapAnchor * H - hu);
      const buf = await sharp(blank)
        .composite([{ input: heapScaled, left, top }])
        .png()
        .toBuffer();
      await saveOut(
        buf, style,
        `40_Mortar/contents_${units}_${state}.png`, `mortar/contents_${units}_${state}.png`,
        `${style}_heap_${state}.png`, `${units} unit(s), bottom-anchored at ${g.heapAnchor} of body height`,
      );
    }
  }
}

/** ۳ فریم کوبه: زاویه در خود تصویر پخته می‌شود، بوم مشترک برای تعویض بی‌پرش */
async function buildPestleFrames(style) {
  const src = join(MASTERS, `${style}_pestle.png`);
  if (!existsSync(src)) {
    console.warn(`MISSING master: ${style}_pestle.png — pestle frames skipped`);
    return;
  }
  const pestlePng = await (await masterToAlpha(style, src)).png().toBuffer();
  const pestleTrim = await sharp(pestlePng).trim({ threshold: 8 }).png().toBuffer();

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
      frame, style,
      `40_Mortar/pestle_${i + 1}.png`, `mortar/pestle_${i + 1}.png`,
      `${style}_pestle.png`, `baked rotation ${PESTLE_ANGLES[i]}°`,
    );
  }
}

function writeManifest(style) {
  const manifestPath = join(UI_STYLES, style, 'manifest.json');
  ensureDirs(manifestPath);
  const manifest = {
    style,
    generated: new Date().toISOString(),
    source: 'AI masters ({style}_{name}.png) processed by tools/build_ui_styles.mjs',
    runtime: `Web/public/art/${style}/`,
    files: written.get(style) ?? [],
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`ok  [${style}] manifest.json (${manifest.files.length} files)`);
}

function writePromptDoc(style) {
  const NAME_FA = { flat: 'فلت 2D', pixel: 'پیکسل‌آرت', engraved: 'حکاکی' };
  let doc;
  if (style === 'engraved') {
    doc = `# سبک حکاکی — یادداشت تولید

- منبع: پک vendor حکاکی/کنده‌کاری (Art/Vendor/engraved_pack) — تصاویر شفاف آماده.
- آماده‌سازی master ها (برش از sprite-sheet ها، بازسازی هاون متقارن، کوبه‌ی SVG،
  سطح مایع procedural): tools/prepare_engraved_masters.mjs
- سپس مشتق‌سازی state ها (برش back/front هاون، ۳ اندازه‌ی محتوا، ۳ فریم چرخش
  کوبه) در build_ui_styles.mjs — بدون حذف پس‌زمینه (ورودی از قبل آلفا دارد).
- نام فایل‌های runtime از قرارداد V2_ART در Web/src/scene/v2/contracts.tsx می‌آید.
`;
  } else {
    const flat = style === 'flat';
    doc = `# سبک ${NAME_FA[style]} — یادداشت تولید

- تولید با GenerateImage (AI) روی پس‌زمینه‌ی روشن یکدست (#e9e2d4) یا مشکی خالص (آتش‌ها).
- کلیدواژه‌های پایه: ${flat
      ? 'flat 2D vector-style game asset، رنگ‌های تخت، بدون سایه/گرادیان/عمق، پالت گرم ایرانی، نقوش اسلیمی/گره ساده'
      : 'pixel art game sprite، پیکسل‌های درشت 16-bit، پالت محدود گرم، بدون سایه، نقوش ایرانی ساده‌شده'}.
- پردازش: حذف پس‌زمینه (image_utils.mjs)، trim آلفا، و مشتق‌سازی state ها
  (برش back/front هاون، ۳ اندازه‌ی محتوا، ۳ فریم چرخش کوبه) در build_ui_styles.mjs.
- نام فایل‌های runtime از قرارداد V2_ART در Web/src/scene/v2/contracts.tsx می‌آید.
${flat ? '' : '- رندر صحنه با image-rendering: pixelated (کلاس zone-art--pixelated).\n'}`;
  }
  const p = join(UI_STYLES, style, 'prompt.md');
  ensureDirs(p);
  writeFileSync(p, doc, 'utf8');
}

async function main() {
  for (const style of STYLES) {
    console.log(`\n=== style: ${style} ===`);
    await runSimpleJobs(style);
    await buildMortarSet(style);
    await buildPestleFrames(style);
    const glow = await (await makeGlow()).png().toBuffer();
    await saveOut(glow, style, '90_FX/discovery_glow.png', 'fx/discovery_glow.png', 'procedural', 'radial golden glow');
    writeManifest(style);
    writePromptDoc(style);
  }
  console.log('\ndone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
