/**
 * شکل‌های برداری شیشه‌ی قفسه‌ی فلت (جدا از کامپوننت FlatJar برای Fast Refresh و تست).
 * فضای طراحی 128×128؛ بدنه‌ی شیشه x 22..106، y 30..126.
 */

import { OUTLINE, POT_LINE, WOOD } from '../../art/flat/kit/palette.ts';
import { ellipse, group, path, rect, roundedRectPath } from '../../art/flat/kit/shapes.ts';
import type { Group, PathCmd, Shape } from '../../art/flat/kit/shapes.ts';

export const FLAT_JAR_SIZE = 128;

const LINE = { color: POT_LINE, width: 3.2, cap: 'round', join: 'round' } as const;
const GLASS = '#dff3f0';
const GLASS_SHADE = '#a9d3cf';

const BODY = { x: 22, y: 30, w: 84, h: 96, r: 16 } as const;
const NECK = { x: 36, y: 20, w: 56, h: 16 } as const;
const LID = { x: 32, y: 8, w: 64, h: 16, r: 5 } as const;

/** برچسب محرابی (طاق نوک‌دار) پایین بدنه */
function labelCmds(cx: number, top: number, w: number, h: number): PathCmd[] {
  const half = w / 2;
  const arch = h * 0.42;
  return [
    ['M', cx - half, top + h],
    ['L', cx - half, top + arch],
    ['Q', cx - half, top + arch * 0.35, cx - half * 0.55, top + arch * 0.3],
    ['Q', cx - half * 0.2, top + arch * 0.15, cx, top],
    ['Q', cx + half * 0.2, top + arch * 0.15, cx + half * 0.55, top + arch * 0.3],
    ['Q', cx + half, top + arch * 0.35, cx + half, top + arch],
    ['L', cx + half, top + h],
    ['Z'],
  ];
}

/** پشت شیشه: بدنه‌ی نیمه‌شفاف، گردن، برچسب به رنگ ماده */
export function jarBackShape(labelColor: string): Group {
  const children: Shape[] = [
    roundedRectPath(BODY.x, BODY.y, BODY.w, BODY.h, BODY.r, { fill: GLASS, opacity: 0.55 }),
    group([rect(BODY.x + BODY.w - 14, BODY.y + 6, 14, BODY.h - 6, { fill: GLASS_SHADE, opacity: 0.45 })], {
      clip: roundedRectPath(BODY.x, BODY.y, BODY.w, BODY.h, BODY.r),
    }),
    rect(NECK.x, NECK.y, NECK.w, NECK.h, { rx: 4, fill: GLASS, opacity: 0.6, stroke: LINE }),
    path(labelCmds(64, 84, 46, 34), { fill: labelColor, stroke: LINE }),
    path(labelCmds(64, 89, 34, 24), { stroke: { color: '#ffffff', width: 1.6, cap: 'round', join: 'round' }, opacity: 0.55 }),
  ];
  return group(children, { id: 'jar-back' });
}

/** جلوی شیشه: براقی، خط دور، درِ چوبی */
export function jarFrontShape(): Group {
  const body = roundedRectPath(BODY.x, BODY.y, BODY.w, BODY.h, BODY.r);
  const children: Shape[] = [
    group(
      [
        rect(BODY.x + 8, BODY.y + 10, 6, BODY.h - 34, { rx: 3, fill: '#ffffff', opacity: 0.5 }),
        rect(BODY.x + 17, BODY.y + 14, 2.5, 22, { rx: 1.25, fill: '#ffffff', opacity: 0.45 }),
      ],
      { clip: body },
    ),
    roundedRectPath(BODY.x, BODY.y, BODY.w, BODY.h, BODY.r, { stroke: LINE }),
    rect(LID.x, LID.y, LID.w, LID.h, { rx: LID.r, fill: WOOD.base, stroke: LINE }),
    rect(LID.x + 4, LID.y + 3, LID.w - 8, 3, { rx: 1.5, fill: WOOD.light, opacity: 0.8 }),
    rect(LID.x + 3, LID.y + LID.h - 6, LID.w - 6, 4, { rx: 2, fill: WOOD.shade }),
    ellipse(64, LID.y + 1.5, 20, 3.5, { fill: WOOD.light, stroke: { color: OUTLINE, width: 1.6 } }),
  ];
  return group(children, { id: 'jar-front' });
}
