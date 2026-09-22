/* GENERATED FROM Kimiagar.Works — do not edit.
 * source: src/flat/scene.ts
 * sync:   npm run art:sync-works   (scripts/sync-works-flat.mjs)
 * works-commit: 689a5ea
 */
/**
 * Flat-cartoon cooking scene — the vector counterpart of the 64×64 pixel
 * `CookingScene` in `src/animation/scene.ts`.
 *
 * The simulation is a faithful port (same timings, same state machine, same
 * seeded `Rng`, same `AUTO_SCRIPT` beats, same `liquidColor()` mixing) so the
 * exported flat frame sheet has the same phase structure as the pixel one.
 * Only the presentation differs: `render()` returns a shape tree in
 * `FLAT_SCENE_SIZE` design units (transparent background) built from the flat
 * props, ingredients and the helpers in `./scene-parts.ts`.
 *
 * Space conventions
 *   - All particle state lives in *pot-local* units (the 256-unit pot design
 *     space of `props.ts`), so the mouth ellipse `POT_GEOMETRY.mouth` is the
 *     liquid surface and `FLAT_POT_OFFSET` maps to scene space.
 *   - Everything that must stay inside the mouth (liquid, bits, bubbles,
 *     spoon, falling ingredient) is rendered *inside* the squash & stretch
 *     group between `potBack()` and `potFront()`.
 *   - Callers step with a fixed `dt` (1/60) for determinism.
 */
import { hexToRgb, lerpRgb, rgbToHex, saturate, scaleRgb, tintWhite, type RGB } from './color.ts';
import { Fire } from './fire.ts';
import { Rng } from './rng.ts';
import { bitShape, flatIngredientById, type BitKind, type FlatIngredient } from './ingredients.ts';
import { SMOKE, WATER, WATER_LIGHT } from './palette.ts';
import { POT_GEOMETRY, SPOON_GEOMETRY, potBack, potFront, potLiquid, spoonShape } from './props.ts';
import {
  bubbleShape,
  dropletShape,
  flamesShape,
  hearthShape,
  popShape,
  rippleShape,
  sparkleShape,
  steamCurl,
} from './scene-parts.ts';
import {
  around,
  compose,
  ellipse,
  group,
  rect,
  rotate,
  scale,
  translate,
  withStyle,
  type Group,
  type Shape,
} from './shapes.ts';

export const FLAT_SCENE_SIZE = 512;

export type PhaseKey = 'idle' | 'dropping' | 'floating' | 'stirring' | 'heating' | 'boiling' | 'done';

export const PHASE_LABELS: Record<PhaseKey, string> = {
  idle: 'آب در دیگ — یک مادّه بریزید',
  dropping: 'ریختن مادّه',
  floating: 'مواد روی سطح آب شناورند',
  stirring: 'هم زدن',
  heating: 'آتش روشن شد',
  boiling: 'در حال جوشیدن',
  done: 'دم کشید!',
};

export const AUTO_LOOP_SECONDS = 14.4;

/* ------------------------------------------------------------------ */
/* Geometry constants                                                  */
/* ------------------------------------------------------------------ */

/** Scene-space position of the pot's local origin (pot drawn at scale 1, bottom 8 units above the frame edge). */
export const FLAT_POT_OFFSET: readonly [number, number] = [
  FLAT_SCENE_SIZE / 2 - POT_GEOMETRY.size / 2,
  FLAT_SCENE_SIZE - POT_GEOMETRY.size - 8,
];
/** Scale applied to `spoonShape()` inside the scene. */
export const FLAT_SPOON_SCALE = 0.75;
/** Scale applied to an ingredient's 96-unit `staticShape()` while it falls. */
export const FLAT_INGREDIENT_SCALE = 0.7;
/** Radius of the stirring circle as a fraction of the mouth radii. */
export const FLAT_STIR_RADIUS = 0.55;

const [POT_X, POT_Y] = FLAT_POT_OFFSET;
/** Default liquid surface — the flat pot's own mouth. A host can override it (see `SceneOptions.mouth`). */
const MOUTH = POT_GEOMETRY.mouth;

