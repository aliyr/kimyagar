/* GENERATED FROM Kimiagar.Works — do not edit.
 * source: src/flat/ingredients.ts
 * sync:   npm run art:sync-works   (scripts/sync-works-flat.mjs)
 * works-commit: 689a5ea
 */
/**
 * Flat-cartoon ingredient props — زعفران، خشخاش، گل گاو زبان، بابونه، نعناع، زنجبیل.
 *
 * Each ingredient is drawn in a 96×96 design square (y down), centred on
 * (48, 48) with ≈8 units of margin so the idle bob/tilt never clips. Thick
 * `OUTLINE` strokes on every silhouette edge, flat palette fills only, one
 * flat shade step + one flat highlight (two-step cel shading).
 *
 * `staticShape()` is the motionless prop (falling state / static PNG).
 * `shape(t)` wraps it in the idle bob/tilt (`#idle-bob`) and adds a blinking
 * golden glint (`#idle-glint`); `ingredientIdleCss()` produces CSS keyframes
 * driven by the same `IDLE` constants so JS-less SVGs match the frame sheets.
 */
import type { FlatProp } from './backend.ts';
import {
  BORAGE,
  CHAMOMILE_WHITE,
  GINGER,
  GINGER_FLESH,
  GOLD,
  LEAF,
  MINT,
  OUTLINE,
  POPPY_POD,
  POPPY_SEED,
  SAFFRON_RED,
  SPARK_GOLD,
  YELLOW,
} from './palette.ts';
import type { Group, Matrix, Path, PathCmd, Point, Shape, Style } from './shapes.ts';
import {
  around,
  circle,
  compose,
  ellipse,
  group,
  outlineStroke,
  path,
  polygon,
  rect,
  rotate,
  star,
  teardrop,
  translate,
  withStyle,
} from './shapes.ts';

export const INGREDIENT_SIZE = 96;

/** Idle animation constants — shared by shape(t) and the CSS keyframes so both stay in sync. */
export const IDLE = {
  period: 2.4, // seconds per loop
  bob: 3, // vertical amplitude in design units (sinusoidal)
  tiltDeg: 4, // rotation amplitude in degrees (sinusoidal, phase-shifted 90° from bob)
  glintPeriod: 2.4, // the golden sparkle blinks once per period
} as const;

export type BitKind = 'thread' | 'seed' | 'petal' | 'dot';

export interface FlatIngredient extends FlatProp {
  /** Colour this ingredient pushes the liquid towards once dissolved (same values as src/sprites.ts INGREDIENTS). */
  tint: string;
  /** Weight vs other ingredients (same values as src/sprites.ts). */
  strength: number;
  /** Floating specks left on the surface after landing: count, shape kind, colours (hex). */
  bits: { count: number; kind: BitKind; colors: readonly string[]; size: number /* design units in the 512 scene, ~4–10 */ };
  /** Static shape (no idle motion), for the "falling" state in the scene and static PNG export. */
  staticShape(): Group;
  /** Shape at idle time t (seconds): staticShape wrapped in bob/tilt transform around the centre plus a blinking golden glint. */
  shape(t?: number): Group;
}

/* ------------------------------------------------------------------ */
/* Private helpers                                                     */
/* ------------------------------------------------------------------ */

const S = INGREDIENT_SIZE;
const C = S / 2; // 48 — design centre, also the idle pivot
const OUT = outlineStroke(S, OUTLINE);
const TAU = Math.PI * 2;

/** Fill + cartoon outline. */
function solid(fill: string): Style {
  return { fill, stroke: OUT };
}

/** Fill only (interior cel-shade / highlight patches never get their own outline). */
function flat(fill: string): Style {
  return { fill };
}

/** Rotates `shape` by `deg` around the design centre. */
function spun(shape: Shape, deg: number, cx = C, cy = C): Shape {
  return deg === 0 ? shape : withStyle(shape, { transform: around(cx, cy, rotate(deg)) });
}

