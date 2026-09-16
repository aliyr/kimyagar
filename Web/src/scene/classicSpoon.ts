/**
 * قاشق سر بزیِ کلاسیک — همان هندسه‌ی قاشق کیت فلت (SPOON_GEOMETRY: کاسه در
 * (128,210)، دسته ۹۶..۱۸۲، جمجمه‌ی بز حدود (130,54)) اما با پرداخت نقاشانه:
 * کاسه‌ی برنجی چکش‌خورده با گودی تیره و برق لبه، دسته‌ی چوب گردو با رگه، دو
 * حلقه‌ی برنجی، مهره‌ی فیروزه و سر بز کوهی برنجی با شاخ‌های باریک‌شونده.
 *
 * فقط از primitive های کیت (fill تک‌رنگ + opacity + clip) ساخته شده تا هم در
 * Canvas کیت (قاشق داخل دیگ؛ SceneOptions.spoon) و هم در SVG (SpoonTransfer)
 * یکسان رندر شود. سایه‌ها با لایه‌های نیم‌شفاف روی هم شبیه‌سازی شده‌اند.
 */

import { SPOON_GEOMETRY } from '../art/flat/kit/props.ts';
import {
  circle,
  ellipse,
  group,
  line,
  path,
  polygon,
  polyline,
  rect,
  type Group,
  type PathCmd,
  type Point,
  type Shape,
  type Stroke,
} from '../art/flat/kit/shapes.ts';

const BRASS = { light: '#f3dc92', base: '#c4913b', mid: '#a5772b', shade: '#7b5517', dark: '#432f0c' };
const WOOD = { light: '#9d6d38', base: '#5d3818', shade: '#3b2209', dark: '#23130a' };
const TURQ = { base: '#2f9f96', light: '#93e3d9', dark: '#1b5d57' };

const OUTLINE: Stroke = { color: '#2a1a0c', width: 2.2, cap: 'round', join: 'round' };
const thin = (width: number, color: string): Stroke => ({ color, width, cap: 'round', join: 'round' });

const { bowl } = SPOON_GEOMETRY;
const CX = bowl.cx;

/* ------------------------------------------------------------------ */
/* کاسه                                                                */
/* ------------------------------------------------------------------ */

function bowlShape(): Group {
  const { cx, cy, rx, ry } = bowl;
  const body = ellipse(cx, cy, rx, ry, { fill: BRASS.base, stroke: OUTLINE });
  // سایه‌ی پایین-راست بدنه (clip به بدنه)
  const shading = group([ellipse(cx + 5, cy + 9, rx * 0.9, ry * 0.8, { fill: BRASS.shade, opacity: 0.55 })], {
    clip: ellipse(cx, cy, rx, ry),
  });
  // نشان‌های چکش‌کاری
  const hammer: Shape[] = [];
  const marks: Point[] = [
    [cx - 14, cy + 10],
    [cx - 4, cy + 22],
    [cx + 10, cy + 18],
    [cx + 20, cy + 4],
    [cx - 22, cy - 4],
    [cx + 6, cy + 30],
  ];
  for (const [mx, my] of marks) hammer.push(circle(mx, my, 3.4, { fill: BRASS.dark, opacity: 0.12 }));
  // گودی کاسه
  const hollow = ellipse(cx, cy - 8, rx * 0.74, ry * 0.6, { fill: BRASS.dark });
  const hollowShade = ellipse(cx - 4, cy - 12, rx * 0.52, ry * 0.36, { fill: BRASS.shade, opacity: 0.8 });
  const hollowGlint = ellipse(cx + 9, cy - 3, rx * 0.22, ry * 0.11, { fill: BRASS.mid, opacity: 0.75 });
  // برق لبه‌ی بالا-چپ و برق بدنه
  const rimGlint = path(
    [
      ['M', cx - rx * 0.92, cy - ry * 0.15],
      ['Q', cx - rx * 0.62, cy - ry * 1.02, cx + rx * 0.18, cy - ry * 0.96],
    ],
    { stroke: thin(2, BRASS.light), opacity: 0.85 },
  );
  const bodyGlint = ellipse(cx - 15, cy + 9, 6, 13, { fill: BRASS.light, opacity: 0.3 });
  return group([body, shading, ...hammer, bodyGlint, hollow, hollowShade, hollowGlint, rimGlint], { id: 'classic-spoon-bowl' });
}

