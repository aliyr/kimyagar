/**
 * توالی بطری‌کردن و تحویل (کلاسیک، بدون Drag).
 *
 * شروع از CauldronStation: Tap روی پاتیلِ پر ⇒ bottleBrew() + setPour('tilt').
 * از اینجا این کامپوننت زمان‌بندی را پیش می‌برد و فاز را در uiState.pour می‌نویسد:
 *   tilt    (۰٫۵ث): پاتیل (PNG + Canvas، در ClassicCauldronFx) به‌سمت شیشه کج می‌شود و
 *                    هم‌زمان «همان» شیشه‌ی خالی روی میز برداشته می‌شود و زیر لبه می‌رود
 *                    (شیشه‌ی تزئینی میز پنهان می‌شود؛ هیچ شیشه‌ای از هوا نمی‌آید).
 *   stream  (۱٫۲ث): جریان مایع از لبه‌ی پاتیل به دهانه‌ی شیشه؛ شیشه پر می‌شود.
 *   deliver (۱٫۰ث): شیشه‌ی پر روی پیشخوان تا جلوی مشتری سُر می‌خورد.
 *   ⇒ openOverlayAction('result') + deliver(). سپس شیشه‌ی خالی تازه‌ای روی میز ظاهر می‌شود.
 *
 * Reset در میانه (سطل) ایمن است: bottled که false شد، تایمرها لغو و فاز null.
 * لایه‌ی انیمیشن بالای Vignette مکث (z=85) است تا در تاریکی صحنه هم دیده شود.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { SCENE_ZONES, artUrl } from './artManifest';
import { mixColors, rgbString, shade } from './colors';
import { CLASSIC_MOUTH, CLASSIC_POT_BASE } from './classicCauldronGeometry';
import { rectStyle, useArt, vars, zoneStyle } from './Zone';
import { useUiState } from './uiState';
import { sfx } from '../audio/sfx';
import { haptic } from '../platform/haptics';
import './classic-stations.css';

const TILT_MS = 500;
const STREAM_MS = 1200;
const DELIVER_MS = 1000;
/** کج‌شدن پاتیل در ClassicCauldronFx (باید با POUR_TILT_DEG آن‌جا هم‌خوان بماند) */
const TILT_DEG = 11;

/** نقطه‌ی لبه‌ی راست دهانه پس از چرخش TILT_DEG حول پایه‌ی پاتیل */
function tiltedRimPoint(): { x: number; y: number } {
  const a = (TILT_DEG * Math.PI) / 180;
  const rx = CLASSIC_MOUTH.x + CLASSIC_MOUTH.rx * 0.92 - CLASSIC_POT_BASE.x;
  const ry = CLASSIC_MOUTH.y - CLASSIC_POT_BASE.y;
  return {
    x: CLASSIC_POT_BASE.x + rx * Math.cos(a) - ry * Math.sin(a),
    y: CLASSIC_POT_BASE.y + rx * Math.sin(a) + ry * Math.cos(a),
  };
}

const RIM = tiltedRimPoint();
/** شیشه‌ی خالی روی میز — همان که برداشته می‌شود (اندازه‌ی شیشه در همه‌ی فازها همین است) */
const SHELF = SCENE_ZONES.bottleShelf;
/** جای شیشه هنگام پر شدن — در هوا، زیر لبه‌ی راست پاتیلِ کج‌شده (دهانه ~۳۰px زیر لبه) */
const BOTTLE_RECT = { x: Math.round(RIM.x + 28 - SHELF.width / 2), y: Math.round(RIM.y + 30), width: SHELF.width, height: SHELF.height };
/** جای شیشه جلوی مشتری روی سطح پیشخوان (تخته‌ی بالای پیشخوان ≈ ۱۰..۱۰۵ از ۶۲۰ px تصویر) */
const COUNTER = SCENE_ZONES.customerCounter;
const COUNTER_SURFACE_Y = Math.round(COUNTER.y + (COUNTER.height * 72) / 620);
const COUNTER_SPOT = { x: 1560, y: COUNTER_SURFACE_Y - 196, width: 120, height: 200 };

