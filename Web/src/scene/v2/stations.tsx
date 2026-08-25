/**
 * ایستگاه‌های فرعی صحنه‌ی نسخه ۲ — مالک: Workstream B.
 *
 * منطق هرکدام همان نسخه‌ی کلاسیک است (همان اکشن‌های store، همان ژست‌ها)؛
 * فقط چیدمان از V2_ZONES و تصویرها از V2_ART/ArtLayerV2 می‌آیند تا سبک
 * هنری (flat/pixel) رعایت شود. placeholder ها همان CSS کلاسیک را دوباره
 * استفاده می‌کنند تا صحنه بدون هیچ فایل هنری هم کامل به‌نظر بیاید.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { heatLabels, uiLabels } from '../../data/labels';
import type { HeatLevel } from '../../engine/types';
import { tapProps, useDragSource } from '../../gestures';
import { mixColors, rgbString, shade } from '../colors';
import { HEAT_NOTCHES } from '../layout';
import type { Rect } from '../layout';
import { rectStyle, vars, zoneStyle } from '../Zone';
import { useUiState } from '../uiState';
import { ArtLayerV2, V2_ART, V2_ZONES } from './contracts';

const NICHE_BOTTLES = ['#7c5a2e', '#2ba09a', '#6e1f2e', '#22508f'];

/** اشیای کوچک روی میز در چیدمان v2 (قفسه جای کابینت را گرفته) */
const V2_PROPS = {
  notebook: { x: 1296, y: 560, width: 136, height: 178 },
  ledger: { x: 1096, y: 972, width: 164, height: 92 },
  bucket: { x: 590, y: 958, width: 96, height: 112 },
} satisfies Record<string, Rect>;

// ---------------------------------------------------------------------------
// پس‌زمینه و میز
// ---------------------------------------------------------------------------

export function BackdropV2() {
  return (
    <div className="backdrop" style={zoneStyle(V2_ZONES.background)}>
      <ArtLayerV2 src={V2_ZONES.background.img} fit="cover">
        <div className="backdrop__ph">
          <div className="backdrop__wall" />
          <div className="backdrop__glow" />
          {[0, 1].map((i) => (
            <div key={i} className={`niche niche--${i}`}>
              <div className="niche__inner">
                <div className="niche__shelf" />
                <div className="niche__bottles">
                  {NICHE_BOTTLES.map((c, j) => (
                    <span key={j} style={{ background: c, height: 34 + ((j * 13) % 26) }} />
                  ))}
                </div>
              </div>
            </div>
          ))}
          <div className="backdrop__beam" />
          <div className="backdrop__floor" />
        </div>
      </ArtLayerV2>
    </div>
  );
}

export function WorkTableV2() {
  return (
    <div className="table" style={zoneStyle(V2_ZONES.workTable)}>
      <ArtLayerV2 src={V2_ZONES.workTable.img}>
        <div className="table__ph">
          <div className="table__top" />
          <div className="table__edge" />
          <div className="table__front" />
        </div>
      </ArtLayerV2>
    </div>
  );
}

// ---------------------------------------------------------------------------
// اجاق و اهرم‌های حرارت
// ---------------------------------------------------------------------------

const HEAT_ORDER: HeatLevel[] = ['low', 'medium', 'high'];
const FLAMES = [
  { left: 16, delay: 0 },
  { left: 38, delay: 0.35 },
  { left: 60, delay: 0.7 },
  { left: 78, delay: 0.15 },
];

