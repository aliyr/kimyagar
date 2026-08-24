/**
 * Fixture های Inline برای تست‌های موتور — عمداً از src/data وارد نمی‌شود
 * (داده‌های آن فولدر توسط Agent دیگری به‌صورت موازی تکمیل می‌شود).
 */

import type {
  AlchemyDefinitions,
  AxisDefinition,
  CustomerDefinition,
  CustomerRequirement,
  GrindState,
  IngredientDefinition,
  PropertyDefinition,
  PropertyId,
  Quantity,
  RequirementKind,
  TuningConfig,
} from '../../src/engine/types';
import * as engine from '../../src/engine';

/** آیینه‌ی src/data/tuning.json — مستقل تا تغییرات موازی تست را نشکند */
export const TUNING: TuningConfig = {
  quantityCurve: [
    { quantity: 0.5, factor: 0.6 },
    { quantity: 1.0, factor: 1.0 },
    { quantity: 1.5, factor: 1.4 },
    { quantity: 2.0, factor: 1.7 },
    { quantity: 3.0, factor: 2.15 },
    { quantity: 4.0, factor: 2.4 },
  ],
  heatExposureRate: { low: 0.6, medium: 1.0, high: 1.6 },
  stageThresholds: { extracting: 4, ready: 14, overprocessed: 42 },
  extractionFraction: { fresh: 0.35, extracting: 0.7, ready: 1.0 },
  tensionCostFactor: 0.08,
  stirCorrections: [0.15, 0.08, 0.03],
  instabilityNormalization: 1.4,
  stabilityQualityCurve: [
    { stability: 0.9, modifier: 1.0 },
    { stability: 0.75, modifier: 0.98 },
    { stability: 0.6, modifier: 0.93 },
    { stability: 0.45, modifier: 0.82 },
    { stability: 0.3, modifier: 0.65 },
    { stability: 0.15, modifier: 0.4 },
  ],
  bandThresholds: { excellent: 90, good: 70, partial: 40 },
  processErrorPenalty: { fresh: 0.25, extracting: 0.1, overprocessed: 0.3 },
  evaluationWeights: {
    mustHave: 70,
    avoid: 30,
    preferredBonus: 8,
    tagBonus: 6,
    sideEffectPenaltyPerUnit: 6,
    sideEffectFreeThreshold: 0.8,
  },
};

const AXIS_SPECS: { id: string; positive: PropertyId; negative: PropertyId }[] = [
  { id: 'calm_excitement', positive: 'calm', negative: 'excitement' },
  { id: 'sleep_wake', positive: 'sleep', negative: 'wake' },
  { id: 'warm_cold', positive: 'warm', negative: 'cold' },
  { id: 'strength_weakness', positive: 'strength', negative: 'weakness' },
  { id: 'focus_distract', positive: 'focus', negative: 'distract' },
];

const INDEPENDENT_PROPERTIES: PropertyId[] = ['pain_relief', 'joy'];

const THRESHOLDS = { low: 0.5, medium: 1.2, high: 2.2, veryHigh: 3.2 };

export const AXES: AxisDefinition[] = AXIS_SPECS.map((a) => ({
  id: a.id,
  nameFa: a.id,
  positiveProperty: a.positive,
  negativeProperty: a.negative,
}));

export const PROPERTIES: PropertyDefinition[] = [
  ...AXIS_SPECS.flatMap((a): PropertyDefinition[] => [
    {
      id: a.positive,
      nameFa: a.positive,
      type: 'axis_side',
      axisId: a.id,
      oppositePropertyId: a.negative,
      thresholds: THRESHOLDS,
    },
    {
      id: a.negative,
      nameFa: a.negative,
      type: 'axis_side',
      axisId: a.id,
      oppositePropertyId: a.positive,
      thresholds: THRESHOLDS,
    },
  ]),
  ...INDEPENDENT_PROPERTIES.map(
    (id): PropertyDefinition => ({ id, nameFa: id, type: 'independent', thresholds: THRESHOLDS }),
  ),
];

export function ing(
  partial: Partial<IngredientDefinition> & {
    id: string;
    baseProperties: IngredientDefinition['baseProperties'];
  },
): IngredientDefinition {
  return {
    nameFa: partial.id,
    nameEn: partial.id,
    flavorFa: '',
    color: '#888888',
    complexity: 0.05,
    grindingModifiers: {},
    heatModifiers: {},
    ...partial,
  };
}