/* ------------------------------------------------------------------ */
/* دسته                                                                */
/* ------------------------------------------------------------------ */

function ferrule(y: number): Group {
  return group([
    rect(CX - 9, y, 18, 11, { rx: 3, fill: BRASS.base, stroke: OUTLINE }),
    rect(CX - 9, y + 7, 18, 4, { rx: 2, fill: BRASS.shade, opacity: 0.6 }),
    line(CX - 6, y + 3, CX + 4, y + 3, thin(1.4, BRASS.light), { opacity: 0.8 }),
  ]);
}

function handleShape(): Group {
  const top = 100;
  const bottom = 184;
  const wood = rect(CX - 7, top, 14, bottom - top, { rx: 6, fill: WOOD.base, stroke: OUTLINE });
  const grain: Shape[] = [
    line(CX - 3, top + 8, CX - 4, bottom - 8, thin(1.2, WOOD.shade), { opacity: 0.75 }),
    line(CX + 2, top + 6, CX + 3, bottom - 6, thin(1, WOOD.dark), { opacity: 0.55 }),
    line(CX + 4.5, top + 20, CX + 4.5, bottom - 26, thin(1.4, WOOD.dark), { opacity: 0.35 }),
    line(CX - 4.6, top + 10, CX - 4.6, bottom - 12, thin(1.6, WOOD.light), { opacity: 0.55 }),
  ];
  // مهره‌ی فیروزه با دو یقه‌ی برنجی
  const beadY = 140;
  const bead: Shape[] = [
    rect(CX - 8, beadY - 12, 16, 4, { rx: 1.5, fill: BRASS.mid, stroke: thin(1, BRASS.dark) }),
    rect(CX - 8, beadY + 8, 16, 4, { rx: 1.5, fill: BRASS.mid, stroke: thin(1, BRASS.dark) }),
    circle(CX, beadY, 9, { fill: TURQ.base, stroke: OUTLINE }),
    group([ellipse(CX + 2, beadY + 4, 8, 5, { fill: TURQ.dark, opacity: 0.6 })], { clip: circle(CX, beadY, 9) }),
    circle(CX - 3, beadY - 3, 2.6, { fill: TURQ.light, opacity: 0.9 }),
  ];
  return group([wood, ...grain, ferrule(96), ferrule(172), ...bead], { id: 'classic-spoon-handle' });
}

/* ------------------------------------------------------------------ */
/* سر بز کوهی                                                          */
/* ------------------------------------------------------------------ */

function cubic(p0: Point, c1: Point, c2: Point, p1: Point, t: number): Point {
  const mt = 1 - t;
  return [
    mt ** 3 * p0[0] + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t ** 3 * p1[0],
    mt ** 3 * p0[1] + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t ** 3 * p1[1],
  ];
}

/** شاخ باریک‌شونده: سه قطعه‌ی polyline با پهنای کاهنده (outline تیره زیرش) + خط‌های عرضی */
function horn(p0: Point, c1: Point, c2: Point, p1: Point, fill: string, ridge: boolean): Group {
  const segs: { from: number; to: number; w: number }[] = [
    { from: 0, to: 0.38, w: 12 },
    { from: 0.34, to: 0.72, w: 8 },
    { from: 0.68, to: 1, w: 4.5 },
  ];
  const pts = (a: number, b: number): Point[] => {
    const out: Point[] = [];
    const n = 8;
    for (let i = 0; i <= n; i++) out.push(cubic(p0, c1, c2, p1, a + ((b - a) * i) / n));
    return out;
  };
  const outlines: Shape[] = segs.map((s) => polyline(pts(s.from, s.to), thin(s.w + 3, OUTLINE.color)));
  const fills: Shape[] = segs.map((s) => polyline(pts(s.from, s.to), thin(s.w, fill)));
  const shade: Shape[] = segs.map((s) => polyline(pts(s.from, s.to), thin(Math.max(1.5, s.w * 0.4), BRASS.shade), { opacity: 0.45 }));
  const ridges: Shape[] = [];
  if (ridge) {
    for (const t of [0.22, 0.38, 0.54, 0.7]) {
      const [x, y] = cubic(p0, c1, c2, p1, t);
      const [x2, y2] = cubic(p0, c1, c2, p1, t + 0.02);
      const dx = x2 - x;
      const dy = y2 - y;
      const len = Math.hypot(dx, dy) || 1;
      const w = (12 - 8 * t) / 2 - 1;
      const nx = (-dy / len) * w;
      const ny = (dx / len) * w;
      ridges.push(line(x + nx, y + ny, x - nx, y - ny, thin(1.4, BRASS.dark), { opacity: 0.7 }));
    }
  }
  return group([...outlines, ...fills, ...shade, ...ridges]);
}

