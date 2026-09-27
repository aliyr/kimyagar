/**
 * Kimyagar — ابزارهای مشترک پردازش تصویر برای pipeline های asset.
 * استفاده در build_ui_layers.mjs (سبک painterly) و build_ui_styles.mjs (flat/pixel).
 */

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const smoothstep = (t) => t * t * (3 - 2 * t);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** میانه‌ی رنگ حاشیه‌ی تصویر را برمی‌گرداند */
export function borderMedian(data, w, h, ch) {
  const border = Math.max(8, Math.floor(Math.min(w, h) / 40));
  const rs = [], gs = [], bs = [];
  const push = (x, y) => {
    const i = (y * w + x) * ch;
    rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
  };
  for (let y = 0; y < h; y += 2) {
    if (y < border || y >= h - border) {
      for (let x = 0; x < w; x += 2) push(x, y);
    } else {
      for (let x = 0; x < border; x += 2) push(x, y);
      for (let x = w - border; x < w; x += 2) push(x, y);
    }
  }
  const med = (a) => a.sort((p, q) => p - q)[Math.floor(a.length / 2)];
  return [med(rs), med(gs), med(bs)];
}

/** پیکسل‌های بیرون جزیره که فاصله‌ی ۴-همسایه‌شان از آن بین minD و maxD است */
function ringAround(comp, w, h, minD, maxD) {
  const dist = new Map();
  for (const p of comp) dist.set(p, 0);
  let frontier = comp.slice();
  const ring = [];
  for (let d = 1; d <= maxD; d++) {
    const next = [];
    for (const p of frontier) {
      const x = p % w;
      for (const n of [p - 1, p + 1, p - w, p + w]) {
        if (n < 0 || n >= w * h || dist.has(n)) continue;
        if (Math.abs((n % w) - x) > 1) continue;
        dist.set(n, d);
        next.push(n);
        if (d >= minD) ring.push(n);
      }
    }
    frontier = next;
  }
  return ring;
}

/**
 * پس‌زمینه‌ی تخت را از لبه سیل می‌کند. برای پرتره‌هایی که لباس روشن‌شان به رنگ
 * پس‌زمینه نزدیک است: آستانه‌ی سیل محافظه‌کار است و هاله‌ی کم‌رنگ فقط اگر به
 * پس‌زمینه‌ی حذف‌شده چسبیده باشد جویده می‌شود.
 */
