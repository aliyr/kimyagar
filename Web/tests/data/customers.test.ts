/**
 * داده‌ی واقعی مشتری‌ها — یکپارچگی تعریف‌ها، asset های هنری و حل‌پذیری سفارش‌ها.
 *
 * حل‌پذیری با جست‌وجوی کامل روی نسخه‌های ساده‌ی کلاسیک اثبات می‌شود: حداکثر سه
 * ماده با مقدار 0.5..2، یک درجه‌ی آتش ثابت و دم‌کشیدن تا وقتی همه‌ی مواد Ready
 * باشند و هیچ‌کدام Overprocessed نشود. بازیکن با تغییر آتش یا Stir می‌تواند
 * بهتر هم بسازد؛ این جست‌وجو فقط کفِ قابل‌دستیابی را می‌سنجد.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as engine from '../../src/engine';
import { loadDefinitions } from '../../src/data';
import { CLASSIC_ART, SCENE_ZONES } from '../../src/scene/artManifest';
import { V2_ZONES } from '../../src/scene/v2/contracts';
import type {
  CustomerDefinition,
  CustomerEvaluation,
  GrindState,
  HeatLevel,
  IngredientDefinition,
  Quantity,
} from '../../src/engine/types';

const defs = loadDefinitions();
const PUBLIC_ART = resolve(import.meta.dirname, '../../public/art');

/** سفارشی که عمداً «همه‌چیز» می‌خواهد تا نشان دهد معجون همه‌کاره ممکن نیست */
const INTENTIONALLY_UNSOLVABLE = new Set(['c9_everything']);

const QUANTITIES: Quantity[] = [0.5, 1, 1.5, 2];
const HEATS: HeatLevel[] = ['low', 'medium', 'high'];
const MAX_INGREDIENTS = 3;

interface Recipe {
  heat: HeatLevel;
  adds: { id: string; quantity: Quantity; grind: GrindState }[];
}

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  return items.flatMap((item, i) =>
    combinations(items.slice(i + 1), k - 1).map((rest) => [item, ...rest]),
  );
}

function product<T>(lists: T[][]): T[][] {
  return lists.reduce<T[][]>((acc, list) => acc.flatMap((a) => list.map((x) => [...a, x])), [[]]);
}

function grindsOf(ing: IngredientDefinition): GrindState[] {
  return ['fine', ...(Object.keys(ing.grindingModifiers) as GrindState[])];
}

function allRecipes(): Recipe[] {
  const recipes: Recipe[] = [];
  for (let k = 1; k <= MAX_INGREDIENTS; k += 1) {
    for (const set of combinations(defs.ingredients, k)) {
      const options = set.map((ing) =>
        product([QUANTITIES, grindsOf(ing)]).map(([quantity, grind]) => ({
          id: ing.id,
          quantity: quantity as Quantity,
          grind: grind as GrindState,
        })),
      );
      for (const adds of product(options)) {
        for (const heat of HEATS) recipes.push({ heat, adds });
      }
    }
  }
  return recipes;
}

/** Brew با آتش ثابت تا Ready شدن کندترین ماده؛ اگر تندترین Overprocessed شود null */
function brewPotion(recipe: Recipe) {
  const { tuning } = defs;
  const speeds = recipe.adds.map(
    (a) => defs.ingredients.find((i) => i.id === a.id)?.extractionSpeed ?? 1,
  );
  const rate = tuning.heatExposureRate[recipe.heat];
  const seconds = tuning.stageThresholds.ready / (rate * Math.min(...speeds));
  if (seconds * rate * Math.max(...speeds) >= tuning.stageThresholds.overprocessed) return null;

  let brew = engine.setHeat(engine.createBrew(), recipe.heat, defs);
  for (const a of recipe.adds) brew = engine.addIngredient(brew, a.id, a.quantity, a.grind, defs);
  brew = engine.advanceTime(brew, seconds + 0.01, defs);
  return engine.bottle(brew, defs);
}

