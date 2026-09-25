/**
 * شبیه‌سازی داخل دهانه‌ی پاتیل کلاسیک — خالص، بدون Canvas.
 *
 * گرداب با اینرسی، هُل محلی قاشق، تکه‌های همان هاون، شکوفه‌ی رنگ، تلاطم،
 * جوش سه‌سطحی، بخار معطر و حالت سوخته/رسیده. رندر در ClassicBrewPainter.
 */

import { Rng } from '../../art/flat/kit/rng.ts';
import { WATER } from '../../art/flat/kit/palette.ts';
import {
  hexToRgb,
  lerpRgb,
  rgbToHex,
  saturate,
  scaleRgb,
  tintWhite,
  type RGB,
} from '../../art/flat/kit/color.ts';
import { flatIngredientById } from '../../art/flat/kit/ingredients.ts';
import { burntLiquid } from '../v2/flatCauldronGeometry';
import { BOWL_PX } from '../mortarLayout';
import type { MortarChip, PieceKind } from '../mortarPile';

const STIR_ENTER = 0.4;
const STIR_HOLD = 2.2;
const STIR_EXIT = 0.4;
const STIR_OMEGA = (Math.PI * 2) / 1.2;
const SPOON_R = 0.55;
const SPOON_REACH = 0.32;
const VORTEX_TAU = 2.5;
const SINK_EASE = 3;
const MAX_CHIPS = 60;
const MAX_BLOOMS = 24;
const MAX_STEAM = 40;
const MAX_BUBBLES = 28;
const SPARKLE_LIFE = 0.7;
const SQUASH_STIFFNESS = 120;
const SQUASH_DAMPING = 10;
const TILT_EASE = 6;
const INSIDE = 0.9;

const WATER_RGB = hexToRgb(WATER);

export type BoilTier = 'off' | 'warm' | 'simmer' | 'rolling';

export interface BrewChip {
  id: number;
  ingredientId: string;
  kind: PieceKind;
  sprite: number;
  color: string;
  crush: number;
  generation: number;
  nick: number;
  /** نسبت پهنا به بلندی */
  aspect: number;
  /** بلندترین ضلع، پیکسل صحنه */
  size: number;
  u: number;
  v: number;
  rot: number;
  spin: number;
  depth: number;
  bloomed: number;
  bob: number;
  powder: boolean;
}

export interface InkBloom {
  u: number;
  v: number;
  age: number;
  life: number;
  radius: number;
  grow: number;
  color: string;
}

export interface SurfaceBubble {
  u: number;
  v: number;
  age: number;
  dur: number;
  rim: boolean;
}

export interface SplashDrop {
  u: number;
  v: number;
  vx: number;
  vy: number;
  /** ثانیه‌ی پرواز */
  life: number;
  /** طول خشک شدن بعد از نشستن */
  max: number;
  phase: 'fly' | 'dry';
  dry: number;
  r: number;
}

export interface SteamWisp {
  /** پیکسل نسبت به مرکز دهانه: x افقی، y به بالا منفی است در فضای نرمال دهانه */
  u: number;
  rise: number;
  age: number;
  dur: number;
  size: number;
  phase: number;
  tint: string;
  smoke: boolean;
}

export interface BrewSparkle {
  u: number;
  v: number;
  age: number;
}

export interface FoamWake {
  u: number;
  v: number;
  age: number;
  dur: number;
}

export interface SootSpot {
  u: number;
  v: number;
  r: number;
}

export interface BrewIngredient {
  id: string;
  tint: string;
  strength: number;
  quantity: number;
}

export interface BrewDrop {
  ingredient: BrewIngredient;
  chips: MortarChip[];
}

type SpoonMode = 'none' | 'enter' | 'stir' | 'exit';

