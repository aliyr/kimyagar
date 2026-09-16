/**
 * Stage — صحنه‌ی 1920×1080 را با نسبت 16:9 در viewport جا می‌دهد
 * (Letterbox تیره + position: absolute با آفست صحیح + transform: scale از گوشه‌ی بالا-چپ).
 *
 * همچنین «فضای صحنه» را در اختیار Gesture ها می‌گذارد تا مختصات اشاره‌گر
 * به مختصات منطقی صحنه تبدیل شود.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { SCENE_HEIGHT, SCENE_WIDTH } from './artManifest';

export interface StageSpace {
  /** مختصات اشاره‌گر (client) → مختصات منطقی صحنه */
  toScene: (clientX: number, clientY: number) => { x: number; y: number };
  /** ضریب مقیاس فعلی صحنه */
  scale: () => number;
}

const identitySpace: StageSpace = {
  toScene: (x, y) => ({ x, y }),
  scale: () => 1,
};

const StageContext = createContext<StageSpace>(identitySpace);

export function useStageSpace(): StageSpace {
  return useContext(StageContext);
}

interface Fit {
  scale: number;
  left: number;
  top: number;
}

/**
 * جای‌گذاری صحنه با ابعاد و آفست «صحیح» (عدد صحیح پیکسل دستگاه).
 *
 * مرکزکردن با flex + scale کسری، صحنه را روی آفست‌های نیم‌پیکسلی می‌نشاند؛ هر بار
 * که لایه‌ای composite می‌شود (شروع انیمیشن، will-change) Chrome صحنه را با گردکردن
 * متفاوتی raster می‌کند و کل صفحه/قفسه چند پیکسل «می‌پرد». این‌جا پهنای مقیاس‌شده
 * مضرب ۱۶ (⇒ ارتفاع صحیح با نسبت ۱۶:۹) و آفست‌ها گرد می‌شوند؛ transform-origin 0 0.
 */
function fitStage(): Fit {
  if (typeof window === 'undefined') return { scale: 1, left: 0, top: 0 };
  const dpr = window.devicePixelRatio || 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const raw = Math.min(vw / SCENE_WIDTH, vh / SCENE_HEIGHT);
  // پهنای CSS مقیاس‌شده: مضرب ۱۶ (⇒ ارتفاع = پهنا×۹/۱۶ صحیح) و در پیکسل دستگاه صحیح
  const width = Math.floor((Math.floor((SCENE_WIDTH * raw) / 16) * 16 * dpr)) / dpr;
  const scale = width / SCENE_WIDTH;
  const height = SCENE_HEIGHT * scale;
  const left = Math.floor(((vw - width) / 2) * dpr) / dpr;
  const top = Math.floor(((vh - height) / 2) * dpr) / dpr;
  return { scale, left, top };
}

export function Stage({ paused, children }: { paused: boolean; children: ReactNode }) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState<Fit>(fitStage);

  useEffect(() => {
    const update = () => setFit(fitStage());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const measure = useCallback(() => {
    const el = sceneRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const s = rect.width / SCENE_WIDTH;
    return { rect, s: s > 0 ? s : 1 };
  }, []);

  const space = useMemo<StageSpace>(
    () => ({
      toScene: (clientX, clientY) => {
        const m = measure();
        if (!m) return { x: clientX, y: clientY };
        return { x: (clientX - m.rect.left) / m.s, y: (clientY - m.rect.top) / m.s };
      },
      scale: () => measure()?.s ?? 1,
    }),
    [measure],
  );

  return (
    <div className="stage-letterbox">
      <div
        ref={sceneRef}
        data-testid="stage"
        className={`scene${paused ? ' is-paused' : ''}`}
        style={{
          width: SCENE_WIDTH,
          height: SCENE_HEIGHT,
          left: fit.left,
          top: fit.top,
          transform: `scale(${fit.scale})`,
        }}
      >
        <StageContext.Provider value={space}>{children}</StageContext.Provider>
        <div className="scene-vignette" />
      </div>
    </div>
  );
}
