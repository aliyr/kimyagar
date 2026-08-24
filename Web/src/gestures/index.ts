/** Gesture های لمسی صحنه — همه با Pointer Events خالص (ماوس و لمس یکسان) */

import type { PointerEvent as ReactPointerEvent } from 'react';

export { useDragSource } from './useDragSource';
export type { DragSourceOptions, DragSourceProps } from './useDragSource';
export { useGrindGesture, WORK_PER_SCENE_PX } from './useGrindGesture';
export type { GrindGestureOptions } from './useGrindGesture';
export { useCircleGesture } from './useCircleGesture';
export type { CircleGestureOptions } from './useCircleGesture';

/**
 * Tap ساده‌ی فیزیکی. روی pointerup اجرا می‌شود تا روی لمس هم بدون تأخیر
 * ۳۰۰ms کار کند؛ Drag های در جریان Pointer Capture دارند و به اینجا نمی‌رسند.
 */
export function tapProps(onTap: () => void) {
  return {
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button > 0) return;
      e.stopPropagation();
      onTap();
    },
  };
}
