/**
 * Kimyagar — آماده‌سازی master های سبک «حکاکی» (engraved) از پک vendor.
 *
 * ورودی:  «Art/Vendor/engraved_pack/*.png» (تصاویر شفاف سبک حکاکی/کنده‌کاری)
 * خروجی:  master های شفاف «engraved_{name}.png» در فولدر MASTERS
 *          (همان قرارداد build_ui_styles.mjs؛ سپس:
 *           node tools/build_ui_styles.mjs engraved)
 *
 * چون تصاویر پک sprite-sheet هستند، برش‌ها دو مرحله‌ای است:
 *  - تفکیک خودکار اجزای هر شیت با برچسب‌گذاری اجزای همبند آلفا (segment)
 *  - انتخاب جزء با ایندکس یا برش نسبی (fraction rect) داخل جزء
 *
 * Usage:
 *   node tools/prepare_engraved_masters.mjs                 → ساخت همه‌ی master ها
 *   node tools/prepare_engraved_masters.mjs --debug "<file>" → dump اجزای شماره‌دار
 */

import sharp from 'sharp';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = join(ROOT, 'Art', 'Vendor', 'engraved_pack');
const MASTERS = 'C:/Users/mkfar/.cursor/projects/d-Source-Kimiagar/assets';
const DEBUG_DIR = join(ROOT, 'tools', '.debug_engraved');

const src = (name) => join(PACK, `${name}.png`);

/* ------------------------------------------------------------------ */
/* تفکیک اجزای همبند آلفا (روی نسخه‌ی کوچک‌شده، bbox ها به مقیاس اصلی) */
/* ------------------------------------------------------------------ */

async function segment(path, { minAreaFrac = 0.0006, alphaMin = 28 } = {}) {
  const meta = await sharp(path).metadata();
  const W = meta.width, H = meta.height;
  const scale = Math.min(1, 700 / Math.max(W, H));
  const w = Math.max(1, Math.round(W * scale));
  const h = Math.max(1, Math.round(H * scale));
  const { data } = await sharp(path)
    .resize(w, h)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // ماسک + یک بار dilate تا شکاف‌های ۱-۲ پیکسلی اجزای یکپارچه پل بخورد
  const mask = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) mask[p] = data[p * 4 + 3] >= alphaMin ? 1 : 0;
  const dil = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let dy = -1; dy <= 1 && !v; dy++) {
        for (let dx = -1; dx <= 1 && !v; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy >= 0 && yy < h && xx >= 0 && xx < w && mask[yy * w + xx]) v = 1;
        }
      }
      dil[y * w + x] = v;
    }
  }

  const labels = new Int32Array(w * h).fill(-1);
  const boxes = [];
  const stack = [];
  for (let p0 = 0; p0 < w * h; p0++) {
    if (!dil[p0] || labels[p0] >= 0) continue;
    const id = boxes.length;
    let x0 = w, y0 = h, x1 = 0, y1 = 0, area = 0;
    stack.push(p0);
    labels[p0] = id;
    while (stack.length) {
      const p = stack.pop();
      const y = (p / w) | 0, x = p % w;
      area++;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
        const q = yy * w + xx;
        if (dil[q] && labels[q] < 0) { labels[q] = id; stack.push(q); }
      }
    }
    boxes.push({ x0, y0, x1, y1, area });
  }

  const minArea = minAreaFrac * w * h;
  const kept = boxes
    .filter((b) => b.area >= minArea)
    .map((b) => ({
      left: Math.max(0, Math.floor(b.x0 / scale) - 2),
      top: Math.max(0, Math.floor(b.y0 / scale) - 2),
      width: Math.min(W, Math.ceil((b.x1 + 1) / scale) + 2) - Math.max(0, Math.floor(b.x0 / scale) - 2),
      height: Math.min(H, Math.ceil((b.y1 + 1) / scale) + 2) - Math.max(0, Math.floor(b.y0 / scale) - 2),
    }));
  // مرتب‌سازی سطری: باند عمودی (۱۵٪ ارتفاع) سپس چپ→راست
  const band = Math.max(1, Math.round(H * 0.15));
  kept.sort((a, b) => {
    const ba = Math.round((a.top + a.height / 2) / band);
    const bb = Math.round((b.top + b.height / 2) / band);
    return ba !== bb ? ba - bb : (a.left + a.width / 2) - (b.left + b.width / 2);
  });
  return kept;
}

