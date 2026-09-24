/**
 * تپهٔ مواد داخل هاون + حرکت کوبه (کلاسیک، v3).
 *
 * - تکه‌ها (`MortarChip`) در فضای `.cst-bowl` (درصد جعبه) زندگی می‌کنند؛ هر تکه یک
 *   اسپرایت واقعی از `pieces/{kind}_{i}.png` است که با ضربه می‌شکند و در نهایت
 *   «گرد» می‌شود. حجم کل تپه در طول کوبش ثابت می‌ماند (holdVolume).
 * - کوبه یک چرخهٔ ضربهٔ فازدار دارد: خیز آرام ← سقوط سریع ← برخورد و مکث فشار با
 *   پیچش سایشی ← رهاسازی. در لحظهٔ برخورد `emitStrike` صدا زده می‌شود؛ صدا،
 *   هپتیک، ذرات، لرزش هاون و شکستن تکه‌ها همه از همین رویداد می‌آیند.
 * - زاویهٔ دستهٔ کوبه با انتخاب فریم (۶ PNG با زاویهٔ پخته) + چرخش باقی‌ماندهٔ
 *   کوچک ساخته می‌شود؛ لنگر سر در همهٔ فریم‌ها یک نقطه است.
 * - کارِ store (`grindWork`) وقتی کوبه در حال کوبش است تا برخورد بعدی صبر می‌کند
 *   تا شکستن تکه‌ها دقیقاً همان لحظهٔ فرود باشد.
 */

import { useSyncExternalStore } from 'react';
import { MORTAR_V3, type PieceKindV3 } from './mortarGeometry';
import { SCENE_ZONES } from './artManifest';
import {
  BOWL_MORTAR,
  BOWL_PX,
  FLOOR,
  HEAD_R,
  PESTLE_BOX,
  PESTLE_FRAMES,
  PESTLE_HEAD_ANCHOR,
  sceneToZone,
} from './mortarLayout';

export { BOWL_MORTAR } from './mortarLayout';

export type PieceKind = PieceKindV3 | 'dust';

export type MortarChip = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  crush: number;
  delay: number;
  nick: number;
  seed: number;
  kind: PieceKind;
  /** اندیس اسپرایت داخل برگهٔ همان kind (۰..count-1) */
  sprite: number;
  generation: number;
  vx: number;
  vy: number;
  /** پرش کوتاه بعد از ضربه (۰..۱؛ به‌سرعت میرا) */
  hop: number;
  /** رنگ ماده‌ی خودش؛ خالی یعنی رنگ هاون. */
  color?: string;
  ingredientId?: string;
};

export type PestleMode = 'lean' | 'rest' | 'grind';

export type PestleAim = {
  mode: PestleMode;
  orbit: number;
  down: boolean;
  /** لنگر سر کوبه — درصد Zone */
  headX: number;
  headY: number;
  /** چرخش باقی‌مانده بعد از انتخاب فریم (درجه) */
  rotate: number;
  /** فریم ۱..۶ */
  frame: number;
  /** ۰..۱ — چقدر روی مواد فشار می‌دهد (۱ = لحظهٔ برخورد) */
  impact: number;
  /** ۰..۱ — ارتفاع خیز */
  lift: number;
};

export type StrikeEvent = {
  /** نقطهٔ تماس سر با مواد — درصد Zone */
  x: number;
  y: number;
  /** تعداد تکه‌هایی که زیر سر بودند */
  hits: number;
  /** ۰..۱ — درجهٔ نرمی تپه در لحظهٔ ضربه */
  fineness: number;
  /** رنگ تکه‌های خورده (برای ذرات) */
  colors: string[];
};

export type Residue = { color: string; amount: number } | null;

/** آستانه‌های کوبش — همان اعداد store، بدون وابستگی چرخشی. */
const WORK_COARSE = 1;
const WORK_CRUSHED = 2.2;
const WORK_FINE = 3.6;

/* ------------------------------ چرخهٔ ضربه ------------------------------ */

/** ضربه در ثانیه */
const BEAT_HZ = 1.9;
/** مرز فازها در یک ضربه (کسر) */
const PH_LIFT_END = 0.42;
const PH_FALL_END = 0.56;
const PH_PRESS_END = 0.78;
/** ارتفاع خیز — درصد بلندی Zone */
const LIFT_H = 15;
/** میانگین سرعت مدار سر روی تپه (رادیان/ثانیه) */
const ORBIT_SPEED = 3.8;
/** شعاع مدار سر نسبت به بیضی کف */
const ORBIT_K = 0.55;
/** زاویهٔ محور پختهٔ هر فریم کوبه (سر ⇒ سردسته) */
const FRAME_AXES: readonly number[] = PESTLE_FRAMES.map((frame) => frame.axisDeg);

const chipListeners = new Set<() => void>();
const aimListeners = new Set<() => void>();
const strikeListeners = new Set<(e: StrikeEvent) => void>();
const residueListeners = new Set<() => void>();

let chips: MortarChip[] = [];
let pileUnits: 1 | 2 | 3 = 1;
let snapshotKey = '';
let mixKey = '';
let mixGroups: { id: string; applied: number; target: number; color: string; chips: MortarChip[]; area: number }[] = [];
let appliedWork = 0;
let seq = 1;
let pileCrush = 0;
let pileWork = 0;
/** مساحت کل تپه؛ در طول خرد شدن ثابت می‌ماند. */
let pileArea = 0;
/** کمی بعد از هر ضربه حجم کمی بیشتر دیده می‌شود، بعد به اندازه‌ی ثابت برمی‌گردد. */
let fresh = 1;
let mode: PestleMode = 'lean';
let orbit = -Math.PI / 2;
/** فاز ضربه ۰..۱ */
let beat = 0;
let lastFrame = 2;
let aim: PestleAim = leanAim();
let settleRaf = 0;
let residue: Residue = null;

