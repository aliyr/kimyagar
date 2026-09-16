/* GENERATED FROM Kimiagar.Works — do not edit.
 * source: src/flat/props.ts
 * sync:   npm run art:sync-works   (scripts/sync-works-flat.mjs)
 * works-commit: 689a5ea
 */
/**
 * Flat-cartoon props: the copper cauldron (دیگ مسی) and the ibex-headed
 * bronze spoon (قاشق برنزی) — vector counterparts of the 32×32 pixel sprites
 * in `src/sprites.ts`, drawn with the shape model from `./shapes.ts` and the
 * cel-shading tones from `./palette.ts`.
 *
 * Style: a slim dark-copper outline on every silhouette, flat fills, one soft
 * shade step (right/bottom) and one highlight step (upper-left), calm rounded
 * forms. Design space is 256×256 units, y down.
 *
 * The cauldron follows the Kimiagar workshop art direction: a wide-bellied
 * copper pot with a thick darker lip, two S-scroll loop handles on the
 * shoulders and a quiet arabesque (اسلیمی) band around the belly — no tripod,
 * no beads, no griffin finials. It rests directly over the hearth.
 *
 * The pot is delivered in three layers so the cooking scene can draw liquid,
 * bubbles and the spoon between them:
 *
 *   potBack()   id 'pot-back'   far lip, dark cavity
 *   potLiquid() id 'pot-liquid' liquid surface ellipse (== POT_GEOMETRY.mouth)
 *   potFront()  id 'pot-front'  body, band, handles, front lip
 */
import {
  around,
  circle,
  ellipse,
  group,
  line,
  lotus,
  outlineStroke,
  path,
  polygon,
  rect,
  scale,
} from './shapes.ts';
import type { Group, Matrix, Path, PathCmd, Point, Polygon, Shape, Stroke, Style } from './shapes.ts';
import { COPPER, COPPER_HIGHLIGHT, GOLD, INTERIOR, LAPIS, OUTLINE, POT_LINE, TURQUOISE, WATER } from './palette.ts';
import type { FlatProp } from './backend.ts';

/* ------------------------------------------------------------------ */
/* Private geometry helpers                                            */
/* ------------------------------------------------------------------ */

const DEG = Math.PI / 180;

function thin(width: number, color: string = OUTLINE): Stroke {
  return { color, width, cap: 'round', join: 'round' };
}

/** Point on an axis-aligned ellipse at `deg` (0 = +x, 90 = +y / down). */
function ptOn(cx: number, cy: number, rx: number, ry: number, deg: number): Point {
  return [cx + Math.cos(deg * DEG) * rx, cy + Math.sin(deg * DEG) * ry];
}

/**
 * Cubic-bezier approximation of the elliptical arc from `a0` to `a1` degrees.
 * Returns only `C` commands — the caller must already be at the arc start.
 */
function arcCmds(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): PathCmd[] {
  const out: PathCmd[] = [];
  const total = a1 - a0;
  const n = Math.max(1, Math.ceil(Math.abs(total) / 90));
  const step = total / n;
  const k = (4 / 3) * Math.tan((step * DEG) / 4);
  for (let i = 0; i < n; i++) {
    const t0 = (a0 + step * i) * DEG;
    const t1 = t0 + step * DEG;
    const x0 = cx + rx * Math.cos(t0);
    const y0 = cy + ry * Math.sin(t0);
    const x1 = cx + rx * Math.cos(t1);
    const y1 = cy + ry * Math.sin(t1);
    out.push([
      'C',
      x0 - k * rx * Math.sin(t0),
      y0 + k * ry * Math.cos(t0),
      x1 + k * rx * Math.sin(t1),
      y1 - k * ry * Math.cos(t1),
      x1,
      y1,
    ]);
  }
  return out;
}

