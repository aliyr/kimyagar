/**
 * بازخورد لمسی — @capacitor/haptics روی اندروید/iOS و fallback به
 * navigator.vibrate در مرورگر. در دسکتاپ بی‌اثر است.
 *
 * الگو: light در هر تیک کوبش، medium در ریختن قاشق/شلپ، heavy در رسیدن شیشه
 * به مشتری. هیچ‌وقت خطا به بیرون نمی‌دهد.
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export type HapticImpact = 'light' | 'medium' | 'heavy';

const VIBRATE_MS: Record<HapticImpact, number> = { light: 8, medium: 18, heavy: 32 };
const IMPACT: Record<HapticImpact, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
};

/** کلید ذخیره‌ی تنظیم لرزش (پیش‌فرض: روشن) */
export const HAPTICS_STORAGE_KEY = 'kimiagar.haptics';

function readStoredEnabled(): boolean {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(HAPTICS_STORAGE_KEY);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

let enabled = readStoredEnabled();

export function isHapticsEnabled(): boolean {
  return enabled;
}

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(HAPTICS_STORAGE_KEY, on ? '1' : '0');
  } catch {
    /* بدون storage هم کار می‌کند */
  }
}

function vibrate(ms: number): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  } catch {
    /* بعضی مرورگرها بدون ژست کاربر خطا می‌دهند */
  }
}

export function haptic(style: HapticImpact): void {
  if (!enabled) return;
  try {
    if (Capacitor.isNativePlatform()) {
      void Haptics.impact({ style: IMPACT[style] }).catch(() => vibrate(VIBRATE_MS[style]));
      return;
    }
  } catch {
    /* بدون Capacitor */
  }
  vibrate(VIBRATE_MS[style]);
}