/**
 * Tapered strand from `(x0, y0)` (width `wBase`) to `(x1, y1)` (width `wTip`)
 * with a rounded tip; `bend` bows the strand sideways (perpendicular, in units).
 */
function strand(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  wBase: number,
  wTip: number,
  bend: number,
  style: Style = {},
): Path {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const mx = (x0 + x1) / 2 + nx * bend;
  const my = (y0 + y1) / 2 + ny * bend;
  const hb = wBase / 2;
  const ht = wTip / 2;
  const hm = (hb + ht) / 2;
  const cmds: PathCmd[] = [
    ['M', x0 + nx * hb, y0 + ny * hb],
    ['Q', mx + nx * hm, my + ny * hm, x1 + nx * ht, y1 + ny * ht],
    ['Q', x1 + ux * ht * 1.3, y1 + uy * ht * 1.3, x1 - nx * ht, y1 - ny * ht],
    ['Q', mx - nx * hm, my - ny * hm, x0 - nx * hb, y0 - ny * hb],
    ['Z'],
  ];
  return path(cmds, style);
}

/** Polygon points of a regular n-gon (used for the tiny seed cluster). */
function ringPoints(cx: number, cy: number, n: number, r: number, startDeg = -90): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((startDeg + (i * 360) / n) * Math.PI) / 180;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/* ------------------------------------------------------------------ */
/* Designs                                                             */
/* ------------------------------------------------------------------ */

/** زعفران — a pinch of red stigma threads fanning from a yellow style, tied with a gold thread. */
function saffronBody(): Shape[] {
  const bx = 48;
  const by = 62; // where the threads converge
  const threads: { angle: number; len: number; bend: number; back: boolean }[] = [
    { angle: -52, len: 33, bend: 4, back: true },
    { angle: 50, len: 32, bend: -4, back: true },
    { angle: -30, len: 38, bend: -3, back: false },
    { angle: 31, len: 37, bend: 3, back: false },
    { angle: -9, len: 41, bend: 3, back: false },
    { angle: 12, len: 40, bend: -3, back: false },
  ];
  const drawThread = (th: (typeof threads)[number]): Shape[] => {
    const a = ((th.angle - 90) * Math.PI) / 180;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const tx = bx + ux * th.len;
    const ty = by + uy * th.len;
    const body = strand(bx, by, tx, ty, 7, 4.6, th.bend, solid(th.back ? SAFFRON_RED.shade : SAFFRON_RED.base));
    // Light stigma tip: an oversized patch clipped to the thread body so it never spills over the outline.
    const tipLen = th.len * 0.3;
    const tip = withStyle(
      strand(tx - ux * tipLen, ty - uy * tipLen, tx + ux * 2, ty + uy * 2, 4, 8, th.bend * 0.25, flat(SAFFRON_RED.light)),
      { clip: body },
    );
    return [body, tip];
  };

  const back = threads.filter((t) => t.back).flatMap(drawThread);
  const front = threads.filter((t) => !t.back).flatMap(drawThread);

  // Yellow style: tapered stalk hanging below the knot.
  const stalk = strand(bx, by + 2, bx - 3, 84, 8, 4.5, 2, solid(YELLOW.base));
  const stalkShade = strand(bx + 1.5, by + 6, bx - 1.2, 82, 2.6, 1.6, 1.5, flat(YELLOW.shade));

  // Gold thread tying the pinch together.
  const tie = rect(bx - 7.5, by - 3, 15, 6, { ...solid(GOLD.base), rx: 3 });
  const tieLight = rect(bx - 5.5, by - 1.6, 5, 1.8, { ...flat(GOLD.light), rx: 0.9 });

  return [...back, stalk, stalkShade, ...front, tie, tieLight];
}

