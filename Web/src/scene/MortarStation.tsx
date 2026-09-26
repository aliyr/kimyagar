/**
 * ایستگاه هاون — فلو کلیکی کلاسیک (v3: هاون جامد از زاویهٔ بالاتر).
 *
 * - Tap شیشه در قفسه ⇒ تکه‌های ماده تا هاون پرواز می‌کنند (IngredientFlight) و با فرود،
 *   store.startGrinding() کوبش خودکار را آغاز می‌کند (tick در store).
 * - هنگام کوبش: کوبه چرخهٔ ضربهٔ فازدار دارد (mortarPile). هر برخورد یک `StrikeEvent`
 *   می‌دهد ⇒ صدا، هپتیک، لرزش ریز هاون، گرد/جرقه/موج براق (MortarFx)، شکستن تکه‌ها.
 *   دوربین ملایم روی هاون زوم می‌کند و دور و بر کمی تیره می‌شود.
 * - Tap روی هاون/کوبه ⇒ store.transferMortar() درجه‌ی همان لحظه را قفل می‌کند و
 *   SpoonTransfer قاشق سر بزی را می‌آورد؛ در لحظه‌ی drop: addMortarToCauldron + splashPulse.
 * - لایه‌ها (همه هم‌تراز با بوم مشترک v3):
 *     mortar_back ⇒ Canvas زیرین (پودر، سایهٔ کوبه، رد پودر) ⇒ تکه‌ها ⇒ کوبه ⇒
 *     mortar_front (نوار لبهٔ نزدیک) ⇒ Canvas رویین (ذرات) ⇒ حلقهٔ لبه.
 * - پالس mortarShakePulse (شیشه روی هاونِ پر) ⇒ لرزش + لبریز شدن + «جا ندارد».
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
import { getQuality } from '../platform/quality';
import './classic-stations.css';
import { MortarPileView } from './MortarPileView';
import { MortarFxCanvas, mortarFx } from './MortarFx';
import { PESTLE_BOX, PESTLE_FRAMES, PESTLE_HEAD_ANCHOR } from './mortarLayout';
import {
  clearResidue,
  mixColors,
  pestleInFront,
  pestleTransform,
  setPestleMode,
  subscribeStrike,
  syncMortarMix,
  tickMortarVisuals,
  useMortarChips,
  usePestleAim,
  useResidue,
} from './mortarPile';

const Z = SCENE_ZONES.mortar.z;
const ZONE = SCENE_ZONES.mortar;

/** طول لرزش «جا ندارد» — هماهنگ با cst-shake در CSS */
const SHAKE_MS = 420;
/** لرزش ریز برخورد کوبه — هماهنگ با cst-strike در CSS */
const STRIKE_MS = 110;
/** Tap = رهاکردن بدون جابه‌جایی بیش از این مقدار (پیکسل CSS) */
const TAP_SLOP_PX = 10;
/** زوم دوربین هنگام کوبش */
const CAMERA_ZOOM = 1.3;
const CAMERA_MS = 650;
const CAMERA_RETURN_DELAY_MS = 500;
const CAMERA_FOCUS = { x: ZONE.x + ZONE.width / 2, y: ZONE.y + ZONE.height * 0.45 };

/** شات دوربین فعلی از خودِ هاون است (تا با Cinematic تداخل نکند) */
let mortarShot = false;

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
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onCancel);
      try {
        el.setPointerCapture(pointerId);
      } catch {
        /* اشاره‌گر فعال نیست (رویداد مصنوعی) — بدون capture هم Tap کار می‌کند */
      }
    },
    [onTap],
  );
}

