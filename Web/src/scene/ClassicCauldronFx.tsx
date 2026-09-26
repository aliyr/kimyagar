/**
 * پل store ⇒ ClassicBrewSim و Canvas نقاشی‌گونه‌ی دهانه.
 * قراردادها: data-testid=cauldron-fx-canvas، data-sparkles،
 * transform هم‌زمان روی بدنه‌ی PNG و Canvas.
 */

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useGameStore } from '../store/gameStore';
import { seedForCustomer } from '../art/flat/react/flatSeed';
import { flatHeatLevel } from '../art/flat/react/heatLevel';
import {
  CLASSIC_FX_RECT_TALL,
  CLASSIC_POT_BASE,
  sinkProgress,
} from './classicCauldronGeometry';
import { SCENE_ZONES } from './artManifest';
import { rectStyle } from './Zone';
import { useUiState } from './uiState';
import { sfx } from '../audio/sfx';
import { haptic } from '../platform/haptics';
import { bakeChipsFor } from './mortarPile';
import { takeCauldronDrop } from './cauldron/cauldronDropChannel';
import { RESPAWN, strengthFor, type ClassicBrewSim } from './cauldron/ClassicBrewSim';
import { ClassicBrewPainter } from './cauldron/ClassicBrewPainter';
import { getFireGlow } from './cauldron/fireGlow';
import type { MortarChip } from './mortarPile';
import '../art/flat/react/flat.css';

const AUTO_STIR_DELAY_MS = 900;
const POUR_TILT_DEG = 11;
const FIXED_DT = 1 / 60;
const GRIND_WORK = { coarse: 1, crushed: 2.2, fine: 3.6 } as const;

const BODY_ORIGIN = `${CLASSIC_POT_BASE.x - SCENE_ZONES.cauldron.x}px ${CLASSIC_POT_BASE.y - SCENE_ZONES.cauldron.y}px`;
const FX_ORIGIN = `${CLASSIC_POT_BASE.x - CLASSIC_FX_RECT_TALL.x}px ${CLASSIC_POT_BASE.y - CLASSIC_FX_RECT_TALL.y}px`;

