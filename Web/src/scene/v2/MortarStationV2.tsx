/**
 * هاون v2 — مالک: Workstream A.
 *
 * رندر لایه‌ای (عقب → جلو):
 *   1. mortar_back  — داخل کاسه، همیشه.
 *   2. contents_{units}_{raw|ground} — وقتی هاون محتوا دارد (placeholder: تپه‌ی
 *      رنگی که ارتفاعش با تعداد واحد بالا می‌رود).
 *   3. دیواره‌ی جلویی mortar_front — وقتی محتوا هست opacity: 0.5 می‌شود تا
 *      «داخل هاون» دیده شود (transition نرم ~۲۰۰ms).
 *   4. کوبه — ۳ فریم که هنگام کوبیدن با ~۱۲۰ms چرخه می‌شوند + لرزش CSS.
 *
 * تعامل‌ها:
 *   - Drop شیشه از قفسه ⇒ ShelfStation خودش addUnitToMortar را صدا می‌زند؛
 *     اگر هاون پُر باشد از طریق bumpMortarShake اینجا لرزش پخش می‌شود.
 *   - کوبیدن: useGrindGesture → applyGrindWork (همان آستانه‌های کلاسیک).
 *   - پس از کوبیده‌شدن، محتوای هاون منبع Drag به مقصد 'cauldron' است
 *     (addMortarToCauldron) — بدون ظرف‌های سهم‌بندی کلاسیک.
 *   - قلم‌مو: خالی کردن هاون (clearMortar).
 */

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { useGameStore } from '../../store/gameStore';
import type { GrindState } from '../../engine/types';
import { grindLabels, uiLabels } from '../../data/labels';
import { tapProps, useDragSource, useGrindGesture } from '../../gestures';
import { useUiState } from '../uiState';
import { vars } from '../Zone';
import { ArtLayerV2, V2_ART, V2_ZONES, artUrlV2, useArtStyle } from './contracts';
import './shelf-mortar.css';

const ZONE = V2_ZONES.mortar;
/** سرعت چرخه‌ی فریم‌های کوبه هنگام آسیاب */
const PESTLE_FRAME_MS = 120;
/** طول انیمیشن لرزش «هاون پُر است» — با v2-shake در CSS هماهنگ */
const SHAKE_MS = 450;
const UNIT_LABEL_FA: Record<1 | 2 | 3, string> = {
  1: '۱ واحد',
  2: '۲ واحد',
  3: '۳ واحد',
};

/** پالس لرزش هاون — بیرون از gameStore چون فقط جلوه‌ی UI است */
interface MortarFxState {
  shakePulse: number;
  bumpShake: () => void;
}
const useMortarFx = create<MortarFxState>((set) => ({
  shakePulse: 0,
  bumpShake: () => set((s) => ({ shakePulse: s.shakePulse + 1 })),
}));

/**
 * ShelfStation هنگام Drop روی هاونی که همین ماده را با سقف ۳ واحد دارد
 * صدا می‌زند تا لرزش «جا ندارد» پخش شود (store خودش افزودن را نادیده می‌گیرد).
 */
export function bumpMortarShake(): void {
  useMortarFx.getState().bumpShake();
}

