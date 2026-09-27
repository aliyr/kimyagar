/**
 * کابینت ایستاده‌ی مواد (کلاسیک) — فلو کلیکی.
 *
 * کابینت بلند چوبی سمت چپ میز کار (SCENE_ZONES.sideCabinet): یک ستون، روی هر
 * طبقه یک شیشه. نوار طبقه‌ها داخل دهانه‌ی تاریک کابینت عمودی اسکرول می‌شود
 * (اینرسی + چسبیدن به طبقه). ارتفاع طبقه طوری است که طبقه‌ی بعدی نیمه‌پیدا از
 * لبه‌ی پایین دهانه بیرون بزند؛ همین نشانه‌ی اسکرول است (بی‌فلش).
 * طبقه‌ی آخر همیشه جای خالی خاک‌گرفته است برای مواد کشف‌نشده.
 *
 * ژست روی شیشه:
 *   - Tap (رهاکردن پیش از عبور از slop و پیش از LONG_PRESS_MS) ⇒ شیشه به‌سمت
 *     هاون (راست) کج می‌شود و یک واحد ماده از دهانه‌اش با IngredientFlight تا
 *     هاون پرواز می‌کند؛ با فرود: addClassicUnit + startGrinding. اگر مجموع
 *     واحدهای هاون به سقف CLASSIC_MAX_MORTAR_UNITS رسیده باشد پروازی نیست و
 *     لرزش «جا ندارد» پخش می‌شود.
 *   - نگه‌داشتن (LONG_PRESS_MS) بدون حرکت ⇒ Overlay جزئیات ماده.
 *   - عبور از slop (هر جهت) ⇒ اسکرول عمودی کابینت.
 * کشیدن روی پس‌زمینه‌ی کابینت ⇒ همیشه اسکرول.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { CLASSIC_MAX_MORTAR_UNITS, useGameStore } from '../store/gameStore';
import type { IngredientDefinition } from '../engine/types';
import { useStageSpace } from './Stage';
import { useUiState } from './uiState';
import { CLASSIC_ART, SCENE_ZONES } from './artManifest';
import { ArtLayer, rectStyle, useArt, vars } from './Zone';
import { IngredientFlight } from './IngredientFlight';
import { mortarFx } from './MortarFx';
import type { FlightSpec } from './IngredientFlight';
import { sfx } from '../audio/sfx';
import { haptic } from '../platform/haptics';
import './classic-ambience.css';

const ZONE = SCENE_ZONES.sideCabinet;

/** دهانه‌ی تاریک داخل side_cabinet.png (مختصات نسبی Zone) */
export const INNER = { x: 28, y: 150, width: 214, height: 703 } as const;

/** ۷۰۳/۱۵۸ ≈ ۴٫۴۵ ⇒ در حالت چسبیده، طبقه‌ی بعدی ~۴۵٪ از پایین پیداست */
export const SLOT_HEIGHT = 158;
export const EDGE_PAD = 10;
export const JAR_WIDTH = 128;
export const JAR_HEIGHT = 136;
export const BOARD_HEIGHT = 30;

/** سطح بالای تخته در shelf_board.png حدود ۱۳٪ از بالای آن است */
const BOARD_SURFACE = SLOT_HEIGHT - BOARD_HEIGHT + Math.round(BOARD_HEIGHT * 0.13);
const JAR_LEFT = (INNER.width - JAR_WIDTH) / 2;
const JAR_TOP = BOARD_SURFACE - JAR_HEIGHT;

/** آستانه‌ی slop در فضای صحنه؛ پیش از آن Tap/نگه‌داشتن، بعدش اسکرول */
const DIRECTION_SLOP = 12;
/** نگه‌داشتن بدون حرکت ⇒ جزئیات ماده */
const LONG_PRESS_MS = 450;

/** پنجره‌ی نمونه‌برداری سرعت انگشت */
const VELOCITY_WINDOW_MS = 80;
/** ضریب میرایی اینرسی به‌ازای هر فریم ۱۶ms */
const FRICTION = 0.92;
/** زیر این سرعت (px/ms) اینرسی تمام و چسبیدن به طبقه شروع می‌شود */
const MIN_VELOCITY = 0.05;
const SNAP_MS = 220;
/** بالای این سرعت برخورد به انتها صدای تقه دارد */
const BUMP_VELOCITY = 0.4;
const BUMP_DEBOUNCE_MS = 250;

const POUR_MS = 420;
/** شیشه اول کج می‌شود، بعد ماده بیرون می‌پرد */
const POUR_FLIGHT_DELAY_MS = 120;