/**
 * حذف تکه‌های اجزای همسایه از گوشه‌های برش:
 * فقط بزرگ‌ترین جزء همبند آلفا نگه داشته می‌شود (رزولوشن کامل برش).
 */
async function isolateLargest(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const labels = new Int32Array(w * h).fill(-1);
  const areas = [];
  const stack = [];
  for (let p0 = 0; p0 < w * h; p0++) {
    if (data[p0 * 4 + 3] < 16 || labels[p0] >= 0) continue;
    const id = areas.length;
    let area = 0;
    stack.push(p0);
    labels[p0] = id;
    while (stack.length) {
      const p = stack.pop();
      area++;
      const y = (p / w) | 0, x = p % w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
        const q = yy * w + xx;
        if (data[q * 4 + 3] >= 16 && labels[q] < 0) { labels[q] = id; stack.push(q); }
      }
    }
    areas.push(area);
  }
  if (areas.length <= 1) return buf;
  const keep = areas.indexOf(Math.max(...areas));
  for (let p = 0; p < w * h; p++) {
    if (labels[p] >= 0 && labels[p] !== keep) data[p * 4 + 3] = 0;
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/** برش جزء index از شیت + حذف تکه‌های همسایه */
async function pick(sheet, index, opts = {}) {
  const path = src(sheet);
  const boxes = await segment(path, opts);
  if (index >= boxes.length) {
    throw new Error(`${sheet}: component ${index} of ${boxes.length} missing`);
  }
  const buf = await sharp(path).extract(boxes[index]).png().toBuffer();
  return isolateLargest(buf);
}

/** برش نسبی (fraction rect) از یک تصویر/بافر */
async function cropFrac(input, [fx0, fy0, fx1, fy1]) {
  const img = sharp(input);
  const m = await img.metadata();
  const left = Math.round(fx0 * m.width);
  const top = Math.round(fy0 * m.height);
  return img
    .extract({
      left,
      top,
      width: Math.min(m.width, Math.round((fx1 - fx0) * m.width)),
      height: Math.min(m.height, Math.round((fy1 - fy0) * m.height)),
    })
    .png()
    .toBuffer();
}

async function trim(buf, pad = 6) {
  return sharp(buf)
    .trim({ threshold: 12 })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function resizeMax(buf, maxW, maxH) {
  return sharp(buf).resize(maxW, maxH, { fit: 'inside', withoutEnlargement: false }).png().toBuffer();
}

async function save(name, buf) {
  const out = join(MASTERS, `engraved_${name}.png`);
  mkdirSync(dirname(out), { recursive: true });
  await sharp(buf).png().toFile(out);
  const m = await sharp(out).metadata();
  console.log(`ok  engraved_${name}.png (${m.width}x${m.height})`);
}

/* ------------------------------------------------------------------ */
/* دستورهای ساخت هر master                                            */
/* ------------------------------------------------------------------ */

/**
 * پس‌زمینه: اتاق زیرشیروانی روی بوم کاغذی تمام‌پر.
 * روی نیمه‌ی پایین یک wash کاغذی می‌نشیند تا مبلمان اتاق پشت ابزارهای بازی
 * (هاون/دیگ/میز) کم‌رنگ شود و اجزای interactive خوانا بمانند.
 */
async function buildBackground() {
  const PARCHMENT = { r: 236, g: 220, b: 186 };
  const attic = await sharp(src('Room - Attic'))
    .resize(1536, 1024, { fit: 'cover', position: 'south' })
    .png()
    .toBuffer();
  const wash = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.42" stop-color="rgb(236,220,186)" stop-opacity="0"/>
          <stop offset="0.62" stop-color="rgb(236,220,186)" stop-opacity="0.55"/>
          <stop offset="1" stop-color="rgb(236,220,186)" stop-opacity="0.72"/>
        </linearGradient>
      </defs>
      <rect width="1536" height="1024" fill="url(#g)"/>
    </svg>`);
  const buf = await sharp({
    create: { width: 1536, height: 1024, channels: 4, background: { ...PARCHMENT, alpha: 1 } },
  })
    .composite([{ input: attic }, { input: wash }])
    .flatten(PARCHMENT)
    .png()
    .toBuffer();
  await save('shop_background', buf);
}

/**
 * هاون و کوبه — در شیت، کوبه روی لبه‌ی هاون را پوشانده.
 * بازسازی هاون متقارن: نیمه‌ی چپ سالم + قرینه‌ی افقی آن.
 * برش‌های نسبی داخل جزء «هاون+کوبه» (پس از debug تنظیم شده‌اند).
 */
const MORTAR_FR = {
  // نیمه‌ی چپ کاسه داخل جزء ترکیبی: از لبه‌ی چپ تا خط تقارن (زیر لبه‌ی بالا)
  bowlLeftHalf: [0.0, 0.30, 0.492, 1.0],
};

async function buildMortar() {
  const comp = await pick('Laboratory Gear - All', 2); // جزء هاون+کوبه
  // کاسه‌ی متقارن: نیمه‌ی چپ سالم (بدون کوبه) + قرینه‌ی افقی
  const leftHalf = await trim(await cropFrac(comp, MORTAR_FR.bowlLeftHalf), 0);
  const lh = await sharp(leftHalf).metadata();
  const bowl = await sharp({
    create: { width: lh.width * 2, height: lh.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: leftHalf, left: 0, top: 0 },
      { input: await sharp(leftHalf).flop().png().toBuffer(), left: lh.width, top: 0 },
    ])
    .png()
    .toBuffer();
  await save('mortar', await trim(bowl));
}

/**
 * کوبه — در شیت تقریباً کامل داخل کاسه است و برش تمیزی ندارد؛
 * به‌جای برش، SVG هم‌سبک با خود هاون (سنگ خاکستری + هاشور حکاکی) ساخته می‌شود.
 */
async function buildPestle() {
  const W = 340, H = 1080;
  const OUTLINE = '#33241a';
  const FILL = '#8b8577';
  const HATCH = '#42301f';
  const club = `M 170,16
    C 240,16 258,64 252,116 C 246,190 212,250 206,330
    C 200,430 262,570 288,710 C 306,812 284,1052 170,1062
    C 56,1052 34,812 52,710 C 78,570 140,430 134,330
    C 128,250 94,190 88,116 C 82,64 100,16 170,16 Z`;
  const hatches = [];
  for (let y = 70; y < 1040; y += 58) {
    const dash = y % 116 === 12 ? '34 30' : '52 38';
    hatches.push(
      `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${HATCH}" stroke-width="11" stroke-dasharray="${dash}" stroke-dashoffset="${(y * 7) % 61}" opacity="0.6"/>`,
    );
  }
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs><clipPath id="c"><path d="${club}"/></clipPath></defs>
      <path d="${club}" fill="${FILL}"/>
      <g clip-path="url(#c)">${hatches.join('')}</g>
      <path d="${club}" fill="none" stroke="${OUTLINE}" stroke-width="18"/>
    </svg>`;
  await save('pestle', await sharp(Buffer.from(svg)).png().toBuffer());
}

/**
 * سطح مایع دیگ — procedural هم‌پالت پک (بیضی با خطوط حکاکی و حباب).
 * دهانه‌ی دیگ حکاکی باریک‌تر از سبک فلت است؛ بیضی کوچک‌تر و نزدیک لبه‌ی
 * بالای بوم کشیده می‌شود تا داخل zone مشترک cauldronPotion روی دهانه بنشیند.
 */
async function buildPotionSurfaces() {
  const W = 1337, H = 352;
  const RX = 552, RY = 86;
  const cx = W / 2, cy = RY + 14;
  const OUTLINE = '#33231a';
  const FILL = '#77618c';
  const RING = '#c9b8d8';
  const ring = (rx, ry, dash = '') =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${RING}" stroke-width="9" ${dash ? `stroke-dasharray="${dash}"` : ''} opacity="0.85"/>`;
  const bubble = (x, y, r) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${RING}" stroke-width="8" opacity="0.95"/>`;
  const base = (extra) => `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <ellipse cx="${cx}" cy="${cy}" rx="${RX}" ry="${RY}" fill="${FILL}" stroke="${OUTLINE}" stroke-width="16"/>
      ${extra}
    </svg>`;

  const still = base(`${ring(370, 54, '90 70')}${ring(210, 30, '70 55')}${ring(95, 13)}`);
  const boil1 = base(
    `${ring(370, 54, '60 90')}${bubble(cx - 280, cy - 12, 24)}${bubble(cx + 170, cy + 18, 32)}${bubble(cx + 390, cy - 16, 19)}${bubble(cx - 80, cy + 28, 18)}`,
  );
  const boil2 = base(
    `${ring(340, 48, '40 110')}${bubble(cx - 350, cy + 14, 27)}${bubble(cx - 130, cy - 22, 35)}${bubble(cx + 80, cy + 24, 24)}${bubble(cx + 300, cy - 14, 37)}${bubble(cx + 430, cy + 22, 16)}`,
  );

  await save('potion_still', await sharp(Buffer.from(still)).png().toBuffer());
  await save('potion_boil_1', await sharp(Buffer.from(boil1)).png().toBuffer());
  await save('potion_boil_2', await sharp(Buffer.from(boil2)).png().toBuffer());
}

