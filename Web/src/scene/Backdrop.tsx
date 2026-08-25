/**
 * پس‌زمینه‌ی کارگاه، میز کار و «فضای سینمایی» — کاملاً تزئینی (بدون تعامل).
 * placeholder ها با CSS ساخته شده‌اند تا صحنه بدون فایل هنری هم کامل به‌نظر بیاید.
 *
 * لایه‌های فضاسازی (فقط در مسیر کلاسیک، چون Backdrop کلاسیک است):
 *   - نورهای مورّب گرم از بالا-چپ با نفس‌کشیدن آرام (~۱۰ ثانیه).
 *   - غبار شناور: نقاط ریزِ محو با انیمیشن‌های بلند و نامنظم در عمق‌های مختلف.
 *   - هاله‌ی آتش نزدیک اجاق که شدت و سرعت لرزشش از حرارت فعلی می‌آید.
 *   - Vignette ملایم لبه‌های صحنه و گرمای شمع‌مانندِ نوسانی.
 * همه با pointer-events: none و فقط transform/opacity (بدون هزینه‌ی Layout).
 */

import { useGameStore } from '../store/gameStore';
import { SCENE_ZONES } from './artManifest';
import { ArtLayer, rectStyle, vars, zoneStyle } from './Zone';
import './classic-ambience.css';

const NICHE_BOTTLES = ['#7c5a2e', '#2ba09a', '#6e1f2e', '#22508f'];

/** شافت‌های نور از بالا-چپ؛ عرض و زاویه‌ی هرکدام کمی متفاوت */
const RAYS = [
  { left: -60, width: 300, angle: 19, opacity: 0.9, delay: '0s' },
  { left: 210, width: 190, angle: 21, opacity: 0.6, delay: '-3.4s' },
  { left: 470, width: 240, angle: 17, opacity: 0.45, delay: '-6.8s' },
];

/**
 * غبار: مقادیر شبه-تصادفی اما قطعی (ثابت بین رندرها و بیلدها) تا انیمیشن‌ها
 * هم‌زمان نشوند و الگوی تکراری دیده نشود.
 */
function pseudoRandom(seed: number, salt: number): number {
  const v = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

const DUST = Array.from({ length: 13 }, (_, i) => {
  const r = (salt: number) => pseudoRandom(i + 1, salt);
  /** عمق ۰..۱ — نزدیک‌تر یعنی بزرگ‌تر، روشن‌تر و کم‌محوتر */
  const depth = 0.3 + r(1) * 0.7;
  return {
    key: i,
    x: Math.round(70 + r(2) * 1780),
    y: Math.round(240 + r(3) * 760),
    size: Math.round(3 + depth * 7),
    blur: `${(1 + (1 - depth) * 2.2).toFixed(1)}px`,
    opacity: (0.1 + depth * 0.28).toFixed(2),
    dx: `${Math.round(-170 + r(4) * 340)}px`,
    dy: `${-Math.round(200 + r(5) * 430)}px`,
    duration: `${(15 + r(6) * 17).toFixed(1)}s`,
    delay: `${(r(7) * -24).toFixed(1)}s`,
  };
});

/** هاله‌ی آتش، مرکزش روی هیزم‌های اجاق (‎x≈۸۹۰، y≈۹۳۰‎) */
const FIRE_GLOW = { x: 500, y: 560, width: 780, height: 740 };

export function Backdrop() {
  const heat = useGameStore((s) => s.brew.currentHeat);

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

      {/* هاله‌ی آتش — سیلوئت پاتیل و میز را نرم روشن می‌کند */}
      <div
        className="amb-fire"
        data-heat={heat}
        style={rectStyle(FIRE_GLOW, 60)}
        aria-hidden="true"
      />

      {/* شافت‌های نور از بالا-چپ */}
      <div className="amb-rays" style={{ zIndex: 61 }} aria-hidden="true">
        {RAYS.map((ray, i) => (
          <span
            key={i}
            className="amb-rays__shaft"
            style={{
              left: ray.left,
              width: ray.width,
              transform: `rotate(${ray.angle}deg)`,
              opacity: ray.opacity,
              animationDelay: ray.delay,
            }}
          />
        ))}
      </div>

      {/* غبار شناور */}
      <div className="amb-dust" style={{ zIndex: 62 }} aria-hidden="true">
        {DUST.map((mote) => (
          <span
            key={mote.key}
            className="amb-dust__mote"
            style={{
              left: mote.x,
              top: mote.y,
              width: mote.size,
              height: mote.size,
              ...vars({
                '--mote-blur': mote.blur,
                '--mote-opacity': mote.opacity,
                '--mote-dx': mote.dx,
                '--mote-dy': mote.dy,
                '--mote-duration': mote.duration,
                '--mote-delay': mote.delay,
              }),
            }}
          />
        ))}
      </div>

      {/* گرمای شمع‌مانند + Vignette ملایم لبه‌ها */}
      <div className="amb-warmth" style={{ zIndex: 76 }} aria-hidden="true" />
      <div className="amb-vignette" style={{ zIndex: 77 }} aria-hidden="true" />
    </>
  );
}