/** Closed ellipse as path commands (so it can be combined with other sub-paths). */
function ellipseCmds(cx: number, cy: number, rx: number, ry: number): PathCmd[] {
  return [['M', cx + rx, cy], ...arcCmds(cx, cy, rx, ry, 0, 360), ['Z']];
}

function translateCmds(cmds: readonly PathCmd[], dx: number, dy: number): PathCmd[] {
  return cmds.map((c): PathCmd => {
    switch (c[0]) {
      case 'M':
      case 'L':
        return [c[0], c[1] + dx, c[2] + dy];
      case 'Q':
        return ['Q', c[1] + dx, c[2] + dy, c[3] + dx, c[4] + dy];
      case 'C':
        return ['C', c[1] + dx, c[2] + dy, c[3] + dx, c[4] + dy, c[5] + dx, c[6] + dy];
      case 'Z':
        return ['Z'];
    }
  });
}

/**
 * Flat cel-shade crescent: the part of `base` NOT covered by a copy of itself
 * shifted by `(dx, dy)` (even-odd XOR). Must be drawn inside a group clipped
 * to `base`, otherwise the shifted copy shows outside the silhouette.
 */
function crescent(base: readonly PathCmd[], dx: number, dy: number, fill: string, style: Style = {}): Path {
  return path([...base, ...translateCmds(base, dx, dy)], { fill, fillRule: 'evenodd', ...style });
}

/** Tapered ribbon along a cubic bezier (horns, beaks). Width goes `w0` → `w1`. */
function taperedCurve(
  p0: Point,
  c1: Point,
  c2: Point,
  p1: Point,
  w0: number,
  w1: number,
  style: Style = {},
  segments = 16,
): Polygon {
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const d = t * t * t;
    const x = a * p0[0] + b * c1[0] + c * c2[0] + d * p1[0];
    const y = a * p0[1] + b * c1[1] + c * c2[1] + d * p1[1];
    const dx = 3 * mt * mt * (c1[0] - p0[0]) + 6 * mt * t * (c2[0] - c1[0]) + 3 * t * t * (p1[0] - c2[0]);
    const dy = 3 * mt * mt * (c1[1] - p0[1]) + 6 * mt * t * (c2[1] - c1[1]) + 3 * t * t * (p1[1] - c2[1]);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w = (w0 + (w1 - w0) * t) / 2;
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
  }
  right.reverse();
  return polygon([...left, ...right], style);
}

/** Mirror across the vertical line x = `x`. */
function mirrorX(x: number): Matrix {
  return around(x, 0, scale(-1, 1));
}

/* ------------------------------------------------------------------ */
/* Pot — geometry                                                      */
/* ------------------------------------------------------------------ */

export const POT_SIZE = 256;

/** Slim cauldron outline (≈60 % of the default cartoon outline). */
const P_OL: Stroke = { color: POT_LINE, width: outlineStroke(POT_SIZE, POT_LINE).width * 0.62, cap: 'round', join: 'round' };

/** Outer edge of the thick lip. */
const RIM = { cx: 128, cy: 54, rx: 104, ry: 24 } as const;
/** Liquid surface / inner edge of the lip. */
const MOUTH = { cx: 128, cy: 53, rx: 88, ry: 15 } as const;
/** The dark cavity is the mouth grown by this much (thin dark ring around the liquid). */
const CAVITY_GROW = 3;
/** Hidden top edge of the body — tucked under the front lip. */
const NECK = { rx: 98, ry: 21 } as const;
const BELLY_RX = 104;
const BELLY_Y = 132;
/** Lowest point of the rounded bottom. */
const BODY_BOTTOM = 214;
/** Arabesque band (centre line, half height, perspective sag). */
const BAND_Y = 146;
const BAND_HALF = 24;
const BAND_SAG = 7;
/**
 * Base line the pot "stands" on: squash & stretch pivot and hearth alignment.
 * The rounded body ends a little above it so the flames lick its bottom.
 */
const BASE_Y = 244;
/** S-scroll handle: attachment at the left shoulder (right one is mirrored). */
const HANDLE_ATTACH: Point = [34, 78];
const HANDLE_TOP_Y = 66;