function wrap(delta: number): number {
  let d = delta;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easeIn(t: number): number {
  return t * t;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function strengthFor(ingredientId: string): number {
  return flatIngredientById(ingredientId)?.strength ?? 0.75;
}

export function chipPixelSize(chip: Pick<MortarChip, 'w' | 'h'>): { size: number; aspect: number } {
  const w = (chip.w / 100) * BOWL_PX.w;
  const h = (chip.h / 100) * BOWL_PX.h;
  const size = Math.max(6, Math.max(w, h));
  return { size, aspect: h > 0 ? w / h : 1 };
}

export class ClassicBrewSim {
  time = 0;
  chips: BrewChip[] = [];
  blooms: InkBloom[] = [];
  bubbles: SurfaceBubble[] = [];
  drops: SplashDrop[] = [];
  steam: SteamWisp[] = [];
  sparkles: BrewSparkle[] = [];
  foam: FoamWake[] = [];
  spots: SootSpot[] = [];

  omega = 0;
  /** زاویه‌ی انباشته‌ی رگه‌های سطح */
  swirl = 0;
  spoonAngle = -Math.PI / 2;
  spoonOmega = 0;
  sloshX = 0;
  sloshY = 0;
  heat = 0;
  soot = 0;
  dome = 0;
  shiver = 0;
  fireGlow = 0;
  tilt = 0;
  squashX = 1;
  squashY = 1;

  private rng: Rng;
  private seed: number;
  private added = new Map<string, BrewIngredient>();
  private progress = new Map<string, number>();
  private spoonMode: SpoonMode = 'none';
  private spoonT = 0;
  private spoonFollow: number | null = null;
  private done = false;
  private burnt = false;
  private tiltTarget = 0;
  private squashVx = 0;
  private squashVy = 0;
  private bubbleTimer = 0;
  private steamTimer = 0;
  private sparkleTimer = 0;
  private foamTimer = 0;
  private seq = 1;

  constructor(seed = 7) {
    this.seed = seed;
    this.rng = new Rng(seed);
  }

  reset(seed: number = this.seed): void {
    this.seed = seed;
    this.rng = new Rng(seed);
    this.time = 0;
    this.chips = [];
    this.blooms = [];
    this.bubbles = [];
    this.drops = [];
    this.steam = [];
    this.sparkles = [];
    this.foam = [];
    this.spots = [];
    this.omega = 0;
    this.swirl = 0;
    this.spoonAngle = -Math.PI / 2;
    this.spoonOmega = 0;
    this.sloshX = 0;
    this.sloshY = 0;
    this.soot = 0;
    this.dome = 0;
    this.shiver = 0;
    this.tilt = 0;
    this.tiltTarget = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.squashVx = 0;
    this.squashVy = 0;
    this.added.clear();
    this.progress.clear();
    this.spoonMode = 'none';
    this.spoonT = 0;
    this.spoonFollow = null;
    this.done = false;
    this.burnt = false;
    this.bubbleTimer = 0;
    this.steamTimer = 0;
    this.sparkleTimer = 0;
    this.foamTimer = 0;
  }

  /** فرود تکه‌های هاون روی سطح. */
  dropChips(drop: BrewDrop): void {
    const ing = drop.ingredient;
    const prev = this.added.get(ing.id);
    this.added.set(ing.id, {
      id: ing.id,
      tint: ing.tint,
      strength: ing.strength,
      quantity: (prev?.quantity ?? 0) + ing.quantity,
    });
    const list = drop.chips.slice(0, MAX_CHIPS - this.chips.length);
    const n = Math.max(1, list.length);
    list.forEach((chip, i) => {
      const angle = (i / n) * Math.PI * 2 + this.rng.range(-0.25, 0.25);
      const rad = 0.22 + this.rng.range(0, 0.62);
      const { size, aspect } = chipPixelSize(chip);
      const powder = chip.kind === 'dust' || chip.crush >= 0.9;
      this.chips.push({
        id: this.seq++,
        ingredientId: chip.ingredientId ?? ing.id,
        kind: chip.kind,
        sprite: chip.sprite,
        color: chip.color ?? ing.tint,
        crush: chip.crush,
        generation: chip.generation,
        nick: chip.nick,
        aspect,
        size: powder ? Math.max(5, size * 0.55) : size,
        u: Math.cos(angle) * rad,
        v: Math.sin(angle) * rad,
        rot: chip.rot,
        spin: powder ? this.rng.range(-20, 20) : this.rng.range(-40, 40),
        depth: 0,
        bloomed: 0,
        bob: this.rng.range(0, Math.PI * 2),
        powder,
      });
      this.spawnBloom(Math.cos(angle) * rad, Math.sin(angle) * rad, chip.color ?? ing.tint, 0.55);
    });
    this.squashY -= 0.1;
    this.squashX += 0.06;
    this.splash(7, 1);
    if (this.chips.length > MAX_CHIPS) this.chips.splice(0, this.chips.length - MAX_CHIPS);
  }

  stir(): void {
    if (this.spoonMode !== 'none') return;
    this.spoonFollow = null;
    this.spoonMode = 'enter';
    this.spoonT = 0;
    this.spoonAngle = -Math.PI / 2;
  }

  setSpoonFollow(angle: number | null): void {
    if (angle === null) {
      if (this.spoonFollow === null) return;
      this.spoonFollow = null;
      if (this.spoonMode === 'stir') {
        this.spoonMode = 'exit';
        this.spoonT = 0;
      }
      return;
    }
    this.spoonFollow = angle;
    if (this.spoonMode === 'none') {
      this.spoonMode = 'enter';
      this.spoonT = 0;
      this.spoonAngle = angle;
    } else if (this.spoonMode === 'exit') {
      this.spoonMode = 'enter';
      this.spoonT = STIR_ENTER * 0.5;
    }
  }

  setHeatLevel(level: number): void {
    this.heat = clamp(level, 0, 1);
  }

  setIngredientProgress(id: string, progress: number): void {
    this.progress.set(id, clamp(progress, 0, 1));
  }

  setDone(done: boolean): void {
    this.done = done;
  }

  setBurnt(burnt: boolean): void {
    this.burnt = burnt;
    if (burnt) {
      this.sparkles = [];
      this.sparkleTimer = 0;
      if (this.spots.length === 0) {
        for (let i = 0; i < 5; i++) {
          const a = this.rng.range(0, Math.PI * 2);
          const r = this.rng.range(0.15, 0.7);
          this.spots.push({ u: Math.cos(a) * r, v: Math.sin(a) * r, r: this.rng.range(0.08, 0.18) });
        }
      }
    }
  }

  setPourTilt(deg: number): void {
    this.tiltTarget = deg;
  }

  setFireGlow(glow: number): void {
    this.fireGlow = clamp(glow, 0, 1);
  }

  get isStirring(): boolean {
    return this.spoonMode === 'stir';
  }

  /** ۰ بیرون، ۱ داخل مایع — برای ورود و خروج قاشق */
  get spoonDrop(): number {
    if (this.spoonMode === 'none') return 0;
    if (this.spoonMode === 'enter') return easeOut(Math.min(1, this.spoonT / STIR_ENTER));
    if (this.spoonMode === 'exit') return 1 - easeIn(Math.min(1, this.spoonT / STIR_EXIT));
    return 1;
  }

  get sparkleCount(): number {
    return this.sparkles.length;
  }

  get boilTier(): BoilTier {
    if (this.heat >= 0.9) return 'rolling';
    if (this.heat > 0.5) return 'simmer';
    if (this.heat > 0.05) return 'warm';
    return 'off';
  }

  get liquidRgb(): RGB {
    return this.mixLiquid();
  }

  get liquidHex(): string {
    return rgbToHex(this.mixLiquid());
  }

  /** رنگ غالب حل‌شده — برای بخار معطر */
  get dominantTint(): string {
    let best = '';
    let bestW = 0;
    for (const ing of this.added.values()) {
      const w = ing.strength * ing.quantity * (0.25 + 0.75 * this.dissolved(ing.id));
      if (w > bestW) {
        bestW = w;
        best = ing.tint;
      }
    }
    return best || WATER;
  }

  get squash(): { x: number; y: number } {
    const boil = this.heat > 0.5 ? (this.heat - 0.5) * 2 : 0;
    return { x: this.squashX, y: this.squashY + 0.012 * Math.sin(this.time * 18) * boil };
  }

  update(dt: number): void {
    this.time += dt;
    this.updateSpoon(dt);
    this.updateVortex(dt);
    this.updateChips(dt);
    this.updateBlooms(dt);
    this.updateBoil(dt);
    this.updateSteam(dt);
    this.updateSparkles(dt);
    this.updateSlosh(dt);
    this.updateSquash(dt);
    this.tilt += (this.tiltTarget - this.tilt) * Math.min(1, dt * TILT_EASE);
    if (this.heat > 0.85) this.soot = Math.min(1, this.soot + dt / 28);
    this.shiver = this.heat > 0.05 ? this.heat * (0.35 + 0.65 * Math.sin(this.time * 11)) : 0;
    this.dome = this.boilTier === 'rolling' ? 0.55 + 0.45 * Math.sin(this.time * 6.5) : 0;
  }

  private dissolved(id: string): number {
    const reported = this.progress.get(id);
    const mine = this.chips.filter((c) => c.ingredientId === id);
    if (mine.length === 0) return reported ?? 0;
    const mean = mine.reduce((s, c) => s + c.depth, 0) / mine.length;
    return reported === undefined ? mean : Math.max(mean, reported * 0.15);
  }

  private mixLiquid(): RGB {
    let weight = 0;
    let mixed: RGB = [0, 0, 0];
    for (const ing of this.added.values()) {
      const amount = this.dissolved(ing.id) * ing.strength * Math.min(2, ing.quantity);
      if (amount <= 0) continue;
      const tint = hexToRgb(ing.tint);
      mixed = [mixed[0] + tint[0] * amount, mixed[1] + tint[1] * amount, mixed[2] + tint[2] * amount];
      weight += amount;
    }
    let color = WATER_RGB;
    if (weight > 0) {
      mixed = saturate([mixed[0] / weight, mixed[1] / weight, mixed[2] / weight], 1.35);
      color = lerpRgb(WATER_RGB, mixed, weight / (weight + 0.55));
    }
    color = scaleRgb(color, 1 - Math.min(0.18, this.heat * 0.12));
    if (this.done && !this.burnt) color = tintWhite(color, 0.06 + 0.05 * Math.sin(this.time * 3));
    if (this.burnt) color = burntLiquid(color);
    return color;
  }

  private updateSpoon(dt: number): void {
    this.spoonOmega = 0;
    if (this.spoonMode === 'none') return;
    this.spoonT += dt;
    if (this.spoonMode === 'enter' && this.spoonT >= STIR_ENTER) {
      this.spoonMode = 'stir';
      this.spoonT = 0;
    } else if (this.spoonMode === 'stir') {
      if (this.spoonFollow !== null) {
        const delta = wrap(this.spoonFollow - this.spoonAngle);
        const maxStep = STIR_OMEGA * 2 * dt;
        const step = clamp(delta * Math.min(1, dt * 14), -maxStep, maxStep);
        this.spoonAngle += step;
        this.spoonOmega = dt > 0 ? step / dt : 0;
      } else {
        this.spoonAngle += STIR_OMEGA * dt;
        this.spoonOmega = STIR_OMEGA;
      }
      if (this.spoonFollow === null && this.spoonT >= STIR_HOLD) {
        this.spoonMode = 'exit';
        this.spoonT = 0;
      }
    } else if (this.spoonMode === 'exit' && this.spoonT >= STIR_EXIT) {
      this.spoonMode = 'none';
    }
  }

  private updateVortex(dt: number): void {
    if (this.spoonMode === 'stir') {
      const target = clamp(this.spoonOmega, -6, 6);
      this.omega += (target - this.omega) * Math.min(1, dt * 2.2);
    } else {
      this.omega *= Math.exp(-dt / VORTEX_TAU);
      if (Math.abs(this.omega) < 0.01) this.omega = 0;
    }
    this.swirl += this.omega * dt;
  }

  private updateChips(dt: number): void {
    const stirring = this.spoonMode === 'stir';
    const su = SPOON_R * Math.cos(this.spoonAngle);
    const sv = SPOON_R * Math.sin(this.spoonAngle);
    for (const c of this.chips) {
      const target = this.progress.get(c.ingredientId) ?? 0;
      if (target > c.depth) c.depth += (target - c.depth) * Math.min(1, dt * SINK_EASE);
      if (c.depth - c.bloomed > 0.14) {
        this.spawnBloom(c.u, c.v, c.color, 0.4 + c.depth * 0.4);
        c.bloomed = c.depth;
      }
      const r = Math.hypot(c.u, c.v);
      let ang = Math.atan2(c.v, c.u);
      const local = this.omega * (1 - 0.45 * r * r);
      ang += local * dt;
      let nextR = r;
      if (stirring) {
        const d = Math.hypot(c.u - su, c.v - sv);
        if (d < SPOON_REACH) {
          const falloff = 1 - d / SPOON_REACH;
          ang += this.spoonOmega * 0.55 * falloff * dt;
        }
      }
      if (this.heat > 0.7) nextR += this.rng.range(-1, 1) * 0.05 * dt * this.heat;
      nextR = clamp(nextR, 0.18, INSIDE);
      c.u = Math.cos(ang) * nextR;
      c.v = Math.sin(ang) * nextR;
      c.rot += c.spin * dt * (0.25 + Math.min(2, Math.abs(local)));
      c.bob += dt * (1.4 + this.heat);
    }
  }

  private spawnBloom(u: number, v: number, color: string, radius: number): void {
    if (this.blooms.length >= MAX_BLOOMS) this.blooms.shift();
    this.blooms.push({
      u,
      v,
      age: 0,
      life: this.rng.range(1.4, 2.4),
      radius,
      grow: this.rng.range(0.35, 0.7),
      color,
    });
  }

  private updateBlooms(dt: number): void {
    for (const b of this.blooms) {
      b.age += dt;
      const r = Math.hypot(b.u, b.v);
      let ang = Math.atan2(b.v, b.u);
      ang += this.omega * (1 - 0.4 * r * r) * 0.65 * dt;
      const next = Math.min(INSIDE, r);
      b.u = Math.cos(ang) * next;
      b.v = Math.sin(ang) * next;
      b.radius = Math.min(1.3, b.radius + b.grow * dt);
    }
    this.blooms = this.blooms.filter((b) => b.age < b.life);
  }

  private updateBoil(dt: number): void {
    const tier = this.boilTier;
    if (tier === 'simmer' || tier === 'rolling') {
      this.bubbleTimer += dt * this.heat * this.heat * (tier === 'rolling' ? 16 : 8);
      while (this.bubbleTimer >= 1 && this.bubbles.length < MAX_BUBBLES) {
        this.bubbleTimer -= 1;
        const rim = tier === 'simmer' || this.rng.chance(0.45);
        const rad = rim ? this.rng.range(0.62, 0.88) : this.rng.range(0.05, 0.4);
        const a = this.rng.range(0, Math.PI * 2);
        this.bubbles.push({
          u: Math.cos(a) * rad,
          v: Math.sin(a) * rad,
          age: 0,
          dur: this.rng.range(0.45, 0.95),
          rim,
        });
      }
      if (tier === 'rolling' && this.rng.chance(dt * 2.5)) this.splash(1, 0.65);
    } else {
      this.bubbleTimer = 0;
    }
    for (const b of this.bubbles) b.age += dt;
    this.bubbles = this.bubbles.filter((b) => b.age < b.dur);
    this.stepDrops(dt);
  }

  /** پاشش تا روی میز؛ بعد از نشستن یکی–دو ثانیه خشک می‌شود. */
  private splash(count: number, spread: number): void {
    for (let i = 0; i < count; i++) {
      if (this.drops.length >= 28) this.drops.shift();
      const a = this.rng.range(-Math.PI, Math.PI);
      const start = this.rng.range(0.2, 0.55);
      this.drops.push({
        u: Math.cos(a) * start,
        v: Math.sin(a) * start * 0.35,
        vx: Math.cos(a) * this.rng.range(2.4, 4.2) * spread,
        vy: this.rng.range(0.4, 1.6) * spread,
        life: 0,
        max: this.rng.range(1.1, 2.1),
        phase: 'fly',
        dry: 0,
        r: this.rng.range(2.4, 5),
      });
    }
  }

  private stepDrops(dt: number): void {
    for (const d of this.drops) {
      if (d.phase === 'fly') {
        d.life += dt;
        d.vy += 7.5 * dt;
        d.u += d.vx * dt;
        d.v += d.vy * dt;
        const onTable = Math.abs(d.u) > 1.85 || d.v > 2.05;
        if ((onTable && d.vy > 0 && d.life > 0.16) || d.life > 1.2) {
          d.phase = 'dry';
          const side = Math.sign(d.u || (d.vx >= 0 ? 1 : -1));
          if (Math.abs(d.u) < 1.9) d.u = side * (1.9 + Math.abs(d.u) * 0.15);
          if (d.v < 2.15) d.v = 2.15 + Math.abs(d.u) * 0.08;
          d.u = Math.max(-2.4, Math.min(2.4, d.u));
          d.v = Math.max(2.05, Math.min(2.6, d.v));
          d.vx = 0;
          d.vy = 0;
        }
      } else {
        d.dry += dt / d.max;
      }
    }
    this.drops = this.drops.filter((d) => d.phase === 'fly' || d.dry < 1);
  }

  private updateSteam(dt: number): void {
    if (this.heat <= 0.02 || this.added.size === 0) {
      this.steam = this.steam.filter((s) => (s.age += dt) < s.dur);
      return;
    }
    const tint = this.burnt ? '#6d655c' : this.dominantTint;
    this.steamTimer += dt * this.heat * (this.burnt ? 11 : 6.5);
    while (this.steamTimer >= 1 && this.steam.length < MAX_STEAM) {
      this.steamTimer -= 1;
      this.steam.push({
        u: this.rng.range(-0.75, 0.75),
        rise: 0,
        age: 0,
        dur: this.rng.range(this.burnt ? 2.2 : 1.5, this.burnt ? 3.4 : 2.4),
        size: this.rng.range(0.7, this.burnt ? 1.6 : 1.15),
        phase: this.rng.range(0, Math.PI * 2),
        tint,
        smoke: this.burnt,
      });
    }
    for (const s of this.steam) {
      s.age += dt;
      s.rise += dt * (this.burnt ? 0.42 : 0.55);
      s.u += Math.sin(this.time * 2.2 + s.phase) * dt * 0.15;
    }
    this.steam = this.steam.filter((s) => s.age < s.dur);
  }

  private updateSparkles(dt: number): void {
    if (this.done && !this.burnt) {
      this.sparkleTimer += dt * 6;
      while (this.sparkleTimer >= 1) {
        this.sparkleTimer -= 1;
        const a = this.rng.range(0, Math.PI * 2);
        const r = this.rng.range(0.15, 0.85);
        this.sparkles.push({ u: Math.cos(a) * r, v: Math.sin(a) * r * 0.7, age: 0 });
      }
    }
    for (const s of this.sparkles) s.age += dt;
    this.sparkles = this.sparkles.filter((s) => s.age < SPARKLE_LIFE);
  }

  private updateSlosh(dt: number): void {
    const stirring = this.spoonMode === 'stir';
    const push = stirring ? clamp(this.spoonOmega, -3, 3) : 0;
    const tx = Math.cos(this.spoonAngle) * push * 0.07;
    const ty = Math.sin(this.spoonAngle) * push * 0.045;
    this.sloshX += (tx - this.sloshX) * Math.min(1, dt * 3);
    this.sloshY += (ty - this.sloshY) * Math.min(1, dt * 3);
    if (stirring) {
      this.foamTimer += dt * Math.min(3, Math.abs(this.spoonOmega) + 0.4);
      if (Math.abs(this.spoonOmega) > 2 && this.rng.chance(dt * 2.2)) this.splash(1, 0.8);
      while (this.foamTimer > 0.22 && this.foam.length < 10) {
        this.foamTimer -= 0.22;
        this.foam.push({
          u: SPOON_R * Math.cos(this.spoonAngle) + this.rng.range(-0.08, 0.08),
          v: SPOON_R * Math.sin(this.spoonAngle) + this.rng.range(-0.06, 0.06),
          age: 0,
          dur: 0.7,
        });
      }
    }
    for (const f of this.foam) f.age += dt;
    this.foam = this.foam.filter((f) => f.age < f.dur);
    if (this.burnt) {
      for (const s of this.spots) {
        const r = Math.hypot(s.u, s.v);
        let ang = Math.atan2(s.v, s.u) + this.omega * 0.4 * dt;
        const next = Math.min(0.8, Math.max(0.08, r));
        s.u = Math.cos(ang) * next;
        s.v = Math.sin(ang) * next;
      }
    }
  }

  private updateSquash(dt: number): void {
    this.squashVx += (-SQUASH_STIFFNESS * (this.squashX - 1) - SQUASH_DAMPING * this.squashVx) * dt;
    this.squashVy += (-SQUASH_STIFFNESS * (this.squashY - 1) - SQUASH_DAMPING * this.squashVy) * dt;
    this.squashX += this.squashVx * dt;
    this.squashY += this.squashVy * dt;
  }
}
