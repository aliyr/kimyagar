/* GENERATED FROM Kimiagar.Works — do not edit.
 * source: src/flat/shapes.ts
 * sync:   npm run art:sync-works   (scripts/sync-works-flat.mjs)
 * works-commit: 689a5ea
 */
/**
 * Shared vector "shape model" for the flat-cartoon art style.
 *
 * Everything flat-cartoon (props, ingredients, the cooking scene) is described
 * as a tree of these plain data objects. Three backends consume the tree:
 *
 *   - `svg.ts`        → SVG markup (web preview, downloadable .svg files)
 *   - `rasterizer.ts` → anti-aliased RGBA pixels in Node (PNG export, no deps)
 *   - `canvas2d.ts`   → CanvasRenderingContext2D (live 60 fps preview)
 *
 * Conventions
 *   - Coordinates are in "design units" (pot/spoon: 256×256, ingredients:
 *     96×96, cooking scene: 512×512). Backends scale to pixels.
 *   - Y grows downwards, like SVG/canvas.
 *   - Angles passed to helpers are in degrees.
 *   - Colours are CSS hex strings. A fill may also be `var(--name, #fallback)`;
 *     `resolveColor()` handles that for non-SVG backends.
 *   - Strokes are centred on the outline (SVG semantics). The cartoon outline
 *     width for a prop of a given design size is `outlineWidth(size)`.
 */

/* ------------------------------------------------------------------ */
/* Transforms                                                          */
/* ------------------------------------------------------------------ */

/**
 * Affine matrix in SVG order `matrix(a b c d e f)`:
 *   x' = a·x + c·y + e
 *   y' = b·x + d·y + f
 */