export async function removeFlatBackdrop(inputPath) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const [br, bg, bb] = borderMedian(data, w, h, ch);
  /** پس‌زمینه‌ی کرم/گرم خودش اشباع دارد؛ «کم‌رنگ» یعنی نزدیک به اشباع خود پس‌زمینه */
  const bgSat = Math.max(br, bg, bb) - Math.min(br, bg, bb);
  const distAt = (p) => {
    const i = p * ch;
    return Math.hypot(data[i] - br, data[i + 1] - bg, data[i + 2] - bb);
  };
  const satAt = (p) => {
    const i = p * ch;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return Math.max(r, g, b) - Math.min(r, g, b);
  };
  const lumAt = (p) => {
    const i = p * ch;
    return (data[i] + data[i + 1] + data[i + 2]) / 3;
  };

  const bgMask = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let qs = 0;
  let qe = 0;
  const FLOOD = 24;
  const push = (p) => {
    if (bgMask[p] || distAt(p) > FLOOD) return;
    bgMask[p] = 1;
    q[qe++] = p;
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  const flood = () => {
    while (qs < qe) {
      const p = q[qs++];
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0) push(p - 1);
      if (x + 1 < w) push(p + 1);
      if (y > 0) push(p - w);
      if (y + 1 < h) push(p + w);
    }
  };
  flood();

  // سایه‌روشنِ تدریجیِ پس‌زمینه (لبه تیره‌تر از وسط) را دنبال کن،
  // ولی از پوست و پارچه‌ی رنگی که اشباع بالاتری دارند رد نشو.
  const looseOk = (p) => distAt(p) <= 52 && satAt(p) < 34 && lumAt(p) > 150;
  qs = 0;
  qe = 0;
  for (let p = 0; p < w * h; p++) if (bgMask[p]) q[qe++] = p;
  while (qs < qe) {
    const p = q[qs++];
    const x = p % w;
    const y = (p - x) / w;
    const grow = (n) => {
      if (bgMask[n] || !looseOk(n)) return;
      bgMask[n] = 1;
      q[qe++] = n;
    };
    if (x > 0) grow(p - 1);
    if (x + 1 < w) grow(p + 1);
    if (y > 0) grow(p - w);
    if (y + 1 < h) grow(p + w);
  }

  const chew = (passes, satMax, lumMin, distMax, nearMin) => {
    for (let pass = 0; pass < passes; pass++) {
      const extra = [];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const p = y * w + x;
          if (bgMask[p]) continue;
          if (satAt(p) > satMax || lumAt(p) < lumMin || distAt(p) > distMax) continue;
          let near = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              if (bgMask[(y + dy) * w + (x + dx)]) near++;
            }
          }
          if (near >= nearMin) extra.push(p);
        }
      }
      if (extra.length === 0) break;
      for (const p of extra) bgMask[p] = 1;
    }
  };
  chew(8, 30, 198, 78, 3);
  // حفره‌ی روشنِ محصور (پشت مو) فقط اگر تقریباً از هر سو به پس‌زمینه چسبیده باشد
  chew(16, 36, 176, 96, 5);

  // جزیره‌های خیلی نزدیک به رنگ پس‌زمینه که دورشان بیشتر مو است تا پارچه
  const near = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    if (bgMask[p]) continue;
    if (distAt(p) < 40 && Math.abs(satAt(p) - bgSat) < 30 && lumAt(p) > 185) near[p] = 1;
  }
  const seenNear = new Uint8Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (!near[start] || seenNear[start]) continue;
    const stack = [start];
    const comp = [];
    seenNear[start] = 1;
    let touchesBorder = false;
    while (stack.length) {
      const p = stack.pop();
      comp.push(p);
      const x = p % w;
      const y = (p - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesBorder = true;
      if (x > 0 && near[p - 1] && !seenNear[p - 1]) {
        seenNear[p - 1] = 1;
        stack.push(p - 1);
      }
      if (x + 1 < w && near[p + 1] && !seenNear[p + 1]) {
        seenNear[p + 1] = 1;
        stack.push(p + 1);
      }
      if (y > 0 && near[p - w] && !seenNear[p - w]) {
        seenNear[p - w] = 1;
        stack.push(p - w);
      }
      if (y + 1 < h && near[p + w] && !seenNear[p + w]) {
        seenNear[p + w] = 1;
        stack.push(p + w);
      }
    }
    let sumDist = 0;
    for (const p of comp) sumDist += distAt(p);
    const avg = sumDist / comp.length;
    if (touchesBorder || comp.length < 4) continue;
    if (comp.length > 20000 && avg >= 10) continue;
    let boundary = 0;
    let chromatic = 0;
    for (const p of comp) {
      const x = p % w;
      const y = (p - x) / w;
      const neighbors = [p - 1, p + 1, p - w, p + w];
      for (const n of neighbors) {
        if (n < 0 || n >= w * h) continue;
        const nx = n % w;
        if (Math.abs(nx - x) > 1) continue;
        if (near[n]) continue;
        boundary++;
        const i = n * ch;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        const lum = (r + g + b) / 3;
        if (sat > 42 || (lum > 55 && lum < 165)) chromatic++;
      }
    }
    const frac = boundary === 0 ? 1 : chromatic / boundary;
    // لبه‌ی چسبیده به جزیره همیشه روشن (anti-alias) است؛ حلقه‌ی ۳–۵ پیکسل بیرون‌تر
    // نشان می‌دهد دورش رشته‌ی مو است یا شیشه‌ی روشن معجون.
    // پس‌زمینه‌ی حذف‌شده در حلقه شمرده نمی‌شود؛ وگرنه لای رشته‌های بیرونیِ مو شیشه به نظر می‌آید
    const ring = ringAround(comp, w, h, 3, 5);
    let hairish = 0;
    let ringLum = 0;
    let ringN = 0;
    for (const n of ring) {
      if (bgMask[n]) continue;
      const l = lumAt(n);
      ringLum += l;
      ringN++;
      if (l < 125) hairish++;
    }
    const hairFrac = ringN === 0 ? 1 : hairish / ringN;
    ringLum = ringN === 0 ? 0 : ringLum / ringN;
    let core = 0;
    for (const p of comp) if (distAt(p) < 7) core++;
    core /= comp.length;
    // شیشه‌ی معجون رنگ پس‌زمینه را کمی کدر و گرم‌تر نشان می‌دهد (avg بالاتر، دورش روشن)
    const glassy = avg >= 9 && ringLum > 205;
    // تقریباً همان رنگ پس‌زمینه ⇒ پس‌زمینه است، هر چه دورش باشد؛ کمی دورتر فقط اگر لای مو باشد
    // لکه‌ی خیلی ریز (لای حلقه‌ی مو) فقط اگر عیناً رنگ پس‌زمینه باشد، تا برق چشم نپرد
    const removable =
      !glassy &&
      (comp.length < 30
        ? avg < 6 || (core > 0.5 && hairFrac > 0.5)
        : avg < 9 || core > 0.3 || (hairFrac > 0.3 && core > 0.15 && avg < 22) || (hairFrac > 0.3 && frac < 0.75 && avg < 22));
    if (removable) for (const p of comp) bgMask[p] = 1;
  }

  const seen = new Uint8Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (bgMask[start] || seen[start]) continue;
    const stack = [start];
    const comp = [];
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      comp.push(p);
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0 && !bgMask[p - 1] && !seen[p - 1]) {
        seen[p - 1] = 1;
        stack.push(p - 1);
      }
      if (x + 1 < w && !bgMask[p + 1] && !seen[p + 1]) {
        seen[p + 1] = 1;
        stack.push(p + 1);
      }
      if (y > 0 && !bgMask[p - w] && !seen[p - w]) {
        seen[p - w] = 1;
        stack.push(p - w);
      }
      if (y + 1 < h && !bgMask[p + w] && !seen[p + w]) {
        seen[p + w] = 1;
        stack.push(p + w);
      }
    }
    if (comp.length < 80) for (const p of comp) bgMask[p] = 1;
  }

  // فاصله تا پس‌زمینه‌ی حذف‌شده (۰ = پس‌زمینه، تا EDGE پیکسل)
  const EDGE = 3;
  /** تا این فاصله از پس‌زمینه، رگه‌ی روشن لای موی تیره هم آمیزه حساب می‌شود */
  const STRAND = 14;
  const edgeDist = new Uint8Array(w * h).fill(255);
  let ring = [];
  for (let p = 0; p < w * h; p++) {
    if (bgMask[p]) {
      edgeDist[p] = 0;
      ring.push(p);
    }
  }
  for (let d = 1; d <= STRAND; d++) {
    const next = [];
    for (const p of ring) {
      const x = p % w;
      for (const n of [p - 1, p + 1, p - w, p + w]) {
        if (n < 0 || n >= w * h || edgeDist[n] <= d) continue;
        if (Math.abs((n % w) - x) > 1) continue;
        edgeDist[n] = d;
        next.push(n);
      }
    }
    ring = next;
  }

  // لبه‌ی نرم: رنگ لبه آمیزه‌ای از پس‌زمینه و رنگ واقعیِ داخل (مو، پارچه) است. نزدیک‌ترین
  // پیکسل‌های داخلی (بیرون از نوار لبه) رنگ fg را می‌دهند و آلفا از تصویرِ c روی خط bg→fg
  // درمی‌آید؛ این‌طور نیم‌پیکسل مو روی پس‌زمینه‌ی روشن هاله‌ی سفید نمی‌سازد.
  const R = EDGE + 3;
  const out = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    if (bgMask[p]) continue;
    const i = p * ch;
    const o = p * 4;
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    let a = 1;
    if (edgeDist[p] <= EDGE) {
      const x = p % w;
      const y = (p - x) / w;
      let fr = 0;
      let fg = 0;
      let fb = 0;
      let wsum = 0;
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const q = yy * w + xx;
          if (bgMask[q] || edgeDist[q] <= EDGE) continue;
          const wt = 1 / (1 + dx * dx + dy * dy);
          const j = q * ch;
          fr += data[j] * wt;
          fg += data[j + 1] * wt;
          fb += data[j + 2] * wt;
          wsum += wt;
        }
      }
      if (wsum > 0) {
        fr /= wsum;
        fg /= wsum;
        fb /= wsum;
        const vr = fr - br;
        const vg = fg - bg;
        const vb = fb - bb;
        const len2 = vr * vr + vg * vg + vb * vb;
        if (len2 > 900) {
          a = clamp(((r - br) * vr + (g - bg) * vg + (b - bb) * vb) / len2, 0, 1);
          // رنگی که روی خط bg→fg نیست (برق مو، گلدوزی، لبه‌ی شیشه) آمیزه نیست و مات می‌ماند
          const off = Math.hypot(r - (br + a * vr), g - (bg + a * vg), b - (bb + a * vb));
          if (off > 38) a = Math.max(a, clamp((distAt(p) - 14) / 56, 0, 1));
        } else {
          a = clamp((distAt(p) - 14) / 56, 0, 1);
        }
      } else {
        a = clamp((distAt(p) - 14) / 56, 0, 1);
      }
      if (a > 0.02 && a < 1) {
        r = clamp((r - (1 - a) * br) / a, 0, 255);
        g = clamp((g - (1 - a) * bg) / a, 0, 255);
        b = clamp((b - (1 - a) * bb) / a, 0, 255);
      }
    } else if (edgeDist[p] <= STRAND && distAt(p) < 75 && Math.abs(satAt(p) - bgSat) < 35 && lumAt(p) > 150) {
      // رگه‌ی روشنِ بی‌رنگ بین رشته‌های موی تیره: fg همان موی کنارش است
      const x = p % w;
      const y = (p - x) / w;
      let fr = 0;
      let fg = 0;
      let fb = 0;
      let cnt = 0;
      for (let dy = -4; dy <= 4; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -4; dx <= 4; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const q = yy * w + xx;
          if (bgMask[q] || lumAt(q) >= 100) continue;
          const j = q * ch;
          fr += data[j];
          fg += data[j + 1];
          fb += data[j + 2];
          cnt++;
        }
      }
      if (cnt >= 4) {
        fr /= cnt;
        fg /= cnt;
        fb /= cnt;
        const vr = fr - br;
        const vg = fg - bg;
        const vb = fb - bb;
        const len2 = vr * vr + vg * vg + vb * vb;
        const t = clamp(((r - br) * vr + (g - bg) * vg + (b - bb) * vb) / len2, 0, 1);
        const off = Math.hypot(r - (br + t * vr), g - (bg + t * vg), b - (bb + t * vb));
        if (off <= 30) {
          a = t;
          if (a > 0.02 && a < 1) {
            r = clamp((r - (1 - a) * br) / a, 0, 255);
            g = clamp((g - (1 - a) * bg) / a, 0, 255);
            b = clamp((b - (1 - a) * bb) / a, 0, 255);
          }
        }
      }
    }
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

