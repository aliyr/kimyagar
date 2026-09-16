/**
 * ریشه‌ی برنامه — مالک: Workstream B.
 *
 * قرارداد App:
 * - حلقه‌ی زمان: rAF که useGameStore.getState().tick(dt) را صدا می‌زند.
 * - <OverlayHost/>، <DiscoveryToast/>، <SettingsButton/> و <DebugMount/> باید همیشه
 *   mount باشند (در هر دو مسیر، کلاسیک و v2).
 * - صحنه در Stage با نسبت 16:9 مقیاس می‌شود (SCENE_ZONES در scene/artManifest).
 *
 * باز بودن هر Overlay ⇒ Pause / Safe State؛ خودِ store زمان را متوقف می‌کند و
 * صحنه فقط کمی تیره (Vignette) می‌شود تا حس «خروج از کارگاه» ایجاد نشود.
 *
 * روتینگ سبک بر پایه‌ی hash (بدون کتابخانه؛ منطق در route.ts):
 * - '' یا '#/'                  ⇒ کارگاه کلاسیک (روت اصلی)
 * - '#/classic'                 ⇒ کارگاه کلاسیک (نام صریح)
 * - '#/v2'                      ⇒ صحنه‌ی نسخه ۲ با سبک ذخیره‌شده (پیش‌فرض: فلت)
 * - '#/v2/flat|pixel|engraved'  ⇒ صحنه‌ی نسخه ۲ با آن سبک
 * سبک انتخاب‌شده در localStorage می‌ماند (scene/v2/artStyleStorage).
 */

import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { OverlayHost, DiscoveryToast } from './overlays';
import { DebugMount } from './debug';
import { SettingsButton } from './ui/SettingsButton';
import { Stage } from './scene/Stage';
import { WorkshopScene } from './scene/WorkshopScene';
import { WorkshopSceneV2 } from './scene/v2/WorkshopSceneV2';
import { DEFAULT_ART_STYLE, StyleContext } from './scene/v2/contracts';
import type { ArtStyle } from './scene/v2/contracts';
import { readStoredArtStyle, storeArtStyle } from './scene/v2/artStyleStorage';
import { RouteKindContext, hashNamesStyle, parseRoute } from './route';
import type { Route } from './route';
import './scene/scene.css';

function currentRoute(): Route {
  return parseRoute(typeof window === 'undefined' ? '' : window.location.hash, readStoredArtStyle());
}

function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const sync = () => setRoute(currentRoute());
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  // سبک صریحِ آدرس (#/v2/<style>) ذخیره می‌شود تا روت خالی همان را باز کند
  useEffect(() => {
    if (route.kind === 'v2' && hashNamesStyle(window.location.hash)) storeArtStyle(route.artStyle);
  }, [route]);

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

  // سبک در سطح App تا Overlayها (نتیجه، دفترچه) هم آن را ببینند
  const artStyle: ArtStyle = route.kind === 'v2' ? route.artStyle : DEFAULT_ART_STYLE;

  return (
    <StyleContext.Provider value={artStyle}>
      <RouteKindContext.Provider value={route.kind}>
        <div className="stage-root" data-route={route.kind}>
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
          <SettingsButton />
          <OverlayHost />
          <DiscoveryToast />
          <DebugMount />
        </div>
      </RouteKindContext.Provider>
    </StyleContext.Provider>
  );
}
