/**
 * ریشه‌ی برنامه — مالک: Workstream B.
 *
 * قرارداد App:
 * - حلقه‌ی زمان: rAF که useGameStore.getState().tick(dt) را صدا می‌زند.
 * - <OverlayHost/>، <DiscoveryToast/> و <DebugMount/> باید همیشه mount باشند.
 * - صحنه در Stage با نسبت 16:9 مقیاس می‌شود (SCENE_ZONES در scene/artManifest).
 *
 * باز بودن هر Overlay ⇒ Pause / Safe State؛ خودِ store زمان را متوقف می‌کند و
 * صحنه فقط کمی تیره (Vignette) می‌شود تا حس «خروج از کارگاه» ایجاد نشود.
 */

import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { OverlayHost, DiscoveryToast } from './overlays';
import { DebugMount } from './debug';
import { Stage } from './scene/Stage';
import { WorkshopScene } from './scene/WorkshopScene';
import './scene/scene.css';

function useGameClock() {
  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.25);
      last = now;
      useGameStore.getState().tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}

export default function App() {
  useGameClock();
  const paused = useGameStore((s) => s.openOverlay !== null || s.result !== null);

  return (
    <div className="stage-root">
      <Stage paused={paused}>
        <WorkshopScene />
      </Stage>
      <OverlayHost />
      <DiscoveryToast />
      <DebugMount />
    </div>
  );
}
