import { useSyncExternalStore } from 'react';
import { SCENE_ZONES } from './artManifest';

export type PieceKind = 'flower' | 'thread' | 'leaf' | 'petal' | 'star' | 'seed' | 'root' | 'dust';

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
  generation: number;
  vx: number;
  vy: number;
  /** رنگ ماده‌ی خودش؛ خالی یعنی رنگ هاون. */
  color?: string;
  ingredientId?: string;
};

export type PestleMode = 'lean' | 'rest' | 'grind';

export type PestleAim = {
  mode: PestleMode;
  orbit: number;
  down: boolean;
  headX: number;
  headY: number;
  rotate: number;
};

/**
 * کفِ بریده‌شدهٔ داخل هاون — هم‌تراز `.cst-bowl`.
 * خیلی پایین‌تر از دهانه؛ مواد روی همین بیضی می‌نشینند.
 */
export const BOWL_MORTAR = { left: 18, top: 50, width: 64, height: 26 };
/** پودر نرم حداکثر همین اندازه روی صفحه است. */
export const DUST_PIXEL = 1;

/** جعبهٔ کوبه نسبت به Zone هاون — همان `PROPS.pestle`. */
const PESTLE_BOX = { left: 26.875, top: -37.33, width: 63.75, height: 76.67 };
/** سر و سردسته روی pestle_1 (object-fit contain). */
const HEAD_ORIGIN = { x: 0.28, y: 0.726 };
const KNOB_ORIGIN = { x: 0.808, y: 0.188 };

/** آستانه‌های کوبش — همان اعداد store، بدون وابستگی چرخشی. */
const WORK_COARSE = 1;
const WORK_CRUSHED = 2.2;
const WORK_FINE = 3.6;

const chipListeners = new Set<() => void>();
const aimListeners = new Set<() => void>();

let chips: MortarChip[] = [];
let pileUnits: 1 | 2 | 3 = 1;
let snapshotKey = '';
let mixKey = '';
let mixGroups: { id: string; applied: number; chips: MortarChip[]; area: number }[] = [];
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
let aim: PestleAim = leanAim();
let settleRaf = 0;

const ORBIT_SPEED = 3.8;
const POUNDS_PER_TURN = 3;
const HOME_HEAD = {
  x: PESTLE_BOX.left + HEAD_ORIGIN.x * PESTLE_BOX.width,
  y: PESTLE_BOX.top + HEAD_ORIGIN.y * PESTLE_BOX.height,
};

function emitChips(): void {
  for (const listener of chipListeners) listener();
}

function emitAim(): void {
  for (const listener of aimListeners) listener();
}

/** هاون خالی: سر داخل دهانه، دسته عمودی‌تر و بالاتر از وقتی مواد هست. */
function leanAim(): PestleAim {
  return { mode: 'lean', orbit: -Math.PI / 2, down: false, headX: 50, headY: 21.2, rotate: -46 };
}