function emitChips(): void {
  for (const listener of chipListeners) listener();
}

function emitAim(): void {
  for (const listener of aimListeners) listener();
}

function emitResidue(): void {
  for (const listener of residueListeners) listener();
}

export function subscribeMortarPile(listener: () => void): () => void {
  chipListeners.add(listener);
  return () => {
    chipListeners.delete(listener);
  };
}

/** رویداد برخورد کوبه — بدون رندر React؛ برای صدا/هپتیک/ذرات/لرزش */
export function subscribeStrike(listener: (e: StrikeEvent) => void): () => void {
  strikeListeners.add(listener);
  return () => {
    strikeListeners.delete(listener);
  };
}

export function getMortarChips(): MortarChip[] {
  return chips;
}

export function getPileUnits(): 1 | 2 | 3 {
  return pileUnits;
}

export function getPestleAim(): PestleAim {
  return aim;
}

export function getResidue(): Residue {
  return residue;
}

export function useMortarChips(): MortarChip[] {
  return useSyncExternalStore(subscribeMortarPile, getMortarChips, getMortarChips);
}

export function useMortarUnits(): 1 | 2 | 3 {
  return useSyncExternalStore(subscribeMortarPile, getPileUnits, getPileUnits);
}

export function usePestleAim(): PestleAim {
  return useSyncExternalStore(
    (listener) => {
      aimListeners.add(listener);
      return () => {
        aimListeners.delete(listener);
      };
    },
    getPestleAim,
    getPestleAim,
  );
}

export function subscribeResidue(listener: () => void): () => void {
  residueListeners.add(listener);
  return () => {
    residueListeners.delete(listener);
  };
}

export function useResidue(): Residue {
  return useSyncExternalStore(subscribeResidue, getResidue, getResidue);
}

