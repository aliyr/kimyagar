/**
 * پاتیل سبک فلت — صحنه‌ی پخت برداریِ زنده (FlatCookingScene از Kimiagar.Works)
 * روی Canvas، وصل به gameStore.
 *
 * پل store → صحنه:
 * - ورودی تازه در brew.entries ⇒ scene.drop(id, { tint: رنگ ماده در بازی })
 *   و پس از فرود، یک هم‌زدن خودکار (scene.stir + store.stir) — کاربر فقط
 *   مواد را می‌ریزد؛ ژست دایره‌ای دستی هم می‌ماند و قاشق دنبال اشاره‌گر می‌رود.
 * - currentHeat ⇒ scene.setHeatLevel (ملایم فقط گرم می‌کند، متوسط/تند می‌جوشاند).
 * - overprocessed ⇒ مایع تیره/کم‌اشباع (liquidAdjust)؛ bottled ⇒ آتش خاموش.
 * - مشتری تازه / ریست ⇒ scene.reset(seedForCustomer) تا هر سفارش انیمیشن
 *   یکتا ولی تکرارپذیر داشته باشد.
 * - Pause (اورلی/نتیجه) ⇒ شبیه‌سازی می‌ایستد، تصویر آخر می‌ماند.
 *
 * هیت‌باکس Drop و هم‌زدن همان V2_ZONES.cauldron است (data-testid="v2-cauldron").
 */

import { useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { uiLabels } from '../../data/labels';
import { useCircleGesture } from '../../gestures';
import { rectStyle, zoneStyle } from '../Zone';
import { useUiState } from '../uiState';
import { V2_ZONES } from './contracts';
import { FLAT_SCENE_SIZE, FlatCookingScene } from '../../art/flat/kit/scene.ts';
import { flatIngredientById } from '../../art/flat/kit/ingredients.ts';
import { useFlatCanvas } from '../../art/flat/react/useFlatCanvas';
import { seedForCustomer } from '../../art/flat/react/flatSeed';
import { flatHeatLevel } from '../../art/flat/react/heatLevel';
import { FLAT_SCENE_ZONE, burntLiquid, spoonAngleFor } from './flatCauldronGeometry';
import '../../art/flat/react/flat.css';

/** فاصله‌ی ریختن تا هم‌زدن خودکار (ms) — تا ماده فرود بیاید و پاشش تمام شود */
const AUTO_STIR_DELAY_MS = 900;

/** راهنمای هم‌زدن، بالای لبه‌ی پاتیل */
const STIR_HINT = {
  x: V2_ZONES.cauldron.x + 16,
  y: V2_ZONES.cauldron.y - 74,
  width: V2_ZONES.cauldron.width - 32,
  height: 48,
};

const ZONE = FLAT_SCENE_ZONE;

export function FlatCauldron() {
  const entries = useGameStore((s) => s.brew.entries);
  const heat = useGameStore((s) => s.brew.currentHeat);
  const stirCount = useGameStore((s) => s.brew.stirCount);
  const bottled = useGameStore((s) => s.brew.bottled);
  const customerIndex = useGameStore((s) => s.customerIndex);
  const customerId = useGameStore((s) => s.currentCustomer().id);
  const ingredientById = useGameStore((s) => s.ingredientById);
  const paused = useGameStore((s) => s.openOverlay !== null || s.result !== null);
  const stir = useGameStore((s) => s.stir);

  const stirring = useUiState((s) => s.stirring);
  const setStirring = useUiState((s) => s.setStirring);
  const pulse = useUiState((s) => s.pulse);
  const dropHint = useUiState((s) => s.drag?.kind === 'ground');
  const dropActive = useUiState((s) => s.drag?.kind === 'ground' && s.drag.over === 'cauldron');

  const filled = entries.length > 0;
  const overprocessed = entries.some((e) => e.stage === 'overprocessed');

  const seed = seedForCustomer(customerId, customerIndex);
  // یک صحنه برای عمر کامپوننت؛ بذر با reset(seed) در افکت زیر اعمال می‌شود
  const scene = useMemo(() => new FlatCookingScene(), []);
  const knownEntryIds = useRef<Set<string>>(new Set());
  const autoStirTimer = useRef<number | null>(null);

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

  // سوخته ⇒ رنگ مایع
  useEffect(() => {
    scene.setLiquidAdjust(overprocessed ? burntLiquid : null);
  }, [scene, overprocessed]);

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
      scene.drop(entry.ingredientId, {
        tint: def?.color ?? kitIngredient.tint,
        strength: kitIngredient.strength * (0.8 + 0.2 * entry.quantity),
        bits: {
          count: Math.round(baseBits.count * (0.75 + 0.25 * entry.quantity)),
          colors: def ? [...baseBits.colors, def.color] : baseBits.colors,
        },
      });
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

  const canvasRef = useFlatCanvas({
    designSize: FLAT_SCENE_SIZE,
    step: (dt) => scene.update(dt),
    render: () => scene.render(),
    running: !paused,
  });

  const stirGesture = useCircleGesture({
    enabled: filled && !bottled,
    onCircle: () => {
      stir();
      pulse('swirlPulse');
    },
    onActiveChange: (active) => {
      setStirring(active);
      if (!active) scene.setSpoonFollow(null);
    },
    onMove: (point) => scene.setSpoonFollow(spoonAngleFor(point)),
  });

  return (
    <>
      <canvas
        ref={canvasRef}
        className="flat-canvas"
        data-testid="v2-flat-cauldron-canvas"
        style={zoneStyle(ZONE)}
        aria-hidden="true"
      />

      <div
        data-testid="v2-cauldron"
        className={`cauldron interactive${dropHint ? ' is-target' : ''}${
          dropActive ? ' is-target-active' : ''
        }${stirring ? ' is-stirring' : ''}`}
        style={zoneStyle(V2_ZONES.cauldron, { zIndex: ZONE.z + 1, background: 'transparent' })}
        {...stirGesture}
      >
        <div className="cauldron__halo" />
      </div>

      {filled && !bottled && stirCount === 0 ? (
        <div className="hint hint--stir" style={rectStyle(STIR_HINT, 60)}>
          {uiLabels.stirHint}
        </div>
      ) : null}
    </>
  );
}
