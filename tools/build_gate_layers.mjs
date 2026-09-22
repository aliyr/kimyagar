/**
 * لایه‌های PNG سردر دکان — از master های رندر شده، با حذف پس‌زمینه.
 *
 * خروجی (Art/UI Layers/95_Shop_Gate و Web/public/art/gate):
 *   door_west / door_east (پنجرهٔ سرخابی شفاف؛ شرق آینهٔ غرب)
 *   lintel, sill, sign, plaque, seal, parchment, drop, customer_shadow
 *   candle (بدنه، بدون شعله)
 *   flame_1..3 روی بوم مشترک، لنگر پایین-وسط
 *
 * Usage: node tools/build_gate_layers.mjs
 */

import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { borderMedian, clamp, smoothstep, ensureDirs } from './image_utils.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MASTERS = 'C:/Users/mkfar/.cursor/projects/d-Source-Kimiagar/assets';
const UI = join(ROOT, 'Art', 'UI Layers', '95_Shop_Gate');
const WEB = join(ROOT, 'Web', 'public', 'art', 'gate');

/** پس‌زمینه‌ی سبزِ لبه‌ را برمی‌دارد (نمونه‌گیری حاشیه، نه یک سبزِ ثابت). */
async function chromaKey(inputPath, { near = 26, far = 88 } = {}) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const [br, bg, bb] = borderMedian(data, w, h, ch);
  const out = Buffer.alloc(w * h * 4);
  const alphaF = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * ch;
    const dr = data[i] - br;
    const dg = data[i + 1] - bg;
    const db = data[i + 2] - bb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    alphaF[p] = smoothstep(clamp((dist - near) / (far - near), 0, 1));
  }
  const eroded = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = clamp(y + dy, 0, h - 1);
          const xx = clamp(x + dx, 0, w - 1);
          m = Math.min(m, alphaF[yy * w + xx]);
        }
      }
      eroded[y * w + x] = (m + alphaF[y * w + x]) / 2;
    }
  }
  for (let p = 0; p < w * h; p++) {
    const i = p * ch;
    const o = p * 4;
    const a = eroded[p];
    if (a > 0.02 && a < 0.98) {
      const safe = Math.max(a, 0.1);
      out[o] = clamp(Math.round((data[i] - (1 - a) * br) / safe), 0, 255);
      out[o + 1] = clamp(Math.round((data[i + 1] - (1 - a) * bg) / safe), 0, 255);
      out[o + 2] = clamp(Math.round((data[i + 2] - (1 - a) * bb) / safe), 0, 255);
    } else {
      out[o] = data[i];
      out[o + 1] = data[i + 1];
      out[o + 2] = data[i + 2];
    }
    out[o + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

/** حلقه‌ی سبزِ باقی‌مانده دور مُهر (خودِ تصویر، نه پس‌زمینه) را برمی‌دارد. */
async function punchGreenDisc(pipeline) {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  for (let p = 0; p < w * h; p++) {
    const o = p * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    if (data[o + 3] > 0 && g > r + 12 && g > b + 8) data[o + 3] = 0;
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } });
}

/** شعله روی مشکی: هسته کدر، هاله نرم. تقویتِ خطیِ blackToAlpha هاله را تخت می‌کند. */
async function softFlame(inputPath) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const out = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const i = p * ch;
    const o = p * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const aRaw = Math.max(r, g, b);
    if (aRaw < 16) continue;
    const a = Math.round(Math.pow(aRaw / 255, 1.45) * 255);
    const f = 255 / aRaw;
    out[o] = clamp(Math.round(r * f), 0, 255);
    out[o + 1] = clamp(Math.round(g * f), 0, 255);
    out[o + 2] = clamp(Math.round(b * f), 0, 255);
    out[o + 3] = a;
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

/** پنجره‌ی تختِ سرخابی را شفاف می‌کند تا کارگاه از پشت شیشه دیده شود. */
async function punchMagenta(pipeline) {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const mag = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const score = Math.min(r, b) - g;
    mag[p] = smoothstep(clamp((score - 28) / 70, 0, 1));
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = clamp(y + dy, 0, h - 1);
          const xx = clamp(x + dx, 0, w - 1);
          m = Math.max(m, mag[yy * w + xx]);
        }
      }
      const o = (y * w + x) * 4;
      const keep = 1 - m;
      data[o + 3] = Math.round(data[o + 3] * keep);
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } });
}