function rand(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/** نمای مرحله برای آزمون؛ خرد شدن بصری پله‌ای نیست و با هر ضربه کوچک می‌شود. */
export function generationCapForWork(work: number): number {
  if (work < WORK_COARSE) return 0;
  if (work < WORK_CRUSHED) return 1;
  if (work < WORK_FINE) return 2;
  return 3;
}

function chipArea(list: MortarChip[]): number {
  return list.reduce((sum, chip) => sum + chip.w * chip.h, 0);
}

/**
 * تا وقتی تکه‌ها درشت‌اند مساحت کل همان تپه‌ی اول است.
 * در نرم، دانه‌ها به اندازه‌ای می‌مانند که کف را بپوشانند و دیده شوند.
 */
function holdVolume(list: MortarChip[], work = 0): MortarChip[] {
  if (pileArea <= 0 || list.length === 0) return list;
  fresh += (1 - fresh) * 0.4;
  const area = chipArea(list);
  if (area <= 0) return list;
  const powder = work >= WORK_FINE - 0.02;
  const cover = Math.max(900, list.length * 140);
  const target = (powder ? Math.min(pileArea, cover) : pileArea) * fresh;
  const k = Math.sqrt(target / area);
  const scaled = list.map((chip) => {
    const w = powder ? Math.max(8, chip.w * k) : chip.w * k;
    const h = powder ? Math.max(12, chip.h * k) : chip.h * k;
    const pos = containPoint(chip.x, chip.y, w * 0.5, h * 0.5);
    return { ...chip, w, h, x: pos.x, y: pos.y };
  });
  return spreadMound(scaled);
}

/** دانه‌ی گرد روی دهانه‌ی پهن و کوتاه، با همان مساحت. */
function asRoundGrain(chip: MortarChip): MortarChip {
  const area = Math.max(1, chip.w * chip.h);
  const h = Math.sqrt(area * 2.4);
  const w = area / h;
  return { ...chip, w, h };
}

/** تکه‌های ریز را روی کف پخش می‌کند تا حجم دیده شود، نه اینکه روی یک نقطه جمع شوند. */
function spreadMound(list: MortarChip[]): MortarChip[] {
  const small = list.filter((chip) => Math.max(chip.w, chip.h) < 48);
  if (small.length < 4) return list;
  const ranked = [...list].sort((a, b) => a.id - b.id);
  const placed = new Map<number, { x: number; y: number }>();
  ranked.forEach((chip, index) => {
    if (Math.max(chip.w, chip.h) >= 48) return;
    const angle = index * 2.399963;
    const rad = Math.sqrt((index + 0.5) / ranked.length);
    const pos = containPoint(
      50 + Math.cos(angle) * rad * 24,
      70 + Math.sin(angle) * rad * 11,
      chip.w * 0.5,
      chip.h * 0.5,
    );
    placed.set(chip.id, pos);
  });
  return list.map((chip) => {
    const pos = placed.get(chip.id);
    return pos ? { ...chip, x: pos.x, y: pos.y, vx: 0, vy: 0 } : chip;
  });
}

/** در نرم شکل گرد می‌شود ولی سهم هر تکه از همان حجم قبلی است. */
function finishDust(list: MortarChip[], work: number): MortarChip[] {
  if (work < WORK_FINE - 0.02) return list;
  return list.map((chip) => {
    const round = asRoundGrain(chip);
    return { ...round, kind: 'dust', rot: 0 };
  });
}

/** بزرگ‌ترین ضلع مجاز (درصد bowl). ریز شدن تا گردِ قابل‌دیدن است، نه تا محو شدن. */
function sizeLimit(work: number): number {
  const t = Math.min(1, Math.max(0, work / WORK_FINE));
  const start = 80;
  const end = 16;
  return start * Math.pow(end / start, t);
}

export function kindForIngredient(id: string): PieceKindV3 {
  if (id.includes('chamomile')) return 'flower';
  if (id.includes('saffron')) return 'thread';
  if (id.includes('mint')) return 'leaf';
  if (id.includes('ginger')) return 'root';
  if (id.includes('poppy')) return 'seed';
  if (id.includes('borage')) return 'star';
  return 'petal';
}

/** مواد زیر کاسه‌ی قاشق را از هاون برمی‌دارد تا بروند داخل قاشق. */
export function scoopUnderSpoon(sceneX: number, sceneY: number): MortarChip[] {
  const z = sceneToZone(sceneX, sceneY);
  const at = zoneToChip(z.x, z.y);
  const taken: MortarChip[] = [];
  const stay: MortarChip[] = [];
  for (const chip of chips) {
    const dx = (chip.x - at.x) / 24;
    const dy = (chip.y - at.y) / 30;
    if (dx * dx + dy * dy <= 1) taken.push(chip);
    else stay.push(chip);
  }
  if (taken.length === 0) return taken;
  chips = stay;
  addResidueFrom(taken);
  emitChips();
  return taken;
}

/** هرچه بعد از چرخش قاشق مانده را هم برمی‌دارد؛ رد پودر می‌ماند. */
export function scoopRest(): MortarChip[] {
  if (chips.length === 0) return [];
  const taken = chips;
  chips = [];
  addResidueFrom(taken);
  emitChips();
  return taken;
}

/** هر برداشتِ قاشق کمی رد پودر (به رنگ همان تکه‌ها) روی کف می‌گذارد */
function addResidueFrom(list: MortarChip[]): void {
  const colored = list.filter((chip) => chip.color);
  if (colored.length === 0) return;
  const fine = list.filter((chip) => chip.kind === 'dust').length / list.length;
  const color = mixColors(colored.map((chip) => chip.color as string));
  const amount = Math.min(1, 0.3 + fine * 0.7);
  residue = residue
    ? { color: mixColors([residue.color, color]), amount: Math.min(1, Math.max(residue.amount, amount)) }
    : { color, amount };
  emitResidue();
}

/** میانگین سادهٔ رنگ‌های hex (#rrggbb) */
export function mixColors(colors: string[]): string {
  if (colors.length === 0) return '#8a7a52';
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (const c of colors) {
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c.trim());
    if (!m) continue;
    r += parseInt(m[1], 16);
    g += parseInt(m[2], 16);
    b += parseInt(m[3], 16);
    n++;
  }
  if (n === 0) return colors[0];
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** قلم‌مو یا مادهٔ تازه رد پودر را پاک می‌کند */
export function clearResidue(): void {
  if (!residue) return;
  residue = null;
  emitResidue();
}

/** درصد Zone ⇒ درصد bowl */
function zoneToChip(zx: number, zy: number): { x: number; y: number } {
  return {
    x: ((zx - BOWL_MORTAR.left) / BOWL_MORTAR.width) * 100,
    y: ((zy - BOWL_MORTAR.top) / BOWL_MORTAR.height) * 100,
  };
}

/** درصد bowl ⇒ درصد Zone */
export function chipToZone(cx: number, cy: number): { x: number; y: number } {
  return {
    x: BOWL_MORTAR.left + (cx / 100) * BOWL_MORTAR.width,
    y: BOWL_MORTAR.top + (cy / 100) * BOWL_MORTAR.height,
  };
}

/** مرکز تکه باید آن‌قدر داخل بیضی باشد که کل اندازه‌اش در دهانه بماند. */
function containPoint(x: number, y: number, radX: number, radY: number): { x: number; y: number } {
  const cx = 50;
  const cy = 76;
  const rx = Math.max(8, 42 - radX);
  const ry = Math.max(8, 32 - radY);
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  const d2 = dx * dx + dy * dy;
  if (d2 <= 1) return { x, y };
  const d = Math.sqrt(d2);
  return { x: cx + (dx / d) * rx * 0.96, y: cy + (dy / d) * ry * 0.96 };
}

function containChip(chip: Pick<MortarChip, 'x' | 'y' | 'w' | 'h'>): { x: number; y: number } {
  return containPoint(chip.x, chip.y, chip.w * 0.5, chip.h * 0.5);
}

export function chipInsideBowl(chip: Pick<MortarChip, 'x' | 'y' | 'w' | 'h'>): boolean {
  const pos = containChip(chip);
  return Math.abs(pos.x - chip.x) < 0.08 && Math.abs(pos.y - chip.y) < 0.08;
}

/* ------------------------------ اندازه‌ی تکه‌ها ------------------------------ */

/** بلندترین ضلع یک تکه‌ی خام روی صفحه (پیکسل صحنه) */
const NATURAL_PX: Record<PieceKind, number> = {
  flower: 44,
  thread: 54,
  leaf: 48,
  root: 44,
  seed: 40,
  star: 48,
  petal: 42,
  dust: 10,
};

export function spriteCount(kind: PieceKind): number {
  if (kind === 'dust') return 0;
  return MORTAR_V3.pieces[kind].count;
}

function spriteAspect(kind: PieceKind, sprite: number): number {
  if (kind === 'dust') return 1;
  const aspects = MORTAR_V3.pieces[kind].aspects as readonly number[];
  return aspects[sprite] ?? 1;
}

/** اندازهٔ تکهٔ خام در درصد bowl، با نسبت واقعی اسپرایت */
function coarseSize(kind: PieceKind, seed: number, scaleMul = 1): { w: number; h: number; sprite: number } {
  const count = Math.max(1, spriteCount(kind));
  const sprite = Math.floor(rand(seed + 9) * count) % count;
  const aspect = spriteAspect(kind, sprite);
  const longest = NATURAL_PX[kind] * (0.88 + rand(seed) * 0.24) * scaleMul;
  const wpx = aspect >= 1 ? longest : longest * aspect;
  const hpx = aspect >= 1 ? longest / aspect : longest;
  return { w: (wpx / BOWL_PX.w) * 100, h: (hpx / BOWL_PX.h) * 100, sprite };
}

function spawnCount(units: number, seed: number): number {
  const extra = Math.round(rand(seed) * units);
  return 3 * units + extra;
}

function spawn(units: number, kind: PieceKind, scaleMul = 1): MortarChip[] {
  const count = spawnCount(units, units * 17 + kind.length);
  const next: MortarChip[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand(i + 3) * 0.4;
    const spread = 0.35 + rand(i + 11) * 0.55;
    const size = coarseSize(kind, i + 5, scaleMul);
    const raw = {
      x: 50 + Math.cos(angle) * (10 + 16 * spread),
      y: 74 + Math.sin(angle) * (5 + 7 * spread),
    };
    const pos = containPoint(raw.x, raw.y, size.w * 0.5, size.h * 0.5);
    next.push({
      id: seq++,
      x: pos.x,
      y: pos.y,
      w: size.w,
      h: size.h,
      rot: kind === 'thread' ? rand(i + 2) * 140 - 70 : rand(i + 2) * 50 - 25,
      crush: 0,
      delay: i * 0.03,
      nick: -1,
      seed: i + 1,
      kind,
      sprite: size.sprite,
      generation: 0,
      vx: 0,
      vy: 0,
      hop: 0,
    });
  }
  pileArea = chipArea(next);
  fresh = 1;
  return next;
}

function splitPiece(
  src: MortarChip,
  impactX: number,
  impactY: number,
  live: boolean,
  work: number,
): [MortarChip, MortarChip] {
  const generation = src.generation + 1;
  const span = Math.max(src.w, src.h);
  const powdered = span * 0.74 <= Math.max(22, sizeLimit(work)) && work >= WORK_CRUSHED;
  const scale = powdered ? 0.78 : 0.74;
  const kind: PieceKind = powdered ? 'dust' : src.kind;
  const dx = src.x - impactX;
  const dy = src.y - impactY;
  const len = Math.max(0.001, Math.hypot(dx, dy));
  const nx = dx / len;
  const ny = dy / len;
  const fly = live ? Math.max(3.2, Math.min(src.w, src.h) * 0.22) : Math.max(1.6, Math.min(src.w, src.h) * 0.1);
  const make = (sign: number, reuseId?: number): MortarChip => {
    const wobble = 0.82 + rand(seq + sign + 3) * 0.22;
    const width = Math.max(8, src.w * scale * wobble);
    const height = Math.max(8, src.h * scale * wobble);
    const raw = {
      x: src.x + nx * fly * sign + (rand(seq) - 0.5) * 2,
      y: src.y + ny * fly * sign * 0.7 + (rand(seq + 4) - 0.5) * 1.6,
      w: width,
      h: height,
    };
    const pos = containChip(raw);
    const speed = live ? 1.6 + rand(seq + 8) * 0.8 : 0;
    return {
      id: reuseId ?? seq++,
      x: pos.x,
      y: pos.y,
      w: width,
      h: height,
      rot: powdered ? 0 : src.rot + sign * (18 + rand(seq + 1) * 28),
      crush: Math.min(1, generation / 3),
      delay: 0,
      nick: Math.floor(rand(seq + 6) * 4),
      seed: reuseId ?? seq,
      kind,
      sprite: src.sprite,
      generation,
      vx: live ? nx * speed * sign : 0,
      vy: live ? ny * speed * sign * 0.65 : 0,
      hop: live ? 0.6 : 0,
      color: src.color,
      ingredientId: src.ingredientId,
    };
  };
  return [make(-1, src.id), make(1)];
}

/* ------------------------------ موقعیت سر ------------------------------ */

/** سطح تپه زیر سر (درصد بلندی Zone) — واحد بیشتر کمی بالاتر */
function pileSurfaceY(): number {
  return FLOOR.cy - 1.2 - (pileUnits - 1) * 0.9 + pileCrush * 0.6;
}

/** نقطهٔ تماس سر با تپه روی مدار (درصد Zone) */
function contactOnPile(angle: number): { x: number; y: number } {
  return {
    x: FLOOR.cx + Math.cos(angle) * FLOOR.rx * ORBIT_K,
    y: pileSurfaceY() + Math.sin(angle) * FLOOR.ry * ORBIT_K,
  };
}

/** نقطهٔ برخورد در فضای bowl برای یک زاویهٔ مدار */
function impactAt(angle: number): { x: number; y: number } {
  const c = contactOnPile(angle);
  return zoneToChip(c.x, c.y);
}

/** شعاع سر کوبه روی صفحه (پیکسل صحنه) */
const HEAD_R_PX = (HEAD_R.x / 100) * SCENE_ZONES.mortar.width;

/** آیا مرکز تکه زیر سر کوبه است؟ (فاصله در پیکسل، چون درصدهای bowl هم‌مقیاس نیستند) */
function underHead(chip: Pick<MortarChip, 'x' | 'y'>, impact: { x: number; y: number }, k: number): boolean {
  const dx = ((chip.x - impact.x) / 100) * BOWL_PX.w;
  const dy = ((chip.y - impact.y) / 100) * BOWL_PX.h;
  const r = HEAD_R_PX * k;
  return dx * dx + dy * dy <= r * r;
}

/** هر تکه‌ای که زیر سر کوبه است خرد می‌شود، نه فقط نزدیک‌ترین یکی. */
function strikeAt(list: MortarChip[], impact: { x: number; y: number }, live: boolean, work: number): MortarChip[] {
  if (list.length === 0) return list;
  const limit = sizeLimit(work);
  const hits: number[] = [];
  list.forEach((chip, index) => {
    if (chip.kind === 'dust' || Math.max(chip.w, chip.h) <= limit * 1.04) return;
    if (underHead(chip, impact, 1.45)) hits.push(index);
  });
  if (hits.length === 0) {
    if (!live) return list;
    return nudgeNear(list, impact);
  }
  fresh = Math.min(1.16, fresh + 0.05 * hits.length);
  const hit = new Set(hits);
  const crowded = list.length + hits.length > 48;
  const next: MortarChip[] = [];
  list.forEach((chip, index) => {
    if (!hit.has(index)) {
      next.push(chip);
      return;
    }
    if (crowded) {
      const [shrunk] = splitPiece(chip, impact.x, impact.y, false, work);
      next.push({ ...shrunk, id: chip.id, vx: 0, vy: 0, hop: live ? 0.5 : 0 });
      return;
    }
    const [left, right] = splitPiece(chip, impact.x, impact.y, live, work);
    next.push(left, right);
  });
  return next;
}

function nudgeNear(list: MortarChip[], impact: { x: number; y: number }): MortarChip[] {
  let best = 0;
  let bestDist = Infinity;
  list.forEach((chip, index) => {
    const dist = (chip.x - impact.x) ** 2 + (chip.y - impact.y) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = index;
    }
  });
  return list.map((chip, index) => {
    if (index !== best) return chip;
    const awayX = chip.x - impact.x;
    const awayY = chip.y - impact.y;
    const dist = Math.max(0.001, Math.hypot(awayX, awayY));
    const nudged = containChip({
      x: chip.x + (awayX / dist) * 1.4,
      y: chip.y + (awayY / dist) * 1.1,
      w: chip.w,
      h: chip.h,
    });
    return { ...chip, x: nudged.x, y: nudged.y, vx: (awayX / dist) * 0.35, vy: (awayY / dist) * 0.25, hop: 0.4 };
  });
}