export const POT_GEOMETRY = {
  size: 256,
  bottomCenter: [128, BASE_Y] as readonly [number, number],
  rim: { ...RIM },
  mouth: { ...MOUTH },
  cavityDepth: MOUTH.ry + CAVITY_GROW,
  belly: { cx: 128, cy: BELLY_Y, rx: BELLY_RX, ry: (BODY_BOTTOM - RIM.cy) / 2 },
  bandY: BAND_Y,
  /** Kept for API compatibility: the base line (there are no legs any more). */
  legsBottomY: BASE_Y,
  /** Lowest point of the body silhouette. */
  bodyBottomY: BODY_BOTTOM,
  handleTopY: HANDLE_TOP_Y,
  fireBand: { x: 96, y: 200, w: 64, h: 44 },
} as const satisfies {
  size: 256;
  bottomCenter: readonly [number, number];
  rim: { cx: number; cy: number; rx: number; ry: number };
  mouth: { cx: number; cy: number; rx: number; ry: number };
  cavityDepth: number;
  belly: { cx: number; cy: number; rx: number; ry: number };
  bandY: number;
  legsBottomY: number;
  bodyBottomY: number;
  handleTopY: number;
  fireBand: { x: number; y: number; w: number; h: number };
};

export interface PotOptions {
  /** Fill of the liquid surface ellipse. Default 'var(--liquid, #3f6f8f)' (SVG custom property with fallback). */
  liquid?: string;
  /** Cartoon squash & stretch, scale applied around POT_GEOMETRY.bottomCenter. Default {sx:1, sy:1}. */
  squash?: { sx: number; sy: number };
  /** Include the liquid ellipse layer (default true). */
  includeLiquid?: boolean;
}

/** Body silhouette: shoulders under the lip, wide belly, rounded bottom, top arc hidden under the front lip. */
function bodyCmds(): PathCmd[] {
  const cx = 128;
  const l = cx - BELLY_RX;
  const r = cx + BELLY_RX;
  const [sx0, sy0] = ptOn(cx, RIM.cy, NECK.rx, NECK.ry, 180);
  const [sx1] = ptOn(cx, RIM.cy, NECK.rx, NECK.ry, 0);
  return [
    ['M', sx0, sy0],
    ['C', sx0 - 4, sy0 + 22, l, BELLY_Y - 22, l, BELLY_Y],
    ['C', l, BELLY_Y + 46, cx - 70, BODY_BOTTOM, cx, BODY_BOTTOM],
    ['C', cx + 70, BODY_BOTTOM, r, BELLY_Y + 46, r, BELLY_Y],
    ['C', r, BELLY_Y - 22, sx1 + 4, sy0 + 22, sx1, sy0],
    ...arcCmds(cx, RIM.cy, NECK.rx, NECK.ry, 0, 180),
    ['Z'],
  ];
}

/** Sagging horizontal curve (perspective of a band wrapped round the belly). */
function sagCmds(y: number): PathCmd[] {
  return [
    ['M', 0, y],
    ['Q', 128, y + BAND_SAG * 2, 256, y],
  ];
}

function sagY(y: number, x: number): number {
  const u = x / 256;
  return y + BAND_SAG * 4 * u * (1 - u);
}

/**
 * Left S-scroll loop handle riveted to the shoulder (mirror for the right).
 * Drawn as two strokes: the outline underneath, the copper on top.
 */