export function subscribeMortarPile(listener: () => void): () => void {
  chipListeners.add(listener);
  return () => {
    chipListeners.delete(listener);
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

/** بزرگ‌ترین ضلع مجاز. ریز شدن تا گردِ قابل‌دیدن است، نه تا محو شدن. */
function sizeLimit(work: number): number {
  const t = Math.min(1, Math.max(0, work / WORK_FINE));
  const start = 96;
  const end = 18;
  return start * Math.pow(end / start, t);
}

export function kindForIngredient(id: string): PieceKind {
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
  const zone = SCENE_ZONES.mortar;
  const at = mortarToChip(
    ((sceneX - zone.x) / zone.width) * 100,
    ((sceneY - zone.y) / zone.height) * 100,
  );
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
  emitChips();
  return taken;
}

/** هرچه بعد از چرخش قاشق مانده را هم برمی‌دارد. */
export function scoopRest(): MortarChip[] {
  if (chips.length === 0) return [];
  const taken = chips;
  chips = [];
  emitChips();
  return taken;
}

function mortarToChip(mx: number, my: number): { x: number; y: number } {
  return {
    x: ((mx - BOWL_MORTAR.left) / BOWL_MORTAR.width) * 100,
    y: ((my - BOWL_MORTAR.top) / BOWL_MORTAR.height) * 100,
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

function coarseSize(kind: PieceKind, seed: number, scaleMul = 1): { w: number; h: number } {
  const n = rand(seed);
  const m = rand(seed + 2);
  // دهانه در صفحه پهن و کوتاه است؛ درصد ارتفاع باید بزرگ‌تر باشد تا شکل دیده شود.
  const scale = 1.35 * scaleMul;
  if (kind === 'thread') return { w: (14 + n * 4) * scale, h: (58 + m * 10) * scale };
  if (kind === 'leaf') return { w: (30 + n * 8) * scale, h: (50 + m * 12) * scale };
  if (kind === 'root') return { w: (36 + n * 8) * scale, h: (40 + m * 10) * scale };
  if (kind === 'seed') return { w: (24 + n * 6) * scale, h: (36 + m * 8) * scale };
  if (kind === 'star') return { w: (32 + n * 8) * scale, h: (48 + m * 10) * scale };
  if (kind === 'flower') return { w: (34 + n * 8) * scale, h: (52 + m * 10) * scale };
  return { w: (30 + n * 8) * scale, h: (46 + m * 10) * scale };
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
      generation: 0,
      vx: 0,
      vy: 0,
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
      generation,
      vx: live ? nx * speed * sign : 0,
      vy: live ? ny * speed * sign * 0.65 : 0,
      color: src.color,
      ingredientId: src.ingredientId,
    };
  };
  return [make(-1, src.id), make(1)];
}

function impactFromHead(headX: number, headY: number): { x: number; y: number } {
  return mortarToChip(headX, headY);
}

function headOnPile(angle: number, upright = 0): { x: number; y: number } {
  const pileY = pileSurfaceY();
  const rx = 16 - upright * 6;
  const ry = 2.6 - upright * 1.4;
  return {
    x: 50 + Math.cos(angle) * rx,
    y: pileY + Math.sin(angle) * ry,
  };
}

/** هر تکه‌ای که زیر سر کوبه است خرد می‌شود، نه فقط نزدیک‌ترین یکی. */
function strikeAt(list: MortarChip[], angle: number, live: boolean, work: number): MortarChip[] {
  if (list.length === 0) return list;
  const upright = levelSwitch(work);
  const head = headOnPile(angle, upright);
  const impact = impactFromHead(head.x, head.y);
  const limit = sizeLimit(work);
  const hits: number[] = [];
  list.forEach((chip, index) => {
    if (chip.kind === 'dust' || Math.max(chip.w, chip.h) <= limit * 1.04) return;
    const dist = (chip.x - impact.x) ** 2 + ((chip.y - impact.y) * 1.1) ** 2;
    if (dist <= 2200) hits.push(index);
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
      next.push({ ...shrunk, id: chip.id, vx: 0, vy: 0 });
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
    return { ...chip, x: nudged.x, y: nudged.y, vx: (awayX / dist) * 0.35, vy: (awayY / dist) * 0.25 };
  });
}

function refreshCrush(list: MortarChip[]): void {
  pileCrush = list.length === 0 ? 0 : list.reduce((sum, chip) => sum + chip.crush, 0) / list.length;
}

/** سطح تپه روی کفِ پایینِ هاون. واحد بیشتر کمی بالا می‌آید. */
function pileSurfaceY(): number {
  return 69 - (pileUnits - 1) * 0.35 + pileCrush * 0.3;
}

/**
 * در هر مرحلهٔ خرد شدن یک‌بار بین حالت گرد و عمودی جابه‌جا می‌شود.
 * پنجرهٔ جابه‌جایی کوتاه است تا تغییر تند باشد. خروجی ۰ = گرد، ۱ = عمودی.
 */
function levelSwitch(work: number): number {
  let t: number;
  let uprightFirst = false;
  if (work < WORK_COARSE) t = work / WORK_COARSE;
  else if (work < WORK_CRUSHED) {
    t = (work - WORK_COARSE) / (WORK_CRUSHED - WORK_COARSE);
    uprightFirst = true;
  } else {
    t = Math.min(1, (work - WORK_CRUSHED) / (WORK_FINE - WORK_CRUSHED));
  }
  const edge = 0.045;
  const u = Math.max(0, Math.min(1, (t - (0.5 - edge)) / (edge * 2)));
  const smooth = u * u * (3 - 2 * u);
  return uprightFirst ? 1 - smooth : smooth;
}

/** هر دور کامل سه ضربه: بالا رفتن، فرود سریع روی مواد، مکث کوتاه. */
function poundOffset(angle: number): number {
  const turn = Math.PI * 2;
  const phase = ((angle * POUNDS_PER_TURN) % turn + turn) % turn;
  const t = phase / turn;
  if (t < 0.32) return -Math.sin((t / 0.32) * Math.PI) * 9.5;
  if (t < 0.48) {
    const u = (t - 0.32) / 0.16;
    return (1 - u) * -0.4 + u * 2.2;
  }
  return 0.35;
}

function computeAim(): PestleAim {
  if (mode === 'lean') return leanAim();
  const upright = mode === 'grind' ? levelSwitch(pileWork) : 1;
  const head = headOnPile(orbit, upright);
  if (mode === 'rest') {
    return { mode, orbit, down: false, headX: 50, headY: pileSurfaceY(), rotate: -42 };
  }
  const lift = poundOffset(orbit) * (0.28 + upright * 0.72);
  const rotate = -16 - upright * 28 + Math.cos(orbit) * (7 * (1 - upright) + 2 * upright);
  return {
    mode,
    orbit,
    down: lift > 1.2,
    headX: head.x,
    headY: head.y + lift,
    rotate,
  };
}

function applyAim(): void {
  const next = computeAim();
  const changed =
    next.mode !== aim.mode ||
    Math.abs(next.headX - aim.headX) > 0.04 ||
    Math.abs(next.headY - aim.headY) > 0.04 ||
    Math.abs(next.rotate - aim.rotate) > 0.2 ||
    next.down !== aim.down;
  aim = next;
  if (changed) emitAim();
}

function tickPile(dt: number): boolean {
  if (chips.length === 0) return false;
  let moving = false;
  const next = chips.map((chip) => {
    if (Math.abs(chip.vx) < 0.2 && Math.abs(chip.vy) < 0.2) {
      if (chip.vx === 0 && chip.vy === 0) return chip;
      moving = true;
      return { ...chip, vx: 0, vy: 0 };
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
    return { ...chip, x: pos.x, y: pos.y, vx, vy, rot: chip.rot + vx * 4 };
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
  if (next === 'grind' && mode !== 'grind') orbit = -Math.PI / 2;
  mode = next;
  applyAim();
}

export function tickMortarVisuals(dt: number): void {
  if (mode === 'grind') {
    orbit += dt * ORBIT_SPEED;
    if (orbit > Math.PI * 12) orbit -= Math.PI * 12;
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
      next = holdVolume(strikeAt(next, orbit, false, work), work);
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
    next = strikeAt(next, orbit, true, grindWork);
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
    next = holdVolume(strikeAt(next, orbit, false, work), work);
  }
  const baked = holdVolume(finishDust(next, norm), norm).map((chip) => ({
    ...chip,
    color: portion.color,
    ingredientId: portion.ingredientId,
  }));
  return { id: portion.ingredientId, applied: norm, chips: baked, area };
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
    emitChips();
    applyAim();
    return;
  }
  let changed = false;
  for (const portion of portions) {
    const group = mixGroups.find((item) => item.id === portion.ingredientId);
    if (!group) continue;
    const norm = portion.grindWork / portion.quantity;
    const gain = norm - group.applied;
    if (gain < 0.05) continue;
    changed = true;
    pileArea = group.area;
    const blows = Math.min(2, Math.max(1, Math.round(gain / 0.08)));
    let next = group.chips;
    for (let i = 0; i < blows; i++) {
      if (i > 0) orbit += 0.55;
      next = strikeAt(next, orbit, true, norm);
    }
    group.chips = holdVolume(finishDust(next, norm), norm).map((chip) => ({
      ...chip,
      color: portion.color,
      ingredientId: portion.ingredientId,
    }));
    group.applied = norm;
  }
  pileWork = focusNorm(portions);
  if (!changed) {
    refreshCrush(chips);
    applyAim();
    return;
  }
  chips = mixGroups.flatMap((group) => group.chips);
  pileUnits = Math.min(3, Math.max(1, Math.round(total))) as 1 | 2 | 3;
  refreshCrush(chips);
  emitChips();
  applyAim();
  requestSettle();
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
  const dx = (KNOB_ORIGIN.x - HEAD_ORIGIN.x) * PESTLE_BOX.width;
  const dy = (KNOB_ORIGIN.y - HEAD_ORIGIN.y) * PESTLE_BOX.height;
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

export function pestleTransform(pose: PestleAim): string {
  const dx = pose.headX - HOME_HEAD.x;
  const dy = pose.headY - HOME_HEAD.y;
  const x = (dx / PESTLE_BOX.width) * 100;
  const y = (dy / PESTLE_BOX.height) * 100;
  return `translate(${x.toFixed(2)}%, ${y.toFixed(2)}%) rotate(${pose.rotate.toFixed(1)}deg)`;
}
