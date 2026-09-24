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
 * مختصات‌ها با لایه‌های هنری موجود در public/art هم‌تراز شده‌اند؛
 * هندسه‌ی کوبه/تپه در `mortarLayout.ts` است.
 */
const MORTAR = SCENE_ZONES.mortar;
/** مستطیل نسبی داخل Zone هاون (کسرهای پهنا/بلندی) ⇒ فضای صحنه */
function mortarRel(fx: number, fy: number, fw: number, fh: number): Rect {
  return {
    x: Math.round(MORTAR.x + fx * MORTAR.width),
    y: Math.round(MORTAR.y + fy * MORTAR.height),
    width: Math.round(fw * MORTAR.width),
    height: Math.round(fh * MORTAR.height),
  };
}

export const PROPS = {
  /** برچسب وضعیت کوبش / راهنمای کوتاه زیر هاون (هم‌مرکز با هاون) */
  mortarLabel: { x: Math.round(MORTAR.x + MORTAR.width / 2 - 163), y: MORTAR.y + MORTAR.height + 8, width: 326, height: 46 },
  /** قلم‌موی کوچک برای خالی کردن هاون، کنار راست کاسه */
  brush: mortarRel(1.03, 0.5, 0.19, 0.38),
  /**
   * دفترچه‌ی چرمی — پایین‌راست صحنه، جلوی پیشخوان (z=46) تا همیشه در دسترس
   * باشد و با قفسه/پاتیل/شیشه تلاقی نکند.
   */
  notebook: { x: 1740, y: 900, width: 150, height: 165 },
  /** دسته‌ی کاغذهای فرایند، روی سطح میز بین شیشه و پیشخوان */
  ledger: { x: 1296, y: 712, width: 136, height: 76 },
  /** سطل خالی‌کردن پاتیل */
  bucket: { x: 590, y: 958, width: 96, height: 112 },
  /** راهنمای کوتاه هم‌زدن، بالای پاتیل */
  stirHint: { x: 655, y: 396, width: 440, height: 48 },
} satisfies Record<string, Rect>;

/**
 * سه اهرم برنجی حرارت، ستونی کنار راستِ دهانه‌ی کوره (بالاتر = داغ‌تر).
 * بیرون از Zone کوره تا روی شعله‌ها نیفتند و لمس آسان بماند؛ ترتیب آرایه
 * همان ORDER (ملایم، متوسط، تند) است.
 */
export const HEAT_NOTCHES: { x: number; y: number; width: number; height: number }[] = [
  { x: 968, y: 1014, width: 104, height: 60 },
  { x: 968, y: 952, width: 104, height: 60 },
  { x: 968, y: 890, width: 104, height: 60 },
];

