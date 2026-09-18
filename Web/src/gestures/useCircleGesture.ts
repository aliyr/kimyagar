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

/** جابه‌جایی کمتر از این مقدار (پیکسل صحنه) تا رهاکردن ⇒ Tap، نه هم‌زدن */
const TAP_SLOP = 14;

export interface CircleGestureOptions {
  enabled: boolean;
  onCircle: () => void;
  onActiveChange?: (active: boolean) => void;
  /** موقعیت اشاره‌گر در فضای صحنه، در هر حرکت (برای دنبال‌کردن قاشق) */
  onMove?: (point: { x: number; y: number }) => void;
  /**
   * Tap بدون حرکت (کمتر از TAP_SLOP) — مثلاً «ریختن در شیشه» روی پاتیل.
   * وقتی enabled=false هم صدا زده می‌شود تا Tap روی پاتیلِ خالی راهنما نشان دهد.
   */
  onTap?: () => void;
}

export function useCircleGesture(options: CircleGestureOptions) {
  const { capture } = useStageSpace();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button > 0) return;
      e.stopPropagation();
      if (!optionsRef.current.enabled) {
        if (optionsRef.current.onTap) {
          const el = e.currentTarget;
          const pointerId = e.pointerId;
          const onUp = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;
            el.removeEventListener('pointerup', onUp);
            optionsRef.current.onTap?.();
          };
          el.addEventListener('pointerup', onUp);
        }
        return;
      }

      const el = e.currentTarget;
      const pointerId = e.pointerId;
      const { toScene } = capture();
      const origin = toScene(e.clientX, e.clientY);
      let last = origin;
      let lastAngle: number | null = null;
      let turned = 0;
      let path = 0;
      let travelled = 0;
      let circled = false;

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
        travelled = Math.max(travelled, Math.hypot(point.x - origin.x, point.y - origin.y));
        optionsRef.current.onMove?.(point);
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
          circled = true;
          optionsRef.current.onCircle();
        }
      };

      const onEnd = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        detach();
        if (ev.type === 'pointerup' && !circled && travelled < TAP_SLOP) {
          optionsRef.current.onTap?.();
        }
      };

      el.setPointerCapture(pointerId);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onEnd);
      el.addEventListener('pointercancel', onEnd);
      optionsRef.current.onActiveChange?.(true);
      optionsRef.current.onMove?.(last);
    },
    [capture],
  );

  return { onPointerDown };
}
