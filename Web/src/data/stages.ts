/**
 * مراحل بازی — نقشه‌ی بازار روی سردر.
 *
 * فعلاً فقط مرحله‌ی اول («دکان») باز است؛ بقیه مُهر مومیِ قفل دارند. منطق
 * بازشدن مراحل بعداً این‌جا و در progress پیاده می‌شود؛ UI سردر همین داده را
 * می‌خواند و برای هر مرحله یک مُهر روی نقشه می‌گذارد.
 *
 * `mapX/mapY` جای مُهر روی تصویر intro/map_open.png است (درصدِ پهنا/ارتفاع؛
 * تصویر بدون trim ذخیره شده تا این مختصات ثابت بماند).
 */

export interface StageDefinition {
  id: string;
  nameFa: string;
  /** یک خطِ کوتاه زیر نام روی نقشه */
  hintFa: string;
  mapX: number;
  mapY: number;
}

export const stages: readonly StageDefinition[] = [
  { id: 'shop', nameFa: 'دکان', hintFa: 'دکان پدری؛ نخستین مشتری‌ها', mapX: 22.8, mapY: 74.3 },
  { id: 'lane', nameFa: 'راسته‌ی عطاران', hintFa: 'همسایه‌ها سراغت را می‌گیرند', mapX: 32.7, mapY: 67.4 },
  { id: 'caravanserai', nameFa: 'کاروانسرا', hintFa: 'مسافران و دردهای غریب', mapX: 41.8, mapY: 55.2 },
  { id: 'bathhouse', nameFa: 'گرمابه', hintFa: 'بوی عود و روغن', mapX: 52.8, mapY: 47.2 },
  { id: 'minaret', nameFa: 'مدرسه', hintFa: 'نسخه‌های کهنه و رازهای تازه', mapX: 62.3, mapY: 34.2 },
  { id: 'garden', nameFa: 'باغ', hintFa: 'گیاهانی که در دکان نیست', mapX: 75.8, mapY: 24.5 },
];

/** آیا مرحله باز است؟ فعلاً فقط مرحله‌ی اول. */
export function isStageUnlocked(index: number): boolean {
  return index === 0;
}
