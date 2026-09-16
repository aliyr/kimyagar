/* GENERATED FROM Kimiagar.Works — do not edit.
 * source: src/flat/scene-parts.ts
 * sync:   npm run art:sync-works   (scripts/sync-works-flat.mjs)
 * works-commit: 689a5ea
 */
/**
 * Pure shape builders for the flat-cartoon cooking scene (`./scene.ts`):
 * hearth logs, cartoon flames, ripples, bubbles, pops, اسلیمی steam curls and
 * شمسه done-sparkles. Everything here is stateless — the scene passes in the
 * simulation values and gets a shape tree back.
 *
 * Coordinates are *pot-local* (the 256-unit pot design space of `props.ts`);
 * the scene places the result with the same translate as the pot.
 */
import { hexToRgb, lerpRgb, rgbToHex, tintWhite, type RGB } from './color.ts';
import type { Fire } from './fire.ts';
import { EMBER, FIRE, OUTLINE, SPARK_GOLD, SPARK_WHITE, STEAM, WOOD } from './palette.ts';
import { POT_GEOMETRY } from './props.ts';
import {
  around,
  circle,
  compose,
  ellipse,
  group,
  polyline,
  rect,
  rotate,
  scale,
  spiralPoints,
  star,
  teardrop,
  translate,
  type Group,
  type Shape,
  type Stroke,
} from './shapes.ts';

/* ------------------------------------------------------------------ */
/* Hearth                                                              */
/* ------------------------------------------------------------------ */

const LOG_OUTLINE: Stroke = { color: OUTLINE, width: 4.5, cap: 'round', join: 'round' };

interface LogSpec {
  cx: number;
  cy: number;
  length: number;
  thick: number;
  deg: number;
  /** Fractions along the log where an ember dot sits. */
  embers: readonly number[];
}

/** Two crossed logs lying under the pot, between the front paws. */
const LOGS: readonly LogSpec[] = [
  { cx: 126, cy: 236, length: 112, thick: 17, deg: -7, embers: [0.34, 0.52, 0.7] },
  { cx: 131, cy: 242, length: 102, thick: 15, deg: 6, embers: [0.3, 0.5, 0.68, 0.84] },
];

/** Bottom of the flame tongues (they rest on the logs). */
export const FLAME_BASE_Y = 240;

function logShape(spec: LogSpec, emberHex: string, glow: number): Group {
  const { cx, cy, length, thick, deg } = spec;
  const x = cx - length / 2;
  const y = cy - thick / 2;
  const silhouette = rect(x, y, length, thick, { rx: thick / 2 });
  const children: Shape[] = [
    rect(x, y, length, thick, { rx: thick / 2, fill: WOOD.base, stroke: LOG_OUTLINE }),
    group([rect(x, cy + 1, length, thick / 2, { fill: WOOD.shade })], { clip: silhouette }),
    rect(x + thick * 0.9, y + 3, length * 0.42, 2.6, { rx: 1.3, fill: WOOD.light }),
    // Sawn end: dark ring with a light core.
    ellipse(x + thick * 0.55, cy, thick * 0.3, thick * 0.4, { fill: WOOD.shade, stroke: { color: OUTLINE, width: 2.4 } }),
    ellipse(x + thick * 0.55, cy, thick * 0.13, thick * 0.19, { fill: WOOD.light }),
  ];
  for (const f of spec.embers) {
    const ex = x + length * f;
    const ey = y + 2.5;
    if (glow > 0) children.push(circle(ex, ey, 5.5, { fill: EMBER, opacity: 0.35 * glow }));
    children.push(circle(ex, ey, 2.6, { fill: emberHex }));
  }
  return group(children, { transform: around(cx, cy, rotate(deg)) });
}

/** Hearth logs with ember dots that glow with the fire intensity (0..1). */
export function hearthShape(intensity: number): Group {
  const ember = rgbToHex(lerpRgb(hexToRgb(WOOD.light), hexToRgb(EMBER), intensity));
  const children: Shape[] = [];
  if (intensity > 0) {
    // Warm pool of light on the ground under the flames.
    children.push(ellipse(128, FLAME_BASE_Y + 2, 62, 11, { fill: EMBER, opacity: 0.28 * intensity }));
  }
  for (const spec of LOGS) children.push(logShape(spec, ember, intensity));
  return group(children, { id: 'hearth' });
}

/* ------------------------------------------------------------------ */
/* Flames                                                              */
/* ------------------------------------------------------------------ */

export const FLAME_COUNT = 5;
const FLAME_SPACING = 15;
const FLAME_WIDTHS = [18, 22, 26, 22, 18] as const;
const FLAME_BASE_HEIGHTS = [38, 50, 60, 50, 38] as const;
/** Paint order: outer tongues first so the centre tongue sits on top. */
const FLAME_ORDER = [0, 4, 1, 3, 2] as const;
const FLAME_OUTLINE: Stroke = { color: OUTLINE, width: 3.2, cap: 'round', join: 'round' };

/**
 * Five cartoon flame tongues across `POT_GEOMETRY.fireBand`. Each tongue's
 * height follows the mean heat of its slice of the cellular automaton so the
 * flames flicker organically; the whole group scales with `fire.intensity`
 * (invisible at 0). Returns `null` when there is nothing to draw.
 */
