/**
 * Stage — صحنه‌ی 1920×1080 را با نسبت 16:9 در viewport جا می‌دهد
 * (Letterbox تیره + transform: scale از مرکز).
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

function fitScale(): number {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.innerWidth / SCENE_WIDTH, window.innerHeight / SCENE_HEIGHT);
}

export function Stage({ paused, children }: { paused: boolean; children: ReactNode }) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(fitScale);

  useEffect(() => {
    const update = () => setScale(fitScale());
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
        style={{ width: SCENE_WIDTH, height: SCENE_HEIGHT, transform: `scale(${scale})` }}
      >
        <StageContext.Provider value={space}>{children}</StageContext.Provider>
        <div className="scene-vignette" />
      </div>
    </div>
  );
}
