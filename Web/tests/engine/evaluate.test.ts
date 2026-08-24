import { describe, expect, it } from 'vitest';
import * as engine from '../../src/engine';
import { satisfactionOf } from '../../src/engine/evaluation';
import type { QualityTagRule } from '../../src/engine/types';
import { CHAMOMILE, customer, ing, makeDefs, readyPotion, req } from './fixtures';

const CALMY = ing({ id: 'calmy', baseProperties: { calm: 1.5, warm: 0.6 } });
const defs = makeDefs({ ingredients: [CHAMOMILE, CALMY] });

const chamomilePotion = () => readyPotion(defs, [{ id: CHAMOMILE.id }]);
const calmyPotion = () => readyPotion(defs, [{ id: CALMY.id }]);

const C1 = customer('c1', [req('must_have', 'calm', 1.8, 'at_least')]);
const C2 = customer('c2', [
  req('must_have', 'calm', 1.8, 'at_least'),
  req('avoid', 'sleep', 1.2, 'at_most'),
]);

describe('smooth satisfaction', () => {
  it('at_least: full at threshold, smooth ramp down to ~60% of it', () => {
    const r = req('must_have', 'calm', 1.8, 'at_least');
    expect(satisfactionOf(1.8, r)).toBe(1);
    expect(satisfactionOf(2.5, r)).toBe(1); // Oversolving پاداش اضافه ندارد
    expect(satisfactionOf(1.08, r)).toBe(0);
    expect(satisfactionOf(0, r)).toBe(0);
    expect(satisfactionOf(1.5, r)).toBeGreaterThan(0.5);
    expect(satisfactionOf(1.5, r)).toBeLessThan(0.75);
  });

  it('at_most: full at threshold, smooth ramp down to ~1.6× of it', () => {
    const r = req('avoid', 'sleep', 1.2, 'at_most');
    expect(satisfactionOf(0, r)).toBe(1);
    expect(satisfactionOf(1.2, r)).toBe(1);
    expect(satisfactionOf(1.92, r)).toBe(0);
    expect(satisfactionOf(1.5, r)).toBeGreaterThan(0.3);
    expect(satisfactionOf(1.5, r)).toBeLessThan(0.9);
  });
});

