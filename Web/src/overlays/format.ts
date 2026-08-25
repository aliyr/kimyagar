import { quantityLabels } from '../data/labels';
import type { HeatLevel, Quantity } from '../engine/types';

export function toFaDigits(value: number): string {
  return value.toLocaleString('fa-IR', { maximumFractionDigits: 2, useGrouping: false });
}

/** برچسب کیفی مقدار — هرگز عدد خام لاتین برنمی‌گرداند. */
export function formatQuantity(q: Quantity): string {
  return quantityLabels[q] ?? `${toFaDigits(q)} واحد`;
}

export function heatFromPayload(payload?: Record<string, unknown>): HeatLevel | null {
  const v = payload?.heat ?? payload?.to ?? payload?.newHeat ?? payload?.level;
  if (v === 'low' || v === 'medium' || v === 'high') return v;
  return null;
}
