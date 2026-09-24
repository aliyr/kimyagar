/**
 * هندسهٔ هاون v3 در فضای Zone — پل بین `mortarGeometry.ts` (کسرهای بوم،
 * تولیدشده از تصویر) و کدی که با درصدِ Zone کار می‌کند (کوبه، تپه، حلقه، ذرات).
 *
 * قرارداد: نسبت Zone هاون برابر نسبت بوم `mortar_back` است (SCENE_ZONES.mortar)،
 * پس تصویر با contain کل Zone را پر می‌کند و «کسر بوم» = «کسر Zone».
 * واحدها: x بر حسب درصد پهنای Zone، y بر حسب درصد بلندی Zone.
 */

import { MORTAR_V3, type PieceKindV3 } from './mortarGeometry';
import { SCENE_ZONES, artUrl } from './artManifest';

/** URL اسپرایت تکهٔ خام (اندیس از ۰) */
export function pieceUrl(kind: PieceKindV3, sprite: number): string {
  const count = MORTAR_V3.pieces[kind].count;
  const i = ((sprite % count) + count) % count;
  return artUrl(`mortar/v3/pieces/${kind}_${i + 1}.png`);
}

/** همهٔ اسپرایت‌های تکه برای پیش‌بار */
export function allPieceArt(): string[] {
  const out: string[] = [];
  for (const kind of Object.keys(MORTAR_V3.pieces) as PieceKindV3[]) {
    for (let i = 0; i < MORTAR_V3.pieces[kind].count; i++) out.push(`mortar/v3/pieces/${kind}_${i + 1}.png`);
  }
  return out;
}

export interface EllipsePct {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

const ZONE = SCENE_ZONES.mortar;
/** پهنا ÷ بلندی Zone (= بوم) — برای تبدیل درصدِ پهنا به درصدِ بلندی */
export const MORTAR_ASPECT = ZONE.width / ZONE.height;

function pct(e: { cx: number; cy: number; rx: number; ry: number }): EllipsePct {
  return { cx: e.cx * 100, cy: e.cy * 100, rx: e.rx * 100, ry: e.ry * 100 };
}

/** لبهٔ بیرونی، دهانهٔ داخلی و کفِ هاون — درصد Zone */
export const OUTER = pct(MORTAR_V3.outer);
export const MOUTH = pct(MORTAR_V3.mouth);
export const FLOOR = pct(MORTAR_V3.floor);
/** از این y به پایین نوار لبهٔ نزدیک (mortar_front) مات است */
export const FRONT_FADE = { start: MORTAR_V3.frontFade.start * 100, end: MORTAR_V3.frontFade.end * 100 };
export const BASE_Y = MORTAR_V3.base.y * 100;

/** تبدیل درصد پهنا ⇄ درصد بلندی (برای دایره‌های واقعی روی صفحه) */
export const wToH = (w: number) => w * MORTAR_ASPECT;
export const hToW = (h: number) => h / MORTAR_ASPECT;

/** قطر سر کوبه ≈ ۲۸٪ قطر داخلی دهانه (درصد پهنای Zone) */
export const HEAD_DIAM_W = MOUTH.rx * 2 * 0.28;
/** شعاع سر کوبه: افقی (٪ پهنا) و عمودی (٪ بلندی) */
export const HEAD_R = { x: HEAD_DIAM_W / 2, y: wToH(HEAD_DIAM_W / 2) };

/** ضریب تبدیل پیکسلِ بوم کوبه به درصد پهنای Zone */
const pestleScale = HEAD_DIAM_W / MORTAR_V3.pestle.headWidthPx;
/**
 * جعبهٔ کوبه (٪ Zone) در وضعیت «خانه»: لنگر سر روی مرکز کف.
 * MortarStation با transform سر را به هر نقطه می‌برد.
 */
export const PESTLE_BOX = (() => {
  const width = MORTAR_V3.pestle.canvas.width * pestleScale;
  const height = wToH(MORTAR_V3.pestle.canvas.height * pestleScale);
  const left = FLOOR.cx - MORTAR_V3.pestle.head.x * width;
  const top = FLOOR.cy - MORTAR_V3.pestle.head.y * height;
  return { left, top, width, height };
})();
/** لنگر سر کوبه داخل جعبه (کسر) — نقطهٔ چرخش و جابه‌جایی */
export const PESTLE_HEAD_ANCHOR = { x: MORTAR_V3.pestle.head.x, y: MORTAR_V3.pestle.head.y };
export const PESTLE_FRAMES = MORTAR_V3.pestle.frames;

/**
 * جعبهٔ `.cst-bowl` (٪ Zone) — تکه‌ها با درصدِ این جعبه جا می‌گیرند.
 * بیضی نگه‌داری تکه‌ها در فضای bowl: مرکز (50, 76) با شعاع (42, 32) درصد.
 * آن بیضی باید روی ردپای تپه بیفتد: کمی پهن‌تر از کف و بلندتر (تپه برآمده است).
 */
export const BOWL_MORTAR = (() => {
  const rx = FLOOR.rx * 1.12;
  const ry = FLOOR.ry * 1.9;
  const width = rx / 0.42;
  const height = ry / 0.32;
  return { left: FLOOR.cx - width / 2, top: FLOOR.cy - 0.76 * height, width, height };
})();
/** ابعاد پیکسلی جعبهٔ bowl در فضای صحنه — برای اندازه‌ی طبیعی اسپرایت‌ها */
export const BOWL_PX = {
  w: (ZONE.width * BOWL_MORTAR.width) / 100,
  h: (ZONE.height * BOWL_MORTAR.height) / 100,
};

/** نقطه‌ای در فضای صحنه ⇒ درصد Zone */
export function sceneToZone(x: number, y: number): { x: number; y: number } {
  return { x: ((x - ZONE.x) / ZONE.width) * 100, y: ((y - ZONE.y) / ZONE.height) * 100 };
}
/** درصد Zone ⇒ فضای صحنه */
export function zoneToScene(x: number, y: number): { x: number; y: number } {
  return { x: ZONE.x + (x / 100) * ZONE.width, y: ZONE.y + (y / 100) * ZONE.height };
}

/** مسیر SVG بیضی (viewBox 0..100 × 0..100 هم‌راستا با Zone) */
export function ellipsePath(e: EllipsePct, startDeg = 0, sweepDeg = 360): string {
  if (sweepDeg >= 360) {
    return `M ${(e.cx - e.rx).toFixed(2)} ${e.cy.toFixed(2)} a ${e.rx.toFixed(2)} ${e.ry.toFixed(2)} 0 1 0 ${(e.rx * 2).toFixed(2)} 0 a ${e.rx.toFixed(2)} ${e.ry.toFixed(2)} 0 1 0 ${(-e.rx * 2).toFixed(2)} 0`;
  }
  if (sweepDeg <= 0) return '';
  const p = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return [e.cx + e.rx * Math.cos(a), e.cy + e.ry * Math.sin(a)] as const;
  };
  const [x0, y0] = p(startDeg);
  const [x1, y1] = p(startDeg + sweepDeg);
  const large = sweepDeg > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${e.rx.toFixed(2)} ${e.ry.toFixed(2)} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
