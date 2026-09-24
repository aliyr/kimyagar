/**
 * Kimyagar — mortar/pestle/pieces v3 pipeline.
 * Masters: classic_mortar_hi / classic_pestle_* / classic_pieces_* (light bg).
 * Outputs: Web/public/art/mortar/v3/ (+ Art/UI Layers mirror) and
 *          Web/src/scene/mortarGeometry.ts
 *
 * Usage:  cd tools; node build_mortar_v3.mjs
 */

import sharp from 'sharp';
import { existsSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clamp,
  ensureDirs,
  removeLightBackground,
  smoothstep,
} from './image_utils.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MASTERS = 'C:/Users/mkfar/.cursor/projects/d-Source-Kimiagar/assets';
const UI_LAYERS = join(ROOT, 'Art', 'UI Layers', '40_Mortar', 'v3');
const WEB_ART = join(ROOT, 'Web', 'public', 'art', 'mortar', 'v3');
const GEOM_TS = join(ROOT, 'Web', 'src', 'scene', 'mortarGeometry.ts');

const PAD = 14;
const HEAD_WIDTH_TARGET = 230;
const PESTLE_MARGIN = 12;
const HEAD_AX = 0.42;
const HEAD_AY = 0.74;

const written = [];
let missing = 0;

function warnMissing(name) {
  console.warn(`MISSING master: ${name}`);
  missing++;
}

async function savePng(buf, rel) {
  const layerPath = join(UI_LAYERS, rel);
  const webPath = join(WEB_ART, rel);
  ensureDirs(layerPath, webPath);
  await sharp(buf).png().toFile(layerPath);
  await sharp(buf).png().toFile(webPath);
  written.push(rel);
  console.log(`ok  mortar/v3/${rel}`);
}

function r4(v) {
  return Math.round(v * 10000) / 10000;
}
function r3(v) {
  return Math.round(v * 1000) / 1000;
}
function r1(v) {
  return Math.round(v * 10) / 10;
}
function evenCeil(n) {
  const c = Math.ceil(n);
  return c % 2 === 0 ? c : c + 1;
}

/** alpha > thr bbox (inclusive). Returns null if empty. */
function alphaBBox(data, w, h, thr = 8) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > thr) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x0, y0, x1, y1, bw: x1 - x0 + 1, bh: y1 - y0 + 1 };
}

/** last opaque row y (0-based) on canvas */
function lastOpaqueY(data, w, h, thr = 8) {
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > thr) return y;
    }
  }
  return h - 1;
}

/**
 * نیمه‌ی نزدیک دیواره: از yStart تا yEnd با smoothstep آلفای جلویی را می‌سازد.
 * y1/y2 در مختصات canvas (پیکسل).
 */
