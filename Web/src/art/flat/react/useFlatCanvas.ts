/**
 * حلقه‌ی رندر Canvas2D برای صحنه‌های برداری کیت فلت.
 *
 * - گام شبیه‌سازی ثابت (۱/۶۰ ثانیه، با accumulator) تا خروجی تعیین‌پذیر بماند.
 * - اندازه‌ی CSS بوم را زون صحنه تعیین می‌کند (واحد منطقی 1920×1080)؛ Stage
 *   کل صحنه را با `transform: scale` جا می‌دهد، پس backing store =
 *   اندازه‌ی واقعی روی صفحه × devicePixelRatio (از getBoundingClientRect).
 * - `running=false` شبیه‌سازی را نگه می‌دارد اما تصویر آخر را می‌کشد.
 */

import { useCallback, useEffect, useRef } from 'react';
import { drawShape } from '../kit/canvas2d.ts';
import type { Shape } from '../kit/shapes.ts';

const FIXED_DT = 1 / 60;
/** هر چند فریم یک‌بار اندازه‌ی واقعی بوم دوباره سنجیده شود (Stage با resize مقیاس می‌گیرد) */
const MEASURE_EVERY = 20;

export interface FlatCanvasOptions {
  /** اندازه‌ی مربع فضای طراحی صحنه (مثلاً FLAT_SCENE_SIZE = 512) */
  designSize: number;
  /** یک گام شبیه‌سازی */
  step: (dt: number) => void;
  /** درخت شکل فریم فعلی */
  render: () => Shape;
  /** اگر false، فقط رندر می‌شود و زمان جلو نمی‌رود */
  running: boolean;
  /** ضریب سرعت (پیش‌فرض ۱) */
  speed?: number;
}

export function useFlatCanvas(options: FlatCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    let raf = 0;
    let previous = performance.now();
    let accumulator = 0;
    let frame = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const opts = optionsRef.current;
      const elapsed = Math.min(0.25, (now - previous) / 1000) * (opts.speed ?? 1);
      previous = now;

      if (opts.running) {
        accumulator += elapsed;
        while (accumulator >= FIXED_DT) {
          opts.step(FIXED_DT);
          accumulator -= FIXED_DT;
        }
      } else {
        accumulator = 0;
      }

      if (++frame % MEASURE_EVERY === 0) measure();

      const size = Math.min(canvas.width, canvas.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawShape(ctx, opts.render(), {
        width: canvas.width,
        height: canvas.height,
        scale: size / opts.designSize,
        offsetX: (canvas.width - size) / 2,
        offsetY: (canvas.height - size) / 2,
      });
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [measure]);

  return canvasRef;
}
