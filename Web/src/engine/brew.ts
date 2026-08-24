/**
 * Action های Runtime روی BrewState — همه Pure (State ورودی هرگز Mutate نمی‌شود).
 *
 * زمان: advanceTime برای هر Entry مقدار exposure را با نرخ
 * tuning.heatExposureRate[currentHeat] بر ثانیه جلو می‌برد، Stage را از
 * tuning.stageThresholds تعیین می‌کند و Contribution ها را با مدل انتگرال
 * افزایشی (extraction.ts) به‌روز می‌کند.
 */

import type {
  AlchemyDefinitions,
  BrewEntry,
  BrewState,
  GrindState,
  HeatLevel,
  IngredientDefinition,
  IngredientId,
  Quantity,
} from './types';
import { extractionFractionAt, stageOf } from './curves';
import { accumulateContributions } from './extraction';

export function ingredientDefOf(
  defs: AlchemyDefinitions,
  ingredientId: IngredientId,
): IngredientDefinition {
  const def = defs.ingredients.find((i) => i.id === ingredientId);
  if (!def) throw new Error(`Unknown ingredient: ${ingredientId}`);
  return def;
}

export function createBrew(): BrewState {
  return {
    entries: [],
    currentHeat: 'medium',
    elapsedTime: 0,
    stirCount: 0,
    stirCorrection: 0,
    history: [],
    bottled: false,
  };
}

export function addIngredient(
  state: BrewState,
  ingredientId: IngredientId,
  quantity: Quantity,
  grindState: GrindState,
  defs: AlchemyDefinitions,
): BrewState {
  const def = ingredientDefOf(defs, ingredientId);
  const entryOrder = state.entries.length + 1;
  // سهم اولیه‌ی fresh (۰.۳۵) بلافاصله با Heat-at-entry استخراج می‌شود
  const contributions = accumulateContributions(
    {},
    def,
    quantity,
    grindState,
    state.currentHeat,
    defs.tuning.extractionFraction.fresh,
    defs.tuning,
  );
  const entry: BrewEntry = {
    id: `entry_${entryOrder}`,
    ingredientId,
    quantity,
    grindState,
    entryOrder,
    heatAtEntry: state.currentHeat,
    exposure: 0,
    stage: stageOf(0, defs.tuning),
    contributions,
  };
  return {
    ...state,
    entries: [...state.entries, entry],
    history: [
      ...state.history,
      {
        type: 'ingredient_added',
        atTime: state.elapsedTime,
        payload: { ingredientId, quantity, grindState },
      },
    ],
  };
}

export function setHeat(state: BrewState, heat: HeatLevel, _defs: AlchemyDefinitions): BrewState {
  if (state.currentHeat === heat) return state;
  return {
    ...state,
    currentHeat: heat,
    history: [
      ...state.history,
      { type: 'heat_changed', atTime: state.elapsedTime, payload: { heat } },
    ],
  };
}

export function stir(state: BrewState, defs: AlchemyDefinitions): BrewState {
  const corrections = defs.tuning.stirCorrections;
  // Diminishing Returns: بعد از اتمام لیست، Stir دیگر Correction نمی‌دهد
  const gained = state.stirCount < corrections.length ? corrections[state.stirCount] : 0;
  return {
    ...state,
    stirCount: state.stirCount + 1,
    stirCorrection: state.stirCorrection + gained,
    history: [...state.history, { type: 'stirred', atTime: state.elapsedTime }],
  };
}

export function advanceTime(
  state: BrewState,
  dtSeconds: number,
  defs: AlchemyDefinitions,
): BrewState {
  if (dtSeconds <= 0) return state;
  const rate = defs.tuning.heatExposureRate[state.currentHeat];
  const entries = state.entries.map((entry) => {
    const def = ingredientDefOf(defs, entry.ingredientId);
    const exposure = entry.exposure + dtSeconds * rate;
    const deltaFraction =
      extractionFractionAt(exposure, defs.tuning) -
      extractionFractionAt(entry.exposure, defs.tuning);
    return {
      ...entry,
      exposure,
      stage: stageOf(exposure, defs.tuning),
      contributions: accumulateContributions(
        entry.contributions,
        def,
        entry.quantity,
        entry.grindState,
        state.currentHeat,
        deltaFraction,
        defs.tuning,
      ),
    };
  });
  return { ...state, elapsedTime: state.elapsedTime + dtSeconds, entries };
}
