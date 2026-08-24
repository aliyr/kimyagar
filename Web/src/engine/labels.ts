/**
 * برچسب‌های کیفی Player-facing — عدد خام هرگز به بازیکن نمایش داده نمی‌شود.
 */

import type { PropertyDefinition, QualitativeLevel, StabilityLabel } from './types';

export function qualitativeLevel(value: number, property: PropertyDefinition): QualitativeLevel {
  const t = property.thresholds;
  if (value >= t.veryHigh) return 'very_high';
  if (value >= t.high) return 'high';
  if (value >= t.medium) return 'medium';
  if (value >= t.low) return 'low';
  return 'none';
}

export function stabilityLabelOf(stability: number): StabilityLabel {
  if (stability >= 0.75) return 'stable';
  if (stability >= 0.55) return 'slightly_unstable';
  if (stability >= 0.3) return 'unstable';
  return 'very_unstable';
}