/** خشخاش — plump green seed pod with a ridged crown, short stem and spilled seeds. */
function poppyBody(): Shape[] {
  const px = 48;
  const py = 49;
  const rx = 21;
  const ry = 23;

  // Stem (outline pass + colour pass so the stroke gets a cartoon outline).
  const stemPts: Point[] = [
    [px, py + ry - 4],
    [px + 1.5, 82],
  ];
  const stemOutline = polygon(stemPts, { closed: false, stroke: { ...OUT, width: 6 + OUT.width * 2 } });
  const stem = polygon(stemPts, { closed: false, stroke: { color: LEAF.shade, width: 6 } });

  // Spilled seeds at the base.
  const seedSpots: Point[] = [
    [34, 79],
    [40.5, 84],
    [56, 83.5],
    [62, 78.5],
    [30, 84.5],
  ];
  const seeds = seedSpots.map(([x, y]) => circle(x, y, 3, solid(POPPY_SEED)));

  const pod = ellipse(px, py, rx, ry, solid(POPPY_POD.base));
  // Flat shade: right/lower crescent = shade ellipse with an up-left offset base copy on top.
  const podShade = ellipse(px, py, rx, ry, flat(POPPY_POD.shade));
  const podShadeMask = ellipse(px - 2.5, py - 2.5, rx - 3, ry - 3, flat(POPPY_POD.base));
  const podLight = ellipse(px - 8, py - 8, 5, 8, {
    ...flat(POPPY_POD.light),
    transform: around(px - 8, py - 8, rotate(20)),
  });
  // Faint vertical ridge hints (poppy pods are segmented).
  const ridgeL = strand(px - 9, py - ry + 6, px - 9, py + ry - 7, 1.8, 1.8, -1.5, flat(POPPY_POD.shade));
  const ridgeR = strand(px + 9, py - ry + 6, px + 9, py + ry - 7, 1.8, 1.8, 1.5, flat(POPPY_POD.shade));

  // Neck + ridged crown (star disc seen from slightly above).
  const neck = rect(px - 8, py - ry - 3, 16, 7, { ...solid(POPPY_POD.shade), rx: 2.5 });
  const crownY = py - ry - 3;
  const squash: Matrix = [1, 0, 0, 0.42, 0, 0];
  const crownOuter = withStyle(star(px, crownY, 11, 19, 15.5, solid(POPPY_POD.light)), {
    transform: around(px, crownY, squash),
  });
  const crownDisc = withStyle(star(px, crownY, 11, 12.5, 10, flat(POPPY_POD.base)), {
    transform: around(px, crownY, squash),
  });
  const crownDot = ellipse(px, crownY, 3.4, 1.5, flat(POPPY_POD.shade));

  return [
    stemOutline,
    stem,
    ...seeds,
    pod,
    podShade,
    podShadeMask,
    ridgeL,
    ridgeR,
    podLight,
    neck,
    crownOuter,
    crownDisc,
    crownDot,
  ];
}

/** گل گاو زبان — five-pointed violet star flower with a white ring and dark anther cone. */
function borageBody(): Shape[] {
  const cx = 48;
  const cy = 46;
  const shapes: Shape[] = [];

  // Green sepals peeking between the petals.
  for (let i = 0; i < 5; i++) {
    const deg = 36 + i * 72;
    shapes.push(spun(teardrop(cx, cy + 4, 9.5, 28, solid(LEAF.base)), deg, cx, cy));
  }

  // Petals: light rim (outlined) + inner flat body (base above, shade for the two lower petals).
  for (let i = 0; i < 5; i++) {
    const deg = i * 72;
    const lower = i === 2 || i === 3;
    shapes.push(spun(teardrop(cx, cy + 6, 19, 38, solid(BORAGE.light)), deg, cx, cy));
    shapes.push(spun(teardrop(cx, cy + 3.5, 13.5, 31, flat(lower ? BORAGE.shade : BORAGE.base)), deg, cx, cy));
  }

  // White five-lobed collar (one lobe per petal) with a lower shade step.
  for (const [x, y] of ringPoints(cx, cy, 5, 6.2, -90)) {
    shapes.push(circle(x, y, 6, solid(CHAMOMILE_WHITE.shade)));
  }
  for (const [x, y] of ringPoints(cx, cy, 5, 6.2, -90)) {
    shapes.push(circle(x, y - 1.2, 5.4, flat(CHAMOMILE_WHITE.base)));
  }

  // Dark cone of anthers seen head-on: a rounded pentagon with one point aimed down.
  shapes.push(star(cx, cy + 0.5, 5, 6.8, 5.6, solid(POPPY_SEED), 180));
  shapes.push(ellipse(cx - 1.8, cy - 2.4, 2, 1.2, { ...flat(BORAGE.light), transform: around(cx - 1.8, cy - 2.4, rotate(-35)) }));

  return shapes;
}

