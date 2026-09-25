/**
 * تیلت موس/ژیروسکوپ — منطق خالص.
 *
 * اعداد باید با CSS هم‌خوان بمانند (intro.css و scene.css):
 *   perspective ۱۴۰۰px، rotateX = −py×۲°، rotateY = px×۲٫۲°،
 *   عمق عقب/وسط/جلو ۱۸/۳۶/۶۰ پیکسل صحنه، و scale ۱٫۰۶ روی ریگ
 *   تا گوشه‌ها بعد از چرخش از قاب نزنند بیرون.
 *
 * ترتیب CSS: `scale(rig) rotateX(ax) rotateY(ay)` یعنی اول Ry، بعد Rx، بعد scale.
 */

export const TILT = {
  perspective: 1400,
  /** درجهٔ rotateX وقتی py = ۱؛ علامت در فرمول −py است */
  rotateXAtFull: 2,
  /** درجهٔ rotateY وقتی px = ۱ */
  rotateYAtFull: 2.2,
  depthBack: 18,
  depthMid: 36,
  depthFront: 60,
  /** هاون، دیگ، زیرشان، شیشه و برگه‌ی «آنچه تا حالا ریخته‌ای» */
  depthWork: 2,
  /** مشتری و پیشخوان جلویش — کمتر از لایه‌ی جلو */
  depthNear: 12,
  /** زیر این شیب (درجه) لرزش دست نادیده گرفته می‌شود */
  deadzoneDeg: 1.5,
  /** این مقدار درجه (بعد از ناحیهٔ مرده) به ±۱ می‌رسد */
  rangeDeg: 18,
  /** بزرگ‌نمایی ریگ تا لبهٔ چرخیده هنوز قاب را پر کند */
  rigScale: 1.06,
  sceneW: 1920,
  sceneH: 1080,
} as const;

export interface TiltPose {
  px: number;
  py: number;
}

const D2R = Math.PI / 180;

export function clampUnit(v: number): number {
  if (v > 1) return 1;
  if (v < -1) return -1;
  return v;
}

/** خارج از ناحیهٔ مرده، خودِ آستانه کم می‌شود تا پرش نداشته باشد */
export function applyDeadzone(deltaDeg: number, dead = TILT.deadzoneDeg): number {
  const a = Math.abs(deltaDeg);
  if (a <= dead) return 0;
  return Math.sign(deltaDeg) * (a - dead);
}

/**
 * شیب دستگاه را به مختصات صفحه می‌برد.
 * angle از screen.orientation می‌آید (۰، ۹۰، ۱۸۰، ۲۷۰)، نه از مقایسهٔ عرض و ارتفاع.
 * portrait: gamma چپ/راست، beta جلو/عقب.
 */
export function screenTilt(
  beta: number,
  gamma: number,
  baseBeta: number,
  baseGamma: number,
  orientationAngle: number,
): TiltPose {
  const dBeta = beta - baseBeta;
  const dGamma = gamma - baseGamma;
  const angle = ((orientationAngle % 360) + 360) % 360;
  let dx: number;
  let dy: number;
  if (angle === 90) {
    dx = dBeta;
    dy = -dGamma;
  } else if (angle === 270) {
    dx = -dBeta;
    dy = dGamma;
  } else if (angle === 180) {
    dx = -dGamma;
    dy = -dBeta;
  } else {
    dx = dGamma;
    dy = dBeta;
  }
  return {
    px: clampUnit(applyDeadzone(dx) / TILT.rangeDeg),
    py: clampUnit(applyDeadzone(dy) / TILT.rangeDeg),
  };
}

/** موس: مرکز صفحه صفر، لبه‌ها ±۱ */
export function pointerTilt(clientX: number, clientY: number, width: number, height: number): TiltPose {
  const w = width > 0 ? width : 1;
  const h = height > 0 ? height : 1;
  return {
    px: clampUnit((clientX / w) * 2 - 1),
    py: clampUnit((clientY / h) * 2 - 1),
  };
}

function rotX(a: number, x: number, y: number, z: number) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x, y: c * y + s * z, z: -s * y + c * z };
}

function rotY(a: number, x: number, y: number, z: number) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: c * x - s * z, y, z: s * x + c * z };
}

/** `rotateX(ax) rotateY(ay)` — راست‌ترین اول اعمال می‌شود */
function applyRig(ax: number, ay: number, x: number, y: number, z: number) {
  const p = rotY(ay, x, y, z);
  return rotX(ax, p.x, p.y, p.z);
}

function invertRig(ax: number, ay: number, x: number, y: number, z: number) {
  const p = rotX(-ax, x, y, z);
  return rotY(-ay, p.x, p.y, p.z);
}

function rigAngles(pose: TiltPose) {
  return {
    ax: -pose.py * TILT.rotateXAtFull * D2R,
    ay: pose.px * TILT.rotateYAtFull * D2R,
  };
}

/**
 * نقطهٔ لایهٔ وسط (مختصات صحنه، گوشهٔ بالا-چپ) را به صفحهٔ دوربین تصویر می‌کند.
 * scale فقط x/y را بزرگ می‌کند (معادل CSS `scale()`)، z دست نمی‌خورد.
 * برای تستِ رفت‌وبرگشت؛ toScene وارونِ همین است.
 */
export function projectMid(pose: TiltPose, u: number, v: number): { x: number; y: number } {
  const { ax, ay } = rigAngles(pose);
  const lx = u + pose.px * TILT.depthMid - TILT.sceneW / 2;
  const ly = v + pose.py * TILT.depthMid - TILT.sceneH / 2;
  const p = applyRig(ax, ay, lx, ly, 0);
  const w = 1 - p.z / TILT.perspective;
  return {
    x: ((p.x * TILT.rigScale) / w) + TILT.sceneW / 2,
    y: ((p.y * TILT.rigScale) / w) + TILT.sceneH / 2,
  };
}

/**
 * نقطهٔ روی صفحهٔ دوربین (بعد از letterbox و زوم سینمایی) را به لایهٔ وسط برمی‌گرداند:
 * اول scale ریگ، بعد چرخش پرسپکتیو، بعد جابه‌جایی عمق وسط.
 */
/** لایهٔ کار که بیرون ریگ است: فقط همان جابه‌جایی ۲ پیکسلی برمی‌گردد. */
export function unprojectWork(pose: TiltPose, sx: number, sy: number): { x: number; y: number } {
  return {
    x: sx - pose.px * TILT.depthWork,
    y: sy - pose.py * TILT.depthWork,
  };
}

export function unprojectMid(pose: TiltPose, sx: number, sy: number): { x: number; y: number } {
  const { ax, ay } = rigAngles(pose);
  const cx = sx - TILT.sceneW / 2;
  const cy = sy - TILT.sceneH / 2;
  const s = TILT.rigScale;
  const d = TILT.perspective;
  const p0 = invertRig(ax, ay, 0, 0, d);
  const p1 = invertRig(ax, ay, cx / s, cy / s, 0);
  const dz = p1.z - p0.z;
  const t = Math.abs(dz) < 1e-8 ? 1 : -p0.z / dz;
  const hit = invertRig(ax, ay, (t * cx) / s, (t * cy) / s, d * (1 - t));
  return {
    x: hit.x + TILT.sceneW / 2 - pose.px * TILT.depthMid,
    y: hit.y + TILT.sceneH / 2 - pose.py * TILT.depthMid,
  };
}
