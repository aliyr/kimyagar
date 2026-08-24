/**
 * Overlay ها — مالک: Workstream C.
 *
 * OverlayHost تنها نقطه‌ی mount همه‌ی Overlay هاست (App آن را رندر می‌کند).
 * Overlay فعال از useGameStore().openOverlay خوانده می‌شود.
 * باز بودن هر Overlay یعنی Pause / Safe State (خود store مدیریت می‌کند).
 * DiscoveryToast صف discoveryQueue را به‌صورت Micro-feedback غیرمسدودکننده
 * (۱-۲ ثانیه) نمایش می‌دهد.
 */

import './overlays.css';
import { useGameStore } from '../store/gameStore';
import { IngredientDetailOverlay } from './IngredientDetail';
import { CustomerRequestOverlay } from './CustomerRequest';
import { ProcessHistoryOverlay } from './ProcessHistory';
import { NotebookOverlay } from './Notebook';
import { ResultOverlay } from './ResultScreen';
import { DiscoveryToast } from './DiscoveryToast';

export { DiscoveryToast };

export function OverlayHost() {
  const openOverlay = useGameStore((s) => s.openOverlay);

  if (openOverlay === 'ingredient_detail') return <IngredientDetailOverlay />;
  if (openOverlay === 'customer_request') return <CustomerRequestOverlay />;
  if (openOverlay === 'process_history') return <ProcessHistoryOverlay />;
  if (openOverlay === 'notebook') return <NotebookOverlay />;
  if (openOverlay === 'result') return <ResultOverlay />;
  return null;
}