function stripHeightFor(count: number): number {
  return EDGE_PAD * 2 + SLOT_HEIGHT * (count + 1);
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

interface Scroller {
  /** توقف اینرسی/چسبیدن (هر pointerdown تازه) */
  stop: () => void;
  move: (dyScene: number) => void;
  /** scrolled=false ⇒ فقط اگر وسط راه متوقف شده بود به طبقه بچسبد */
  release: (scrolled: boolean) => void;
}

function Jar({
  ingredient,
  index,
  scroller,
  onTap,
}: {
  ingredient: IngredientDefinition;
  index: number;
  scroller: Scroller;
  /** false ⇒ پذیرفته نشد (بدون انیمیشن ریختن) */
  onTap: (ingredient: IngredientDefinition, from: { x: number; y: number }) => boolean;
}) {
  const { capture } = useStageSpace();
  const openOverlay = useGameStore((s) => s.openOverlayAction);
  const inMortar = useGameStore((s) => s.mortar?.ingredientId === ingredient.id);
  const art = useArt(`cabinet/jar_${ingredient.id}.png`);
  const [pressed, setPressed] = useState(false);
  /** هر Tap پذیرفته یک شماره‌ی تازه تا تایمر کج‌شدن از نو شروع شود */
  const [pourSeq, setPourSeq] = useState(0);
  useEffect(() => {
    if (!pourSeq) return;
    const t = window.setTimeout(() => setPourSeq(0), POUR_MS);
    return () => window.clearTimeout(t);
  }, [pourSeq]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button > 0) return;
      // پس‌زمینه‌ی کابینت نباید هم‌زمان اسکرول را شروع کند
      e.stopPropagation();
      scroller.stop();

      const el = e.currentTarget;
      const pointerId = e.pointerId;
      const { toScene } = capture();
      const start = toScene(e.clientX, e.clientY);
      let last = start;
      let mode: 'pending' | 'scroll' | 'held' = 'pending';
      setPressed(true);

      const longPress = window.setTimeout(() => {
        if (mode !== 'pending') return;
        mode = 'held';
        setPressed(false);
        openOverlay('ingredient_detail', ingredient.id);
      }, LONG_PRESS_MS);

      const detach = () => {
        window.clearTimeout(longPress);
        setPressed(false);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onCancel);
        if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const point = toScene(ev.clientX, ev.clientY);
        if (mode === 'pending') {
          if (Math.hypot(point.x - start.x, point.y - start.y) < DIRECTION_SLOP) {
            last = point;
            return;
          }
          mode = 'scroll';
          window.clearTimeout(longPress);
          setPressed(false);
        }
        if (mode === 'scroll') scroller.move(point.y - last.y);
        last = point;
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const wasPending = mode === 'pending';
        const scrolled = mode === 'scroll';
        detach();
        scroller.release(scrolled);
        if (!wasPending) return;
        // Tap ⇒ پرواز از دهانه‌ی شیشه‌ی کج‌شده (بالا-راست)
        const r = el.getBoundingClientRect();
        const from = toScene(r.left + r.width * 0.78, r.top + r.height * 0.2);
        if (onTap(ingredient, from)) setPourSeq((n) => n + 1);
      };

      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        detach();
        scroller.release(false);
      };

      el.setPointerCapture(pointerId);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onCancel);
    },
    [capture, scroller, ingredient, openOverlay, onTap],
  );

  return (
    <div className="cabinet__row" style={{ top: EDGE_PAD + index * SLOT_HEIGHT, height: SLOT_HEIGHT }}>
      <CabinetBoard />
      <div
        data-testid={`jar-${ingredient.id}`}
        className={`shelf-jar${pressed ? ' is-pressed' : ''}${inMortar ? ' is-in-mortar' : ''}${
          pourSeq ? ' is-pouring' : ''
        }`}
        aria-label={ingredient.nameFa}
        style={{
          left: JAR_LEFT,
          top: JAR_TOP,
          width: JAR_WIDTH,
          height: JAR_HEIGHT,
          ...vars({ '--ing-color': ingredient.color }),
        }}
        onPointerDown={onPointerDown}
      >
        {art.node}
        {art.loaded ? null : <JarPlaceholder />}
        <span className="shelf-jar__label">{ingredient.nameFa}</span>
      </div>
    </div>
  );
}

function CabinetBoard() {
  return (
    <div className="cabinet__board" style={{ height: BOARD_HEIGHT }}>
      <ArtLayer src={CLASSIC_ART.shelfBoard} fit="fill">
        <span className="cabinet__board-ph" />
      </ArtLayer>
    </div>
  );
}