function headShape(): Group {
  const skull: PathCmd[] = [
    ['M', 142, 40],
    ['C', 152, 46, 152, 62, 143, 69],
    ['C', 135, 75, 122, 74, 113, 68],
    ['L', 110, 79],
    ['L', 107, 67],
    ['C', 102, 64, 100, 58, 104, 53],
    ['C', 108, 49, 116, 46, 124, 44],
    ['L', 142, 40],
    ['Z'],
  ];
  const head = path(skull, { fill: BRASS.base, stroke: OUTLINE });
  const headShade = group([ellipse(133, 66, 16, 8, { fill: BRASS.shade, opacity: 0.55 }), ellipse(146, 56, 6, 12, { fill: BRASS.shade, opacity: 0.4 })], {
    clip: path(skull),
  });
  const headGlint = group([ellipse(122, 50, 8, 3.5, { fill: BRASS.light, opacity: 0.55 })], { clip: path(skull) });
  const eye = group([circle(114, 57, 2.7, { fill: BRASS.dark }), circle(113.2, 56.2, 0.9, { fill: BRASS.light })]);
  const nostril = circle(105.5, 60, 1, { fill: BRASS.dark, opacity: 0.8 });
  const ear = polygon(
    [
      [141, 40],
      [153, 31],
      [147, 46],
    ],
    { fill: BRASS.mid, stroke: OUTLINE },
  );
  const neck = group([
    rect(CX - 7, 66, 14, 20, { rx: 2, fill: BRASS.mid, stroke: OUTLINE }),
    rect(CX + 2, 67, 4, 18, { fill: BRASS.shade, opacity: 0.6 }),
  ]);
  // قرص برنجی با نگین فیروزه (اتصال سر به دسته)
  const disc = group([
    circle(CX, 88, 13, { fill: BRASS.base, stroke: OUTLINE }),
    group([ellipse(CX + 3, 92, 11, 8, { fill: BRASS.shade, opacity: 0.5 })], { clip: circle(CX, 88, 13) }),
    circle(CX, 88, 6.5, { fill: TURQ.base, stroke: thin(1.2, BRASS.dark) }),
    circle(CX - 2, 86, 2, { fill: TURQ.light, opacity: 0.9 }),
    path([['M', CX - 10, 82], ['Q', CX - 4, 74, CX + 6, 77]], { stroke: thin(1.6, BRASS.light), opacity: 0.8 }),
  ]);
  const farHorn = horn([142, 44], [138, 23], [158, 8], [172, 22], BRASS.mid, false);
  const nearHorn = horn([135, 42], [128, 19], [148, 4], [164, 16], BRASS.base, true);
  return group([farHorn, neck, disc, head, headShade, headGlint, ear, eye, nostril, nearHorn], { id: 'classic-spoon-head' });
}

let cache: Group | undefined;

/** قاشق کلاسیک در فضای طرح SPOON_GEOMETRY.size (۲۵۶) — cache شده (بی‌حالت). */
export function classicSpoonShape(): Group {
  return (cache ??= group([headShape(), handleShape(), bowlShape()], { id: 'classic-spoon' }));
}
