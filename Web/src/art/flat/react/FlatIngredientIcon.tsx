/**
 * آیکون برداری یک ماده از کیت Works (ایستا؛ برای دفترچه و فهرست‌ها).
 * اگر ماده در کیت نباشد `null` برمی‌گردد تا فراخوان fallback خودش را نشان دهد.
 */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { INGREDIENT_SIZE, flatIngredientById } from '../kit/ingredients.ts';
import { FlatSvg } from './FlatSvg';

export function FlatIngredientIcon({
  ingredientId,
  className,
  style,
}: {
  ingredientId: string;
  className?: string;
  style?: CSSProperties;
}) {
  const kit = flatIngredientById(ingredientId);
  const shape = useMemo(() => kit?.staticShape() ?? null, [kit]);
  if (!shape) return null;
  return <FlatSvg shape={shape} designSize={INGREDIENT_SIZE} className={className} style={style} />;
}
