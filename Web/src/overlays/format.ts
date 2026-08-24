import type { HeatLevel } from '../engine/types';

export function toFaDigits(value: number): string {
  return value.toLocaleString('fa-IR', { maximumFractionDigits: 2, useGrouping: false });
}

export function heatFromPayload(payload?: Record<string, unknown>): HeatLevel | null {
  const v = payload?.heat ?? payload?.to ?? payload?.newHeat ?? payload?.level;
  if (v === 'low' || v === 'medium' || v === 'high') return v;
  return null;
}