// پروفایل‌های Prototype از سند 02/08 — با پسوند like چون داده‌ی رسمی جای دیگری است
export const CHAMOMILE = ing({
  id: 'chamomile_like',
  complexity: 0.03,
  baseProperties: { calm: 3.0, sleep: 2.0, warm: 0.6 },
});

export const BORAGE = ing({
  id: 'borage_like',
  complexity: 0.04,
  baseProperties: { calm: 2.4, joy: 0.8, sleep: 0.7, warm: 0.5 },
});

export const MINT = ing({
  id: 'mint_like',
  complexity: 0.06,
  baseProperties: { wake: 2.4, cold: 2.2, focus: 1.0, pain_relief: 0.6 },
  // Heat-sensitive: حرارت زیاد خواص را می‌سوزاند
  heatModifiers: { high: { wake: 0.55, cold: 0.5, focus: 0.6, pain_relief: 0.7 } },
});

export const SAFFRON = ing({
  id: 'saffron_like',
  complexity: 0.08,
  quantitySensitive: true,
  baseProperties: { joy: 3.0, focus: 2.1, warm: 1.5, excitement: 0.6 },
});

export const POPPY = ing({
  id: 'poppy_like',
  complexity: 0.1,
  baseProperties: { pain_relief: 3.3, sleep: 3.0, weakness: 2.0, calm: 0.7 },
  // Selective Extraction (سند 02 بخش 4)
  grindingModifiers: { crushed: { pain_relief: 0.95, sleep: 0.6, weakness: 0.5 } },
});

export const GINGER = ing({
  id: 'ginger_like',
  complexity: 0.06,
  baseProperties: { warm: 3.0, strength: 2.2, wake: 0.6, excitement: 0.5 },
  // Heat-loving؛ High Heat هدف Excitement ~×2.2 (سند 08)
  heatModifiers: {
    high: { warm: 1.15, strength: 1.1, excitement: 2.2 },
    low: { warm: 0.85, strength: 0.85 },
  },
});

export const ALL_INGREDIENTS = [CHAMOMILE, BORAGE, MINT, SAFFRON, POPPY, GINGER];

export function makeDefs(overrides?: Partial<AlchemyDefinitions>): AlchemyDefinitions {
  return {
    properties: PROPERTIES,
    axes: AXES,
    ingredients: ALL_INGREDIENTS,
    customers: [],
    qualityTags: [],
    tuning: TUNING,
    ...overrides,
  };
}

export function req(
  kind: RequirementKind,
  propertyId: PropertyId,
  threshold: number,
  direction: 'at_least' | 'at_most',
  extra?: Partial<CustomerRequirement>,
): CustomerRequirement {
  return {
    kind,
    propertyId,
    threshold,
    direction,
    metFeedbackFa: `met:${propertyId}`,
    unmetFeedbackFa: `unmet:${propertyId}`,
    ...extra,
  };
}

export function customer(
  id: string,
  requirements: CustomerRequirement[],
  preferredTags?: string[],
): CustomerDefinition {
  return {
    id,
    nameFa: id,
    requestFa: id,
    summaryFa: id,
    requirements,
    preferredTags,
    appearance: 'test',
  };
}

export interface AddSpec {
  id: string;
  quantity?: Quantity;
  grind?: GrindState;
}

/** ساخت Brew: افزودن مواد و رساندن همه به Stage آماده (Ready) روی حرارت متوسط */
export function readyBrew(defs: AlchemyDefinitions, adds: AddSpec[]) {
  let brew = engine.createBrew();
  for (const a of adds) {
    brew = engine.addIngredient(brew, a.id, a.quantity ?? 1, a.grind ?? 'fine', defs);
  }
  // نرخ متوسط = 1.0 ⇒ بعد از ۱۴ ثانیه exposure = آستانه‌ی ready
  return engine.advanceTime(brew, 14, defs);
}

/** Bottle یک Brew آماده‌شده — میان‌بر رایج تست‌ها */
export function readyPotion(defs: AlchemyDefinitions, adds: AddSpec[]) {
  return engine.bottle(readyBrew(defs, adds), defs);
}

export function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const value of Object.values(obj)) deepFreeze(value);
  }
  return obj;
}
