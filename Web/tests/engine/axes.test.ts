import { describe, expect, it } from 'vitest';
import { ing, makeDefs, readyPotion } from './fixtures';

// مواد مصنوعی برای اعداد دقیق سند 01 (بخش‌های 5 و 6)
const SLEEPY = ing({ id: 'sleepy', baseProperties: { sleep: 3.4 } });
const WAKEY_26 = ing({ id: 'wakey26', baseProperties: { wake: 2.6 } });
const WAKEY_34 = ing({ id: 'wakey34', baseProperties: { wake: 3.4 } });
const PAINY = ing({ id: 'painy', baseProperties: { pain_relief: 1.5, joy: 0.4 } });

const defs = makeDefs({ ingredients: [SLEEPY, WAKEY_26, WAKEY_34, PAINY] });

describe('axis resolution', () => {
  it('resolves Sleep 3.4 vs Wake 2.6 to Sleep 0.8 (doc example)', () => {
    const result = readyPotion(defs, [{ id: SLEEPY.id }, { id: WAKEY_26.id }]);
    const axis = result.resolvedAxes.find((a) => a.axisId === 'sleep_wake');

    expect(axis?.sideA).toBeCloseTo(3.4);
    expect(axis?.sideB).toBeCloseTo(2.6);
    expect(axis?.resolved).toBeCloseTo(0.8);
    expect(axis?.dominantProperty).toBe('sleep');
    expect(result.effectProfile.sleep).toBeCloseTo(0.8);
    expect(result.effectProfile.wake).toBeUndefined(); // سمت بازنده صفر است
  });

  it('keeps the absolute value when the negative side dominates', () => {
    const result = readyPotion(defs, [{ id: WAKEY_26.id }]);
    const axis = result.resolvedAxes.find((a) => a.axisId === 'sleep_wake');

    expect(axis?.resolved).toBeCloseTo(-2.6);
    expect(axis?.dominantProperty).toBe('wake');
    expect(result.effectProfile.wake).toBeCloseTo(2.6);
    expect(result.effectProfile.sleep).toBeUndefined();
  });

  it('balanced sides resolve to 0 but keep full tension (Balance ≠ Absence)', () => {
    const result = readyPotion(defs, [{ id: SLEEPY.id }, { id: WAKEY_34.id }]);
    const axis = result.resolvedAxes.find((a) => a.axisId === 'sleep_wake');

    expect(axis?.resolved).toBeCloseTo(0);
    expect(axis?.dominantProperty).toBeNull();
    expect(axis?.tension).toBeCloseTo(3.4);
    expect(result.effectProfile.sleep).toBeUndefined();
    expect(result.effectProfile.wake).toBeUndefined();
    expect(result.totalTension).toBeCloseTo(3.4);
  });

  it('axis tension is min(SideA, SideB) and total tension sums across axes', () => {
    const result = readyPotion(defs, [{ id: SLEEPY.id }, { id: WAKEY_26.id }]);
    const axis = result.resolvedAxes.find((a) => a.axisId === 'sleep_wake');

    expect(axis?.tension).toBeCloseTo(2.6);
    expect(result.totalTension).toBeCloseTo(2.6);
  });

  it('independent properties pass straight through to the effect profile', () => {
    const result = readyPotion(defs, [{ id: PAINY.id }]);

    expect(result.effectProfile.pain_relief).toBeCloseTo(1.5);
    expect(result.effectProfile.joy).toBeCloseTo(0.4);
    expect(result.totalTension).toBeCloseTo(0);
  });
});