export function MortarStation() {
  const mortar = useGameStore((s) => s.mortar);
  const ingredients = useGameStore((s) => s.defs.ingredients);
  const heat = useGameStore((s) => s.brew.currentHeat);
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
  /** دیگ پرت شده و هنوز ننشسته ⇒ قاشق چیزی برای ریختن ندارد؛ کوبش آزاد می‌ماند */
  const potAway = useUiState((s) => s.discard !== null && !s.discard.settled);
  const mortarShakePulse = useUiState((s) => s.mortarShakePulse);
  const setGrindingUi = useUiState((s) => s.setGrinding);
  const setCamera = useUiState((s) => s.setCamera);
  const pulse = useUiState((s) => s.pulse);

  const grindState = mortar?.grindState ?? null;
  const ready = grindState !== null;
  const grinding = !!mortar?.grinding && !paused && transfer === null;
  const units = totalUnits;
  /** بعد از برداشتن با قاشق، کاسه خالی دیده می‌شود (store تا لحظه‌ی drop پر است) */
  const contentsVisible = mortar !== null && (transfer === null || transfer === 'scoop');
  const canTap = mortar !== null && transfer === null && !paused && !potAway;
  const hasMortar = mortar !== null;
  const residue = useResidue();
  const mixColor = portions.length > 0 ? mixColors(portions.map((p) => colorOf(p.ingredientId))) : '#8a7a52';

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [pestleArtOk, setPestleArtOk] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const transferColor = useRef('#8a7a52');
  if (ingredient) transferColor.current = ingredient.color;

  useEffect(() => {
    const src = artUrl(PESTLE_FRAMES[0].file);
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

  useEffect(() => {
    setGrindingUi(grinding);
  }, [grinding, setGrindingUi]);

  // برخورد واقعی کوبه ⇒ صدا/هپتیک/ذرات/لرزش ریز (بدون رندر React)
  useEffect(() => {
    if (!grinding) return;
    return subscribeStrike((e) => {
      sfx.grindStrike(e.fineness, e.hits);
      haptic(e.fineness > 0.66 ? 'light' : 'medium');
      mortarFx.strike(e);
      pulse('grindTickPulse');
      const el = rootRef.current;
      if (el && !getQuality().reducedMotion) {
        el.classList.remove('is-strike');
        // reflow تا انیمیشن دوباره شروع شود
        void el.offsetWidth;
        el.classList.add('is-strike');
        window.setTimeout(() => el.classList.remove('is-strike'), STRIKE_MS);
      }
    });
  }, [grinding, pulse]);

  // لحظهٔ «نرم شد»
  const wasFine = useRef(false);
  useEffect(() => {
    const fine = grindState === 'fine';
    if (fine && !wasFine.current && hasMortar) {
      mortarFx.fine(mixColor);
      sfx.grindFine();
      haptic('medium');
    }
    wasFine.current = fine;
  }, [grindState, hasMortar, mixColor]);

  // عطر: با نرم‌تر شدن پررنگ‌تر؛ هنگام کوبش بیشتر
  useEffect(() => {
    if (!mortar || transfer !== null) {
      mortarFx.setAroma(0, mixColor);
      return;
    }
    const norm = Math.min(1, (mortar.grindWork ?? 0) / 3.6);
    mortarFx.setAroma(norm * (grinding ? 1 : 0.55), mixColor);
  }, [mortar, grinding, transfer, mixColor]);
  useEffect(() => () => mortarFx.setAroma(0, '#8a7a52'), []);

  // لرزش «جا ندارد» + لبریز شدن — با هر پالس یک‌بار پخش می‌شود (پالس از قفسه)
  useEffect(() => {
    if (mortarShakePulse === 0) return;
    setShaking(true);
    mortarFx.spill(portions.map((p) => colorOf(p.ingredientId)));
    sfx.spill();
    const t = window.setTimeout(() => setShaking(false), SHAKE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mortarShakePulse]);

  // اگر وسط انتقال Reset شد (هاون خالی و قاشق هنوز در راه)، انتقال لغو می‌شود
  useEffect(() => {
    if (transfer !== null && mortar === null && transfer !== 'drop') setTransfer(null);
  }, [transfer, mortar, setTransfer]);

  // دوربین: زوم ملایم روی هاون هنگام کوبش؛ بازگشت نرم بعد از پایان؛ فوری با قاشق
  useEffect(() => {
    if (getQuality().reducedMotion) return;
    const cam = useUiState.getState().camera;
    if (grinding) {
      if (cam === null || mortarShot) {
        mortarShot = true;
        setCamera({ x: CAMERA_FOCUS.x, y: CAMERA_FOCUS.y, zoom: CAMERA_ZOOM, ms: CAMERA_MS }, false);
      }
      return;
    }
    if (!mortarShot) return;
    if (transfer !== null) {
      mortarShot = false;
      setCamera(null, false);
      return;
    }
    const t = window.setTimeout(() => {
      if (!mortarShot) return;
      mortarShot = false;
      setCamera(null, false);
    }, CAMERA_RETURN_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [grinding, transfer, setCamera]);
  useEffect(
    () => () => {
      if (mortarShot) {
        mortarShot = false;
        useUiState.getState().setCamera(null, false);
      }
    },
    [],
  );

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

  const onBrush = useCallback(() => {
    setSweeping(true);
    sfx.brushSweep();
    haptic('light');
    // فیلم residue جهت‌دار (راست→چپ) پاک می‌شود و در پایان جارو از state هم می‌رود
    mortarFx.brush(460);
    window.setTimeout(() => {
      if (useGameStore.getState().mortar) clearMortar();
    }, 220);
    window.setTimeout(() => {
      clearResidue();
      setSweeping(false);
    }, 480);
  }, [clearMortar]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const heatGlow = heat === 'high' ? 1 : heat === 'medium' ? 0.6 : 0.3;
  const showBrush = (mortar !== null || residue !== null) && transfer === null;

  return (
    <>
      {/* تیرگی ملایم دور هاون هنگام کوبش (زیر هاون، روی میز/قفسه؛ بدون گرفتن لمس) */}
      <div
        className={`cst-focus${grinding ? ' is-on' : ''}`}
        aria-hidden
        style={{
          ...rectStyle({ x: 0, y: 0, width: 1920, height: 1080 }, Z - 1),
          ...vars({ '--fx': `${CAMERA_FOCUS.x}px`, '--fy': `${CAMERA_FOCUS.y}px` }),
        }}
      />
      <div
        ref={rootRef}
        data-testid="mortar"
        data-mortar-units={mortar ? totalUnits : 0}
        data-grinding={grinding ? 'true' : undefined}
        className={`cst-mortar${contentsVisible ? ' is-open' : ''}${shaking ? ' is-shake' : ''}${
          canTap ? ' is-tappable interactive' : ''
        }${mortar ? '' : ' is-empty'}`}
        style={{
          ...rectStyle(SCENE_ZONES.mortar, Z),
          ...vars({ '--ing-color': ingredient?.color ?? '#8a7a52', '--heat': heatGlow }),
          overflow: 'visible',
        }}
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={canTap ? onTapPointerDown : undefined}
      >
        {/* ۱) بدنهٔ کامل: دیوارهٔ داخلی و کف داخل خودِ تصویرند */}
        <ArtLayer className="cst-mortar__back" src={CLASSIC_ART.mortar.back}>
          <div className="cst-mortar__ph" />
        </ArtLayer>
        {/* سوسوی برنج با نور کوره + نفس آرام در انتظار */}
        <div className="cst-mortar__sheen" aria-hidden />

        {/* Canvas زیرین: تودهٔ پودر، سایهٔ زندهٔ کوبه، رد پودر */}
        <MortarFxCanvas layer="below" z={1} />

        {transfer !== null ? (
          <div
            className="cst-spoon-layer"
            style={{
              position: 'absolute',
              left: -SCENE_ZONES.mortar.x,
              top: -SCENE_ZONES.mortar.y,
              width: 1920,
              height: 1080,
              zIndex: transfer === 'scoop' ? 4 : 7,
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

        {/* ۲) تکه‌ها روی کف */}
        {contentsVisible && units > 0 ? (
          <div
            // قرارداد e2e: «mortar-contents» فقط وقتی ماده درجه گرفته است
            data-testid={ready ? 'mortar-contents' : 'mortar-contents-raw'}
            data-grind={grindState ?? 'whole'}
            className={`cst-contents${ready ? ' is-ready' : ''}${grinding ? ' is-grinding' : ''}`}
          >
            <MortarPileView chips={pileChips} settled={pileSettled} />
          </div>
        ) : null}

        {/* ۳) کوبه: نیمهٔ دورِ مدار پشت مواد، نیمهٔ نزدیک و سکون جلو */}
        <div
          data-testid="pestle"
          data-frame={pestleAim.frame}
          className={`cst-pestle${canTap ? ' interactive is-usable' : ''}${
            grinding ? ' is-grinding' : ''
          }${transfer !== null ? ' is-aside' : ''}`}
          style={{
            position: 'absolute',
            left: `${PESTLE_BOX.left}%`,
            top: `${PESTLE_BOX.top}%`,
            width: `${PESTLE_BOX.width}%`,
            height: `${PESTLE_BOX.height}%`,
            zIndex: transfer === null && pestleInFront(pestleAim) ? 4 : 2,
            transformOrigin: `${PESTLE_HEAD_ANCHOR.x * 100}% ${PESTLE_HEAD_ANCHOR.y * 100}%`,
            transform: transfer !== null ? undefined : pestleTransform(pestleAim),
          }}
          onPointerDown={canTap ? (event) => { event.stopPropagation(); onTapPointerDown(event); } : undefined}
        >
          {PESTLE_FRAMES.map((frame, i) => (
            <img
              key={frame.file}
              className={`cst-fit cst-pestle__frame${pestleAim.frame === i + 1 ? ' is-on' : ''}`}
              src={artUrl(frame.file)}
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

        {/* ۴) نوار لبهٔ نزدیک — مواد و سر کوبه پشت آن می‌مانند */}
        <div className="cst-mortar__front">
          <ArtLayer src={CLASSIC_ART.mortar.front} />
        </div>

        {/* ۵) Canvas رویین: گرد، جرقه، عطر، پاف، لبریز، دنبالهٔ قاشق، موج براق */}
        <MortarFxCanvas layer="above" z={6} />

        {shaking ? <div className="cst-mortar__noroom">جا ندارد!</div> : null}
      </div>

      {/* حلقه‌ی زمان‌بندی روی لبهٔ دهانه — فقط وقتی ماده‌ای در هاون است */}
      {mortar && transfer === null ? (
        <GrindRing work={mortar.grindWork} active={grinding} tappable={canTap && !grinding} z={Z + 1} />
      ) : null}

      {/* قلم‌مو: خالی کردن هاون / جاروی رد پودر (بی‌هزینه) */}
      {showBrush ? (
        <div
          className={`brush interactive${sweeping ? ' is-sweeping' : ''}`}
          title="خالی کردن هاون"
          style={rectStyle(PROPS.brush, Z + 1)}
          {...tapProps(onBrush)}
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
