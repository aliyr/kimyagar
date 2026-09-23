/**
 * لایه‌های PNG اینترو (نمای بیرونی دکان در بازار) — از master های تولیدشده.
 *
 * تفاوت با build_gate_layers: کلید رنگ «هدف‌دار» است (سبزِ خالص یا سرخابی)،
 * نه میانه‌ی حاشیه؛ چون نمای دکان تا لبه‌ی تصویر می‌رسد و آسمانِ سبز فقط بالای
 * قاب است.
 *
 * خروجی (Art/UI Layers/96_Shop_Intro و Web/public/art/intro):
 *   facade          نمای دکان؛ آسمان (سبز) و دهانه‌ی در (سرخابی) شفاف
 *   sky_fx          ماه، ستاره و ابر نازک روی شفاف (از روی مشکی)
 *   lantern, knocker, plaque, map_rolled, map_open, ledger_closed, ledger_open
 *   cat_sleep, cat_awake
 *   logo            لوگوتایپ برنجی «کیمیاگر»
 *
 * Usage: node tools/build_intro_layers.mjs
 */

import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clamp, smoothstep, ensureDirs } from './image_utils.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MASTERS = 'C:/Users/mkfar/.cursor/projects/d-Source-Kimiagar/assets';
const UI = join(ROOT, 'Art', 'UI Layers', '96_Shop_Intro');
const WEB = join(ROOT, 'Web', 'public', 'art', 'intro');

async function loadRaw(input) {
  const src = typeof input === 'string' ? sharp(input) : input;
  const { data, info } = await src.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/** امتیاز «سبز بودن» یک پیکسل: فقط سبزِ خالصِ کلید بالا می‌رود، فیروزه‌ای و زیتونی نه */
function greenScore(r, g, b) {
  return g - Math.max(r, b);
}
/** امتیاز «سرخابی بودن» */
function magentaScore(r, g, b) {
  return Math.min(r, b) - g;
}

/**
 * کلید رنگ هدف‌دار. برای هر پیکسل «امتیاز» رنگ کلید حساب می‌شود و آلفا با
 * smoothstep بین near و far می‌آید. در لبه‌ها (آلفای میانی) سهم رنگ کلید از
 * پیکسل کم می‌شود (despill) تا هاله‌ی سبز/سرخابی دور شیء نماند.
 */
function keyByScore({ data, w, h }, score, { near, far, despill }) {
  const alphaF = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const s = score(data[i], data[i + 1], data[i + 2]);
    alphaF[p] = 1 - smoothstep(clamp((s - near) / (far - near), 0, 1));
  }
  // erosion یک‌پیکسلی و میانگین با مقدار اصلی: لبه نرم، هاله کمتر
  const eroded = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 1;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = clamp(y + dy, 0, h - 1);
        for (let dx = -1; dx <= 1; dx++) {
          const xx = clamp(x + dx, 0, w - 1);
          m = Math.min(m, alphaF[yy * w + xx]);
        }
      }
      eroded[y * w + x] = (m + alphaF[y * w + x]) / 2;
    }
  }
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const a = eroded[p];
    const prevA = data[i + 3] / 255;
    if (a < 0.995 && a > 0.005) despill(data, i);
    data[i + 3] = Math.round(a * prevA * 255);
  }
  return { data, w, h };
}

function despillGreen(data, i) {
  const cap = Math.max(data[i], data[i + 2]);
  if (data[i + 1] > cap) data[i + 1] = cap;
}
function despillMagenta(data, i) {
  const g = data[i + 1];
  if (data[i] > g) data[i] = Math.round((data[i] + g) / 2);
  if (data[i + 2] > g) data[i + 2] = Math.round((data[i + 2] + g) / 2);
}

function keyGreen(raw, opts = {}) {
  return keyByScore(raw, greenScore, { near: opts.near ?? 40, far: opts.far ?? 120, despill: despillGreen });
}
function keyMagenta(raw, opts = {}) {
  return keyByScore(raw, magentaScore, { near: opts.near ?? 40, far: opts.far ?? 120, despill: despillMagenta });
}

/** ماه/ستاره/ابر روی مشکی ⇒ آلفا از روشنایی؛ هسته‌ی ماه کدر، ابرها نرم */
function blackToSoftAlpha({ data, w, h }) {
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const aRaw = Math.max(r, g, b);
    if (aRaw < 10) {
      data[i + 3] = 0;
      continue;
    }
    const a = clamp(Math.pow(aRaw / 255, 0.9) * 1.15, 0, 1);
    const f = 1 / Math.max(a, 0.05);
    data[i] = clamp(Math.round(r * f), 0, 255);
    data[i + 1] = clamp(Math.round(g * f), 0, 255);
    data[i + 2] = clamp(Math.round(b * f), 0, 255);
    data[i + 3] = Math.round(a * 255);
  }
  return { data, w, h };
}

function toSharp({ data, w, h }) {
  return sharp(data, { raw: { width: w, height: h, channels: 4 } });
}

