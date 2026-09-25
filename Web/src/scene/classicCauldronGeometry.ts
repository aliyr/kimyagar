/**
 * هندسه‌ی پاتیل هیبرید کلاسیک: بدنه‌ی PNG می‌ماند و مایع/مواد/قاشق/بخار کیت فلت
 * (`FlatCookingScene`) روی یک Canvas مربعی رندر می‌شوند که طوری جای‌گذاری شده
 * که دهانه‌ی برداری آن دقیقاً روی دهانه‌ی واقعی تصویر بیفتد.
 *
 * زنجیره‌ی مختصات:
 *   پیکسل تصویر cauldron_body.png ⇒ (object-fit: contain در SCENE_ZONES.cauldron)
 *   ⇒ فضای صحنه‌ی 1920×1080 ⇒ (مقیاس CLASSIC_KIT_SCALE) ⇒ واحد طراحی کیت (512).
 *
 * توابع خالص این فایل بدون React در تست‌ها هم استفاده می‌شوند.
 */

import { FLAT_POT_OFFSET, FLAT_SCENE_SIZE } from '../art/flat/kit/scene.ts';
import type { DropOverride, FlatCookingScene, MouthGeometry } from '../art/flat/kit/scene.ts';
import { POT_GEOMETRY } from '../art/flat/kit/props.ts';
import { SCENE_ZONES } from './artManifest';

/** ابعاد فایل cauldron_body.png */
export const CAULDRON_IMAGE = { width: 1071, height: 750 } as const;

/**
 * بیضی دهانه‌ی داخلی (سطح مایع) در پیکسل تصویر — لبه‌ی داخلی حلقه‌ی مسی
 * (چپ ≈۱۵۷، راست ≈۹۲۰، بالا ≈۴۴، پایین ≈۲۱۷) منهای ~۴px تا لبه روی مایع بماند
 * و هیچ نوار تیره‌ای بین مایع و لبه دیده نشود.
 */
export const MOUTH_IN_IMAGE = { cx: 538, cy: 130, rx: 378, ry: 84 } as const;

const ZONE = SCENE_ZONES.cauldron;
/** مقیاس contain تصویر داخل Zone پاتیل */
export const CAULDRON_IMAGE_SCALE = Math.min(
  ZONE.width / CAULDRON_IMAGE.width,
  ZONE.height / CAULDRON_IMAGE.height,
);
const IMAGE_OFFSET = {
  x: ZONE.x + (ZONE.width - CAULDRON_IMAGE.width * CAULDRON_IMAGE_SCALE) / 2,
  y: ZONE.y + (ZONE.height - CAULDRON_IMAGE.height * CAULDRON_IMAGE_SCALE) / 2,
};

/** دهانه‌ی واقعی پاتیل در فضای صحنه */
export const CLASSIC_MOUTH = {
  x: IMAGE_OFFSET.x + MOUTH_IN_IMAGE.cx * CAULDRON_IMAGE_SCALE,
  y: IMAGE_OFFSET.y + MOUTH_IN_IMAGE.cy * CAULDRON_IMAGE_SCALE,
  rx: MOUTH_IN_IMAGE.rx * CAULDRON_IMAGE_SCALE,
  ry: MOUTH_IN_IMAGE.ry * CAULDRON_IMAGE_SCALE,
};

/** نقطه‌ی پایین بدنه‌ی PNG (لنگر squash & stretch) در فضای صحنه */
export const CLASSIC_POT_BASE = {
  x: IMAGE_OFFSET.x + (CAULDRON_IMAGE.width / 2) * CAULDRON_IMAGE_SCALE,
  y: IMAGE_OFFSET.y + CAULDRON_IMAGE.height * CAULDRON_IMAGE_SCALE,
};

/**
 * سوراخ اجاق روی سطح میز که پایه‌ی پاتیل داخل آن می‌نشیند (StoveHole):
 * بیضی هم‌مرکز با پایه، کمی بالاتر از آن تا ~۲۵px از ته دیگ داخل سوراخ پنهان
 * شود؛ شعاع افقی از پهنای حلقه‌ی پایه‌ی PNG (~۷۴۳px تصویر) کمی بزرگ‌تر است.
 */
export const STOVE_HOLE = {
  cx: CLASSIC_POT_BASE.x,
  cy: CLASSIC_POT_BASE.y - 25,
  rx: Math.round((743 / 2) * CAULDRON_IMAGE_SCALE) + 14,
  ry: 42,
};

