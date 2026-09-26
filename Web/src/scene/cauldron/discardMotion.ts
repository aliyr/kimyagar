/**
 * دور ریختن دیگ (سطل) — حرکت و صحنه‌سازی خالص، بدون Canvas و React.
 *
 * زمان‌بندی (ثانیه از ضربه به سطل):
 *   ۰            دیگِ پر با سرعت به دیوار چوبیِ پشت پرت می‌شود؛ از زیر تخته‌ی
 *                قفسه رد می‌شود، دور می‌شود ⇒ کوچک‌تر، و می‌غلتد.
 *   gobsLeave    محتوا از دهانه جدا می‌شود و جلوتر از دیگ می‌رود.
 *   gobsHit      محتوا به دیوار می‌خورد ⇒ لکه‌ی بزرگ + چکه‌ها؛ چند ثانیه می‌ماند.
 *   potHit       دیگ به دیوار می‌خورد (شق فلزی + لرزش صحنه)، کمی برمی‌گردد و
 *                پشت میز در تاریکی می‌افتد؛ زیر لبه‌ی پشتی میز دیده نمی‌شود.
 *   respawnAt    دیگ نو از بالای قاب می‌افتد (ClassicBrewSim.respawn): لقی،
 *                نشست، پرشدن آب از پایین به بالا.
 *   splat: hold ⇒ fade ⇒ end.
 *
 * لایه‌ها: دیگِ پرنده و گلوله‌ها در لایه‌ی کار (جلوی قفسه)؛ لکه‌ی دیوار در
 * لایه‌ی پشت (DiscardWallFx: روی دیوار، پشتِ قفسه، زیرِ میز).
 * store همان لحظه‌ی ضربه ریست می‌شود؛ همه‌ی این‌ها فقط نمایش است.
 */

import { Rng } from '../../art/flat/kit/rng.ts';
import { SCENE_ZONES } from '../artManifest';
import { CAULDRON_IMAGE, CAULDRON_IMAGE_SCALE, CLASSIC_MOUTH, MOUTH_IN_IMAGE } from '../classicCauldronGeometry';

/**
 * لبه‌ی پایینی تخته‌ی قفسه‌ی دیواری در فضای صحنه (پیکسل‌های دیده‌شدنیِ
 * shelf_board.png داخل SCENE_ZONES.wallShelf). دیگ و محتوا از زیر آن رد می‌شوند.
 */
export const SHELF_BOTTOM = 448;

export const DISCARD = {
  /** پایینِ دیوارِ دیده‌شدنی = لبه‌ی پشتی رویه‌ی میز؛ دیگِ افتاده زیر آن پنهان است */
  wallBottom: SCENE_ZONES.workTable.y,
  /** نقطه‌ی برخورد با دیوار چوبی — نوارِ دیوار بین تخته‌ی قفسه و لبه‌ی میز، کمی راستِ دیگ */
  impact: { x: 940, y: 534 },
  /** مقیاس دیگ در لحظه‌ی برخورد (دورتر از بیننده) */
  impactScale: 0.5,
  /** قوس پرتاب: منفی = مسیر کمی پایین می‌رود تا دیگ از زیر تخته‌ی قفسه رد شود */
  arc: -30,
  /** چرخش کل تا برخورد (درجه)؛ دیر شروع می‌شود (وقتی دیگ کوچک شده) تا دسته‌ها به قفسه نرسند */
  tumbleDeg: 165,
  tumbleEase: 2.5,
  gobsLeave: 0.05,
  /** محتوا زودتر از دیگ به دیوار می‌رسد */
  gobsHit: 0.32,
  potHit: 0.5,
  bounceDur: 0.12,
  /** سقوط پشت میز */
  fallGravity: 2600,
  fallVy: 60,
  /** تالاپِ خفه‌ی رسیدن به زمین پشت میز (پس از ناپدیدشدن کامل) */
  thudAt: 1.06,
  /** فرمان آمدن دیگ نو */
  respawnAt: 1.15,
  /** لکه‌ی دیوار: ماندن کامل (در این مدت خشک می‌شود)، بعد محو */
  splatHold: 3.0,
  splatFade: 1.2,
  /** پایان کامل افکت */
  end: 4.8,
} as const;