/** تکه‌های زیر سر (بدون شکستن) می‌پرند و کمی کنار می‌روند */
function jolt(list: MortarChip[], impact: { x: number; y: number }): { list: MortarChip[]; hits: MortarChip[] } {
  const hits: MortarChip[] = [];
  const next = list.map((chip) => {
    if (!underHead(chip, impact, 1.6)) return chip;
    hits.push(chip);
    const dx = chip.x - impact.x;
    const dy = chip.y - impact.y;
    const d = Math.max(0.001, Math.hypot(dx, dy));
    const push = chip.kind === 'dust' ? 0.5 : 0.9;
    return {
      ...chip,
      vx: chip.vx + (dx / d) * push,
      vy: chip.vy + (dy / d) * push * 0.6,
      hop: Math.max(chip.hop, chip.kind === 'dust' ? 0.35 : 0.8),
    };
  });
  return { list: next, hits };
}

function refreshCrush(list: MortarChip[]): void {
  pileCrush = list.length === 0 ? 0 : list.reduce((sum, chip) => sum + chip.crush, 0) / list.length;
}

/* ------------------------------ چرخهٔ ضربه ------------------------------ */

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * خیز/فشار برای فاز ۰..۱ ضربه.
 * lift: ۰..۱ ارتفاع سر بالای تپه. impact: ۰..۱ فشار روی مواد.
 */
