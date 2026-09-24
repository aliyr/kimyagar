/**
 * پرواز ماده از شیشه تا دهانه‌ی هاون (فلو کلیکی کلاسیک، v3).
 *
 * چند تکهٔ واقعی ماده (اسپرایت‌های `pieces/{kind}_{i}`) با اختلاف فاز روی یک قوس
 * سهمی از مرکز شیشه تا کف هاون می‌روند؛ هر تکه می‌چرخد، کمی کوچک می‌شود و در
 * انتها با پخش جانبی کوچک «فرود» می‌آید (~۳۴۰ms، rAF). در لحظه‌ی فرود `onLand`
 * صدا زده می‌شود (افزودن به هاون + شروع کوبش خودکار + پاف رنگی) و سپس `onDone`
 * تا میزبان آن را از فهرست پروازها بردارد.
 */

import { useEffect, useRef } from 'react';
import { FLOOR, pieceUrl, zoneToScene } from './mortarLayout';
import { kindForIngredient, spriteCount } from './mortarPile';
import { vars } from './Zone';
import './classic-ambience.css';

/** زمان پرواز هر تکه؛ تکه‌ها با فاصلهٔ کوتاه پشت‌سرهم می‌آیند */
export const FLIGHT_MS = 300;
const STAGGER_MS = 22;
const PIECE_PX = 40;
const TARGET = zoneToScene(FLOOR.cx, FLOOR.cy - 2.5);

export interface FlightSpec {
  key: number;
  ingredientId: string;
  color: string;
  from: { x: number; y: number };
}

type Piece = {
  el: HTMLSpanElement;
  delay: number;
  /** پخش جانبی در فرود (پیکسل صحنه) */
  dx: number;
  dy: number;
  rot0: number;
  spin: number;
  size: number;
};

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function rand(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

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
  const kind = kindForIngredient(flight.ingredientId);
  const count = 4 + Math.floor(rand(flight.key + 1) * 4); // ۴..۷

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const { from } = flight;
    const to = { x: TARGET.x, y: TARGET.y };
    const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 170 };
    const pieces: Piece[] = Array.from(root.querySelectorAll<HTMLSpanElement>('.shelf-flight__piece')).map(
      (el, i) => ({
        el,
        delay: i * STAGGER_MS,
        dx: (rand(flight.key * 7 + i) - 0.5) * 34,
        dy: (rand(flight.key * 11 + i) - 0.5) * 10,
        rot0: rand(flight.key * 13 + i) * 360,
        spin: (rand(flight.key * 17 + i) - 0.5) * 520,
        size: PIECE_PX * (0.75 + rand(flight.key * 19 + i) * 0.5),
      }),
    );
    const total = FLIGHT_MS + (pieces.length - 1) * STAGGER_MS;
    const t0 = performance.now();
    let landed = false;
    let raf = 0;
    const land = () => {
      if (landed) return;
      landed = true;
      try {
        cbs.current.onLand(flight);
      } finally {
        cbs.current.onDone(flight.key);
      }
    };
    const frame = (now: number) => {
      const elapsed = now - t0;
      for (const p of pieces) {
        const k = Math.min(1, Math.max(0, (elapsed - p.delay) / FLIGHT_MS));
        const e = easeInOut(k);
        const u = 1 - e;
        const x = u * u * from.x + 2 * u * e * control.x + e * e * (to.x + p.dx);
        const y = u * u * from.y + 2 * u * e * control.y + e * e * (to.y + p.dy);
        const scale = 1 - 0.4 * e;
        const rot = p.rot0 + p.spin * e;
        p.el.style.transform = `translate(${(x - p.size / 2).toFixed(1)}px, ${(y - p.size / 2).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
        p.el.style.opacity = k >= 1 ? '0' : k > 0.88 ? ((1 - k) / 0.12).toFixed(3) : '1';
      }
      if (elapsed >= total) {
        land();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // اگر rAF وسط راه قطع شود (مثلاً با زوم سینمایی)، فرود را از دست ندهیم
    const failsafe = window.setTimeout(land, total + 80);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight.key]);

  return (
    <div
      ref={ref}
      data-testid="ingredient-flight"
      className="shelf-flight"
      style={vars({ '--ing-color': flight.color })}
    >
      {Array.from({ length: count }, (_, i) => {
        const size = PIECE_PX * (0.75 + rand(flight.key * 19 + i) * 0.5);
        return (
          <span
            key={i}
            className="shelf-flight__piece"
            style={{
              width: size,
              height: size,
              opacity: 0,
              ...vars({
                '--sprite': `url("${pieceUrl(kind, Math.floor(rand(flight.key * 23 + i) * spriteCount(kind)))}")`,
              }),
            }}
          >
            <span className="shelf-flight__art" />
            <span className="shelf-flight__tint" />
          </span>
        );
      })}
    </div>
  );
}
