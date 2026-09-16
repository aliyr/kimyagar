/**
 * انتقال محتوای هاون به پاتیل با قاشق سر بزیِ کلاسیک (classicSpoon؛ DOM/SVG، rAF).
 *
 * سه فاز که در uiState.transfer هم ثبت می‌شوند تا هاون/کوبه/پاتیل هم‌زمان
 * واکنش نشان دهند:
 *   scoop  (۰   – ۰٫۴۵ث): قاشق از بالا وارد کاسه‌ی هاون می‌شود؛ توده‌ی رنگ ماده
 *                        در کاسه‌ی قاشق ظاهر می‌شود (onScoop).
 *   carry  (۰٫۴۵– ۱٫۱۵ث): روی قوسی تا دهانه‌ی پاتیل می‌رود.
 *   drop   (۱٫۱۵– ۱٫۶۵ث): کج می‌شود؛ در لحظه‌ی ریختن onDrop (addMortarToCauldron
 *                        + شلپ) و توده محو می‌شود؛ سپس قاشق بالا می‌رود و محو
 *                        می‌شود (onDone). از اینجا قاشق Canvas کیت با scene.stir
 *                        ادامه می‌دهد.
 */

import { useEffect, useMemo, useRef } from 'react';
import { SPOON_GEOMETRY, SPOON_SIZE } from '../art/flat/kit/props.ts';
import { FlatSvg } from '../art/flat/react/FlatSvg';
import { classicSpoonShape } from './classicSpoon';
import { centerOf, PROPS } from './layout';
import { CLASSIC_MOUTH } from './classicCauldronGeometry';
import type { TransferPhase } from './uiState';
import './classic-stations.css';

/** اندازه‌ی جعبه‌ی SVG قاشق روی صحنه (پیکسل) */
const SPOON_BOX = 250;
/** مرکز کاسه‌ی قاشق نسبت به جعبه (کسر) */
const BOWL_FX = SPOON_GEOMETRY.bowl.cx / SPOON_SIZE;
const BOWL_FY = SPOON_GEOMETRY.bowl.cy / SPOON_SIZE;

const T_SCOOP = 0.45;
const T_CARRY = 0.7;
const T_DROP = 0.5;
const T_EXIT = 0.35;
const TOTAL = T_SCOOP + T_CARRY + T_DROP + T_EXIT;
/** لحظه‌ی ریختن داخل فاز drop (کسر) */
const DROP_AT = 0.42;

const MORTAR_MOUTH = centerOf(PROPS.mortarContents);
const START = { x: MORTAR_MOUTH.x, y: MORTAR_MOUTH.y - 6 };
const END = { x: CLASSIC_MOUTH.x - CLASSIC_MOUTH.rx * 0.35, y: CLASSIC_MOUTH.y - 24 };
/** نقطه‌ی کنترل قوس حمل: بالای مسیر */
const CONTROL = { x: (START.x + END.x) / 2, y: Math.min(START.y, END.y) - 230 };

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function bezier(t: number) {
  const u = 1 - t;
  return {
    x: u * u * START.x + 2 * u * t * CONTROL.x + t * t * END.x,
    y: u * u * START.y + 2 * u * t * CONTROL.y + t * t * END.y,
  };
}

export function SpoonTransfer({
  color,
  onPhase,
  onScoop,
  onDrop,
  onDone,
}: {
  color: string;
  onPhase: (phase: TransferPhase) => void;
  onScoop: () => void;
  onDrop: () => void;
  onDone: () => void;
}) {
  const shape = useMemo(() => classicSpoonShape(), []);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const blobRef = useRef<HTMLSpanElement | null>(null);
  const callbacks = useRef({ onPhase, onScoop, onDrop, onDone });
  callbacks.current = { onPhase, onScoop, onDrop, onDone };

  useEffect(() => {
    const root = rootRef.current;
    const blob = blobRef.current;
    if (!root || !blob) return;
    let raf = 0;
    const t0 = performance.now();
    let phase: TransferPhase = 'scoop';
    let scooped = false;
    let dropped = false;
    let finished = false;
    callbacks.current.onPhase('scoop');

    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      let x = START.x;
      let y = START.y;
      let rot = 0;
      let opacity = 1;
      let blobScale = 0;

      if (t < T_SCOOP) {
        // ورود از بالا به کاسه‌ی هاون
        const k = easeOut(t / T_SCOOP);
        y = START.y - 220 * (1 - k);
        rot = -12 * (1 - k);
        if (t > T_SCOOP * 0.7) {
          blobScale = clamp01((t - T_SCOOP * 0.7) / (T_SCOOP * 0.3));
          if (!scooped) {
            scooped = true;
            callbacks.current.onScoop();
          }
        }
      } else if (t < T_SCOOP + T_CARRY) {
        if (phase !== 'carry') {
          phase = 'carry';
          callbacks.current.onPhase('carry');
        }
        const k = easeInOut((t - T_SCOOP) / T_CARRY);
        const p = bezier(k);
        x = p.x;
        y = p.y;
        // کمی به جهت حرکت خم می‌شود
        rot = 8 * Math.sin(k * Math.PI);
        blobScale = 1;
      } else if (t < T_SCOOP + T_CARRY + T_DROP) {
        if (phase !== 'drop') {
          phase = 'drop';
          callbacks.current.onPhase('drop');
        }
        const k = (t - T_SCOOP - T_CARRY) / T_DROP;
        x = END.x + 10 * easeOut(k);
        y = END.y;
        rot = 75 * easeInOut(clamp01(k / 0.6));
        if (k >= DROP_AT && !dropped) {
          dropped = true;
          callbacks.current.onDrop();
        }
        blobScale = dropped ? Math.max(0, 1 - (k - DROP_AT) / 0.25) : 1;
      } else if (t < TOTAL) {
        const k = easeIn((t - T_SCOOP - T_CARRY - T_DROP) / T_EXIT);
        x = END.x + 10;
        y = END.y - 160 * k;
        rot = 75 - 60 * k;
        opacity = 1 - k;
        blobScale = 0;
      } else if (!finished) {
        finished = true;
        callbacks.current.onDone();
        return;
      }

      root.style.transform = `translate(${(x - SPOON_BOX * BOWL_FX).toFixed(1)}px, ${(y - SPOON_BOX * BOWL_FY).toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
      root.style.opacity = opacity.toFixed(3);
      blob.style.transform = `translate(-50%, -50%) scale(${blobScale.toFixed(3)})`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={rootRef}
      data-testid="spoon-transfer"
      className="cst-spoon-transfer"
      style={{
        width: SPOON_BOX,
        height: SPOON_BOX,
        transformOrigin: `${BOWL_FX * 100}% ${BOWL_FY * 100}%`,
        opacity: 0,
      }}
    >
      <FlatSvg shape={shape} designSize={SPOON_SIZE} className="cst-spoon-transfer__svg" />
      <span
        ref={blobRef}
        className="cst-spoon-transfer__blob"
        style={{
          left: `${BOWL_FX * 100}%`,
          top: `${BOWL_FY * 100 - 3}%`,
          background: color,
          transform: 'translate(-50%, -50%) scale(0)',
        }}
      />
    </div>
  );
}
