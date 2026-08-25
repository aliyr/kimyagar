/**
 * قفسه‌ی دیواری مواد (v2) — مالک: Workstream A.
 *
 * نوار افقی روی دیوار پشت میز؛ همیشه دیده می‌شود (باز/بسته ندارد).
 * محتوا (تخته + ۶ شیشه) پهن‌تر از Viewport است و با کشیدن اسکرول می‌شود.
 *
 * تفکیک ژست روی شیشه (slop جهت‌دار):
 *   - اشاره‌گر تا ~۱۲px فضای صحنه حرکت نکرده ⇒ هنوز «Tap» است.
 *   - عبور از slop با غلبه‌ی افقی ⇒ اسکرول قفسه.
 *   - عبور از slop با غلبه‌ی عمودی (به‌سمت میز) ⇒ Drag شیشه با همان سیستم
 *     Drag موجود (uiState + hitTestDrop، مقصد 'mortar').
 *   - رهاشدن بدون عبور از slop ⇒ باز کردن Overlay جزئیات ماده.
 * اشاره‌گر روی پس‌زمینه‌ی قفسه ⇒ همیشه اسکرول.
 *
 * Drop موفق روی هاون ⇒ addUnitToMortar (هر Drop = ۱ واحد)؛ اگر هاون با همین
 * ماده پُر باشد، به‌جای افزودن، لرزش هاون پخش می‌شود (bumpMortarShake).
 *
 * RTL: شیشه‌ی نخست سمت راستِ نوار می‌نشیند و نوار به‌سمت چپ ادامه می‌یابد؛
 * چیدمان با left/translateX مطلق است تا از direction مستقل بماند.
 */

import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { MAX_MORTAR_UNITS, useGameStore } from '../../store/gameStore';
import type { IngredientDefinition } from '../../engine/types';
import { useStageSpace } from '../Stage';
import { hitTestDrop } from '../layout';
import { useUiState } from '../uiState';
import { vars } from '../Zone';
import { ArtLayerV2, SHELF_INGREDIENT_ORDER, V2_ART, V2_ZONES } from './contracts';
import { bumpMortarShake } from './MortarStationV2';
import './shelf-mortar.css';

const ZONE = V2_ZONES.shelf;

/** جای هر شیشه سخاوتمندانه بزرگ تا ۶ شیشه از Viewport قفسه (1300px) سرریز کند */
const SLOT_WIDTH = 255;
const EDGE_PAD = 50;
const STRIP_WIDTH = EDGE_PAD * 2 + SLOT_WIDTH * SHELF_INGREDIENT_ORDER.length; // 1630
const MAX_SCROLL = Math.max(0, STRIP_WIDTH - ZONE.width);

const JAR_WIDTH = 190;
const JAR_HEIGHT = 208;
/** کف شیشه کمی روی تخته‌ی قفسه بنشیند */
const JAR_TOP = 34;

/** آستانه‌ی slop در فضای صحنه؛ پیش از آن Tap، بعدش اسکرول یا Drag */
const DIRECTION_SLOP = 12;

/** شیشه‌ی iام از راستِ نوار (RTL): 0 = راست‌ترین */
function jarLeft(index: number): number {
  return STRIP_WIDTH - EDGE_PAD - (index + 1) * SLOT_WIDTH + (SLOT_WIDTH - JAR_WIDTH) / 2;
}

function Jar({
  ingredient,
  index,
  scrollBy,
}: {
  ingredient: IngredientDefinition;
  index: number;
  scrollBy: (dxScene: number) => void;
}) {
  const { toScene } = useStageSpace();
  const openOverlay = useGameStore((s) => s.openOverlayAction);
  const isLifted = useUiState(
    (s) => s.drag?.kind === 'jar' && s.drag.ingredientId === ingredient.id,
  );

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
          // تفکیک جهت: افقی ⇒ اسکرول قفسه، عمودی (به‌سمت میز) ⇒ Drag شیشه
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
          // Tap ⇒ Inspect (همان رفتار کابینت کلاسیک)
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
          bumpMortarShake();
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
      data-testid={`v2-jar-${ingredient.id}`}
      className={`v2-jar${isLifted ? ' is-lifted' : ''}`}
      aria-label={ingredient.nameFa}
      style={{
        left: jarLeft(index),
        top: JAR_TOP,
        width: JAR_WIDTH,
        height: JAR_HEIGHT,
        ...vars({ '--ing-color': ingredient.color }),
      }}
      onPointerDown={onPointerDown}
    >
      <ArtLayerV2 src={V2_ART.jar(ingredient.id)}>
        <span className="v2-jar__ph">
          <span className="v2-jar__body">
            <span className="v2-jar__fill" />
            <span className="v2-jar__gloss" />
          </span>
          <span className="v2-jar__lid" />
          <span className="v2-jar__label">{ingredient.nameFa}</span>
        </span>
      </ArtLayerV2>
    </div>
  );
}

export function ShelfStation() {
  const { toScene } = useStageSpace();
  const ingredients = useGameStore((s) => s.defs.ingredients);

  /** translateX نوار: 0 = لبه‌ی چپ نوار دیده می‌شود، -MAX_SCROLL = لبه‌ی راست */
  const txRef = useRef(-MAX_SCROLL);
  const [tx, setTx] = useState(-MAX_SCROLL);

  const scrollBy = useCallback((dxScene: number) => {
    txRef.current = Math.min(0, Math.max(-MAX_SCROLL, txRef.current + dxScene));
    setTx(txRef.current);
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

  // ترتیب قرارداد v2؛ اگر ماده‌ای در defs نبود، جایش حذف می‌شود
  const jars = SHELF_INGREDIENT_ORDER.map((id) =>
    ingredients.find((i) => i.id === id),
  ).filter((i): i is IngredientDefinition => i !== undefined);

  // نشانه‌ی کشف‌پذیری اسکرول: محو + فلش در سمتی که محتوای پنهان دارد
  const hiddenAtLeft = tx < -2;
  const hiddenAtRight = tx > -MAX_SCROLL + 2;

  return (
    <div
      data-testid="v2-shelf"
      className="v2-shelf interactive"
      style={{
        position: 'absolute',
        left: ZONE.x,
        top: ZONE.y,
        width: ZONE.width,
        height: ZONE.height,
        zIndex: ZONE.z,
      }}
      onPointerDown={onBackgroundPointerDown}
      onDragStart={(e) => e.preventDefault()}
    >
      <div
        className="v2-shelf__strip"
        style={{ width: STRIP_WIDTH, transform: `translateX(${tx}px)` }}
      >
        <ArtLayerV2 src={V2_ART.shelfBoard} fit="fill">
          <span className="v2-shelf__board-ph">
            <span className="v2-shelf__board-plank" />
          </span>
        </ArtLayerV2>
        {jars.map((ing, i) => (
          <Jar key={ing.id} ingredient={ing} index={i} scrollBy={scrollBy} />
        ))}
      </div>

      <div className={`v2-shelf__edge v2-shelf__edge--left${hiddenAtLeft ? ' is-on' : ''}`}>
        <span>‹</span>
      </div>
      <div className={`v2-shelf__edge v2-shelf__edge--right${hiddenAtRight ? ' is-on' : ''}`}>
        <span>›</span>
      </div>
    </div>
  );
}