async function frontFromBack(backBuf, y1, y2) {
  const { data, info } = await sharp(backBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y++) {
    const t = smoothstep(clamp((y - y1) / (y2 - y1), 0, 1));
    if (t >= 1) break;
    for (let x = 0; x < info.width; x++) {
      const o = (y * info.width + x) * 4 + 3;
      data[o] = Math.round(data[o] * t);
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

// ---------------------------------------------------------------------------
// Pestle geometry: PCA axis, head/knob anchors
// ---------------------------------------------------------------------------

function collectMask(data, w, h, thr = 40) {
  const xs = [], ys = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > thr) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  return { xs, ys, n: xs.length };
}

function pestleMeasure(data, w, h) {
  const { xs, ys, n } = collectMask(data, w, h, 40);
  if (n < 10) throw new Error('pestle mask too small');

  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;

  let cxx = 0, cyy = 0, cxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    cxx += dx * dx; cyy += dy * dy; cxy += dx * dy;
  }
  cxx /= n; cyy /= n; cxy /= n;

  // eigenvector of larger eigenvalue of [[cxx,cxy],[cxy,cyy]]
  const trace = cxx + cyy;
  const det = cxx * cyy - cxy * cxy;
  const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det));
  const l1 = trace / 2 + disc;
  let ux, uy;
  if (Math.abs(cxy) > 1e-9) {
    ux = l1 - cyy; uy = cxy;
  } else if (cxx >= cyy) {
    ux = 1; uy = 0;
  } else {
    ux = 0; uy = 1;
  }
  const len = Math.hypot(ux, uy) || 1;
  ux /= len; uy /= len;

  const s = new Float64Array(n);
  let sMin = Infinity, sMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = (xs[i] - mx) * ux + (ys[i] - my) * uy;
    s[i] = v;
    if (v < sMin) sMin = v;
    if (v > sMax) sMax = v;
  }
  const extent = sMax - sMin || 1;
  const px = -uy, py = ux; // perpendicular

  function endSpread(loFrac, hiFrac) {
    const lo = sMin + loFrac * extent;
    const hi = sMin + hiFrac * extent;
    const vals = [];
    for (let i = 0; i < n; i++) {
      if (s[i] >= lo && s[i] <= hi) {
        vals.push((xs[i] - mx) * px + (ys[i] - my) * py);
      }
    }
    if (vals.length < 2) return 0;
    let m = 0;
    for (const v of vals) m += v;
    m /= vals.length;
    let var_ = 0;
    for (const v of vals) var_ += (v - m) * (v - m);
    return Math.sqrt(var_ / vals.length);
  }

  // 30% at each end — larger perp spread = HEAD
  const spreadMin = endSpread(0, 0.3);
  const spreadMax = endSpread(0.7, 1);
  // u should point FROM head TOWARD knob
  if (spreadMin >= spreadMax) {
    // head at sMin → u already points toward sMax (knob) ✓
  } else {
    // head at sMax → flip u
    ux = -ux; uy = -uy;
    for (let i = 0; i < n; i++) s[i] = -s[i];
    const tmp = sMin; sMin = -sMax; sMax = -tmp;
  }
  // after possible flip: head at sMin end, knob at sMax end
  const extent2 = sMax - sMin || 1;

  function centroidInFrac(loFrac, hiFrac) {
    const lo = sMin + loFrac * extent2;
    const hi = sMin + hiFrac * extent2;
    let sx = 0, sy = 0, c = 0;
    for (let i = 0; i < n; i++) {
      if (s[i] >= lo && s[i] <= hi) {
        sx += xs[i]; sy += ys[i]; c++;
      }
    }
    if (!c) return { x: mx, y: my };
    return { x: sx / c, y: sy / c };
  }

  function perpExtent(loFrac, hiFrac) {
    const lo = sMin + loFrac * extent2;
    const hi = sMin + hiFrac * extent2;
    let pMin = Infinity, pMax = -Infinity;
    for (let i = 0; i < n; i++) {
      if (s[i] >= lo && s[i] <= hi) {
        const p = (xs[i] - mx) * px + (ys[i] - my) * py;
        // after flip, px/py still match original ux,uy — recompute from current u
        const p2 = (xs[i] - mx) * (-uy) + (ys[i] - my) * ux;
        if (p2 < pMin) pMin = p2;
        if (p2 > pMax) pMax = p2;
      }
    }
    if (!Number.isFinite(pMin)) return 0;
    return pMax - pMin;
  }

  const head = centroidInFrac(0, 0.22);
  const knob = centroidInFrac(0.92, 1);
  const headWidth = perpExtent(0, 0.22);
  const axisDeg = (Math.atan2(uy, ux) * 180) / Math.PI;

  return { head, knob, headWidth, axisDeg, ux, uy, w, h };
}

async function measureFromPng(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { ...pestleMeasure(data, info.width, info.height), data, info };
}

function normDeg(d) {
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

async function rotateToTarget(pngBuf, axisDeg, targetDeg) {
  let delta = targetDeg - axisDeg;
  let rotated = await sharp(pngBuf)
    .rotate(delta, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  let m = await measureFromPng(rotated);
  if (Math.abs(normDeg(m.axisDeg - targetDeg)) >= 2.5) {
    delta = -delta;
    rotated = await sharp(pngBuf)
      .rotate(delta, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    m = await measureFromPng(rotated);
    if (Math.abs(normDeg(m.axisDeg - targetDeg)) >= 2.5) {
      throw new Error(
        `axis assert failed: target=${targetDeg} measured=${m.axisDeg.toFixed(2)} delta tried ±${Math.abs(targetDeg - axisDeg)}`,
      );
    }
    console.log(`  rotation sign flipped (delta=${delta.toFixed(2)})`);
  }
  return { buf: rotated, measure: m, delta };
}

// ---------------------------------------------------------------------------
// Connected components (4-connectivity, iterative BFS)
// ---------------------------------------------------------------------------

function connectedComponents(mask, w, h) {
  const labels = new Int32Array(w * h);
  const comps = []; // { id, area, x0,y0,x1,y1, sx,sy }
  let nextId = 1;
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i0 = y * w + x;
      if (!mask[i0] || labels[i0]) continue;
      const id = nextId++;
      let head = 0, tail = 0;
      qx[tail] = x; qy[tail] = y; tail++;
      labels[i0] = id;
      let area = 0, sx = 0, sy = 0;
      let x0 = x, y0 = y, x1 = x, y1 = y;
      while (head < tail) {
        const cx = qx[head], cy = qy[head]; head++;
        area++;
        sx += cx; sy += cy;
        if (cx < x0) x0 = cx;
        if (cy < y0) y0 = cy;
        if (cx > x1) x1 = cx;
        if (cy > y1) y1 = cy;
        const neigh = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
        for (const [nx, ny] of neigh) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (!mask[ni] || labels[ni]) continue;
          labels[ni] = id;
          qx[tail] = nx; qy[tail] = ny; tail++;
        }
      }
      comps.push({
        id, area, x0, y0, x1, y1,
        cx: sx / area, cy: sy / area,
      });
    }
  }
  return { labels, comps };
}

