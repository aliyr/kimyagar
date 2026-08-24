import { describe, expect, it } from 'vitest';
import * as engine from '../../src/engine';
import { CHAMOMILE, ing, makeDefs, readyBrew, readyPotion } from './fixtures';

const SLEEPY = ing({ id: 'sleepy', baseProperties: { sleep: 3.4 } }); // complexity پیش‌فرض 0.05
const WAKEY_34 = ing({ id: 'wakey34', baseProperties: { wake: 3.4 } });

const defs = makeDefs({ ingredients: [CHAMOMILE, SLEEPY, WAKEY_34] });

describe('stability formula', () => {
  it('simple clean brew: instability is just ingredient complexity', () => {
    const result = readyPotion(defs, [{ id: CHAMOMILE.id }]);

    expect(result.debug.complexity).toBeCloseTo(0.03);
    expect(result.debug.tensionCost).toBeCloseTo(0);
    expect(result.debug.processError).toBeCloseTo(0);
    expect(result.debug.baseInstability).toBeCloseTo(0.03);
    expect(result.stability).toBeCloseTo(1 - 0.03 / 1.4, 5);
    expect(result.stabilityLabel).toBe('stable');
  });

  it('tension cost = totalTension × 0.08', () => {
    const result = readyPotion(defs, [{ id: SLEEPY.id }, { id: WAKEY_34.id }]);

    expect(result.totalTension).toBeCloseTo(3.4);
    expect(result.debug.tensionCost).toBeCloseTo(3.4 * 0.08);
    expect(result.debug.complexity).toBeCloseTo(0.1);
    expect(result.debug.baseInstability).toBeCloseTo(0.372);
    expect(result.stability).toBeCloseTo(1 - 0.372 / 1.4, 5);
    expect(result.stabilityLabel).toBe('slightly_unstable');
  });

  it('complexity counts per entry (adding the same ingredient twice)', () => {
    const result = readyPotion(defs, [{ id: CHAMOMILE.id }, { id: CHAMOMILE.id }]);
    expect(result.debug.complexity).toBeCloseTo(0.06);
  });

  it('stir corrections diminish (0.15, 0.08, 0.03) then give nothing', () => {
    let brew = engine.createBrew();
    const seen: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      brew = engine.stir(brew, defs);
      seen.push(brew.stirCorrection);
    }
    expect(seen[0]).toBeCloseTo(0.15);
    expect(seen[1]).toBeCloseTo(0.23);
    expect(seen[2]).toBeCloseTo(0.26);
    expect(seen[3]).toBeCloseTo(0.26);
    expect(seen[4]).toBeCloseTo(0.26);
    expect(brew.stirCount).toBe(5);
  });

  it('stir correction reduces final instability and clamps at zero', () => {
    let brew = readyBrew(defs, [{ id: CHAMOMILE.id }]);
    brew = engine.stir(brew, defs); // ‎0.15 > 0.03 ⇒ سقف صفر
    const result = engine.bottle(brew, defs);

    expect(result.debug.stirCorrection).toBeCloseTo(0.15);
    expect(result.debug.finalInstability).toBeCloseTo(0);
    expect(result.stability).toBeCloseTo(1);
    expect(result.stabilityLabel).toBe('stable');
  });

  it('process error feeds instability (fresh bottling)', () => {
    let brew = engine.createBrew();
    brew = engine.addIngredient(brew, CHAMOMILE.id, 1, 'fine', defs);
    const result = engine.bottle(brew, defs);

    expect(result.debug.processError).toBeCloseTo(0.25);
    expect(result.debug.baseInstability).toBeCloseTo(0.28);
    expect(result.stability).toBeCloseTo(1 - 0.28 / 1.4, 5);
  });

  it('stability clamps to 0 for extreme tension stacks', () => {
    const result = readyPotion(defs, [
      { id: SLEEPY.id, quantity: 2 },
      { id: SLEEPY.id, quantity: 2 },
      { id: SLEEPY.id, quantity: 2 },
      { id: WAKEY_34.id, quantity: 2 },
      { id: WAKEY_34.id, quantity: 2 },
      { id: WAKEY_34.id, quantity: 2 },
    ]);

    // Tension = 3.4 × 1.7 × 3 = 17.34 ⇒ هزینه ~1.39 + پیچیدگی 0.3 > 1.4
    expect(result.stability).toBe(0);
    expect(result.stabilityLabel).toBe('very_unstable');
  });
});
