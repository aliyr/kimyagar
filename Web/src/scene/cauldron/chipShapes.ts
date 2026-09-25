/**
 * شکل تکه‌ها روی Canvas — همان چندضلعی‌های clip-path هاون
 * (chipClip و .cst-chip.is-*) تا بریدگی نسل‌های خردشده یکی باشد.
 * نسل ۰ با اسپرایت PNG کشیده می‌شود؛ این مسیرها برش و جای خالی اسپرایت‌اند.
 */

export type Pt = readonly [number, number];

function poly(spec: string): Pt[] {
  return spec.split(',').map((pair) => {
    const [x, y] = pair.trim().split(/\s+/);
    return [parseFloat(x) / 100, parseFloat(y) / 100] as const;
  });
}

const NICKS: Pt[][] = [
  poly('34% 6%, 100% 0, 96% 100%, 0 92%, 0 38%'),
  poly('0 0, 68% 4%, 100% 36%, 100% 100%, 6% 96%'),
  poly('4% 0, 100% 8%, 100% 64%, 70% 100%, 0 100%'),
  poly('0 0, 100% 0, 96% 100%, 36% 100%, 0 62%'),
];

const KINDS: Record<string, Pt[]> = {
  flower: poly('50% 0, 63% 21%, 88% 12%, 76% 35%, 100% 50%, 76% 65%, 88% 88%, 63% 79%, 50% 100%, 37% 79%, 12% 88%, 24% 65%, 0 50%, 24% 35%, 12% 12%, 37% 21%'),
  thread: poly('38% 0, 66% 4%, 62% 70%, 74% 100%, 26% 100%, 36% 68%'),
  leaf: poly('50% 0, 78% 14%, 96% 38%, 82% 72%, 54% 100%, 22% 78%, 4% 42%, 20% 14%'),
  petal: poly('50% 0, 78% 10%, 100% 42%, 80% 86%, 50% 100%, 20% 86%, 0 42%, 22% 10%'),
  star: poly('50% 0, 61% 32%, 100% 36%, 70% 58%, 80% 100%, 50% 76%, 20% 100%, 30% 58%, 0 36%, 39% 32%'),
  root: poly('6% 48%, 22% 10%, 48% 4%, 72% 18%, 96% 38%, 78% 52%, 90% 88%, 58% 100%, 28% 86%, 10% 72%'),
};

export function nickPolygon(nick: number): Pt[] {
  return NICKS[nick] ?? poly('14% 0, 86% 4%, 100% 22%, 92% 100%, 8% 94%, 0 28%');
}

export function kindPolygon(kind: string): Pt[] | null {
  return KINDS[kind] ?? null;
}

/** مسیر را در جعبه‌ی w×h با مبدأ گوشه‌ی بالا-چپ می‌کشد. */
export function tracePolygon(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, h: number): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * w, y * h);
    else ctx.lineTo(x * w, y * h);
  });
  ctx.closePath();
}
