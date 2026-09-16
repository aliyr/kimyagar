/**
 * پرواز ماده از شیشه تا دهانه‌ی هاون (فلو کلیکی کلاسیک).
 *
 * آیکون برداری ماده (کیت فلت) روی یک قوس سهمی از مرکز شیشه تا دهانه‌ی هاون
 * می‌رود (~۵۵۰ms، rAF)، کمی می‌چرخد و در انتها کوچک می‌شود. در لحظه‌ی فرود
 * `onLand` صدا زده می‌شود (افزودن به هاون + شروع کوبش خودکار) و سپس `onDone`
 * تا میزبان آن را از فهرست پروازها بردارد.
 */

import { useEffect, useRef } from 'react';
import { FlatIngredientIcon } from '../art/flat/react/FlatIngredientIcon';
import { centerOf, PROPS } from './layout';
import { vars } from './Zone';
import './classic-ambience.css';

export const FLIGHT_MS = 550;
const ICON = 96;
const TARGET = centerOf(PROPS.mortarContents);

export interface FlightSpec {
  key: number;
  ingredientId: string;
  color: string;
  from: { x: number; y: number };
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function IngredientFlight({
  flight,
  onLand,
  onDone,
}: {
  flight: FlightSpec;
  onLand: (flight: FlightSpec) => void;
  onDone: (key: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const cbs = useRef({ onLand, onDone });
  cbs.current = { onLand, onDone };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { from } = flight;
    const to = { x: TARGET.x, y: TARGET.y - 10 };
    const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 160 };
    const t0 = performance.now();
    let landed = false;
    let raf = 0;
    const frame = (now: number) => {
      const k = Math.min(1, (now - t0) / FLIGHT_MS);
      const e = easeInOut(k);
      const u = 1 - e;
      const x = u * u * from.x + 2 * u * e * control.x + e * e * to.x;
      const y = u * u * from.y + 2 * u * e * control.y + e * e * to.y;
      const scale = 1 - 0.45 * e;
      const rot = -30 + 60 * e;
      el.style.transform = `translate(${(x - ICON / 2).toFixed(1)}px, ${(y - ICON / 2).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      el.style.opacity = k > 0.9 ? ((1 - k) / 0.1).toFixed(3) : '1';
      if (k >= 1) {
        if (!landed) {
          landed = true;
          cbs.current.onLand(flight);
          cbs.current.onDone(flight.key);
        }
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [flight]);

  return (
    <div
      ref={ref}
      data-testid="ingredient-flight"
      className="shelf-flight"
      style={{ width: ICON, height: ICON, ...vars({ '--ing-color': flight.color }) }}
    >
      <FlatIngredientIcon ingredientId={flight.ingredientId} className="shelf-flight__icon" />
      <span className="shelf-flight__fallback" />
    </div>
  );
}
