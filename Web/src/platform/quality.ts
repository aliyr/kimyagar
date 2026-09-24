/**
 * سطح کیفیت افکت‌ها (تطبیقی) — قرارداد مصرف‌کننده‌ها (MortarFx و …).
 *
 * تشخیص اولیه از hardwareConcurrency / deviceMemory / DPR / Capacitor،
 * با override ذخیره‌شده در localStorage؛ پروب زمان فریم برای افت/صعود خودکار؛
 * و prefers-reduced-motion برای خاموش‌کردن حرکت‌های تزئینی.
 */

export type QualityTier = 'high' | 'medium' | 'low';

export interface QualityBudget {
  tier: QualityTier;
  /** ضریب تعداد ذرات هر سیستم (۱ = بودجهٔ کامل) */
  particleScale: number;
  /** سقف devicePixelRatio بوم‌های افکت */
  dprCap: number;
  /** موج براق روی لبه */
  specular: boolean;
  /** سایهٔ زندهٔ کوبه */
  liveShadow: boolean;
  /** کاربر حرکت کم خواسته: بدون لرزش/زوم، ذرات حداقلی */
  reducedMotion: boolean;
}

const BUDGETS: Record<QualityTier, Omit<QualityBudget, 'reducedMotion'>> = {
  high: { tier: 'high', particleScale: 1, dprCap: 1.5, specular: true, liveShadow: true },
  medium: { tier: 'medium', particleScale: 0.6, dprCap: 1, specular: true, liveShadow: true },
  low: { tier: 'low', particleScale: 0.3, dprCap: 0.75, specular: false, liveShadow: false },
};

const TIER_RANK: Record<QualityTier, number> = { low: 0, medium: 1, high: 2 };
const QUALITY_STORAGE_KEY = 'kimiagar.quality';
const PROBE_SAMPLES = 90;
const COOLDOWN_MS = 1500;

function atMost(current: QualityTier, max: QualityTier): QualityTier {
  return TIER_RANK[current] <= TIER_RANK[max] ? current : max;
}

function dropOne(t: QualityTier): QualityTier {
  if (t === 'high') return 'medium';
  if (t === 'medium') return 'low';
  return 'low';
}

function climbOne(t: QualityTier): QualityTier {
  if (t === 'low') return 'medium';
  if (t === 'medium') return 'high';
  return 'high';
}

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

function detectCeiling(): QualityTier {
  let t: QualityTier = 'high';

  const cores =
    typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
      ? navigator.hardwareConcurrency
      : undefined;
  if (cores !== undefined) {
    if (cores <= 2) t = atMost(t, 'low');
    else if (cores <= 4) t = atMost(t, 'medium');
  }

  const mem =
    typeof navigator !== 'undefined' ? (navigator as { deviceMemory?: number }).deviceMemory : undefined;
  if (typeof mem === 'number') {
    if (mem <= 2) t = atMost(t, 'low');
    else if (mem <= 4) t = atMost(t, 'medium');
  }

  if (typeof window !== 'undefined') {
    try {
      const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
      if (cap?.isNativePlatform?.()) t = atMost(t, 'medium');
    } catch {
      /* Capacitor اختیاری */
    }

    const dpr = typeof window.devicePixelRatio === 'number' ? window.devicePixelRatio : 1;
    if (dpr >= 3 && (cores === undefined || cores <= 6)) t = atMost(t, 'medium');
  }

  return t;
}

function readStoredTier(): QualityTier | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(QUALITY_STORAGE_KEY);
    if (raw === 'high' || raw === 'medium' || raw === 'low') return raw;
  } catch {
    /* بدون storage */
  }
  return null;
}

function persistTier(next: QualityTier): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(QUALITY_STORAGE_KEY, next);
  } catch {
    /* بدون storage */
  }
}

function readPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function watchPrefersReducedMotion(): void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  try {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      const next = mq.matches;
      if (reducedMotion === next) return;
      reducedMotion = next;
      emit();
    };
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
    else if (typeof (mq as { addListener?: (cb: () => void) => void }).addListener === 'function') {
      (mq as { addListener: (cb: () => void) => void }).addListener(onChange);
    }
  } catch {
    /* matchMedia اختیاری */
  }
}

const detectedCeiling = detectCeiling();
const stored = readStoredTier();

/** سقف صعود خودکار: تشخیص سخت‌افزار یا override ذخیره‌شده/دستی */
let ceiling: QualityTier = stored ?? detectedCeiling;
let tier: QualityTier = stored ?? detectedCeiling;
let reducedMotion = readPrefersReducedMotion();
let qualitySource: 'auto' | 'stored' = stored ? 'stored' : 'auto';
let autoDropped = false;

const listeners = new Set<() => void>();
const frameSamples: number[] = [];
let cooldownUntil = 0;

function emit(): void {
  for (const l of listeners) l();
}

watchPrefersReducedMotion();

export function getQuality(): QualityBudget {
  return { ...BUDGETS[tier], reducedMotion };
}

export function subscribeQuality(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** تنظیم دستی/آزمون — در localStorage هم نوشته می‌شود */
export function setQualityTier(next: QualityTier): void {
  ceiling = next;
  qualitySource = 'stored';
  autoDropped = false;
  frameSamples.length = 0;
  cooldownUntil = 0;
  persistTier(next);
  if (tier === next) return;
  tier = next;
  emit();
}

export function setReducedMotion(next: boolean): void {
  if (reducedMotion === next) return;
  reducedMotion = next;
  emit();
}

/**
 * زمان یک فریم (ms) از حلقهٔ افکت — پروب تطبیقی از همین تغذیه می‌شود.
 * میانگین ۹۰ نمونهٔ اخیر: >۲۰ms افت یک پله؛ <۹ms و پس از افت خودکار ⇒ صعود یک پله
 * (نه بالاتر از سقف تشخیص/ذخیره). بعد از هر تصمیم، ۱٫۵s سکوت.
 */
export function reportFrameTime(ms: number): void {
  if (!(ms > 0) || ms > 250) return;
  if (nowMs() < cooldownUntil) return;

  frameSamples.push(ms);
  if (frameSamples.length < PROBE_SAMPLES) return;

  let sum = 0;
  for (const s of frameSamples) sum += s;
  const mean = sum / frameSamples.length;
  frameSamples.length = 0;
  cooldownUntil = nowMs() + COOLDOWN_MS;

  let next = tier;
  if (mean > 20) {
    next = dropOne(tier);
    if (TIER_RANK[next] < TIER_RANK[tier]) autoDropped = true;
  } else if (mean < 9 && autoDropped) {
    next = climbOne(tier);
    if (TIER_RANK[next] > TIER_RANK[ceiling]) next = ceiling;
    if (next === ceiling) autoDropped = false;
  }

  if (next === tier) return;
  tier = next;
  qualitySource = 'auto';
  emit();
}

/** برچسب کوتاه برای overlay دیباگ — مثلاً `medium (auto)` یا `low (stored)` */
export function describeQuality(): string {
  return `${tier} (${qualitySource})`;
}