/** مستطیل Canvas دیگِ پرنده در فضای صحنه (لایه‌ی کار) */
export const DISCARD_RECT = { x: 540, y: 300, width: 800, height: 520 } as const;
/** مستطیل Canvas لکه‌ی دیوار (لایه‌ی پشت: روی دیوار، پشت قفسه، زیر میز) */
export const WALL_RECT = { x: 580, y: 400, width: 720, height: 220 } as const;

/** اندازه‌ی بدنه‌ی PNG در فضای صحنه و مرکز آن در سکون */
export const POT_SIZE = {
  width: CAULDRON_IMAGE.width * CAULDRON_IMAGE_SCALE,
  height: CAULDRON_IMAGE.height * CAULDRON_IMAGE_SCALE,
} as const;
export const POT_REST = {
  x: SCENE_ZONES.cauldron.x + SCENE_ZONES.cauldron.width / 2,
  y: SCENE_ZONES.cauldron.y + SCENE_ZONES.cauldron.height / 2,
} as const;
/** دهانه نسبت به مرکز بدنه (پیکسل صحنه، بدون چرخش) */
export const MOUTH_LOCAL = {
  x: (MOUTH_IN_IMAGE.cx - CAULDRON_IMAGE.width / 2) * CAULDRON_IMAGE_SCALE,
  y: (MOUTH_IN_IMAGE.cy - CAULDRON_IMAGE.height / 2) * CAULDRON_IMAGE_SCALE,
  rx: CLASSIC_MOUTH.rx,
  ry: CLASSIC_MOUTH.ry,
} as const;

/**
 * شعاع دیده‌شدنیِ بدنه حول مرکز (برای «کامل پنهان شد» و «زیر قفسه ماند»): شکل
 * دیگ گرد است و گوشه‌های شفاف PNG حساب نمی‌شوند؛ نقاشی هم به لبه‌ی میز clip می‌شود.
 */
export const POT_RADIUS = POT_SIZE.height * 0.6;