export function strikeProfile(phase: number): { lift: number; impact: number; twist: number } {
  const t = ((phase % 1) + 1) % 1;
  if (t < PH_LIFT_END) {
    const u = t / PH_LIFT_END;
    // خیز آرام: زود بالا می‌رود و بالا کمی مکث می‌کند (anticipation)
    return { lift: easeOut(u), impact: 0, twist: 0 };
  }
  if (t < PH_FALL_END) {
    const u = (t - PH_LIFT_END) / (PH_FALL_END - PH_LIFT_END);
    // سقوط سریع
    return { lift: 1 - easeIn(u), impact: u > 0.85 ? (u - 0.85) / 0.15 : 0, twist: 0 };
  }
  if (t < PH_PRESS_END) {
    const u = (t - PH_FALL_END) / (PH_PRESS_END - PH_FALL_END);
    // فشار و پیچش سایشی
    return { lift: 0, impact: 1 - 0.25 * u, twist: Math.sin(u * Math.PI * 2) * 6 };
  }
  const u = (t - PH_PRESS_END) / (1 - PH_PRESS_END);
  // رهاسازی
  return { lift: 0, impact: (1 - easeInOut(u)) * 0.75, twist: 0 };
}

/** وزن سرعت مدار در هر فاز: در خیز جلو می‌رود، در فشار کمی می‌ساید */
function orbitWeight(phase: number): number {
  const t = ((phase % 1) + 1) % 1;
  if (t < PH_FALL_END) return 1.5;
  if (t < PH_PRESS_END) return 0.25;
  return 0.6;
}

