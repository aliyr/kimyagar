import { describe, expect, it } from 'vitest';
import * as engine from '../../src/engine';
import { CHAMOMILE, GINGER, MINT, POPPY, deepFreeze, makeDefs, readyPotion } from './fixtures';

const defs = makeDefs();

function contributionOf(result: engine.PotionResult, propertyId: engine.PropertyId): number {
  return result.rawContributions[propertyId] ?? 0;
}

describe('contribution formula (Base × Quantity × Grinding × HeatExposure)', () => {
  it('fully extracts base values at quantity 1, neutral grind/heat, ready stage', () => {
    const result = readyPotion(defs, [{ id: CHAMOMILE.id }]);
    expect(contributionOf(result, 'calm')).toBeCloseTo(3.0);
    expect(contributionOf(result, 'sleep')).toBeCloseTo(2.0);
    expect(contributionOf(result, 'warm')).toBeCloseTo(0.6);
  });

  it('applies the quantity factor (2.0 → ×1.7)', () => {
    const result = readyPotion(defs, [{ id: CHAMOMILE.id, quantity: 2 }]);
    expect(contributionOf(result, 'calm')).toBeCloseTo(5.1);
    const debugCalm = result.debug.contributions.find((c) => c.propertyId === 'calm');
    expect(debugCalm?.quantityFactor).toBeCloseTo(1.7);
  });

  it('poppy-like crushed enables Selective Extraction (pain kept, sleep/weakness cut)', () => {
    const fine = readyPotion(defs, [{ id: POPPY.id, grind: 'fine' }]);
    const crushed = readyPotion(defs, [{ id: POPPY.id, grind: 'crushed' }]);

    expect(contributionOf(fine, 'pain_relief')).toBeCloseTo(3.3);
    expect(contributionOf(fine, 'sleep')).toBeCloseTo(3.0);
    expect(contributionOf(fine, 'weakness')).toBeCloseTo(2.0);

    expect(contributionOf(crushed, 'pain_relief')).toBeCloseTo(3.3 * 0.95);
    expect(contributionOf(crushed, 'sleep')).toBeCloseTo(3.0 * 0.6);
    expect(contributionOf(crushed, 'weakness')).toBeCloseTo(2.0 * 0.5);
    // Property بدون Modifier در همان Grind دست‌نخورده می‌ماند
    expect(contributionOf(crushed, 'calm')).toBeCloseTo(0.7);
  });

  it('ginger-like high heat multiplies excitement by ~2.2 (heat-loving side effect)', () => {
    let brew = engine.createBrew();
    brew = engine.setHeat(brew, 'high', defs);
    brew = engine.addIngredient(brew, GINGER.id, 1, 'fine', defs);
    brew = engine.advanceTime(brew, 14, defs); // exposure = 22.4 ⇒ ready
    const result = engine.bottle(brew, defs);

    expect(contributionOf(result, 'excitement')).toBeCloseTo(0.5 * 2.2);
    expect(contributionOf(result, 'warm')).toBeCloseTo(3.0 * 1.15);
    const debugExcitement = result.debug.contributions.find((c) => c.propertyId === 'excitement');
    expect(debugExcitement?.heatExposureFactor).toBeCloseTo(2.2);

    const medium = readyPotion(defs, [{ id: GINGER.id }]);
    expect(contributionOf(medium, 'excitement')).toBeCloseTo(0.5);
  });

  it('mint-like is heat-sensitive: high heat burns off its properties', () => {
    let brew = engine.createBrew();
    brew = engine.setHeat(brew, 'high', defs);
    brew = engine.addIngredient(brew, MINT.id, 1, 'fine', defs);
    brew = engine.advanceTime(brew, 14, defs);
    const hot = engine.bottle(brew, defs);
    const medium = readyPotion(defs, [{ id: MINT.id }]);

    expect(contributionOf(hot, 'wake')).toBeCloseTo(2.4 * 0.55);
    expect(contributionOf(hot, 'cold')).toBeCloseTo(2.2 * 0.5);
    expect(contributionOf(hot, 'wake')).toBeLessThan(contributionOf(medium, 'wake'));
    expect(contributionOf(hot, 'focus')).toBeLessThan(contributionOf(medium, 'focus'));
  });

  it('blends heat over the extraction path (exposure-weighted model)', () => {
    let brew = engine.createBrew(); // medium
    brew = engine.addIngredient(brew, GINGER.id, 1, 'fine', defs);
    brew = engine.advanceTime(brew, 4, defs); // exposure 4 ⇒ fraction 0.7 روی حرارت متوسط
    brew = engine.setHeat(brew, 'high', defs);
    brew = engine.advanceTime(brew, 6.25, defs); // ‎+10 exposure ⇒ 14 ⇒ fraction 1.0
    const result = engine.bottle(brew, defs);

    // 0.7 با ضریب ۱ (متوسط) + 0.3 با ضریب ۲.۲ (زیاد) = 1.36
    expect(contributionOf(result, 'excitement')).toBeCloseTo(0.5 * 1.36);
    const debugExcitement = result.debug.contributions.find((c) => c.propertyId === 'excitement');
    expect(debugExcitement?.heatExposureFactor).toBeCloseTo(1.36);
  });
});