describe('customer evaluation', () => {
  it('C1-style (Calm ≥ 1.8) reaches excellent with a clean chamomile brew', () => {
    const evaluation = engine.evaluate(chamomilePotion(), C1, defs);

    expect(evaluation.perRequirement).toHaveLength(1);
    expect(evaluation.perRequirement[0].actualValue).toBeCloseTo(3.0);
    expect(evaluation.perRequirement[0].satisfaction).toBe(1);
    // Sleep 2.0 ناخواسته: (2.0 − 0.8) × 6 = 7.2؛ Warm 0.6 زیر آستانه‌ی معاف
    expect(evaluation.sideEffectPenalty).toBeCloseTo(7.2);
    expect(evaluation.stabilityModifier).toBeCloseTo(1.0);
    expect(evaluation.score).toBeCloseTo(92.8, 3);
    expect(evaluation.band).toBe('excellent');
    expect(evaluation.keySuccessFa).toBe('met:calm');
    expect(evaluation.keyProblemFa).toBeNull();
    expect(evaluation.reactionFa).toContain('met:calm');
  });

  it('C2-style avoid violation (Sleep ≤ 1.2) drops the same potion to partial', () => {
    const evaluation = engine.evaluate(chamomilePotion(), C2, defs);

    const avoidOutcome = evaluation.perRequirement.find(
      (o) => o.requirement.kind === 'avoid',
    );
    expect(avoidOutcome?.actualValue).toBeCloseTo(2.0);
    expect(avoidOutcome?.satisfaction).toBe(0);
    // Sleep دیگر «ناخواسته» نیست (در Requirement آمده) ⇒ جریمه‌ی Side Effect ندارد
    expect(evaluation.sideEffectPenalty).toBeCloseTo(0);
    expect(evaluation.score).toBeCloseTo(40, 3);
    expect(evaluation.band).toBe('partial');
    expect(evaluation.keySuccessFa).toBe('met:calm');
    expect(evaluation.keyProblemFa).toBe('unmet:sleep');
    expect(evaluation.reactionFa).toContain('met:calm');
    expect(evaluation.reactionFa).toContain('ولی');
    expect(evaluation.reactionFa).toContain('unmet:sleep');
  });

  it('near-threshold values earn partial satisfaction, not a binary wall', () => {
    const evaluation = engine.evaluate(calmyPotion(), C1, defs); // calm 1.5 < 1.8

    const outcome = evaluation.perRequirement[0];
    expect(outcome.satisfied).toBe(false);
    expect(outcome.satisfaction).toBeGreaterThan(0.5);
    expect(outcome.satisfaction).toBeLessThan(0.75);
    expect(evaluation.band).toBe('good'); // نزدیک بودن ⇒ هنوز نتیجه‌ی آبرومند
    expect(evaluation.keySuccessFa).toBeNull();
    expect(evaluation.keyProblemFa).toBe('unmet:calm');
  });

  it('severely violated critical requirement caps the band at partial', () => {
    const critical = customer('crit', [
      req('must_have', 'calm', 1.8, 'at_least'),
      req('must_have', 'sleep', 1.5, 'at_least'),
      req('must_have', 'warm', 0.5, 'at_least'),
      req('must_have', 'focus', 1.7, 'at_least', { critical: true }),
    ]);
    const evaluation = engine.evaluate(chamomilePotion(), critical, defs);

    expect(evaluation.score).toBeGreaterThanOrEqual(70); // خودش good می‌بود
    expect(evaluation.band).toBe('partial'); // ولی سقفِ critical اعمال می‌شود
    expect(evaluation.keyProblemFa).toBe('unmet:focus');
  });

  it('preferred bonus adds ~its weight when nothing is violated', () => {
    const withPref = customer('p1', [
      req('must_have', 'calm', 1.8, 'at_least'),
      req('preferred', 'warm', 0.5, 'at_least'),
    ]);
    const without = customer('p2', [req('must_have', 'calm', 1.8, 'at_least')]);
    const potion = calmyPotion(); // calm 1.5 ⇒ must ناکامل تا سقف ۱۰۰ مزاحم نشود

    const a = engine.evaluate(potion, withPref, defs);
    const b = engine.evaluate(potion, without, defs);
    expect(a.score - b.score).toBeCloseTo(8, 3);
  });

  it('preferred bonus never compensates a violated avoid', () => {
    const withPref = customer('p3', [
      req('must_have', 'calm', 1.8, 'at_least'),
      req('avoid', 'sleep', 1.2, 'at_most'),
      req('preferred', 'warm', 0.5, 'at_least'),
    ]);
    const without = customer('p4', [
      req('must_have', 'calm', 1.8, 'at_least'),
      req('avoid', 'sleep', 1.2, 'at_most'),
    ]);
    const potion = chamomilePotion(); // avoid کاملاً نقض شده

    const a = engine.evaluate(potion, withPref, defs);
    const b = engine.evaluate(potion, without, defs);
    expect(a.score).toBeCloseTo(b.score, 5); // Bonus صفر شد
    expect(a.band).toBe('partial');
  });

  it('unrequested side effects below the free threshold cost nothing', () => {
    const evaluation = engine.evaluate(calmyPotion(), C1, defs); // warm 0.6 < 0.8
    expect(evaluation.sideEffectPenalty).toBe(0);
  });

  it('quality tag bonus applies only for customers who prefer that tag', () => {
    const restful: QualityTagRule = {
      id: 'restful',
      nameFa: 'آرام‌بخش',
      conditions: [
        { propertyId: 'calm', atLeast: 2 },
        { propertyId: 'sleep', atLeast: 1.5 },
      ],
      discoveryFa: 'کشف!',
    };
    const tagDefs = makeDefs({ ingredients: [CHAMOMILE], qualityTags: [restful] });
    const potion = readyPotion(tagDefs, [{ id: CHAMOMILE.id }]);
    expect(potion.qualityTags).toEqual(['restful']);

    const c8 = customer(
      'c8',
      [req('must_have', 'sleep', 1.8, 'at_least'), req('must_have', 'calm', 1.8, 'at_least')],
      ['restful'],
    );
    const indifferent = customer('c9', [
      req('must_have', 'sleep', 1.8, 'at_least'),
      req('must_have', 'calm', 1.8, 'at_least'),
    ]);

    const preferring = engine.evaluate(potion, c8, tagDefs);
    const neutral = engine.evaluate(potion, indifferent, tagDefs);
    expect(preferring.tagBonus).toBe(6);
    expect(neutral.tagBonus).toBe(0);
    expect(preferring.band).toBe('excellent');
  });

  it('problem selection prefers violated avoid over violated must_have', () => {
    const c = customer('sev1', [
      req('must_have', 'focus', 1.7, 'at_least'), // نقض‌شده
      req('avoid', 'sleep', 1.2, 'at_most'), // نقض‌شده
    ]);
    const evaluation = engine.evaluate(chamomilePotion(), c, defs);
    expect(evaluation.keyProblemFa).toBe('unmet:sleep');
  });

  it('problem selection prefers critical violations above everything', () => {
    const c = customer('sev2', [
      req('must_have', 'focus', 1.7, 'at_least', { critical: true }), // نقض‌شده‌ی بحرانی
      req('avoid', 'sleep', 1.2, 'at_most'), // نقض‌شده‌ی عادی
    ]);
    const evaluation = engine.evaluate(chamomilePotion(), c, defs);
    expect(evaluation.keyProblemFa).toBe('unmet:focus');
  });

  it('reaction with no success at all leads with the problem', () => {
    const evaluation = engine.evaluate(calmyPotion(), C1, defs);
    expect(evaluation.keySuccessFa).toBeNull();
    expect(evaluation.reactionFa).toContain('unmet:calm');
  });
});

describe('the Everything Potion must not dominate', () => {
  it('many opposing ingredients ⇒ high tension, rock-bottom stability, heavy penalties', () => {
    const allDefs = makeDefs();
    const potion = readyPotion(
      allDefs,
      allDefs.ingredients.map((i) => ({ id: i.id, quantity: 2 as const })),
    );

    expect(potion.totalTension).toBeGreaterThan(5);
    expect(potion.stability).toBeLessThan(0.3);
    expect(potion.stabilityLabel).toBe('very_unstable');

    const evaluation = engine.evaluate(potion, C1, allDefs);
    expect(evaluation.stabilityModifier).toBeCloseTo(0.4);
    expect(evaluation.sideEffectPenalty).toBeGreaterThan(20);
    expect(evaluation.band).not.toBe('excellent');
    expect(evaluation.band).not.toBe('good');
    expect(evaluation.score).toBeLessThan(40);
  });
});
