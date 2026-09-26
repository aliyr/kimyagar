/**
 * فرمان «دور ریختن» (سطل / تلاش دوباره) در صحنه‌ی کلاسیک.
 *
 * store همان لحظه ریست می‌شود (مثل قبل)؛ اگر دیگ محتوا داشت و شبیه‌سازِ دهانه
 * ثبت شده باشد، نمایشِ پرت‌شدن هم شروع می‌شود: رنگ مایع همین لحظه برداشته
 * می‌شود، دیگ واقعی پنهان و DiscardFx نسخه‌ی پرنده را می‌کشد؛ در پایان همان
 * شبیه‌ساز دیگ نو را از بالا می‌اندازد.
 *
 * بیرون از کلاسیک (v2 بدون ثبت شبیه‌ساز) فقط ریست ساده است.
 */

import { useGameStore } from '../../store/gameStore';
import { useUiState } from '../uiState';
import type { ClassicBrewSim } from './ClassicBrewSim';

let activeSim: ClassicBrewSim | null = null;

/** CauldronStation شبیه‌ساز زنده‌اش را ثبت می‌کند؛ تابع لغو برمی‌گرداند */
export function registerDiscardSim(sim: ClassicBrewSim): () => void {
  activeSim = sim;
  return () => {
    if (activeSim === sim) activeSim = null;
  };
}

/** دیگ غایب/در راه است ⇒ سطل، دیگ و انتقال قاشق قفل */
export function isDiscardBusy(): boolean {
  const d = useUiState.getState().discard;
  return d !== null && !d.settled;
}

export function discardCauldron(): void {
  if (isDiscardBusy()) return;
  const store = useGameStore.getState();
  const entries = store.brew.entries;
  if (entries.length > 0 && activeSim) {
    const burnt = entries.some((e) => e.stage === 'overprocessed');
    const liquid = activeSim.liquidHex;
    activeSim.hidePot();
    useUiState.getState().startDiscard(liquid, burnt);
  }
  store.resetBrew();
}
