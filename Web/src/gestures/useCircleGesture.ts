/**
 * Gesture دایره‌ای هم‌زدن.
 *
 * تشخیص با «مجموع زاویه‌ی چرخش مسیر» انجام می‌شود، نه با دور زدن یک نقطه‌ی
 * ثابت؛ به این ترتیب هرجای سطح پاتیل و با هر شعاعی کار می‌کند و نسبت به
 * مرکز دقیق حساس نیست (بخش ۶.۱۰: سرعت/جهت/شدت اثر مکانیکی ندارند).
 *
 * ضدنویز:
 * - گام‌های کوتاه‌تر از MIN_STEP نادیده گرفته می‌شوند؛
 * - چرخش‌های تندتر از MAX_TURN (برگشت ناگهانی، لرزش) شمرده نمی‌شوند تا
 *   حرکت رفت‌وبرگشتی خطی به‌اشتباه «دور» حساب نشود.
 */

import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useStageSpace } from '../scene/Stage';

const TWO_PI = Math.PI * 2;
/** آستانه‌ی بخشنده: حدود ۰٫۸ دور کافی است */
const TURN_THRESHOLD = TWO_PI * 0.8;
/** حداقل طول مسیر تا یک دور معتبر شود (پیکسل صحنه) */
const MIN_PATH = 220;
const MIN_STEP = 6;
const MAX_TURN = Math.PI * 0.55;

export interface CircleGestureOptions {
  enabled: boolean;
  onCircle: () => void;
  onActiveChange?: (active: boolean) => void;
}

export function useCircleGesture(options: CircleGestureOptions) {
  const { toScene } = useStageSpace();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button > 0) return;
      e.stopPropagation();
      if (!optionsRef.current.enabled) return;

      const el = e.currentTarget;
      const pointerId = e.pointerId;
      let last = toScene(e.clientX, e.clientY);
      let lastAngle: number | null = null;
      let turned = 0;
      let path = 0;

      const detach = () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onEnd);
        el.removeEventListener('pointercancel', onEnd);
        if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
        optionsRef.current.onActiveChange?.(false);
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const point = toScene(ev.clientX, ev.clientY);
        const dx = point.x - last.x;
        const dy = point.y - last.y;
        const step = Math.hypot(dx, dy);
        if (step < MIN_STEP) return;
        last = point;
        path += step;

        const angle = Math.atan2(dy, dx);
        if (lastAngle !== null) {
          let delta = angle - lastAngle;
          while (delta > Math.PI) delta -= TWO_PI;
          while (delta < -Math.PI) delta += TWO_PI;
          if (Math.abs(delta) <= MAX_TURN) turned += delta;
        }
        lastAngle = angle;

        if (Math.abs(turned) >= TURN_THRESHOLD && path >= MIN_PATH) {
          turned = 0;
          path = 0;
          optionsRef.current.onCircle();
        }
      };

      const onEnd = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        detach();
      };

      el.setPointerCapture(pointerId);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onEnd);
      el.addEventListener('pointercancel', onEnd);
      optionsRef.current.onActiveChange?.(true);
    },
    [toScene],
  );

  return { onPointerDown };
}
