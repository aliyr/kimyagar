/**
 * شیشه‌ی برداری قفسه در سبک فلت: بدنه‌ی شیشه‌ای نیمه‌شفاف، درِ چوبی، برچسب
 * محرابی به رنگ ماده (ingredient.color) و آیکون برداریِ ماده از کیت Works
 * که با CSS (بدون JS) آرام بالا و پایین می‌رود (`ingredientIdleCss`).
 *
 * سه لایه‌ی SVG روی هم: پشت شیشه (بدنه + برچسب) ← ماده ← جلوی شیشه (براقی و در).
 * آیکون ماده SVG جداگانه است تا `transform-box: view-box` انیمیشن idle درست
 * حول مرکز 48×48 خودش بچرخد.
 */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { FlatSvg } from '../../art/flat/react/FlatSvg';
import { INGREDIENT_SIZE, flatIngredientById, ingredientIdleCss } from '../../art/flat/kit/ingredients.ts';
import { FLAT_JAR_SIZE, jarBackShape, jarFrontShape } from './flatJarShapes';

const ICON_STYLE: CSSProperties = {
  position: 'absolute',
  left: '25%',
  top: '31%',
  width: '50%',
  height: '50%',
};

export function FlatJar({ ingredientId, color }: { ingredientId: string; color: string }) {
  const kit = flatIngredientById(ingredientId);
  const back = useMemo(() => jarBackShape(color), [color]);
  const front = useMemo(() => jarFrontShape(), []);
  const icon = useMemo(() => kit?.shape(0) ?? null, [kit]);

  return (
    <span className="v2-jar__flat" data-testid={`v2-flat-jar-${ingredientId}`}>
      <FlatSvg shape={back} designSize={FLAT_JAR_SIZE} className="v2-jar__flat-layer" />
      {icon ? (
        <FlatSvg
          shape={icon}
          designSize={INGREDIENT_SIZE}
          className="v2-jar__flat-icon"
          style={ICON_STYLE}
          css={(prefix) => ingredientIdleCss(prefix)}
        />
      ) : null}
      <FlatSvg shape={front} designSize={FLAT_JAR_SIZE} className="v2-jar__flat-layer" />
    </span>
  );
}