/** آتش: شعله‌ی شیت عناصر آتش در ۳ اندازه */
async function buildFires(flameBuf) {
  const flame = await trim(flameBuf);
  await save('fire_low', await resizeMax(await sharp(flame).resize({ height: 300 }).toBuffer(), 999, 300));
  await save('fire_medium', await resizeMax(await sharp(flame).resize({ height: 560 }).toBuffer(), 999, 560));
  await save('fire_high', await resizeMax(await sharp(flame).resize({ height: 860 }).toBuffer(), 999, 860));
}

/** بطری خالی: نسخه‌ی بی‌رنگ‌شده‌ی بطری پر */
async function buildBottles(fullBuf) {
  const full = await trim(fullBuf);
  await save('bottle_full', await resizeMax(full, 700, 1100));
  const empty = await sharp(full).modulate({ saturation: 0.18, brightness: 1.18 }).png().toBuffer();
  await save('bottle_empty', await resizeMax(empty, 700, 1100));
}

/** محتوای هاون: تپه‌ی خام (سبز) و کوبیده (قهوه‌ای پودری) از یک گیاه */
async function buildHeaps(tuftBuf) {
  const tuft = await trim(tuftBuf);
  const m = await sharp(tuft).metadata();
  const raw = await sharp(tuft)
    .resize(m.width, Math.round(m.height * 0.62), { fit: 'fill' })
    .png()
    .toBuffer();
  await save('heap_raw', raw);
  const ground = await sharp(tuft)
    .resize(m.width, Math.round(m.height * 0.4), { fit: 'fill' })
    .modulate({ saturation: 0.4, brightness: 0.95, hue: 40 })
    .png()
    .toBuffer();
  await save('heap_ground', ground);
}

