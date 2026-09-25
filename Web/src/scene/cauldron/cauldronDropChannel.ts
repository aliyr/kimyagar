/** آخرین توده‌ای که قاشق داخل دیگ ریخت — ClassicCauldronFx برمی‌دارد. */

import type { MortarChip } from '../mortarPile';

let pending: MortarChip[] | null = null;
let at = 0;

export function publishCauldronDrop(chips: MortarChip[]): void {
  pending = chips.map((chip) => ({ ...chip }));
  at = typeof performance === 'undefined' ? 0 : performance.now();
}

export function takeCauldronDrop(): MortarChip[] | null {
  if (!pending) return null;
  const age = (typeof performance === 'undefined' ? 0 : performance.now()) - at;
  const chips = pending;
  pending = null;
  if (age > 4000) return null;
  return chips;
}