/** بابونه — a daisy: 12 white petals, domed yellow centre, a leaf peeking from behind. */
function chamomileBody(): Shape[] {
  const cx = 48;
  const cy = 46;
  const shapes: Shape[] = [];

  // Stem + leaf behind the flower (lower-left).
  const stemPts: Point[] = [
    [cx, cy + 10],
    [cx - 10, 84],
  ];
  shapes.push(polygon(stemPts, { closed: false, stroke: { ...OUT, width: 5 + OUT.width * 2 } }));
  shapes.push(polygon(stemPts, { closed: false, stroke: { color: LEAF.shade, width: 5 } }));
  const leafBase: Point = [cx - 8, 74];
  shapes.push(
    withStyle(teardrop(leafBase[0], leafBase[1], 11, 24, solid(LEAF.base)), {
      transform: around(leafBase[0], leafBase[1], rotate(-118)),
    }),
  );
  shapes.push(
    withStyle(teardrop(leafBase[0], leafBase[1] - 1, 4.5, 17, flat(LEAF.light)), {
      transform: around(leafBase[0], leafBase[1], rotate(-118)),
    }),
  );

  // Petals.
  const petalDist = 21;
  const petalRy = 13;
  const petalRx = 5.6;
  for (let i = 0; i < 12; i++) {
    const deg = i * 30;
    const lower = deg >= 120 && deg <= 240;
    shapes.push(
      spun(ellipse(cx, cy - petalDist, petalRx, petalRy, solid(lower ? CHAMOMILE_WHITE.shade : CHAMOMILE_WHITE.base)), deg, cx, cy),
    );
  }
  // Soft highlight streak on the upper petals.
  for (const deg of [-30, 0, 30]) {
    shapes.push(spun(ellipse(cx, cy - petalDist - 3, 1.8, 7, flat(CHAMOMILE_WHITE.light)), deg, cx, cy));
  }

  // Domed yellow centre: shade disc + base dome offset upwards leaves a lower crescent.
  shapes.push(circle(cx, cy, 12.5, solid(YELLOW.shade)));
  shapes.push(ellipse(cx, cy - 1.5, 12.2, 11, flat(YELLOW.base)));
  for (const [x, y] of ringPoints(cx, cy - 1, 6, 5.5, -60)) {
    shapes.push(circle(x, y, 1.5, flat(YELLOW.shade)));
  }
  shapes.push(circle(cx, cy - 1, 1.5, flat(YELLOW.shade)));
  shapes.push(ellipse(cx - 4.5, cy - 6, 2.8, 1.8, { ...flat(YELLOW.light), transform: around(cx - 4.5, cy - 6, rotate(-30)) }));

  return shapes;
}

