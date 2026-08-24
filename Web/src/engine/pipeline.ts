/**
 * پیاده‌سازی موتور کیمیاگری (Workstream A) — نقطه‌ی تجمیع API عمومی.
 *
 * پیاده‌سازی در ماژول‌های تخصصی است:
 * - curves.ts     درون‌یابی منحنی‌های Tuning (Quantity، Extraction، Stability)
 * - extraction.ts فرمول Contribution و مدل Heat/Exposure (انتگرال افزایشی)
 * - brew.ts       Action های Runtime: createBrew/addIngredient/setHeat/stir/advanceTime
 * - bottle.ts     Final Pipeline: Axis Resolution، Tension، Stability، Tags
 * - evaluation.ts Smooth Evaluation مشتری + واکنش انسانی
 * - labels.ts     برچسب‌های کیفی Player-facing
 *
 * امضاهای عمومی در types.ts (AlchemyEngineApi) قرارداد ثابت‌اند.
 */

export { createBrew, addIngredient, setHeat, stir, advanceTime } from './brew';
export { bottle } from './bottle';
export { evaluate } from './evaluation';
export { qualitativeLevel, stabilityLabelOf } from './labels';
