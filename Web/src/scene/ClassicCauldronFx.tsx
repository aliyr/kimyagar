/**
 * افکت‌های داخل دهانه‌ی پاتیل کلاسیک — `FlatCookingScene` کیت Works روی Canvas،
 * بدون دیگ و اجاق برداری (drawPot/drawHearth=false)، منطبق بر دهانه‌ی PNG
 * (classicCauldronGeometry).
 *
 * پل store ⇒ صحنه (همان قرارداد v2/FlatCauldron به‌علاوه‌ی «حقیقت بازی»):
 * - ورودی تازه در brew.entries ⇒ اگر قاشق ریخته، بدون افتادن دوباره داخل دیگ می‌نشیند؛
 *   وگرنه scene.drop. بعد هم‌زدن خودکار.
 * - currentHeat ⇒ setHeatLevel؛ bottled ⇒ آتش خاموش.
 * - حالت پیشرفت بیرونی: هر ماده به نسبت exposure/آستانه‌ی «رسیده» فرو می‌رود
 *   (setIngredientProgress)؛ همه رسیده ⇒ شمسه (setDone)؛ سوخته ⇒ دود خاکستری
 *   و مایع تیره (setBurnt + liquidAdjust).
 * - مشتری/دور تازه ⇒ reset(seedForCustomer)؛ Pause ⇒ شبیه‌سازی می‌ایستد.
 *
 * هر فریم، squash & stretch کیت و کج‌شدن هنگام ریختن به‌صورت transform روی
 * بدنه‌ی PNG (bodyRef) و خودِ Canvas نوشته می‌شود تا هر دو با هم حرکت کنند
 * (لنگر: پایین بدنه، CLASSIC_POT_BASE).
 */

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useGameStore } from '../store/gameStore';
import { FLAT_SCENE_SIZE } from '../art/flat/kit/scene.ts';
import type { FlatCookingScene } from '../art/flat/kit/scene.ts';
import { flatIngredientById } from '../art/flat/kit/ingredients.ts';
import { useFlatCanvas } from '../art/flat/react/useFlatCanvas';
import { seedForCustomer } from '../art/flat/react/flatSeed';
import { flatHeatLevel } from '../art/flat/react/heatLevel';
import { burntLiquid } from './v2/flatCauldronGeometry';
import { CLASSIC_FX_RECT, CLASSIC_POT_BASE, settlePouredIngredient, sinkProgress } from './classicCauldronGeometry';
import { SCENE_ZONES } from './artManifest';
import { rectStyle } from './Zone';
import { useUiState } from './uiState';
import { sfx } from '../audio/sfx';
import '../art/flat/react/flat.css';

/** فاصله‌ی ریختن تا هم‌زدن خودکار (ms) — تا ماده فرود بیاید و پاشش تمام شود */
const AUTO_STIR_DELAY_MS = 900;
/** زاویه‌ی کج‌شدن به‌سمت شیشه هنگام ریختن (درجه؛ مثبت = لبه‌ی راست پایین) */
const POUR_TILT_DEG = 11;
/** نرخ نرم‌شدن کج‌شدن (۱/ثانیه) */
const TILT_EASE = 6;

const BODY_ORIGIN = `${CLASSIC_POT_BASE.x - SCENE_ZONES.cauldron.x}px ${CLASSIC_POT_BASE.y - SCENE_ZONES.cauldron.y}px`;
const FX_ORIGIN = `${CLASSIC_POT_BASE.x - CLASSIC_FX_RECT.x}px ${CLASSIC_POT_BASE.y - CLASSIC_FX_RECT.y}px`;

