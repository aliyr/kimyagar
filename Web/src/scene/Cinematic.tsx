/**
 * کارگردان سینمایی کلاسیک — فقط state دوربین را می‌نویسد؛ خودِ زوم را Stage
 * اعمال می‌کند و نوارهای بالا/پایین هم بیرون از لایه‌ی زوم رندر می‌شوند.
 *
 * نماها:
 *   ورود مشتری  — نزدیک‌شدن به پیشخوان، سپس عقب‌نشینی آرام به نمای کارگاه
 *   ریختن       — نزدیک‌شدن به دهانه‌ی پاتیل و شیشه (tilt / stream)
 *   تحویل       — پن به سمت مشتری و شیشه‌ی لغزان روی پیشخوان
 *
 * prefers-reduced-motion ⇒ هیچ نمایی اعمال نمی‌شود.
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { CLASSIC_MOUTH } from './classicCauldronGeometry';
import { SCENE_ZONES } from './artManifest';
import { useRouteKind } from '../route';
import { useUiState } from './uiState';
import type { CameraShot } from './uiState';

const CUST = SCENE_ZONES.customer;
const COUNTER = SCENE_ZONES.customerCounter;

const ENTER: CameraShot = {
  x: CUST.x + CUST.width * 0.42,
  y: CUST.y + CUST.height * 0.55,
  zoom: 1.16,
  ms: 1000,
};
const POUR: CameraShot = {
  x: CLASSIC_MOUTH.x + 90,
  y: CLASSIC_MOUTH.y + 70,
  zoom: 1.22,
  ms: 480,
};
const DELIVER: CameraShot = {
  x: COUNTER.x + COUNTER.width * 0.28,
  y: COUNTER.y + 40,
  zoom: 1.14,
  ms: 680,
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function Cinematic() {
  const customerIndex = useGameStore((s) => s.customerIndex);
  const pour = useUiState((s) => s.pour);
  const sceneArtReady = useUiState((s) => s.sceneArtReady);
  const customerArtReady = useUiState((s) => s.customerArtReady);
  const setCamera = useUiState((s) => s.setCamera);
  const routeKind = useRouteKind();
  const prevPour = useRef(pour);

  // ورود فقط وقتی اسپرایت همین مشتری و لایه‌های کارگاه decode شده‌اند
  const enterReady = sceneArtReady && customerArtReady === customerIndex;

  useEffect(() => {
    if (routeKind === 'gate' || prefersReducedMotion() || !enterReady) return;
    setCamera(ENTER, true);
    const hold = window.setTimeout(() => {
      // اگر ریختن شروع شده، نمای ورود نباید دوربین را پس بکشد
      if (useUiState.getState().pour !== null) return;
      setCamera(null, false);
    }, 1700);
    return () => window.clearTimeout(hold);
  }, [customerIndex, enterReady, setCamera, routeKind]);

  // ریختن و تحویل — فقط وقتی فاز بطری واقعاً عوض شود، تا با ورود تداخل نکند
  useEffect(() => {
    const prev = prevPour.current;
    prevPour.current = pour;
    if (routeKind === 'gate' || prefersReducedMotion()) return;
    if (pour === 'tilt' || pour === 'stream') {
      setCamera(POUR, true);
      return;
    }
    if (pour === 'deliver') {
      setCamera(DELIVER, true);
      return;
    }
    if (prev !== null && pour === null) {
      setCamera(null, false);
    }
  }, [pour, setCamera, routeKind]);

  return null;
}
