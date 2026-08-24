/**
 * پیشخوان مشتری — سمت راست، جدا از میز کار.
 * تا وقتی هنر مشتری آماده نیست، یک سیلوئت گرم با نسبت‌های متفاوت
 * برای هر appearance رندر می‌شود.
 */

import { useGameStore } from '../store/gameStore';
import { SCENE_ZONES } from './artManifest';
import { ArtLayer, zoneStyle } from './Zone';

const APPEARANCE_STATES = SCENE_ZONES.customer.states as Record<string, string | undefined>;

export function CustomerArea() {
  const customer = useGameStore((s) => s.currentCustomer());
  const appearance = customer.appearance;

  return (
    <>
      <div
        data-testid="customer"
        className="customer"
        data-appearance={appearance}
        style={zoneStyle(SCENE_ZONES.customer)}
      >
        <ArtLayer key={appearance} src={APPEARANCE_STATES[appearance]}>
          <div className="customer__ph">
            <span className="customer__drape" />
            <span className="customer__body" />
            <span className="customer__head" />
            <span className="customer__rim" />
          </div>
        </ArtLayer>
      </div>

      <div className="counter" style={zoneStyle(SCENE_ZONES.customerCounter)}>
        <ArtLayer src={SCENE_ZONES.customerCounter.img}>
          <div className="counter__ph">
            <div className="counter__slab" />
            <div className="counter__front" />
            <div className="counter__scale" />
          </div>
        </ArtLayer>
      </div>
    </>
  );
}