// ---------------------------------------------------------------------------
// A) Mortar body
// ---------------------------------------------------------------------------

async function buildMortar() {
  const name = 'classic_mortar_hi.png';
  const input = join(MASTERS, name);
  if (!existsSync(input)) { warnMissing(name); return null; }

  const rawBuf = await (await removeLightBackground(input)).png().toBuffer();
  const { data, info } = await sharp(rawBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bb = alphaBBox(data, info.width, info.height, 8);
  if (!bb) throw new Error('mortar body empty after bg removal');
  console.log(`mortar bbox: x ${bb.x0}..${bb.x1}, y ${bb.y0}..${bb.y1}`);

  const trimmed = await sharp(rawBuf)
    .extract({ left: bb.x0, top: bb.y0, width: bb.bw, height: bb.bh })
    .png()
    .toBuffer();

  const CW = bb.bw + 2 * PAD;
  const CH = bb.bh + 2 * PAD;
  const blank = {
    create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  };
  const backBuf = await sharp(blank)
    .composite([{ input: trimmed, left: PAD, top: PAD }])
    .png()
    .toBuffer();
  await savePng(backBuf, 'mortar_back.png');

  const yStart = 424 - bb.y0 + PAD;
  const yEnd = 446 - bb.y0 + PAD;
  const frontBuf = await frontFromBack(backBuf, yStart, yEnd);
  await savePng(frontBuf, 'mortar_front.png');

  const canvasFracY = (my) => (my - bb.y0 + PAD) / CH;
  const ellipse = (mx, my, mrx, mry) => ({
    cx: r4((mx - bb.x0 + PAD) / CW),
    cy: r4((my - bb.y0 + PAD) / CH),
    rx: r4(mrx / CW),
    ry: r4(mry / CH),
  });

  const { data: cData, info: cInfo } = await sharp(backBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const baseY = lastOpaqueY(cData, cInfo.width, cInfo.height, 8);

  return {
    canvas: { width: CW, height: CH },
    outer: ellipse(517, 247, 444, 223),
    mouth: ellipse(522, 242, 382, 186),
    floor: ellipse(520, 372, 250, 52),
    frontFade: { start: r4(canvasFracY(424)), end: r4(canvasFracY(446)) },
    base: { y: r4(baseY / CH) },
    bx0: bb.x0, by0: bb.y0,
  };
}

// ---------------------------------------------------------------------------
// B) Pestle frames
// ---------------------------------------------------------------------------

const PESTLE_FRAMES = [
  { file: 'pestle_1.png', source: 'upright', master: 'classic_pestle_upright.png', mirrored: false, targetDeg: -78 },
  { file: 'pestle_2.png', source: 'tilt', master: 'classic_pestle_tilt.png', mirrored: false, targetDeg: -62 },
  { file: 'pestle_3.png', source: 'upright', master: 'classic_pestle_upright.png', mirrored: false, targetDeg: -84 },
  { file: 'pestle_4.png', source: 'tilt', master: 'classic_pestle_tilt.png', mirrored: false, targetDeg: -48 },
  { file: 'pestle_5.png', source: 'tilt', master: 'classic_pestle_tilt.png', mirrored: true, targetDeg: -132 },
  { file: 'pestle_6.png', source: 'lying', master: 'classic_pestle_lying.png', mirrored: false, targetDeg: -22 },
];

async function loadPestleSource(master) {
  const input = join(MASTERS, master);
  if (!existsSync(input)) { warnMissing(master); return null; }
  const buf = await (await removeLightBackground(input)).png().toBuffer();
  const m = await measureFromPng(buf);
  const scale = HEAD_WIDTH_TARGET / m.headWidth;
  const sw = Math.max(1, Math.round(m.info.width * scale));
  const sh = Math.max(1, Math.round(m.info.height * scale));
  const scaled = await sharp(buf).resize(sw, sh, { fit: 'fill' }).png().toBuffer();
  // re-measure after scale (axisDeg unchanged; headWidth ~230)
  const sm = await measureFromPng(scaled);
  return { buf: scaled, measure: sm, master };
}

async function buildPestles() {
  const cache = new Map();
  async function getSrc(master) {
    if (!cache.has(master)) cache.set(master, await loadPestleSource(master));
    return cache.get(master);
  }

  const prepared = [];
  for (const spec of PESTLE_FRAMES) {
    const src = await getSrc(spec.master);
    if (!src) continue;

    let workBuf = src.buf;
    let axisDeg = src.measure.axisDeg;
    if (spec.mirrored) {
      workBuf = await sharp(workBuf).flop().png().toBuffer();
      axisDeg = normDeg(180 - axisDeg);
      // re-measure to be safe
      const mm = await measureFromPng(workBuf);
      axisDeg = mm.axisDeg;
    }

    console.log(`pestle ${spec.file}: axisDeg=${axisDeg.toFixed(2)} → ${spec.targetDeg}`);
    const { buf, measure } = await rotateToTarget(workBuf, axisDeg, spec.targetDeg);
    prepared.push({
      ...spec,
      buf,
      w: measure.info.width,
      h: measure.info.height,
      head: measure.head,
      knob: measure.knob,
      axisDeg: measure.axisDeg,
    });
  }

  if (prepared.length !== 6) {
    throw new Error(`expected 6 pestle frames, got ${prepared.length}`);
  }

  // Shared canvas: headAnchor = (0.42*PW, 0.74*PH), 12px margin for every frame
  let needW = 0, needH = 0;
  for (const f of prepared) {
    // left: head.x + margin must fit when head at HEAD_AX*PW
    //   HEAD_AX*PW >= head.x + MARGIN  →  PW >= (head.x + M) / HEAD_AX
    // right: PW - HEAD_AX*PW >= (w - head.x) + MARGIN
    //   PW*(1-HEAD_AX) >= w - head.x + M  → PW >= (w-head.x+M)/(1-HEAD_AX)
    const m = PESTLE_MARGIN;
    needW = Math.max(
      needW,
      (f.head.x + m) / HEAD_AX,
      (f.w - f.head.x + m) / (1 - HEAD_AX),
    );
    needH = Math.max(
      needH,
      (f.head.y + m) / HEAD_AY,
      (f.h - f.head.y + m) / (1 - HEAD_AY),
    );
  }
  const PW = evenCeil(needW);
  const PH = evenCeil(needH);
  const headAxPx = Math.round(HEAD_AX * PW);
  const headAyPx = Math.round(HEAD_AY * PH);
  console.log(`pestle canvas: ${PW}×${PH}, headAnchor=(${headAxPx},${headAyPx})`);

  const framesOut = [];
  for (const f of prepared) {
    const left = Math.round(headAxPx - f.head.x);
    const top = Math.round(headAyPx - f.head.y);
    const canvasBuf = await sharp({
      create: { width: PW, height: PH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: f.buf, left, top }])
      .png()
      .toBuffer();
    await savePng(canvasBuf, f.file);

    const knobX = (f.knob.x + left) / PW;
    const knobY = (f.knob.y + top) / PH;
    framesOut.push({
      file: `mortar/v3/${f.file}`,
      source: f.source,
      mirrored: f.mirrored,
      axisDeg: r1(f.axisDeg),
      knob: { x: r4(knobX), y: r4(knobY) },
    });
  }

  return {
    canvas: { width: PW, height: PH },
    head: { x: r4(HEAD_AX), y: r4(HEAD_AY) },
    headWidthPx: HEAD_WIDTH_TARGET,
    frames: framesOut,
  };
}

// ---------------------------------------------------------------------------
// C) Piece sprites
// ---------------------------------------------------------------------------

const PIECE_KINDS = ['flower', 'thread', 'leaf', 'root', 'seed', 'star', 'petal'];

async function buildPieces() {
  const result = {};
  for (const kind of PIECE_KINDS) {
    const name = `classic_pieces_${kind}.png`;
    const input = join(MASTERS, name);
    if (!existsSync(input)) { warnMissing(name); continue; }

    const pngBuf = await (await removeLightBackground(input)).png().toBuffer();
    const { data, info } = await sharp(pngBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: W, height: H } = info;
    const mask = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) mask[i] = data[i * 4 + 3] > 40 ? 1 : 0;

    const { labels, comps } = connectedComponents(mask, W, H);
    if (!comps.length) {
      console.warn(`no pieces found in ${name}`);
      result[kind] = { count: 0, aspects: [] };
      continue;
    }
    comps.sort((a, b) => b.area - a.area);
    const maxArea = comps[0].area;
    let kept = comps.filter((c) => c.area >= 0.02 * maxArea);
    kept.sort((a, b) => b.area - a.area);
    kept = kept.slice(0, 8);
    // order: row band then cx
    const bandH = H / 3;
    kept.sort((a, b) => {
      const ba = Math.round(a.cy / bandH);
      const bb = Math.round(b.cy / bandH);
      if (ba !== bb) return ba - bb;
      return a.cx - b.cx;
    });

    const aspects = [];
    for (let i = 0; i < kept.length; i++) {
      const c = kept[i];
      const pad = 3;
      const x0 = Math.max(0, c.x0 - pad);
      const y0 = Math.max(0, c.y0 - pad);
      const x1 = Math.min(W - 1, c.x1 + pad);
      const y1 = Math.min(H - 1, c.y1 + pad);
      const cw = x1 - x0 + 1;
      const ch = y1 - y0 + 1;
      const crop = Buffer.alloc(cw * ch * 4);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const sx = x0 + x, sy = y0 + y;
          const si = sy * W + sx;
          const di = (y * cw + x) * 4;
          crop[di] = data[si * 4];
          crop[di + 1] = data[si * 4 + 1];
          crop[di + 2] = data[si * 4 + 2];
          crop[di + 3] = labels[si] === c.id ? data[si * 4 + 3] : 0;
        }
      }
      let outW = cw, outH = ch;
      const longest = Math.max(cw, ch);
      if (longest > 256) {
        const s = 256 / longest;
        outW = Math.max(1, Math.round(cw * s));
        outH = Math.max(1, Math.round(ch * s));
      }
      let sprite = sharp(crop, { raw: { width: cw, height: ch, channels: 4 } });
      if (outW !== cw || outH !== ch) {
        sprite = sprite.resize(outW, outH, { fit: 'fill' });
      }
      const buf = await sprite.png().toBuffer();
      const meta = await sharp(buf).metadata();
      await savePng(buf, `pieces/${kind}_${i + 1}.png`);
      aspects.push(r3(meta.width / meta.height));
    }
    console.log(`pieces ${kind}: ${kept.length} (expected ~7)`);
    result[kind] = { count: kept.length, aspects };
  }
  return result;
}