function JarPlaceholder() {
  return (
    <span className="jar__ph">
      <span className="jar__body">
        <span className="jar__fill" />
        <span className="jar__gloss" />
      </span>
      <span className="jar__lid" />
    </span>
  );
}

let flightSeq = 0;

export function SideCabinetClassic() {
  const { capture } = useStageSpace();
  const ingredients = useGameStore((s) => s.defs.ingredients);
  const heat = useGameStore((s) => s.brew.currentHeat);
  const heatGlow = heat === 'high' ? 1 : heat === 'medium' ? 0.6 : 0.3;
  const [flights, setFlights] = useState<FlightSpec[]>([]);

  const stripHeight = stripHeightFor(ingredients.length);
  const maxScroll = Math.max(0, stripHeight - INNER.height);
  const maxScrollRef = useRef(maxScroll);
  maxScrollRef.current = maxScroll;

  /** translateY نوار: ۰ = طبقه‌ی بالا، ‎-maxScroll‎ = انتهای پایین */
  const tyRef = useRef(0);
  const [ty, setTy] = useState(0);
  const rafRef = useRef(0);
  const samplesRef = useRef<{ t: number; y: number }[]>([]);
  const lastBumpRef = useRef(0);
  const timersRef = useRef(new Set<number>());

  const scroller = useMemo<Scroller>(() => {
    const clamp = (y: number) => Math.min(0, Math.max(-maxScrollRef.current, y));
    const apply = (y: number) => {
      tyRef.current = y;
      setTy(y);
    };
    const bump = () => {
      const now = performance.now();
      if (now - lastBumpRef.current < BUMP_DEBOUNCE_MS) return;
      lastBumpRef.current = now;
      sfx.woodBump();
      haptic('light');
    };
    const atEdge = (y: number) => y === 0 || y === -maxScrollRef.current;
    /** جابه‌جایی با clamp؛ رسیدنِ تازه به انتها با سرعت کافی ⇒ تقه */
    const shift = (dy: number, speed: number): boolean => {
      const prev = tyRef.current;
      const raw = prev + dy;
      const next = clamp(raw);
      if (next !== raw && next !== prev && atEdge(next) && Math.abs(speed) > BUMP_VELOCITY) bump();
      apply(next);
      return next !== raw;
    };
    const stop = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
    const snap = () => {
      stop();
      const from = tyRef.current;
      const shelf = clamp(Math.round(from / SLOT_HEIGHT) * SLOT_HEIGHT);
      const bottom = -maxScrollRef.current;
      // انتهای پایین مضرب طبقه نیست؛ بدون این، آخرین طبقه‌ها دست‌نیافتنی می‌مانند
      const target = Math.abs(bottom - from) < Math.abs(shelf - from) ? bottom : shelf;
      if (Math.abs(target - from) < 0.5) {
        apply(target);
        return;
      }
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / SNAP_MS);
        apply(from + (target - from) * easeOutCubic(k));
        rafRef.current = k < 1 ? requestAnimationFrame(step) : 0;
      };
      rafRef.current = requestAnimationFrame(step);
    };
    const inertia = (v0: number) => {
      stop();
      let v = v0;
      let last = performance.now();
      const step = (now: number) => {
        const dt = Math.min(48, now - last);
        last = now;
        v *= Math.pow(FRICTION, dt / 16);
        if (shift(v * dt, v)) v = 0;
        if (Math.abs(v) < MIN_VELOCITY) {
          snap();
          return;
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    };
    const velocity = (now: number) => {
      const recent = samplesRef.current.filter((s) => now - s.t <= VELOCITY_WINDOW_MS);
      if (recent.length < 2) return 0;
      const a = recent[0];
      const b = recent[recent.length - 1];
      return b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0;
    };
    return {
      stop: () => {
        stop();
        samplesRef.current = [];
      },
      move: (dy) => {
        const now = performance.now();
        const samples = samplesRef.current;
        const prevY = samples.length ? samples[samples.length - 1].y : 0;
        samples.push({ t: now, y: prevY + dy });
        while (samples.length > 2 && now - samples[0].t > VELOCITY_WINDOW_MS) samples.shift();
        shift(dy, velocity(now));
      },
      release: (scrolled) => {
        const v = scrolled ? velocity(performance.now()) : 0;
        samplesRef.current = [];
        if (Math.abs(v) >= MIN_VELOCITY) inertia(v);
        else snap();
      },
    };
  }, []);

  useEffect(() => {
    const next = Math.min(0, Math.max(-maxScroll, tyRef.current));
    if (next === tyRef.current) return;
    tyRef.current = next;
    setTy(next);
  }, [maxScroll]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      cancelAnimationFrame(rafRef.current);
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
    };
  }, []);

  /** Tap شیشه ⇒ پرواز (یا لرزش «جا ندارد» اگر هاون پُر است) */
  const onJarTap = useCallback((ingredient: IngredientDefinition, from: { x: number; y: number }): boolean => {
    const store = useGameStore.getState();
    const ui = useUiState.getState();
    if (store.openOverlay !== null || store.result !== null) return false;
    if (ui.transfer !== null) return false; // قاشق در راه است؛ کمی صبر
    const before = store.mortar;
    const filled = before?.portions
      ? before.portions.reduce((sum, portion) => sum + portion.quantity, 0)
      : (before?.quantity ?? 0);
    if (before && filled >= CLASSIC_MAX_MORTAR_UNITS) {
      ui.pulse('mortarShakePulse');
      return false;
    }
    haptic('light');
    const timers = timersRef.current;
    const t = window.setTimeout(() => {
      timers.delete(t);
      setFlights((f) => [
        ...f,
        { key: ++flightSeq, ingredientId: ingredient.id, color: ingredient.color, from },
      ]);
    }, POUR_FLIGHT_DELAY_MS);
    timers.add(t);
    return true;
  }, []);

  const onFlightLand = useCallback((flight: FlightSpec) => {
    const store = useGameStore.getState();
    if (store.openOverlay !== null || store.result !== null) return;
    store.addClassicUnit(flight.ingredientId);
    store.startGrinding();
    mortarFx.land(flight.color);
    sfx.jarDrop();
  }, []);

  const onFlightDone = useCallback((key: number) => {
    setFlights((f) => f.filter((x) => x.key !== key));
  }, []);

  /** پس‌زمینه‌ی کابینت: کشیدن = اسکرول (شیشه‌ها propagation را می‌بندند) */
  const onBackgroundPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button > 0) return;
      scroller.stop();
      const el = e.currentTarget;
      const pointerId = e.pointerId;
      const { toScene } = capture();
      let lastY = toScene(e.clientX, e.clientY).y;
      let moved = false;

      const detach = () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
      };
      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const y = toScene(ev.clientX, ev.clientY).y;
        scroller.move(y - lastY);
        lastY = y;
        moved = true;
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        detach();
        scroller.release(moved);
      };

      el.setPointerCapture(pointerId);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    },
    [capture, scroller],
  );

  const openingStyle = {
    left: INNER.x,
    top: INNER.y,
    width: INNER.width,
    height: INNER.height,
  };

  return (
    <>
      <div
        data-testid="shelf"
        className="cabinet interactive"
        style={{ ...rectStyle(ZONE, ZONE.z), ...vars({ '--heat': heatGlow }) }}
        onPointerDown={onBackgroundPointerDown}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="cabinet__frame">
          <ArtLayer src={CLASSIC_ART.sideCabinet} fit="fill">
            <span className="cabinet__frame-ph" />
          </ArtLayer>
        </div>
        <div className="cabinet__opening" style={openingStyle}>
          <div
            className="cabinet__strip"
            style={{ height: stripHeight, transform: `translate3d(0, ${Math.round(ty)}px, 0)` }}
          >
            {ingredients.map((ing, i) => (
              <Jar key={ing.id} ingredient={ing} index={i} scroller={scroller} onTap={onJarTap} />
            ))}
            <div
              className="cabinet__row"
              style={{ top: EDGE_PAD + ingredients.length * SLOT_HEIGHT, height: SLOT_HEIGHT }}
            >
              <CabinetBoard />
              <div
                className="shelf-jar shelf-slot--empty"
                aria-hidden
                style={{
                  left: JAR_LEFT,
                  top: JAR_TOP,
                  width: JAR_WIDTH,
                  height: JAR_HEIGHT,
                  pointerEvents: 'none',
                }}
              >
                <JarPlaceholder />
                <span className="shelf-jar__label">؟</span>
              </div>
            </div>
          </div>
        </div>
        <div className="cabinet__warmth" aria-hidden style={openingStyle} />
      </div>

      {/* پروازهای در جریان — بیرون از دهانه‌ی clip‌شده، روی کل صحنه */}
      {flights.length ? (
        <div className="shelf-flight-layer" style={rectStyle({ x: 0, y: 0, width: 1920, height: 1080 }, 62)}>
          {flights.map((f) => (
            <IngredientFlight key={f.key} flight={f} onLand={onFlightLand} onDone={onFlightDone} />
          ))}
        </div>
      ) : null}
    </>
  );
}
