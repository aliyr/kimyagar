/**
 * پیشرفتِ ماندگار بازیکن — localStorage، کلید `kimiagar.progress`.
 *
 * فقط چیزهایی ذخیره می‌شود که «بین نشست‌ها» معنا دارد: مشتری فعلی، نشان‌های
 * کشف‌شده، مواد آزموده و تاریخچه‌ی امتیازها (برای دفتر حساب سردر).
 * دیگ و هاونِ نیمه‌کاره ذخیره نمی‌شوند؛ هر نشست با پاتیل خالی شروع می‌شود.
 *
 * منطق serialize/parse خالص است (بدون window) تا در vitest آزموده شود؛
 * gameStore در لحظه‌های مناسب (تحویل، مشتری بعدی، کشف) این‌جا می‌نویسد.
 */

import { create } from 'zustand';
import type { IngredientId, QualityBand } from '../engine/types';

export const PROGRESS_STORAGE_KEY = 'kimiagar.progress';
export const PROGRESS_VERSION = 1;
/** سقف ردیف‌های دفتر حساب؛ قدیمی‌ترها حذف می‌شوند */
export const MAX_SCORE_HISTORY = 60;

export interface ScoreEntry {
  customerId: string;
  /** عدد خام (فقط برای مرتب‌سازی/رکورد؛ در UI کیفی نشان داده می‌شود) */
  score: number;
  band: QualityBand;
  /** زمان ثبت — epoch ms */
  at: number;
}

export interface ProgressData {
  version: number;
  customerIndex: number;
  discoveredTagIds: string[];
  usedIngredientIds: IngredientId[];
  scoreHistory: ScoreEntry[];
  bestScore: number | null;
  lastPlayedAt: number | null;
}

export function emptyProgress(): ProgressData {
  return {
    version: PROGRESS_VERSION,
    customerIndex: 0,
    discoveredTagIds: [],
    usedIngredientIds: [],
    scoreHistory: [],
    bestScore: null,
    lastPlayedAt: null,
  };
}

/** آیا چیزی برای «ادامه» وجود دارد؟ */
export function hasProgress(p: ProgressData): boolean {
  return p.customerIndex > 0 || p.scoreHistory.length > 0 || p.discoveredTagIds.length > 0;
}

const BANDS: QualityBand[] = ['excellent', 'good', 'partial', 'failure'];

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function parseEntry(v: unknown): ScoreEntry | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.customerId !== 'string') return null;
  if (typeof o.score !== 'number' || !Number.isFinite(o.score)) return null;
  if (typeof o.band !== 'string' || !BANDS.includes(o.band as QualityBand)) return null;
  const at = typeof o.at === 'number' && Number.isFinite(o.at) ? o.at : 0;
  return { customerId: o.customerId, score: o.score, band: o.band as QualityBand, at };
}

/**
 * متن ذخیره‌شده ⇒ داده‌ی معتبر. هر فیلد خراب به مقدار خالی می‌افتد تا یک
 * storage آسیب‌دیده بازی را از کار نیندازد. نسخه‌های آینده این‌جا migrate می‌شوند.
 */
export function parseProgress(raw: string | null | undefined): ProgressData {
  const base = emptyProgress();
  if (!raw) return base;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return base;
  }
  if (!json || typeof json !== 'object') return base;
  const o = json as Record<string, unknown>;
  const version = typeof o.version === 'number' ? o.version : 0;
  if (version > PROGRESS_VERSION) return base;

  const scoreHistory = Array.isArray(o.scoreHistory)
    ? o.scoreHistory.map(parseEntry).filter((e): e is ScoreEntry => e !== null).slice(-MAX_SCORE_HISTORY)
    : [];
  const customerIndex =
    typeof o.customerIndex === 'number' && Number.isInteger(o.customerIndex) && o.customerIndex >= 0
      ? o.customerIndex
      : 0;
  const best = scoreHistory.reduce<number | null>((m, e) => (m === null || e.score > m ? e.score : m), null);
  return {
    version: PROGRESS_VERSION,
    customerIndex,
    discoveredTagIds: isStringArray(o.discoveredTagIds) ? o.discoveredTagIds : [],
    usedIngredientIds: isStringArray(o.usedIngredientIds) ? (o.usedIngredientIds as IngredientId[]) : [],
    scoreHistory,
    bestScore: best,
    lastPlayedAt: typeof o.lastPlayedAt === 'number' ? o.lastPlayedAt : null,
  };
}

export function serializeProgress(p: ProgressData): string {
  return JSON.stringify({ ...p, version: PROGRESS_VERSION });
}

export function withScore(p: ProgressData, entry: ScoreEntry): ProgressData {
  const scoreHistory = [...p.scoreHistory, entry].slice(-MAX_SCORE_HISTORY);
  return {
    ...p,
    scoreHistory,
    bestScore: p.bestScore === null ? entry.score : Math.max(p.bestScore, entry.score),
    lastPlayedAt: entry.at,
  };
}

function readStorage(): ProgressData {
  try {
    return parseProgress(globalThis.localStorage?.getItem(PROGRESS_STORAGE_KEY));
  } catch {
    return emptyProgress();
  }
}

function writeStorage(p: ProgressData): void {
  try {
    globalThis.localStorage?.setItem(PROGRESS_STORAGE_KEY, serializeProgress(p));
  } catch {
    /* بدون storage هم بازی کار می‌کند */
  }
}

export interface ProgressState {
  progress: ProgressData;
  recordScore: (entry: ScoreEntry) => void;
  setCustomerIndex: (index: number) => void;
  setDiscoveries: (discoveredTagIds: string[], usedIngredientIds: IngredientId[]) => void;
  /** «دکان تازه»: همه‌چیز از نو */
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  progress: readStorage(),

  recordScore: (entry) => {
    const progress = withScore(get().progress, entry);
    writeStorage(progress);
    set({ progress });
  },

  setCustomerIndex: (index) => {
    const progress = { ...get().progress, customerIndex: index, lastPlayedAt: Date.now() };
    writeStorage(progress);
    set({ progress });
  },

  setDiscoveries: (discoveredTagIds, usedIngredientIds) => {
    const progress = { ...get().progress, discoveredTagIds, usedIngredientIds };
    writeStorage(progress);
    set({ progress });
  },

  resetProgress: () => {
    const progress = emptyProgress();
    writeStorage(progress);
    set({ progress });
  },
}));
