/**
 * سایه‌های تماس زیر اشیای روی میز (هاون، پاتیل، شیشه‌ها) — بیضی‌های نرم CSS
 * درست بالای سطح میز (z=11) تا اشیا واقعاً «روی میز» بنشینند، نه که شناور
 * دیده شوند. مرکز هر بیضی نقطه‌ی تماس تصویر با میز است.
 */

import { SCENE_ZONES } from './artManifest';
import { PROPS } from './layout';
import { rectStyle } from './Zone';
import './classic-props.css';

const Z = SCENE_ZONES.workTable.z + 1;

function ellipse(cx: number, cy: number, rx: number, ry: number) {
  return { x: cx - rx, y: cy - ry, width: rx * 2, height: ry * 2 };
}

const mortar = SCENE_ZONES.mortar;
const bottle = SCENE_ZONES.bottleShelf;
const ledger = PROPS.ledger;
const counter = SCENE_ZONES.customerCounter;

/** پاتیل سایه ندارد: پایه‌اش داخل سوراخ اجاق (StoveHole) است */
const SHADOWS = [
  { id: 'mortar', rect: ellipse(mortar.x + mortar.width / 2, mortar.y + mortar.height - 16, mortar.width * 0.44, 22), strength: 0.6 },
  { id: 'bottle', rect: ellipse(bottle.x + bottle.width / 2, bottle.y + bottle.height - 8, bottle.width * 0.5, 12), strength: 0.5 },
  { id: 'ledger', rect: ellipse(ledger.x + ledger.width / 2, ledger.y + ledger.height - 6, ledger.width * 0.55, 12), strength: 0.4 },
  // پیشخوان روی زمین: سایه‌ی پهن زیر پایه‌ها و کمی به چپ (نور از راست-بالا)
  { id: 'counter', rect: ellipse(counter.x + counter.width * 0.46, counter.y + counter.height - 12, counter.width * 0.56, 26), strength: 0.55 },
];

export function ContactShadows() {
  return (
    <>
      {SHADOWS.map((s) => (
        <div
          key={s.id}
          className="contact-shadow"
          aria-hidden
          style={rectStyle(s.rect, Z, { opacity: s.strength })}
        />
      ))}
    </>
  );
}
