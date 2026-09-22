/**
 * پیش‌بار لایه‌های ثابت کارگاه کلاسیک قبل از اولین نمای سینمایی.
 * بدون این، زوم ورود روی placeholder میز/قفسه/دیگ می‌افتد و بعد تصویر می‌پرد.
 */

import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { CLASSIC_ART, SCENE_ZONES } from './artManifest';
import { preloadArt } from './preloadArt';
import { useUiState } from './uiState';

const APPEARANCES = SCENE_ZONES.customer.states as Record<string, string | undefined>;

const WORKSHOP_LAYERS = [
  SCENE_ZONES.background.img,
  SCENE_ZONES.workTable.img,
  SCENE_ZONES.wallShelf.img,
  SCENE_ZONES.cauldron.img,
  SCENE_ZONES.mortar.img,
  CLASSIC_ART.mortar.back,
  CLASSIC_ART.mortar.front,
  ...CLASSIC_ART.mortar.pestleFrames,
  SCENE_ZONES.bottleShelf.img,
  SCENE_ZONES.customerCounter.img,
  SCENE_ZONES.goalNote.img,
  CLASSIC_ART.bucket,
];

const READY_FALLBACK_MS = 2800;

function afterPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function ScenePreload() {
  const setSceneArtReady = useUiState((s) => s.setSceneArtReady);

  useEffect(() => {
    const store = useGameStore.getState();
    const first = store.currentCustomer().appearance;
    const jars = store.defs.ingredients.map((ing) => `cabinet/jar_${ing.id}.png`);
    let cancelled = false;
    void preloadArt([
      ...WORKSHOP_LAYERS,
      ...jars,
      APPEARANCES[first],
      CLASSIC_ART.customerEmotion(first, 'happy'),
      CLASSIC_ART.customerEmotion(first, 'sad'),
    ])
      .then(() => afterPaint())
      .then(() => {
        if (!cancelled) setSceneArtReady(true);
      });
    const fallback = window.setTimeout(() => {
      if (!cancelled) setSceneArtReady(true);
    }, READY_FALLBACK_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, [setSceneArtReady]);

  return null;
}