// ---------------------------------------------------------------------------
// D) TypeScript + manifest
// ---------------------------------------------------------------------------

function emitTs(geom) {
  const { canvas, outer, mouth, floor, frontFade, base, pestle, pieces } = geom;
  const ell = (e) =>
    `{ cx: ${e.cx}, cy: ${e.cy}, rx: ${e.rx}, ry: ${e.ry} }`;
  const frames = pestle.frames.map((f) =>
    `      {\n` +
    `        file: '${f.file}',\n` +
    `        source: '${f.source}',\n` +
    `        mirrored: ${f.mirrored},\n` +
    `        axisDeg: ${f.axisDeg},\n` +
    `        knob: { x: ${f.knob.x}, y: ${f.knob.y} },\n` +
    `      }`,
  ).join(',\n');

  const pieceBlock = PIECE_KINDS.map((k) => {
    const p = pieces[k] || { count: 0, aspects: [] };
    return `    ${k}: { count: ${p.count}, aspects: [${p.aspects.join(', ')}] },`;
  }).join('\n');

  return `/**
 * AUTO-GENERATED by tools/build_mortar_v3.mjs — do not edit by hand.
 * All fractions are 0..1 of the named canvas (mortar canvas or pestle canvas).
 */
export interface EllipseFrac { cx: number; cy: number; rx: number; ry: number }
export interface PointFrac { x: number; y: number }
export interface PestleFrameGeom {
  file: string;          // e.g. 'mortar/v3/pestle_1.png' (relative to /art)
  source: 'upright' | 'tilt' | 'lying';
  mirrored: boolean;
  axisDeg: number;       // measured after rotation, head -> knob, screen coords
  knob: PointFrac;       // fraction of pestle canvas
}
export const MORTAR_V3 = {
  canvas: { width: ${canvas.width}, height: ${canvas.height} },
  outer: ${ell(outer)},
  mouth: ${ell(mouth)},
  floor: ${ell(floor)},
  frontFade: { start: ${frontFade.start}, end: ${frontFade.end} },
  base: { y: ${base.y} },
  pestle: {
    canvas: { width: ${pestle.canvas.width}, height: ${pestle.canvas.height} },
    head: { x: ${pestle.head.x}, y: ${pestle.head.y} },
    headWidthPx: ${pestle.headWidthPx},
    frames: [
${frames},
    ],
  },
  pieces: {
${pieceBlock}
  },
} as const;
export type PieceKindV3 = keyof typeof MORTAR_V3.pieces;
`;
}

