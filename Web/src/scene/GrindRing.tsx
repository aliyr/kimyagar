/**
 * حلقهٔ زمان‌بندی کوبش روی خودِ لبهٔ دهانه — نوار نور برنجی گرم که با پیشرفت
 * کار (grindWork / سقف) روی لبه پر می‌شود و سه نشانهٔ حکاکی در آستانه‌های
 * درشت/نیم‌کوب/نرم روشن می‌شوند. دیجتیک است: هیچ UI جدا از هاون ندارد.
 *
 * مسیر = بیضی دهانهٔ داخلی از mortarGeometry (viewBox به پیکسل Zone).
 * از چپِ لبه شروع می‌شود، از روی لبهٔ نزدیک (پایین) می‌گذرد و به راست می‌رسد.
 *
 * بازخورد «کیفی» است: بازیکن با یک نگاه می‌فهمد الان اگر هاون را لمس کند
 * چه درجه‌ای می‌گیرد؛ عددی نشان داده نمی‌شود.
 */

import { GRIND_THRESHOLDS } from '../store/gameStore';
import { SCENE_ZONES } from './artManifest';
import { MOUTH } from './mortarLayout';
import { rectStyle } from './Zone';
import './classic-stations.css';

const MAX_WORK = GRIND_THRESHOLDS[GRIND_THRESHOLDS.length - 1].work;
const ZONE = SCENE_ZONES.mortar;

/** بیضی دهانه در پیکسل Zone (کمی بیرون‌تر از لبهٔ داخلی تا روی نوار لبه بنشیند) */
const E = {
  cx: (MOUTH.cx / 100) * ZONE.width,
  cy: (MOUTH.cy / 100) * ZONE.height,
  rx: (MOUTH.rx / 100) * ZONE.width * 1.035,
  ry: (MOUTH.ry / 100) * ZONE.height * 1.05,
};

/** قوس از چپ (۱۸۰°) به‌سمت پایین (۹۰°) تا راست (۰°) — زاویه‌ها در فضای SVG (y پایین) */
const START_DEG = 186;
const SWEEP_DEG = -192;

function polar(deg: number, k = 1): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [E.cx + E.rx * k * Math.cos(a), E.cy + E.ry * k * Math.sin(a)];
}

/** مسیر قوس بیضی از زاویهٔ شروع به اندازهٔ sweep (منفی = پادساعتگرد در SVG) */
function arcPath(fromDeg: number, sweep: number): string {
  if (Math.abs(sweep) < 0.01) return '';
  const [x0, y0] = polar(fromDeg);
  const [x1, y1] = polar(fromDeg + sweep);
  const large = Math.abs(sweep) > 180 ? 1 : 0;
  const flag = sweep > 0 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${E.rx.toFixed(2)} ${E.ry.toFixed(2)} 0 ${large} ${flag} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function GrindRing({
  work,
  active,
  tappable = false,
  z,
}: {
  /** کار انباشته‌ی کوبش */
  work: number;
  /** کوبش در جریان است (حلقه می‌درخشد) */
  active: boolean;
  /** هاون منتظر لمس است ⇒ نبض ملایم نور روی لبه */
  tappable?: boolean;
  z: number;
}) {
  const progress = Math.min(1, Math.max(0, work / MAX_WORK));
  const headDeg = START_DEG + SWEEP_DEG * progress;
  const [hx, hy] = polar(headDeg);
  return (
    <svg
      data-testid="grind-ring"
      data-progress={progress.toFixed(2)}
      className={`cst-ring${active ? ' is-active' : ''}${progress >= 1 ? ' is-full' : ''}${
        tappable ? ' is-tappable' : ''
      }`}
      style={rectStyle(ZONE, z)}
      viewBox={`0 0 ${ZONE.width} ${ZONE.height}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cst-ring-brass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d9a641" />
          <stop offset="0.5" stopColor="#ffe9a8" />
          <stop offset="1" stopColor="#d9a641" />
        </linearGradient>
      </defs>
      <path className="cst-ring__track" d={arcPath(START_DEG, SWEEP_DEG)} />
      <path className="cst-ring__fill" d={arcPath(START_DEG, SWEEP_DEG * progress)} />
      {GRIND_THRESHOLDS.map((t) => {
        const deg = START_DEG + (SWEEP_DEG * t.work) / MAX_WORK;
        const [x0, y0] = polar(deg, 0.965);
        const [x1, y1] = polar(deg, 1.045);
        const passed = work >= t.work - 1e-4;
        return (
          <g key={t.state} className={`cst-ring__mark${passed ? ' is-passed' : ''}`}>
            <line className={`cst-ring__notch${passed ? ' is-passed' : ''}`} x1={x0} y1={y0} x2={x1} y2={y1} />
            <circle className="cst-ring__gem" cx={(x0 + x1) / 2} cy={(y0 + y1) / 2} r={passed ? 2.6 : 1.7} />
          </g>
        );
      })}
      {progress > 0 && progress < 1 ? <circle className="cst-ring__head" cx={hx} cy={hy} r={3} /> : null}
    </svg>
  );
}
