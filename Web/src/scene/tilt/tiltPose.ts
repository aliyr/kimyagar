/**
 * وضعیت نرم‌شدهٔ تیلت کارگاه. هوک آن را می‌نویسد و toScene همان فریم را می‌خواند
 * تا کشیدن با چیزی که روی صفحه دیده می‌شود یکی باشد. سردر این را دست نمی‌زند.
 */

export const tiltPose = {
  px: 0,
  py: 0,
  /** ریگ کلاسیک (چرخش + scale) فعال است و نگاشت باید برگردد */
  active: false,
};

export function publishTiltPose(px: number, py: number, active: boolean): void {
  tiltPose.px = px;
  tiltPose.py = py;
  tiltPose.active = active;
}