export interface PotPose {
  x: number;
  y: number;
  scale: number;
  /** رادیان */
  rot: number;
  /** تیرگی ۰..۱ (افتادن در تاریکی پشت میز) */
  dark: number;
  /** هنوز بخشی از دیگ بالای لبه‌ی میز دیده می‌شود */
  visible: boolean;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

const DEG = Math.PI / 180;

/** وضعیت دیگِ پرت‌شده در زمان t */
export function potPose(t: number): PotPose {
  const T = DISCARD;
  if (t <= 0) return { x: POT_REST.x, y: POT_REST.y, scale: 1, rot: 0, dark: 0, visible: true };
  if (t < T.potHit) {
    const u = t / T.potHit;
    // پرتاب: تند شروع می‌شود و با دور شدن (پرسپکتیو) آرام‌تر دیده می‌شود
    const e = 1 - Math.pow(1 - u, 1.7);
    return {
      x: lerp(POT_REST.x, T.impact.x, e),
      y: lerp(POT_REST.y, T.impact.y, e) - T.arc * Math.sin(Math.PI * u),
      scale: lerp(1, T.impactScale, e),
      rot: T.tumbleDeg * DEG * Math.pow(e, T.tumbleEase),
      dark: 0,
      visible: true,
    };
  }
  const bounceEnd = T.potHit + T.bounceDur;
  if (t < bounceEnd) {
    const v = (t - T.potHit) / T.bounceDur;
    return {
      x: T.impact.x - 14 * v,
      y: T.impact.y + 16 * v,
      scale: lerp(T.impactScale, T.impactScale * 1.12, v),
      rot: (T.tumbleDeg + 22 * v) * DEG,
      dark: 0,
      visible: true,
    };
  }
  const tau = t - bounceEnd;
  const scale = T.impactScale * 1.12 + 0.1 * tau;
  const y = T.impact.y + 16 + T.fallVy * tau + 0.5 * T.fallGravity * tau * tau;
  return {
    x: T.impact.x - 14 - 40 * tau,
    y,
    scale,
    rot: (T.tumbleDeg + 22 + 110 * tau) * DEG,
    dark: clamp01(tau / 0.3),
    visible: y - POT_RADIUS * scale < T.wallBottom,
  };
}

/**
 * نیم‌بلندیِ عمودیِ بدنه‌ی چرخیده روی صفحه (مدل بیضی: نیم‌پهنا و نیم‌بلندی PNG).
 * برای «از زیر قفسه رد شد» — بالای دیگ = y − این مقدار.
 */
export function potHalfHeight(pose: PotPose): number {
  const a = (POT_SIZE.width / 2) * Math.sin(pose.rot);
  const b = (POT_SIZE.height / 2) * Math.cos(pose.rot);
  return Math.hypot(a, b) * pose.scale;
}

/** مرکز دهانه‌ی دیگِ پرت‌شده در فضای صحنه */
export function mouthCenter(pose: PotPose): { x: number; y: number } {
  const c = Math.cos(pose.rot);
  const s = Math.sin(pose.rot);
  return {
    x: pose.x + (MOUTH_LOCAL.x * c - MOUTH_LOCAL.y * s) * pose.scale,
    y: pose.y + (MOUTH_LOCAL.x * s + MOUTH_LOCAL.y * c) * pose.scale,
  };
}

/** شفافیت لکه‌ی دیوار: ۰ پیش از برخورد، ۱ در ماندن، محو در انتها */
export function splatAlpha(t: number): number {
  const T = DISCARD;
  if (t < T.gobsHit) return 0;
  const a = t - T.gobsHit;
  if (a < T.splatHold) return 1;
  return 1 - clamp01((a - T.splatHold) / T.splatFade);
}

/** خشک‌شدن لکه ۰..۱ در طول ماندن: برق و لبه‌ی خیس کم می‌شود، لکه کمی جمع می‌شود */
export function splatDryness(t: number): number {
  const a = t - DISCARD.gobsHit;
  if (a <= 0) return 0;
  return clamp01(a / (DISCARD.splatHold + DISCARD.splatFade));
}

/** مایع باقی‌مانده در دهانه‌ی دیگ در پرواز (۱ پر، ۰ خالی) */
export function mouthLiquid(t: number): number {
  return 1 - clamp01((t - DISCARD.gobsLeave) / 0.16);
}

/** یک گلوله‌ی مایع در پرواز از دهانه تا دیوار */
export interface Gob {
  /** لحظه‌ی جداشدن و برخورد */
  leave: number;
  hit: number;
  /** جای جداشدن (مرکز دهانه در لحظه‌ی leave) */
  fx: number;
  fy: number;
  /** جای فرود روی دیوار */
  tx: number;
  ty: number;
  /** شعاع (پیکسل صحنه) */
  r: number;
  /** قوس پرواز */
  arc: number;
  /** جابه‌جایی عمود بر مسیر تا گلوله‌ها در یک خط به هم نچسبند */
  sway: number;
}

/** تعداد نقاط دورِ هر توده (برای شکل ناهموار) */
export const BLOB_POINTS = 16;

export interface SplatBlob {
  x: number;
  y: number;
  rx: number;
  ry: number;
  /** چرخش بیضی پایه (رادیان) */
  rot: number;
  /** ضریب شعاع در هر نقطه‌ی دور — لبه‌ی ناهموار و لَب‌دار */
  lobes: number[];
  /** لحظه‌ی پیدا شدن */
  at: number;
}

/** رشته‌ی باریکِ مایع که از توده‌ی اصلی رو به بیرون کشیده شده */
export interface Tendril {
  x: number;
  y: number;
  /** جهت (رادیان) و بلندی */
  ang: number;
  len: number;
  width: number;
  at: number;
}

/** قطره‌ی ریزِ پاشش، کشیده در جهت دورشدن از مرکز */
export interface Spatter {
  x: number;
  y: number;
  r: number;
  ang: number;
  /** کشیدگی (۱ = دایره) */
  stretch: number;
  at: number;
}

export interface Drip {
  x: number;
  y0: number;
  maxLen: number;
  width: number;
  /** تأخیر شروع پس از برخورد (ثانیه) */
  delay: number;
  /** ثابت زمانی رشد (ثانیه) — چکه‌های پرتر تندتر می‌روند */
  tau: number;
  /** پیچ‌وتاب مسیر: دامنه (پیکسل) و فاز */
  wobble: number;
  phase: number;
}

export interface DiscardScene {
  gobs: Gob[];
  blobs: SplatBlob[];
  tendrils: Tendril[];
  drips: Drip[];
  spatter: Spatter[];
}

function makeLobes(rng: Rng, roughness: number): number[] {
  const lobes: number[] = [];
  for (let i = 0; i < BLOB_POINTS; i++) lobes.push(1 + rng.range(-roughness, roughness));
  // چند لَبِ برجسته‌تر تا شکل «شلپ» بگیرد نه توپ
  const bumps = rng.int(2, 4);
  for (let b = 0; b < bumps; b++) {
    const k = rng.int(0, BLOB_POINTS - 1);
    lobes[k] += rng.range(0.12, 0.3);
    lobes[(k + 1) % BLOB_POINTS] += rng.range(0.04, 0.12);
  }
  return lobes;
}

/** صحنه‌ی قطعی از روی seed: گلوله‌ها، لکه‌ی لَب‌دار، رشته‌ها، چکه‌ها و پاشش */
export function buildDiscardScene(seed: number): DiscardScene {
  const rng = new Rng(seed * 7919 + 17);
  const T = DISCARD;
  const gobs: Gob[] = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const spreadX = rng.range(-1, 1);
    const spreadY = rng.range(-1, 1);
    const leave = T.gobsLeave + rng.range(0, 0.12);
    const from = mouthCenter(potPose(leave));
    const fan = rng.range(-1.1, 1.1);
    const r = rng.range(9, 26);
    gobs.push({
      leave,
      hit: T.gobsHit + rng.range(-0.03, 0.04),
      fx: from.x + Math.sin(fan) * 26,
      fy: from.y + (1 - Math.cos(fan)) * 10,
      tx: T.impact.x + spreadX * 120 * (0.3 + 0.7 * Math.abs(spreadX)),
      // فرود همیشه زیر تخته‌ی قفسه (با احتساب شعاع)؛ لکه کمی بالاتر از مرکز برخورد تا جا برای چکه بماند
      ty: Math.max(SHELF_BOTTOM + r + 6, T.impact.y - 14 + spreadY * 32),
      r,
      arc: rng.range(4, 22),
      sway: rng.range(-38, 38),
    });
  }