/** نعناع — a fresh sprig: upright stem, three pairs of serrated leaves and a small top bud. */
function mintBody(): Shape[] {
  const cx = 48;
  const shapes: Shape[] = [];

  // Stem (outline pass + colour pass).
  const stemPts: Point[] = [
    [cx + 1, 86],
    [cx - 1, 22],
  ];
  shapes.push(polygon(stemPts, { closed: false, stroke: { ...OUT, width: 5 + OUT.width * 2 } }));
  shapes.push(polygon(stemPts, { closed: false, stroke: { color: MINT.shade, width: 5 } }));

  /** A serrated leaf growing from `(bx, by)` at `deg` (0 = straight up), `len` long. */
  const leaf = (bx: number, by: number, deg: number, len: number, w: number, shaded: boolean): Shape[] => {
    const body = withStyle(teardrop(bx, by, w, len, solid(shaded ? MINT.shade : MINT.base)), {
      transform: around(bx, by, rotate(deg)),
    });
    // Serrations: tiny notches along both edges, drawn as small dark triangles clipped to the leaf.
    const notches: Shape[] = [];
    for (let i = 1; i <= 3; i++) {
      const y = by - (len * i) / 4.2;
      const half = (w / 2) * (1 - (i / 4) * 0.55);
      for (const side of [-1, 1]) {
        notches.push(
          polygon(
            [
              [bx + side * (half + 1.6), y - 2.2],
              [bx + side * (half - 1.4), y],
              [bx + side * (half + 1.6), y + 2.2],
            ],
            flat(OUTLINE),
          ),
        );
      }
    }
    const midrib = polygon(
      [
        [bx, by - 2],
        [bx, by - len + 4],
      ],
      { closed: false, stroke: { color: MINT.light, width: 1.6, cap: 'round', join: 'round' }, opacity: 0.9 },
    );
    const inner = group([...notches, midrib], { transform: around(bx, by, rotate(deg)) });
    return [body, inner];
  };

  // Three opposite pairs, larger towards the bottom; the right-hand leaves are the shaded ones.
  const pairs: { y: number; len: number; w: number; deg: number }[] = [
    { y: 74, len: 30, w: 16, deg: 62 },
    { y: 56, len: 27, w: 14.5, deg: 54 },
    { y: 40, len: 22, w: 12, deg: 44 },
  ];
  for (const p of pairs) {
    shapes.push(...leaf(cx - 1, p.y, -p.deg, p.len, p.w, false));
    shapes.push(...leaf(cx + 1, p.y, p.deg, p.len, p.w, true));
  }

  // Top bud: two small leaves folded together.
  shapes.push(withStyle(teardrop(cx, 26, 9, 18, solid(MINT.base)), { transform: around(cx, 26, rotate(-10)) }));
  shapes.push(withStyle(teardrop(cx, 26, 7, 15, flat(MINT.light)), { transform: around(cx, 26, rotate(12)) }));

  return shapes;
}

