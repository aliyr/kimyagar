/**
 * ایستگاه هاون — نسخه‌ی لایه‌ای کلاسیک (هم‌قرارداد با v2):
 *
 * - هر درگ-اند-دراپ شیشه از قفسه = ۱ واحد (تا سقف ۳)؛ ظرف‌های سهم‌بندی حذف شدند.
 * - رندر لایه‌ای روی بوم مشترک (CLASSIC_ART.mortar) در همان Rect و همان
 *   object-fit تا پیکسل‌به‌پیکسل هم‌تراز بمانند:
 *     ۱) mortar_back  ۲) contents_{units}_{raw|ground} با tint رنگ ماده
 *     ۳) mortar_front — با محتوا opacity ~۰٫۵ تا داخل کاسه دیده شود.
 * - کوبه بالای همه‌ی لایه‌ها (همیشه قابل لمس)؛ سرش داخل دهانه. هنگام کوبیدن
 *   فریم‌ها با چرخه‌ی ۱→۲→۳→۲→۱ (هر ~۱۱۰ms) عوض می‌شوند.
 * - پالس mortarShakePulse (Drop روی هاونِ پر) ⇒ لرزش کوتاه + «جا ندارد».
 */

import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { grindLabels, uiLabels } from '../data/labels';
import { tapProps, useDragSource, useGrindGesture } from '../gestures';
import { CLASSIC_ART, SCENE_ZONES, artUrl } from './artManifest';
import { PROPS } from './layout';
import { ArtLayer, rectStyle, vars } from './Zone';
import { useUiState } from './uiState';
import './classic-stations.css';

const Z = SCENE_ZONES.mortar.z;
/**
 * پنل کابینتِ باز (z=40) جلوی هاون می‌ایستد؛ وقتی شیشه‌ای در دست است کل
 * ایستگاه بالا می‌آید تا مقصد Drop دیده شود (رفتار قبلی حفظ شده).
 */
const LIFT = 25;

/**
 * Rect کوبه — ثابت محلی چون layout.ts فریز است. فریم‌های pestle_{1..3} بوم
 * مشترک 654×736 دارند (چرخش پخته‌شده)؛ مرکز همان PROPS.pestle قدیمی است تا
 * سرِ کوبه داخل دهانه بماند و دسته رو به بالا-راست.
 */
const PESTLE_RECT = { x: 346, y: 488, width: 204, height: 230 };
/** چرخه‌ی پینگ‌پنگ فریم‌ها هنگام کوبیدن: ۱→۲→۳→۲→۱→… */
const PESTLE_SEQ = [1, 2, 3, 2] as const;
const PESTLE_FRAME_MS = 110;
/** طول لرزش «جا ندارد» — هماهنگ با cst-shake در CSS */
const SHAKE_MS = 420;

/** ذرات گردی که هنگام کوبیدن از دهانه بلند می‌شوند */
const DUST = [
  { left: 34, delay: 0, dur: 0.8, size: 9 },
  { left: 48, delay: 0.25, dur: 0.95, size: 12 },
  { left: 61, delay: 0.5, dur: 0.7, size: 8 },
  { left: 42, delay: 0.65, dur: 0.85, size: 7 },
];

