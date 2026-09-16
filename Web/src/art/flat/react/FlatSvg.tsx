/**
 * رندر یک درخت `Shape` (کیت فلت Works) به SVG درون‌خطی در React.
 * idها با `useId()` این نمونه namespace می‌شوند (flatSvgMarkup.ts)؛ برای
 * انیمیشن idle مواد، `css(prefix)` همان پیشوند را می‌گیرد تا
 * `ingredientIdleCss(prefix)` به idهای درست اشاره کند.
 */

import { useId, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { Shape } from '../kit/shapes.ts';
import { flatSvgMarkup, svgIdPrefix } from './flatSvgMarkup';
import './flat.css';

export interface FlatSvgProps {
  shape: Shape;
  /** اندازه‌ی مربع فضای طراحی (viewBox) */
  designSize: number;
  className?: string;
  style?: CSSProperties;
  /** مقدارهای `var(--name)` داخل SVG، مثل `{ '--liquid': '#d4891c' }` */
  vars?: Readonly<Record<string, string>>;
  /** CSS اضافه داخل `<style>` — پیشوند id این نمونه را می‌گیرد */
  css?: (idPrefix: string) => string;
  title?: string;
  'data-testid'?: string;
}

export function FlatSvg({ shape, designSize, className, style, vars, css, title, ...rest }: FlatSvgProps) {
  const prefix = svgIdPrefix(useId());
  const markup = useMemo(
    () => flatSvgMarkup(shape, designSize, prefix, { vars, css, title }),
    [shape, designSize, prefix, vars, css, title],
  );
  return (
    <div
      className={`flat-svg${className ? ` ${className}` : ''}`}
      style={style}
      data-testid={rest['data-testid']}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