/** فریم با نزدیک‌ترین زاویهٔ محور، با هیسترزیس تا در مرز پرپر نزند */
function pickFrame(theta: number, current: number, candidates: readonly number[]): number {
  let best = candidates[0];
  let bestDist = Infinity;
  for (const f of candidates) {
    const d = Math.abs(theta - FRAME_AXES[f - 1]);
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
  }
  if (candidates.includes(current)) {
    const curDist = Math.abs(theta - FRAME_AXES[current - 1]);
    if (curDist - bestDist < 3) return current;
  }
  return best;
}

const GRIND_FRAMES = [1, 2, 3, 4, 5] as const;

/** هاون خالی: کوبه با دستهٔ بلند به دیوارهٔ دور تکیه داده، سر روی کف. */
function leanAim(): PestleAim {
  const frame = 2;
  const theta = -66;
  return {
    mode: 'lean',
    orbit: -Math.PI / 2,
    down: false,
    headX: FLOOR.cx + 2,
    headY: FLOOR.cy + FLOOR.ry * 0.25 - HEAD_R.y * 0.55,
    rotate: clampRot(theta - FRAME_AXES[frame - 1]),
    frame,
    impact: 0,
    lift: 0,
  };
}

function clampRot(v: number): number {
  return Math.max(-22, Math.min(22, v));
}

function computeAim(): PestleAim {
  if (mode === 'lean') return leanAim();
  if (mode === 'rest') {
    // خوابیده روی تپه، تکیه به لبهٔ راست
    const frame = 6;
    const theta = -24;
    return {
      mode,
      orbit,
      down: false,
      headX: FLOOR.cx - FLOOR.rx * 0.18,
      headY: pileSurfaceY() - HEAD_R.y * 0.7,
      rotate: clampRot(theta - FRAME_AXES[frame - 1]),
      frame,
      impact: 0,
      lift: 0,
    };
  }
  const prof = strikeProfile(beat);
  const contact = contactOnPile(orbit);
  // دستهٔ کوبه مقابل جای سر می‌خوابد (دست بالای هاون ثابت است)؛ در برخورد عمودی‌تر
  const thetaOrbit = -84 + 30 * Math.cos(orbit);
  const upright = prof.impact * 0.6;
  const theta = thetaOrbit * (1 - upright) + -84 * upright + prof.lift * 4 * Math.sign(Math.cos(orbit) || 1) + prof.twist;
  const frame = pickFrame(theta, lastFrame, GRIND_FRAMES);
  lastFrame = frame;
  const sink = HEAD_R.y * (0.55 + prof.impact * 0.25);
  return {
    mode,
    orbit,
    down: prof.impact > 0.5,
    headX: contact.x,
    headY: contact.y - sink - prof.lift * LIFT_H,
    rotate: clampRot(theta - FRAME_AXES[frame - 1]),
    frame,
    impact: prof.impact,
    lift: prof.lift,
  };
}

function applyAim(): void {
  const next = computeAim();
  const changed =
    next.mode !== aim.mode ||
    next.frame !== aim.frame ||
    Math.abs(next.headX - aim.headX) > 0.04 ||
    Math.abs(next.headY - aim.headY) > 0.04 ||
    Math.abs(next.rotate - aim.rotate) > 0.2 ||
    Math.abs(next.impact - aim.impact) > 0.05 ||
    next.down !== aim.down;
  aim = next;
  if (changed) emitAim();
}

/** لحظهٔ برخورد: شکستن معوق، پرش تکه‌ها، رویداد برای صدا/ذرات */
function strikeNow(): void {
  const contact = contactOnPile(orbit);
  const impact = zoneToChip(contact.x, contact.y);
  let hitColors: string[] = [];
  let hits = 0;
  if (chips.length > 0) {
    applyPendingBlows(impact);
    const jolted = jolt(chips, impact);
    chips = jolted.list;
    hits = jolted.hits.length;
    hitColors = jolted.hits.map((chip) => chip.color).filter((c): c is string => Boolean(c));
    refreshCrush(chips);
    emitChips();
    requestSettle();
  }
  const event: StrikeEvent = {
    x: contact.x,
    y: contact.y,
    hits,
    fineness: Math.min(1, pileWork / WORK_FINE),
    colors: hitColors,
  };
  for (const listener of strikeListeners) listener(event);
}

/** شکستن‌های منتظر (کار store) را در نقطهٔ برخورد اعمال می‌کند */
function applyPendingBlows(impact: { x: number; y: number }): boolean {
  let changed = false;
  for (const group of mixGroups) {
    const gain = group.target - group.applied;
    if (gain < 0.05) continue;
    changed = true;
    pileArea = group.area;
    const blows = Math.min(2, Math.max(1, Math.round(gain / 0.08)));
    let next = group.chips;
    for (let i = 0; i < blows; i++) {
      const at = i === 0 ? impact : impactAt(orbit + 0.55 * i);
      next = strikeAt(next, at, true, group.target);
    }
    group.chips = holdVolume(finishDust(next, group.target), group.target).map((chip) => ({
      ...chip,
      color: group.color,
      ingredientId: group.id,
    }));
    group.applied = group.target;
  }
  if (changed) {
    chips = mixGroups.flatMap((group) => group.chips);
  }
  return changed;
}

