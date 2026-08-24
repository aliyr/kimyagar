import { describe, expect, it } from 'vitest';
import type { QualityTagRule } from '../../src/engine/types';
import { CHAMOMILE, POPPY, makeDefs, readyPotion } from './fixtures';

const RESTFUL: QualityTagRule = {
  id: 'restful',
  nameFa: 'آرام‌بخش',
  conditions: [
    { propertyId: 'calm', atLeast: 2 },
    { propertyId: 'sleep', atLeast: 1.5 },
  ],
  discoveryFa: 'معجونی آرام‌بخش ساختی!',
};

const defs = makeDefs({ qualityTags: [RESTFUL] });

describe('quality tags and discoveries', () => {
  it('triggers a tag when all conditions hold on the final effect profile', () => {
    // بابونه‌مانند: calm 3.0 و sleep 2.0 ⇒ هر دو شرط برقرار
    const result = readyPotion(defs, [{ id: CHAMOMILE.id }]);

    expect(result.qualityTags).toEqual(['restful']);
    expect(result.discoveries).toEqual([
      { id: 'restful', kind: 'quality_tag', textFa: 'معجونی آرام‌بخش ساختی!' },
    ]);
  });

  it('does not trigger when any condition fails', () => {
    // خشخاش‌مانند Crushed: sleep 1.8 ≥ 1.5 ولی calm فقط 0.7
    const result = readyPotion(defs, [{ id: POPPY.id, grind: 'crushed' }]);

    expect(result.qualityTags).toEqual([]);
    expect(result.discoveries).toEqual([]);
  });

  it('conditions apply to the resolved profile, not raw sums', () => {
    // نعناع‌مانند نداریم؛ به‌جایش محور خواب را با ماده‌ی بیداری خنثی می‌کنیم
    const wakey = {
      ...CHAMOMILE,
      id: 'wakey',
      baseProperties: { wake: 1.0 },
      complexity: 0.05,
    };
    const defsWithWakey = makeDefs({
      ingredients: [CHAMOMILE, wakey],
      qualityTags: [RESTFUL],
    });
    // sleep خام 2.0 ولی resolved = 1.0 < 1.5 ⇒ شرط شکست می‌خورد
    const result = readyPotion(defsWithWakey, [{ id: CHAMOMILE.id }, { id: 'wakey' }]);

    expect(result.rawContributions.sleep).toBeCloseTo(2.0);
    expect(result.effectProfile.sleep).toBeCloseTo(1.0);
    expect(result.qualityTags).toEqual([]);
  });
});
