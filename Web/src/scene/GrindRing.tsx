/**
 * حلقه‌ی برنجی زمان‌بندی کوبش — قوس دور دهانه‌ی هاون که با پیشرفت کار
 * (grindWork / سقف) پر می‌شود و سه شکاف در آستانه‌های درشت/نیم‌کوب/نرم دارد.
 *
 * بازخورد «کیفی» است: بازیکن با یک نگاه می‌فهمد الان اگر هاون را لمس کند
 * چه درجه‌ای می‌گیرد؛ عددی نشان داده نمی‌شود.
 */

import { GRIND_THRESHOLDS } from '../store/gameStore';
import { PROPS } from './layout';
import { rectStyle } from './Zone';
import './classic-stations.css';

const MAX_WORK = GRIND_THRESHOLDS[GRIND_THRESHOLDS.length - 1].work;

/** قوس از ۲۱۰ درجه تا ۳۳۰- درجه (باز رو به پایین)، در فضای SVG واحد */
const START_DEG = 150;
const SWEEP_DEG = 240;
const R = 46;
const CX = 50;
const CY = 50;

/** حلقه دور دهانه‌ی هاون (PROPS.mortarContents)، کمی بزرگ‌تر */
const RING_RECT = {
  x: PROPS.mortarContents.x - 26,
  y: PROPS.mortarContents.y - 92,
  width: PROPS.mortarContents.width + 52,
  height: PROPS.mortarContents.width + 52,
};

function polar(deg: number, r = R): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

/** مسیر قوس ساعت‌گرد از زاویه‌ی شروع به اندازه‌ی sweep درجه */
function arcPath(fromDeg: number, sweep: number): string {
  if (sweep <= 0) return '';
  const [x0, y0] = polar(fromDeg);
  const [x1, y1] = polar(fromDeg + sweep);
  const large = sweep > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function GrindRing({
  work,
  active,
  z,
}: {
  /** کار انباشته‌ی کوبش */
  work: number;
  /** کوبش در جریان است (حلقه می‌درخشد) */
  active: boolean;
  z: number;
}) {
  const progress = Math.min(1, Math.max(0, work / MAX_WORK));
  return (
    <svg
      data-testid="grind-ring"
      data-progress={progress.toFixed(2)}
      className={`cst-ring${active ? ' is-active' : ''}${progress >= 1 ? ' is-full' : ''}`}
      style={rectStyle(RING_RECT, z)}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path className="cst-ring__track" d={arcPath(START_DEG, SWEEP_DEG)} />
      <path className="cst-ring__fill" d={arcPath(START_DEG, SWEEP_DEG * progress)} />
      {GRIND_THRESHOLDS.map((t) => {
        const deg = START_DEG + (SWEEP_DEG * t.work) / MAX_WORK;
        const [x0, y0] = polar(deg, R - 5);
        const [x1, y1] = polar(deg, R + 5);
        return (
          <line
            key={t.state}
            className={`cst-ring__notch${work >= t.work ? ' is-passed' : ''}`}
            x1={x0}
            y1={y0}
            x2={x1}
            y2={y1}
          />
        );
      })}
      {progress > 0 && progress < 1 ? (
        <circle className="cst-ring__head" cx={polar(START_DEG + SWEEP_DEG * progress)[0]} cy={polar(START_DEG + SWEEP_DEG * progress)[1]} r={3.2} />
      ) : null}
    </svg>
  );
}
