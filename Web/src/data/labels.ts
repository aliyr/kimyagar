/**
 * برچسب‌های فارسی Player-facing.
 * زبان UI کیفی است؛ عدد خام فقط در Debug View نمایش داده می‌شود.
 */

import type {
  GrindState,
  HeatLevel,
  ProcessEventType,
  ProcessStage,
  QualitativeLevel,
  QualityBand,
  Quantity,
  StabilityLabel,
} from '../engine/types';

export const qualitativeLabels: Record<QualitativeLevel, string> = {
  none: '—',
  low: 'کم',
  medium: 'متوسط',
  high: 'زیاد',
  very_high: 'بسیار زیاد',
};

export const stabilityLabels: Record<StabilityLabel, string> = {
  stable: 'پایدار',
  slightly_unstable: 'کمی ناپایدار',
  unstable: 'ناپایدار',
  very_unstable: 'بسیار ناپایدار',
};

export const bandLabels: Record<QualityBand, string> = {
  excellent: 'عالی',
  good: 'خوب',
  partial: 'نیمه‌کاره',
  failure: 'ناموفق',
};

export const grindLabels: Record<GrindState, string> = {
  coarse: 'درشت',
  crushed: 'نیم‌کوب',
  fine: 'نرم',
};

export const heatLabels: Record<HeatLevel, string> = {
  low: 'ملایم',
  medium: 'متوسط',
  high: 'تند',
};

export const stageLabels: Record<ProcessStage, string> = {
  fresh: 'تازه',
  extracting: 'در حال جوشش',
  ready: 'رسیده',
  overprocessed: 'جوشیده و سوخته',
};

export const quantityLabels: Record<Quantity, string> = {
  0.5: '۰٫۵',
  1: '۱',
  1.5: '۱٫۵',
  2: '۲',
  3: 'سه واحد',
  4: 'چهار واحد',
  5: 'پنج واحد',
  6: 'شش واحد',
};

export const processEventLabels: Record<ProcessEventType, string> = {
  ingredient_added: 'افزودن ماده',
  heat_changed: 'تغییر حرارت',
  stirred: 'هم‌زدن',
  bottled: 'بطری کردن',
  brew_reset: 'خالی کردن پاتیل',
};

export const uiLabels = {
  gameTitle: 'کیمیاگر',
  gateSubtitle: 'دکان عطاری، هنوز باز نشده',
  gateStart: 'شروع بازی',
  gateStages: 'مراحل',
  gateScores: 'امتیازها',
  gateSealed: 'هنوز مهر نشده',
  gateReturn: 'سردر',
  bottleAction: 'بطری کردن',
  stirHint: 'برای هم‌زدن، انگشتت را دور پاتیل بچرخان',
  grindHint: 'برای کوبیدن، دسته‌هاون را بچرخان',
  /** فلو کلیکی کلاسیک */
  grindingHint: 'دارد کوبیده می‌شود… هر وقت خواستی هاون را لمس کن',
  tapMortarHint: 'برای ریختن در پاتیل، هاون را لمس کن',
  tapToBottleHint: 'برای ریختن در شیشه، پاتیل را لمس کن',
  jarTapHint: 'یک شیشه را لمس کن تا در هاون بریزد',
  soundOn: 'صدا روشن',
  soundOff: 'صدا خاموش',
  settings: 'تنظیمات',
  settingSound: 'صدای کارگاه',
  settingSoundHint: 'قُل‌قُل پاتیل، ترق آتش و کوبش هاون',
  settingHaptics: 'لرزش',
  settingHapticsHint: 'بازخورد لمسی در گوشی (کوبش، ریختن، تحویل)',
  on: 'روشن',
  off: 'خاموش',
  deliver: 'تحویل به مشتری',
  keep: 'نگه داشتن',
  retry: 'آزمایش دوباره',
  repeatLast: 'تکرار آخرین دم',
  resetBrew: 'خالی کردن پاتیل',
  notebook: 'دفترچه',
  processHistory: 'آنچه تا حالا ریخته‌ای',
  customerRequest: 'سفارش مشتری',
  quantity: 'مقدار',
  addToCauldron: 'به پاتیل بریز',
  nextCustomer: 'مشتری بعدی',
  debugView: 'نمای اشکال‌زدایی',
  potionReady: 'معجون آماده شد',
  unknownSecret: 'هنوز رازش را نمی‌دانی...',
  unknownMark: '؟؟؟',
  emptyHistory: 'هنوز چیزی در پاتیل نریخته‌ای.',
  effectProfile: 'اثر معجون',
  processSummary: 'خلاصه‌ی کار',
  qualityTagsHeading: 'نشان‌های کیفیت',
  notebookTags: 'نشان‌های کشف‌شده',
  notebookIngredients: 'مواد آزموده',
  stirCount: 'هم‌زدن',
  heatChanges: 'تغییرهای حرارت',
  noDiscoveries: 'هنوز نشانی کشف نکرده‌ای.',
  closeOverlay: 'بستن',
  heatAtEntry: 'حرارتِ ورود',
  grindState: 'کوبش',
};
