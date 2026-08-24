/**
 * محاسبه‌ی Contribution هر Entry به ازای هر Property.
 *
 * فرمول قرارداد (07_Alchemy_Technical_Spec):
 *   Contribution = Base × QuantityFactor × GrindingFactor × HeatExposureFactor
 *
 * ── مدل Heat/Exposure انتخاب‌شده (Workstream A) ──────────────────────────────
 * به‌جای ضرب یک HeatFactor لحظه‌ای در انتها، Contribution به‌صورت «انتگرال
 * افزایشی» روی مسیر استخراج انباشته می‌شود (exposure-weighted):
 *
 *   ΔContribution_p = Base_p × QuantityFactor × GrindingFactor_p
 *                     × HeatModifier_p(حرارتِ همان لحظه) × Δf
 *
 * که f همان کسر استخراج extractionFractionAt است. سهم اولیه (fresh = 0.35)
 * با Heat-at-entry وزن می‌گیرد و ادامه‌ی استخراج در advanceTime با حرارتی که
 * Entry واقعاً تجربه کرده. نتیجه:
 *   HeatExposureFactor نهایی = میانگین وزنی HeatModifier روی کسر استخراج‌شده.
 * چون f خطی-تکه‌ای است و حرارت داخل هر گام ثابت، انتگرال‌گیری دقیق و مستقل از
 * اندازه‌ی گام زمانی است (Deterministic و قابل توضیح در Debug View).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  GrindState,
  HeatLevel,
  IngredientDefinition,
  PropertyId,
  TuningConfig,
} from './types';
import { quantityFactorFor } from './curves';

/** ضریب Grind یک Property — Selective Extraction؛ پیش‌فرض ۱ */
export function grindingFactorOf(
  def: IngredientDefinition,
  grindState: GrindState,
  propertyId: PropertyId,
): number {
  return def.grindingModifiers[grindState]?.[propertyId] ?? 1;
}

/** ضریب Heat یک Property در یک سطح حرارت؛ پیش‌فرض ۱ */
export function heatModifierOf(
  def: IngredientDefinition,
  heat: HeatLevel,
  propertyId: PropertyId,
): number {
  return def.heatModifiers[heat]?.[propertyId] ?? 1;
}

export interface StaticPropertyFactor {
  propertyId: PropertyId;
  base: number;
  quantityFactor: number;
  grindingFactor: number;
}

/** عوامل ثابت (مستقل از زمان/حرارت) هر Property یک Entry */
export function staticFactorsOf(
  def: IngredientDefinition,
  quantity: number,
  grindState: GrindState,
  tuning: TuningConfig,
): StaticPropertyFactor[] {
  const quantityFactor = quantityFactorFor(quantity, tuning);
  return (Object.entries(def.baseProperties) as [PropertyId, number][])
    .filter(([, base]) => base !== 0)
    .map(([propertyId, base]) => ({
      propertyId,
      base,
      quantityFactor,
      grindingFactor: grindingFactorOf(def, grindState, propertyId),
    }));
}

/**
 * یک گام انتگرال افزایشی: Contribution های قبلی + سهم Δf با حرارت داده‌شده.
 * ورودی‌ها Mutate نمی‌شوند؛ همیشه شیء جدید برمی‌گردد.
 */
export function accumulateContributions(
  prev: Partial<Record<PropertyId, number>>,
  def: IngredientDefinition,
  quantity: number,
  grindState: GrindState,
  heat: HeatLevel,
  deltaFraction: number,
  tuning: TuningConfig,
): Partial<Record<PropertyId, number>> {
  const next: Partial<Record<PropertyId, number>> = { ...prev };
  if (deltaFraction <= 0) return next;
  for (const f of staticFactorsOf(def, quantity, grindState, tuning)) {
    const heatMod = heatModifierOf(def, heat, f.propertyId);
    const delta = f.base * f.quantityFactor * f.grindingFactor * heatMod * deltaFraction;
    next[f.propertyId] = (next[f.propertyId] ?? 0) + delta;
  }
  return next;
}