/** زنجبیل — a knobby rhizome: overlapping lobes, one pale cut face and a few root hairs. */
function gingerBody(): Shape[] {
  const shapes: Shape[] = [];

  // Root hairs behind the main body.
  const hairs: [Point, Point][] = [
    [
      [30, 66],
      [22, 78],
    ],
    [
      [58, 70],
      [63, 82],
    ],
    [
      [40, 70],
      [38, 80],
    ],
  ];
  for (const [a, b] of hairs) {
    shapes.push(polygon([a, b], { closed: false, stroke: { ...OUT, width: 3 + OUT.width * 2 } }));
    shapes.push(polygon([a, b], { closed: false, stroke: { color: GINGER.shade, width: 3 } }));
  }

  // Main rhizome: a chain of rounded lobes running from lower-left to upper-right.
  const lobes: { cx: number; cy: number; rx: number; ry: number; deg: number }[] = [
    { cx: 34, cy: 58, rx: 15, ry: 11.5, deg: -25 },
    { cx: 50, cy: 50, rx: 17, ry: 13, deg: -18 },
    { cx: 66, cy: 40, rx: 13, ry: 10.5, deg: -35 },
    { cx: 42, cy: 36, rx: 10, ry: 8.5, deg: 30 },
    { cx: 62, cy: 58, rx: 9.5, ry: 8, deg: 15 },
  ];
  // Outline pass first so inner lobe edges do not cut through each other.
  for (const l of lobes) {
    shapes.push(withStyle(ellipse(l.cx, l.cy, l.rx, l.ry, { stroke: { ...OUT, width: OUT.width * 2 } }), { transform: around(l.cx, l.cy, rotate(l.deg)) }));
  }
  for (const l of lobes) {
    shapes.push(withStyle(ellipse(l.cx, l.cy, l.rx, l.ry, flat(GINGER.base)), { transform: around(l.cx, l.cy, rotate(l.deg)) }));
  }
  // Lower shade crescents on the big lobes.
  for (const l of lobes.slice(0, 3)) {
    shapes.push(
      withStyle(ellipse(l.cx + 2, l.cy + 3.5, l.rx - 3, l.ry - 3, flat(GINGER.shade)), { transform: around(l.cx, l.cy, rotate(l.deg)) }),
      withStyle(ellipse(l.cx, l.cy + 1, l.rx - 3, l.ry - 3, flat(GINGER.base)), { transform: around(l.cx, l.cy, rotate(l.deg)) }),
    );
  }
  // Growth rings: short curved ticks across the lobes.
  for (const [x, y, deg] of [
    [40, 56, -25],
    [46, 47, -18],
    [56, 52, -18],
    [70, 43, -35],
  ] as const) {
    shapes.push(
      withStyle(
        polygon(
          [
            [x, y - 6],
            [x, y + 6],
          ],
          { closed: false, stroke: { color: GINGER.shade, width: 1.8, cap: 'round', join: 'round' } },
        ),
        { transform: around(x, y, rotate(deg)) },
      ),
    );
  }
  // Cut face on the upper-right knob: pale flesh with a faint ring.
  shapes.push(withStyle(ellipse(74, 33, 6, 7.5, solid(GINGER_FLESH)), { transform: around(74, 33, rotate(-35)) }));
  shapes.push(withStyle(ellipse(74, 33, 3.2, 4.2, { stroke: { color: GINGER.light, width: 1.4, cap: 'round', join: 'round' } }), { transform: around(74, 33, rotate(-35)) }));
  // Highlights.
  shapes.push(ellipse(44, 44, 4.5, 2.4, { ...flat(GINGER.light), transform: around(44, 44, rotate(-20)) }));
  shapes.push(ellipse(30, 53, 3, 1.8, { ...flat(GINGER.light), transform: around(30, 53, rotate(-25)) }));

  return shapes;
}

/* ------------------------------------------------------------------ */
/* Idle motion                                                         */
/* ------------------------------------------------------------------ */

/** Vertical bob offset (design units) at time `t`. Negative = up. */
function bobOffset(t: number): number {
  return -IDLE.bob * Math.sin((TAU * t) / IDLE.period);
}

/** Tilt (degrees) at time `t`, 90° out of phase with the bob. */
function tiltAngle(t: number): number {
  return IDLE.tiltDeg * Math.cos((TAU * t) / IDLE.period);
}

const GLINT_START = 0.6; // fraction of the glint period where the blink begins
const GLINT_WIDTH = 0.18; // fraction of the glint period the blink lasts

/** Glint opacity for a phase in [0, 1). */
function glintOpacityAtPhase(phase: number): number {
  const p = phase - GLINT_START;
  if (p < 0 || p > GLINT_WIDTH) return 0;
  return Math.sin((Math.PI * p) / GLINT_WIDTH);
}

function glintOpacity(t: number): number {
  const phase = ((t / IDLE.glintPeriod) % 1 + 1) % 1;
  return glintOpacityAtPhase(phase);
}

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

interface IngredientSpec {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  tint: string;
  strength: number;
  bits: FlatIngredient['bits'];
  /** Where the golden glint sits (design units). */
  glint: Point;
  build(): Shape[];
}

