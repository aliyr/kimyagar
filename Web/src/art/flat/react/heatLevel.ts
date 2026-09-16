/**
 * نگاشت حرارت بازی به سطح آتش صحنه‌ی فلت (0..1).
 * آستانه‌ی جوش در FlatCookingScene 0.5 است: «ملایم» فقط گرم می‌کند،
 * «متوسط» و «تند» می‌جوشانند — همان منطقی که CauldronStationV2 برای فریم‌های
 * جوش دارد.
 */
import type { HeatLevel } from '../../../engine/types';

export const FLAT_HEAT_LEVEL: Record<HeatLevel, number> = {
  low: 0.4,
  medium: 0.75,
  high: 1,
};

export function flatHeatLevel(heat: HeatLevel): number {
  return FLAT_HEAT_LEVEL[heat] ?? FLAT_HEAT_LEVEL.medium;
}
