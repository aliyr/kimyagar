/**
 * تیلت مشترک سردر و کارگاه: موس روی دسکتاپ، ژیروسکوپ روی گوشی.
 *
 * `--px` و `--py` روی ریشه نوشته می‌شوند. حلقهٔ rAF تا رسیدن به هدف زنده است.
 *
 * سنسور:
 * - اندروید/کروم اجازه نمی‌خواهد ⇒ شنونده همان اول وصل می‌شود، بدون لمس.
 * - آیفون `requestPermission` دارد و فقط از داخل یک لمس جواب می‌دهد ⇒ آن‌جا تا
 *   اولین pointerdown صبر می‌کنیم.
 * - مبنا (وضعیت «صاف» گوشی) از میانگین چند نمونهٔ اول می‌آید، نه اولین نمونه، تا
 *   اولین فریم‌های ناپایدار سنسور صفحه را نپرانند.
 * - نمونه‌ای که از نمونهٔ قبلی بیش از حد دور است پرت حساب می‌شود و رد می‌شود.
 * - `deviceorientationabsolute` روی اندروید دقیق‌تر است و ترجیح دارد.
 * - نرم‌شدن با سنسور آرام‌تر از موس است؛ برگهٔ پنهان سنسور را می‌خواباند.
 *
 * اگر `pointer` روشن باشد، وضعیت نرم‌شده برای toScene منتشر می‌شود — فقط کارگاه.
 */

import { useEffect } from 'react';
import type { RefObject } from 'react';
import { angleDelta, pointerTilt, screenTilt } from './tiltMath';
import { publishTiltPose } from './tiltPose';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function orientationAngle(): number {
  const angle = window.screen?.orientation?.angle;
  if (typeof angle === 'number') return angle;
  const legacy = (window as Window & { orientation?: number }).orientation;
  return typeof legacy === 'number' ? legacy : 0;
}

type PermissionedOrientation = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

/** چند نمونهٔ اول برای مبنا میانگین می‌شوند */
const BASELINE_SAMPLES = 6;
/** جهش بزرگ‌تر از این (درجه) بین دو نمونهٔ پشت‌سرهم، پرت است */
const MAX_JUMP_DEG = 25;
/** نرم‌شدن: موس تندتر، سنسور آرام‌تر (لرزش دست را می‌خورد) */
const RATE_POINTER = 3.8;
const RATE_GYRO = 2.6;

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
    let rate = RATE_POINTER;

    let gyroLive = false;
    let sensorsOn = false;
    let armed = false;
    let preferAbsolute = false;

    let baseBeta: number | null = null;
    let baseGamma: number | null = null;
    let sumBeta = 0;
    let sumGamma = 0;
    let baseCount = 0;
    let lastBeta: number | null = null;
    let lastGamma: number | null = null;

    const EPS = 0.0005;

    const write = () => {
      root.style.setProperty('--px', curX.toFixed(4));
      root.style.setProperty('--py', curY.toFixed(4));
      if (pointer) publishTiltPose(curX, curY, true);
    };

    const step = (now: number) => {
      if (disposed) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const k = 1 - Math.exp(-dt * rate);
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
      sumBeta = 0;
      sumGamma = 0;
      baseCount = 0;
      lastBeta = null;
      lastGamma = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (gyroLive) return;
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const pose = pointerTilt(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
      rate = RATE_POINTER;
      targetX = pose.px;
      targetY = pose.py;
      kick();
    };

    const onOrient = (e: DeviceOrientationEvent, absolute: boolean) => {
      const beta = e.beta;
      const gamma = e.gamma;
      if (beta === null || gamma === null || !Number.isFinite(beta) || !Number.isFinite(gamma)) return;
      if (absolute) {
        if (!preferAbsolute) {
          preferAbsolute = true;
          resetBaseline();
        }
      } else if (preferAbsolute) {
        return;
      }

      // نمونهٔ پرت: جهش ناگهانی نسبت به نمونهٔ قبل
      if (lastBeta !== null && lastGamma !== null) {
        const jb = Math.abs(angleDelta(beta, lastBeta, 360));
        const jg = Math.abs(angleDelta(gamma, lastGamma, 180));
        if (jb > MAX_JUMP_DEG || jg > MAX_JUMP_DEG) {
          lastBeta = beta;
          lastGamma = gamma;
          return;
        }
      }
      lastBeta = beta;
      lastGamma = gamma;

      // مبنا هنوز آماده نیست: جمع می‌کنیم، صفحه صاف می‌ماند
      if (baseBeta === null || baseGamma === null) {
        sumBeta += beta;
        sumGamma += gamma;
        baseCount++;
        if (baseCount < BASELINE_SAMPLES) return;
        baseBeta = sumBeta / baseCount;
        baseGamma = sumGamma / baseCount;
      }

      const pose = screenTilt(beta, gamma, baseBeta, baseGamma, orientationAngle());
      rate = RATE_GYRO;
      targetX = pose.px;
      targetY = pose.py;
      gyroLive = true;
      kick();
    };

    const onRelative = (e: DeviceOrientationEvent) => onOrient(e, false);
    const onAbsolute = (e: DeviceOrientationEvent) => onOrient(e, true);

    const onOrientationChange = () => {
      resetBaseline();
      targetX = 0;
      targetY = 0;
      kick();
    };

    const attachSensors = () => {
      if (sensorsOn || disposed) return;
      sensorsOn = true;
      resetBaseline();
      window.addEventListener('deviceorientation', onRelative, { passive: true });
      window.addEventListener('deviceorientationabsolute', onAbsolute, { passive: true });
      window.addEventListener('orientationchange', onOrientationChange);
      window.screen?.orientation?.addEventListener?.('change', onOrientationChange);
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
      window.screen?.orientation?.removeEventListener?.('change', onOrientationChange);
    };

    const ctor = typeof DeviceOrientationEvent === 'undefined' ? null : (DeviceOrientationEvent as PermissionedOrientation);
    const needsPermission = !!ctor && typeof ctor.requestPermission === 'function';

    /** آیفون: اجازه فقط از داخل یک لمس داده می‌شود */
    const arm = () => {
      if (armed || disposed || !ctor) return;
      armed = true;
      if (needsPermission) {
        void ctor.requestPermission!().then(
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
    document.addEventListener('visibilitychange', onVisibility);
    if (needsPermission) {
      window.addEventListener('pointerdown', onPointerDown, { passive: true });
    } else {
      arm();
    }

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