function makeIngredient(spec: IngredientSpec): FlatIngredient {
  let cachedBody: Group | undefined;
  const body = (): Group => {
    if (!cachedBody) cachedBody = group(spec.build(), { id: `${spec.id}-body` });
    return cachedBody;
  };
  const [gx, gy] = spec.glint;
  const glintStar = star(gx, gy, 4, 5.5, 2, { fill: SPARK_GOLD });

  return {
    id: spec.id,
    name: spec.name,
    nameEn: spec.nameEn,
    description: spec.description,
    size: INGREDIENT_SIZE,
    tint: spec.tint,
    strength: spec.strength,
    bits: spec.bits,
    staticShape: () => group([body()], { id: spec.id }),
    shape: (t = 0) =>
      group(
        [
          group([body(), withStyle(glintStar, { id: 'idle-glint', opacity: glintOpacity(t) })], {
            id: 'idle-bob',
            transform: around(C, C, compose(rotate(tiltAngle(t)), translate(0, bobOffset(t)))),
          }),
        ],
        { id: spec.id },
      ),
  };
}

/* ------------------------------------------------------------------ */
/* Exports                                                             */
/* ------------------------------------------------------------------ */

export const SAFFRON: FlatIngredient = makeIngredient({
  id: 'saffron',
  name: 'زعفران',
  nameEn: 'Saffron',
  description: 'یک مشت رشتهٔ سرخ زعفران با پایهٔ زرد، بسته با نخ طلایی.',
  tint: '#d4891c',
  strength: 1,
  bits: { count: 6, kind: 'thread', colors: [SAFFRON_RED.base, SAFFRON_RED.light, SAFFRON_RED.shade], size: 10 },
  glint: [74, 22],
  build: saffronBody,
});

export const POPPY: FlatIngredient = makeIngredient({
  id: 'poppy',
  name: 'خشخاش',
  nameEn: 'Poppy',
  description: 'غوزهٔ سبز و گرد خشخاش با تاج شیاردار و دانه‌های ریختهٔ سیاه.',
  tint: '#4a3d5c',
  strength: 0.35,
  bits: { count: 12, kind: 'seed', colors: [POPPY_SEED], size: 4 },
  glint: [76, 30],
  build: poppyBody,
});

export const BORAGE_FLOWER: FlatIngredient = makeIngredient({
  id: 'borage',
  name: 'گل گاو زبان',
  nameEn: 'Borage',
  description: 'گل ستاره‌ای بنفش با حلقهٔ سفید و مخروط تیرهٔ پرچم‌ها در مرکز.',
  tint: '#6b4fb0',
  strength: 1,
  bits: { count: 7, kind: 'petal', colors: [BORAGE.base, BORAGE.light, CHAMOMILE_WHITE.base], size: 7 },
  glint: [78, 20],
  build: borageBody,
});

export const CHAMOMILE: FlatIngredient = makeIngredient({
  id: 'chamomile',
  name: 'بابونه',
  nameEn: 'Chamomile',
  description: 'گل بابونه با گلبرگ‌های سفید گرد و مرکز زرد گنبدی.',
  tint: '#e0c85a',
  strength: 0.7,
  bits: { count: 8, kind: 'petal', colors: [CHAMOMILE_WHITE.base, CHAMOMILE_WHITE.shade, YELLOW.base], size: 7 },
  glint: [78, 18],
  build: chamomileBody,
});

export const MINT_SPRIG: FlatIngredient = makeIngredient({
  id: 'mint',
  name: 'نعناع',
  nameEn: 'Mint',
  description: 'شاخهٔ تازهٔ نعناع با سه جفت برگ دندانه‌دار و غنچهٔ کوچک بالای ساقه.',
  tint: '#3d8f5a',
  strength: 0.8,
  bits: { count: 8, kind: 'petal', colors: [MINT.base, MINT.light, MINT.shade], size: 7 },
  glint: [76, 26],
  build: mintBody,
});

export const GINGER_ROOT: FlatIngredient = makeIngredient({
  id: 'ginger',
  name: 'زنجبیل',
  nameEn: 'Ginger',
  description: 'ریشهٔ گره‌دار زنجبیل با چند بند گرد، یک بریدگی کم‌رنگ و ریشه‌های ریز.',
  tint: '#c17a2a',
  strength: 0.9,
  bits: { count: 9, kind: 'dot', colors: [GINGER.base, GINGER.light, GINGER_FLESH], size: 5 },
  glint: [78, 22],
  build: gingerBody,
});

