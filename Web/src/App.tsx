/**
 * ریشه‌ی برنامه — مالک: Workstream B.
 *
 * قرارداد App:
 * - حلقه‌ی زمان: rAF که useGameStore.getState().tick(dt) را صدا می‌زند.
 * - <OverlayHost/>، <DiscoveryToast/> و <DebugMount/> باید همیشه mount باشند
 *   (در هر دو مسیر، کلاسیک و v2).
 * - صحنه در Stage با نسبت 16:9 مقیاس می‌شود (SCENE_ZONES در scene/artManifest).
 *
 * باز بودن هر Overlay ⇒ Pause / Safe State؛ خودِ store زمان را متوقف می‌کند و
 * صحنه فقط کمی تیره (Vignette) می‌شود تا حس «خروج از کارگاه» ایجاد نشود.
 *
 * روتینگ سبک بر پایه‌ی hash (بدون کتابخانه):
 * - ''  یا '#/classic'          ⇒ کارگاه کلاسیک (پیش‌فرض؛ e2e موجود روی همین است)
 * - '#/v2' یا '#/v2/flat'       ⇒ صحنه‌ی نسخه ۲ با سبک فلت
 * - '#/v2/pixel'                ⇒ صحنه‌ی نسخه ۲ با سبک پیکسل
 * - '#/v2/engraved'             ⇒ صحنه‌ی نسخه ۲ با سبک حکاکی
 */

import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { OverlayHost, DiscoveryToast } from './overlays';
import { DebugMount } from './debug';
import { Stage } from './scene/Stage';
import { WorkshopScene } from './scene/WorkshopScene';
import { WorkshopSceneV2 } from './scene/v2/WorkshopSceneV2';
import { DEFAULT_ART_STYLE } from './scene/v2/contracts';
import type { ArtStyle } from './scene/v2/contracts';
import './scene/scene.css';

type Route = { kind: 'classic' } | { kind: 'v2'; artStyle: ArtStyle };

function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
  if (path === 'v2') return { kind: 'v2', artStyle: DEFAULT_ART_STYLE };
  if (path === 'v2/flat') return { kind: 'v2', artStyle: 'flat' };
  if (path === 'v2/pixel') return { kind: 'v2', artStyle: 'pixel' };
  if (path === 'v2/engraved') return { kind: 'v2', artStyle: 'engraved' };
  return { kind: 'classic' };
}

function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(typeof window === 'undefined' ? '' : window.location.hash),
  );

  useEffect(() => {
    const sync = () => setRoute(parseRoute(window.location.hash));
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  return route;
}

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
  const route = useHashRoute();
  const paused = useGameStore((s) => s.openOverlay !== null || s.result !== null);

  return (
    <div className="stage-root">
      <Stage paused={paused}>
        {route.kind === 'v2' ? (
          <WorkshopSceneV2 artStyle={route.artStyle} />
        ) : (
          <WorkshopScene />
        )}
      </Stage>
      {route.kind === 'classic' ? (
        <a data-testid="v2-route-link" className="v2-route-link" href="#/v2">
          نسخه ۲
        </a>
      ) : null}
      <OverlayHost />
      <DiscoveryToast />
      <DebugMount />
    </div>
  );
}
