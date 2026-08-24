/**
 * State فقط-UI صحنه (Drag در جریان، ضربان انیمیشن‌ها).
 * هیچ حقیقت بازی اینجا نگه‌داری نمی‌شود — آن‌ها در store/gameStore هستند.
 */

import { create } from 'zustand';
import type { IngredientId } from '../engine/types';
import type { DropTargetId } from './layout';

export type DragKind = 'jar' | 'ground' | 'bottle';

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

  beginDrag: (d: Omit<DragState, 'over'>) => void;
  updateDrag: (x: number, y: number, over: DropTargetId | null) => void;
  endDrag: () => void;
  setGrinding: (v: boolean) => void;
  setStirring: (v: boolean) => void;
  setPouring: (v: boolean) => void;
  pulse: (key: 'splashPulse' | 'swirlPulse' | 'pourPulse') => void;
}

export const useUiState = create<UiState>((set) => ({
  drag: null,
  grinding: false,
  stirring: false,
  pouring: false,
  splashPulse: 0,
  swirlPulse: 0,
  pourPulse: 0,

  beginDrag: (d) => set({ drag: { ...d, over: null } }),
  updateDrag: (x, y, over) =>
    set((s) => (s.drag ? { drag: { ...s.drag, x, y, over } } : {})),
  endDrag: () => set({ drag: null }),
  setGrinding: (v) => set({ grinding: v }),
  setStirring: (v) => set({ stirring: v }),
  setPouring: (v) => set({ pouring: v }),
  pulse: (key) => set((s) => ({ [key]: s[key] + 1 }) as Partial<UiState>),
}));
