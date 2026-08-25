/**
 * قفسه‌ی دیواری مواد (کلاسیک) — جانشین کابینت کشویی.
 *
 * تخته‌ی چوبی روی دیوارِ پشت میز (SCENE_ZONES.wallShelf) که همیشه دیده می‌شود؛
 * شیشه‌ها روی سطح تخته می‌ایستند و نوار محتوا پهن‌تر از دهانه‌ی قفسه است تا با
 * کشیدن، افقی اسکرول شود.
 *
 * تفکیک ژست روی شیشه (slop جهت‌دار — همان قرارداد قفسه‌ی v2):
 *   - جابه‌جایی کمتر از DIRECTION_SLOP ⇒ هنوز «Tap» است.
 *   - عبور از slop با غلبه‌ی افقی ⇒ اسکرول قفسه.
 *   - عبور از slop با غلبه‌ی عمودی (به‌سمت میز/هاون) ⇒ Drag شیشه با سیستم
 *     مشترک (uiState + hitTestDrop، مقصد 'mortar') تا DragGhost آن را نشان دهد.
 *   - رهاکردن بدون عبور از slop ⇒ Overlay جزئیات ماده (مثل کابینت قدیم).
 * کشیدن روی پس‌زمینه‌ی قفسه ⇒ همیشه اسکرول.
 *
 * هر Drop موفق روی هاون = ۱ واحد؛ اگر هاون با همین ماده پُر باشد (سقف
 * MAX_MORTAR_UNITS) افزودن بی‌اثر است و به‌جایش لرزش «جا ندارد» پخش می‌شود.
 *
 * RTL: شیشه‌ی نخست راست‌ترین است و نوار به‌سمت چپ ادامه می‌یابد؛ چیدمان با
 * left/translateX مطلق است تا از direction مستقل بماند.
 */

import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { MAX_MORTAR_UNITS, useGameStore } from '../store/gameStore';
import type { IngredientDefinition } from '../engine/types';
import { useStageSpace } from './Stage';
import { hitTestDrop } from './layout';
import { useUiState } from './uiState';
import { CLASSIC_ART, SCENE_ZONES } from './artManifest';
import { ArtLayer, rectStyle, useArt, vars } from './Zone';
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

/** آستانه‌ی slop در فضای صحنه؛ پیش از آن Tap، بعدش اسکرول یا Drag */
const DIRECTION_SLOP = 12;

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
}: {
  ingredient: IngredientDefinition;
  index: number;
  stripWidth: number;
  scrollBy: (dxScene: number) => void;
}) {
  const { toScene } = useStageSpace();
  const openOverlay = useGameStore((s) => s.openOverlayAction);
  const isLifted = useUiState(
    (s) => s.drag?.kind === 'jar' && s.drag.ingredientId === ingredient.id,
  );
  const art = useArt(`cabinet/jar_${ingredient.id}.png`);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button > 0) return;
      // پس‌زمینه‌ی قفسه نباید هم‌زمان اسکرول را شروع کند
      e.stopPropagation();

      const el = e.currentTarget;
      const pointerId = e.pointerId;
      const start = toScene(e.clientX, e.clientY);
      let last = start;
      let mode: 'pending' | 'scroll' | 'drag' = 'pending';

      const detach = () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onCancel);
        if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const point = toScene(ev.clientX, ev.clientY);
        if (mode === 'pending') {
          const dx = point.x - start.x;
          const dy = point.y - start.y;
          if (Math.hypot(dx, dy) < DIRECTION_SLOP) {
            last = point;
            return;
          }
          mode = Math.abs(dx) >= Math.abs(dy) ? 'scroll' : 'drag';
          if (mode === 'drag') {
            useUiState.getState().beginDrag({
              kind: 'jar',
              ingredientId: ingredient.id,
              x: point.x,
              y: point.y,
            });
          }
        }
        if (mode === 'scroll') {
          scrollBy(point.x - last.x);
        } else {
          useUiState
            .getState()
            .updateDrag(point.x, point.y, hitTestDrop(point.x, point.y, ['mortar']));
        }
        last = point;
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        detach();
        if (mode === 'pending') {
          // Tap ⇒ Inspect (همان رفتار کابینت قدیم)
          openOverlay('ingredient_detail', ingredient.id);
          return;
        }
        if (mode !== 'drag') return;
        const over = useUiState.getState().drag?.over ?? null;
        useUiState.getState().endDrag();
        if (over !== 'mortar') return;
        const before = useGameStore.getState().mortar;
        if (
          before &&
          before.ingredientId === ingredient.id &&
          before.quantity >= MAX_MORTAR_UNITS
        ) {
          // store افزودن را نادیده می‌گیرد؛ فقط لرزش «جا ندارد»
          useUiState.getState().pulse('mortarShakePulse');
          return;
        }
        useGameStore.getState().addUnitToMortar(ingredient.id);
      };

      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        detach();
        if (mode === 'drag') useUiState.getState().endDrag();
      };

      el.setPointerCapture(pointerId);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onCancel);
    },
    [toScene, scrollBy, ingredient.id, openOverlay],
  );

  return (
    <div
      data-testid={`jar-${ingredient.id}`}
      className={`shelf-jar${isLifted ? ' is-lifted' : ''}`}
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

export function ShelfStationClassic() {
  const { toScene } = useStageSpace();
  const ingredients = useGameStore((s) => s.defs.ingredients);

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

  /** پس‌زمینه‌ی قفسه: کشیدن به هر سو = اسکرول (شیشه‌ها propagation را می‌بندند) */
  const onBackgroundPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button > 0) return;
      const el = e.currentTarget;
      const pointerId = e.pointerId;
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
    [toScene, scrollBy],
  );

  // نشانه‌ی کشف‌پذیری اسکرول: محو + فلش در سمتی که شیشه‌ی پنهان دارد
  const hiddenAtLeft = tx < -2;
  const hiddenAtRight = tx > -maxScroll + 2;

  return (
    <div
      data-testid="shelf"
      className="shelf-wall interactive"
      style={rectStyle(CONTAINER, ZONE.z)}
      onPointerDown={onBackgroundPointerDown}
      onDragStart={(e) => e.preventDefault()}
    >
      <div
        className="shelf-wall__strip"
        style={{ width: stripWidth, transform: `translateX(${tx}px)` }}
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
          />
        ))}
      </div>

      <div className={`shelf-wall__edge shelf-wall__edge--left${hiddenAtLeft ? ' is-on' : ''}`}>
        <span>‹</span>
      </div>
      <div className={`shelf-wall__edge shelf-wall__edge--right${hiddenAtRight ? ' is-on' : ''}`}>
        <span>›</span>
      </div>
    </div>
  );
}