function scrollHandle(id: string): Group {
  const [ax, ay] = HANDLE_ATTACH;
  const curve: PathCmd[] = [
    ['M', ax, ay],
    ['C', ax - 16, ay - 14, ax - 30, ay - 8, ax - 27, ay + 6],
    ['C', ax - 25, ay + 18, ax - 16, ay + 22, ax - 12, ay + 30],
    ['C', ax - 9, ay + 37, ax - 16, ay + 42, ax - 20, ay + 37],
  ];
  const w = 8;
  return group(
    [
      path(curve, { stroke: { color: POT_LINE, width: w + P_OL.width * 1.6, cap: 'round', join: 'round' } }),
      path(curve, { stroke: { color: COPPER.base, width: w, cap: 'round', join: 'round' } }),
      path(curve.slice(0, 2), { stroke: { color: COPPER.light, width: 2, cap: 'round', join: 'round' }, opacity: 0.7 }),
      // Rivet where the scroll meets the shoulder.
      circle(ax, ay, 4.2, { fill: COPPER.shade, stroke: P_OL }),
      circle(ax - 1.2, ay - 1.2, 1.3, { fill: COPPER.light }),
    ],
    { id },
  );
}

/* ------------------------------------------------------------------ */
/* Pot — layers                                                        */
/* ------------------------------------------------------------------ */

/** Everything behind the liquid: back half of the lip and the dark cavity. */
export function potBack(): Group {
  const rimRing = path([...ellipseCmds(RIM.cx, RIM.cy, RIM.rx, RIM.ry), ...ellipseCmds(MOUTH.cx, MOUTH.cy, MOUTH.rx, MOUTH.ry)], {
    id: 'pot-rim-back',
    fill: COPPER.shade,
    fillRule: 'evenodd',
    stroke: P_OL,
  });
  const cavity = ellipse(MOUTH.cx, MOUTH.cy, MOUTH.rx + CAVITY_GROW, MOUTH.ry + CAVITY_GROW, {
    id: 'pot-cavity',
    fill: INTERIOR.shade,
    stroke: thin(2.5, POT_LINE),
  });
  return group([rimRing, cavity], { id: 'pot-back' });
}

/**
 * Liquid surface ellipse (== POT_GEOMETRY.mouth by default). No outline — the front lip covers its edge.
 * Pass `mouth` when a host pot has a different opening (see `SceneOptions.mouth`).
 */
export function potLiquid(fill: string = `var(--liquid, ${WATER})`, mouth: { cx: number; cy: number; rx: number; ry: number } = MOUTH): Shape {
  const surface = ellipse(mouth.cx, mouth.cy, mouth.rx, mouth.ry, { fill });
  const glintPts: Point[] = [];
  const glintRy = Math.max(2, mouth.ry - 5);
  for (let a = 196; a <= 250; a += 6) glintPts.push(ptOn(mouth.cx, mouth.cy, mouth.rx - 7, glintRy, a));
  const glint = polygon(glintPts, { closed: false, stroke: thin(3, '#ffffff'), opacity: 0.35 });
  return group([surface, glint], { id: 'pot-liquid' });
}