/** لبهٔ سبزِ نازک را می‌خورد؛ پوست و مُهر بیشتر از بقیه حاشیه دارند. */
async function erodeAlpha(pipeline, radius = 2) {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const srcA = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) srcA[p] = data[p * 4 + 3];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 255;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = clamp(y + dy, 0, h - 1);
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = clamp(x + dx, 0, w - 1);
          m = Math.min(m, srcA[yy * w + xx]);
        }
      }
      data[(y * w + x) * 4 + 3] = m;
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } });
}

async function trimPad(pipeline, pad = 6) {
  return pipeline
    .trim({ threshold: 8 })
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function save(buf, name) {
  const layerPath = join(UI, name);
  const webPath = join(WEB, name);
  ensureDirs(layerPath, webPath);
  await sharp(buf).png().toFile(layerPath);
  await sharp(buf).png().toFile(webPath);
  const meta = await sharp(buf).metadata();
  console.log(`ok  gate/${name}  ${meta.width}x${meta.height}`);
}

/** فریم‌های شعله را روی یک بوم می‌نشاند؛ پایین-وسط ثابت می‌ماند. */
async function alignBottomCenter(buffers) {
  const metas = await Promise.all(buffers.map((b) => sharp(b).metadata()));
  const w = Math.max(...metas.map((m) => m.width ?? 0));
  const h = Math.max(...metas.map((m) => m.height ?? 0));
  return Promise.all(
    buffers.map((b, i) => {
      const mw = metas[i].width ?? 0;
      const mh = metas[i].height ?? 0;
      const left = Math.round((w - mw) / 2);
      const top = h - mh;
      return sharp(b)
        .extend({
          top,
          bottom: 0,
          left,
          right: w - mw - left,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
    }),
  );
}

const keyed = async (file, opts) => trimPad(await chromaKey(join(MASTERS, file), opts));

const door = await trimPad(await punchMagenta(await chromaKey(join(MASTERS, 'gate_door_leaf.png'))), 4);
await save(door, 'door_west.png');
await save(await sharp(door).flop().png().toBuffer(), 'door_east.png');

await save(await keyed('gate_lintel.png'), 'lintel.png');
await save(await keyed('gate_sill.png'), 'sill.png');
await save(await keyed('gate_sign.png'), 'sign.png');
await save(await keyed('gate_plaque.png'), 'plaque.png');
await save(await trimPad(await punchGreenDisc(await chromaKey(join(MASTERS, 'gate_seal.png'), { near: 18, far: 64 }))), 'seal.png');
await save(await trimPad(await erodeAlpha(await chromaKey(join(MASTERS, 'gate_parchment.png')), 3)), 'parchment.png');
await save(await keyed('gate_drop.png'), 'drop.png');
await save(await keyed('gate_customer_shadow.png'), 'customer_shadow.png');
await save(await keyed('gate_candle_v3.png', { near: 18, far: 70 }), 'candle.png');

const flames = [];
for (const name of ['gate_flame_v3_1.png', 'gate_flame_v3_2.png', 'gate_flame_v3_3.png']) {
  const keyedFlame = await softFlame(join(MASTERS, name));
  flames.push(await trimPad(keyedFlame, 2));
}
const aligned = await alignBottomCenter(flames);
for (let i = 0; i < aligned.length; i++) {
  await save(aligned[i], `flame_${i + 1}.png`);
}

const manifest = {
  layer: 'shop_gate',
  notes: 'لایه‌های سردر. متن فارسی در Runtime روی تابلو، پلاک و پوست می‌نشیند. پنجره‌ی در شفاف است.',
  files: [
    'door_west.png',
    'door_east.png',
    'lintel.png',
    'sill.png',
    'sign.png',
    'plaque.png',
    'seal.png',
    'parchment.png',
    'drop.png',
    'customer_shadow.png',
    'candle.png',
    'flame_1.png',
    'flame_2.png',
    'flame_3.png',
  ],
};
writeFileSync(join(UI, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('manifest written');
