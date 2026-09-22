/**
 * قفسه‌ی دیواری مواد (کلاسیک) — فلو کلیکی.
 *
 * تخته‌ی چوبی روی دیوارِ پشت میز (SCENE_ZONES.wallShelf) که همیشه دیده می‌شود؛
 * شیشه‌ها روی سطح تخته می‌ایستند و نوار محتوا پهن‌تر از دهانه‌ی قفسه است تا با
 * کشیدن، افقی اسکرول شود.
 *
 * ژست روی شیشه:
 *   - Tap (رهاکردن پیش از عبور از slop و پیش از LONG_PRESS_MS) ⇒ یک واحد ماده
 *     با IngredientFlight تا هاون پرواز می‌کند؛ با فرود: addClassicUnit +
 *     startGrinding (کوبش خودکار). اگر مجموع واحدهای هاون به سقف
 *     CLASSIC_MAX_MORTAR_UNITS رسیده باشد پروازی نیست و لرزش «جا ندارد» پخش می‌شود.
 *   - نگه‌داشتن (LONG_PRESS_MS) بدون حرکت ⇒ Overlay جزئیات ماده.
 *   - عبور از slop (هر جهت) ⇒ اسکرول افقی قفسه. Drag شیشه دیگر وجود ندارد.
 * کشیدن روی پس‌زمینه‌ی قفسه ⇒ همیشه اسکرول.
 *
 * لبه‌ها: translate3d با مقدار گِردشده (بدون لرزش زیرپیکسلی خط تخته)، دو
 * «سرپوش چوبی» (.shelf-wall__cap) روی برش دو سرِ دهانه و فلش/محو داخل سرپوش.
 *
 * RTL: شیشه‌ی نخست راست‌ترین است و نوار به‌سمت چپ ادامه می‌یابد؛ چیدمان با
 * left/translate مطلق است تا از direction مستقل بماند.
 */

import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { CLASSIC_MAX_MORTAR_UNITS, useGameStore } from '../store/gameStore';
import type { IngredientDefinition } from '../engine/types';
import { useStageSpace } from './Stage';
import { useUiState } from './uiState';
import { CLASSIC_ART, SCENE_ZONES } from './artManifest';
import { ArtLayer, rectStyle, useArt, vars } from './Zone';
import { IngredientFlight } from './IngredientFlight';
import type { FlightSpec } from './IngredientFlight';
import { sfx } from '../audio/sfx';
import { haptic } from '../platform/haptics';
import './classic-ambience.css';

const ZONE = SCENE_ZONES.wallShelf;

/** جای هر شیشه سخاوتمندانه پهن تا ۶ شیشه از دهانه‌ی قفسه سرریز کند */
const SLOT_WIDTH = 228;
const EDGE_PAD = 52;

const JAR_WIDTH = 170;
const JAR_HEIGHT = 200;

/**
 * شیشه‌ها بالای تخته می‌ایستند، پس ظرفِ اسکرول باید بلندتر از خودِ Zone باشد
 * (Zone فقط خودِ تخته است). این مقدار «هوای بالای تخته» است.
 */
const AIR_ABOVE = 215;

/** سطح بالای تخته در تصویر shelf_board.png حدود ۱۳٪ از بالای آن است */
const BOARD_SURFACE = AIR_ABOVE + Math.round(ZONE.height * 0.13);

/** آستانه‌ی slop در فضای صحنه؛ پیش از آن Tap/نگه‌داشتن، بعدش اسکرول */
const DIRECTION_SLOP = 12;
/** نگه‌داشتن بدون حرکت ⇒ جزئیات ماده */
const LONG_PRESS_MS = 450;

/** پهنای سرپوش چوبی دو سر قفسه */
const CAP_WIDTH = 64;

const CONTAINER = {
  x: ZONE.x,
  y: ZONE.y - AIR_ABOVE,
  width: ZONE.width,
  height: ZONE.height + AIR_ABOVE,
};

function stripWidthFor(count: number): number {
  return EDGE_PAD * 2 + SLOT_WIDTH * count;
}

/** شیشه‌ی iام از راستِ نوار (RTL): ۰ = راست‌ترین */
function jarLeft(index: number, stripWidth: number): number {
  return stripWidth - EDGE_PAD - (index + 1) * SLOT_WIDTH + (SLOT_WIDTH - JAR_WIDTH) / 2;
}