export type Matrix = readonly [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** `mul(A, B)` = A·B — applies B first, then A (column-vector convention). */
export function mul(A: Matrix, B: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = A;
  const [a2, b2, c2, d2, e2, f2] = B;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

/**
 * Composes transforms in *reading order*: `compose(t1, t2, t3)` applies t1 to
 * the point first, then t2, then t3.
 */
export function compose(...ms: readonly Matrix[]): Matrix {
  let out: Matrix = IDENTITY;
  for (const m of ms) out = mul(m, out);
  return out;
}

export function translate(tx: number, ty: number): Matrix {
  return [1, 0, 0, 1, tx, ty];
}

export function scale(sx: number, sy: number = sx): Matrix {
  return [sx, 0, 0, sy, 0, 0];
}

export function rotate(deg: number): Matrix {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
}

export function skewX(deg: number): Matrix {
  return [1, 0, Math.tan((deg * Math.PI) / 180), 1, 0, 0];
}

export function skewY(deg: number): Matrix {
  return [1, Math.tan((deg * Math.PI) / 180), 0, 1, 0, 0];
}

/** Applies `m` around a pivot: translate(-p) → m → translate(+p). */
export function around(px: number, py: number, m: Matrix): Matrix {
  return compose(translate(-px, -py), m, translate(px, py));
}

export function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export function invert(m: Matrix): Matrix {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-12) return IDENTITY;
  const ia = d / det;
  const ib = -b / det;
  const ic = -c / det;
  const id = a / det;
  return [ia, ib, ic, id, -(ia * e + ic * f), -(ib * e + id * f)];
}

/** Uniform-ish scale factor of a matrix (geometric mean of the singular values). */
export function matrixScale(m: Matrix): number {
  return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
}

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export type LineCap = 'butt' | 'round' | 'square';
export type LineJoin = 'miter' | 'round' | 'bevel';
export type FillRule = 'nonzero' | 'evenodd';

export interface Stroke {
  color: string;
  width: number;
  cap?: LineCap; // default 'round'
  join?: LineJoin; // default 'round'
}

/** Properties every node may carry. */
export interface Style {
  /** Stable id (emitted as the SVG `id` attribute; used for layered pot SVG). */
  id?: string;
  /** CSS colour, or `var(--name, #fallback)`; `undefined` = no fill. */
  fill?: string;
  fillRule?: FillRule; // default 'nonzero'
  stroke?: Stroke;
  /** 0..1, multiplies with ancestors. */
  opacity?: number;
  /** Local transform; children/geometry are expressed in the pre-transform space. */
  transform?: Matrix;
  /**
   * Clip region in the *same local space as this node* (i.e. it shares this
   * node's `transform`). Only the geometry of the clip shape is used; its
   * style is ignored. Groups as clips clip to the union of their children.
   */
  clip?: Shape;
}

export interface Ellipse extends Style {
  kind: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface Rect extends Style {
  kind: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  /** Corner radius (uniform). */
  rx?: number;
}

export type PathCmd =
  | readonly ['M', number, number]
  | readonly ['L', number, number]
  | readonly ['Q', number, number, number, number]
  | readonly ['C', number, number, number, number, number, number]
  | readonly ['Z'];

export interface Path extends Style {
  kind: 'path';
  cmds: readonly PathCmd[];
}

export type Point = readonly [number, number];

export interface Polygon extends Style {
  kind: 'polygon';
  points: readonly Point[];
  /** `false` renders an open polyline (stroke only makes sense). Default `true`. */
  closed?: boolean;
}

export interface Group extends Style {
  kind: 'group';
  children: readonly Shape[];
}

export type Shape = Ellipse | Rect | Path | Polygon | Group;

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

export function ellipse(cx: number, cy: number, rx: number, ry: number, style: Style = {}): Ellipse {
  return { kind: 'ellipse', cx, cy, rx, ry, ...style };
}

export function circle(cx: number, cy: number, r: number, style: Style = {}): Ellipse {
  return ellipse(cx, cy, r, r, style);
}

export function rect(x: number, y: number, w: number, h: number, style: Style & { rx?: number } = {}): Rect {
  return { kind: 'rect', x, y, w, h, ...style };
}

export function path(cmds: readonly PathCmd[], style: Style = {}): Path {
  return { kind: 'path', cmds, ...style };
}

export function polygon(points: readonly Point[], style: Style & { closed?: boolean } = {}): Polygon {
  return { kind: 'polygon', points, ...style };
}

export function polyline(points: readonly Point[], stroke: Stroke, style: Style = {}): Polygon {
  return { kind: 'polygon', points, closed: false, stroke, ...style };
}

export function line(x1: number, y1: number, x2: number, y2: number, stroke: Stroke, style: Style = {}): Polygon {
  return polyline([[x1, y1], [x2, y2]], stroke, style);
}

export function group(children: readonly Shape[], style: Style = {}): Group {
  return { kind: 'group', children, ...style };
}

/** Returns a shallow copy of `shape` with `style` merged in (transform is *composed*, not replaced). */
export function withStyle<S extends Shape>(shape: S, style: Style): S {
  const transform =
    shape.transform && style.transform ? compose(shape.transform, style.transform) : style.transform ?? shape.transform;
  return { ...shape, ...style, transform };
}

/** Convenience: wraps a shape in a group carrying a transform. */
export function transformed(shape: Shape, transform: Matrix, style: Style = {}): Group {
  return group([shape], { transform, ...style });
}

/* ------------------------------------------------------------------ */
/* Cartoon helpers                                                     */
/* ------------------------------------------------------------------ */

/** Cartoon outline thickness for a prop drawn in a `size`-unit square. */
export function outlineWidth(size: number): number {
  return size * 0.024;
}

export function outlineStroke(size: number, color: string): Stroke {
  return { color, width: outlineWidth(size), cap: 'round', join: 'round' };
}

/** N-pointed star (e.g. 8 for a شمسه). `rotationDeg` turns the first outer point from straight up. */
export function star(
  cx: number,
  cy: number,
  points: number,
  rOuter: number,
  rInner: number,
  style: Style = {},
  rotationDeg = 0,
): Polygon {
  const pts: Point[] = [];
  const start = -Math.PI / 2 + (rotationDeg * Math.PI) / 180;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = start + (i * Math.PI) / points;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return polygon(pts, style);
}

/**
 * Logarithmic-ish spiral polyline for اسلیمی steam curls. Radius grows
 * linearly from `r0` to `r1` over `turns` revolutions starting at `startDeg`.
 */
export function spiralPoints(
  cx: number,
  cy: number,
  turns: number,
  r0: number,
  r1: number,
  segments = 48,
  startDeg = -90,
  clockwise = true,
): Point[] {
  const pts: Point[] = [];
  const dir = clockwise ? 1 : -1;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = (startDeg * Math.PI) / 180 + dir * t * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * t;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/**
 * Flame tongue / droplet: rounded bottom, pointed tip at the top.
 * `(cx, baseY)` is the centre of the rounded base; `height` extends upwards.
 * `lean` shifts the tip horizontally (positive = right) for wind/flicker.
 */
export function teardrop(cx: number, baseY: number, width: number, height: number, style: Style = {}, lean = 0): Path {
  const r = width / 2;
  const tipX = cx + lean;
  const tipY = baseY - height;
  const cy = baseY - r * 0.9; // centre of the rounded base
  const k = 0.5523 * r;
  return path(
    [
      ['M', cx - r, cy],
      ['C', cx - r, cy + k, cx - k, cy + r, cx, cy + r],
      ['C', cx + k, cy + r, cx + r, cy + k, cx + r, cy],
      ['C', cx + r, cy - height * 0.45, tipX + r * 0.15, tipY + height * 0.25, tipX, tipY],
      ['C', tipX - r * 0.15, tipY + height * 0.25, cx - r, cy - height * 0.45, cx - r, cy],
      ['Z'],
    ],
    style,
  );
}

/**
 * Persepolis-style lotus (نیلوفر تخت‌جمشید): a central pointed petal flanked
 * by `sidePetals` curling petals on each side, sitting on a small base.
 * Occupies roughly `w`×`h` with the base centre at `(cx, baseY)`.
 */
export function lotus(cx: number, baseY: number, w: number, h: number, style: Style = {}, sidePetals = 2): Path {
  const cmds: PathCmd[] = [];
  const halfW = w / 2;
  const total = sidePetals * 2 + 1;
  for (let i = 0; i < total; i++) {
    const offset = i - sidePetals; // -side..+side
    const spread = offset / (sidePetals + 0.5);
    const px = cx + spread * halfW * 0.8;
    const petalH = h * (1 - Math.abs(spread) * 0.45);
    const petalW = (w / total) * 1.15;
    const tipX = px + spread * halfW * 0.35;
    const tipY = baseY - petalH;
    cmds.push(
      ['M', px - petalW / 2, baseY],
      ['C', px - petalW / 2, baseY - petalH * 0.55, tipX - petalW * 0.25, tipY + petalH * 0.2, tipX, tipY],
      ['C', tipX + petalW * 0.25, tipY + petalH * 0.2, px + petalW / 2, baseY - petalH * 0.55, px + petalW / 2, baseY],
      ['Z'],
    );
  }
  return path(cmds, { fillRule: 'nonzero', ...style });
}

/** Rounded rectangle path (explicit path form, useful when a backend needs bezier corners). */
export function roundedRectPath(x: number, y: number, w: number, h: number, r: number, style: Style = {}): Path {
  const rr = Math.min(r, w / 2, h / 2);
  const k = 0.5523 * rr;
  return path(
    [
      ['M', x + rr, y],
      ['L', x + w - rr, y],
      ['C', x + w - rr + k, y, x + w, y + rr - k, x + w, y + rr],
      ['L', x + w, y + h - rr],
      ['C', x + w, y + h - rr + k, x + w - rr + k, y + h, x + w - rr, y + h],
      ['L', x + rr, y + h],
      ['C', x + rr - k, y + h, x, y + h - rr + k, x, y + h - rr],
      ['L', x, y + rr],
      ['C', x, y + rr - k, x + rr - k, y, x + rr, y],
      ['Z'],
    ],
    style,
  );
}

/* ------------------------------------------------------------------ */
/* Colour variables                                                    */
/* ------------------------------------------------------------------ */

const VAR_RE = /^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)$/;

/**
 * Resolves `var(--name, #fallback)` against `vars`; plain colours pass through.
 * Returns `null` for `'none'`/empty.
 */
export function resolveColor(color: string | undefined, vars?: Readonly<Record<string, string>>): string | null {
  if (!color || color === 'none') return null;
  const m = VAR_RE.exec(color.trim());
  if (!m) return color;
  const value = vars?.[m[1]];
  if (value) return value;
  return m[2] ? m[2].trim() : null;
}

/* ------------------------------------------------------------------ */
/* Geometry utilities shared by backends                               */
/* ------------------------------------------------------------------ */

export interface Polyline {
  points: Point[];
  closed: boolean;
}

/**
 * Flattens any shape's *own* geometry (ignoring children/transform/clip) into
 * polylines. Curves are subdivided adaptively so the chord error stays under
 * `tolerance` design units.
 */
export function flattenShape(shape: Exclude<Shape, Group>, tolerance = 0.25): Polyline[] {
  switch (shape.kind) {
    case 'ellipse':
      return [flattenEllipse(shape.cx, shape.cy, shape.rx, shape.ry, tolerance)];
    case 'rect': {
      const { x, y, w, h } = shape;
      const r = Math.min(shape.rx ?? 0, w / 2, h / 2);
      if (r <= 0) {
        return [{ points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true }];
      }
      return flattenPath(roundedRectPath(x, y, w, h, r).cmds, tolerance);
    }
    case 'polygon':
      return [{ points: [...shape.points], closed: shape.closed !== false }];
    case 'path':
      return flattenPath(shape.cmds, tolerance);
  }
}

export function flattenEllipse(cx: number, cy: number, rx: number, ry: number, tolerance = 0.25): Polyline {
  const rMax = Math.max(Math.abs(rx), Math.abs(ry), 1e-6);
  const n = Math.max(12, Math.min(256, Math.ceil(Math.PI / Math.acos(Math.max(0, 1 - tolerance / rMax)))));
  const points: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    points.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return { points, closed: true };
}

export function flattenPath(cmds: readonly PathCmd[], tolerance = 0.25): Polyline[] {
  const out: Polyline[] = [];
  let current: Polyline | null = null;
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;

  const ensure = (): Polyline => {
    if (!current) {
      current = { points: [[cx, cy]], closed: false };
      out.push(current);
    }
    return current;
  };

  for (const cmd of cmds) {
    switch (cmd[0]) {
      case 'M':
        current = { points: [[cmd[1], cmd[2]]], closed: false };
        out.push(current);
        cx = startX = cmd[1];
        cy = startY = cmd[2];
        break;
      case 'L':
        ensure().points.push([cmd[1], cmd[2]]);
        cx = cmd[1];
        cy = cmd[2];
        break;
      case 'Q': {
        const pl = ensure();
        const [, qx, qy, x, y] = cmd;
        // Elevate to cubic and reuse the cubic subdivision.
        const c1x = cx + (2 / 3) * (qx - cx);
        const c1y = cy + (2 / 3) * (qy - cy);
        const c2x = x + (2 / 3) * (qx - x);
        const c2y = y + (2 / 3) * (qy - y);
        subdivideCubic(pl.points, cx, cy, c1x, c1y, c2x, c2y, x, y, tolerance);
        cx = x;
        cy = y;
        break;
      }
      case 'C': {
        const pl = ensure();
        const [, c1x, c1y, c2x, c2y, x, y] = cmd;
        subdivideCubic(pl.points, cx, cy, c1x, c1y, c2x, c2y, x, y, tolerance);
        cx = x;
        cy = y;
        break;
      }
      case 'Z':
        if (current) {
          current.closed = true;
          current = null;
        }
        cx = startX;
        cy = startY;
        break;
    }
  }
  return out;
}

function subdivideCubic(
  points: Point[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  tolerance: number,
): void {
  // Segment count from the control polygon length — cheap and stable.
  const len = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
  const n = Math.max(1, Math.min(96, Math.ceil(Math.sqrt((len / tolerance) * 0.35))));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const d = t * t * t;
    points.push([a * x0 + b * x1 + c * x2 + d * x3, a * y0 + b * y1 + c * y2 + d * y3]);
  }
}

/** Axis-aligned bounds of a flattened polyline set (in the same space). */
export function boundsOf(polylines: readonly Polyline[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pl of polylines) {
    for (const [x, y] of pl.points) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return minX === Infinity ? null : { minX, minY, maxX, maxY };
}
