/**
 * کابینت کشویی مواد — لبه‌ی چپ صحنه.
 *
 * بسته: فقط لبه‌ی چوبی با دستگیره‌ی برنجی دیده می‌شود؛ Tap یا کشیدن به راست
 *   آن را باز می‌کند.
 * باز: قفسه‌ها با یک شیشه برای هر ماده‌ی defs.ingredients.
 *   - Tap روی شیشه ⇒ Inspect (Overlay جزئیات)
 *   - کشیدن شیشه روی هاون ⇒ pickIngredient (کابینت خودش بسته می‌شود)
 * هنگام کشیدن، پنل کنار می‌رود تا هاون دیده و Highlight شود.
 */

import { useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useGameStore } from '../store/gameStore';
import { useDragSource } from '../gestures';
import type { IngredientDefinition } from '../engine/types';
import { SCENE_ZONES } from './artManifest';
import { JAR_ROWS, JAR_SIZE, jarSlot } from './layout';
import { useArt, vars, zoneStyle } from './Zone';
import { useUiState } from './uiState';

/** کشیدن افقی بیش از این مقدار (پیکسل واقعی) کابینت را باز/بسته می‌کند */
const SWIPE = 36;
/** ناحیه‌ی دستگیره روی نمای کشوی بیرون‌آمده */
const OPEN_HANDLE = { left: 552, width: 88 };

function Jar({ ingredient, index }: { ingredient: IngredientDefinition; index: number }) {
  const pickIngredient = useGameStore((s) => s.pickIngredient);
  const openOverlay = useGameStore((s) => s.openOverlayAction);
  const isDragged = useUiState(
    (s) => s.drag?.kind === 'jar' && s.drag.ingredientId === ingredient.id,
  );
  const art = useArt(`cabinet/jar_${ingredient.id}.png`);

  const drag = useDragSource({
    kind: 'jar',
    ingredientId: ingredient.id,
    targets: ['mortar'],
    onTap: () => openOverlay('ingredient_detail', ingredient.id),
    onDrop: (target) => {
      if (target === 'mortar') pickIngredient(ingredient.id);
    },
  });

  const slot = jarSlot(index);

  return (
    <div
      data-testid={`jar-${ingredient.id}`}
      className={`jar${isDragged ? ' is-lifted' : ''}`}
      style={{
        left: slot.left,
        top: slot.top,
        width: JAR_SIZE.width,
        height: JAR_SIZE.height,
        ...vars({ '--ing-color': ingredient.color }),
      }}
      {...drag}
    >
      {art.node}
      {art.loaded ? null : (
        <div className="jar__ph">
          <span className="jar__body">
            <span className="jar__fill" />
            <span className="jar__gloss" />
          </span>
          <span className="jar__lid" />
        </div>
      )}
      <span className="jar__label">{ingredient.nameFa}</span>
    </div>
  );
}

export function Cabinet() {
  const open = useGameStore((s) => s.cabinetOpen);
  const ingredients = useGameStore((s) => s.defs.ingredients);
  const toggleCabinet = useGameStore((s) => s.toggleCabinet);
  const draggingJar = useUiState((s) => s.drag?.kind === 'jar');
  const panelArt = useArt(open ? SCENE_ZONES.cabinetOpen.img : undefined, { fit: 'fill' });
  const edgeArt = useArt(open ? undefined : SCENE_ZONES.cabinetClosed.img, { fit: 'fill' });
  /** وقتی هنر آمده، دستگیره‌ی نقاشی‌شده هست و لازم نیست دستگیره‌ی CSS بکشیم */
  const handleOnArt = open ? panelArt.loaded : edgeArt.loaded;

  /** دستگیره: Tap برای باز/بسته، کشیدن افقی برای همان کار */
  const onHandleDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button > 0) return;
      e.stopPropagation();
      const el = e.currentTarget;
      const pointerId = e.pointerId;
      const startX = e.clientX;
      let swiped = false;

      const detach = () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
      };
      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId || swiped) return;
        const dx = ev.clientX - startX;
        if (dx > SWIPE) {
          swiped = true;
          toggleCabinet(true);
        } else if (dx < -SWIPE) {
          swiped = true;
          toggleCabinet(false);
        }
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        detach();
        if (!swiped) toggleCabinet();
      };

      el.setPointerCapture(pointerId);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    },
    [toggleCabinet],
  );

  return (
    <>
      {open ? (
        <div
          data-testid="cabinet-panel"
          className={`cabinet-panel interactive${draggingJar ? ' is-ghosted' : ''}`}
          style={zoneStyle(SCENE_ZONES.cabinetOpen)}
        >
          {panelArt.node}
          {panelArt.loaded ? null : (
            <div className="cabinet-panel__ph">
              <div className="cabinet-panel__back" />
              {JAR_ROWS.map((y) => (
                <div
                  key={y}
                  className="cabinet-panel__shelf"
                  style={{ top: y + JAR_SIZE.height }}
                />
              ))}
              <div className="cabinet-panel__frame" />
            </div>
          )}
          {ingredients.map((ing, i) => (
            <Jar key={ing.id} ingredient={ing} index={i} />
          ))}
        </div>
      ) : null}

      {/*
        بسته: تمام لبه‌ی چوبی دیده می‌شود.
        باز: فقط ناحیه‌ی دستگیره روی نمای کشو می‌ماند تا جلوی شیشه‌ها و هاون را نگیرد.
      */}
      <div
        className={`cabinet-edge interactive${open ? ' is-open' : ''}`}
        style={zoneStyle(SCENE_ZONES.cabinetClosed, {
          zIndex: SCENE_ZONES.cabinetOpen.z + 1,
          ...(open ? OPEN_HANDLE : null),
        })}
      >
        {edgeArt.node}
        {open || edgeArt.loaded ? null : (
          <div className="cabinet-edge__ph">
            <div className="cabinet-edge__wood" />
            <div className="cabinet-edge__seam" />
          </div>
        )}
        <div
          data-testid="cabinet-handle"
          className={`cabinet-handle${handleOnArt ? ' is-on-art' : ''}`}
          onPointerDown={onHandleDown}
        >
          <span className="cabinet-handle__plate" />
          <span className="cabinet-handle__knob" />
          <span className="cabinet-handle__hint">{open ? '‹' : '›'}</span>
        </div>
      </div>
    </>
  );
}
