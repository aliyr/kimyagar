/**
 * پاتیل — مرکز ادراکی تجربه (بخش ۴.۱)، نسخه‌ی لایه‌ای کلاسیک.
 *
 * سطح معجون از لایه‌های هنری CLASSIC_ART.cauldron ساخته می‌شود:
 *   ۱) بیضی رنگ پایه — رنگ = ترکیب وزنی رنگ مواد (colors.ts)؛
 *   ۲) potion_still با mix-blend-mode: luminosity — سطح آرام؛
 *   ۳) potion_swirl — چرخش واقعی با rAF: هر swirlPulse سرعت زاویه‌ای را
 *      بالا می‌برد و طی ~۲٫۵ ثانیه افت می‌کند؛ هنگام هم‌زدن سرعت پر نگه
 *      داشته می‌شود. یک نسخه‌ی معکوس کم‌رنگ برای عمق می‌چرخد؛
 *   ۴) potion_boil_1/2 — crossfade در حرارت متوسط (~900ms) و تند (~450ms)؛
 *   ۵) پاشش قطره‌ی رنگی با رنگ آخرین ماده‌ی افزوده (splashPulse).
 *
 * بازخورد همچنان «کیفی» است (بخش ۶.۸): حباب = حرارت، بخار تا وقتی محتوایی
 * هست، درخشش نرم در 'ready'، تیره/بی‌رنگ در 'overprocessed'.
 * هم‌زدن: حرکت دایره‌ای روی پاتیل؛ هر دور یک stir (بازخورد کاهش‌یابنده).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { uiLabels } from '../data/labels';
import { useCircleGesture } from '../gestures';
import { CLASSIC_ART, SCENE_ZONES, artUrl } from './artManifest';
import { PROPS } from './layout';
import { desaturate, mixColors, rgbString, shade } from './colors';
import { ArtLayer, rectStyle, vars, zoneStyle } from './Zone';
import { useUiState } from './uiState';
import './classic-stations.css';

const BUBBLES = [
  { left: 14, size: 20, delay: 0, dur: 2.4 },
  { left: 27, size: 13, delay: 0.7, dur: 3.1 },
  { left: 38, size: 26, delay: 1.4, dur: 2.7 },
  { left: 48, size: 15, delay: 0.35, dur: 2.2 },
  { left: 57, size: 22, delay: 1.85, dur: 2.9 },
  { left: 66, size: 12, delay: 1.05, dur: 3.4 },
  { left: 74, size: 24, delay: 0.5, dur: 2.5 },
  { left: 84, size: 16, delay: 2.1, dur: 3 },
];

const STEAM = [
  { left: 26, delay: 0 },
  { left: 50, delay: 1.6 },
  { left: 72, delay: 0.8 },
];

const HEAT_BUBBLE: Record<string, { intensity: number; speed: number }> = {
  low: { intensity: 0.32, speed: 1.55 },
  medium: { intensity: 0.68, speed: 1 },
  high: { intensity: 1, speed: 0.62 },
};

/** ترکش‌های پاشش هنگام افزودن ماده (offset از مرکز، پیکسل صحنه) */
const SPLASH_BITS = [
  { x: -64, y: -46, delay: 0.1, size: 12 },
  { x: -30, y: -66, delay: 0.14, size: 14 },
  { x: 8, y: -72, delay: 0.12, size: 11 },
  { x: 42, y: -58, delay: 0.16, size: 13 },
  { x: 70, y: -38, delay: 0.1, size: 10 },
];

const LIQ = SCENE_ZONES.cauldronLiquid;
/**
 * گرداب در «فضای مربع» می‌چرخد و با scaleY له می‌شود تا چرخش روی سطح
 * بیضوی درست خوانده شود؛ scaleY داخل خود transform تصویر پخته می‌شود
 * (wrapper جدا stacking context می‌سازد و luminosity را از لایه‌ی رنگ می‌بُرد).
 */
