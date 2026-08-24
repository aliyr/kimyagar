/**
 * توابع ریاضی مشترک موتور: Clamp، Smoothstep و درون‌یابی خطی منحنی‌های Tuning.
 * همه Pure و Deterministic.
 */

import type { ProcessStage, TuningConfig } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Smoothstep استاندارد روی 0..1 — برای Smooth Evaluation آستانه‌ها */
export function smoothstep01(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

export interface CurvePoint {
  x: number;
  y: number;
}

/** درون‌یابی خطی روی نقاط منحنی؛ خارج از بازه به نزدیک‌ترین نقطه Clamp می‌شود */
export function interpolateCurve(points: CurvePoint[], x: number): number {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  if (sorted.length === 0) return 1;
  if (x <= sorted[0].x) return sorted[0].y;
  const last = sorted[sorted.length - 1];
  if (x >= last.x) return last.y;
  for (let i = 1; i < sorted.length; i += 1) {
    if (x <= sorted[i].x) {
      const a = sorted[i - 1];
      const b = sorted[i];
      const t = (x - a.x) / (b.x - a.x);
      return a.y + t * (b.y - a.y);
    }
  }
  return last.y;
}

/** QuantityFactor از منحنی tuning.quantityCurve (0.5→0.60 … 2→1.70 …) */
export function quantityFactorFor(quantity: number, tuning: TuningConfig): number {
  return interpolateCurve(
    tuning.quantityCurve.map((p) => ({ x: p.quantity, y: p.factor })),
    quantity,
  );
}

/** Stage یک Entry بر اساس Exposure انباشته — پنجره‌ی Ready بخشنده است */
export function stageOf(exposure: number, tuning: TuningConfig): ProcessStage {
  const t = tuning.stageThresholds;
  if (exposure < t.extracting) return 'fresh';
  if (exposure < t.ready) return 'extracting';
  if (exposure < t.overprocessed) return 'ready';
  return 'overprocessed';
}

/**
 * کسر استخراج‌شده بر اساس Exposure — منحنی خطی-تکه‌ای:
 * f(0)=fresh (0.35) → f(آستانه‌ی extracting)=0.7 → f(آستانه‌ی ready)=1.0
 * و بعد از آن ثابت 1.0 (Overprocessed دیگر رشد نمی‌کند؛ فقط ProcessError می‌سازد).
 */
export function extractionFractionAt(exposure: number, tuning: TuningConfig): number {
  const t = tuning.stageThresholds;
  const f = tuning.extractionFraction;
  return interpolateCurve(
    [
      { x: 0, y: f.fresh },
      { x: t.extracting, y: f.extracting },
      { x: t.ready, y: f.ready },
    ],
    exposure,
  );
}

/** Quality Modifier بر اساس Stability — درون‌یابی خطی منحنی سند 03 بخش 9 */
export function stabilityModifierFor(stability: number, tuning: TuningConfig): number {
  return interpolateCurve(
    tuning.stabilityQualityCurve.map((p) => ({ x: p.stability, y: p.modifier })),
    stability,
  );
}