  // لکه پهن و کم‌ارتفاع: نوارِ دیوار کوتاه است و زیر لکه جا برای چکه‌ها می‌ماند
  const cy = T.impact.y - 14;
  const blobs: SplatBlob[] = [
    { x: T.impact.x, y: cy, rx: 122, ry: 50, rot: rng.range(-0.12, 0.12), lobes: makeLobes(rng, 0.12), at: T.gobsHit },
    { x: T.impact.x - 64, y: cy + 14, rx: 84, ry: 36, rot: rng.range(-0.3, 0.1), lobes: makeLobes(rng, 0.14), at: T.gobsHit + 0.02 },
    { x: T.impact.x + 70, y: cy - 8, rx: 78, ry: 34, rot: rng.range(-0.1, 0.3), lobes: makeLobes(rng, 0.14), at: T.gobsHit + 0.02 },
  ];
  for (const g of gobs) {
    blobs.push({
      x: g.tx,
      y: g.ty,
      rx: g.r * 2.4,
      ry: g.r * 1.25,
      rot: rng.range(-0.5, 0.5),
      lobes: makeLobes(rng, 0.18),
      at: g.hit,
    });
  }

  // رشته‌ها: از لبه‌ی توده‌ی اصلی، بیشتر به دو سو و پایین (نه بالا به قفسه)
  const tendrils: Tendril[] = [];
  for (let i = 0; i < 9; i++) {
    const ang = rng.chance(0.5) ? rng.range(-0.55, 0.55) : Math.PI + rng.range(-0.55, 0.55);
    const a = rng.chance(0.3) ? Math.PI / 2 + rng.range(-0.9, 0.9) : ang;
    tendrils.push({
      x: T.impact.x + Math.cos(a) * 92,
      y: Math.max(SHELF_BOTTOM + 4, cy + Math.sin(a) * 38),
      ang: a,
      len: rng.range(26, 78),
      width: rng.range(6, 16),
      at: T.gobsHit + rng.range(0, 0.05),
    });
  }