export function ClassicCauldronFx({
  sim,
  bodyRef,
}: {
  sim: ClassicBrewSim;
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const painterRef = useRef<ClassicBrewPainter | null>(null);

  useEffect(() => {
    sim.reset(seed);
    sim.setHeatLevel(bottled ? 0 : flatHeatLevel(useGameStore.getState().brew.currentHeat));
    knownEntryIds.current = new Set();
  }, [sim, seed]);

  useEffect(() => {
    sim.setHeatLevel(bottled ? 0 : flatHeatLevel(heat));
  }, [sim, heat, bottled]);

  useEffect(() => {
    sim.setBurnt(overprocessed);
  }, [sim, overprocessed]);

  useEffect(() => {
    sim.setDone(allReady);
    if (allReady) sfx.sparkle();
  }, [sim, allReady]);

  useEffect(() => {
    const perId = new Map<string, number>();
    for (const e of entries) {
      const p = sinkProgress(e.exposure, readyThreshold);
      const prev = perId.get(e.ingredientId);
      perId.set(e.ingredientId, prev === undefined ? p : Math.min(prev, p));
    }
    for (const [id, p] of perId) sim.setIngredientProgress(id, p);
  }, [sim, entries, readyThreshold]);

  useEffect(() => {
    sim.setPourTilt(pour === 'tilt' || pour === 'stream' ? POUR_TILT_DEG : 0);
  }, [sim, pour]);

  useEffect(() => {
    const known = knownEntryIds.current;
    if (entries.length === 0) {
      if (known.size > 0) {
        // دور ریختن: دیگ پنهان است و DiscardFx خودش در لحظه‌ی آمدن دیگ نو ریست می‌کند
        if (sim.potVisible) {
          sim.reset(seed);
          sim.setHeatLevel(flatHeatLevel(useGameStore.getState().brew.currentHeat));
        }
        known.clear();
      }
      return;
    }
    const fresh = entries.filter((entry) => !known.has(entry.id));
    if (fresh.length === 0) return;
    for (const entry of fresh) known.add(entry.id);
    const poured = takeCauldronDrop();
    const claimed = new Set<number>();
    for (const entry of fresh) {
      const def = ingredientById(entry.ingredientId);
      const tint = def?.color ?? '#8a7a52';
      let chips: MortarChip[] = [];
      if (poured) {
        chips = poured.filter((chip) => chip.ingredientId === entry.ingredientId && !claimed.has(chip.id));
        if (chips.length === 0) {
          chips = poured.filter((chip) => !chip.ingredientId && !claimed.has(chip.id));
        }
        chips.forEach((chip) => claimed.add(chip.id));
      }
      if (chips.length === 0) {
        const work = GRIND_WORK[entry.grindState] * entry.quantity;
        chips = bakeChipsFor(entry.ingredientId, entry.quantity, work, tint);
      }
      sim.dropChips({
        ingredient: {
          id: entry.ingredientId,
          tint,
          strength: strengthFor(entry.ingredientId),
          quantity: entry.quantity,
        },
        chips,
      });
    }
    if (autoStirTimer.current !== null) window.clearTimeout(autoStirTimer.current);
    autoStirTimer.current = window.setTimeout(() => {
      autoStirTimer.current = null;
      sim.stir();
      useGameStore.getState().stir();
      pulse('swirlPulse');
    }, AUTO_STIR_DELAY_MS + (fresh.length - 1) * 350);
  }, [sim, entries, seed, ingredientById, pulse]);

  useEffect(
    () => () => {
      if (autoStirTimer.current !== null) window.clearTimeout(autoStirTimer.current);
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!painterRef.current) painterRef.current = new ClassicBrewPainter();
    const painter = painterRef.current;
    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    measure();
    window.addEventListener('resize', measure);
    let raf = 0;
    let previous = performance.now();
    let accumulator = 0;
    let frame = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const elapsed = Math.min(0.25, (now - previous) / 1000);
      previous = now;
      accumulator += elapsed;
      let steps = 0;
      try {
        while (accumulator >= FIXED_DT && steps < 5) {
          sim.setFireGlow(getFireGlow());
          sim.update(FIXED_DT);
          accumulator -= FIXED_DT;
          steps++;
        }
        if (++frame % 20 === 0) measure();
        painter.render(ctx, canvas.width, canvas.height, sim);
      } catch (err) {
        canvas.dataset.fxError = err instanceof Error ? err.message : String(err);
      }
      // فرود دیگ نو: شق و لقی، بعد شرشر آب
      const impact = sim.takeLanding();
      if (impact > 0) {
        const strength = Math.min(1, impact / 1900);
        sfx.cauldronLand(strength);
        haptic(strength > 0.5 ? 'heavy' : 'light');
      }
      if (sim.takeFillStart()) sfx.waterFill(RESPAWN.fillDur);

      const { x, y } = sim.squash;
      const transform = `translateY(${sim.spawnY.toFixed(1)}px) rotate(${(sim.tilt + sim.rock).toFixed(2)}deg) scale(${x.toFixed(4)}, ${y.toFixed(4)})`;
      const visibility = sim.potVisible ? '' : 'hidden';
      const body = bodyRef.current;
      if (body) {
        body.style.transformOrigin = BODY_ORIGIN;
        body.style.transform = transform;
        body.style.visibility = visibility;
        body.style.setProperty('--soot', sim.soot.toFixed(3));
      }
      canvas.style.transformOrigin = FX_ORIGIN;
      canvas.style.transform = transform;
      canvas.style.visibility = visibility;
      canvas.dataset.sparkles = String(sim.sparkleCount);
      canvas.dataset.pot = sim.potSettled ? 'settled' : sim.potVisible ? 'landing' : 'away';
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [sim, bodyRef]);

  return (
    <canvas
      ref={canvasRef}
      className="flat-canvas cst-cauldron-fx"
      data-testid="cauldron-fx-canvas"
      style={rectStyle(CLASSIC_FX_RECT_TALL, SCENE_ZONES.cauldron.z + 1)}
      aria-hidden="true"
    />
  );
}
