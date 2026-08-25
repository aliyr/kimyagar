import { describe, expect, it } from 'vitest';
import { quantityLabels } from '../../src/data/labels';
import { formatQuantity } from '../../src/overlays/format';
import type { Quantity } from '../../src/engine/types';

const ALL_QUANTITIES: Quantity[] = [0.5, 1, 1.5, 2, 3];

describe('quantity labels', () => {
  it('covers every Quantity including 3', () => {
    for (const q of ALL_QUANTITIES) {
      expect(quantityLabels[q]).toBeTruthy();
      expect(quantityLabels[q]).not.toMatch(/^[0-9.]+$/);
    }
    expect(quantityLabels[3]).toBe('سه واحد');
  });

  it('formatQuantity never falls back to a raw latin number', () => {
    for (const q of ALL_QUANTITIES) {
      const label = formatQuantity(q);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toBe(String(q));
    }
    expect(formatQuantity(3)).toBe('سه واحد');
  });
});
