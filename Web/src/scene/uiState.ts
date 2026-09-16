/**
 * State فقط-UI صحنه (Drag در جریان، ضربان انیمیشن‌ها).
 * هیچ حقیقت بازی اینجا نگه‌داری نمی‌شود — آن‌ها در store/gameStore هستند.
 */

import { create } from 'zustand';
import type { IngredientId } from '../engine/types';
import type { DropTargetId } from './layout';

/**
 * نوع Drag. در فلو کلیکی کلاسیک دیگر استفاده نمی‌شود (قفسه فقط اسکرول افقی
 * دارد)؛ برای سازگاری DragGhost و نسخه‌ی v2 نگه داشته شده است.
 */
export type DragKind = 'jar' | 'ground' | 'bottle';

/** فازهای انتقال هاون ⇒ دیگ با قاشق سر بزی (کلاسیک) */
export type TransferPhase = null | 'scoop' | 'carry' | 'drop';
/** فازهای ریختن دیگ ⇒ شیشه ⇒ مشتری (کلاسیک) */
export type PourPhase = null | 'tilt' | 'stream' | 'deliver';

export interface DragState {
  kind: DragKind;
  ingredientId?: IngredientId;
  /** موقعیت اشاره‌گر در فضای صحنه */
  x: number;
  y: number;
  /** مقصد زیر اشاره‌گر (برای Highlight) */
  over: DropTargetId | null;
}

export interface UiState {
  drag: DragState | null;
  /** کوبیدن در جریان است (برای لرزش محتوای هاون) */
  grinding: boolean;
  /** هم‌زدن در جریان است */
  stirring: boolean;
  /** انیمیشن ریختن معجون در بطری در جریان است */
  pouring: boolean;
  /** شمارنده‌ها: تغییرشان انیمیشن یک‌بارمصرف را دوباره پخش می‌کند */
  splashPulse: number;
  swirlPulse: number;
  pourPulse: number;
  /** لرزش «جا ندارد» هاون — وقتی Drop شیشه روی هاونِ پر رد می‌شود */
  mortarShakePulse: number;
  /** هر «ضربه»ی کوبش خودکار (~۰٫۳۵ث) — برای صدا/هپتیک و لرزش کوبه */
  grindTickPulse: number;
  /** انتقال هاون ⇒ دیگ با قاشق (کلاسیک) */
  transfer: TransferPhase;
  /** ریختن دیگ ⇒ شیشه ⇒ مشتری (کلاسیک) */
  pour: PourPhase;

  beginDrag: (d: Omit<DragState, 'over'>) => void;
  updateDrag: (x: number, y: number, over: DropTargetId | null) => void;
  endDrag: () => void;
  setGrinding: (v: boolean) => void;
  setStirring: (v: boolean) => void;
  setPouring: (v: boolean) => void;
  setTransfer: (phase: TransferPhase) => void;
  setPour: (phase: PourPhase) => void;
  pulse: (key: 'splashPulse' | 'swirlPulse' | 'pourPulse' | 'mortarShakePulse' | 'grindTickPulse') => void;
}

export const useUiState = create<UiState>((set) => ({
  drag: null,
  grinding: false,
  stirring: false,
  pouring: false,
  splashPulse: 0,
  swirlPulse: 0,
  pourPulse: 0,
  mortarShakePulse: 0,
  grindTickPulse: 0,
  transfer: null,
  pour: null,

  beginDrag: (d) => set({ drag: { ...d, over: null } }),
  updateDrag: (x, y, over) =>
    set((s) => (s.drag ? { drag: { ...s.drag, x, y, over } } : {})),
  endDrag: () => set({ drag: null }),
  setGrinding: (v) => set({ grinding: v }),
  setStirring: (v) => set({ stirring: v }),
  setPouring: (v) => set({ pouring: v }),
  setTransfer: (phase) => set({ transfer: phase }),
  setPour: (phase) => set({ pour: phase, pouring: phase !== null }),
  pulse: (key) => set((s) => ({ [key]: s[key] + 1 }) as Partial<UiState>),
}));