/** Body with soft shading, arabesque band, scroll handles and the front half of the lip. */
export function potFront(): Group {
  const body = bodyCmds();
  const bodyClip = path(body);

  /* --- body with cel shade + highlight --- */
  const bodyFill = path(body, { id: 'pot-body', fill: COPPER.base });
  const bodyShade = group([crescent(body, -14, -12, COPPER.shade, { opacity: 0.55 })], { clip: bodyClip });
  const highlight = group(
    [
      path(
        [
          ['M', 50, 92],
          ['Q', 36, 108, 34, 130],
        ],
        { stroke: thin(9, COPPER.light), opacity: 0.75 },
      ),
      circle(60, 84, 3.5, { fill: COPPER.light, opacity: 0.75 }),
    ],
    { id: 'pot-highlight' },
  );

  /* --- arabesque band: two thin rules with lotus palmettes and scroll dots --- */
  const bandTop = BAND_Y - BAND_HALF;
  const bandBottom = BAND_Y + BAND_HALF;
  const motifs: Shape[] = [];
  for (const deg of [-64, -32, 0, 32, 64]) {
    const x = 128 + BELLY_RX * Math.sin(deg * DEG);
    const w = 26 * Math.cos(deg * DEG);
    motifs.push(lotus(x, sagY(bandBottom, x) - 7, w, 26, { fill: COPPER.shade }, 2));
  }
  for (const deg of [-48, -16, 16, 48]) {
    const x = 128 + BELLY_RX * Math.sin(deg * DEG);
    const r = 4.2 * (0.6 + 0.4 * Math.cos(deg * DEG));
    const y = sagY(BAND_Y - 6, x);
    motifs.push(circle(x, y, r, { fill: COPPER.shade }), circle(x - r * 0.3, y - r * 0.3, r * 0.35, { fill: COPPER.base }));
  }
  const bandGroup = group(
    [
      ...motifs,
      path(sagCmds(bandTop), { stroke: thin(2.2, COPPER.shade) }),
      path(sagCmds(bandBottom), { stroke: thin(2.2, COPPER.shade) }),
    ],
    { id: 'pot-band', clip: bodyClip },
  );
  const bodyOutline = path(body, { stroke: P_OL });

  /* --- handles --- */
  const handleL = scrollHandle('pot-handle-left');
  const handleR = group([scrollHandle('pot-handle-right-scroll')], { id: 'pot-handle-right', transform: mirrorX(128) });

  /* --- front half of the thick lip --- */
  const [ox0, oy0] = ptOn(RIM.cx, RIM.cy, RIM.rx, RIM.ry, 0);
  const rimFront = path(
    [
      ['M', ox0, oy0],
      ...arcCmds(RIM.cx, RIM.cy, RIM.rx, RIM.ry, 0, 180),
      ['L', ...ptOn(MOUTH.cx, MOUTH.cy, MOUTH.rx, MOUTH.ry, 180)],
      ...arcCmds(MOUTH.cx, MOUTH.cy, MOUTH.rx, MOUTH.ry, 180, 0),
      ['Z'],
    ],
    { id: 'pot-rim-front', fill: COPPER.shade, stroke: P_OL },
  );
  const lipRx = (RIM.rx + MOUTH.rx) / 2;
  const lipRy = (RIM.ry + MOUTH.ry) / 2 + 0.5;
  const lipCy = (RIM.cy + MOUTH.cy) / 2 + 0.5;
  const lipGlintPts: Point[] = [];
  for (let a = 118; a <= 160; a += 6) lipGlintPts.push(ptOn(RIM.cx, lipCy, lipRx, lipRy, a));
  const lipGlint = polygon(lipGlintPts, { closed: false, stroke: thin(2.4, COPPER.light), opacity: 0.55 });

  return group([handleL, handleR, bodyFill, bodyShade, bandGroup, highlight, bodyOutline, rimFront, lipGlint], { id: 'pot-front' });
}

/** Complete pot: [potBack, potLiquid, potFront] with optional squash & stretch. */
export function potShape(opts: PotOptions = {}): Group {
  const { liquid, squash = { sx: 1, sy: 1 }, includeLiquid = true } = opts;
  const layers: Shape[] = [potBack()];
  if (includeLiquid) layers.push(potLiquid(liquid));
  layers.push(potFront());
  const [px, py] = POT_GEOMETRY.bottomCenter;
  const transform = squash.sx === 1 && squash.sy === 1 ? undefined : around(px, py, scale(squash.sx, squash.sy));
  return group(layers, { id: 'pot', transform });
}

/* ------------------------------------------------------------------ */
/* Spoon                                                               */
/* ------------------------------------------------------------------ */

export const SPOON_SIZE = 256;

