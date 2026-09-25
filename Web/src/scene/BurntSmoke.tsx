/**
 * دودِ معجونِ سوخته — وقتی ماده‌ای در پاتیل به مرحله‌ی «جوشیده و سوخته» رسید،
 * دود خاکستری غلیظ از دهانه بلند می‌شود، پهن می‌شود و فضای بالای کارگاه را
 * می‌گیرد (مه‌ی خاکستری روی سقف/قفسه). با خالی‌کردن پاتیل یا بطری‌کردن محو می‌شود.
 *
 * فقط CSS (بدون Canvas): چند توده‌ی blur شده با radial-gradient که از دهانه
 * بالا می‌روند و بزرگ می‌شوند + یک لایه‌ی مه از بالا. بالای پاتیل و زیر Overlay ها.
 */

import { useGameStore } from '../store/gameStore';
import { CLASSIC_MOUTH } from './classicCauldronGeometry';
import { rectStyle } from './Zone';
import './classic-props.css';

const PUFFS = [
  { dx: -60, delay: 0, dur: 6.2, size: 260, drift: -140 },
  { dx: 40, delay: 0.9, dur: 6.8, size: 300, drift: 120 },
  { dx: -20, delay: 1.9, dur: 5.9, size: 240, drift: -60 },
  { dx: 90, delay: 2.6, dur: 7.1, size: 320, drift: 190 },
  { dx: -110, delay: 3.4, dur: 6.4, size: 280, drift: -220 },
  { dx: 15, delay: 4.3, dur: 6.9, size: 340, drift: 40 },
  { dx: 65, delay: 5.1, dur: 6.1, size: 250, drift: 150 },
];

export function BurntSmoke() {
  const burnt = useGameStore((s) => s.brew.entries.some((e) => e.stage === 'overprocessed') && !s.brew.bottled);

  return (
    <div
      className={`burnt-smoke${burnt ? ' is-on' : ''}`}
      data-testid="burnt-smoke"
      data-on={burnt ? 'true' : undefined}
      aria-hidden
      style={rectStyle({ x: 0, y: 0, width: 1920, height: 1080 }, 60)}
    >
      <div className="burnt-smoke__haze" />
      {burnt
        ? PUFFS.map((p, i) => (
            <span
              key={i}
              className="burnt-smoke__puff"
              style={{
                left: CLASSIC_MOUTH.x + p.dx - p.size * 0.22,
                top: CLASSIC_MOUTH.y - p.size * 0.85,
                width: p.size * 0.45,
                height: p.size,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.dur}s`,
                ['--drift' as string]: `${p.drift}px`,
              }}
            />
          ))
        : null}
    </div>
  );
}