export function MortarStationV2() {
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
  const setGrinding = useUiState((s) => s.setGrinding);
  const pulse = useUiState((s) => s.pulse);

  const shakePulse = useMortarFx((s) => s.shakePulse);
  const [shaking, setShaking] = useState(false);

  const artStyle = useArtStyle();
  /** فریم فعلی کوبه؛ در حالت سکون همیشه ۱ */
  const [pestleFrame, setPestleFrame] = useState<1 | 2 | 3>(1);
  /** فریم ۱ بار شده ⇒ هنر کوبه موجود است و placeholder لازم نیست */
  const [pestleArtOk, setPestleArtOk] = useState(false);

  const grindState: GrindState | null = mortar?.grindState ?? null;
  const ready = grindState !== null;
  const units: 0 | 1 | 2 | 3 = mortar
    ? (Math.min(3, Math.max(1, Math.round(mortar.quantity))) as 1 | 2 | 3)
    : 0;

  // لرزش «هاون پُر است» — با هر پالس یک‌بار پخش می‌شود
  useEffect(() => {
    if (shakePulse === 0) return;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), SHAKE_MS);
    return () => clearTimeout(t);
  }, [shakePulse]);

  // چرخه‌ی فریم‌های کوبه فقط هنگام کوبیدن؛ در سکون فریم ۱
  useEffect(() => {
    if (!grinding) {
      setPestleFrame(1);
      return;
    }
    const id = setInterval(
      () => setPestleFrame((f) => ((f % 3) + 1) as 1 | 2 | 3),
      PESTLE_FRAME_MS,
    );
    return () => clearInterval(id);
  }, [grinding]);

  // با عوض‌شدن سبک هنری، فایل‌ها عوض می‌شوند و باید دوباره بار شوند
  useEffect(() => {
    setPestleArtOk(false);
  }, [artStyle]);

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

  const pestleImgClass = `zone-art zone-art--contain${
    artStyle === 'pixel' ? ' zone-art--pixelated' : ''
  }`;

  return (
    <div
      data-testid="v2-mortar"
      className={`v2-mortar${dropHint ? ' is-target' : ''}${
        dropActive ? ' is-target-active' : ''
      }${grinding ? ' is-grinding' : ''}${shaking ? ' is-shake' : ''}`}
      style={{
        position: 'absolute',
        left: ZONE.x,
        top: ZONE.y,
        width: ZONE.width,
        height: ZONE.height,
        zIndex: ZONE.z,
        ...vars({ '--ing-color': ingredient?.color ?? '#8a7a52' }),
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* ۱) داخل کاسه (لایه‌ی عقب) */}
      <div className="v2-mortar__layer v2-mortar__back">
        <ArtLayerV2 src={V2_ART.mortarBack}>
          <span className="v2-mortar__back-ph">
            <span className="v2-mortar__inner-wall" />
            <span className="v2-mortar__cavity" />
          </span>
        </ArtLayerV2>
      </div>

      {/* ۲) محتوا — پشت دیواره‌ی جلویی، جلوی لایه‌ی عقب */}
      {mortar && units > 0 ? (
        <div
          className="v2-mortar__layer v2-mortar__contents"
          data-units={units}
          data-ground={ready}
        >
          <ArtLayerV2 src={V2_ART.mortarContents(units as 1 | 2 | 3, ready)}>
            <span className="v2-mortar__heap" />
          </ArtLayerV2>
        </div>
      ) : null}

      {/* ۳) دیواره‌ی بیرونی جلو — با محتوا نیمه‌شفاف می‌شود تا داخل دیده شود */}
      <div className={`v2-mortar__layer v2-mortar__front${units > 0 ? ' is-xray' : ''}`}>
        <ArtLayerV2 src={V2_ART.mortarFront}>
          <span className="v2-mortar__front-ph">
            <span className="v2-mortar__foot" />
            <span className="v2-mortar__wall" />
          </span>
        </ArtLayerV2>
      </div>

      {/* ۴) کوبه — ۳ فریم پیش‌بارشده؛ فریم فعال دیده می‌شود */}
      <div
        data-testid="v2-pestle"
        className={`v2-pestle interactive${pestleArtOk ? ' is-art' : ''}${
          mortar ? ' is-usable' : ''
        }${grinding ? ' is-grinding' : ''}`}
        {...grind}
      >
        {([1, 2, 3] as const).map((f) => (
          <img
            key={`${artStyle}/${f}`}
            className={pestleImgClass}
            style={{ opacity: pestleArtOk && pestleFrame === f ? 1 : 0 }}
            src={artUrlV2(artStyle, V2_ART.pestleFrame(f))}
            alt=""
            draggable={false}
            onLoad={f === 1 ? () => setPestleArtOk(true) : undefined}
            onError={f === 1 ? () => setPestleArtOk(false) : undefined}
          />
        ))}
        {pestleArtOk ? null : (
          <span className="v2-pestle__ph">
            <span className="v2-pestle__rod" />
            <span className="v2-pestle__head" />
          </span>
        )}
      </div>

      {/* دهانه‌ی کاسه: پس از کوبیدن، منبع Drag به پاتیل */}
      {ready ? (
        <div
          data-testid="v2-mortar-grab"
          className="v2-mortar__grab interactive"
          aria-label="برداشتن محتوای هاون"
          {...carry}
        />
      ) : null}

      {/* هاله‌ی مقصد Drop برای شیشه‌ی در دست */}
      <div className="v2-mortar__ring" />

      {/* نشانگر واحدها + وضعیت کوبش */}
      {mortar && units > 0 ? (
        <div data-testid="v2-mortar-units" className="v2-mortar__units">
          <span className="v2-mortar__pips">
            {([1, 2, 3] as const).map((n) => (
              <span
                key={n}
                className={`v2-mortar__pip${units >= n ? ' is-filled' : ''}`}
              />
            ))}
          </span>
          <span className="v2-mortar__units-text">
            {UNIT_LABEL_FA[units as 1 | 2 | 3]}
            {grindState ? ` · ${grindLabels[grindState]}` : ''}
          </span>
        </div>
      ) : null}

      {/* راهنمای کوبیدن تا وقتی ماده هنوز خام است */}
      {mortar && !ready ? (
        <div className="v2-mortar__hint">{uiLabels.grindHint}</div>
      ) : null}

      {/* قلم‌مو: خالی کردن هاون (بی‌هزینه) */}
      {mortar && !carryingGround ? (
        <div
          data-testid="v2-mortar-clear"
          className="v2-mortar__brush interactive"
          title="خالی کردن هاون"
          {...tapProps(clearMortar)}
        >
          <span className="v2-brush__handle" />
          <span className="v2-brush__ferrule" />
          <span className="v2-brush__bristles" />
        </div>
      ) : null}
    </div>
  );
}