function tickPile(dt: number): boolean {
  if (chips.length === 0) return false;
  let moving = false;
  const decay = Math.max(0, 1 - dt * 9);
  const next = chips.map((chip) => {
    const hop = chip.hop > 0.01 ? chip.hop * decay : 0;
    if (hop !== chip.hop) moving = true;
    if (Math.abs(chip.vx) < 0.2 && Math.abs(chip.vy) < 0.2) {
      if (chip.vx === 0 && chip.vy === 0) return hop === chip.hop ? chip : { ...chip, hop };
      moving = true;
      return { ...chip, vx: 0, vy: 0, hop };
    }
    moving = true;
    const x = chip.x + chip.vx * dt * 28;
    const y = chip.y + chip.vy * dt * 28;
    const pos = containChip({ ...chip, x, y });
    let vx = chip.vx * 0.62;
    let vy = chip.vy * 0.62;
    if (Math.abs(pos.x - x) > 0.15 || Math.abs(pos.y - y) > 0.15) {
      vx *= -0.25;
      vy *= -0.25;
    }
    return { ...chip, x: pos.x, y: pos.y, vx, vy, hop, rot: chip.kind === 'dust' ? 0 : chip.rot + vx * 4 };
  });
  if (!moving) return false;
  chips = next;
  emitChips();
  return true;
}

function requestSettle(): void {
  if (mode === 'grind' || settleRaf) return;
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return;
  let last = performance.now();
  const step = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (tickPile(dt)) {
      settleRaf = window.requestAnimationFrame(step);
      return;
    }
    settleRaf = 0;
  };
  settleRaf = window.requestAnimationFrame(step);
}

export function setPestleMode(next: PestleMode): void {
  if (mode === next && next !== 'grind') {
    applyAim();
    return;
  }
  if (next === 'grind' && mode !== 'grind') {
    orbit = -Math.PI / 2;
    // شروع از خیز تا اولین ضربه با فاصلهٔ کوتاه بیاید
    beat = 0.18;
  }
  if (mode === 'grind' && next !== 'grind') {
    // کوبش تمام شد: شکستن‌های مانده همین حالا
    if (applyPendingBlows(impactAt(orbit))) {
      refreshCrush(chips);
      emitChips();
    }
  }
  mode = next;
  applyAim();
}

export function tickMortarVisuals(dt: number): void {
  if (mode === 'grind') {
    const before = beat;
    beat += dt * BEAT_HZ;
    orbit += dt * ORBIT_SPEED * orbitWeight(before);
    if (orbit > Math.PI * 12) orbit -= Math.PI * 12;
    // عبور از مرز سقوط ⇒ برخورد (حتی اگر در یک فریم چند مرز رد شود، یکی کافی است)
    const crossed = Math.floor(beat - PH_FALL_END) > Math.floor(before - PH_FALL_END);
    if (beat >= 1) beat -= Math.floor(beat);
    if (crossed) strikeNow();
  }
  applyAim();
  tickPile(dt);
}

export function syncMortarPile(key: string | null, units: 1 | 2 | 3, grindWork: number): void {
  if (!key) {
    mixKey = '';
    mixGroups = [];
    if (snapshotKey === '' && chips.length === 0 && mode === 'lean') return;
    snapshotKey = '';
    chips = [];
    appliedWork = 0;
    pileCrush = 0;
    pileWork = 0;
    pileArea = 0;
    fresh = 1;
    pileUnits = 1;
    mode = 'lean';
    orbit = -Math.PI / 2;
    aim = leanAim();
    emitChips();
    emitAim();
    return;
  }
  const kind = kindForIngredient(key.split(':')[0] ?? '');
  if (key !== snapshotKey) {
    snapshotKey = key;
    pileUnits = units;
    orbit = -Math.PI / 2;
    let next = spawn(units, kind);
    const rehearsal = Math.min(64, Math.max(8, Math.ceil(grindWork / 0.05)));
    for (let i = 0; i < rehearsal; i++) {
      const work = ((i + 1) / rehearsal) * grindWork;
      orbit += 0.85;
      next = holdVolume(strikeAt(next, impactAt(orbit), false, work), work);
    }
    chips = holdVolume(finishDust(next, grindWork), grindWork);
    pileWork = grindWork;
    refreshCrush(chips);
    appliedWork = grindWork;
    emitChips();
    applyAim();
    return;
  }
  pileUnits = units;
  pileWork = grindWork;
  const gain = grindWork - appliedWork;
  if (gain < 0.05) {
    refreshCrush(chips);
    applyAim();
    return;
  }
  const blows = Math.min(2, Math.max(1, Math.round(gain / 0.08)));
  let next = chips;
  for (let i = 0; i < blows; i++) {
    if (i > 0) orbit += 0.55;
    next = strikeAt(next, impactAt(orbit), true, grindWork);
  }
  chips = holdVolume(finishDust(next, grindWork), grindWork);
  refreshCrush(chips);
  appliedWork = grindWork;
  emitChips();
  applyAim();
  requestSettle();
}

export type MixPortion = {
  ingredientId: string;
  quantity: number;
  /** کار مطلق؛ درجه‌ی دیداری از کار تقسیم بر تعداد واحد است. */
  grindWork: number;
  color: string;
};

function bakePortion(portion: MixPortion, scaleMul: number) {
  const kind = kindForIngredient(portion.ingredientId);
  const norm = portion.quantity > 0 ? portion.grindWork / portion.quantity : 0;
  let next = spawn(portion.quantity, kind, scaleMul);
  const area = pileArea;
  const rehearsal = Math.min(64, Math.max(8, Math.ceil(norm / 0.05)));
  for (let i = 0; i < rehearsal; i++) {
    const work = ((i + 1) / rehearsal) * norm;
    orbit += 0.85;
    next = holdVolume(strikeAt(next, impactAt(orbit), false, work), work);
  }
  const baked = holdVolume(finishDust(next, norm), norm).map((chip) => ({
    ...chip,
    color: portion.color,
    ingredientId: portion.ingredientId,
  }));
  return { id: portion.ingredientId, applied: norm, target: norm, color: portion.color, chips: baked, area };
}