export function BottlingSequence() {
  const entries = useGameStore((s) => s.brew.entries);
  const bottled = useGameStore((s) => s.brew.bottled);
  const ingredientById = useGameStore((s) => s.ingredientById);
  const pour = useUiState((s) => s.pour);
  const setPour = useUiState((s) => s.setPour);
  const shelfArt = useArt(SCENE_ZONES.bottleShelf.img);
  /** شیشه‌ی متحرک: بی‌در هنگام برداشتن/پرشدن، با چوب‌پنبه (پُق!) هنگام تحویل */
  const openArt = useArt('bottles/bottle_open.png', { className: 'cst-pour__glass cst-pour__glass--open' });
  const corkedArt = useArt('bottles/bottle_empty.png', { className: 'cst-pour__glass cst-pour__glass--corked' });
  const timers = useRef<number[]>([]);

  // رنگ معجونی که در شیشه ریخته می‌شود = همان رنگ مایع پاتیل
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
    return { surface: rgbString(base), light: rgbString(shade(base, 0.28)), deep: rgbString(shade(base, -0.35)) };
  }, [entries, ingredientById]);

  const clearTimers = () => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };

  // زمان‌بندی فازها — با ورود به 'tilt' شروع می‌شود؛ تایمرها در ref می‌مانند تا
  // تغییر فاز به stream/deliver آن‌ها را لغو نکند (لغو فقط با Reset یا unmount)
  useEffect(() => {
    if (pour !== 'tilt') return;
    clearTimers();
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    at(TILT_MS, () => {
      setPour('stream');
      sfx.pour(STREAM_MS / 1000);
    });
    at(TILT_MS + STREAM_MS, () => {
      setPour('deliver');
      sfx.cork();
      haptic('light');
    });
    at(TILT_MS + STREAM_MS + DELIVER_MS, () => {
      const store = useGameStore.getState();
      sfx.deliver();
      haptic('heavy');
      setPour(null);
      // اگر در این فاصله Reset شده باشد، نتیجه‌ای برای نمایش نیست
      if (store.result) {
        store.openOverlayAction('result');
        store.deliver();
      }
    });
  }, [pour, setPour]);

  // Reset میانه‌ی راه ⇒ لغو
  useEffect(() => {
    if (!bottled && pour !== null) {
      clearTimers();
      setPour(null);
    }
  }, [bottled, pour, setPour]);

  useEffect(() => clearTimers, []);

  // شیشه‌ی بی‌در فقط هنگام ریختن mount می‌شود؛ از پیش بار شود تا اولین ریختن پرش نداشته باشد
  useEffect(() => {
    if (typeof Image === 'undefined') return;
    const img = new Image();
    img.src = artUrl('bottles/bottle_open.png');
  }, []);

  const rim = RIM;
  const mouth = { x: BOTTLE_RECT.x + BOTTLE_RECT.width / 2, y: BOTTLE_RECT.y + 10 };
  const streamPath = `M ${rim.x} ${rim.y} Q ${rim.x + 22} ${rim.y + 4} ${(rim.x + mouth.x) / 2} ${(rim.y + mouth.y) / 2} T ${mouth.x} ${mouth.y}`;

  const delivering = pour === 'deliver';
  const bottleRect = delivering ? COUNTER_SPOT : BOTTLE_RECT;

  return (
    <>
      {/* شیشه‌ی خالی روی میز کنار پاتیل؛ هنگام ریختن «برداشته» می‌شود (پنهان) */}
      <div
        className={`shelf cst-shelf-bottle${pour !== null ? ' is-taken' : ''}`}
        data-testid="shelf-bottle"
        style={zoneStyle(SCENE_ZONES.bottleShelf)}
      >
        {shelfArt.node}
        {shelfArt.loaded ? null : (
          <>
            <div className="shelf__ph">
              <div className="shelf__crate" />
              <div className="shelf__straw" />
            </div>
            <div className="bottle bottle--back-a">
              <span className="bottle__cork" />
              <span className="bottle__glass" />
            </div>
            <div className="bottle bottle--front">
              <span className="bottle__cork" />
              <span className="bottle__glass" />
              <span className="bottle__gloss" />
            </div>
          </>
        )}
      </div>

      {pour !== null ? (
        <div
          className="cst-pour"
          data-testid="pouring"
          data-phase={pour}
          style={{
            ...rectStyle({ x: 0, y: 0, width: 1920, height: 1080 }, 85),
            ...vars({
              '--liquid': liquid.surface,
              '--liquid-light': liquid.light,
              '--liquid-deep': liquid.deep,
              '--stream-ms': `${STREAM_MS}ms`,
              '--deliver-ms': `${DELIVER_MS}ms`,
              '--fetch-ms': `${TILT_MS}ms`,
              '--fetch-dx': `${SHELF.x - BOTTLE_RECT.x}px`,
              '--fetch-dy': `${SHELF.y - BOTTLE_RECT.y}px`,
            }),
          }}
        >
          {/* جریان مایع از لبه‌ی پاتیل به دهانه‌ی شیشه */}
          <svg className={`cst-pour__stream${pour === 'stream' ? ' is-on' : ''}`} viewBox="0 0 1920 1080" aria-hidden>
            <path className="cst-pour__stream-glow" d={streamPath} />
            <path className="cst-pour__stream-core" d={streamPath} />
            <path className="cst-pour__stream-sheen" d={streamPath} />
          </svg>

          {/* شیشه: از روی میز برداشته می‌شود (tilt)، زیر لبه پر می‌شود، سپس تا مشتری سُر می‌خورد */}
          <div
            className={`cst-pour__bottle${pour === 'tilt' ? ' is-fetching' : ''}${pour === 'stream' ? ' is-filling' : ''}${delivering ? ' is-delivering' : ''}`}
            style={{
              left: bottleRect.x,
              top: bottleRect.y,
              width: bottleRect.width,
              height: bottleRect.height,
            }}
          >
            <div className="cst-pour__fill" />
            {openArt.node}
            {corkedArt.node}
            {openArt.loaded || corkedArt.loaded ? null : <span className="pour__bottle-ph" />}
            <div className="cst-pour__gloss" />
          </div>
          {delivering ? <div className="cst-pour__shadow" style={{ left: COUNTER_SPOT.x, top: COUNTER_SPOT.y + COUNTER_SPOT.height - 10, width: COUNTER_SPOT.width }} /> : null}
        </div>
      ) : null}
    </>
  );
}