function Jar({
  ingredient,
  index,
  stripWidth,
  scrollBy,
  onTap,
}: {
  ingredient: IngredientDefinition;
  index: number;
  stripWidth: number;
  scrollBy: (dxScene: number) => void;
  onTap: (ingredient: IngredientDefinition, from: { x: number; y: number }) => void;
}) {
  const { capture } = useStageSpace();
  const openOverlay = useGameStore((s) => s.openOverlayAction);
  const inMortar = useGameStore((s) => s.mortar?.ingredientId === ingredient.id);
  const art = useArt(`cabinet/jar_${ingredient.id}.png`);
  const [pressed, setPressed] = useState(false);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button > 0) return;
      // پس‌زمینه‌ی قفسه نباید هم‌زمان اسکرول را شروع کند
      e.stopPropagation();

      const el = e.currentTarget;
      const pointerId = e.pointerId;
      const { toScene } = capture();
      const start = toScene(e.clientX, e.clientY);
      let last = start;
      let mode: 'pending' | 'scroll' | 'held' = 'pending';
      setPressed(true);

      const longPress = window.setTimeout(() => {
        if (mode !== 'pending') return;
        mode = 'held';
        setPressed(false);
        openOverlay('ingredient_detail', ingredient.id);
      }, LONG_PRESS_MS);

      const detach = () => {
        window.clearTimeout(longPress);
        setPressed(false);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onCancel);
        if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const point = toScene(ev.clientX, ev.clientY);
        if (mode === 'pending') {
          if (Math.hypot(point.x - start.x, point.y - start.y) < DIRECTION_SLOP) {
            last = point;
            return;
          }
          mode = 'scroll';
          window.clearTimeout(longPress);
          setPressed(false);
        }
        if (mode === 'scroll') scrollBy(point.x - last.x);
        last = point;
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const wasPending = mode === 'pending';
        detach();
        if (!wasPending) return;
        // Tap ⇒ افزودن به هاون با پرواز از مرکز شیشه
        const r = el.getBoundingClientRect();
        const from = toScene(r.left + r.width / 2, r.top + r.height * 0.45);
        onTap(ingredient, from);
      };

      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        detach();
      };

      el.setPointerCapture(pointerId);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onCancel);
    },
    [capture, scrollBy, ingredient, openOverlay, onTap],
  );

  return (
    <div
      data-testid={`jar-${ingredient.id}`}
      className={`shelf-jar${pressed ? ' is-pressed' : ''}${inMortar ? ' is-in-mortar' : ''}`}
      aria-label={ingredient.nameFa}
      style={{
        left: jarLeft(index, stripWidth),
        top: BOARD_SURFACE - JAR_HEIGHT,
        width: JAR_WIDTH,
        height: JAR_HEIGHT,
        ...vars({ '--ing-color': ingredient.color }),
      }}
      onPointerDown={onPointerDown}
    >
      {art.node}
      {art.loaded ? null : (
        <span className="jar__ph">
          <span className="jar__body">
            <span className="jar__fill" />
            <span className="jar__gloss" />
          </span>
          <span className="jar__lid" />
        </span>
      )}
      <span className="shelf-jar__label">{ingredient.nameFa}</span>
    </div>
  );
}

let flightSeq = 0;