const S_OL = outlineStroke(SPOON_SIZE, OUTLINE);
const SP_CX = 128;
const BOWL = { cx: SP_CX, cy: 210, rx: 34, ry: 38 } as const;
const HANDLE_W = 14;
const HANDLE_TOP = 96; // just under the disc
const HANDLE_BOTTOM = 182; // tucked inside the bowl
const DISC = { cy: 88, r: 11 } as const;
/** Ibex skull centre; head geometry below is local to this point. */
const SKULL: Point = [130, 54];
/** Near horn (local to SKULL): base → tip, sweeping up and back (right). */
const NEAR_HORN = { p0: [5, -12], c1: [-2, -35], c2: [18, -50], p1: [34, -38], w0: 14, w1: 4 } as const;
const FAR_HORN = { p0: [12, -10], c1: [8, -31], c2: [28, -46], p1: [42, -32], w0: 12, w1: 4 } as const;

/** Topmost point of the near horn's outer edge (the top of the finial). */
function hornApex(): Point {
  const poly = taperedCurve(
    [SKULL[0] + NEAR_HORN.p0[0], SKULL[1] + NEAR_HORN.p0[1]],
    [SKULL[0] + NEAR_HORN.c1[0], SKULL[1] + NEAR_HORN.c1[1]],
    [SKULL[0] + NEAR_HORN.c2[0], SKULL[1] + NEAR_HORN.c2[1]],
    [SKULL[0] + NEAR_HORN.p1[0], SKULL[1] + NEAR_HORN.p1[1]],
    NEAR_HORN.w0,
    NEAR_HORN.w1,
  );
  let best: Point = poly.points[0];
  for (const p of poly.points) if (p[1] < best[1]) best = p;
  return [Math.round(best[0] * 10) / 10, Math.round(best[1] * 10) / 10];
}

const HORN_APEX = hornApex();

export const SPOON_GEOMETRY = {
  size: 256,
  bowl: { ...BOWL },
  handleTop: HORN_APEX,
  grip: [SP_CX, 124] as readonly [number, number],
  length: BOWL.cy + BOWL.ry - HORN_APEX[1],
} as const satisfies {
  size: 256;
  bowl: { cx: number; cy: number; rx: number; ry: number };
  handleTop: readonly [number, number];
  grip: readonly [number, number];
  length: number;
};

/** Ibex horn: tapered gold ribbon with transverse ridge ticks. Coordinates local to SKULL. */
function horn(spec: typeof NEAR_HORN | typeof FAR_HORN, fill: string, ridgeTs: readonly number[]): Group {
  const [sx, sy] = SKULL;
  const p0: Point = [sx + spec.p0[0], sy + spec.p0[1]];
  const c1: Point = [sx + spec.c1[0], sy + spec.c1[1]];
  const c2: Point = [sx + spec.c2[0], sy + spec.c2[1]];
  const p1: Point = [sx + spec.p1[0], sy + spec.p1[1]];
  const ribbon = taperedCurve(p0, c1, c2, p1, spec.w0, spec.w1, { fill, stroke: thin(4) });
  const ridges: Shape[] = [];
  for (const t of ridgeTs) {
    const mt = 1 - t;
    const x = mt ** 3 * p0[0] + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t ** 3 * p1[0];
    const y = mt ** 3 * p0[1] + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t ** 3 * p1[1];
    const dx = 3 * mt * mt * (c1[0] - p0[0]) + 6 * mt * t * (c2[0] - c1[0]) + 3 * t * t * (p1[0] - c2[0]);
    const dy = 3 * mt * mt * (c1[1] - p0[1]) + 6 * mt * t * (c2[1] - c1[1]) + 3 * t * t * (p1[1] - c2[1]);
    const len = Math.hypot(dx, dy) || 1;
    const w = (spec.w0 + (spec.w1 - spec.w0) * t) / 2 - 1.5;
    const nx = (-dy / len) * w;
    const ny = (dx / len) * w;
    ridges.push(line(x + nx, y + ny, x - nx, y - ny, thin(2, GOLD.shade)));
  }
  return group([ribbon, ...ridges]);
}