/**
 * trim + حاشیه‌ی شفاف + (اختیاری) کوچک‌سازی. اسپرایت‌ها روی صحنه در حد ۱۰۰–۴۰۰px
 * دیده می‌شوند؛ نگه‌داشتن master ۱۰۰۰px یعنی ~۱MB برای هر PNG و بارِ سنگین روی
 * گوشی. `max` سقف بزرگ‌ترین ضلع بعد از trim است (≈ ۲× اندازه‌ی نمایش).
 */
async function trimPad(pipeline, { pad = 6, max } = {}) {
  let p = pipeline.trim({ threshold: 8 });
  if (max) {
    // trim خروجی را lazily اعمال می‌کند؛ برای resize دقیق یک بار materialize می‌کنیم
    const trimmed = await p.png().toBuffer();
    p = sharp(trimmed).resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true });
  }
  return p
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function save(buf, name, { webToo = true } = {}) {
  const layerPath = join(UI, name);
  const webPath = join(WEB, name);
  ensureDirs(layerPath, webPath);
  await sharp(buf).png({ compressionLevel: 9 }).toFile(layerPath);
  if (webToo) await sharp(buf).png({ compressionLevel: 9 }).toFile(webPath);
  const meta = await sharp(buf).metadata();
  console.log(`ok  intro/${name}  ${meta.width}x${meta.height}${webToo ? '' : '  (فقط Art/UI Layers)'}`);
}

const master = (f) => join(MASTERS, f);

/** اسپرایت روی سبز ⇒ شفاف + trim (+ کوچک‌سازی تا `max`) */
async function greenSprite(file, { max, ...opts } = {}) {
  return trimPad(toSharp(keyGreen(await loadRaw(master(file)), opts)), { max });
}

// نما: آسمان سبز + دهانه‌ی سرخابی؛ بدون trim (قاب ۱۶:۹ باید کامل بماند)
{
  let raw = await loadRaw(master('intro_facade.png'));
  raw = keyGreen(raw, { near: 50, far: 130 });
  raw = keyMagenta(raw, { near: 50, far: 130 });
  await save(await toSharp(raw).png().toBuffer(), 'facade.png');
}

// آسمان: ماه و ستاره از روی مشکی؛ بدون trim
{
  const raw = blackToSoftAlpha(await loadRaw(master('intro_sky_fx.png')));
  await save(await toSharp(raw).png().toBuffer(), 'sky_fx.png');
}

// سقف‌ها ≈ ۲× اندازه‌ی نمایش در intro.css (فانوس ۳۷۳px بلند، درکوب ۱۳۱px، پلاک ۲۱۰px، ...)
await save(await greenSprite('intro_lantern.png', { max: 760 }), 'lantern.png');
await save(await greenSprite('intro_knocker.png', { max: 280 }), 'knocker.png');
await save(await greenSprite('intro_plaque_brass.png', { max: 440 }), 'plaque.png');
await save(await greenSprite('intro_map_rolled.png', { max: 620 }), 'map_rolled.png');
await save(await greenSprite('intro_ledger_closed.png', { max: 420 }), 'ledger_closed.png');
await save(await greenSprite('intro_cat_sleep2.png', { max: 420 }), 'cat_sleep.png');
await save(await greenSprite('intro_cat_awake.png', { max: 420 }), 'cat_awake.png');
// لوگوتایپ تصویری فقط به‌عنوان رفرنس طراحی؛ تیتر روی تابلو با Vazirmatn حروف‌چینی می‌شود
await save(await greenSprite('intro_logo_v3.png', { max: 800 }), 'logo.png', { webToo: false });

// پنل‌های باز: بدون trim تا مختصات مُهرها/خط‌ها روی قاب ثابت بماند
for (const [file, name] of [
  ['intro_map_open.png', 'map_open.png'],
  ['intro_ledger_open.png', 'ledger_open.png'],
]) {
  const raw = keyGreen(await loadRaw(master(file)));
  await save(await toSharp(raw).png().toBuffer(), name);
}

const manifest = {
  layer: 'shop_intro',
  notes:
    'لایه‌های اینترو (نمای بیرونی دکان). facade آسمان و دهانه‌ی در شفاف دارد؛ لنگه‌های در از gate/ می‌آیند. map_open و ledger_open بدون trim تا مختصات ثابت بماند. اسپرایت‌ها تا ~۲× اندازه‌ی نمایش کوچک شده‌اند. logo.png فقط رفرنس است (وب آن را نمی‌برد؛ تیتر با فونت Vazirmatn).',
  files: [
    'facade.png',
    'sky_fx.png',
    'lantern.png',
    'knocker.png',
    'plaque.png',
    'map_rolled.png',
    'map_open.png',
    'ledger_closed.png',
    'ledger_open.png',
    'cat_sleep.png',
    'cat_awake.png',
    'logo.png',
  ],
};
writeFileSync(join(UI, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('manifest written');