export function HeatControlV2() {
  const heat = useGameStore((s) => s.brew.currentHeat);
  const setHeat = useGameStore((s) => s.setHeat);

  const cycle = () => setHeat(HEAT_ORDER[(HEAT_ORDER.indexOf(heat) + 1) % HEAT_ORDER.length]);

  return (
    <>
      <div
        className="heat interactive"
        data-heat={heat}
        style={zoneStyle(V2_ZONES.heatSource)}
        {...tapProps(cycle)}
      >
        <ArtLayerV2 src={V2_ZONES.heatSource.states[heat]}>
          <div className="heat__ph">
            <div className="heat__glow" />
            <div className="heat__flames">
              {FLAMES.map((f, i) => (
                <span
                  key={i}
                  className="heat__flame"
                  style={vars({ '--f-left': `${f.left}%`, '--f-delay': `${f.delay}s` })}
                />
              ))}
            </div>
            <div className="heat__log heat__log--a" />
            <div className="heat__log heat__log--b" />
            <div className="heat__embers" />
          </div>
        </ArtLayerV2>
      </div>

      {HEAT_ORDER.map((level, i) => (
        <div
          key={level}
          data-testid={`heat-${level}`}
          data-active={heat === level ? 'true' : undefined}
          className={`notch interactive${heat === level ? ' is-active' : ''}`}
          style={rectStyle(HEAT_NOTCHES[i], 46)}
          {...tapProps(() => setHeat(level))}
        >
          <span className="notch__lever" />
          <span className="notch__label">{heatLabels[level]}</span>
        </div>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// بطری‌ها و نقطه‌ی Bottling
// ---------------------------------------------------------------------------

/** کل زمان انیمیشن ریختن تا باز شدن پاسخ مشتری */
const POUR_MS = 2300;

export function BottleStationV2() {
  const canBottle = useGameStore((s) => s.brew.entries.length > 0 && !s.brew.bottled);
  const bottleBrew = useGameStore((s) => s.bottleBrew);
  const entries = useGameStore((s) => s.brew.entries);
  const ingredientById = useGameStore((s) => s.ingredientById);
  const carrying = useUiState((s) => s.drag?.kind === 'bottle');
  const over = useUiState((s) => s.drag?.kind === 'bottle' && s.drag.over === 'bottling');
  const pouring = useUiState((s) => s.pouring);
  const setPouring = useUiState((s) => s.setPouring);
  const pourTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(pourTimer.current), []);

  // رنگ معجونی که در بطری ریخته می‌شود = همان رنگ مایع پاتیل
  const liquid = useMemo(() => {
    const base = shade(
      mixColors(
        entries.map((e) => ({
          color: ingredientById(e.ingredientId)?.color ?? '#6b6b4a',
          weight: e.quantity,
        })),
      ),
      -0.18,
    );
    return { surface: rgbString(base), light: rgbString(shade(base, 0.28)) };
  }, [entries, ingredientById]);

  const startPour = () => {
    bottleBrew();
    setPouring(true);
    pourTimer.current = window.setTimeout(() => {
      setPouring(false);
      const store = useGameStore.getState();
      // اگر در این فاصله Reset شده باشد، نتیجه‌ای برای نمایش نیست
      if (store.result) {
        store.openOverlayAction('result');
        store.deliver();
      }
    }, POUR_MS);
  };

  const drag = useDragSource({
    kind: 'bottle',
    targets: ['bottling'],
    draggable: !pouring,
    onDrop: (target) => {
      if (target === 'bottling' && canBottle && !pouring) startPour();
    },
  });

  const lifted = carrying || pouring;

  return (
    <>
      <div
        className={`shelf v2-bottle-shelf${lifted ? ' is-lifted' : ''}`}
        style={zoneStyle(V2_ZONES.bottleShelf)}
      >
        <ArtLayerV2 src={V2_ART.bottleEmpty}>
          <>
            <div className="shelf__ph">
              <div className="shelf__crate" />
              <div className="shelf__straw" />
            </div>
            <div className="bottle bottle--back-a">
              <span className="bottle__cork" />
              <span className="bottle__glass" />
            </div>
            <div className="bottle bottle--back-b">
              <span className="bottle__cork" />
              <span className="bottle__glass" />
            </div>
            <div className={`bottle bottle--front${lifted ? ' is-lifted' : ''}`}>
              <span className="bottle__cork" />
              <span className="bottle__glass" />
              <span className="bottle__gloss" />
            </div>
          </>
        </ArtLayerV2>
        {/* هیت‌باکس برداشتن بطری — چه هنر آمده باشد چه placeholder */}
        <div
          data-testid="bottle-empty"
          className="v2-bottle-grab interactive"
          {...drag}
        />
      </div>

      <div
        data-testid="bottling-point"
        className={`bottling${carrying ? ' is-target' : ''}${over ? ' is-target-active' : ''}${
          canBottle ? ' is-ready' : ''
        }`}
        style={zoneStyle(V2_ZONES.bottlingPoint)}
      >
        <div className="bottling__aura" />
        <div className="bottling__stand">
          <span className="bottling__ring" />
          <span className="bottling__post" />
          <span className="bottling__base" />
        </div>
        <div className="bottling__spout" />
        <span className="bottling__label">{uiLabels.bottleAction}</span>
      </div>

      {/* انیمیشن ریختن — بالای Vignette مکث تا در تاریکی صحنه هم دیده شود */}
      {pouring ? (
        <div
          className="pour"
          data-testid="pouring"
          style={{
            ...zoneStyle(V2_ZONES.bottlingPoint, { zIndex: 85 }),
            ...vars({ '--liquid': liquid.surface, '--liquid-light': liquid.light }),
          }}
        >
          <div className="pour__ladle">
            <span className="pour__ladle-handle" />
            <span className="pour__ladle-cup" />
          </div>
          <div className="pour__stream" />
          <div className="pour__bottle">
            <ArtLayerV2 src={V2_ART.bottleEmpty}>
              <span className="pour__bottle-ph" />
            </ArtLayerV2>
            <div className="pour__fill" />
          </div>
          <div className="pour__glow" />
        </div>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// پیشخوان و مشتری
// ---------------------------------------------------------------------------

const APPEARANCE_STATES = V2_ZONES.customer.states as Record<string, string | undefined>;

export function CustomerAreaV2() {
  const customer = useGameStore((s) => s.currentCustomer());
  const appearance = customer.appearance;

  return (
    <>
      <div
        data-testid="customer"
        className="customer"
        data-appearance={appearance}
        style={zoneStyle(V2_ZONES.customer)}
      >
        <ArtLayerV2 key={appearance} src={APPEARANCE_STATES[appearance]}>
          <div className="customer__ph">
            <span className="customer__drape" />
            <span className="customer__body" />
            <span className="customer__head" />
            <span className="customer__rim" />
          </div>
        </ArtLayerV2>
      </div>

      <div className="counter" style={zoneStyle(V2_ZONES.customerCounter)}>
        <ArtLayerV2 src={V2_ZONES.customerCounter.img}>
          <div className="counter__ph">
            <div className="counter__slab" />
            <div className="counter__front" />
            <div className="counter__scale" />
          </div>
        </ArtLayerV2>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// کاغذ سفارش
// ---------------------------------------------------------------------------

export function GoalNoteV2() {
  const customer = useGameStore((s) => s.currentCustomer());
  const openOverlay = useGameStore((s) => s.openOverlayAction);

  return (
    <div
      data-testid="goal-note"
      className="note interactive"
      style={zoneStyle(V2_ZONES.goalNote)}
      {...tapProps(() => openOverlay('customer_request'))}
    >
      <ArtLayerV2 src={V2_ZONES.goalNote.img} fit="cover">
        <div className="note__paper" />
      </ArtLayerV2>
      <div className="note__content">
        <span className="note__who">{customer.nameFa}</span>
        <span className="note__summary">{customer.summaryFa}</span>
      </div>
      <span className="note__pin" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// اشیای کوچک میز: دفترچه، دسته‌کاغذ فرایند، سطل خالی‌کردن
// ---------------------------------------------------------------------------

export function TablePropsV2() {
  const openOverlay = useGameStore((s) => s.openOverlayAction);
  const resetBrew = useGameStore((s) => s.resetBrew);
  const hasBrew = useGameStore((s) => s.brew.entries.length > 0 || s.mortar !== null);

  return (
    <>
      <div
        data-testid="notebook-button"
        className="notebook interactive"
        title={uiLabels.notebook}
        style={rectStyle(V2_PROPS.notebook, 45)}
        {...tapProps(() => openOverlay('notebook'))}
      >
        <span className="notebook__cover">
          <span className="notebook__band" />
          <span className="notebook__title">{uiLabels.notebook}</span>
        </span>
        <span className="notebook__pages" />
      </div>

      <div
        data-testid="history-button"
        className="ledger interactive"
        title={uiLabels.processHistory}
        style={rectStyle(V2_PROPS.ledger, 45)}
        {...tapProps(() => openOverlay('process_history'))}
      >
        <span className="ledger__sheet ledger__sheet--c" />
        <span className="ledger__sheet ledger__sheet--b" />
        <span className="ledger__sheet ledger__sheet--a">
          <span className="ledger__lines" />
        </span>
      </div>

      <div
        data-testid="reset-button"
        className={`bucket interactive${hasBrew ? ' is-live' : ''}`}
        title={uiLabels.resetBrew}
        style={rectStyle(V2_PROPS.bucket, 45)}
        {...tapProps(resetBrew)}
      >
        <span className="bucket__body" />
        <span className="bucket__band bucket__band--top" />
        <span className="bucket__band bucket__band--bottom" />
        <span className="bucket__handle" />
      </div>
    </>
  );
}