  const drips: Drip[] = [];
  for (let i = 0; i < 9; i++) {
    const src = rng.pick(blobs);
    const width = rng.range(5, 13);
    drips.push({
      x: src.x + rng.range(-src.rx * 0.6, src.rx * 0.6),
      y0: src.y + src.ry * 0.5,
      maxLen: rng.range(40, 150) * (0.7 + width / 26),
      width,
      delay: rng.range(0.05, 0.7),
      tau: rng.range(0.6, 1.3) * (14 / (width + 4)),
      wobble: rng.range(1.5, 5),
      phase: rng.range(0, Math.PI * 2),
    });
  }

  const spatter: Spatter[] = [];
  for (let i = 0; i < 34; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(105, 270);
    const y = cy + Math.sin(a) * d * 0.42;
    if (y < SHELF_BOTTOM + 3) continue;
    spatter.push({
      x: T.impact.x + Math.cos(a) * d,
      y,
      r: rng.range(1.8, 6),
      ang: a,
      stretch: rng.range(1.2, 2.6),
      at: T.gobsHit + rng.range(0, 0.09),
    });
  }
  return { gobs, blobs, tendrils, drips, spatter };
}

/** جای گلوله در زمان t؛ null اگر هنوز جدا نشده یا خورده است */
export function gobPosition(g: Gob, t: number): { x: number; y: number; u: number } | null {
  if (t < g.leave || t >= g.hit) return null;
  const u = (t - g.leave) / (g.hit - g.leave);
  const dx = g.tx - g.fx;
  const dy = g.ty - g.fy;
  const len = Math.hypot(dx, dy) || 1;
  const side = Math.sin(Math.PI * u) * g.sway;
  let y = lerp(g.fy, g.ty, u) + (dx / len) * side - g.arc * Math.sin(Math.PI * u);
  const underShelf = SHELF_BOTTOM + g.r + 6;
  if (y < underShelf) y = underShelf;
  return {
    x: lerp(g.fx, g.tx, u) + (-dy / len) * side,
    y,
    u,
  };
}

/** بلندی چکه در زمان a ثانیه پس از برخورد (رشد نمایی رو به سقف) */
export function dripLength(d: Drip, a: number): number {
  if (a < d.delay) return 0;
  return d.maxLen * (1 - Math.exp(-(a - d.delay) / d.tau));
}

/** نقطه‌ی مسیرِ پیچ‌دارِ چکه در فاصله‌ی s از سرِ آن */
export function dripPoint(d: Drip, s: number): { x: number; y: number } {
  return { x: d.x + Math.sin(s / 22 + d.phase) * d.wobble * Math.min(1, s / 30), y: d.y0 + s };
}

/** نقطه‌ی i از دورِ توده با رشد g (۰..۱) — برای رسم مسیر لَب‌دار */
export function blobPoint(b: SplatBlob, i: number, g: number): { x: number; y: number } {
  const k = ((i % BLOB_POINTS) + BLOB_POINTS) % BLOB_POINTS;
  const a = (k / BLOB_POINTS) * Math.PI * 2;
  const m = b.lobes[k] * g;
  const lx = Math.cos(a) * b.rx * m;
  const ly = Math.sin(a) * b.ry * m;
  const c = Math.cos(b.rot);
  const s = Math.sin(b.rot);
  return { x: b.x + lx * c - ly * s, y: b.y + lx * s + ly * c };
}
