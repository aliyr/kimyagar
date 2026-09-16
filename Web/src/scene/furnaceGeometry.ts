/**
 * هندسه‌ی کوره‌ی توکار میز: دهانه‌ی طاق (ناحیه‌ی تیره‌ی داخل قوس) در پیکسل
 * تصویر work_table.png (اندازه‌گیری در tools/build_work_table.mjs) ⇒ فضای صحنه
 * با همان object-fit: contain که ArtLayer برای SCENE_ZONES.workTable انجام می‌دهد.
 */

import { SCENE_ZONES } from './artManifest';

/** ابعاد فایل trim‌شده‌ی work_table.png */
export const TABLE_IMAGE = { width: 1250, height: 462 } as const;
/** دهانه‌ی طاق کوره در پیکسل تصویر (از رأس قوس تا شبکه‌ی آهنی) */
export const FURNACE_IN_IMAGE = { x: 543, y: 284, width: 159, height: 132 } as const;

const ZONE = SCENE_ZONES.workTable;
export const TABLE_IMAGE_SCALE = Math.min(ZONE.width / TABLE_IMAGE.width, ZONE.height / TABLE_IMAGE.height);
const OFFSET = {
  x: ZONE.x + (ZONE.width - TABLE_IMAGE.width * TABLE_IMAGE_SCALE) / 2,
  y: ZONE.y + (ZONE.height - TABLE_IMAGE.height * TABLE_IMAGE_SCALE) / 2,
};

/** دهانه‌ی کوره در فضای صحنه — Canvas آتش دقیقاً همین مستطیل است */
export const FURNACE_RECT = {
  x: OFFSET.x + FURNACE_IN_IMAGE.x * TABLE_IMAGE_SCALE,
  y: OFFSET.y + FURNACE_IN_IMAGE.y * TABLE_IMAGE_SCALE,
  width: FURNACE_IN_IMAGE.width * TABLE_IMAGE_SCALE,
  height: FURNACE_IN_IMAGE.height * TABLE_IMAGE_SCALE,
};

/** شدت آتش کوره برای هر درجه‌ی بازی (سطح اتوماتای Fire) */
export const FURNACE_LEVEL = { low: 0.35, medium: 0.7, high: 1 } as const;