/** Ellipse of the liquid surface in pot-local (256-unit) space. */
export interface MouthGeometry {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/**
 * Host options. Everything is optional so `new FlatCookingScene(seed)` keeps
 * working for the exporter and the demo.
 *
 * - `drawPot: false` hides `potBack()`/`potFront()` (the host draws its own pot,
 *   e.g. a painted PNG) while liquid, specks, spoon and the falling ingredient
 *   are still rendered — position the canvas so `mouth` lands on the host pot.
 * - `drawHearth: false` hides the cartoon hearth and flames.
 * - `mouth` replaces the liquid-surface ellipse (pot-local units).
 * - `spoon` replaces the stirring spoon artwork. Must live in the same
 *   `SPOON_GEOMETRY.size` design space with the bowl at `SPOON_GEOMETRY.bowl`
 *   (the host may restyle it — e.g. a painterly brass ladle — while the scene
 *   keeps positioning it by the bowl centre).
 */
export interface SceneOptions {
  seed?: number;
  drawPot?: boolean;
  drawHearth?: boolean;
  mouth?: MouthGeometry;
  spoon?: Group;
}
/** Bits and bubbles stay inside this fraction of the mouth ellipse. */
const INSIDE = 0.92;

/** Pixel-scene units (64-unit frame) → flat design units; keeps the fall/splash timings identical. */
const UNIT = FLAT_SCENE_SIZE / 64;
const GRAVITY = 200 * UNIT;
const DROP_SPEED = 25 * UNIT;
const STIR_ENTER = 0.5;
const STIR_HOLD = 2.2;
const STIR_EXIT = 0.5;
const STIR_OMEGA = (Math.PI * 2) / 1.2;
const BOIL_UNTIL_DONE = 3;
/** Lifetime of one شمسه sparkle in the "done" celebration (seconds). */
const SPARKLE_LIFE = 0.7;

/** Falling ingredient: centre starts this far above the pot origin so it is fully off-frame. */
const FALL_START_Y = -POT_Y - 40;
/** Half-height of the scaled ingredient that has to dip under the surface before it "lands". */
const FALL_HALF = 28;
/** Degrees per unit of bowl x-offset (the flat version of the pixel `shearTop`). */
const SPOON_TILT_PER_UNIT = 0.35;
/** Waterline relative to the bowl centre: everything below is hidden by the liquid. */
const SPOON_DIP = -4;
/** Rate at which a speck's visual depth eases towards the host-provided progress (1/s). */
const SINK_EASE = 3;

const SQUASH_STIFFNESS = 120;
const SQUASH_DAMPING = 10;

const WATER_RGB = hexToRgb(WATER);
const WATER_LIGHT_RGB = hexToRgb(WATER_LIGHT);

/* ------------------------------------------------------------------ */
/* Particle state                                                      */
/* ------------------------------------------------------------------ */

interface Falling {
  ingredient: FlatIngredient;
  x: number;
  y: number;
  vy: number;
  spin: number;
}

interface Droplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
}

interface Bit {
  ingredientId: string;
  kind: BitKind;
  size: number;
  x: number;
  y: number;
  vx: number;
  color: RGB;
  life: number;
  /** 0 = floating on the surface, 1 = fully sunk (only used in external-progress mode). */
  depth: number;
  angle: number;
  radius: number;
  rot: number;
  rotSpeed: number;
}

interface Ripple {
  cx: number;
  cy: number;
  age: number;
  dur: number;
}

interface Bubble {
  x: number;
  /** Normalised x inside the mouth (-1..1) — fixes how far front/back it can travel. */
  u: number;
  depth: number;
  age: number;
  dur: number;
}

interface Steam {
  x: number;
  y: number;
  phase: number;
  age: number;
  dur: number;
  turns: number;
  clockwise: boolean;
  startDeg: number;
  size: number;
}

interface Sparkle {
  x: number;
  y: number;
  age: number;
}

interface Pop {
  x: number;
  y: number;
  age: number;
}

interface AddedIngredient {
  ingredient: FlatIngredient;
  total: number;
  remaining: number;
}

type SpoonMode = 'none' | 'enter' | 'stir' | 'exit';

/** Per-drop overrides so a game can recolour an ingredient (liquid tint, speck colours) without a new prop. */
export interface DropOverride {
  /** Colour the liquid is pushed towards once dissolved (hex). */
  tint?: string;
  /** Weight vs other ingredients. */
  strength?: number;
  /** Speck overrides; unspecified fields keep the ingredient's defaults. */
  bits?: Partial<FlatIngredient['bits']>;
}

interface ScriptStep {
  at: number;
  run: (scene: FlatCookingScene) => void;
}

/** Full sequence used for autoplay and the exported frame sheet (same beats as the pixel scene). */
export const FLAT_AUTO_SCRIPT: readonly ScriptStep[] = [
  { at: 0.7, run: (s) => s.drop('saffron') },
  { at: 1.9, run: (s) => s.drop('poppy') },
  { at: 3.1, run: (s) => s.drop('borage') },
  { at: 4.3, run: (s) => s.drop('chamomile') },
  { at: 5.7, run: (s) => s.stir() },
  { at: 8.4, run: (s) => s.setFire(true) },
  { at: AUTO_LOOP_SECONDS, run: (s) => s.reset() },
];

/* Static props are immutable shape data — build once, share between frames. */
let potBackCache: Group | undefined;
let potFrontCache: Group | undefined;
let spoonCache: Group | undefined;

