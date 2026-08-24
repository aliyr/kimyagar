/**
 * Final Pipeline (سند 07 بخش 5):
 * Entries → استخراج به‌ازای Property → جمع Raw → Axis Resolution → Quality Tags
 * → Tension → Stability → PotionResult تغییرناپذیر + DebugBreakdown کامل.
 */

import type {
  AlchemyDefinitions,
  BrewState,
  DebugContribution,
  DiscoveryEvent,
  PotionResult,
  PropertyId,
  ResolvedAxis,
} from './types';
import { clamp01 } from './curves';
import { staticFactorsOf } from './extraction';
import { ingredientDefOf } from './brew';
import { stabilityLabelOf } from './labels';

const EPS = 1e-9;

export function bottle(state: BrewState, defs: AlchemyDefinitions): PotionResult {
  const tuning = defs.tuning;

  // ۱+۲+۳ — Contribution های نهایی هر Entry (که به‌صورت افزایشی انباشته شده‌اند)
  // به Raw جمع می‌شوند؛ Breakdown کامل برای Debug View ساخته می‌شود.
  const debugContributions: DebugContribution[] = [];
  const rawContributions: Partial<Record<PropertyId, number>> = {};
  for (const entry of state.entries) {
    const def = ingredientDefOf(defs, entry.ingredientId);
    for (const f of staticFactorsOf(def, entry.quantity, entry.grindState, tuning)) {
      const final = entry.contributions[f.propertyId] ?? 0;
      const staticPart = f.base * f.quantityFactor * f.grindingFactor;
      debugContributions.push({
        entryId: entry.id,
        ingredientId: entry.ingredientId,
        propertyId: f.propertyId,
        base: f.base,
        quantityFactor: f.quantityFactor,
        grindingFactor: f.grindingFactor,
        // میانگین وزنی HeatModifier × کسر استخراج (مدل extraction.ts)
        heatExposureFactor: staticPart > EPS ? final / staticPart : 0,
        final,
      });
      rawContributions[f.propertyId] = (rawContributions[f.propertyId] ?? 0) + final;
    }
  }

  // ۴ — Axis Resolution: Resolved = SideA − SideB؛ سمت غالب در Effect Profile
  const resolvedAxes: ResolvedAxis[] = defs.axes.map((axis) => {
    const sideA = rawContributions[axis.positiveProperty] ?? 0;
    const sideB = rawContributions[axis.negativeProperty] ?? 0;
    const resolved = sideA - sideB;
    let dominantProperty: PropertyId | null = null;
    if (resolved > EPS) dominantProperty = axis.positiveProperty;
    else if (resolved < -EPS) dominantProperty = axis.negativeProperty;
    return {
      axisId: axis.id,
      sideAProperty: axis.positiveProperty,
      sideBProperty: axis.negativeProperty,
      sideA,
      sideB,
      resolved,
      dominantProperty,
      tension: Math.min(sideA, sideB),
    };
  });

  const axisProperties = new Set<PropertyId>();
  for (const axis of defs.axes) {
    axisProperties.add(axis.positiveProperty);
    axisProperties.add(axis.negativeProperty);
  }

  const effectProfile: Partial<Record<PropertyId, number>> = {};
  for (const axis of resolvedAxes) {
    if (axis.dominantProperty) effectProfile[axis.dominantProperty] = Math.abs(axis.resolved);
  }
  // Property های Independent (خارج از هر Axis) مستقیم عبور می‌کنند
  for (const [propertyId, value] of Object.entries(rawContributions) as [PropertyId, number][]) {
    if (!axisProperties.has(propertyId) && value > EPS) effectProfile[propertyId] = value;
  }

  // ۹ — Tension: Balance ≠ Absence
  const totalTension = resolvedAxes.reduce((sum, a) => sum + a.tension, 0);

  // ۱۰ — Stability (سند 03 بخش 7)
  const complexity = state.entries.reduce(
    (sum, e) => sum + ingredientDefOf(defs, e.ingredientId).complexity,
    0,
  );
  const tensionCost = totalTension * tuning.tensionCostFactor;
  const processError = state.entries.reduce((sum, e) => {
    if (e.stage === 'ready') return sum;
    return sum + tuning.processErrorPenalty[e.stage];
  }, 0);
  const baseInstability = complexity + tensionCost + processError;
  const finalInstability = Math.max(0, baseInstability - state.stirCorrection);
  const stability = clamp01(1 - finalInstability / tuning.instabilityNormalization);

  // Quality Tags — همه‌ی شرط‌ها روی Effect Profile نهایی
  const triggeredRules = defs.qualityTags.filter((rule) =>
    rule.conditions.every((c) => (effectProfile[c.propertyId] ?? 0) >= c.atLeast - EPS),
  );
  const discoveries: DiscoveryEvent[] = triggeredRules.map((rule) => ({
    id: rule.id,
    kind: 'quality_tag',
    textFa: rule.discoveryFa,
  }));

  return {
    // Snapshot تغییرناپذیر از ورودی‌ها و تاریخچه در لحظه‌ی Bottle
    entries: state.entries.map((e) => ({ ...e, contributions: { ...e.contributions } })),
    history: [...state.history, { type: 'bottled', atTime: state.elapsedTime }],
    rawContributions,
    effectProfile,
    resolvedAxes,
    totalTension,
    stability,
    stabilityLabel: stabilityLabelOf(stability),
    qualityTags: triggeredRules.map((r) => r.id),
    discoveries,
    debug: {
      contributions: debugContributions,
      rawAxes: resolvedAxes,
      totalTension,
      complexity,
      tensionCost,
      processError,
      stirCorrection: state.stirCorrection,
      baseInstability,
      finalInstability,
      stability,
    },
  };
}