export function ShelfStationClassic() {
  const { capture } = useStageSpace();
  const ingredients = useGameStore((s) => s.defs.ingredients);
  const [flights, setFlights] = useState<FlightSpec[]>([]);

  const stripWidth = stripWidthFor(ingredients.length);
  const maxScroll = Math.max(0, stripWidth - ZONE.width);

  /** translateX نوار: ۰ = لبه‌ی چپ نوار دیده می‌شود، ‎-maxScroll‎ = لبه‌ی راست */
  const txRef = useRef(-maxScroll);
  const [tx, setTx] = useState(-maxScroll);
  const maxScrollRef = useRef(maxScroll);
  maxScrollRef.current = maxScroll;

  const scrollBy = useCallback((dxScene: number) => {
    const next = Math.min(0, Math.max(-maxScrollRef.current, txRef.current + dxScene));
    txRef.current = next;
    setTx(next);
  }, []);

  /** Tap شیشه ⇒ پرواز (یا لرزش «جا ندارد» اگر هاون با همین ماده پُر است) */
  const onJarTap = useCallback((ingredient: IngredientDefinition, from: { x: number; y: number }) => {
    const store = useGameStore.getState();
    const ui = useUiState.getState();
    if (store.openOverlay !== null || store.result !== null) return;
    if (ui.transfer !== null) return; // قاشق در راه است؛ کمی صبر
    const before = store.mortar;
    const filled = before?.portions
      ? before.portions.reduce((sum, portion) => sum + portion.quantity, 0)
      : (before?.quantity ?? 0);
    if (before && filled >= CLASSIC_MAX_MORTAR_UNITS) {
      ui.pulse('mortarShakePulse');
      return;
    }
    haptic('light');
    setFlights((f) => [
      ...f,
      { key: ++flightSeq, ingredientId: ingredient.id, color: ingredient.color, from },
    ]);
  }, []);

  const onFlightLand = useCallback((flight: FlightSpec) => {
    const store = useGameStore.getState();
    if (store.openOverlay !== null || store.result !== null) return;
    store.addClassicUnit(flight.ingredientId);
    store.startGrinding();
    sfx.jarDrop();
  }, []);

  const onFlightDone = useCallback((key: number) => {
    setFlights((f) => f.filter((x) => x.key !== key));
  }, []);

  /** پس‌زمینه‌ی قفسه: کشیدن به هر سو = اسکرول (شیشه‌ها propagation را می‌بندند) */
  const onBackgroundPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button > 0) return;
      const el = e.currentTarget;
      const pointerId = e.pointerId;
      const { toScene } = capture();
      let lastX = toScene(e.clientX, e.clientY).x;

      const detach = () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
      };
      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const x = toScene(ev.clientX, ev.clientY).x;
        scrollBy(x - lastX);
        lastX = x;
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        detach();
      };

      el.setPointerCapture(pointerId);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    },
    [capture, scrollBy],
  );

  // نشانه‌ی کشف‌پذیری اسکرول: فلش داخل سرپوشِ سمتی که شیشه‌ی پنهان دارد
  const hiddenAtLeft = tx < -2;
  const hiddenAtRight = tx > -maxScroll + 2;
  /** گِرد تا خط تخته و لبه‌ها بین فریم‌ها نلرزند */
  const txRounded = Math.round(tx);

  return (
    <>
      <div
        data-testid="shelf"
        className="shelf-wall interactive"
        style={rectStyle(CONTAINER, ZONE.z)}
        onPointerDown={onBackgroundPointerDown}
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          className="shelf-wall__strip"
          style={{ width: stripWidth, transform: `translate3d(${txRounded}px, 0, 0)` }}
        >
          <div className="shelf-wall__board" style={{ height: ZONE.height }}>
            <ArtLayer src={CLASSIC_ART.shelfBoard} fit="fill">
              <span className="shelf-wall__board-ph" />
            </ArtLayer>
          </div>
          {ingredients.map((ing, i) => (
            <Jar
              key={ing.id}
              ingredient={ing}
              index={i}
              stripWidth={stripWidth}
              scrollBy={scrollBy}
              onTap={onJarTap}
            />
          ))}
        </div>

        {/* سرپوش‌های چوبی دو سر: برش تیز تخته را می‌پوشانند و فلش اسکرول را در خود دارند */}
        <div
          className={`shelf-wall__cap shelf-wall__cap--left${hiddenAtLeft ? ' is-on' : ''}`}
          style={{ width: CAP_WIDTH, top: AIR_ABOVE - 18 }}
        >
          <span className="shelf-wall__cap-arrow">‹</span>
        </div>
        <div
          className={`shelf-wall__cap shelf-wall__cap--right${hiddenAtRight ? ' is-on' : ''}`}
          style={{ width: CAP_WIDTH, top: AIR_ABOVE - 18 }}
        >
          <span className="shelf-wall__cap-arrow">›</span>
        </div>
      </div>

      {/* پروازهای در جریان — بیرون از overflow قفسه، روی کل صحنه */}
      {flights.length ? (
        <div className="shelf-flight-layer" style={rectStyle({ x: 0, y: 0, width: 1920, height: 1080 }, 62)}>
          {flights.map((f) => (
            <IngredientFlight key={f.key} flight={f} onLand={onFlightLand} onDone={onFlightDone} />
          ))}
        </div>
      ) : null}
    </>
  );
}
