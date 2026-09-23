/**
 * ساعت واقعی دستگاه ⇒ نور و رنگ آسمانِ سردر.
 *
 *   ۴:۰۰–۱۰:۵۹  سحر   لاجوردی روشن + صورتی کم‌رنگ، ماه کم‌رنگ
 *   ۱۱:۰۰–۱۸:۵۹ غروب  کهربایی/زرشکی، ماه محو
 *   ۱۹:۰۰–۳:۵۹  شب    لاجوردی عمیق، ماه و ستاره، شب‌تاب
 *
 * خروجی: CSS custom property ها که روی ریشه‌ی اینترو می‌نشینند. تصویر آسمان
 * (ماه/ستاره) یکی است و با opacity کم و زیاد می‌شود؛ رنگ آسمان گرادینت CSS است.
 *
 * `?hour=NN` روی آدرس، ساعت را برای بازبینی override می‌کند.
 */

export type TimeOfDay = 'dawn' | 'dusk' | 'night';

export interface SkyTheme {
  /** بالای آسمان */
  skyA: string;
  /** میانه */
  skyB: string;
  /** افق (بالای دیوار) */
  skyC: string;
  /** شفافیت ماه و ستاره‌ها */
  moon: number;
  stars: number;
  /** روشنایی نمای دکان (filter brightness) */
  facadeBrightness: number;
  facadeSaturate: number;
  /** فیلتر رنگیِ نسخه‌ی دوم نما (روی خودش) و شفافیت آن */
  tintFilter: string;
  tintOpacity: number;
  /** شدت نور فانوس و پنجره‌ها */
  lanternStrength: number;
  /** شفافیت سایه‌ی رهگذر؛ هرچه هوا روشن‌تر، کم‌رنگ‌تر */
  passerOpacity: number;
  fireflies: boolean;
}

export function timeOfDayForHour(hour: number): TimeOfDay {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 4 && h < 11) return 'dawn';
  if (h >= 11 && h < 19) return 'dusk';
  return 'night';
}

export const SKY_THEMES: Record<TimeOfDay, SkyTheme> = {
  night: {
    skyA: '#070a1c',
    skyB: '#111a3f',
    skyC: '#26305e',
    moon: 1,
    stars: 1,
    facadeBrightness: 0.7,
    facadeSaturate: 0.9,
    tintFilter: 'sepia(0.35) hue-rotate(190deg) saturate(1.3) brightness(0.5)',
    tintOpacity: 0.3,
    lanternStrength: 1,
    passerOpacity: 0.5,
    fireflies: true,
  },
  dusk: {
    skyA: '#1f1230',
    skyB: '#6e2a3a',
    skyC: '#d4823f',
    moon: 0.38,
    stars: 0.15,
    facadeBrightness: 0.86,
    facadeSaturate: 1.05,
    tintFilter: 'sepia(0.7) hue-rotate(-18deg) saturate(1.8) brightness(0.8)',
    tintOpacity: 0.32,
    lanternStrength: 0.8,
    passerOpacity: 0.3,
    fireflies: false,
  },
  dawn: {
    skyA: '#2c3f7a',
    skyB: '#8a7ea8',
    skyC: '#e9c0ae',
    moon: 0.28,
    stars: 0,
    facadeBrightness: 0.96,
    facadeSaturate: 0.95,
    tintFilter: 'sepia(0.35) hue-rotate(215deg) saturate(1.2) brightness(0.95)',
    tintOpacity: 0.26,
    lanternStrength: 0.5,
    passerOpacity: 0.16,
    fireflies: false,
  },
};

/** متغیرهای CSS برای یک ساعت مشخص */
export function skyVars(theme: SkyTheme): Record<string, string> {
  return {
    '--sky-a': theme.skyA,
    '--sky-b': theme.skyB,
    '--sky-c': theme.skyC,
    '--moon-opacity': String(theme.moon),
    '--stars-opacity': String(theme.stars),
    '--facade-brightness': String(theme.facadeBrightness),
    '--facade-saturate': String(theme.facadeSaturate),
    '--tint-filter': theme.tintFilter,
    '--tint-opacity': String(theme.tintOpacity),
    '--lantern-strength': String(theme.lanternStrength),
    '--passer-opacity': String(theme.passerOpacity),
  };
}

/** ساعت override از query string (`?hour=21`)، وگرنه null */
export function hourOverride(search: string): number | null {
  const m = /[?&]hour=(\d{1,2})/.exec(search);
  if (!m) return null;
  const h = Number(m[1]);
  return Number.isFinite(h) && h >= 0 && h < 24 ? h : null;
}

export function currentTimeOfDay(now: Date = new Date(), search = typeof window === 'undefined' ? '' : window.location.search): TimeOfDay {
  const over = hourOverride(search);
  return timeOfDayForHour(over ?? now.getHours());
}
