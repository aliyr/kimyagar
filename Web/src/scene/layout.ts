/**
 * چیدمان اشیای کوچک روی میز و ناحیه‌های Drop — مکمل SCENE_ZONES.
 *
 * SCENE_ZONES قرارداد مشترک صحنه است و تغییر نمی‌کند؛ این فایل جزئیات
 * فیزیکی متعلق به Workstream B را نگه می‌دارد (همه در فضای منطقی 1920×1080).
 */

import { SCENE_ZONES } from './artManifest';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** ناحیه‌هایی که می‌توان یک شیء را در آن‌ها رها کرد */
export type DropTargetId = 'mortar' | 'cauldron' | 'bottling';

export function expand(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, width: r.width + by * 2, height: r.height + by * 2 };
}

export function centerOf(r: Rect): { x: number; y: number } {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

export function contains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x <= r.x + r.width && y <= r.y + r.height;
}

/**
 * هیت‌باکس‌های Drop سخاوتمندانه بزرگ‌ترند تا رهاکردن روی لمس امن باشد
 * (بخش ۱۵.۲ سند UX: «مقصدهای Drag باید بزرگ و واضح باشند»).
 */
export const DROP_TARGETS: Record<DropTargetId, Rect> = {
  mortar: expand(SCENE_ZONES.mortar, 70),
  cauldron: expand(SCENE_ZONES.cauldron, 80),
  bottling: expand(SCENE_ZONES.bottlingPoint, 100),
};

export function hitTestDrop(
  x: number,
  y: number,
  targets: readonly DropTargetId[],
): DropTargetId | null {
  for (const id of targets) {
    if (contains(DROP_TARGETS[id], x, y)) return id;
  }
  return null;
}

/**
 * اشیای کوچک روی میز — هرکدام یک شیء فیزیکی قابل لمس.
 * مختصات‌ها با لایه‌های هنری موجود در public/art هم‌تراز شده‌اند
 * (سرِ دسته‌هاون داخل دهانه‌ی کاسه، ماده روی دهانه، و…).
 */
export const PROPS = {
  /** دسته‌هاون؛ سرِ آن داخل کاسه و دسته رو به بالا-راست */
  pestle: { x: 360, y: 486, width: 176, height: 234 },
  /** ماده‌ی داخل هاون — کل دهانه‌ی کاسه را پر می‌کند */
  mortarContents: { x: 308, y: 634, width: 224, height: 88 },
  /** برچسب وضعیت کوبش / راهنمای کوتاه زیر هاون */
  mortarLabel: { x: 258, y: 906, width: 326, height: 46 },
  /** قلم‌موی کوچک برای خالی کردن هاون */
  brush: { x: 588, y: 756, width: 58, height: 108 },
  /**
   * دفترچه‌ی چرمیِ تکیه‌داده به دیوار، عقبِ میز و سمت راست.
   * بیرون از برد کابینتِ باز (x < 640) تا وقتی کابینت بیرون می‌آید رویش نیفتد.
   */
  notebook: { x: 1290, y: 512, width: 136, height: 178 },
  /** دسته‌ی کاغذهای فرایند، کنار لبه‌ی پاتیل */
  ledger: { x: 1096, y: 972, width: 164, height: 92 },
  /** سطل خالی‌کردن پاتیل */
  bucket: { x: 590, y: 958, width: 96, height: 112 },
  /** راهنمای کوتاه هم‌زدن، بالای پاتیل */
  stirHint: { x: 655, y: 396, width: 440, height: 48 },
} satisfies Record<string, Rect>;

/**
 * سه اهرم برنجی حرارت، روی لبه‌ی جلویی میز زیر اجاق.
 * بیرون از Zone اجاق تا روی خودِ شعله‌ها نیفتند و لمس آسان بماند.
 */
export const HEAT_NOTCHES: { x: number; y: number; width: number; height: number }[] = [
  { x: 700, y: 1000, width: 108, height: 76 },
  { x: 838, y: 1000, width: 108, height: 76 },
  { x: 976, y: 1000, width: 108, height: 76 },
];

