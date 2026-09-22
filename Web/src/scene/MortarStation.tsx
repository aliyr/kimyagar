/**
 * ایستگاه هاون — فلو کلیکی کلاسیک.
 *
 * - Tap شیشه در قفسه ⇒ ماده تا هاون پرواز می‌کند (IngredientFlight) و با فرود،
 *   store.startGrinding() کوبش خودکار ۳٫۵ ثانیه‌ای را آغاز می‌کند (tick در store).
 * - هنگام کوبش: سر کوبه روی مواد بیضی دهانه را دور می‌زند (pestle_1)، گرد و خاک، جرقه‌های دور دهانه،
 *   حلقه‌ی برنجی زمان‌بندی (GrindRing) و هر ~۰٫۳۵ث یک «تیک» (صدا/هپتیک).
 * - Tap روی هاون/کوبه ⇒ store.transferMortar() درجه‌ی همان لحظه را قفل می‌کند
 *   (زودتر از آستانه‌ی اول = درشت) و SpoonTransfer قاشق سر بزی را می‌آورد؛
 *   کوبه کنار می‌رود؛ در لحظه‌ی drop: addMortarToCauldron + splashPulse.
 * - بعد از ۳٫۵ ثانیه ماده «نرم» می‌ماند و منتظر Tap.
 * - رندر لایه‌ای روی بوم مشترک (CLASSIC_ART.mortar):
 *     mortar_back ⇒ تکه‌های داخل دهانه ⇒ کوبه ⇒ mortar_front (لبهٔ جلو).
 * - پالس mortarShakePulse (شیشه روی هاونِ پر) ⇒ لرزش کوتاه + «جا ندارد».
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useGameStore } from '../store/gameStore';
import { grindLabels, uiLabels } from '../data/labels';
import { tapProps } from '../gestures';
import { CLASSIC_ART, SCENE_ZONES, artUrl } from './artManifest';
import { PROPS } from './layout';
import { ArtLayer, rectStyle, vars } from './Zone';
import { useUiState } from './uiState';
import { GrindRing } from './GrindRing';
import { SpoonTransfer } from './SpoonTransfer';
import { sfx } from '../audio/sfx';
import { haptic } from '../platform/haptics';
import './classic-stations.css';
import { MortarPileView } from './MortarPileView';
import {
  pestleInFront,
  pestleTransform,
  setPestleMode,
  syncMortarMix,
  tickMortarVisuals,
  useMortarChips,
  usePestleAim,
} from './mortarPile';

const Z = SCENE_ZONES.mortar.z;

/** Rect کوبه — نسبی به Zone هاون (layout.PROPS) تا با تغییر اندازه‌ی هاون هم‌راستا بماند */
const PESTLE_RECT = PROPS.pestle;
/** هر «ضربه»ی کوبش ⇒ تیک صدا/هپتیک */
const GRIND_TICK_MS = 1050;
/** طول لرزش «جا ندارد» — هماهنگ با cst-shake در CSS */
const SHAKE_MS = 420;
/** Tap = رهاکردن بدون جابه‌جایی بیش از این مقدار (پیکسل CSS) */
const TAP_SLOP_PX = 10;

/** گرد هم‌رنگ ماده: چند ذره داخل کاسه، چند ذره که کمی از لبه‌ی هاون بالاتر می‌روند */
const DUST = [
  { left: 40, top: 68, rise: -22, delay: 0, dur: 1.05, size: 16 },
  { left: 58, top: 70, rise: -16, delay: 0.28, dur: 0.95, size: 13 },
  { left: 50, top: 62, rise: -28, delay: 0.52, dur: 1.1, size: 18 },
  { left: 46, top: 48, rise: -70, delay: 0.14, dur: 1.2, size: 14 },
  { left: 62, top: 44, rise: -85, delay: 0.4, dur: 1.25, size: 15 },
  { left: 34, top: 40, rise: -95, delay: 0.66, dur: 1.3, size: 12 },
];