const SWIRL_SQUASH = LIQ.height / LIQ.width;
const SWIRL_RECT_STYLE = {
  position: 'absolute',
  left: 0,
  top: (LIQ.height - LIQ.width) / 2,
  width: LIQ.width,
  height: LIQ.width,
} as const;

/** فیزیک چرخش گرداب (درجه/ثانیه) */
const SWIRL_MAX_VELOCITY = 460;
const SWIRL_STIR_FLOOR = 160;
/** ثابت افت نمایی — سرعت طی ~۲٫۵ ثانیه عملاً صفر می‌شود */
const SWIRL_DECAY = 1.6;

/** دوره‌ی تعویض فریم‌های قل‌قل بر حسب حرارت */
const BOIL_PERIOD_MS: Record<string, number> = { medium: 900, high: 450 };

export function CauldronStation() {
  const entries = useGameStore((s) => s.brew.entries);
  const heat = useGameStore((s) => s.brew.currentHeat);
  const stirCount = useGameStore((s) => s.brew.stirCount);
  const bottled = useGameStore((s) => s.brew.bottled);
  const ingredientById = useGameStore((s) => s.ingredientById);
  const stir = useGameStore((s) => s.stir);

  const stirring = useUiState((s) => s.stirring);
  const setStirring = useUiState((s) => s.setStirring);
  const pulse = useUiState((s) => s.pulse);
  const splashPulse = useUiState((s) => s.splashPulse);
  const swirlPulse = useUiState((s) => s.swirlPulse);
  const dropHint = useUiState((s) => s.drag?.kind === 'ground');
  const dropActive = useUiState((s) => s.drag?.kind === 'ground' && s.drag.over === 'cauldron');

  const filled = entries.length > 0;
  const overprocessed = entries.some((e) => e.stage === 'overprocessed');
  const ripe = !overprocessed && filled && entries[0].stage === 'ready';

  const liquid = useMemo(() => {
    let base = mixColors(
      entries.map((e) => ({
        color: ingredientById(e.ingredientId)?.color ?? '#6b6b4a',
        weight: e.quantity,
      })),
    );
    // مایع، نه رنگ خالص: همیشه کمی با آب کدر پاتیل شکسته می‌شود
    base = shade(base, -0.18);
    if (overprocessed) base = shade(desaturate(base, 0.45), -0.3);
    return {
      surface: rgbString(base),
      light: rgbString(shade(base, 0.28)),
      deep: rgbString(shade(base, -0.4)),
      foam: rgbString(shade(base, 0.5), 0.75),
    };
  }, [entries, ingredientById, overprocessed]);

  /** رنگ پاشش = رنگ آخرین ماده‌ی افزوده‌شده */
  const splashColor = useMemo(() => {
    const last = entries[entries.length - 1];
    return last ? ingredientById(last.ingredientId)?.color ?? '#8a7a52' : '#8a7a52';
  }, [entries, ingredientById]);

  const stirGesture = useCircleGesture({
    enabled: filled && !bottled,
    onCircle: () => {
      stir();
      pulse('swirlPulse');
    },
    onActiveChange: setStirring,
  });

  const bubble = HEAT_BUBBLE[heat] ?? HEAT_BUBBLE.medium;
  // بازخورد هم‌زدن کاهش‌یابنده است تا Spam تشویق نشود (بخش ۶.۱۰)
  const swirlStrength = Math.max(0.22, 1 - stirCount * 0.28);

  // ---------------------- چرخش واقعی گرداب با rAF ----------------------
  const swirlMainRef = useRef<HTMLImageElement | null>(null);
  const swirlBackRef = useRef<HTMLImageElement | null>(null);
  const angleRef = useRef(0);
  const velocityRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const stirringRef = useRef(false);
  const strengthRef = useRef(1);
  stirringRef.current = stirring;
  strengthRef.current = swirlStrength;

  const swirlTick = useCallback((now: number) => {
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = now;
    // هنگام هم‌زدن سرعت کف دارد؛ بعد از رها شدن به‌صورت نمایی افت می‌کند
    if (stirringRef.current) {
      velocityRef.current = Math.max(velocityRef.current, SWIRL_STIR_FLOOR * strengthRef.current + 60);
    }
    velocityRef.current *= Math.exp(-dt * SWIRL_DECAY);
    angleRef.current = (angleRef.current + velocityRef.current * dt) % 360;

    const opacity = Math.min(velocityRef.current / 170, 0.82);
    const main = swirlMainRef.current;
    const back = swirlBackRef.current;
    if (main) {
      main.style.transform = `scaleY(${SWIRL_SQUASH}) rotate(${angleRef.current}deg)`;
      main.style.opacity = opacity.toFixed(3);
    }
    if (back) {
      // نسخه‌ی معکوس کم‌رنگ برای عمق
      back.style.transform = `scaleY(${SWIRL_SQUASH}) rotate(${-angleRef.current * 0.62}deg)`;
      back.style.opacity = (opacity * 0.45).toFixed(3);
    }

    if (velocityRef.current > 3 || stirringRef.current) {
      rafRef.current = requestAnimationFrame(swirlTick);
    } else {
      if (main) main.style.opacity = '0';
      if (back) back.style.opacity = '0';
      rafRef.current = null;
    }
  }, []);

  const kickSwirl = useCallback(
    (spike: number) => {
      velocityRef.current = Math.min(velocityRef.current + spike, SWIRL_MAX_VELOCITY);
      if (rafRef.current === null) {
        lastTimeRef.current = performance.now();
        rafRef.current = requestAnimationFrame(swirlTick);
      }
    },
    [swirlTick],
  );

  // هر دورِ کامل هم‌زدن ⇒ جهش سرعت (با بازخورد کاهش‌یابنده)
  useEffect(() => {
    if (swirlPulse > 0) kickSwirl(140 + 220 * strengthRef.current);
  }, [swirlPulse, kickSwirl]);

  // شروع هم‌زدن ⇒ گرداب آرام راه می‌افتد حتی قبل از اولین دور کامل
  useEffect(() => {
    if (stirring) kickSwirl(50);
  }, [stirring, kickSwirl]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // -------------------------- فریم‌های قل‌قل ---------------------------
  const boiling = filled && !bottled && (heat === 'medium' || heat === 'high');
  const boilPeriod = BOIL_PERIOD_MS[heat] ?? BOIL_PERIOD_MS.medium;
  const [boilFrame, setBoilFrame] = useState<1 | 2>(1);
  useEffect(() => {
    if (!boiling) return;
    const id = window.setInterval(() => setBoilFrame((f) => (f === 1 ? 2 : 1)), boilPeriod);
    return () => window.clearInterval(id);
  }, [boiling, boilPeriod]);

  return (
    <>
      <div
        data-testid="cauldron"
        className={`cauldron interactive${dropHint ? ' is-target' : ''}${
          dropActive ? ' is-target-active' : ''
        }${stirring ? ' is-stirring' : ''}`}
        style={zoneStyle(SCENE_ZONES.cauldron)}
        {...stirGesture}
      >
        <ArtLayer src={SCENE_ZONES.cauldron.img}>
          <div className="cauldron__ph">
            <div className="cauldron__belly" />
            <div className="cauldron__handle cauldron__handle--l" />
            <div className="cauldron__handle cauldron__handle--r" />
            <div className="cauldron__rim" />
          </div>
        </ArtLayer>
        <div className="cauldron__halo" />
      </div>

      {/* پاتیلِ خالی معجونی ندارد — بدنه خودش خالی نقاشی شده است */}
      {filled ? (
        <div
          className={`cst-liquid${overprocessed ? ' is-burnt' : ''}${ripe ? ' is-ripe' : ''}${
            boiling ? ' is-boiling' : ''
          }`}
          style={{
            ...zoneStyle(SCENE_ZONES.cauldronLiquid),
            ...vars({
              '--liquid': liquid.surface,
              '--liquid-light': liquid.light,
              '--liquid-deep': liquid.deep,
              '--liquid-foam': liquid.foam,
              '--bubble-intensity': bubble.intensity,
              '--bubble-speed': `${bubble.speed}s`,
              '--splash-color': splashColor,
            }),
          }}
        >
          {/* ۱) رنگ پایه — رنگ معجون از مواد می‌آید */}
          <div className="cst-liquid__base" />

          {/* ۲) سطح آرام */}
          <img
            className="cst-fit cst-fit--cover cst-liquid__still"
            src={artUrl(CLASSIC_ART.cauldron.potionStill)}
            alt=""
            draggable={false}
          />

          {/* ۳) گرداب — transform/opacity با rAF نوشته می‌شود */}
          <img
            ref={swirlBackRef}
            className="cst-liquid__swirl"
            style={{ ...SWIRL_RECT_STYLE, transform: `scaleY(${SWIRL_SQUASH})` }}
            src={artUrl(CLASSIC_ART.cauldron.potionSwirl)}
            alt=""
            draggable={false}
          />
          <img
            ref={swirlMainRef}
            className="cst-liquid__swirl"
            style={{ ...SWIRL_RECT_STYLE, transform: `scaleY(${SWIRL_SQUASH})` }}
            src={artUrl(CLASSIC_ART.cauldron.potionSwirl)}
            alt=""
            draggable={false}
          />

          {/* ۴) قل‌قل دو فریمی در حرارت متوسط/تند */}
          {([1, 2] as const).map((f) => (
            <img
              key={f}
              className={`cst-fit cst-fit--cover cst-liquid__boil${
                boiling && boilFrame === f ? ' is-on' : ''
              }`}
              src={artUrl(CLASSIC_ART.cauldron.potionBoil[f - 1])}
              alt=""
              draggable={false}
            />
          ))}

          <div className="cst-liquid__sheen" />
          {BUBBLES.map((b, i) => (
            <span
              key={i}
              className="cst-bubble"
              style={vars({
                '--b-left': `${b.left}%`,
                '--b-size': `${b.size}px`,
                '--b-delay': `${b.delay}s`,
                '--b-dur': `${b.dur}s`,
              })}
            />
          ))}
          {ripe ? <div className="cst-liquid__shimmer" /> : null}

          {/* کلید یکتا برای هر ضربان تا انیمیشن یک‌بارمصرف دوباره پخش شود */}
          {splashPulse > 0 ? (
            <div key={`splash-${splashPulse}`} className="cst-splash">
              <span className="cst-splash__drop" />
              {SPLASH_BITS.map((b, i) => (
                <span
                  key={i}
                  className="cst-splash__bit"
                  style={vars({
                    '--sb-x': `${b.x}px`,
                    '--sb-y': `${b.y}px`,
                    '--sb-delay': `${b.delay}s`,
                    '--sb-size': `${b.size}px`,
                  })}
                />
              ))}
              <span className="cst-splash__ring" />
              <span className="cst-splash__ring" />
            </div>
          ) : null}
        </div>
      ) : null}

      {filled ? (
        <div className="cst-steam" style={zoneStyle(SCENE_ZONES.cauldronLiquid, { zIndex: 33 })}>
          {STEAM.map((s, i) => (
            <span
              key={i}
              className="cst-steam__plume"
              style={vars({ '--s-left': `${s.left}%`, '--s-delay': `${s.delay}s` })}
            />
          ))}
        </div>
      ) : null}

      {filled && !bottled && stirCount === 0 ? (
        <div className="hint hint--stir" style={rectStyle(PROPS.stirHint, 60)}>
          {uiLabels.stirHint}
        </div>
      ) : null}
    </>
  );
}
