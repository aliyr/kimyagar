/* GENERATED FROM Kimiagar.Works — do not edit.
 * source: src/flat/svg.ts
 * sync:   npm run art:sync-works   (scripts/sync-works-flat.mjs)
 * works-commit: 689a5ea
 */
/**
 * SVG backend for the flat-cartoon shape model.
 *
 * `toSvg()` produces a standalone document (web preview, downloadable files);
 * `toSvgFragment()` produces the inner markup plus the `<clipPath>` defs it
 * needs, so several shapes can share one `<svg>` or be inlined in HTML.
 *
 * Fills are emitted verbatim — a `var(--liquid, #3f6f8f)` fill stays a `var()`
 * so the browser resolves it and CSS can override it.
 */
import type { Matrix, PathCmd, Point, Shape, Style } from './shapes.ts';
import { IDENTITY, compose } from './shapes.ts';
import type { SvgOptions } from './backend.ts';

const XMLNS = 'http://www.w3.org/2000/svg';

/** Up to 3 decimals, trailing zeros trimmed, never exponent notation. */
function num(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const s = n.toFixed(3).replace(/\.?0+$/, '');
  return s === '-0' || s === '' ? '0' : s;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Text content escaping (`<title>`, `<desc>`, `<style>`). */
function escText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function attr(name: string, value: string | number): string {
  return ` ${name}="${typeof value === 'number' ? num(value) : esc(value)}"`;
}

function matrixAttr(m: Matrix): string {
  return `matrix(${m.map(num).join(' ')})`;
}

function isIdentity(m: Matrix): boolean {
  return m.every((v, i) => v === IDENTITY[i]);
}

/** Serializer state: deterministic clip ids per document/fragment. */
interface Ctx {
  prefix: string;
  next: number;
  defs: string[];
}

function pathData(cmds: readonly PathCmd[]): string {
  const out: string[] = [];
  for (const cmd of cmds) {
    if (cmd[0] === 'Z') out.push('Z');
    else out.push(cmd[0] + ' ' + cmd.slice(1).map((v) => num(v as number)).join(' '));
  }
  return out.join(' ');
}

function pointsData(points: readonly Point[]): string {
  return points.map(([x, y]) => `${num(x)},${num(y)}`).join(' ');
}

/* ------------------------------------------------------------------ */
/* Clip paths                                                          */
/* ------------------------------------------------------------------ */

/**
 * Emits the geometry of a clip shape as bare `<clipPath>` children. `<g>` is
 * not allowed inside `<clipPath>`, so nested groups are flattened and their
 * transforms composed into each leaf. Paint styles are dropped; only geometry
 * (including transforms) survives.
 */
function clipGeometry(shape: Shape, m: Matrix | null, out: string[]): void {
  const local = shape.transform ? (m ? compose(shape.transform, m) : shape.transform) : m;
  if (shape.kind === 'group') {
    for (const child of shape.children) clipGeometry(child, local, out);
    return;
  }
  const t = local && !isIdentity(local) ? attr('transform', matrixAttr(local)) : '';
  switch (shape.kind) {
    case 'ellipse':
      out.push(
        `<ellipse${attr('cx', shape.cx)}${attr('cy', shape.cy)}${attr('rx', shape.rx)}${attr('ry', shape.ry)}${t}/>`,
      );
      break;
    case 'rect': {
      const rx = shape.rx ?? 0;
      out.push(
        `<rect${attr('x', shape.x)}${attr('y', shape.y)}${attr('width', shape.w)}${attr('height', shape.h)}` +
          (rx > 0 ? attr('rx', rx) : '') +
          `${t}/>`,
      );
      break;
    }
    case 'path':
      out.push(`<path${attr('d', pathData(shape.cmds))}${t}/>`);
      break;
    case 'polygon':
      out.push(`<polygon${attr('points', pointsData(shape.points))}${t}/>`);
      break;
  }
}

/** Registers a `<clipPath>` for `clip` and returns its id. */
function defineClip(clip: Shape, ctx: Ctx): string {
  const id = `${ctx.prefix}clip-${ctx.next++}`;
  const parts: string[] = [];
  clipGeometry(clip, null, parts);
  ctx.defs.push(`<clipPath id="${esc(id)}">${parts.join('')}</clipPath>`);
  return id;
}

/* ------------------------------------------------------------------ */
/* Elements                                                            */
/* ------------------------------------------------------------------ */

/**
 * Paint + common attributes. Groups deliberately skip `fill`/`stroke` so they
 * cannot leak into children through SVG inheritance — the other backends
 * ignore paint on groups.
 */
function commonAttrs(shape: Shape, ctx: Ctx): string {
  const style: Style = shape;
  let s = '';
  if (style.id !== undefined) s += attr('id', style.id);

  if (shape.kind !== 'group') {
    s += attr('fill', style.fill ?? 'none');
    if (style.fillRule === 'evenodd') s += attr('fill-rule', 'evenodd');
    if (style.stroke) {
      const { color, width, cap, join } = style.stroke;
      s += attr('stroke', color);
      s += attr('stroke-width', width);
      // Our default is 'round'; SVG's are 'butt'/'miter', so always be explicit.
      s += attr('stroke-linecap', cap ?? 'round');
      s += attr('stroke-linejoin', join ?? 'round');
    }
  }

  if (style.opacity !== undefined && style.opacity < 1) s += attr('opacity', Math.max(0, style.opacity));
  if (style.transform && !isIdentity(style.transform)) s += attr('transform', matrixAttr(style.transform));
  // clip-path uses userSpaceOnUse, i.e. the element's own local space *after*
  // its transform — exactly the `clip` semantics of the shape model.
  if (style.clip) s += attr('clip-path', `url(#${defineClip(style.clip, ctx)})`);
  return s;
}

function emit(shape: Shape, ctx: Ctx, indent: string): string {
  const a = commonAttrs(shape, ctx);
  switch (shape.kind) {
    case 'ellipse':
      return `${indent}<ellipse${attr('cx', shape.cx)}${attr('cy', shape.cy)}${attr('rx', shape.rx)}${attr('ry', shape.ry)}${a}/>`;
    case 'rect': {
      const rx = shape.rx ?? 0;
      return (
        `${indent}<rect${attr('x', shape.x)}${attr('y', shape.y)}${attr('width', shape.w)}${attr('height', shape.h)}` +
        (rx > 0 ? attr('rx', rx) : '') +
        `${a}/>`
      );
    }
    case 'path':
      return `${indent}<path${attr('d', pathData(shape.cmds))}${a}/>`;
    case 'polygon': {
      const tag = shape.closed === false ? 'polyline' : 'polygon';
      return `${indent}<${tag}${attr('points', pointsData(shape.points))}${a}/>`;
    }
    case 'group': {
      if (shape.children.length === 0) return `${indent}<g${a}/>`;
      const inner = shape.children.map((child) => emit(child, ctx, indent + '  ')).join('\n');
      return `${indent}<g${a}>\n${inner}\n${indent}</g>`;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Inner markup for `shape` plus the `<clipPath>` elements it references.
 * `idPrefix` namespaces generated clip ids so several fragments can live on
 * one page without collisions.
 */
export function toSvgFragment(shape: Shape, idPrefix = ''): { body: string; defs: string } {
  const ctx: Ctx = { prefix: idPrefix, next: 0, defs: [] };
  const body = emit(shape, ctx, '');
  return { body, defs: ctx.defs.join('\n') };
}

/** Standalone SVG document. Clip ids restart at `clip-0` on every call. */
export function toSvg(shape: Shape, options: SvgOptions): string {
  const { width, height, pixelWidth, pixelHeight, css, defs, title, description, vars, className } = options;
  const ctx: Ctx = { prefix: '', next: 0, defs: [] };
  const body = emit(shape, ctx, '  ');

  let root = `<svg xmlns="${XMLNS}"${attr('viewBox', `0 0 ${num(width)} ${num(height)}`)}`;
  root += attr('width', pixelWidth ?? width);
  root += attr('height', pixelHeight ?? height);
  if (className) root += attr('class', className);
  if (vars) {
    const decls = Object.entries(vars).map(([k, v]) => `${k}:${v}`);
    if (decls.length > 0) root += attr('style', decls.join(';'));
  }

  const head: string[] = [];
  if (title !== undefined) head.push(`  <title>${escText(title)}</title>`);
  if (description !== undefined) head.push(`  <desc>${escText(description)}</desc>`);
  if (css) head.push(`  <style>\n${escText(css)}\n  </style>`);

  const defsParts: string[] = [];
  if (defs) defsParts.push(defs);
  if (ctx.defs.length > 0) defsParts.push(ctx.defs.join('\n'));
  if (defsParts.length > 0) head.push(`  <defs>\n${defsParts.join('\n')}\n  </defs>`);

  return [`${root}>`, ...head, body, '</svg>', ''].join('\n');
}