export function flamesShape(fire: Fire, time: number): Group | null {
  const intensity = fire.intensity;
  if (intensity <= 0.01) return null;
  const colsPerTongue = fire.width / FLAME_COUNT;
  const children: Shape[] = [];
  for (const i of FLAME_ORDER) {
    const c0 = Math.floor(i * colsPerTongue);
    const c1 = Math.max(c0 + 1, Math.floor((i + 1) * colsPerTongue));
    let heat = 0;
    for (let c = c0; c < c1; c++) heat += fire.columnHeat(c);
    heat /= c1 - c0;
    // The CA already scales with intensity; a fully lit centre column averages ≈0.6, the edges ≈0.2.
    const h = Math.min(1.3, heat * 1.6);
    const height = FLAME_BASE_HEIGHTS[i] * (0.5 + h);
    const width = FLAME_WIDTHS[i];
    const cx = POT_GEOMETRY.fireBand.x + POT_GEOMETRY.fireBand.w / 2 + (i - 2) * FLAME_SPACING;
    const lean = Math.sin(time * 7 + i * 1.7) * 4 + (i - 2) * 1.5;
    children.push(
      teardrop(cx, FLAME_BASE_Y, width, height, { fill: FIRE.red, stroke: FLAME_OUTLINE }, lean),
      teardrop(cx, FLAME_BASE_Y - 1, width * 0.74, height * 0.74, { fill: FIRE.orange }, lean * 0.85),
      teardrop(cx, FLAME_BASE_Y - 2, width * 0.5, height * 0.5, { fill: FIRE.yellow }, lean * 0.7),
      teardrop(cx, FLAME_BASE_Y - 3, width * 0.26, height * 0.26, { fill: FIRE.white }, lean * 0.5),
    );
  }
  const cx = POT_GEOMETRY.fireBand.x + POT_GEOMETRY.fireBand.w / 2;
  return group(children, { id: 'flames', transform: around(cx, FLAME_BASE_Y, scale(0.6 + 0.4 * intensity, intensity)) });
}

/* ------------------------------------------------------------------ */
/* Liquid effects                                                      */
/* ------------------------------------------------------------------ */

/** Expanding ellipse ring on the surface; `t` is 0..1 of the ripple's life. */
export function rippleShape(cx: number, cy: number, t: number, liquid: RGB): Shape {
  const rx = 6 + t * 56;
  const ry = rx * (POT_GEOMETRY.mouth.ry / POT_GEOMETRY.mouth.rx);
  return ellipse(cx, cy, rx, ry, {
    stroke: { color: rgbToHex(tintWhite(liquid, 0.4)), width: 3.2 * (1 - t * 0.5), cap: 'round', join: 'round' },
    opacity: 0.9 * (1 - t),
  });
}

/** Rising bubble: small while deep, swelling as it nears the surface. */
export function bubbleShape(x: number, y: number, t: number, liquid: RGB): Shape {
  const r = t < 0.55 ? 2.6 : 2.6 + ((t - 0.55) / 0.45) * 3.2;
  const body = rgbToHex(tintWhite(liquid, 0.22));
  const rim = rgbToHex(tintWhite(liquid, 0.55));
  return group([
    circle(x, y, r, { fill: body, stroke: { color: rim, width: 1.6, cap: 'round', join: 'round' } }),
    circle(x - r * 0.35, y - r * 0.35, r * 0.28, { fill: rim }),
  ]);
}

/** Burst ring left by a popped bubble; `t` is 0..1 over the pop's 0.12 s. */
export function popShape(x: number, y: number, t: number, liquid: RGB): Shape {
  return circle(x, y, 3 + t * 6, {
    stroke: { color: rgbToHex(tintWhite(liquid, 0.5)), width: 2, cap: 'round', join: 'round' },
    opacity: 0.9 * (1 - t),
  });
}

/** Splash droplet above the surface. */
export function dropletShape(x: number, y: number, r: number, fill: string): Shape {
  return circle(x, y, r, { fill });
}

/* ------------------------------------------------------------------ */
/* Steam                                                               */
/* ------------------------------------------------------------------ */

const STEAM_THIN: Stroke = { color: STEAM, width: 4, cap: 'round', join: 'round' };
const STEAM_THICK: Stroke = { color: STEAM, width: 6.5, cap: 'round', join: 'round' };

/**
 * اسلیمی steam curl centred at `(x, y)`: a spiral stroke that fattens towards
 * its outer end. `t` (0..1) drives the scale-up (0.6→1.4) and the fade.
 */
export function steamCurl(x: number, y: number, t: number, turns: number, clockwise: boolean, startDeg: number, size: number, color?: string): Group {
  const s = (0.6 + 0.8 * t) * size;
  const alpha = Math.min(1, t * 5) * Math.pow(1 - t, 0.8) * 0.92;
  // Dense sampling keeps the rasterizer's stroke joins smooth on the tight inner turns.
  const pts = spiralPoints(0, 0, turns, 2, 16, 72, startDeg, clockwise);
  const thin = color ? { ...STEAM_THIN, color } : STEAM_THIN;
  const thick = color ? { ...STEAM_THICK, color } : STEAM_THICK;
  return group(
    [polyline(pts, thin, { opacity: alpha }), polyline(pts.slice(Math.floor(pts.length * 0.45)), thick, { opacity: alpha })],
    { transform: compose(scale(s), translate(x, y)) },
  );
}

/* ------------------------------------------------------------------ */
/* Sparkles                                                            */
/* ------------------------------------------------------------------ */

/** شمسه sparkle: 8-point gold star with a 4-point white star inside; scales in then out over `t` 0..1. */
export function sparkleShape(x: number, y: number, t: number): Group {
  const s = Math.max(0.02, Math.sin(Math.PI * t));
  const rot = t * 60;
  return group(
    [
      star(0, 0, 8, 16, 5.6, { fill: SPARK_GOLD, stroke: { color: OUTLINE, width: 1.6 } }, rot),
      star(0, 0, 4, 7, 2.4, { fill: SPARK_WHITE }, rot + 22.5),
    ],
    { transform: compose(scale(s), translate(x, y)) },
  );
}
