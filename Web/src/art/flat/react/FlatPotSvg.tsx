/**
 * دیگ برداری ایستا با رنگ مایع دلخواه (برای صفحه‌ی نتیجه و پنل واکنش مشتری).
 * `potShape()` سه‌لایه است و مایع را از `--liquid` می‌خواند.
 */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { POT_SIZE, potShape } from '../kit/props.ts';
import { FlatSvg } from './FlatSvg';

export function FlatPotSvg({
  liquid,
  className,
  style,
  'data-testid': testId,
}: {
  /** رنگ CSS مایع (rgb()/hex) */
  liquid: string;
  className?: string;
  style?: CSSProperties;
  'data-testid'?: string;
}) {
  const shape = useMemo(() => potShape(), []);
  const vars = useMemo(() => ({ '--liquid': liquid }), [liquid]);
  return (
    <FlatSvg shape={shape} designSize={POT_SIZE} vars={vars} className={className} style={style} data-testid={testId} />
  );
}
