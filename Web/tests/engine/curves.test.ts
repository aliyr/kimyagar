import { describe, expect, it } from 'vitest';
import {
  extractionFractionAt,
  interpolateCurve,
  quantityFactorFor,
  stabilityModifierFor,
  stageOf,
} from '../../src/engine/curves';
import { qualitativeLevel, stabilityLabelOf } from '../../src/engine';
import { PROPERTIES, TUNING } from './fixtures';

describe('quantity curve', () => {
  it('returns documented factors at the anchor points', () => {
    expect(quantityFactorFor(0.5, TUNING)).toBeCloseTo(0.6);
    expect(quantityFactorFor(1, TUNING)).toBeCloseTo(1.0);
    expect(quantityFactorFor(1.5, TUNING)).toBeCloseTo(1.4);
    expect(quantityFactorFor(2, TUNING)).toBeCloseTo(1.7);
  });

  it('interpolates linearly between anchor points', () => {
    expect(quantityFactorFor(0.75, TUNING)).toBeCloseTo(0.8);
    expect(quantityFactorFor(1.25, TUNING)).toBeCloseTo(1.2);
    expect(quantityFactorFor(1.75, TUNING)).toBeCloseTo(1.55);
    expect(quantityFactorFor(2.5, TUNING)).toBeCloseTo(1.925);
  });

  it('clamps outside the curve range (diminishing, no infinite growth)', () => {
    expect(quantityFactorFor(0.1, TUNING)).toBeCloseTo(0.6);
    expect(quantityFactorFor(10, TUNING)).toBeCloseTo(2.4);
  });

  it('interpolateCurve handles unsorted points', () => {
    const points = [
      { x: 2, y: 20 },
      { x: 0, y: 0 },
      { x: 1, y: 10 },
    ];
    expect(interpolateCurve(points, 0.5)).toBeCloseTo(5);
    expect(interpolateCurve(points, 1.5)).toBeCloseTo(15);
  });
});

describe('process stages', () => {
  it('maps exposure to stages with a generous ready window', () => {
    expect(stageOf(0, TUNING)).toBe('fresh');
    expect(stageOf(3.99, TUNING)).toBe('fresh');
    expect(stageOf(4, TUNING)).toBe('extracting');
    expect(stageOf(13.99, TUNING)).toBe('extracting');
    expect(stageOf(14, TUNING)).toBe('ready');
    expect(stageOf(41.99, TUNING)).toBe('ready'); // پنجره‌ی بخشنده: 14..42
    expect(stageOf(42, TUNING)).toBe('overprocessed');
  });

  it('extraction fraction ramps 0.35 → 1.0 and stays capped after ready', () => {
    expect(extractionFractionAt(0, TUNING)).toBeCloseTo(0.35);
    expect(extractionFractionAt(2, TUNING)).toBeCloseTo(0.525);
    expect(extractionFractionAt(4, TUNING)).toBeCloseTo(0.7);
    expect(extractionFractionAt(9, TUNING)).toBeCloseTo(0.85);
    expect(extractionFractionAt(14, TUNING)).toBeCloseTo(1.0);
    expect(extractionFractionAt(30, TUNING)).toBeCloseTo(1.0);
    expect(extractionFractionAt(100, TUNING)).toBeCloseTo(1.0);
  });
});

describe('stability quality curve', () => {
  it('follows the documented curve with interpolation and clamping', () => {
    expect(stabilityModifierFor(1.0, TUNING)).toBeCloseTo(1.0);
    expect(stabilityModifierFor(0.9, TUNING)).toBeCloseTo(1.0);
    expect(stabilityModifierFor(0.825, TUNING)).toBeCloseTo(0.99);
    expect(stabilityModifierFor(0.6, TUNING)).toBeCloseTo(0.93);
    expect(stabilityModifierFor(0.3, TUNING)).toBeCloseTo(0.65);
    expect(stabilityModifierFor(0.15, TUNING)).toBeCloseTo(0.4);
    expect(stabilityModifierFor(0, TUNING)).toBeCloseTo(0.4);
  });
});

describe('player-facing labels', () => {
  it('qualitativeLevel follows property thresholds', () => {
    const property = PROPERTIES[0]; // thresholds: 0.5 / 1.2 / 2.2 / 3.2
    expect(qualitativeLevel(0.4, property)).toBe('none');
    expect(qualitativeLevel(0.5, property)).toBe('low');
    expect(qualitativeLevel(1.19, property)).toBe('low');
    expect(qualitativeLevel(1.2, property)).toBe('medium');
    expect(qualitativeLevel(2.2, property)).toBe('high');
    expect(qualitativeLevel(3.2, property)).toBe('very_high');
  });

  it('stabilityLabelOf uses 0.75 / 0.55 / 0.3 boundaries', () => {
    expect(stabilityLabelOf(0.75)).toBe('stable');
    expect(stabilityLabelOf(0.74)).toBe('slightly_unstable');
    expect(stabilityLabelOf(0.55)).toBe('slightly_unstable');
    expect(stabilityLabelOf(0.54)).toBe('unstable');
    expect(stabilityLabelOf(0.3)).toBe('unstable');
    expect(stabilityLabelOf(0.29)).toBe('very_unstable');
  });
});