function printSummary(geom) {
  console.log('\n========== MORTAR V3 GEOMETRY ==========');
  console.log(`mortar canvas: ${geom.canvas.width}×${geom.canvas.height}`);
  console.log(`outer:  cx=${geom.outer.cx} cy=${geom.outer.cy} rx=${geom.outer.rx} ry=${geom.outer.ry}`);
  console.log(`mouth:  cx=${geom.mouth.cx} cy=${geom.mouth.cy} rx=${geom.mouth.rx} ry=${geom.mouth.ry}`);
  console.log(`floor:  cx=${geom.floor.cx} cy=${geom.floor.cy} rx=${geom.floor.rx} ry=${geom.floor.ry}`);
  console.log(`frontFade: ${geom.frontFade.start} → ${geom.frontFade.end}`);
  console.log(`base.y: ${geom.base.y}`);
  console.log(`pestle canvas: ${geom.pestle.canvas.width}×${geom.pestle.canvas.height}`);
  console.log(`pestle head: (${geom.pestle.head.x}, ${geom.pestle.head.y})  headWidthPx=${geom.pestle.headWidthPx}`);
  console.log('frames:');
  for (const f of geom.pestle.frames) {
    console.log(`  ${f.file}  ${f.source}${f.mirrored ? ' flop' : ''}  axis=${f.axisDeg}°  knob=(${f.knob.x},${f.knob.y})`);
  }
  console.log('pieces:');
  for (const k of PIECE_KINDS) {
    const p = geom.pieces[k];
    console.log(`  ${k}: count=${p.count} aspects=[${p.aspects.join(', ')}]`);
  }
  console.log('========================================\n');
}

