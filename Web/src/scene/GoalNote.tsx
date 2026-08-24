/**
 * کاغذ سفارش — دائمی، بالا-راست، فشرده (بخش ۶.۱).
 * Tap ⇒ Overlay متن کامل درخواست مشتری.
 */

import { useGameStore } from '../store/gameStore';
import { tapProps } from '../gestures';
import { SCENE_ZONES } from './artManifest';
import { ArtLayer, zoneStyle } from './Zone';

export function GoalNote() {
  const customer = useGameStore((s) => s.currentCustomer());
  const openOverlay = useGameStore((s) => s.openOverlayAction);

  return (
    <div
      data-testid="goal-note"
      className="note interactive"
      style={zoneStyle(SCENE_ZONES.goalNote)}
      {...tapProps(() => openOverlay('customer_request'))}
    >
      <ArtLayer src={SCENE_ZONES.goalNote.img} fit="cover">
        <div className="note__paper" />
      </ArtLayer>
      <div className="note__content">
        <span className="note__who">{customer.nameFa}</span>
        <span className="note__summary">{customer.summaryFa}</span>
      </div>
      <span className="note__pin" />
    </div>
  );
}
