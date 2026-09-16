import { describe, expect, it } from 'vitest';
import * as engine from '../../src/engine';
import { loadDefinitions } from '../../src/data';
import type { AlchemyDefinitions } from '../../src/engine/types';

/** ماده‌ی اول را با ضریب داده‌شده کپی می‌کند تا اثر extractionSpeed جدا سنجیده شود */
function withSpeed(defs: AlchemyDefinitions, id: string, speed: number | undefined): AlchemyDefinitions {
  return {
    ...defs,
    ingredients: defs.ingredients.map((i) => (i.id === id ? { ...i, extractionSpeed: speed } : i)),
  };
}

describe('extractionSpeed', () => {
  const base = loadDefinitions();

  it('defaults to 1 (no change in exposure)', () => {
    const defs = withSpeed(base, 'borage', undefined);
    let brew = engine.addIngredient(engine.createBrew(), 'borage', 1, 'fine', defs);
    brew = engine.advanceTime(brew, 5, defs);
    expect(brew.entries[0].exposure).toBeCloseTo(5 * defs.tuning.heatExposureRate.medium, 6);
  });

  it('scales exposure per ingredient so fast herbs reach ready sooner than slow roots', () => {
    const fast = withSpeed(base, 'chamomile', 1.25);
    const slow = withSpeed(base, 'ginger', 0.7);
    let a = engine.addIngredient(engine.createBrew(), 'chamomile', 1, 'fine', fast);
    let b = engine.addIngredient(engine.createBrew(), 'ginger', 1, 'fine', slow);
    a = engine.advanceTime(a, 12, fast);
    b = engine.advanceTime(b, 12, slow);
    expect(a.entries[0].exposure).toBeCloseTo(12 * 1.25, 6);
    expect(b.entries[0].exposure).toBeCloseTo(12 * 0.7, 6);
    expect(a.entries[0].stage).toBe('ready');
    expect(b.entries[0].stage).toBe('extracting');
  });

  it('shipped data gives every ingredient a positive speed', () => {
    for (const i of base.ingredients) {
      expect(i.extractionSpeed ?? 1).toBeGreaterThan(0);
    }
  });
});
