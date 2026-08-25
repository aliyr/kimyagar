/**
 * پاتیل نسخه ۲ — مالک: Workstream B.
 *
 * تفاوت با پاتیل کلاسیک: لایه‌ی معجون یک تصویر سبک‌آگاه (flat/pixel) است که
 * روی یک tint رنگی می‌نشیند؛ رنگ tint همان ترکیب وزنی رنگ مواد است
 * (colors.ts، مثل کلاسیک) تا بازخورد کیفی باشد نه عددی.
 *
 * فریم‌های جوش: تا وقتی هم‌زدن در جریان است یا حرارت تند/متوسط است،
 * potion_boil_1 و potion_boil_2 عوض می‌شوند؛ در حالت آرام potion_still.
 *
 * رفتار بازی دقیقاً مثل کلاسیک است: هم‌زدن با ژست دایره‌ای، مقصد Drop با
 * شناسه‌ی 'cauldron' (هاون محتوایش را اینجا می‌ریزد)، پاشش، سوختن، درخشش.
 */

import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { uiLabels } from '../../data/labels';
import { useCircleGesture } from '../../gestures';
import { MURKY_WATER, desaturate, mixColors, rgbString, shade } from '../colors';
import { rectStyle, vars, zoneStyle } from '../Zone';
import { useUiState } from '../uiState';
import { ArtLayerV2, V2_ART, V2_ZONES } from './contracts';

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

/** دوره‌ی تناوب دو فریم جوش (میلی‌ثانیه) — هرچه گرم‌تر، تندتر */
const BOIL_PERIOD = { stir: 300, high: 350, medium: 560 };

/** راهنمای هم‌زدن، بالای لبه‌ی پاتیل */
const STIR_HINT = {
  x: V2_ZONES.cauldron.x + 16,
  y: V2_ZONES.cauldron.y - 74,
  width: V2_ZONES.cauldron.width - 32,
  height: 48,
};

type BoilFrame = 1 | 2;

/**
 * تناوب دو فریمی جوش. در حالت آرام تایمر خاموش است و فریم اهمیتی ندارد،
 * چون تصویر still نمایش داده می‌شود.
 */
function useBoilFrame(active: boolean, periodMs: number): BoilFrame {
  const [frame, setFrame] = useState<BoilFrame>(1);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(
      () => setFrame((f) => (f === 1 ? 2 : 1)),
      periodMs,
    );
    return () => window.clearInterval(timer);
  }, [active, periodMs]);

  return frame;
}

export function CauldronStationV2() {
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
    // پاتیل خالی: آب گل‌آلود، بدون معجون
    let base = filled
      ? shade(
          mixColors(
            entries.map((e) => ({
              color: ingredientById(e.ingredientId)?.color ?? '#6b6b4a',
              weight: e.quantity,
            })),
          ),
          -0.18,
        )
      : { ...MURKY_WATER };
    if (overprocessed) base = shade(desaturate(base, 0.45), -0.3);
    return {
      surface: rgbString(base),
      light: rgbString(shade(base, 0.28)),
      deep: rgbString(shade(base, -0.4)),
      foam: rgbString(shade(base, 0.5), 0.75),
    };
  }, [entries, filled, ingredientById, overprocessed]);

  const stirGesture = useCircleGesture({
    enabled: filled && !bottled,
    onCircle: () => {
      stir();
      pulse('swirlPulse');
    },
    onActiveChange: setStirring,
  });

  // جوش وقتی معجونی هست و یا هم می‌زنیم یا حرارت بالاست
  const boiling =
    filled && !bottled && (stirring || heat === 'high' || heat === 'medium');
  const period = stirring
    ? BOIL_PERIOD.stir
    : heat === 'high'
      ? BOIL_PERIOD.high
      : BOIL_PERIOD.medium;
  const frame = useBoilFrame(boiling, period);
  const potionSrc = filled
    ? boiling
      ? V2_ART.potionBoil(frame)
      : V2_ART.potionStill
    : undefined;

  const bubble = HEAT_BUBBLE[heat] ?? HEAT_BUBBLE.medium;
  // بازخورد هم‌زدن کاهش‌یابنده است تا Spam تشویق نشود
  const swirlStrength = Math.max(0.22, 1 - stirCount * 0.28);

  return (
    <>
      <div
        data-testid="v2-cauldron"
        className={`cauldron interactive${dropHint ? ' is-target' : ''}${
          dropActive ? ' is-target-active' : ''
        }${stirring ? ' is-stirring' : ''}`}
        style={zoneStyle(V2_ZONES.cauldron)}
        {...stirGesture}
      >
        <ArtLayerV2 src={V2_ART.cauldronEmpty}>
          <div className="cauldron__ph">
            <div className="cauldron__belly" />
            <div className="cauldron__handle cauldron__handle--l" />
            <div className="cauldron__handle cauldron__handle--r" />
            <div className="cauldron__rim" />
          </div>
        </ArtLayerV2>
        <div className="cauldron__halo" />
      </div>

      <div
        data-testid="v2-potion"
        className={`liquid v2-potion${filled ? ' is-filled' : ' is-empty'}${
          overprocessed ? ' is-burnt' : ''
        }${ripe ? ' is-ripe' : ''}${boiling ? ' is-boiling' : ''}`}
        style={{
          ...zoneStyle(V2_ZONES.cauldronPotion),
          ...vars({
            '--liquid': liquid.surface,
            '--liquid-light': liquid.light,
            '--liquid-deep': liquid.deep,
            '--liquid-foam': liquid.foam,
            '--bubble-intensity': filled ? bubble.intensity : 0,
            '--bubble-speed': `${bubble.speed}s`,
            '--swirl': swirlStrength,
          }),
        }}
      >
        <div className="liquid__surface" />
        <div className="liquid__sheen" />
        {/* تصویر معجون؛ tint رنگی زیر و روی آن است تا در هر دو سبک رنگ بگیرد */}
        <ArtLayerV2 src={potionSrc} fit="cover" className="v2-potion__art">
          <div className="v2-potion__ph" />
        </ArtLayerV2>
        <div className="v2-potion__tint" />
        {filled
          ? BUBBLES.map((b, i) => (
              <span
                key={i}
                className="liquid__bubble"
                style={vars({
                  '--b-left': `${b.left}%`,
                  '--b-size': `${b.size}px`,
                  '--b-delay': `${b.delay}s`,
                  '--b-dur': `${b.dur}s`,
                })}
              />
            ))
          : null}
        {ripe ? <div className="liquid__shimmer" /> : null}
        {/* کلید یکتا برای هر ضربان تا انیمیشن یک‌بارمصرف دوباره پخش شود */}
        {swirlPulse > 0 ? <div key={`swirl-${swirlPulse}`} className="liquid__swirl" /> : null}
        {splashPulse > 0 ? (
          <div key={`splash-${splashPulse}`} className="liquid__splash">
            <span />
            <span />
            <span />
          </div>
        ) : null}
      </div>

      {filled ? (
        <div className="steam" style={zoneStyle(V2_ZONES.cauldronPotion, { zIndex: 33 })}>
          {STEAM.map((s, i) => (
            <span
              key={i}
              className="steam__plume"
              style={vars({ '--s-left': `${s.left}%`, '--s-delay': `${s.delay}s` })}
            />
          ))}
        </div>
      ) : null}

      {filled && !bottled && stirCount === 0 ? (
        <div className="hint hint--stir" style={rectStyle(STIR_HINT, 60)}>
          {uiLabels.stirHint}
        </div>
      ) : null}
    </>
  );
}
