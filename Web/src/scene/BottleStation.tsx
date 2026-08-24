/**
 * سبد بطری‌های خالی و نقطه‌ی Bottling کنار پاتیل.
 *
 * بخش ۶.۱۱: بطری خالی را به نقطه‌ی Bottling می‌کشیم؛ تا پیش از Drop قابل لغو
 * است. Drop، Brew را نهایی می‌کند و انیمیشن ریختن معجون در بطری پخش می‌شود؛
 * بعد از پر شدن بطری، نتیجه و پاسخ مشتری (راضی یا ناراضی) نمایان می‌شود.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { uiLabels } from '../data/labels';
import { useDragSource } from '../gestures';
import { SCENE_ZONES } from './artManifest';
import { mixColors, rgbString, shade } from './colors';
import { useArt, vars, zoneStyle } from './Zone';
import { useUiState } from './uiState';

/** کل زمان انیمیشن ریختن تا باز شدن پاسخ مشتری */
const POUR_MS = 2300;

export function BottleStation() {
  const canBottle = useGameStore((s) => s.brew.entries.length > 0 && !s.brew.bottled);
  const bottleBrew = useGameStore((s) => s.bottleBrew);
  const entries = useGameStore((s) => s.brew.entries);
  const ingredientById = useGameStore((s) => s.ingredientById);
  const carrying = useUiState((s) => s.drag?.kind === 'bottle');
  const over = useUiState((s) => s.drag?.kind === 'bottle' && s.drag.over === 'bottling');
  const pouring = useUiState((s) => s.pouring);
  const setPouring = useUiState((s) => s.setPouring);
  const art = useArt(SCENE_ZONES.bottleShelf.img);
  const pourBottleArt = useArt('bottles/bottle_empty.png');
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

  return (
    <>
      {/*
        وقتی هنر بطری آمده، خودِ تصویر بطریِ قابل‌برداشتن است و فقط یک هیت‌باکس
        روی آن می‌گذاریم؛ در غیر این صورت بطری‌های CSS رسم می‌شوند.
      */}
      <div
        className={`shelf${carrying || pouring ? ' is-lifted' : ''}`}
        style={zoneStyle(SCENE_ZONES.bottleShelf)}
      >
        {art.node}
        {art.loaded ? null : (
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
          </>
        )}
        <div
          data-testid="bottle-empty"
          className={`bottle bottle--front interactive${art.loaded ? ' is-art' : ''}${
            carrying || pouring ? ' is-lifted' : ''
          }`}
          {...drag}
        >
          {art.loaded ? null : (
            <>
              <span className="bottle__cork" />
              <span className="bottle__glass" />
              <span className="bottle__gloss" />
            </>
          )}
        </div>
      </div>

      <div
        data-testid="bottling-point"
        className={`bottling${carrying ? ' is-target' : ''}${over ? ' is-target-active' : ''}${
          canBottle ? ' is-ready' : ''
        }`}
        style={zoneStyle(SCENE_ZONES.bottlingPoint)}
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
            ...zoneStyle(SCENE_ZONES.bottlingPoint, { zIndex: 85 }),
            ...vars({ '--liquid': liquid.surface, '--liquid-light': liquid.light }),
          }}
        >
          <div className="pour__ladle">
            <span className="pour__ladle-handle" />
            <span className="pour__ladle-cup" />
          </div>
          <div className="pour__stream" />
          <div className="pour__bottle">
            {pourBottleArt.node}
            {pourBottleArt.loaded ? null : (
              <span className="pour__bottle-ph" />
            )}
            <div className="pour__fill" />
          </div>
          <div className="pour__glow" />
        </div>
      ) : null}
    </>
  );
}