function cachedPotBack(): Group {
  return (potBackCache ??= potBack());
}
function cachedPotFront(): Group {
  return (potFrontCache ??= potFront());
}
function cachedSpoon(): Group {
  return (spoonCache ??= spoonShape());
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export class FlatCookingScene {
  time = 0;
  autoplay = false;
  done = false;

  readonly fire = new Fire(18, 8);

  private rng: Rng;
  private seed: number;

  private falling: Falling | null = null;
  private dropQueue: FlatIngredient[] = [];
  private droplets: Droplet[] = [];
  private bits: Bit[] = [];
  private ripples: Ripple[] = [];
  private bubbles: Bubble[] = [];
  private steam: Steam[] = [];
  private sparkles: Sparkle[] = [];
  private pops: Pop[] = [];
  private added = new Map<string, AddedIngredient>();

  private spoonMode: SpoonMode = 'none';
  private spoonT = 0;
  private spoonAngle = -Math.PI / 2;
  /** Pointer-driven target angle while a player stirs by hand; `null` = scripted stir. */
  private spoonFollow: number | null = null;
  /** Angular velocity of the spoon this frame (rad/s) — drives the specks while stirring. */
  private spoonOmega = 0;
  private rippleTimer = 0;

  /** Optional post-processing of the mixed liquid colour (e.g. a "burnt" desaturation). */
  private liquidAdjust: ((rgb: RGB) => RGB) | null = null;

  /** Install (or clear with `null`) a post-processing step for the liquid colour. */
  setLiquidAdjust(adjust: ((rgb: RGB) => RGB) | null): void {
    this.liquidAdjust = adjust;
  }

  private boilTime = 0;
  private cookedness = 0;
  private bubbleTimer = 0;
  private steamTimer = 0;
  private steamCount = 0;
  private sparkleTimer = 0;

  /** Squash & stretch spring (scale factors around the pot's bottom centre). */
  private squashX = 1;
  private squashY = 1;
  private squashVx = 0;
  private squashVy = 0;

  private scriptTime = 0;
  private scriptIndex = 0;

  /* Host options (see SceneOptions). */
  readonly mouth: MouthGeometry;
  private readonly drawPot: boolean;
  private readonly drawHearth: boolean;
  /** Host-supplied spoon artwork (null ⇒ the flat kit's `spoonShape()`). */
  private readonly spoonArt: Group | null;
  /** Vertical travel of the spoon when entering/exiting so it starts fully above the frame. */
  private readonly spoonTravel: number;

  /**
   * External-progress mode: the host game owns dissolving. Specks sink towards
   * `setIngredientProgress()` instead of fading with stir/boil time, and
   * `done` follows `setDone()` instead of the internal boil timer.
   */
  private externalProgress = false;
  private progress = new Map<string, number>();
  private doneExternal = false;
  private burnt = false;

  constructor(seedOrOptions: number | SceneOptions = 7) {
    const opts: SceneOptions = typeof seedOrOptions === 'number' ? { seed: seedOrOptions } : seedOrOptions;
    this.seed = opts.seed ?? 7;
    this.rng = new Rng(this.seed);
    this.mouth = { ...(opts.mouth ?? MOUTH) };
    this.drawPot = opts.drawPot ?? true;
    this.drawHearth = opts.drawHearth ?? true;
    this.spoonArt = opts.spoon ?? null;
    this.spoonTravel = POT_Y + this.mouth.cy + SPOON_GEOMETRY.bowl.ry * FLAT_SPOON_SCALE + 12;
  }

  /** Liquid surface y in pot-local units (== `mouth.cy`). */
  get surfaceY(): number {
    return this.mouth.cy;
  }

  /** Current squash & stretch factors (around the pot's bottom centre) so a host-drawn pot can follow. */
  get squash(): { x: number; y: number } {
    const boil = Math.max(0, (this.fire.intensity - 0.5) * 2);
    return { x: this.squashX, y: this.squashY + 0.012 * Math.sin(this.time * 18) * boil };
  }

  /**
   * Hand the dissolve/done logic to the host. While on, specks keep floating
   * until `setIngredientProgress()` sinks them and `done` only follows `setDone()`.
   */
  setExternalProgress(on: boolean): void {
    this.externalProgress = on;
    if (!on) {
      this.progress.clear();
      this.doneExternal = false;
    }
  }

  /** Sink progress 0..1 of one ingredient's specks (external-progress mode). */
  setIngredientProgress(ingredientId: string, progress: number): void {
    this.progress.set(ingredientId, Math.min(1, Math.max(0, progress)));
  }

  /** Turn the finishing شمسه sparkles on/off (external-progress mode). */
  setDone(done: boolean): void {
    this.doneExternal = done;
    if (this.externalProgress) this.done = done;
  }

  /** Burnt brew: steam turns to grey smoke, thicker rise, celebration sparkles go away. */
  setBurnt(burnt: boolean): void {
    this.burnt = burnt;
    if (burnt) {
      this.sparkles = [];
      this.sparkleTimer = 0;
    }
  }

  private bubbleY(b: Bubble, t: number): number {
    return bubbleYIn(this.mouth, b, t);
  }

  /* ---------------------------------------------------------------- */
  /* Commands                                                          */
  /* ---------------------------------------------------------------- */

  drop(ingredientId: string, override?: DropOverride): void {
    const base = flatIngredientById(ingredientId);
    if (!base) return;
    const ingredient: FlatIngredient = override
      ? {
          ...base,
          tint: override.tint ?? base.tint,
          strength: override.strength ?? base.strength,
          bits: { ...base.bits, ...override.bits },
        }
      : base;
    this.dropQueue.push(ingredient);
  }

  /** Scripted stir: the spoon enters, circles for `STIR_HOLD` seconds and leaves. No-op while a stir is in progress. */
  stir(): void {
    if (this.spoonMode !== 'none') return;
    this.spoonFollow = null;
    this.spoonMode = 'enter';
    this.spoonT = 0;
    this.spoonAngle = -Math.PI / 2;
  }

  /**
   * Hand stirring: while `angle` (radians around the mouth centre, 0 = +x,
   * clockwise on screen) is non-null the spoon stays in the pot and eases
   * towards that angle; pass `null` when the pointer lifts to make it leave.
   */
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
      // Turn the exit around: re-enter from part-way up, keeping the current angle.
      this.spoonMode = 'enter';
      this.spoonT = STIR_ENTER * 0.5;
    }
  }

  setFire(lit: boolean): void {
    this.fire.lit = lit;
    if (!lit) this.boilTime = 0;
  }

  /**
   * Game heat as a 0..1 level: 0 puts the fire out, values ≤ 0.5 only warm
   * the pot (no boiling), values above 0.5 boil it — the same threshold the
   * scene uses for bubbles, steam and "done".
   */
  setHeatLevel(level: number): void {
    const clamped = Math.min(1, Math.max(0, level));
    this.fire.level = clamped;
    this.setFire(clamped > 0);
  }

  toggleFire(): void {
    this.setFire(!this.fire.lit);
  }

  /** Back to an empty, unlit pot. Pass `seed` to reseed the simulation (e.g. one seed per customer). */
  reset(seed: number = this.seed): void {
    this.seed = seed;
    this.rng = new Rng(this.seed);
    this.falling = null;
    this.dropQueue = [];
    this.droplets = [];
    this.bits = [];
    this.ripples = [];
    this.bubbles = [];
    this.steam = [];
    this.sparkles = [];
    this.pops = [];
    this.added.clear();
    this.spoonMode = 'none';
    this.spoonT = 0;
    this.spoonFollow = null;
    this.spoonOmega = 0;
    this.rippleTimer = 0;
    this.boilTime = 0;
    this.cookedness = 0;
    this.bubbleTimer = 0;
    this.steamTimer = 0;
    this.steamCount = 0;
    this.sparkleTimer = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.squashVx = 0;
    this.squashVy = 0;
    this.done = false;
    this.progress.clear();
    this.doneExternal = false;
    this.burnt = false;
    this.fire.reset();
    this.scriptTime = 0;
    this.scriptIndex = 0;
  }

  setAutoplay(on: boolean): void {
    if (on === this.autoplay) return;
    this.autoplay = on;
    if (on) this.reset();
  }

  /* ---------------------------------------------------------------- */
  /* Read-only state for the UI                                        */
  /* ---------------------------------------------------------------- */

  get phase(): PhaseKey {
    if (this.done) return 'done';
    if (this.falling || this.dropQueue.length) return 'dropping';
    if (this.spoonMode !== 'none') return 'stirring';
    if (this.fire.lit && this.fire.intensity > 0.5) return 'boiling';
    if (this.fire.lit) return 'heating';
    if (this.bits.length) return 'floating';
    return 'idle';
  }

  get recipe(): readonly FlatIngredient[] {
    return [...this.added.values()].map((a) => a.ingredient);
  }

  get liquidHex(): string {
    return rgbToHex(this.liquidColor());
  }

  get isStirring(): boolean {
    return this.spoonMode === 'stir';
  }

  /** Alive celebration sparkles (empty after `setBurnt(true)`). */
  get sparkleCount(): number {
    return this.sparkles.length;
  }

  /* ---------------------------------------------------------------- */
  /* Simulation                                                        */
  /* ---------------------------------------------------------------- */

  update(dt: number): void {
    this.time += dt;
    if (this.autoplay) this.runScript(dt);

    this.updateFalling(dt);
    this.updateDroplets(dt);
    this.updateSpoon(dt);
    this.updateBits(dt);
    this.fire.update(dt, this.rng);
    this.updateBoiling(dt);
    this.updateDone(dt);
    this.updateSquash(dt);

    this.ripples = this.ripples.filter((r) => (r.age += dt) < r.dur);
    this.pops = this.pops.filter((p) => (p.age += dt) < 0.12);
  }

  private runScript(dt: number): void {
    this.scriptTime += dt;
    // The final step calls reset(), which zeroes scriptTime/scriptIndex and so loops the sequence.
    while (this.scriptIndex < FLAT_AUTO_SCRIPT.length && this.scriptTime >= FLAT_AUTO_SCRIPT[this.scriptIndex].at) {
      const step = FLAT_AUTO_SCRIPT[this.scriptIndex];
      this.scriptIndex++;
      step.run(this);
    }
  }

  private updateFalling(dt: number): void {
    if (!this.falling && this.dropQueue.length) {
      const ingredient = this.dropQueue.shift()!;
      const margin = (ingredient.size * FLAT_INGREDIENT_SCALE) / 2 + 12;
      this.falling = {
        ingredient,
        x: this.rng.range(this.mouth.cx - this.mouth.rx + margin, this.mouth.cx + this.mouth.rx - margin),
        y: FALL_START_Y,
        vy: DROP_SPEED,
        spin: this.rng.chance(0.5) ? 1 : -1,
      };
    }
    const f = this.falling;
    if (!f) return;
    f.vy += GRAVITY * dt;
    f.y += f.vy * dt;
    if (f.y + FALL_HALF >= this.surfaceY) {
      this.land(f);
      this.falling = null;
    }
  }

  private land(f: Falling): void {
    const cx = f.x;
    const liquid = this.liquidColor();
    const dropletHex = rgbToHex(tintWhite(liquid, 0.25));
    for (let i = 0; i < 6; i++) {
      this.droplets.push({
        x: cx + this.rng.range(-2, 2) * UNIT,
        y: this.surfaceY - 4,
        vx: this.rng.range(-20, 20) * UNIT,
        vy: this.rng.range(-60, -30) * UNIT,
        r: this.rng.range(3, 4.2),
        color: dropletHex,
      });
    }
    this.ripples.push({ cx, cy: this.surfaceY, age: 0, dur: 0.55 });

    // Cartoon impact: the pot squashes and springs back.
    this.squashY -= 0.12;
    this.squashX += 0.08;

    const entry = this.added.get(f.ingredient.id) ?? { ingredient: f.ingredient, total: 0, remaining: 0 };
    entry.total += f.ingredient.bits.count;
    entry.remaining += f.ingredient.bits.count;
    this.added.set(f.ingredient.id, entry);

    const { kind, size, colors } = f.ingredient.bits;
    for (let i = 0; i < f.ingredient.bits.count; i++) {
      const x = cx + this.rng.range(-4, 4) * UNIT;
      // Specks land towards the back of the surface, like the pixel version's top interior rows.
      const y = this.surfaceY + this.rng.range(-0.75, -0.15) * this.mouth.ry;
      const bit: Bit = {
        ingredientId: f.ingredient.id,
        kind,
        size,
        x,
        y,
        vx: this.rng.range(-2.5, 2.5) * UNIT,
        color: hexToRgb(this.rng.pick(colors)),
        life: 1,
        depth: 0,
        angle: Math.atan2((y - this.surfaceY) / this.mouth.ry, (x - this.mouth.cx) / this.mouth.rx),
        radius: this.rng.range(0.3, 0.8),
        rot: this.rng.range(0, 360),
        rotSpeed: kind === 'thread' ? this.rng.range(-40, 40) : 0,
      };
      this.keepInside(bit);
      this.bits.push(bit);
    }
    if (!this.externalProgress) this.done = false;
  }

  /** Pushes a bit back inside `INSIDE` × the mouth ellipse, bouncing its horizontal velocity. */
  private keepInside(b: Bit): void {
    const nx = (b.x - this.mouth.cx) / this.mouth.rx;
    const ny = (b.y - this.surfaceY) / this.mouth.ry;
    const len = Math.hypot(nx, ny);
    if (len <= INSIDE) return;
    const k = INSIDE / len;
    b.x = this.mouth.cx + nx * k * this.mouth.rx;
    b.y = this.surfaceY + ny * k * this.mouth.ry;
    if (Math.sign(b.vx) === Math.sign(nx)) b.vx = -b.vx;
  }

  private updateDroplets(dt: number): void {
    for (const d of this.droplets) {
      d.vy += GRAVITY * 0.8 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }
    const floor = FLAT_SCENE_SIZE - POT_Y;
    this.droplets = this.droplets.filter((d) => !(d.vy > 0 && d.y >= this.surfaceY) && d.y < floor);
  }

  private updateSpoon(dt: number): void {
    this.spoonOmega = 0;
    if (this.spoonMode === 'none') return;
    this.spoonT += dt;
    if (this.spoonMode === 'enter' && this.spoonT >= STIR_ENTER) {
      this.spoonMode = 'stir';
      this.spoonT = 0;
      for (const b of this.bits) {
        const nx = (b.x - this.mouth.cx) / this.mouth.rx;
        const ny = (b.y - this.surfaceY) / this.mouth.ry;
        b.angle = Math.atan2(ny, nx);
        b.radius = Math.min(0.85, Math.max(0.25, Math.hypot(nx, ny)));
      }
    } else if (this.spoonMode === 'stir') {
      if (this.spoonFollow !== null) {
        // Ease towards the pointer angle along the shortest arc; the spoon can move at most ~2× the scripted speed.
        let delta = this.spoonFollow - this.spoonAngle;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        const maxStep = STIR_OMEGA * 2 * dt;
        const step = Math.max(-maxStep, Math.min(maxStep, delta * Math.min(1, dt * 14)));
        this.spoonAngle += step;
        this.spoonOmega = dt > 0 ? step / dt : 0;
      } else {
        this.spoonAngle += STIR_OMEGA * dt;
        this.spoonOmega = STIR_OMEGA;
      }
      this.rippleTimer += dt * Math.min(1.5, Math.abs(this.spoonOmega) / STIR_OMEGA + 0.15);
      if (this.rippleTimer > 0.3) {
        this.rippleTimer = 0;
        this.ripples.push({ cx: this.spoonBowlX(), cy: this.spoonBowlY(), age: 0, dur: 0.45 });
      }
      if (this.spoonFollow === null && this.spoonT >= STIR_HOLD) {
        this.spoonMode = 'exit';
        this.spoonT = 0;
      }
    } else if (this.spoonMode === 'exit' && this.spoonT >= STIR_EXIT) {
      this.spoonMode = 'none';
    }
  }

  private spoonBowlX(): number {
    return this.mouth.cx + FLAT_STIR_RADIUS * this.mouth.rx * Math.cos(this.spoonAngle);
  }

  private spoonBowlY(): number {
    return this.surfaceY + FLAT_STIR_RADIUS * this.mouth.ry * Math.sin(this.spoonAngle);
  }

  private updateBits(dt: number): void {
    const stirring = this.spoonMode === 'stir';
    const boiling = this.fire.intensity > 0.5;
    // Hand stirring dissolves in proportion to how fast the spoon actually moves.
    const stirEffort = stirring ? Math.min(1, Math.abs(this.spoonOmega) / STIR_OMEGA) : 0;
    const dissolveRate = stirring ? 0.03 + 0.47 * stirEffort : boiling ? 0.3 : 0.03;

    for (const b of this.bits) {
      if (this.externalProgress) {
        // The host decides how far this ingredient has extracted; the speck sinks to match (never resurfaces).
        const target = this.progress.get(b.ingredientId) ?? 0;
        if (target > b.depth) b.depth += (target - b.depth) * Math.min(1, dt * SINK_EASE);
        if (target >= 1 && b.depth > 0.985) b.depth = 1;
        b.life = 1 - b.depth;
      } else {
        b.life -= dissolveRate * dt;
      }
      b.rot += b.rotSpeed * dt;
      if (stirring) {
        b.angle += this.spoonOmega * 0.85 * dt;
        b.x = this.mouth.cx + b.radius * this.mouth.rx * Math.cos(b.angle);
        b.y = this.surfaceY + b.radius * this.mouth.ry * Math.sin(b.angle);
      } else {
        b.x += b.vx * dt + (boiling ? this.rng.range(-6, 6) * UNIT * dt : 0);
        if (boiling) b.y += this.rng.range(-1.5, 1.5) * UNIT * dt;
      }
      this.keepInside(b);
    }

    const dissolved = this.bits.filter((b) => b.life <= 0);
    for (const b of dissolved) {
      const entry = this.added.get(b.ingredientId);
      if (entry) entry.remaining = Math.max(0, entry.remaining - 1);
    }
    if (dissolved.length) this.bits = this.bits.filter((b) => b.life > 0);
  }

  private updateBoiling(dt: number): void {
    const heat = this.fire.intensity;
    if (heat > 0.5) this.boilTime += dt;
    const targetCooked = heat > 0.5 ? Math.min(1, this.boilTime / BOIL_UNTIL_DONE) : this.cookedness;
    this.cookedness += (targetCooked - this.cookedness) * Math.min(1, dt * 2);

    this.bubbleTimer += dt * heat * heat * 14;
    while (this.bubbleTimer >= 1) {
      this.bubbleTimer -= 1;
      const u = this.rng.range(-0.8, 0.8);
      this.bubbles.push({
        x: this.mouth.cx + u * this.mouth.rx,
        u,
        depth: this.rng.range(0.35, 0.9),
        age: 0,
        dur: this.rng.range(0.45, 0.9),
      });
    }
    for (const b of this.bubbles) b.age += dt;
    const popped = this.bubbles.filter((b) => b.age >= b.dur);
    for (const b of popped) this.pops.push({ x: b.x, y: this.bubbleY(b, 1), age: 0 });
    if (popped.length) this.bubbles = this.bubbles.filter((b) => b.age < b.dur);

    this.steamTimer += dt * heat * (this.burnt ? 10 : 7);
    while (this.steamTimer >= 1) {
      this.steamTimer -= 1;
      this.steam.push({
        x: this.mouth.cx + this.rng.range(-0.8, 0.8) * this.mouth.rx,
        y: this.surfaceY - 6,
        phase: this.rng.range(0, Math.PI * 2),
        age: 0,
        dur: this.rng.range(1.3, 2),
        turns: this.rng.range(0.6, 0.9),
        clockwise: this.steamCount++ % 2 === 0,
        startDeg: this.rng.range(-120, -60),
        size: this.rng.chance(0.35) ? 1.25 : 0.95,
      });
    }
    for (const s of this.steam) {
      s.age += dt;
      s.y -= 55 * dt;
      s.x += Math.sin(this.time * 3 + s.phase) * 4 * UNIT * dt;
    }
    this.steam = this.steam.filter((s) => s.age < s.dur);
  }

  private updateDone(dt: number): void {
    if (this.externalProgress) {
      this.done = this.doneExternal;
    } else if (!this.done && this.fire.intensity > 0.8 && this.boilTime >= BOIL_UNTIL_DONE && !this.bits.length && this.added.size) {
      this.done = true;
    }
    // Celebrate only while done and not burnt. Leftover sparkles always age so
    // turning `done` off (or burning) never freezes them on screen.
    if (this.done && !this.burnt) {
      this.sparkleTimer += dt * 7;
      while (this.sparkleTimer >= 1) {
        this.sparkleTimer -= 1;
        const rim = POT_GEOMETRY.rim;
        this.sparkles.push({
          x: rim.cx + this.rng.range(-rim.rx + 10, rim.rx - 10),
          y: this.surfaceY + this.rng.range(-this.mouth.ry - 12, this.mouth.ry + 16),
          age: 0,
        });
      }
    }
    for (const s of this.sparkles) s.age += dt;
    this.sparkles = this.sparkles.filter((s) => s.age < SPARKLE_LIFE);
  }

  /** Damped spring pulling the squash factors back to 1. */
  private updateSquash(dt: number): void {
    this.squashVx += (-SQUASH_STIFFNESS * (this.squashX - 1) - SQUASH_DAMPING * this.squashVx) * dt;
    this.squashVy += (-SQUASH_STIFFNESS * (this.squashY - 1) - SQUASH_DAMPING * this.squashVy) * dt;
    this.squashX += this.squashVx * dt;
    this.squashY += this.squashVy * dt;
  }

  /* ---------------------------------------------------------------- */
  /* Colour                                                            */
  /* ---------------------------------------------------------------- */

  liquidColor(): RGB {
    // How much of each ingredient has dissolved so far (specks release colour as they fade).
    const floating = new Map<string, number>();
    for (const b of this.bits) floating.set(b.ingredientId, (floating.get(b.ingredientId) ?? 0) + b.life);

    let weight = 0;
    let mixed: RGB = [0, 0, 0];
    for (const a of this.added.values()) {
      const dissolved = a.total ? (a.total - (floating.get(a.ingredient.id) ?? 0)) / a.total : 0;
      const amount = dissolved * a.ingredient.strength;
      if (amount <= 0) continue;
      const tint = hexToRgb(a.ingredient.tint);
      mixed = [mixed[0] + tint[0] * amount, mixed[1] + tint[1] * amount, mixed[2] + tint[2] * amount];
      weight += amount;
    }
    let color = WATER_RGB;
    if (weight > 0) {
      mixed = saturate([mixed[0] / weight, mixed[1] / weight, mixed[2] / weight], 1.45);
      color = lerpRgb(WATER_RGB, mixed, weight / (weight + 0.5));
    }
    // Simmering deepens the brew; a finished brew glows gently.
    color = scaleRgb(color, 1 - this.cookedness * 0.15);
    if (this.done) color = tintWhite(color, 0.08 + 0.08 * Math.sin(this.time * 4));
    if (this.liquidAdjust) color = this.liquidAdjust(color);
    return color;
  }

  /* ---------------------------------------------------------------- */
  /* Rendering                                                         */
  /* ---------------------------------------------------------------- */

  /** Shape tree for the current state in FLAT_SCENE_SIZE design units. */
  render(): Group {
    const liquid = this.liquidColor();
    const liquidHex = rgbToHex(liquid);
    const potSpace = translate(POT_X, POT_Y);
    const layers: Shape[] = [];

    /* --- hearth + flames (behind the pot, not squashed) --- */
    if (this.drawHearth) {
      const behind: Shape[] = [hearthShape(this.fire.intensity)];
      const flames = flamesShape(this.fire, this.time);
      if (flames) behind.push(flames);
      layers.push(group(behind, { id: 'hearth-and-fire', transform: potSpace }));
    }

    /* --- pot with everything that lives inside its mouth --- */
    const inside: Shape[] = [];
    if (this.drawPot) inside.push(cachedPotBack());
    inside.push(potLiquid(liquidHex, this.mouth), this.renderHighlight(liquid));
    const onLiquid = this.renderLiquidEffects(liquid);
    if (onLiquid.length) {
      inside.push(group(onLiquid, { id: 'liquid-effects', clip: ellipse(this.mouth.cx, this.mouth.cy, this.mouth.rx, this.mouth.ry) }));
    }
    const spoon = this.renderSpoon();
    if (spoon) inside.push(spoon);
    const falling = this.renderFalling();
    if (falling) inside.push(falling);
    if (this.drawPot) inside.push(cachedPotFront());
    for (const d of this.droplets) {
      if (d.y < this.surfaceY) inside.push(dropletShape(d.x, d.y, d.r, d.color));
    }
    const { x: sx, y: sy } = this.squash;
    const [bx, by] = POT_GEOMETRY.bottomCenter;
    layers.push(group(inside, { id: 'pot', transform: compose(around(bx, by, scale(sx, sy)), potSpace) }));

    /* --- steam + sparkles (in front of the pot, not squashed) --- */
    const above: Shape[] = [];
    const steamColor = this.burnt ? SMOKE : undefined;
    for (const s of this.steam) {
      above.push(steamCurl(s.x, s.y, s.age / s.dur, s.turns, s.clockwise, s.startDeg, s.size, steamColor));
    }
    for (const s of this.sparkles) above.push(sparkleShape(s.x, s.y, s.age / SPARKLE_LIFE));
    if (above.length) layers.push(group(above, { id: 'steam-and-sparkles', transform: potSpace }));

    return group(layers, { id: 'flat-cooking-scene' });
  }

  /** Flat highlight patch on the surface, cooled towards WATER_LIGHT like a sky reflection. */
  private renderHighlight(liquid: RGB): Shape {
    const fill = rgbToHex(tintWhite(lerpRgb(liquid, WATER_LIGHT_RGB, 0.3), 0.12));
    return ellipse(this.mouth.cx - 18, this.surfaceY - 4, this.mouth.rx * 0.4, this.mouth.ry * 0.36, { fill });
  }

  /** Stir wake, ripples, bubbles, bits and pops — all clipped to the mouth ellipse by the caller. */
  private renderLiquidEffects(liquid: RGB): Shape[] {
    const out: Shape[] = [];
    if (this.spoonMode === 'stir') {
      // Darker wake around the dipped bowl, like the pixel version's shaded ring.
      const bx = this.spoonBowlX();
      const by = this.spoonBowlY();
      out.push(
        ellipse(bx, by - 1, 30, 7.5, { fill: rgbToHex(scaleRgb(liquid, 0.85)) }),
        ellipse(bx, by - 1, 30, 7.5, { stroke: { color: rgbToHex(tintWhite(liquid, 0.3)), width: 2.2, cap: 'round', join: 'round' } }),
      );
    }
    for (const r of this.ripples) out.push(rippleShape(r.cx, r.cy, r.age / r.dur, liquid));
    for (const b of this.bubbles) out.push(bubbleShape(b.x, this.bubbleY(b, b.age / b.dur), b.age / b.dur, liquid));
    for (const b of this.bits) {
      const color = b.life < 0.5 ? lerpRgb(liquid, b.color, b.life * 2) : b.color;
      // Sinking specks (external-progress mode) drift towards the front of the mouth and shrink.
      const sink = b.depth;
      const transform =
        sink > 0
          ? compose(rotate(b.rot), scale(1 - 0.55 * sink), translate(b.x, b.y + sink * this.mouth.ry * 0.45))
          : compose(rotate(b.rot), translate(b.x, b.y));
      out.push(withStyle(bitShape(b.kind, rgbToHex(color), b.size), { transform, opacity: 1 - 0.6 * sink }));
    }
    for (const p of this.pops) out.push(popShape(p.x, p.y, p.age / 0.12, liquid));
    return out;
  }

  private renderSpoon(): Shape | null {
    if (this.spoonMode === 'none') return null;
    const bowlX = this.spoonBowlX();
    const bowlY = this.spoonBowlY();
    let oy = 0;
    if (this.spoonMode === 'enter') {
      oy = -this.spoonTravel * (1 - easeOut(Math.min(1, this.spoonT / STIR_ENTER)));
    } else if (this.spoonMode === 'exit') {
      oy = -this.spoonTravel * easeIn(Math.min(1, this.spoonT / STIR_EXIT));
    }
    const tilt = -(bowlX - this.mouth.cx) * SPOON_TILT_PER_UNIT;
    const s = FLAT_SPOON_SCALE;
    const px = bowlX;
    const py = bowlY + oy;
    const transform = compose(
      scale(s),
      translate(px - SPOON_GEOMETRY.bowl.cx * s, py - SPOON_GEOMETRY.bowl.cy * s),
      around(px, py, rotate(tilt)),
    );
    // Everything below the waterline is under the liquid: clip to a rect ending there.
    const waterline = bowlY + SPOON_DIP;
    const clipTop = -this.spoonTravel - 400;
    return group([group([this.spoonArt ?? cachedSpoon()], { transform })], {
      id: 'spoon-in-pot',
      clip: rect(-POT_GEOMETRY.size, clipTop, POT_GEOMETRY.size * 3, waterline - clipTop),
    });
  }

  private renderFalling(): Shape | null {
    const f = this.falling;
    if (!f) return null;
    const k = Math.min(1, Math.max(0, (f.vy - DROP_SPEED) / 800));
    const progress = Math.min(1, Math.max(0, (f.y - FALL_START_Y) / (this.surfaceY - FALL_START_Y)));
    const spin = f.spin * progress * 35;
    const half = f.ingredient.size / 2;
    return group([f.ingredient.staticShape()], {
      id: 'falling',
      transform: compose(
        translate(-half, -half),
        scale(FLAT_INGREDIENT_SCALE),
        rotate(spin),
        scale(1 - 0.15 * k, 1 + 0.25 * k),
        translate(f.x, f.y),
      ),
    });
  }
}

/** Surface y of a bubble at life fraction `t`: from its depth (front) up to the back of the mouth. */
function bubbleYIn(mouth: MouthGeometry, b: Bubble, t: number): number {
  const edge = Math.sqrt(Math.max(0, 1 - b.u * b.u));
  const yStart = mouth.cy + b.depth * edge * mouth.ry;
  const yEnd = mouth.cy - 0.5 * edge * mouth.ry;
  return yStart + (yEnd - yStart) * t;
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easeIn(t: number): number {
  return t * t;
}