async function main() {
  const mortar = await buildMortar();
  if (!mortar) throw new Error('mortar build failed');

  const pestle = await buildPestles();
  const pieces = await buildPieces();

  if (missing > 0) {
    console.error(`\n${missing} required master(s) missing — aborting.`);
    process.exit(1);
  }

  const geom = {
    canvas: mortar.canvas,
    outer: mortar.outer,
    mouth: mortar.mouth,
    floor: mortar.floor,
    frontFade: mortar.frontFade,
    base: mortar.base,
    pestle,
    pieces,
  };

  ensureDirs(GEOM_TS);
  writeFileSync(GEOM_TS, emitTs(geom), 'utf8');
  console.log(`ok  ${GEOM_TS}`);

  const manifestPath = join(WEB_ART, 'manifest.json');
  ensureDirs(manifestPath);
  writeFileSync(manifestPath, JSON.stringify({ generated: new Date().toISOString(), ...geom }, null, 2) + '\n', 'utf8');
  // mirror manifest to UI layers
  const layerManifest = join(UI_LAYERS, 'manifest.json');
  ensureDirs(layerManifest);
  writeFileSync(layerManifest, JSON.stringify({ generated: new Date().toISOString(), ...geom }, null, 2) + '\n', 'utf8');
  written.push('manifest.json');

  printSummary(geom);
  console.log(`files written: ${written.length} (+ mortarGeometry.ts)`);
  console.log('done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