const POTIONS = allRecipes()
  .map((recipe) => ({ recipe, potion: brewPotion(recipe) }))
  .filter((r): r is { recipe: Recipe; potion: NonNullable<typeof r.potion> } => r.potion !== null);

function bestEvaluation(customer: CustomerDefinition): {
  recipe: Recipe;
  evaluation: CustomerEvaluation;
} {
  let best: { recipe: Recipe; evaluation: CustomerEvaluation } | null = null;
  for (const { recipe, potion } of POTIONS) {
    const evaluation = engine.evaluate(potion, customer, defs);
    const capped = evaluation.band === 'partial' || evaluation.band === 'failure';
    const bestCapped = best && (best.evaluation.band === 'partial' || best.evaluation.band === 'failure');
    if (
      !best ||
      (bestCapped && !capped) ||
      (bestCapped === capped && evaluation.score > best.evaluation.score)
    ) {
      best = { recipe, evaluation };
    }
  }
  if (!best) throw new Error('no brewable recipe');
  return best;
}

describe('customer definitions', () => {
  const propertyIds = new Set(defs.properties.map((p) => p.id));
  const tagIds = new Set(defs.qualityTags.map((t) => t.id));
  const classicStates = SCENE_ZONES.customer.states as Record<string, string>;
  const v2States = V2_ZONES.customer.states as Record<string, string>;

  it('have unique ids', () => {
    const ids = defs.customers.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(defs.customers.map((c) => [c.id, c] as const))(
    '%s is well-formed',
    (_id, customer) => {
      expect(customer.nameFa.trim()).not.toBe('');
      expect(customer.requestFa.trim()).not.toBe('');
      expect(customer.summaryFa.trim()).not.toBe('');
      expect(customer.requirements.some((r) => r.kind === 'must_have')).toBe(true);
      for (const r of customer.requirements) {
        expect(propertyIds.has(r.propertyId)).toBe(true);
        expect(r.threshold).toBeGreaterThan(0);
        expect(r.direction).toBe(r.kind === 'avoid' ? 'at_most' : r.direction);
        if (r.kind === 'must_have') expect(r.direction).toBe('at_least');
        expect(r.metFeedbackFa.trim()).not.toBe('');
        expect(r.unmetFeedbackFa.trim()).not.toBe('');
      }
      const reqProps = customer.requirements.map((r) => r.propertyId);
      expect(new Set(reqProps).size).toBe(reqProps.length);
      for (const tag of customer.preferredTags ?? []) expect(tagIds.has(tag)).toBe(true);
    },
  );

  it.each(defs.customers.map((c) => [c.id, c.appearance] as const))(
    '%s (%s) has classic art for every emotion and a v2 fallback',
    (_id, appearance) => {
      expect(classicStates[appearance]).toBe(`customer/customer_${appearance}.png`);
      expect(v2States[appearance]).toBe(classicStates[appearance]);
      const files = [
        classicStates[appearance],
        CLASSIC_ART.customerEmotion(appearance, 'happy'),
        CLASSIC_ART.customerEmotion(appearance, 'sad'),
        ...['flat', 'pixel', 'engraved'].map((style) => `${style}/${classicStates[appearance]}`),
      ];
      for (const file of files) expect(existsSync(resolve(PUBLIC_ART, file)), file).toBe(true);
    },
  );
});

describe('customer requests are brewable', () => {
  it.each(
    defs.customers
      .filter((c) => !INTENTIONALLY_UNSOLVABLE.has(c.id))
      .map((c) => [c.id, c] as const),
  )('%s reaches at least a good potion', (_id, customer) => {
    const { recipe, evaluation } = bestEvaluation(customer);
    const summary = `${evaluation.band} ${evaluation.score.toFixed(1)} via ${recipe.heat}: ${recipe.adds
      .map((a) => `${a.id}×${a.quantity}${a.grind === 'fine' ? '' : `(${a.grind})`}`)
      .join(' + ')}`;
    expect(['excellent', 'good'], summary).toContain(evaluation.band);
  });
});
