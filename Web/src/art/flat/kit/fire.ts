/* GENERATED FROM Kimiagar.Works — do not edit.
 * source: src/animation/fire.ts
 * sync:   npm run art:sync-works   (scripts/sync-works-flat.mjs)
 * works-commit: 689a5ea
 */
import { hexToRgb, lerpRgb, type RGB } from './color.ts';
import type { Rng } from './rng.ts';

const YELLOW = hexToRgb('#f5c542');
const WHITE_HOT = hexToRgb('#fff2c0');
const ORANGE = hexToRgb('#e8802a');
const RED = hexToRgb('#c0392b');
const DEEP_RED = hexToRgb('#7a1f14');

const TICK = 1 / 15;

/** Minimal pixel sink `Fire.render()` paints into (structurally satisfied by `FrameBuffer`). */
export interface PixelSink {
  set(x: number, y: number, rgb: RGB, alpha: number): void;
}

/**
 * Classic "heat rises" cellular automaton: the bottom row is seeded with
 * random heat while lit, every other cell averages the three cells below it
 * and cools a little. Ticks at 15 Hz so the flames feel chunky.
 */
export class Fire {
  lit = false;
  /**
   * Target intensity while lit (0..1). Lets a game map "low / medium / high"
   * heat onto the same automaton: `intensity` ramps towards `level`.
   */
  level = 1;
  /** 0..1, follows `lit ? level : 0` with a short ramp so the fire grows and dies down. */
  intensity = 0;

  readonly width: number;
  readonly height: number;
  private readonly heat: Float32Array;
  private accumulator = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.heat = new Float32Array(width * height);
  }

  reset(): void {
    this.lit = false;
    this.level = 1;
    this.intensity = 0;
    this.heat.fill(0);
  }

  update(dt: number, rng: Rng): void {
    const target = this.lit ? Math.min(1, Math.max(0, this.level)) : 0;
    const step = dt / 1.2;
    this.intensity += Math.sign(target - this.intensity) * Math.min(step, Math.abs(target - this.intensity));

    this.accumulator += dt;
    while (this.accumulator >= TICK) {
      this.accumulator -= TICK;
      this.tick(rng);
    }
  }

  /** Heat of the automaton cell at column `x`, row `y` (row 0 = top, ≈0..1.1). Out of range → 0. */
  heatAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.heat[y * this.width + x];
  }

  /** Mean heat of column `x` over all rows (≈0..1; 0 when unlit or out of range). */
  columnHeat(x: number): number {
    if (x < 0 || x >= this.width) return 0;
    let sum = 0;
    for (let y = 0; y < this.height; y++) sum += this.heat[y * this.width + x];
    return sum / this.height;
  }

  private tick(rng: Rng): void {
    const { width, height, heat } = this;
    const bottom = (height - 1) * width;
    for (let x = 0; x < width; x++) {
      // Edges burn cooler so the flame tapers into a tongue shape.
      const edge = 1 - Math.abs((x - (width - 1) / 2) / ((width - 1) / 2)) * 0.6;
      heat[bottom + x] = rng.chance(0.9) ? rng.range(0.75, 1.1) * this.intensity * edge : 0;
    }
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width; x++) {
        const below = (y + 1) * width;
        const l = heat[below + Math.max(0, x - 1)];
        const c = heat[below + x];
        const r = heat[below + Math.min(width - 1, x + 1)];
        const v = (l + c * 2 + r) / 4 - rng.range(0.02, 0.11);
        heat[y * width + x] = v < 0 ? 0 : v;
      }
    }
  }

  private colorFor(h: number): RGB {
    if (h > 0.85) return lerpRgb(YELLOW, WHITE_HOT, (h - 0.85) / 0.15);
    if (h > 0.6) return lerpRgb(ORANGE, YELLOW, (h - 0.6) / 0.25);
    if (h > 0.35) return lerpRgb(RED, ORANGE, (h - 0.35) / 0.25);
    return lerpRgb(DEEP_RED, RED, h / 0.35);
  }

  render(fb: PixelSink, ox: number, oy: number): void {
    if (this.intensity <= 0) return;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const h = this.heat[y * this.width + x];
        if (h < 0.1) continue;
        fb.set(ox + x, oy + y, this.colorFor(h), Math.min(1, h * 2.2));
      }
    }
  }
}
