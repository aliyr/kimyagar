/**
 * ایستگاه هاون — فلو کلیکی کلاسیک.
 *
 * - Tap شیشه در قفسه ⇒ ماده تا هاون پرواز می‌کند (IngredientFlight) و با فرود،
 *   store.startGrinding() کوبش خودکار ۷ ثانیه‌ای را آغاز می‌کند (tick در store).
 * - هنگام کوبش: فریم‌های کوبه ۱→۲→۳→۲ (~۱۱۰ms)، گرد و خاک، جرقه‌های دور دهانه،
 *   حلقه‌ی برنجی زمان‌بندی (GrindRing) و هر ~۰٫۳۵ث یک «تیک» (صدا/هپتیک).
 * - Tap روی هاون/کوبه ⇒ store.transferMortar() درجه‌ی همان لحظه را قفل می‌کند
 *   (زودتر از آستانه‌ی اول = درشت) و SpoonTransfer قاشق سر بزی را می‌آورد؛
 *   کوبه کنار می‌رود؛ در لحظه‌ی drop: addMortarToCauldron + splashPulse.
 * - بعد از ۷ ثانیه ماده «نرم» می‌ماند و منتظر Tap.
 * - رندر لایه‌ای روی بوم مشترک (CLASSIC_ART.mortar) مثل قبل:
 *     mortar_back ⇒ contents_{units}_{raw|ground} با tint ⇒ mortar_front (x-ray).
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

const Z = SCENE_ZONES.mortar.z;

/** Rect کوبه — نسبی به Zone هاون (layout.PROPS) تا با تغییر اندازه‌ی هاون هم‌راستا بماند */
const PESTLE_RECT = PROPS.pestle;
/** چرخه‌ی پینگ‌پنگ فریم‌ها هنگام کوبیدن: ۱→۲→۳→۲→۱→… */
const PESTLE_SEQ = [1, 2, 3, 2] as const;
const PESTLE_FRAME_MS = 110;
/** هر «ضربه»ی کوبش (یک چرخه‌ی کامل فریم‌ها) ⇒ تیک صدا/هپتیک */
const GRIND_TICK_MS = 350;
/** طول لرزش «جا ندارد» — هماهنگ با cst-shake در CSS */
const SHAKE_MS = 420;
/** Tap = رهاکردن بدون جابه‌جایی بیش از این مقدار (پیکسل CSS) */
const TAP_SLOP_PX = 10;

/** ذرات گردی که هنگام کوبیدن از دهانه بلند می‌شوند */
const DUST = [
  { left: 34, delay: 0, dur: 0.8, size: 9 },
  { left: 48, delay: 0.25, dur: 0.95, size: 12 },
  { left: 61, delay: 0.5, dur: 0.7, size: 8 },
  { left: 42, delay: 0.65, dur: 0.85, size: 7 },
];

