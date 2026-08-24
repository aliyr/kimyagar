/**
 * پس‌زمینه‌ی کارگاه و میز کار — کاملاً تزئینی (بدون تعامل).
 * placeholder ها با CSS ساخته شده‌اند تا صحنه بدون فایل هنری هم کامل به‌نظر بیاید.
 */

import { SCENE_ZONES } from './artManifest';
import { ArtLayer, zoneStyle } from './Zone';

const NICHE_BOTTLES = ['#7c5a2e', '#2ba09a', '#6e1f2e', '#22508f'];

export function Backdrop() {
  return (
    <>
      <div className="backdrop" style={zoneStyle(SCENE_ZONES.background)}>
        <ArtLayer src={SCENE_ZONES.background.img} fit="cover">
          <div className="backdrop__ph">
            <div className="backdrop__wall" />
            <div className="backdrop__glow" />
            {[0, 1].map((i) => (
              <div key={i} className={`niche niche--${i}`}>
                <div className="niche__inner">
                  <div className="niche__shelf" />
                  <div className="niche__bottles">
                    {NICHE_BOTTLES.map((c, j) => (
                      <span key={j} style={{ background: c, height: 34 + ((j * 13) % 26) }} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <div className="backdrop__beam" />
            <div className="backdrop__floor" />
          </div>
        </ArtLayer>
      </div>

      <div className="table" style={zoneStyle(SCENE_ZONES.workTable)}>
        <ArtLayer src={SCENE_ZONES.workTable.img}>
          <div className="table__ph">
            <div className="table__top" />
            <div className="table__edge" />
            <div className="table__front" />
          </div>
        </ArtLayer>
      </div>
    </>
  );
}