/** جرقه‌های ریز دور دهانه (زاویه بر حسب درجه، فاصله‌ی زمانی) */
const SPARKS = Array.from({ length: 8 }, (_, i) => ({
  angle: -160 + i * 20 + (i % 2 ? 6 : -6),
  delay: (i * 0.09) % 0.7,
  dur: 0.55 + (i % 3) * 0.12,
}));

/** گرد هر ذره به نسبت واحدهای همان ماده رنگ می‌گیرد. */
function dustPalette(parts: { quantity: number; color: string }[], count: number): string[] {
  if (parts.length === 0 || count <= 0) return [];
  const total = parts.reduce((sum, part) => sum + part.quantity, 0);
  const raw = parts.map((part) => (count * part.quantity) / total);
  const counts = raw.map((value) => Math.floor(value));
  let left = count - counts.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);
  for (const item of order) {
    if (left <= 0) break;
    counts[item.index] += 1;
    left -= 1;
  }
  const colors: string[] = [];
  parts.forEach((part, index) => {
    for (let i = 0; i < counts[index]; i++) colors.push(part.color);
  });
  return colors;
}

/** شمسه‌های برداشتن: داخل کاسه و روی لبه‌ی هاون، مثل جرقه‌ی پاتیل */
const SCOOP_GLINTS = [
  { x: 42, y: 64, delay: 0, size: 18 },
  { x: 58, y: 70, delay: 0.18, size: 14 },
  { x: 50, y: 56, delay: 0.34, size: 20 },
  { x: 34, y: 60, delay: 0.5, size: 13 },
  { x: 28, y: 28, delay: 0.1, size: 16 },
  { x: 72, y: 24, delay: 0.28, size: 15 },
  { x: 50, y: 16, delay: 0.42, size: 18 },
  { x: 18, y: 36, delay: 0.62, size: 12 },
  { x: 82, y: 34, delay: 0.22, size: 14 },
];

/** Tap ساده با تحمل لرزش انگشت (کوبه/هاون) */
function useTapWithSlop(onTap: () => void) {
  return useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button > 0) return;
      e.stopPropagation();
      const el = e.currentTarget;
      const pointerId = e.pointerId;
      const sx = e.clientX;
      const sy = e.clientY;
      const cleanup = () => {
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onCancel);
        if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        cleanup();
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) <= TAP_SLOP_PX) onTap();
      };
      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        cleanup();
      };
      el.setPointerCapture(pointerId);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onCancel);
    },
    [onTap],
  );
}