function focusNorm(portions: MixPortion[]): number {
  const pending = portions.filter((portion) => portion.grindWork < WORK_FINE * portion.quantity - 0.02);
  const list = pending.length > 0 ? pending : portions;
  return Math.min(...list.map((portion) => portion.grindWork / Math.max(1, portion.quantity)));
}

/** تپه‌ی قاطی کلاسیک: هر ماده شکل و رنگ و درجه‌ی کوبش خودش را دارد. */
export function syncMortarMix(key: string | null, portions: MixPortion[]): void {
  if (!key || portions.length === 0) {
    mixKey = '';
    mixGroups = [];
    syncMortarPile(null, 1, 0);
    return;
  }
  const total = portions.reduce((sum, portion) => sum + portion.quantity, 0);
  const scaleMul = Math.pow(Math.max(1, total), -0.35);
  const grindDropped = portions.some((portion) => {
    const group = mixGroups.find((item) => item.id === portion.ingredientId);
    if (!group) return false;
    return portion.grindWork / portion.quantity < group.applied - 0.05;
  });
  if (key !== mixKey || grindDropped || portions.length !== mixGroups.length) {
    mixKey = key;
    snapshotKey = key;
    pileUnits = Math.min(3, Math.max(1, Math.round(total))) as 1 | 2 | 3;
    mixGroups = portions.map((portion) => bakePortion(portion, scaleMul));
    chips = mixGroups.flatMap((group) => group.chips);
    pileWork = focusNorm(portions);
    refreshCrush(chips);
    // مادهٔ تازه روی رد پودر قبلی می‌نشیند
    clearResidue();
    emitChips();
    applyAim();
    return;
  }
  let pending = false;
  for (const portion of portions) {
    const group = mixGroups.find((item) => item.id === portion.ingredientId);
    if (!group) continue;
    group.color = portion.color;
    const norm = portion.grindWork / portion.quantity;
    if (norm - group.applied >= 0.05) {
      group.target = norm;
      pending = true;
    }
  }
  pileWork = focusNorm(portions);
  if (!pending) {
    refreshCrush(chips);
    applyAim();
    return;
  }
  // در حال کوبش: شکستن تا برخورد بعدی صبر می‌کند (مگر خیلی عقب بمانیم)
  // (کار store ≈ ۱٫۰۳/ث برای یک واحد و ضربه‌ها ≈ ۱٫۹/ث ⇒ هر ضربه ≈ ۰٫۵۵ کار)
  const behind = Math.max(...mixGroups.map((group) => group.target - group.applied));
  if (mode === 'grind' && behind < 0.75) {
    applyAim();
    return;
  }
  if (applyPendingBlows(impactAt(orbit))) {
    pileUnits = Math.min(3, Math.max(1, Math.round(total))) as 1 | 2 | 3;
    refreshCrush(chips);
    emitChips();
    applyAim();
    requestSettle();
  }
}

export function chipClip(nick: number): string {
  switch (nick) {
    case 0:
      return 'polygon(34% 6%, 100% 0, 96% 100%, 0 92%, 0 38%)';
    case 1:
      return 'polygon(0 0, 68% 4%, 100% 36%, 100% 100%, 6% 96%)';
    case 2:
      return 'polygon(4% 0, 100% 8%, 100% 64%, 70% 100%, 0 100%)';
    case 3:
      return 'polygon(0 0, 100% 0, 96% 100%, 36% 100%, 0 62%)';
    default:
      return 'polygon(14% 0, 86% 4%, 100% 22%, 92% 100%, 8% 94%, 0 28%)';
  }
}

/** ارتفاع سردسته در مختصات Zone (کوچک‌تر = بالاتر روی صفحه). */
export function handleTipY(pose: PestleAim = aim): number {
  const frame = PESTLE_FRAMES[pose.frame - 1] ?? PESTLE_FRAMES[0];
  const dx = (frame.knob.x - PESTLE_HEAD_ANCHOR.x) * PESTLE_BOX.width;
  const dy = (frame.knob.y - PESTLE_HEAD_ANCHOR.y) * PESTLE_BOX.height;
  const rad = (pose.rotate * Math.PI) / 180;
  const y = dx * Math.sin(rad) + dy * Math.cos(rad);
  return pose.headY + y;
}

/**
 * نیمه‌ی دورِ هاون که به بیننده نزدیک است جلوی مواد است؛
 * نیمه‌ی دور که ته کاسه است پشت مواد. بعد از کوبش (سکون) همیشه جلو.
 */
export function pestleInFront(pose: PestleAim): boolean {
  if (pose.mode === 'rest') return true;
  if (pose.mode !== 'grind') return false;
  return Math.sin(pose.orbit) >= 0;
}

/** transform جعبهٔ کوبه: لنگر سر از «خانه» (مرکز کف) به headX/headY، بعد چرخش باقی‌مانده */
export function pestleTransform(pose: PestleAim): string {
  const dx = pose.headX - FLOOR.cx;
  const dy = pose.headY - FLOOR.cy;
  const x = (dx / PESTLE_BOX.width) * 100;
  const y = (dy / PESTLE_BOX.height) * 100;
  return `translate(${x.toFixed(2)}%, ${y.toFixed(2)}%) rotate(${pose.rotate.toFixed(1)}deg)`;
}
