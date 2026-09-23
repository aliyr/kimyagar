/**
 * پارالاکس سه‌لایه‌ی سردر: موس روی دسکتاپ، ژیروسکوپ (deviceorientation) روی گوشی.
 *
 * خروجی دو متغیر CSS `--px` و `--py` در بازه‌ی −۱..۱ روی ریشه است؛ هر لایه با
 * ضریب خودش (آسمان ۰٫۳، نما ۰٫۶، پیش‌زمینه ۱) translate می‌گیرد. حرکت با lerp
 * زمان‌محور نرم می‌شود؛ حلقه‌ی rAF فقط تا رسیدن به هدف زنده است (بی‌کار نمی‌چرخد)
 * و با prefers-reduced-motion خاموش است.
 */

import { useEffect } from 'react';
import type { RefObject } from 'react';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useParallax(rootRef: RefObject<HTMLElement | null>, enabled: boolean): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled || prefersReducedMotion()) return;

    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;
    let running = false;
    let disposed = false;
    let last = 0;

    /** زیر این فاصله «رسیده» حساب می‌شود و حلقه می‌خوابد (بدون rAF بی‌کار) */
    const EPS = 0.0005;
    /** ثابت زمانی نرم‌شدن (بر ثانیه) — مستقل از نرخ فریم */
    const RATE = 3.8;

    const write = () => {
      root.style.setProperty('--px', curX.toFixed(4));
      root.style.setProperty('--py', curY.toFixed(4));
    };

    const step = (now: number) => {
      if (disposed) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const k = 1 - Math.exp(-dt * RATE);
      curX += (targetX - curX) * k;
      curY += (targetY - curY) * k;
      if (Math.abs(targetX - curX) < EPS && Math.abs(targetY - curY) < EPS) {
        curX = targetX;
        curY = targetY;
        write();
        running = false;
        return;
      }
      write();
      raf = requestAnimationFrame(step);
    };

    /** با هر ورودی تازه حلقه بیدار می‌شود؛ وقتی رسید، خودش می‌خوابد */
    const kick = () => {
      if (running || disposed) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(step);
    };

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      targetX = Math.max(-1, Math.min(1, (e.clientX / w) * 2 - 1));
      targetY = Math.max(-1, Math.min(1, (e.clientY / h) * 2 - 1));
      kick();
    };
    // شیب گوشی در حالت افقی: gamma (جلو/عقب) ⇒ y، beta (چپ/راست) ⇒ x
    let baseBeta: number | null = null;
    let baseGamma: number | null = null;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      if (baseBeta === null || baseGamma === null) {
        baseBeta = e.beta;
        baseGamma = e.gamma;
      }
      const landscape = window.innerWidth > window.innerHeight;
      const dx = landscape ? e.beta - baseBeta : e.gamma - baseGamma;
      const dy = landscape ? e.gamma - baseGamma : e.beta - baseBeta;
      targetX = Math.max(-1, Math.min(1, dx / 18));
      targetY = Math.max(-1, Math.min(1, dy / 18));
      kick();
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('deviceorientation', onOrient, { passive: true });
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onOrient);
      root.style.removeProperty('--px');
      root.style.removeProperty('--py');
    };
  }, [rootRef, enabled]);
}