/**
 * دهانه در فضای محلی دیگِ کیت: شعاع افقی همان ۸۸ واحد پیش‌فرض می‌ماند تا
 * قاشق و ذرات با همان نسبت‌های آشنا حرکت کنند؛ فقط شعاع عمودی با نسبت
 * دهانه‌ی PNG تنظیم می‌شود.
 */
export const CLASSIC_KIT_MOUTH: MouthGeometry = {
  cx: POT_GEOMETRY.mouth.cx,
  cy: POT_GEOMETRY.mouth.cy,
  rx: POT_GEOMETRY.mouth.rx,
  ry: Math.round((POT_GEOMETRY.mouth.rx * CLASSIC_MOUTH.ry) / CLASSIC_MOUTH.rx),
};

/** پیکسل صحنه به‌ازای هر واحد طراحی کیت */
export const CLASSIC_KIT_SCALE = CLASSIC_MOUTH.rx / CLASSIC_KIT_MOUTH.rx;

/** مرکز دهانه در فضای طراحی کیت (512) */
const KIT_MOUTH_CENTER = {
  x: FLAT_POT_OFFSET[0] + CLASSIC_KIT_MOUTH.cx,
  y: FLAT_POT_OFFSET[1] + CLASSIC_KIT_MOUTH.cy,
};

/** مستطیل Canvas افکت‌ها در فضای صحنه — مربعِ ۵۱۲ واحدی کیت، مقیاس‌شده و منطبق بر دهانه */
export const CLASSIC_FX_RECT = {
  x: CLASSIC_MOUTH.x - KIT_MOUTH_CENTER.x * CLASSIC_KIT_SCALE,
  y: CLASSIC_MOUTH.y - KIT_MOUTH_CENTER.y * CLASSIC_KIT_SCALE,
  width: FLAT_SCENE_SIZE * CLASSIC_KIT_SCALE,
  height: FLAT_SCENE_SIZE * CLASSIC_KIT_SCALE,
};

/** جای بخار بالای دهانه و پاشش قطرات روی بدنه‌ی دیگ (پیکسل صحنه) */
const STEAM_HEADROOM = 360;
const DROP_ROOM = 340;
export const CLASSIC_FX_RECT_TALL = {
  x: CLASSIC_MOUTH.x - CLASSIC_MOUTH.rx * 2.6,
  y: CLASSIC_MOUTH.y - CLASSIC_MOUTH.ry - STEAM_HEADROOM,
  width: CLASSIC_MOUTH.rx * 5.2,
  height: CLASSIC_MOUTH.ry * 2 + STEAM_HEADROOM + DROP_ROOM,
};

/** تبدیل نقطه‌ی صحنه به فضای طراحی کیت (برای تست هم‌ترازی) */
export function sceneToKit(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: (point.x - CLASSIC_FX_RECT.x) / CLASSIC_KIT_SCALE,
    y: (point.y - CLASSIC_FX_RECT.y) / CLASSIC_KIT_SCALE,
  };
}

/** زاویه‌ی نقطه‌ی صحنه نسبت به دهانه (بیضی ⇒ دایره‌ی واحد؛ 0 = راست، ساعت‌گرد روی صفحه) */
export function classicSpoonAngleFor(point: { x: number; y: number }): number {
  return Math.atan2((point.y - CLASSIC_MOUTH.y) / CLASSIC_MOUTH.ry, (point.x - CLASSIC_MOUTH.x) / CLASSIC_MOUTH.rx);
}

/**
 * قاشق مواد را داخل دیگ ریخته است. `drop` کیت همیشه از بالای قاب می‌افتد؛
 * این تابع همان فرود را قبل از نقاشی تمام می‌کند تا افتادن دوم دیده نشود.
 */
export function settlePouredIngredient(
  scene: FlatCookingScene,
  ingredientId: string,
  override?: DropOverride,
): void {
  scene.drop(ingredientId, override);
  scene.update(0);
  const falling = (scene as unknown as { falling: { y: number } | null }).falling;
  if (!falling) return;
  falling.y = scene.surfaceY + 40;
  scene.update(0.016);
}

/** پیشرفت فرورفتن یک ماده: Exposure نسبت به آستانه‌ی «رسیده» (۰..۱) */
export function sinkProgress(exposure: number, readyThreshold: number): number {
  if (readyThreshold <= 0) return 1;
  return Math.min(1, Math.max(0, exposure / readyThreshold));
}
