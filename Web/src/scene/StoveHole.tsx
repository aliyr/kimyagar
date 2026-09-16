/**
 * سوراخ اجاق روی سطح میز — پاتیل «روی میز» نیست، «داخل میز» است.
 *
 * دو لایه با یک هندسه (STOVE_HOLE):
 * - پشت (z = میز+۱): بیضی تیره‌ی سوراخ با حلقه‌ی آهنی؛ زیر پایه‌ی پاتیل.
 * - لبه‌ی جلو (z = پاتیل+۲): همان بیضی، فقط نیمه‌ی پایین (clip-path)، روی بدنه‌ی
 *   PNG می‌افتد و ته دیگ را پنهان می‌کند ⇒ دیگ در سوراخ فرو رفته دیده می‌شود.
 * درخشش آتش از ته سوراخ در FireLight (متغیر --fire-glow) اضافه می‌شود.
 */

import { SCENE_ZONES } from './artManifest';
import { STOVE_HOLE } from './classicCauldronGeometry';
import { rectStyle } from './Zone';
import './classic-props.css';

export const STOVE_HOLE_RECT = {
  x: STOVE_HOLE.cx - STOVE_HOLE.rx,
  y: STOVE_HOLE.cy - STOVE_HOLE.ry,
  width: STOVE_HOLE.rx * 2,
  height: STOVE_HOLE.ry * 2,
};

export function StoveHole() {
  return (
    <>
      <div className="stove-hole" aria-hidden style={rectStyle(STOVE_HOLE_RECT, SCENE_ZONES.workTable.z + 1)}>
        <div className="stove-hole__depth" />
      </div>
      <div
        className="stove-hole stove-hole--lip"
        aria-hidden
        style={rectStyle(STOVE_HOLE_RECT, SCENE_ZONES.cauldron.z + 2)}
      >
        <div className="stove-hole__depth" />
      </div>
    </>
  );
}
