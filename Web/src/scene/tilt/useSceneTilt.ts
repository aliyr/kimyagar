/**
 * تیلت مشترک سردر و کارگاه: موس روی دسکتاپ، ژیروسکوپ روی گوشی.
 *
 * موتور:
 * - لایه‌ها با data-attribute پیدا می‌شوند: `[data-tilt-rig]` (چرخش سه‌بعدی) و
 *   `[data-tilt-depth="N"]` (جابه‌جایی N پیکسل صحنه در ±۱). هر فریم فقط همین چند
 *   `style.transform` نوشته می‌شود؛ هیچ CSS variable ارث‌بری‌شده‌ای عوض نمی‌شود، پس
 *   درخت صحنه style recalc نمی‌خورد.
 * - پلهٔ موتور (full/lite/flat/off) از platform/quality می‌آید و روی ریشه
 *   `data-tilt="<mode>"` و برای هر پلهٔ جز full `data-lite` می‌گذارد (نه کلاس:
 *   className ریشهٔ سردر را React با هر render بازنویسی می‌کند). وقتی تیلت موقتاً
 *   غیرفعال است (باز شدن در) همین attributeها می‌مانند تا ظاهر وسط کار عوض نشود.
 * - حلقهٔ rAF زمان فریم را به پروب کیفیت می‌دهد؛ اگر در flat هم کند ماند، تیلت
 *   برای این نشست خاموش می‌شود.
 * - با resize/چرخش صفحه لایه‌ها یک بار از GPU پایین و دوباره بالا می‌آیند تا
 *   raster-scale کهنه نماند.
 *
 * سنسور:
 * - اندروید/کروم اجازه نمی‌خواهد ⇒ شنونده همان اول وصل می‌شود، بدون لمس.
 * - آیفون `requestPermission` دارد و فقط از داخل یک لمس جواب می‌دهد.
 * - مبنا از میانگین چند نمونهٔ اول؛ نمونهٔ پرت رد می‌شود؛
 *   `deviceorientationabsolute` ترجیح دارد؛ برگهٔ پنهان سنسور را می‌خواباند.
 *
 * اگر `pointer` روشن باشد، وضعیت نرم‌شده برای toScene منتشر می‌شود — فقط کارگاه.
 */

import { useEffect } from 'react';
import type { RefObject } from 'react';
import { getQuality, reportFrameTime, subscribeQuality } from '../../platform/quality';
import { angleDelta, depthTransform, pointerTilt, rigTransform, screenTilt, tiltModeFor } from './tiltMath';
import type { TiltMode } from './tiltMath';
import { publishTiltMode, publishTiltPose } from './tiltPose';

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
/** پروب خاموشی در پلهٔ flat: میانگین این تعداد فریم بالای این آستانه ⇒ off */
const OFF_PROBE_SAMPLES = 90;
const OFF_PROBE_MS = 20;

/** خاموشی خودکار برای کل نشست می‌ماند تا با هر mount دوباره امتحان نشود */
let latchedOff = false;

export function useSceneTilt(
  rootRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  options?: { pointer?: boolean },
): void {
  const pointer = options?.pointer === true;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const rig = root.querySelector<HTMLElement>('[data-tilt-rig]');
    const depths = Array.from(root.querySelectorAll<HTMLElement>('[data-tilt-depth]')).map((el) => ({
      el,
      depth: Number(el.dataset.tiltDepth) || 0,
    }));

    let mode: TiltMode = 'off';

    const applyModeAttrs = () => {
      root.dataset.tilt = mode;
      root.toggleAttribute('data-lite', mode !== 'full');
      publishTiltMode(mode);
    };

    const clearTransforms = () => {
      if (rig) rig.style.transform = '';
      for (const d of depths) d.el.style.transform = '';
    };

    if (!enabled) {
      clearTransforms();
      if (pointer) publishTiltPose(0, 0, false);
      return;
    }

    const computeMode = (): TiltMode => {
      const q = getQuality();
      return tiltModeFor(q.tier, q.reducedMotion, latchedOff);
    };

    mode = computeMode();
    applyModeAttrs();

    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;
    let running = false;
    let disposed = false;
    let last = 0;
    let rate = RATE_POINTER;
    const offSamples: number[] = [];

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
      if (mode === 'off') return;
      const pose = { px: curX, py: curY };
      if (rig) rig.style.transform = rigTransform(pose, mode);
      for (const d of depths) d.el.style.transform = depthTransform(pose, d.depth, mode);
      if (pointer) publishTiltPose(curX, curY, true);
    };

    const step = (now: number) => {
      if (disposed) return;
      const frameMs = now - last;
      const dt = Math.min(frameMs / 1000, 0.1);
      last = now;
      reportFrameTime(frameMs);
      if (mode === 'flat') probeOff(frameMs);
      if (mode === 'off') {
        running = false;
        return;
      }
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
      if (running || disposed || mode === 'off') return;
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

    /** لایه‌ها را یک فریم از GPU پایین می‌آورد تا با مقیاس تازه دوباره raster شوند */
    let repromoteRaf = 0;
    const repromote = () => {
      const layers = [rig, ...depths.map((d) => d.el)].filter((el): el is HTMLElement => !!el);
      for (const el of layers) el.style.willChange = 'auto';
      cancelAnimationFrame(repromoteRaf);
      repromoteRaf = requestAnimationFrame(() => {
        for (const el of layers) el.style.willChange = '';
      });
    };

    const onOrientationChange = () => {
      resetBaseline();
      targetX = 0;
      targetY = 0;
      repromote();
      kick();
    };

    const attachSensors = () => {
      if (sensorsOn || disposed || mode === 'off') return;
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

    const onResize = () => repromote();

    const shutDown = () => {
      cancelAnimationFrame(raf);
      running = false;
      detachSensors();
      clearTransforms();
      if (pointer) publishTiltPose(0, 0, false);
    };

    /** پلهٔ تازه: کلاس‌ها و transformها همان لحظه به‌روز می‌شوند */
    const setMode = (next: TiltMode) => {
      if (next === mode) return;
      const wasOff = mode === 'off';
      mode = next;
      offSamples.length = 0;
      applyModeAttrs();
      if (mode === 'off') {
        shutDown();
        return;
      }
      if (wasOff && armed && !document.hidden) attachSensors();
      write();
    };

    function probeOff(frameMs: number) {
      if (!(frameMs > 0) || frameMs > 250) return;
      offSamples.push(frameMs);
      if (offSamples.length < OFF_PROBE_SAMPLES) return;
      let sum = 0;
      for (const s of offSamples) sum += s;
      const mean = sum / offSamples.length;
      offSamples.length = 0;
      if (mean > OFF_PROBE_MS) {
        latchedOff = true;
        setMode('off');
      }
    }

    const unsubQuality = subscribeQuality(() => setMode(computeMode()));

    write();
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    if (needsPermission) {
      window.addEventListener('pointerdown', onPointerDown, { passive: true });
    } else {
      arm();
    }

    return () => {
      disposed = true;
      unsubQuality();
      cancelAnimationFrame(repromoteRaf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      shutDown();
      for (const el of [rig, ...depths.map((d) => d.el)]) if (el) el.style.willChange = '';
      publishTiltMode('off');
    };
  }, [rootRef, enabled, pointer]);
}
