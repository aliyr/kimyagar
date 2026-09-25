/**
 * تیلت مشترک سردر و کارگاه: موس روی دسکتاپ، ژیروسکوپ بعد از اولین لمس روی گوشی.
 *
 * `--px` و `--py` روی ریشه نوشته می‌شوند. حلقهٔ rAF تا رسیدن به هدف زنده است.
 * شنوندهٔ سنسور تا pointerdown وصل نمی‌شود (اندروید و آیفون وگرنه رویداد نمی‌دهند).
 * `deviceorientationabsolute` بر رویداد معمولی ترجیح دارد. برگهٔ پنهان سنسور را می‌خواباند.
 * اگر `pointer` روشن باشد، وضعیت نرم‌شده برای toScene منتشر می‌شود — فقط کارگاه.
 */

import { useEffect } from 'react';
import type { RefObject } from 'react';
import { pointerTilt, screenTilt } from './tiltMath';
import { publishTiltPose } from './tiltPose';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function orientationAngle(): number {
  const angle = window.screen?.orientation?.angle;
  return typeof angle === 'number' ? angle : 0;
}

type PermissionedOrientation = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

export function useSceneTilt(
  rootRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  options?: { pointer?: boolean },
): void {
  const pointer = options?.pointer === true;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled || prefersReducedMotion()) {
      if (pointer) publishTiltPose(0, 0, false);
      return;
    }

    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;
    let running = false;
    let disposed = false;
    let last = 0;
    let gyroLive = false;
    let sensorsOn = false;
    let armed = false;
    let preferAbsolute = false;
    let baseBeta: number | null = null;
    let baseGamma: number | null = null;

    const EPS = 0.0005;
    const RATE = 3.8;

    const write = () => {
      root.style.setProperty('--px', curX.toFixed(4));
      root.style.setProperty('--py', curY.toFixed(4));
      if (pointer) publishTiltPose(curX, curY, true);
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

    const kick = () => {
      if (running || disposed) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(step);
    };

    const resetBaseline = () => {
      baseBeta = null;
      baseGamma = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (gyroLive) return;
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const pose = pointerTilt(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
      targetX = pose.px;
      targetY = pose.py;
      kick();
    };

    const onOrient = (e: DeviceOrientationEvent, absolute: boolean) => {
      if (e.beta === null || e.gamma === null) return;
      if (absolute) preferAbsolute = true;
      else if (preferAbsolute) return;
      if (baseBeta === null || baseGamma === null) {
        baseBeta = e.beta;
        baseGamma = e.gamma;
      }
      const pose = screenTilt(e.beta, e.gamma, baseBeta, baseGamma, orientationAngle());
      targetX = pose.px;
      targetY = pose.py;
      gyroLive = true;
      kick();
    };

    const onRelative = (e: DeviceOrientationEvent) => onOrient(e, false);
    const onAbsolute = (e: DeviceOrientationEvent) => onOrient(e, true);

    const onOrientationChange = () => {
      resetBaseline();
    };

    const attachSensors = () => {
      if (sensorsOn || disposed) return;
      sensorsOn = true;
      resetBaseline();
      window.addEventListener('deviceorientation', onRelative, { passive: true });
      window.addEventListener('deviceorientationabsolute', onAbsolute, { passive: true });
      window.addEventListener('orientationchange', onOrientationChange);
    };

    const detachSensors = () => {
      if (!sensorsOn) return;
      sensorsOn = false;
      gyroLive = false;
      preferAbsolute = false;
      resetBaseline();
      window.removeEventListener('deviceorientation', onRelative);
      window.removeEventListener('deviceorientationabsolute', onAbsolute);
      window.removeEventListener('orientationchange', onOrientationChange);
    };

    const arm = () => {
      if (armed || disposed) return;
      armed = true;
      const ctor = DeviceOrientationEvent as PermissionedOrientation;
      if (typeof ctor.requestPermission === 'function') {
        void ctor.requestPermission().then(
          (result) => {
            if (result === 'granted' && !disposed && !document.hidden) attachSensors();
          },
          () => undefined,
        );
        return;
      }
      if (!document.hidden) attachSensors();
    };

    const onPointerDown = () => arm();

    const onVisibility = () => {
      if (document.hidden) {
        detachSensors();
        return;
      }
      if (armed) attachSensors();
    };

    write();
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('visibilitychange', onVisibility);
      detachSensors();
      root.style.removeProperty('--px');
      root.style.removeProperty('--py');
      if (pointer) publishTiltPose(0, 0, false);
    };
  }, [rootRef, enabled, pointer]);
}