/* ------------------------------------------------------------------ */
/* نگاشت اجزای شیت‌ها (ایندکس‌ها پس از --debug نهایی می‌شوند)          */
/* ------------------------------------------------------------------ */

const JOBS = async () => {
  await buildBackground();

  // قفسه: تخته‌ی بلند ساده (سطر ۴ چپ شیت قفسه‌ها)
  await save('shelf_board', await resizeMax(await trim(await pick('Furniture & Decor - Shelves', 6)), 1480, 400));

  // گیاهان قفسه — بابونه/گاوزبان/نعناع/زعفران/خشخاش/زنجبیل
  const HF = 'Ingredients - Herbs & Flowers';
  await save('jar_saffron', await resizeMax(await trim(await pick(HF, 0)), 900, 900)); // گل نارنجی
  await save('jar_chamomile', await resizeMax(await trim(await pick(HF, 2)), 900, 900)); // گل فیروزه‌ای
  await save('jar_poppy', await resizeMax(await trim(await pick(HF, 3)), 900, 900)); // گل ارغوانی
  await save('jar_mint', await resizeMax(await trim(await pick(HF, 4)), 900, 900)); // بوته‌ی سبز
  await save('jar_borage', await resizeMax(await trim(await pick('Ingredients - All', 29)), 900, 900)); // گل آبی
  await save('jar_ginger', await resizeMax(await trim(await pick('Ingredients - Element Fire', 4)), 900, 900)); // ریشه

  // میز کار: میز شیت «میز+صندلی» — فقط نوار بالایی (صفحه + بدنه‌ی بالایی)
  // تا در باکس پهن صحنه (نسبت ~۳:۱) با object-fit: contain گم نشود
  {
    const table = await trim(await pick('Furniture & Decor - Table + Chair Set 1', 1), 0);
    const wide = await sharp(table).resize({ width: 1460 }).png().toBuffer();
    const wm = await sharp(wide).metadata();
    const strip = await sharp(wide)
      .extract({ left: 0, top: 0, width: wm.width, height: Math.min(500, wm.height) })
      .png()
      .toBuffer();
    await save('work_table', strip);
  }

  // دیگ
  await save('cauldron_empty', await resizeMax(await trim(await sharp(src('Laboratory Gear - Cauldron')).png().toBuffer()), 1255, 900));

  await buildMortar();
  await buildPestle();
  await buildPotionSurfaces();
  await buildFires(await pick('Ingredients - Element Fire', 5));
  await buildBottles(await pick('Potions', 9));
  await buildHeaps(await pick(HF, 4));

  // پیشخوان مشتری: صندوق چوبی بزرگ
  await save('customer_counter', await resizeMax(await trim(await pick('Furniture & Decor - Containers', 0)), 1400, 700));

  // مشتری‌ها
  const npc = async (file) => resizeMax(await trim(await sharp(src(file)).png().toBuffer()), 1000, 1430);
  await save('customer_woman_elder', await npc('NPC - Mushroom Hag'));
  await save('customer_man_worker', await npc('NPC - Peasant Male 1'));
  await save('customer_woman_young', await npc('NPC - Herbalist Girl'));
  await save('customer_man_elder', await npc('NPC - Master Alchemist'));

  // یادداشت هدف: برگه‌ی کاغذ
  await save('goal_note', await resizeMax(await sharp(src('Paper - Sheet 1')).png().toBuffer(), 1170, 900));
};

/* ------------------------------------------------------------------ */

async function debugSheet(file) {
  const name = basename(file, '.png');
  const path = existsSync(file) ? file : src(name);
  const boxes = await segment(path);
  const outDir = join(DEBUG_DIR, name);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  console.log(`${name}: ${boxes.length} components`);
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    await sharp(path).extract(b).resize(320, 320, { fit: 'inside' }).png()
      .toFile(join(outDir, `${String(i).padStart(2, '0')}.png`));
    console.log(`  [${i}] left=${b.left} top=${b.top} w=${b.width} h=${b.height}`);
  }
  console.log(`→ ${outDir}`);
}

async function main() {
  const dbg = process.argv.indexOf('--debug');
  if (dbg >= 0) {
    await debugSheet(process.argv[dbg + 1]);
    return;
  }
  await JOBS();
  console.log('\ndone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
