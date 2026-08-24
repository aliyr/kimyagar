/**
 * پاتیل — مرکز ادراکی تجربه (بخش ۴.۱).
 *
 * همه‌ی بازخورد فرایند «کیفی» است، نه عددی (بخش ۶.۸):
 * - رنگ مایع = ترکیب وزنی رنگ مواد افزوده‌شده؛
 * - شدت حباب = حرارت فعلی؛
 * - بخار ملایم تا وقتی چیزی داخل پاتیل است؛
 * - درخشش نرم وقتی قدیمی‌ترین Entry به 'ready' رسیده؛
 * - تیره و بی‌رنگ‌شدن + جوشش نامنظم در 'overprocessed'.
 *
 * هم‌زدن: حرکت دایره‌ای روی مایع؛ هر دور یک stir (با بازخورد کاهش‌یابنده).
 */

import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { uiLabels } from '../data/labels';
import { useCircleGesture } from '../gestures';
import { SCENE_ZONES } from './artManifest';
import { PROPS } from './layout';
import { desaturate, mixColors, rgbString, shade } from './colors';
import { ArtLayer, rectStyle, vars, zoneStyle } from './Zone';
import { useUiState } from './uiState';

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
  const ripe = !overprocessed && entries.length > 0 && entries[0].stage === 'ready';

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

      <div
        className={`liquid${filled ? ' is-filled' : ''}${overprocessed ? ' is-burnt' : ''}${
          ripe ? ' is-ripe' : ''
        }`}
        style={{
          ...zoneStyle(SCENE_ZONES.cauldronLiquid),
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
        <ArtLayer src={SCENE_ZONES.cauldronLiquid.img} className="liquid__texture" />
      </div>

      {filled ? (
        <div className="steam" style={zoneStyle(SCENE_ZONES.cauldronLiquid, { zIndex: 33 })}>
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
        <div className="hint hint--stir" style={rectStyle(PROPS.stirHint, 60)}>
          {uiLabels.stirHint}
        </div>
      ) : null}
    </>
  );
}