export function MortarStation() {
  const mortar = useGameStore((s) => s.mortar);
  const ingredient = useGameStore((s) =>
    s.mortar ? s.ingredientById(s.mortar.ingredientId) : undefined,
  );
  const applyGrindWork = useGameStore((s) => s.applyGrindWork);
  const clearMortar = useGameStore((s) => s.clearMortar);
  const addMortarToCauldron = useGameStore((s) => s.addMortarToCauldron);

  const grinding = useUiState((s) => s.grinding);
  const dropHint = useUiState((s) => s.drag?.kind === 'jar');
  const dropActive = useUiState((s) => s.drag?.kind === 'jar' && s.drag.over === 'mortar');
  const carryingGround = useUiState((s) => s.drag?.kind === 'ground');
  const mortarShakePulse = useUiState((s) => s.mortarShakePulse);
  const setGrinding = useUiState((s) => s.setGrinding);
  const pulse = useUiState((s) => s.pulse);

  const grindState = mortar?.grindState ?? null;
  const ready = grindState !== null;
  /** در کلاسیک فقط ۱..۳ می‌آید؛ برای اطمینان clamp می‌کنیم */
  const units = mortar
    ? (Math.min(3, Math.max(1, Math.round(mortar.quantity))) as 1 | 2 | 3)
    : 0;
  const z = dropHint ? Z + LIFT : Z;

  /** ایندکس گام در چرخه‌ی پینگ‌پنگ کوبه؛ در سکون همیشه فریم ۱ */
  const [pestleStep, setPestleStep] = useState(0);
  const [pestleArtOk, setPestleArtOk] = useState(false);
  const [shaking, setShaking] = useState(false);

  // چرخه‌ی فریم‌ها فقط هنگام کوبیدن
  useEffect(() => {
    if (!grinding) {
      setPestleStep(0);
      return;
    }
    const id = window.setInterval(
      () => setPestleStep((s) => (s + 1) % PESTLE_SEQ.length),
      PESTLE_FRAME_MS,
    );
    return () => window.clearInterval(id);
  }, [grinding]);

  // لرزش «جا ندارد» — با هر پالس یک‌بار پخش می‌شود (پالس از ایجنت قفسه)
  useEffect(() => {
    if (mortarShakePulse === 0) return;
    setShaking(true);
    const t = window.setTimeout(() => setShaking(false), SHAKE_MS);
    return () => window.clearTimeout(t);
  }, [mortarShakePulse]);

  const pestleFrame = grinding ? PESTLE_SEQ[pestleStep] : 1;

  const grind = useGrindGesture({
    enabled: mortar !== null,
    onWork: applyGrindWork,
    onStroke: () => pulse('pourPulse'),
    onActiveChange: setGrinding,
  });

  const carry = useDragSource({
    kind: 'ground',
    ingredientId: mortar?.ingredientId,
    targets: ['cauldron'],
    draggable: ready,
    onDrop: (target) => {
      if (target !== 'cauldron') return;
      addMortarToCauldron();
      pulse('splashPulse');
    },
  });

  const contentsSrc =
    units === 0 ? undefined : artUrl(CLASSIC_ART.mortar.contents(units, ready ? 'ground' : 'raw'));

  return (
    <>
      <div
        data-testid="mortar"
        data-mortar-units={mortar?.quantity ?? 0}
        className={`cst-mortar${dropHint ? ' is-target' : ''}${
          dropActive ? ' is-target-active' : ''
        }${shaking ? ' is-shake' : ''}`}
        style={{
          ...rectStyle(SCENE_ZONES.mortar, z),
          ...vars({ '--ing-color': ingredient?.color ?? '#8a7a52' }),
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        {/* ۱) بدنه‌ی کامل (پشت محتوا) */}
        <ArtLayer src={CLASSIC_ART.mortar.back}>
          <div className="cst-mortar__ph" />
        </ArtLayer>

        {/* ۲) محتوا: لایه‌ی رنگ mask شده + بافت luminosity؛ منبع Drag پس از کوبیدن */}
        {mortar && contentsSrc ? (
          <div
            // قرارداد e2e: «mortar-contents» فقط وقتی ماده کوبیده و قابل درگ است
            data-testid={ready ? 'mortar-contents' : 'mortar-contents-raw'}
            data-grind={grindState ?? 'whole'}
            className={`cst-contents interactive${ready ? ' is-ready' : ''}${
              grinding ? ' is-shaking' : ''
            }`}
            {...carry}
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
        <div className={`cst-mortar__front${mortar ? ' is-xray' : ''}`}>
          <ArtLayer src={CLASSIC_ART.mortar.front} />
        </div>

        <div className="cst-mortar__glow" />
        {shaking ? <div className="cst-mortar__noroom">جا ندارد!</div> : null}
      </div>

      {/* کوبه — بالای دیواره‌ی جلو تا همیشه دیده و لمس شود؛ سرش داخل دهانه */}
      <div
        data-testid="pestle"
        className={`cst-pestle interactive${mortar ? ' is-usable' : ''}${
          grinding ? ' is-grinding' : ''
        }`}
        style={rectStyle(PESTLE_RECT, z + 3)}
        {...grind}
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

      {/* قلم‌مو: خالی کردن هاون پیش از افزودن (بی‌هزینه) */}
      {mortar && !carryingGround ? (
        <div
          className="brush interactive"
          title="خالی کردن هاون"
          style={rectStyle(PROPS.brush, z + 1)}
          {...tapProps(clearMortar)}
        >
          <span className="brush__handle" />
          <span className="brush__ferrule" />
          <span className="brush__bristles" />
        </div>
      ) : null}

      {mortar ? (
        <div className="mortar-label" style={rectStyle(PROPS.mortarLabel, z + 2)}>
          {grindState ? (
            <span className="mortar-label__state">{grindLabels[grindState]}</span>
          ) : (
            <span className="mortar-label__hint">{uiLabels.grindHint}</span>
          )}
        </div>
      ) : null}
    </>
  );
}