/**
 * حذف پس‌زمینه‌ی روشن یکدست (نمونه‌گیری حاشیه + فاصله‌ی رنگی + unmix لبه).
 * خروجی: pipeline خام sharp با کانال آلفا.
 */
export async function removeLightBackground(inputPath) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const [br, bg, bb] = borderMedian(data, w, h, ch);
  const out = Buffer.alloc(w * h * 4);
  const NEAR = 10; // فاصله‌ی رنگی که هنوز کاملاً پس‌زمینه است
  const FAR = 42; // فاصله‌ای که از آن به بعد کاملاً پیش‌زمینه است
  const alphaF = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * ch;
    const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    alphaF[p] = smoothstep(clamp((dist - NEAR) / (FAR - NEAR), 0, 1));
  }
  // erosion یک‌پیکسلی برای حذف هاله‌ی روشن لبه
  const eroded = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = clamp(y + dy, 0, h - 1), xx = clamp(x + dx, 0, w - 1);
          m = Math.min(m, alphaF[yy * w + xx]);
        }
      }
      // میانگین erosion و مقدار اصلی: لبه نرم می‌ماند ولی هاله کم می‌شود
      eroded[y * w + x] = (m + alphaF[y * w + x]) / 2;
    }
  }
  for (let p = 0; p < w * h; p++) {
    const i = p * ch, o = p * 4;
    const a = eroded[p];
    if (a > 0.02 && a < 0.98) {
      // unmix: حذف سهم پس‌زمینه از پیکسل‌های لبه
      const safe = Math.max(a, 0.1);
      out[o] = clamp(Math.round((data[i] - (1 - a) * br) / safe), 0, 255);
      out[o + 1] = clamp(Math.round((data[i + 1] - (1 - a) * bg) / safe), 0, 255);
      out[o + 2] = clamp(Math.round((data[i + 2] - (1 - a) * bb) / safe), 0, 255);
    } else {
      out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2];
    }
    out[o + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

/** تبدیل محتوای روی مشکی خالص (آتش/بخار) به آلفا (max-channel unpremultiply) */
export async function blackToAlpha(inputPath) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const out = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const i = p * ch, o = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const aRaw = Math.max(r, g, b);
    // تقویت آلفا: محتوای نیمه‌تیره (هیزم/زغال) باید نزدیک به کدر باشد
    const a = Math.min(255, Math.round(aRaw * 1.55));
    if (a > 0) {
      // unmix با آلفای جدید: composite روی مشکی دقیقاً تصویر اصلی می‌شود
      const f = 255 / a;
      out[o] = clamp(Math.round(r * f), 0, 255);
      out[o + 1] = clamp(Math.round(g * f), 0, 255);
      out[o + 2] = clamp(Math.round(b * f), 0, 255);
    }
    out[o + 3] = a;
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}

/** هاله‌ی درخشش طلایی گرم (FX کشف) */
export async function makeGlow(size = 512) {
  const out = Buffer.alloc(size * size * 4);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.sqrt((x - c) ** 2 + (y - c) ** 2) / c;
      const a = smoothstep(clamp(1 - d, 0, 1));
      const o = (y * size + x) * 4;
      out[o] = 255; out[o + 1] = 214; out[o + 2] = 130; // طلایی گرم
      out[o + 3] = Math.round(a * a * 235);
    }
  }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } });
}

export function ensureDirs(...files) {
  for (const f of files) mkdirSync(dirname(f), { recursive: true });
}