describe('time, stages and bottling moment', () => {
  it('advanceTime accumulates exposure by heat rate and updates stages', () => {
    let brew = engine.createBrew();
    brew = engine.setHeat(brew, 'low', defs); // نرخ 0.6
    brew = engine.addIngredient(brew, CHAMOMILE.id, 1, 'fine', defs);
    brew = engine.advanceTime(brew, 5, defs);
    expect(brew.entries[0].exposure).toBeCloseTo(3);
    expect(brew.entries[0].stage).toBe('fresh');
    expect(brew.elapsedTime).toBeCloseTo(5);

    brew = engine.advanceTime(brew, 5, defs); // exposure 6
    expect(brew.entries[0].stage).toBe('extracting');
    brew = engine.advanceTime(brew, 20, defs); // exposure 18
    expect(brew.entries[0].stage).toBe('ready');
    brew = engine.advanceTime(brew, 30, defs); // exposure 36 — هنوز داخل پنجره‌ی بخشنده
    expect(brew.entries[0].stage).toBe('ready');
    brew = engine.advanceTime(brew, 10.001, defs); // exposure > 42
    expect(brew.entries[0].stage).toBe('overprocessed');
  });

  it('early bottling under-extracts (fresh 0.35) and adds process error', () => {
    let brew = engine.createBrew();
    brew = engine.addIngredient(brew, CHAMOMILE.id, 1, 'fine', defs);
    const result = engine.bottle(brew, defs);

    expect(contributionOf(result, 'calm')).toBeCloseTo(3.0 * 0.35);
    const debugCalm = result.debug.contributions.find((c) => c.propertyId === 'calm');
    expect(debugCalm?.heatExposureFactor).toBeCloseTo(0.35);
    expect(result.entries[0].stage).toBe('fresh');
    expect(result.debug.processError).toBeCloseTo(0.25);
  });

  it('bottling while extracting is partially extracted with a smaller penalty', () => {
    let brew = engine.createBrew();
    brew = engine.addIngredient(brew, CHAMOMILE.id, 1, 'fine', defs);
    brew = engine.advanceTime(brew, 5, defs); // fraction = 0.73
    const result = engine.bottle(brew, defs);

    expect(contributionOf(result, 'calm')).toBeCloseTo(3.0 * 0.73);
    expect(result.debug.processError).toBeCloseTo(0.1);
  });

  it('overprocessed entries stop growing and contribute process error instead', () => {
    let brew = engine.createBrew();
    brew = engine.addIngredient(brew, CHAMOMILE.id, 1, 'fine', defs);
    brew = engine.advanceTime(brew, 50, defs); // exposure 50 ⇒ overprocessed
    const result = engine.bottle(brew, defs);

    expect(contributionOf(result, 'calm')).toBeCloseTo(3.0); // سقف؛ رشد بیشتر ندارد
    expect(result.entries[0].stage).toBe('overprocessed');
    expect(result.debug.processError).toBeCloseTo(0.3);
  });

  it('later entries see less exposure (order matters through processing)', () => {
    let brew = engine.createBrew();
    brew = engine.addIngredient(brew, CHAMOMILE.id, 1, 'fine', defs);
    brew = engine.advanceTime(brew, 10, defs);
    brew = engine.addIngredient(brew, CHAMOMILE.id, 1, 'fine', defs);
    brew = engine.advanceTime(brew, 4, defs);

    const [first, second] = brew.entries;
    expect(first.exposure).toBeCloseTo(14);
    expect(first.stage).toBe('ready');
    expect(second.exposure).toBeCloseTo(4);
    expect(second.stage).toBe('extracting');
    expect(second.contributions.calm ?? 0).toBeLessThan(first.contributions.calm ?? 0);
    expect(second.contributions.calm ?? 0).toBeCloseTo(3.0 * 0.7);
  });
});

describe('purity and boundaries', () => {
  it('never mutates the input state or definitions', () => {
    const frozenDefs = deepFreeze(makeDefs());
    let brew = deepFreeze(engine.createBrew());
    brew = deepFreeze(engine.addIngredient(brew, CHAMOMILE.id, 1.5, 'crushed', frozenDefs));
    brew = deepFreeze(engine.setHeat(brew, 'high', frozenDefs));
    brew = deepFreeze(engine.advanceTime(brew, 10, frozenDefs));
    brew = deepFreeze(engine.stir(brew, frozenDefs));
    const result = deepFreeze(engine.bottle(brew, frozenDefs));
    expect(result.entries).not.toBe(brew.entries);
    expect(brew.bottled).toBe(false);
  });

  it('addIngredient rejects unknown ingredient ids', () => {
    const brew = engine.createBrew();
    expect(() => engine.addIngredient(brew, 'nope', 1, 'fine', defs)).toThrow(/Unknown ingredient/);
  });

  it('setHeat to the same level is a no-op, otherwise records history', () => {
    const brew = engine.createBrew();
    expect(engine.setHeat(brew, 'medium', defs)).toBe(brew);
    const heated = engine.setHeat(brew, 'high', defs);
    expect(heated.currentHeat).toBe('high');
    expect(heated.history.at(-1)?.type).toBe('heat_changed');
  });
});