/** Ibex head (بز کوهی) in profile facing left, with lyre horns, beard, disc and neck. */
function spoonHead(): Group {
  const [sx, sy] = SKULL;
  const farHorn = horn(FAR_HORN, GOLD.shade, []);
  const nearHorn = horn(NEAR_HORN, GOLD.base, [0.28, 0.44, 0.6]);
  const ear = polygon(
    [
      [sx + 10, sy - 6],
      [sx + 25, sy - 13],
      [sx + 15, sy + 4],
    ],
    { fill: COPPER.base, stroke: S_OL },
  );
  const neck = rect(sx - 9, sy + 12, 16, 20, { fill: COPPER.base, stroke: S_OL });
  const neckShade = rect(sx + 2, sy + 12, 5, 20, { fill: COPPER.shade });
  const headCmds: PathCmd[] = [
    ['M', sx + 13, sy - 13],
    ['C', sx + 21, sy - 8, sx + 21, sy + 8, sx + 14, sy + 15],
    ['C', sx + 6, sy + 21, sx - 8, sy + 20, sx - 16, sy + 15],
    ['L', sx - 19, sy + 26],
    ['L', sx - 22, sy + 15],
    ['C', sx - 27, sy + 13, sx - 30, sy + 8, sx - 27, sy + 3],
    ['C', sx - 24, sy - 1, sx - 18, sy - 3, sx - 13, sy - 5],
    ['C', sx - 8, sy - 11, sx + 2, sy - 16, sx + 13, sy - 13],
    ['Z'],
  ];
  const head = path(headCmds, { fill: COPPER.base, stroke: S_OL });
  const headShade = group([crescent(headCmds, -4, -6, COPPER.shade)], { clip: path(headCmds) });
  const headLight = ellipse(sx + 1, sy - 6, 7, 4, { fill: COPPER.light });
  const eye = circle(sx - 6, sy + 1, 3, { fill: OUTLINE });
  const glint = circle(sx - 7, sy, 1.1, { fill: '#ffffff' });
  const nostril = circle(sx - 24, sy + 8, 1.4, { fill: OUTLINE });
  const mouth = line(sx - 25, sy + 12, sx - 18, sy + 13.5, thin(1.8));
  const disc = circle(SP_CX, DISC.cy, DISC.r, { fill: GOLD.base, stroke: S_OL });
  const discLight = circle(SP_CX - 4.5, DISC.cy - 4.5, 2.2, { fill: GOLD.light });
  const inlay = circle(SP_CX, DISC.cy, 6, { fill: TURQUOISE.base, stroke: thin(2) });
  const inlayLight = circle(SP_CX - 2, DISC.cy - 2, 1.8, { fill: TURQUOISE.light });
  return group(
    [farHorn, nearHorn, ear, neck, neckShade, head, headShade, headLight, eye, glint, nostril, mouth, disc, discLight, inlay, inlayLight],
    { id: 'spoon-head' },
  );
}

function spoonHandle(): Group {
  const hw = HANDLE_W / 2;
  const flareY = HANDLE_BOTTOM - 18;
  const cmds: PathCmd[] = [
    ['M', SP_CX - hw, HANDLE_TOP],
    ['L', SP_CX + hw, HANDLE_TOP],
    ['L', SP_CX + hw, flareY],
    ['C', SP_CX + hw, flareY + 10, SP_CX + hw + 8, HANDLE_BOTTOM - 6, SP_CX + hw + 10, HANDLE_BOTTOM],
    ['L', SP_CX - hw - 10, HANDLE_BOTTOM],
    ['C', SP_CX - hw - 8, HANDLE_BOTTOM - 6, SP_CX - hw, flareY + 10, SP_CX - hw, flareY],
    ['Z'],
  ];
  const shaft = path(cmds, { fill: COPPER.base, stroke: S_OL });
  const shade = group([rect(SP_CX + hw - 5, HANDLE_TOP, 5 + 12, HANDLE_BOTTOM - HANDLE_TOP, { fill: COPPER.shade })], {
    clip: path(cmds),
  });
  const light = rect(SP_CX - hw + 2, HANDLE_TOP + 4, 2.5, flareY - HANDLE_TOP - 6, { rx: 1.25, fill: COPPER.light });
  const rings: Shape[] = [];
  for (const y of [112, 156]) {
    rings.push(
      rect(SP_CX - hw - 3, y - 4.5, HANDLE_W + 6, 9, { rx: 3, fill: GOLD.base, stroke: S_OL }),
      rect(SP_CX - hw - 1, y - 3, 6, 2.5, { rx: 1.2, fill: GOLD.light }),
    );
  }
  const stud = group(
    [circle(SP_CX, 134, 4.5, { fill: LAPIS.base, stroke: thin(2.5) }), circle(SP_CX - 1.4, 132.6, 1.4, { fill: LAPIS.light })],
    { id: 'spoon-stud' },
  );
  return group([shaft, shade, light, ...rings, stud], { id: 'spoon-handle' });
}