export function ClassicCauldronFx({
  scene,
  bodyRef,
}: {
  scene: FlatCookingScene;
  /** بدنه‌ی PNG که باید با squash/کج‌شدن Canvas هم‌حرکت شود */
  bodyRef: RefObject<HTMLElement | null>;
}) {
  const entries = useGameStore((s) => s.brew.entries);
  const heat = useGameStore((s) => s.brew.currentHeat);
  const bottled = useGameStore((s) => s.brew.bottled);
  const customerIndex = useGameStore((s) => s.customerIndex);
  const customerId = useGameStore((s) => s.currentCustomer().id);
  const ingredientById = useGameStore((s) => s.ingredientById);
  const readyThreshold = useGameStore((s) => s.defs.tuning.stageThresholds.ready);
  const pulse = useUiState((s) => s.pulse);
  const pour = useUiState((s) => s.pour);

  const overprocessed = entries.some((e) => e.stage === 'overprocessed');
  const allReady = entries.length > 0 && !overprocessed && entries.every((e) => e.stage === 'ready');

  const seed = seedForCustomer(customerId, customerIndex);
  const knownEntryIds = useRef<Set<string>>(new Set());
  const autoStirTimer = useRef<number | null>(null);
  const tiltRef = useRef(0);
  const tiltTargetRef = useRef(0);
  tiltTargetRef.current = pour === 'tilt' || pour === 'stream' ? POUR_TILT_DEG : 0;

  useEffect(() => {
    scene.setExternalProgress(true);
  }, [scene]);

  // مشتری/دور تازه ⇒ صحنه از نو با بذر همان مشتری
  useEffect(() => {
    scene.reset(seed);
    scene.setHeatLevel(flatHeatLevel(useGameStore.getState().brew.currentHeat));
    knownEntryIds.current = new Set();
  }, [scene, seed]);

  // حرارت بازی ⇒ سطح آتش (پس از بطری‌کردن آتش خاموش می‌شود)
  useEffect(() => {
    scene.setHeatLevel(bottled ? 0 : flatHeatLevel(heat));
  }, [scene, heat, bottled]);

  // سوخته ⇒ رنگ مایع + دود خاکستری و خاموشی شمسه؛ رسیده ⇒ شمسه
  useEffect(() => {
    scene.setLiquidAdjust(overprocessed ? burntLiquid : null);
    scene.setBurnt(overprocessed);
  }, [scene, overprocessed]);
  useEffect(() => {
    scene.setDone(allReady);
    if (allReady) sfx.sparkle();
  }, [scene, allReady]);

  // «حقیقت بازی»: هر ماده به نسبت استخراجش فرو می‌رود
  useEffect(() => {
    const perId = new Map<string, number>();
    for (const e of entries) {
      const p = sinkProgress(e.exposure, readyThreshold);
      const prev = perId.get(e.ingredientId);
      perId.set(e.ingredientId, prev === undefined ? p : Math.min(prev, p));
    }
    for (const [id, p] of perId) scene.setIngredientProgress(id, p);
  }, [scene, entries, readyThreshold]);

  // ورودی‌های تازه ⇒ ریختن + هم‌زدن خودکار؛ خالی‌شدن ⇒ ریست
  useEffect(() => {
    const known = knownEntryIds.current;
    if (entries.length === 0) {
      if (known.size > 0) {
        scene.reset(seed);
        scene.setHeatLevel(flatHeatLevel(useGameStore.getState().brew.currentHeat));
        known.clear();
      }
      return;
    }
    let dropped = 0;
    for (const entry of entries) {
      if (known.has(entry.id)) continue;
      known.add(entry.id);
      const def = ingredientById(entry.ingredientId);
      const kitIngredient = flatIngredientById(entry.ingredientId);
      if (!kitIngredient) continue;
      const baseBits = kitIngredient.bits;
      const spec = {
        tint: def?.color ?? kitIngredient.tint,
        strength: kitIngredient.strength * (0.8 + 0.2 * entry.quantity),
        bits: {
          count: Math.round(baseBits.count * (0.75 + 0.25 * entry.quantity)),
          colors: def ? [...baseBits.colors, def.color] : baseBits.colors,
        },
      };
      if (useUiState.getState().transfer === 'drop') settlePouredIngredient(scene, entry.ingredientId, spec);
      else scene.drop(entry.ingredientId, spec);
      dropped++;
    }
    if (dropped > 0) {
      if (autoStirTimer.current !== null) window.clearTimeout(autoStirTimer.current);
      autoStirTimer.current = window.setTimeout(() => {
        autoStirTimer.current = null;
        scene.stir();
        useGameStore.getState().stir();
        pulse('swirlPulse');
      }, AUTO_STIR_DELAY_MS + (dropped - 1) * 350);
    }
  }, [scene, entries, seed, ingredientById, pulse]);

  useEffect(
    () => () => {
      if (autoStirTimer.current !== null) window.clearTimeout(autoStirTimer.current);
    },
    [],
  );

  const lastFrameRef = useRef(0);

  const canvasRef = useFlatCanvas({
    designSize: FLAT_SCENE_SIZE,
    step: (dt) => scene.update(dt),
    render: () => {
      // کج‌شدن با زمان واقعی نرم می‌شود (هنگام ریختن بازی Pause است و step اجرا نمی‌شود)
      const now = performance.now();
      const dt = lastFrameRef.current ? Math.min(0.1, (now - lastFrameRef.current) / 1000) : 0;
      lastFrameRef.current = now;
      tiltRef.current += (tiltTargetRef.current - tiltRef.current) * Math.min(1, dt * TILT_EASE);
      // squash کیت + کج‌شدن ریختن، هم‌زمان روی بدنه‌ی PNG و Canvas
      const { x, y } = scene.squash;
      const tilt = tiltRef.current;
      const transform = `rotate(${tilt.toFixed(2)}deg) scale(${x.toFixed(4)}, ${y.toFixed(4)})`;
      const body = bodyRef.current;
      if (body) {
        body.style.transformOrigin = BODY_ORIGIN;
        body.style.transform = transform;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.transformOrigin = FX_ORIGIN;
        canvas.style.transform = transform;
        canvas.dataset.sparkles = String(scene.sparkleCount);
      }
      return scene.render();
    },
    // همیشه زنده: شمسه‌ها، بخار و قُل‌قُل فقط تصویری‌اند (پیشرفت واقعی از store می‌آید)؛
    // اگر با Pause بازی (Overlay/نتیجه) بایستند، جرقه‌ها «ثابت» روی صحنه می‌مانند.
    running: true,
  });

  return (
    <canvas
      ref={canvasRef}
      className="flat-canvas cst-cauldron-fx"
      data-testid="cauldron-fx-canvas"
      style={rectStyle(CLASSIC_FX_RECT, SCENE_ZONES.cauldron.z + 1)}
      aria-hidden="true"
    />
  );
}
