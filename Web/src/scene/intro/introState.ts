/**
 * State فقط-UI سردر: فاز ورود و پنل باز.
 *
 *   boot      اولین اجرا — فانوس روشن می‌شود، تابلو با زنجیر پایین می‌آید
 *   idle      منتظر بازیکن
 *   opening   درکوب زده شد؛ زنگ، در باز می‌شود
 *   entering  دوربین از آستانه می‌گذرد؛ App تیرگیِ کارگاه را برمی‌دارد
 *
 * App فاز را می‌خواند تا `workshop-dusk` را در فاز entering محو کند؛ خودِ
 * تغییر hash در پایان entering در IntroScreen انجام می‌شود.
 */

import { create } from 'zustand';

export type IntroPhase = 'boot' | 'idle' | 'opening' | 'entering';
export type IntroPanel = 'stages' | 'scores' | 'confirmFresh' | null;

export const INTRO_SEEN_KEY = 'kimiagar.intro.seen';

export interface IntroState {
  phase: IntroPhase;
  panel: IntroPanel;
  setPhase: (phase: IntroPhase) => void;
  setPanel: (panel: IntroPanel) => void;
}

export function readIntroSeen(): boolean {
  try {
    return globalThis.localStorage?.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

export function markIntroSeen(): void {
  try {
    globalThis.localStorage?.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    /* بدون storage: هر بار boot کوتاه پخش می‌شود */
  }
}

export const useIntroState = create<IntroState>((set) => ({
  phase: readIntroSeen() ? 'idle' : 'boot',
  panel: null,
  setPhase: (phase) => set({ phase }),
  setPanel: (panel) => set({ panel }),
}));
