/**
 * تولید markup SVG از درخت `Shape` کیت فلت با idهای namespace‌شده.
 *
 * `toSvg()` idهای ثابت شکل‌ها (`pot-front`, `idle-bob`, …) و `clip-0…` را
 * بازتولید می‌کند؛ چون چند SVG کنار هم روی صفحه می‌نشینند، همه‌ی idها و
 * ارجاع‌های `url(#…)` با پیشوند یکتای هر نمونه namespace می‌شوند.
 */

import type { Shape } from '../kit/shapes.ts';
import { toSvg } from '../kit/svg.ts';

/** پیشوند امن برای id از `useId()` (کاراکترهای «:» و ««»» را حذف می‌کند). */
export function svgIdPrefix(reactId: string): string {
  return `f${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}-`;
}

/** همه‌ی `id="…"` و `url(#…)` را با پیشوند namespace می‌کند. */
export function uniquifyIds(markup: string, prefix: string): string {
  return markup.replace(/ id="([^"]*)"/g, ` id="${prefix}$1"`).replace(/url\(#([^)]*)\)/g, `url(#${prefix}$1)`);
}

export interface FlatSvgMarkupOptions {
  vars?: Readonly<Record<string, string>>;
  /** CSS اضافه داخل `<style>` — پیشوند id این نمونه را می‌گیرد */
  css?: (idPrefix: string) => string;
  title?: string;
}

export function flatSvgMarkup(shape: Shape, designSize: number, prefix: string, options: FlatSvgMarkupOptions = {}): string {
  const raw = toSvg(shape, {
    width: designSize,
    height: designSize,
    vars: options.vars,
    css: options.css?.(prefix),
    title: options.title,
  });
  return uniquifyIds(raw, prefix);
}