export const FLAT_INGREDIENTS: readonly FlatIngredient[] = [SAFFRON, POPPY, BORAGE_FLOWER, CHAMOMILE, MINT_SPRIG, GINGER_ROOT];

export function flatIngredientById(id: string): FlatIngredient | undefined {
  return FLAT_INGREDIENTS.find((ingredient) => ingredient.id === id);
}

/**
 * Small speck shape used by the cooking scene for floating bits, centred at
 * (0,0), `size` units across. No outline stroke (specks are tiny):
 *   'thread' → short gently curved stroke (its body *is* the stroke),
 *   'seed'   → tiny circle,
 *   'petal'  → small ellipse (long axis along x before rotation),
 *   'dot'    → circle.
 * `angleDeg` rotates the speck about its centre.
 */
export function bitShape(kind: BitKind, color: string, size: number, angleDeg = 0): Shape {
  const half = size / 2;
  let shape: Shape;
  switch (kind) {
    case 'thread':
      shape = path(
        [
          ['M', -half, 0],
          ['Q', 0, -size * 0.3, half, 0],
        ],
        { stroke: { color, width: Math.max(1, size * 0.26), cap: 'round', join: 'round' } },
      );
      break;
    case 'seed':
      shape = circle(0, 0, half, { fill: color });
      break;
    case 'petal':
      shape = ellipse(0, 0, half, size * 0.3, { fill: color });
      break;
    case 'dot':
      shape = circle(0, 0, half, { fill: color });
      break;
  }
  return angleDeg === 0 ? shape : withStyle(shape, { transform: rotate(angleDeg) });
}

/**
 * CSS injected into standalone ingredient SVGs so they idle without JS.
 * Targets `#idle-bob` (translateY bob + rotate tilt about the design centre)
 * and `#idle-glint` (opacity blink), sampling the same functions `shape(t)` uses.
 */
export function ingredientIdleCss(idPrefix = ''): string {
  const fmt = (n: number): string => String(Math.round(n * 1000) / 1000);
  const bobId = `#${idPrefix}idle-bob`;
  const glintId = `#${idPrefix}idle-glint`;
  const bobAnim = `kimiagar-idle-bob${idPrefix ? `-${idPrefix.replace(/[^a-zA-Z0-9_-]/g, '')}` : ''}`;
  const glintAnim = `kimiagar-idle-glint${idPrefix ? `-${idPrefix.replace(/[^a-zA-Z0-9_-]/g, '')}` : ''}`;
  const bobSteps = 16;
  const bobFrames: string[] = [];
  for (let i = 0; i <= bobSteps; i++) {
    const phase = i / bobSteps;
    const t = phase * IDLE.period;
    bobFrames.push(`  ${fmt(phase * 100)}% { transform: translateY(${fmt(bobOffset(t))}px) rotate(${fmt(tiltAngle(t))}deg); }`);
  }

  const glintSteps = 8;
  const glintFrames: string[] = ['  0% { opacity: 0; }'];
  for (let i = 0; i <= glintSteps; i++) {
    const phase = GLINT_START + (GLINT_WIDTH * i) / glintSteps;
    glintFrames.push(`  ${fmt(phase * 100)}% { opacity: ${fmt(glintOpacityAtPhase(phase))}; }`);
  }
  glintFrames.push('  100% { opacity: 0; }');

  return [
    `${bobId} {`,
    '  transform-box: view-box;',
    `  transform-origin: ${C}px ${C}px;`,
    `  animation: ${bobAnim} ${IDLE.period}s linear infinite;`,
    '}',
    `${glintId} {`,
    `  animation: ${glintAnim} ${IDLE.glintPeriod}s linear infinite;`,
    '}',
    `@keyframes ${bobAnim} {`,
    ...bobFrames,
    '}',
    `@keyframes ${glintAnim} {`,
    ...glintFrames,
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    `  ${bobId}, ${glintId} { animation: none; }`,
    '}',
  ].join('\n');
}
