/**
 * Gesture کوبیدن با هاون: فشار روی دسته‌هاون و حرکت دورانی/رفت‌وبرگشتی.
 * مسیر پیموده‌شده (در فضای صحنه) به «کار کوبش» تبدیل می‌شود.
 *
 * تنظیم (بخش ۱۵.۳ سند: نباید حرکت طولانی و خسته‌کننده باشد):
 * رسیدن به 'fine' معادل work=3.6 است ⇒ حدود ۱۲۰۰ پیکسل صحنه،
 * یعنی ۶ تا ۱۰ حرکت پرانرژی دور کاسه‌ی هاون.
 */

import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useStageSpace } from '../scene/Stage';

export const WORK_PER_SCENE_PX = 0.003;
/** هر چند پیکسل یک «ضربه» حس شود (صدا/لرزش) */
const STROKE_PX = 90;

export interface GrindGestureOptions {
  enabled: boolean;
  onWork: (work: number) => void;
  onStroke?: () => void;
  onActiveChange?: (active: boolean) => void;
}

export function useGrindGesture(options: GrindGestureOptions) {
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
      let sinceStroke = 0;

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
        const step = Math.hypot(point.x - last.x, point.y - last.y);
        last = point;
        if (step < 1.5) return;
        // حرکت‌های پرشی (مثلاً بعد از رهاشدن انگشت) شمرده نمی‌شوند
        const capped = Math.min(step, 120);
        optionsRef.current.onWork(capped * WORK_PER_SCENE_PX);
        sinceStroke += capped;
        if (sinceStroke >= STROKE_PX) {
          sinceStroke = 0;
          optionsRef.current.onStroke?.();
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