function spoonBowl(): Group {
  const outer = ellipseCmds(BOWL.cx, BOWL.cy, BOWL.rx, BOWL.ry);
  const shell = path(outer, { fill: COPPER.base, stroke: S_OL });
  const shellShade = group([crescent(outer, -5, -6, COPPER.shade)], { clip: path(outer) });
  const inner = { cx: BOWL.cx, cy: BOWL.cy - 4, rx: BOWL.rx - 10, ry: BOWL.ry - 12 };
  const innerCmds = ellipseCmds(inner.cx, inner.cy, inner.rx, inner.ry);
  const cavity = path(innerCmds, { fill: INTERIOR.base, stroke: thin(3) });
  const cavityShade = group([crescent(innerCmds, 0, 7, INTERIOR.shade)], { clip: path(innerCmds) });
  const cavityLight = ellipse(inner.cx + 4, inner.cy + inner.ry - 9, 9, 3.5, { fill: INTERIOR.light });
  const lipGlint = polygon(
    [ptOn(BOWL.cx, BOWL.cy, BOWL.rx - 5, BOWL.ry - 6, 200), ptOn(BOWL.cx, BOWL.cy, BOWL.rx - 5, BOWL.ry - 6, 222), ptOn(BOWL.cx, BOWL.cy, BOWL.rx - 5, BOWL.ry - 6, 244)],
    { closed: false, stroke: thin(3.5, COPPER_HIGHLIGHT) },
  );
  return group([shell, shellShade, cavity, cavityShade, cavityLight, lipGlint], { id: 'spoon-bowl' });
}

/** Vertical spoon: ibex head at the top, bowl at the bottom, centred horizontally. */
export function spoonShape(): Group {
  return group([spoonHandle(), spoonBowl(), spoonHead()], { id: 'spoon' });
}

/* ------------------------------------------------------------------ */
/* Prop descriptors                                                    */
/* ------------------------------------------------------------------ */

export const POT_PROP: FlatProp = {
  id: 'pot',
  name: 'دیگ مسی',
  nameEn: 'Copper cauldron',
  description:
    'دیگ مسیِ شکم‌دار به سبک کارتونی تخت: لبهٔ پهن و تیره، دو دستهٔ حلقه‌ای اسلیمی روی شانه‌ها و نوار آرام نقش اسلیمی دور شکم؛ بدون پایه، درست بالای آتش.',
  size: POT_SIZE,
  shape: () => potShape(),
};

export const SPOON_PROP: FlatProp = {
  id: 'spoon',
  name: 'قاشق برنزی',
  nameEn: 'Bronze spoon',
  description:
    'قاشق بلند برنزی به سبک کارتونی تخت با سرِ بز کوهی و شاخ‌های طلایی خمیده، قرص طلا با نگین فیروزه، دو حلقهٔ طلا و مهرهٔ لاجورد روی دسته، و کاسهٔ گودِ بیضی.',
  size: SPOON_SIZE,
  shape: () => spoonShape(),
};

export const FLAT_PROPS: readonly FlatProp[] = [POT_PROP, SPOON_PROP];
