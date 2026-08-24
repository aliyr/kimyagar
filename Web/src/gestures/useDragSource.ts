/**
 * Drag فیزیکی با Pointer Events خالص (ماوس + لمس + قلم).
 * از HTML5 drag&drop استفاده نمی‌شود چون روی موبایل کار نمی‌کند.
 *
 * قاعده‌ی UX (بخش ۶.۶): تا پیش از Drop همه‌چیز قابل لغو است؛ رهاکردن
 * بیرون از مقصد، شیء را بی‌هزینه برمی‌گرداند.
 */

import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useStageSpace } from '../scene/Stage';
import { hitTestDrop } from '../scene/layout';
import type { DropTargetId } from '../scene/layout';
import { useUiState } from '../scene/uiState';
import type { DragKind } from '../scene/uiState';

/** جابه‌جایی لازم (پیکسل واقعی) تا Tap به Drag تبدیل شود */
const TAP_SLOP = 9;

export interface DragSourceOptions {
  kind: DragKind;
  ingredientId?: string;
  /** مقصدهای مجاز، به ترتیب اولویت */
  targets: readonly DropTargetId[];
  /** اگر false باشد فقط Tap کار می‌کند */
  draggable?: boolean;
  onTap?: () => void;
  onDrop?: (target: DropTargetId) => void;
}

export interface DragSourceProps {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
}

export function useDragSource(options: DragSourceOptions): DragSourceProps {
  const { toScene } = useStageSpace();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button > 0) return;
      e.stopPropagation();

      const el = e.currentTarget;
      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      let dragging = false;

      const detach = () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onCancel);
        if (el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const opts = optionsRef.current;
        const point = toScene(ev.clientX, ev.clientY);
        if (!dragging) {
          if (opts.draggable === false) return;
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < TAP_SLOP) return;
          dragging = true;
          useUiState.getState().beginDrag({
            kind: opts.kind,
            ingredientId: opts.ingredientId,
            x: point.x,
            y: point.y,
          });
        }
        useUiState
          .getState()
          .updateDrag(point.x, point.y, hitTestDrop(point.x, point.y, opts.targets));
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        detach();
        const opts = optionsRef.current;
        if (!dragging) {
          opts.onTap?.();
          return;
        }
        const over = useUiState.getState().drag?.over ?? null;
        useUiState.getState().endDrag();
        if (over) opts.onDrop?.(over);
      };

      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        detach();
        if (dragging) useUiState.getState().endDrag();
      };

      el.setPointerCapture(pointerId);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onCancel);
    },
    [toScene],
  );

  return { onPointerDown };
}
