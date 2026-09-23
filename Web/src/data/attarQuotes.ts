/**
 * بیت‌های ورقِ سردر — عطار نیشابوری که خودش عطار (داروفروش) بود.
 *
 * انتخاب با «روزِ سال» انجام می‌شود تا هر روز بیتی ثابت دیده شود (نه در هر
 * بازدید یکی). بیت‌هایی که سندشان قطعی نیست با `attribution` مشخص شده‌اند.
 */

export interface AttarQuote {
  /** دو مصراع */
  lines: [string, string];
  /** منبع/انتساب — زیر بیت با حروف کوچک می‌آید */
  attribution: string;
}

export const attarQuotes: readonly AttarQuote[] = [
  {
    lines: ['آفرین جان‌آفرین پاک را', 'آن‌که جان بخشید و ایمان خاک را'],
    attribution: 'عطار، منطق‌الطیر',
  },
  {
    lines: ['گر مرد رهی میان خون باید رفت', 'از پای فتاده سرنگون باید رفت'],
    attribution: 'عطار، مختارنامه',
  },
  {
    lines: ['تو پای به راه در نه و هیچ مپرس', 'خود راه بگویدت که چون باید رفت'],
    attribution: 'عطار، مختارنامه',
  },
  {
    lines: ['چون نگه کردند آن سی مرغ زود', 'بی‌شک این سی مرغ آن سیمرغ بود'],
    attribution: 'عطار، منطق‌الطیر',
  },
  {
    lines: ['ره میخانه و مسجد کدام است', 'که هر دو بر من مسکین حرام است'],
    attribution: 'عطار، دیوان غزلیات',
  },
  {
    lines: ['ای دل اگر عاشقی در پی دلدار باش', 'بر در دل روز و شب منتظر یار باش'],
    attribution: 'منسوب به عطار',
  },
  {
    lines: ['هفت شهر عشق را عطار گشت', 'ما هنوز اندر خم یک کوچه‌ایم'],
    attribution: 'مولانا، در وصف عطار',
  },
];

/** شماره‌ی روز در سال (۰..۳۶۵) به وقت محلی */
export function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/** بیتِ امروز — تابع خالص برای تست */
export function quoteForDate(date: Date, quotes: readonly AttarQuote[] = attarQuotes): AttarQuote {
  const idx = (dayOfYear(date) + date.getFullYear()) % quotes.length;
  return quotes[idx];
}