export function MortarStation() {
  const mortar = useGameStore((s) => s.mortar);
  const ingredients = useGameStore((s) => s.defs.ingredients);
  const portions = mortar?.portions ?? [];
  const totalUnits = portions.reduce((sum, portion) => sum + portion.quantity, 0);
  const colorOf = (id: string) => ingredients.find((item) => item.id === id)?.color ?? '#8a7a52';
  const dominant = portions.reduce<(typeof portions)[number] | null>((best, portion) => {
    if (!best || portion.quantity > best.quantity) return portion;
    return best;
  }, null);
  const ingredient = dominant ? ingredients.find((item) => item.id === dominant.ingredientId) : undefined;
  const paused = useGameStore((s) => s.openOverlay !== null || s.result !== null);
  const clearMortar = useGameStore((s) => s.clearMortar);
  const transferMortar = useGameStore((s) => s.transferMortar);
  const addMortarToCauldron = useGameStore((s) => s.addMortarToCauldron);

  const transfer = useUiState((s) => s.transfer);
  const setTransfer = useUiState((s) => s.setTransfer);
  const mortarShakePulse = useUiState((s) => s.mortarShakePulse);
  const setGrindingUi = useUiState((s) => s.setGrinding);
  const pulse = useUiState((s) => s.pulse);

  const grindState = mortar?.grindState ?? null;
  const ready = grindState !== null;
  const grinding = !!mortar?.grinding && !paused && transfer === null;
  const units = totalUnits;
  /** بعد از برداشتن با قاشق، کاسه خالی دیده می‌شود (store تا لحظه‌ی drop پر است) */
  const contentsVisible = mortar !== null && (transfer === null || transfer === 'scoop');
  const canTap = mortar !== null && transfer === null && !paused;
  const hasMortar = mortar !== null;

  const [pestleArtOk, setPestleArtOk] = useState(false);

  useEffect(() => {
    const src = artUrl(CLASSIC_ART.mortar.pestleFrames[0]);
    const img = new Image();
    const done = () => {
      if (img.naturalWidth > 0) setPestleArtOk(true);
    };
    img.onload = done;
    img.onerror = () => setPestleArtOk(false);
    img.src = src;
    if (img.complete) done();
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, []);
  const [shaking, setShaking] = useState(false);
  const transferColor = useRef('#8a7a52');
  if (ingredient) transferColor.current = ingredient.color;

  useEffect(() => {
    setGrindingUi(grinding);
  }, [grinding, setGrindingUi]);

  // تیک کوبش: صدا + هپتیک سبک + پالس برای دیگر لایه‌ها
  useEffect(() => {
    if (!grinding) return;
    const tick = () => {
      pulse('grindTickPulse');
      sfx.grindTick();
      haptic('light');
    };
    tick();
    const id = window.setInterval(tick, GRIND_TICK_MS);
    return () => window.clearInterval(id);
  }, [grinding, pulse]);

  // لرزش «جا ندارد» — با هر پالس یک‌بار پخش می‌شود (پالس از قفسه)
  useEffect(() => {
    if (mortarShakePulse === 0) return;
    setShaking(true);
    const t = window.setTimeout(() => setShaking(false), SHAKE_MS);
    return () => window.clearTimeout(t);
  }, [mortarShakePulse]);

  // اگر وسط انتقال Reset شد (هاون خالی و قاشق هنوز در راه)، انتقال لغو می‌شود
  useEffect(() => {
    if (transfer !== null && mortar === null && transfer !== 'drop') setTransfer(null);
  }, [transfer, mortar, setTransfer]);

  const startTransfer = useCallback(() => {
    if (!canTap) return;
    if (!transferMortar()) return;
    setTransfer('scoop');
  }, [canTap, transferMortar, setTransfer]);

  const onTapPointerDown = useTapWithSlop(startTransfer);

  const onDrop = useCallback(() => {
    addMortarToCauldron();
    pulse('splashPulse');
    sfx.splash();
    haptic('medium');
  }, [addMortarToCauldron, pulse]);

  const onDone = useCallback(() => setTransfer(null), [setTransfer]);
  const onScoop = useCallback(() => {
    sfx.scoop();
  }, []);

  const pileChips = useMortarChips();
  const pestleAim = usePestleAim();
  const [pileSettled, setPileSettled] = useState(false);
  const pileKey = portions.length === 0
    ? null
    : portions.map((portion) => portion.ingredientId + ':' + String(portion.quantity)).join('|');
  const mixKey = portions
    .map((portion) => `${portion.ingredientId}:${portion.quantity}:${portion.grindWork.toFixed(2)}:${colorOf(portion.ingredientId)}`)
    .join('|');
  useEffect(() => {
    if (!pileKey) {
      syncMortarMix(null, []);
      return;
    }
    syncMortarMix(
      pileKey,
      portions.map((portion) => ({
        ingredientId: portion.ingredientId,
        quantity: portion.quantity,
        grindWork: portion.grindWork,
        color: colorOf(portion.ingredientId),
      })),
    );
  }, [mixKey, pileKey]);
  useEffect(() => {
    setPileSettled(false);
    const id = window.setTimeout(() => setPileSettled(true), 40);
    return () => window.clearTimeout(id);
  }, [pileKey]);

  useEffect(() => {
    if (transfer !== null) return;
    if (!mortar) {
      setPestleMode('lean');
      return;
    }
    if (!grinding) {
      setPestleMode('rest');
      return;
    }
    setPestleMode('grind');
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tickMortarVisuals(dt);
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [grinding, hasMortar, transfer]);

  const artUnits = Math.min(3, Math.max(1, units || 1)) as 1 | 2 | 3;
  const contentsSrc =
    units === 0 ? undefined : artUrl(CLASSIC_ART.mortar.contents(artUnits, ready ? 'ground' : 'raw'));

  return (
    <>
      <div
        data-testid="mortar"
        data-mortar-units={mortar ? totalUnits : 0}
        data-grinding={grinding ? 'true' : undefined}
        className={`cst-mortar${contentsVisible ? ' is-open' : ''}${shaking ? ' is-shake' : ''}${canTap ? ' is-tappable interactive' : ''}`}
        style={{
          ...rectStyle(SCENE_ZONES.mortar, Z),
          ...vars({ '--ing-color': ingredient?.color ?? '#8a7a52' }),
          overflow: 'visible',
        }}
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={canTap ? onTapPointerDown : undefined}
      >
        {/* ۱) پشت هاون. موقع پر بودن، دیواره‌ی جلو از همین تصویر بریده می‌شود. */}
        <ArtLayer className="cst-mortar__back" src={CLASSIC_ART.mortar.back}>
          <div className="cst-mortar__ph" />
        </ArtLayer>
        {transfer !== null ? (
          <div
            className="cst-spoon-layer"
            style={{
              position: 'absolute',
              left: -SCENE_ZONES.mortar.x,
              top: -SCENE_ZONES.mortar.y,
              width: 1920,
              height: 1080,
              zIndex: transfer === 'scoop' ? 3 : 6,
              pointerEvents: 'none',
            }}
          >
            <SpoonTransfer
              color={transferColor.current}
              onPhase={setTransfer}
              onScoop={onScoop}
              onDrop={onDrop}
              onDone={onDone}
            />
          </div>
        ) : null}

        {/* نمای داخل، کف، مواد روی کوبه، بعد گرد و جرقه */}
        {contentsVisible ? <div className="cst-mortar__cavity" aria-hidden /> : null}
        {contentsVisible ? <div className="cst-mortar__floor" aria-hidden /> : null}

        {/* ۲) محتوا روی کف داخلی */}
        {contentsVisible && contentsSrc ? (
          <div
            // قرارداد e2e: «mortar-contents» فقط وقتی ماده درجه گرفته است
            data-testid={ready ? 'mortar-contents' : 'mortar-contents-raw'}
            data-grind={grindState ?? 'whole'}
            className={`cst-contents${ready ? ' is-ready' : ''}${grinding ? ' is-shaking' : ''}`}
          >
            <MortarPileView
              chips={pileChips}
              settled={pileSettled}
              rawSrc={artUrl(CLASSIC_ART.mortar.contents(artUnits, 'raw'))}
              groundSrc={artUrl(CLASSIC_ART.mortar.contents(artUnits, 'ground'))}
            />
          </div>
        ) : null}

        {/* کوبه: دورِ عقب پشت مواد، دورِ جلو و سکونِ آخر جلوی مواد */}
        <div
          data-testid="pestle"
          className={`cst-pestle${canTap ? ' interactive is-usable' : ''}${
            grinding ? ' is-grinding' : ''
          }${transfer !== null ? ' is-aside' : ''}`}
          style={{
            position: 'absolute',
            left: `${((PESTLE_RECT.x - SCENE_ZONES.mortar.x) / SCENE_ZONES.mortar.width) * 100}%`,
            top: `${((PESTLE_RECT.y - SCENE_ZONES.mortar.y) / SCENE_ZONES.mortar.height) * 100}%`,
            width: `${(PESTLE_RECT.width / SCENE_ZONES.mortar.width) * 100}%`,
            height: `${(PESTLE_RECT.height / SCENE_ZONES.mortar.height) * 100}%`,
            zIndex: transfer === null && pestleInFront(pestleAim) ? 4 : 2,
            transformOrigin: '28% 72%',
            transform: transfer !== null ? undefined : pestleTransform(pestleAim),
          }}
          onPointerDown={canTap ? (event) => { event.stopPropagation(); onTapPointerDown(event); } : undefined}
        >
        {([1, 2, 3] as const).map((f) => (
          <img
            key={f}
            className="cst-fit"
            style={{ opacity: f === 1 ? 1 : 0 }}
            src={artUrl(CLASSIC_ART.mortar.pestleFrames[f - 1])}
            alt=""
            draggable={false}
            onLoad={(event) => {
              if (event.currentTarget.naturalWidth > 0) setPestleArtOk(true);
            }}
          />
        ))}
        {pestleArtOk ? null : (
          <span className="cst-pestle__ph">
            <span className="cst-pestle__rod" />
            <span className="cst-pestle__head" />
          </span>
        )}
      </div>
        {contentsVisible ? null : (
          <div className="cst-mortar__front">
            <ArtLayer src={CLASSIC_ART.mortar.front} />
          </div>
        )}

        {(grinding || transfer === 'scoop') ? (
          <div className="cst-mortar__dust" aria-hidden>
            {DUST.map((d, i) => {
              const palette = dustPalette(
                portions.map((portion) => ({ quantity: portion.quantity, color: colorOf(portion.ingredientId) })),
                DUST.length,
              );
              return (
              <span
                key={i}
                className="cst-dust"
                style={vars({
                  '--ing-color': palette[i] ?? ingredient?.color ?? '#8a7a52',
                  '--d-left': `${d.left}%`,
                  '--d-top': `${d.top}%`,
                  '--d-rise': `${d.rise}px`,
                  '--d-delay': `${d.delay}s`,
                  '--d-dur': `${d.dur}s`,
                  '--d-size': `${d.size}px`,
                })}
              />
              );
            })}
          </div>
        ) : null}

        {transfer === 'scoop' ? (
          <div className="cst-mortar__glints" aria-hidden>
            {SCOOP_GLINTS.map((g, i) => (
              <span
                key={i}
                className="cst-glint"
                style={vars({
                  '--g-x': `${g.x}%`,
                  '--g-y': `${g.y}%`,
                  '--g-delay': `${g.delay}s`,
                  '--g-size': `${g.size}px`,
                })}
              />
            ))}
          </div>
        ) : null}

        {/* جرقه‌های کوبش دور دهانه */}
        {grinding ? (
          <div className="cst-mortar__sparks" aria-hidden>
            {SPARKS.map((s, i) => (
              <span
                key={i}
                className="cst-spark"
                style={vars({
                  '--sp-angle': `${s.angle}deg`,
                  '--sp-delay': `${s.delay}s`,
                  '--sp-dur': `${s.dur}s`,
                })}
              />
            ))}
          </div>
        ) : null}

        <div className="cst-mortar__glow" />
        {shaking ? <div className="cst-mortar__noroom">جا ندارد!</div> : null}
      </div>

      {/* حلقه‌ی برنجی زمان‌بندی — فقط وقتی ماده‌ای در هاون است */}
      {mortar && transfer === null ? (
        <GrindRing work={mortar.grindWork} active={grinding} z={Z + 1} />
      ) : null}

      {/* قلم‌مو: خالی کردن هاون پیش از افزودن (بی‌هزینه) */}
      {mortar && transfer === null ? (
        <div
          className="brush interactive"
          title="خالی کردن هاون"
          style={rectStyle(PROPS.brush, Z + 1)}
          {...tapProps(clearMortar)}
        >
          <span className="brush__handle" />
          <span className="brush__ferrule" />
          <span className="brush__bristles" />
        </div>
      ) : null}

      {mortar && transfer === null ? (
        <div className="mortar-label" style={rectStyle(PROPS.mortarLabel, Z + 2)}>
          {grindState ? (
            <span className="mortar-label__state">
              {grindLabels[grindState]}
              {grinding ? '' : ` — ${uiLabels.tapMortarHint}`}
            </span>
          ) : (
            <span className="mortar-label__hint">{uiLabels.grindingHint}</span>
          )}
        </div>
      ) : null}
    </>
  );
}
