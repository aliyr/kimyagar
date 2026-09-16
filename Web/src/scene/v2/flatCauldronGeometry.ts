/**
 * هندسه‌ی پاتیل فلت در مختصات منطقی Stage + کمک‌تابع‌های خالص FlatCauldron
 * (جدا از کامپوننت تا در تست‌ها بدون React استفاده شوند).
 */

import { FLAT_POT_OFFSET, FLAT_SCENE_SIZE } from '../../art/flat/kit/scene.ts';
import { POT_GEOMETRY } from '../../art/flat/kit/props.ts';
import type { RGB } from '../../art/flat/kit/color.ts';
import { V2_ZONES } from './contracts';

export const FLAT_SCENE_ZONE = V2_ZONES.flatCookingScene;
export const FLAT_SCENE_SCALE = FLAT_SCENE_ZONE.width / FLAT_SCENE_SIZE;

/** مرکز و شعاع‌های دهانه‌ی دیگ در مختصات منطقی Stage (برای زاویه‌ی قاشق دستی) */
export const FLAT_MOUTH_CENTER = {
  x: FLAT_SCENE_ZONE.x + (FLAT_POT_OFFSET[0] + POT_GEOMETRY.mouth.cx) * FLAT_SCENE_SCALE,
  y: FLAT_SCENE_ZONE.y + (FLAT_POT_OFFSET[1] + POT_GEOMETRY.mouth.cy) * FLAT_SCENE_SCALE,
  rx: POT_GEOMETRY.mouth.rx * FLAT_SCENE_SCALE,
  ry: POT_GEOMETRY.mouth.ry * FLAT_SCENE_SCALE,
};

/** زاویه‌ی نقطه‌ی صحنه نسبت به دهانه (بیضی ⇒ دایره‌ی واحد؛ 0 = راست، ساعت‌گرد روی صفحه) */
export function spoonAngleFor(point: { x: number; y: number }): number {
  return Math.atan2(
    (point.y - FLAT_MOUTH_CENTER.y) / FLAT_MOUTH_CENTER.ry,
    (point.x - FLAT_MOUTH_CENTER.x) / FLAT_MOUTH_CENTER.rx,
  );
}

/** سوخته: ۴۵٪ اشباع‌زدایی و ۳۰٪ تیره‌تر (هم‌خوان با CauldronStationV2 بیت‌مپی) */
export function burntLiquid([r, g, b]: RGB): RGB {
  const grey = 0.299 * r + 0.587 * g + 0.114 * b;
  const k = 0.55;
  const dim = 0.7;
  return [(grey + (r - grey) * k) * dim, (grey + (g - grey) * k) * dim, (grey + (b - grey) * k) * dim];
}