/** جرقه‌های ریز دور دهانه (زاویه بر حسب درجه، فاصله‌ی زمانی) */
const SPARKS = Array.from({ length: 8 }, (_, i) => ({
  angle: -160 + i * 20 + (i % 2 ? 6 : -6),
  delay: (i * 0.09) % 0.7,
  dur: 0.55 + (i % 3) * 0.12,
}));

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
  const ingredient = useGameStore((s) =>
    s.mortar ? s.ingredientById(s.mortar.ingredientId) : undefined,
  );
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
  /** در کلاسیک فقط ۱..۳ می‌آید؛ برای اطمینان clamp می‌کنیم */
  const units = mortar
    ? (Math.min(3, Math.max(1, Math.round(mortar.quantity))) as 1 | 2 | 3)
    : 0;
  /** بعد از برداشتن با قاشق، کاسه خالی دیده می‌شود (store تا لحظه‌ی drop پر است) */
  const contentsVisible = mortar !== null && (transfer === null || transfer === 'scoop');
  const canTap = mortar !== null && transfer === null && !paused;

  /** ایندکس گام در چرخه‌ی پینگ‌پنگ کوبه؛ در سکون همیشه فریم ۱ */
  const [pestleStep, setPestleStep] = useState(0);
  const [pestleArtOk, setPestleArtOk] = useState(false);
  const [shaking, setShaking] = useState(false);
  const transferColor = useRef('#8a7a52');
  if (ingredient) transferColor.current = ingredient.color;

  // چرخه‌ی فریم‌ها + وضعیت UI فقط هنگام کوبیدن
  useEffect(() => {
    setGrindingUi(grinding);
    if (!grinding) {
      setPestleStep(0);
      return;
    }
    const id = window.setInterval(
      () => setPestleStep((s) => (s + 1) % PESTLE_SEQ.length),
      PESTLE_FRAME_MS,
    );
    return () => window.clearInterval(id);
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

  const pestleFrame = grinding ? PESTLE_SEQ[pestleStep] : 1;

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

  const contentsSrc =
    units === 0 ? undefined : artUrl(CLASSIC_ART.mortar.contents(units, ready ? 'ground' : 'raw'));

  return (
    <>
      <div
        data-testid="mortar"
        data-mortar-units={mortar?.quantity ?? 0}
        data-grinding={grinding ? 'true' : undefined}
        className={`cst-mortar${shaking ? ' is-shake' : ''}${canTap ? ' is-tappable interactive' : ''}`}
        style={{
          ...rectStyle(SCENE_ZONES.mortar, Z),
          ...vars({ '--ing-color': ingredient?.color ?? '#8a7a52' }),
        }}
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={canTap ? onTapPointerDown : undefined}
      >
        {/* ۱) بدنه‌ی کامل (پشت محتوا) */}
        <ArtLayer src={CLASSIC_ART.mortar.back}>
          <div className="cst-mortar__ph" />
        </ArtLayer>

        {/* ۲) محتوا: لایه‌ی رنگ mask شده + بافت luminosity */}
        {contentsVisible && contentsSrc ? (
          <div
            // قرارداد e2e: «mortar-contents» فقط وقتی ماده درجه گرفته است
            data-testid={ready ? 'mortar-contents' : 'mortar-contents-raw'}
            data-grind={grindState ?? 'whole'}
            className={`cst-contents${ready ? ' is-ready' : ''}${grinding ? ' is-shaking' : ''}`}
          >
            <span
              className="cst-contents__color"
              style={{
                WebkitMaskImage: `url("${contentsSrc}")`,
                maskImage: `url("${contentsSrc}")`,
              }}
            />
            <img
              className="cst-fit cst-contents__texture"
              src={contentsSrc}
              alt=""
              draggable={false}
            />
            {grinding
              ? DUST.map((d, i) => (
                  <span
                    key={i}
                    className="cst-dust"
                    style={vars({
                      '--d-left': `${d.left}%`,
                      '--d-delay': `${d.delay}s`,
                      '--d-dur': `${d.dur}s`,
                      '--d-size': `${d.size}px`,
                    })}
                  />
                ))
              : null}
          </div>
        ) : null}

        {/* ۳) دیواره‌ی جلو — با محتوا نیمه‌شفاف تا داخل کاسه دیده شود */}
        <div className={`cst-mortar__front${contentsVisible ? ' is-xray' : ''}`}>
          <ArtLayer src={CLASSIC_ART.mortar.front} />
        </div>

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

      {/* کوبه — بالای دیواره‌ی جلو؛ هنگام انتقال کنار می‌رود */}
      <div
        data-testid="pestle"
        className={`cst-pestle${canTap ? ' interactive is-usable' : ''}${
          grinding ? ' is-grinding' : ''
        }${transfer !== null ? ' is-aside' : ''}`}
        style={rectStyle(PESTLE_RECT, Z + 3)}
        onPointerDown={canTap ? onTapPointerDown : undefined}
      >
        {([1, 2, 3] as const).map((f) => (
          <img
            key={f}
            className="cst-fit"
            style={{ opacity: pestleArtOk && pestleFrame === f ? 1 : 0 }}
            src={artUrl(CLASSIC_ART.mortar.pestleFrames[f - 1])}
            alt=""
            draggable={false}
            onLoad={f === 1 ? () => setPestleArtOk(true) : undefined}
            onError={f === 1 ? () => setPestleArtOk(false) : undefined}
          />
        ))}
        {pestleArtOk ? null : (
          <span className="cst-pestle__ph">
            <span className="cst-pestle__rod" />
            <span className="cst-pestle__head" />
          </span>
        )}
      </div>

      {/* قاشق سر بزی: هاون ⇒ پاتیل */}
      {transfer !== null ? (
        <div className="cst-spoon-layer" style={rectStyle({ x: 0, y: 0, width: 1920, height: 1080 }, 44)}>
          <SpoonTransfer
            color={transferColor.current}
            onPhase={setTransfer}
            onScoop={onScoop}
            onDrop={onDrop}
            onDone={onDone}
          />
        </div>
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
