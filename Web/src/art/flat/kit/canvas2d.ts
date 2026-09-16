/* GENERATED FROM Kimiagar.Works — do not edit.
 * source: src/flat/canvas2d.ts
 * sync:   npm run art:sync-works   (scripts/sync-works-flat.mjs)
 * works-commit: 689a5ea
 */
/**
 * Canvas 2D backend for the flat-cartoon shape model — the live 60 fps preview.
 *
 * Never touches `document` (or any DOM global) at module load, so Node code
 * paths can import this file without executing browser APIs; `Path2D` is only
 * referenced from inside the draw functions.
 */
import type { Group, Matrix, Rect, Shape } from './shapes.ts';
import { compose, resolveColor } from './shapes.ts';
import type { RenderOptions } from './backend.ts';

/** Geometry is immutable, so `Path2D`s can be cached by shape identity. */
const geometryCache = new WeakMap<Shape, Path2D>();
/** Clip paths are the flattened union of a (possibly nested) clip subtree. */
const clipCache = new WeakMap<Shape, Path2D>();

type RoundRectCapable = {
  roundRect(x: number, y: number, w: number, h: number, r: number): void;
};

function addRect(path: Path2D, shape: Rect): void {
  const { x, y, w, h } = shape;
  const r = Math.min(shape.rx ?? 0, Math.abs(w) / 2, Math.abs(h) / 2);
  if (r <= 0) {
    path.rect(x, y, w, h);
    return;
  }
  const maybe = path as Partial<RoundRectCapable>;
  if (typeof maybe.roundRect === 'function') {
    maybe.roundRect(x, y, w, h, r);
    return;
  }
  // Older engines: circular corners via arcTo.
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.arcTo(x + w, y, x + w, y + r, r);
  path.lineTo(x + w, y + h - r);
  path.arcTo(x + w, y + h, x + w - r, y + h, r);
  path.lineTo(x + r, y + h);
  path.arcTo(x, y + h, x, y + h - r, r);
  path.lineTo(x, y + r);
  path.arcTo(x, y, x + r, y, r);
  path.closePath();
}

/** The node's own geometry (children, transform and clip excluded). */
function geometryOf(shape: Exclude<Shape, Group>): Path2D {
  const cached = geometryCache.get(shape);
  if (cached) return cached;

  const path = new Path2D();
  switch (shape.kind) {
    case 'ellipse':
      path.ellipse(shape.cx, shape.cy, Math.abs(shape.rx), Math.abs(shape.ry), 0, 0, Math.PI * 2);
      break;
    case 'rect':
      addRect(path, shape);
      break;
    case 'path':
      for (const cmd of shape.cmds) {
        switch (cmd[0]) {
          case 'M':
            path.moveTo(cmd[1], cmd[2]);
            break;
          case 'L':
            path.lineTo(cmd[1], cmd[2]);
            break;
          case 'Q':
            path.quadraticCurveTo(cmd[1], cmd[2], cmd[3], cmd[4]);
            break;
          case 'C':
            path.bezierCurveTo(cmd[1], cmd[2], cmd[3], cmd[4], cmd[5], cmd[6]);
            break;
          case 'Z':
            path.closePath();
            break;
        }
      }
      break;
    case 'polygon': {
      shape.points.forEach(([x, y], i) => (i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
      if (shape.points.length > 0 && shape.closed !== false) path.closePath();
      break;
    }
  }

  geometryCache.set(shape, path);
  return path;
}

function addClipGeometry(out: Path2D, shape: Shape, m: Matrix | null): void {
  const local = shape.transform ? (m ? compose(shape.transform, m) : shape.transform) : m;
  if (shape.kind === 'group') {
    for (const child of shape.children) addClipGeometry(out, child, local);
    return;
  }
  const geometry = geometryOf(shape);
  if (local) {
    out.addPath(geometry, { a: local[0], b: local[1], c: local[2], d: local[3], e: local[4], f: local[5] });
  } else {
    out.addPath(geometry);
  }
}

/** Union of the clip subtree's geometry, in the clipped node's local space. */
function clipPathOf(clip: Shape): Path2D {
  const cached = clipCache.get(clip);
  if (cached) return cached;
  const path = new Path2D();
  addClipGeometry(path, clip, null);
  clipCache.set(clip, path);
  return path;
}

function drawNode(ctx: CanvasRenderingContext2D, shape: Shape, vars: RenderOptions['vars']): void {
  ctx.save();
  if (shape.transform) {
    const [a, b, c, d, e, f] = shape.transform;
    ctx.transform(a, b, c, d, e, f);
  }
  if (shape.clip) ctx.clip(clipPathOf(shape.clip), 'nonzero');
  if (shape.opacity !== undefined) ctx.globalAlpha *= Math.min(1, Math.max(0, shape.opacity));

  if (shape.kind === 'group') {
    for (const child of shape.children) drawNode(ctx, child, vars);
  } else {
    const path = geometryOf(shape);
    const fill = resolveColor(shape.fill, vars);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill(path, shape.fillRule ?? 'nonzero');
    }
    const stroke = shape.stroke;
    if (stroke && stroke.width > 0) {
      const color = resolveColor(stroke.color, vars);
      if (color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = stroke.cap ?? 'round';
        ctx.lineJoin = stroke.join ?? 'round';
        ctx.stroke(path);
      }
    }
  }

  ctx.restore();
}

/**
 * Draws `shape` with `options.scale`/`offset` mapping design units to pixels.
 * Does not clear the canvas; when `options.background` is set it is painted
 * over the whole `width`×`height` pixel area first.
 */
export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, options: RenderOptions): void {
  const { width, height, scale = 1, offsetX = 0, offsetY = 0, transform, vars, background } = options;
  ctx.save();
  if (background) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  if (transform) {
    const [a, b, c, d, e, f] = transform;
    ctx.transform(a, b, c, d, e, f);
  }
  drawNode(ctx, shape, vars);
  ctx.restore();
}
