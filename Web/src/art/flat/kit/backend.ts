/* GENERATED FROM Kimiagar.Works — do not edit.
 * source: src/flat/backend.ts
 * sync:   npm run art:sync-works   (scripts/sync-works-flat.mjs)
 * works-commit: 689a5ea
 */
/**
 * Contract shared by the three flat-cartoon rendering backends. Types only —
 * the implementations live in `rasterizer.ts`, `canvas2d.ts` and `svg.ts` and
 * must export exactly the functions documented here.
 *
 *   rasterizer.ts
 *     export function rasterizeShape(shape: Shape, fb: FrameBuffer, options: RenderOptions): void
 *     export function renderShapeToRgba(shape: Shape, options: RenderOptions): Uint8ClampedArray
 *       — anti-aliased software rendering into `src/animation/framebuffer.ts`'s FrameBuffer
 *         (RGBA, premultiplied-free `set(x, y, rgb, alpha)` compositing).
 *
 *   canvas2d.ts
 *     export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, options: RenderOptions): void
 *       — draws with Path2D / native canvas AA. Does NOT clear the canvas.
 *
 *   svg.ts
 *     export function toSvg(shape: Shape, options: SvgOptions): string
 *       — standalone SVG document (xmlns, viewBox), ids preserved, `var(--x, #fallback)`
 *         fills emitted verbatim so CSS custom properties work in the browser.
 *
 * All backends must produce visually equivalent output for the same tree:
 * same transform semantics (`Matrix` = SVG matrix(a b c d e f)), strokes
 * centred on the outline, default cap/join = round, `opacity` multiplies down
 * the tree, `clip` shares the clipped node's local space.
 */
import type { Matrix, Shape } from './shapes.ts';

export interface RenderOptions {
  /** Output size in pixels. */
  width: number;
  height: number;
  /**
   * Design-unit → pixel scale applied before `offsetX/offsetY`. E.g. a 512-unit
   * scene rendered into a 256 px frame uses `scale: 0.5`.
   */
  scale?: number;
  /** Pixel offset applied after scaling (default 0). */
  offsetX?: number;
  offsetY?: number;
  /** Extra root transform (design units), applied before `scale` (default identity). */
  transform?: Matrix;
  /** Values for `var(--name)` fills, e.g. `{ '--liquid': '#d4891c' }`. */
  vars?: Readonly<Record<string, string>>;
  /** Optional opaque background colour; default transparent. */
  background?: string;
}

export interface SvgOptions {
  /** Design-unit viewBox size. */
  width: number;
  height: number;
  /** Rendered size attributes (default = viewBox size). */
  pixelWidth?: number;
  pixelHeight?: number;
  /** Extra CSS placed in a `<style>` element (e.g. idle keyframes). */
  css?: string;
  /** Extra content placed inside `<defs>`. */
  defs?: string;
  /** Accessible title / description. */
  title?: string;
  description?: string;
  /** Root-level CSS custom property defaults, e.g. `{ '--liquid': '#3f6f8f' }` → `style="--liquid:#3f6f8f"`. */
  vars?: Readonly<Record<string, string>>;
  /** Optional root `class` attribute. */
  className?: string;
}

/** Signature every "prop" module exposes so exporters can treat them uniformly. */
export interface FlatProp {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  /** Design-space size (square). */
  size: number;
  /** Builds the shape tree. `t` is animation time in seconds for props that idle; static props ignore it. */
  shape(t?: number): Shape;
}

export type { Shape };
