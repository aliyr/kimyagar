/**
 * لایه‌های Canvas ایستگاه هاون.
 *
 *   <MortarFxCanvas layer="below" />  زیر تکه‌ها: تودهٔ پودر، سایهٔ زندهٔ کوبه، فیلم پودر باقی‌مانده
 *   <MortarFxCanvas layer="above" />  روی لبهٔ جلو: گرد، جرقه، عطر، پاف، لبریز، دنبالهٔ قاشق،
 *                                     حلقه‌های پاتیل، موج براق لبه
 *
 * کنترل امری از بیرون: `mortarFx.strike(e)`, `mortarFx.land(...)`, `mortarFx.fine(...)`,
 * `mortarFx.spill(...)`, `mortarFx.trail(...)`, `mortarFx.ripple(...)`, `mortarFx.setAroma(...)`.
 * هر بوم فقط وقتی چیزی برای کشیدن دارد rAF می‌گیرد. بودجه‌ها از platform/quality.
 */

import { useEffect, useRef } from 'react';
import { SCENE_ZONES } from './artManifest';
import { getQuality, reportFrameTime, subscribeQuality } from '../platform/quality';
import { ParticleSystem, particleAlpha, particleSize } from './mortarParticles';
import {
  getMortarChips,
  getPestleAim,
  getResidue,
  mixColors,
  subscribeMortarPile,
  subscribeResidue,
  usePestleAim,
  type StrikeEvent,
} from './mortarPile';
import { FLOOR, HEAD_R, MOUTH, MORTAR_ASPECT, zoneToScene } from './mortarLayout';

const ZONE = SCENE_ZONES.mortar;
/** ناحیهٔ بوم در فضای صحنه — هاون + میز زیرش + دهانهٔ پاتیل (برای دنبالهٔ قاشق) */
export const FX_RECT = { x: 140, y: 240, width: 1000, height: 680 };

type Sweep = { t0: number; dur: number; strength: number };

/* ------------------------------ وضعیت مشترک ------------------------------ */

const sim = new ParticleSystem(7);
let sweeps: Sweep[] = [];
let aroma = { intensity: 0, color: '#c4a15a' };
let aromaAcc = 0;
let flash = { t0: -1, color: '#ffe3a0' };
/** جاروی قلم‌مو: لبهٔ پاک‌شدن از راست به چپ روی فیلم residue */
let wipe = { t0: -1, dur: 500 };
const wake = new Set<() => void>();

function nudge(): void {
  for (const w of wake) w();
}

function budget() {
  const q = getQuality();
  return { scale: q.reducedMotion ? Math.min(0.25, q.particleScale) : q.particleScale };
}

function scenePoint(zx: number, zy: number): { x: number; y: number } {
  return zoneToScene(zx, zy);
}

export const mortarFx = {
  /** برخورد کوبه: گرد هم‌رنگ تکه‌ها + جرقه + موج براق */
  strike(e: StrikeEvent): void {
    const p = scenePoint(e.x, e.y);
    const b = budget();
    sim.emitStrikeDust(p.x, p.y, e.colors, e.fineness, b);
    if (e.hits === 0 || e.fineness > 0.85) sim.emitSparks(p.x, p.y - 4, 5, b);
    else sim.emitSparks(p.x, p.y - 4, 2, b);
    if (getQuality().specular) sweeps.push({ t0: performance.now(), dur: 320, strength: 0.55 + e.fineness * 0.3 });
    nudge();
  },
  /** فرود ماده در هاون: پاف رنگی */
  land(color: string): void {
    const p = scenePoint(FLOOR.cx, FLOOR.cy - 2);
    sim.emitPuff(p.x, p.y, color, 0.8, budget());
    nudge();
  },
  /** لحظهٔ «نرم»: پاف پودر + فلاش لبه */
  fine(color: string): void {
    const p = scenePoint(FLOOR.cx, FLOOR.cy - 3);
    sim.emitPuff(p.x, p.y, color, 1.2, budget());
    sim.emitSparks(p.x, p.y, 6, budget());
    flash = { t0: performance.now(), color };
    nudge();
  },
  /** جا ندارد: چند تکه از لبه روی میز */
  spill(colors: readonly string[]): void {
    const rim = scenePoint(MOUTH.cx, MOUTH.cy + MOUTH.ry * 0.9);
    const table = ZONE.y + ZONE.height - 6;
    sim.emitSpill(rim.x, rim.y, table, colors, budget());
    nudge();
  },
  /** دانه‌ای از لبهٔ قاشق (فضای صحنه) */
  trail(x: number, y: number, color: string): void {
    sim.emitTrail(x, y, color, budget());
    nudge();
  },
  /** حلقهٔ رنگی روی سطح پاتیل (فضای صحنه) */
  ripple(x: number, y: number, color: string): void {
    if (getQuality().reducedMotion) return;
    sim.emitRipple(x, y, color);
    nudge();
  },
  /** قلم‌مو: پاک‌شدن جهت‌دار فیلم residue (راست→چپ) + پاف کم‌رنگ هم‌رنگ آن */
  brush(ms = 500): void {
    const r = getResidue();
    if (!r) return;
    wipe = { t0: performance.now(), dur: Math.max(120, ms) };
    const p = scenePoint(FLOOR.cx + FLOOR.rx * 0.3, FLOOR.cy - 2);
    sim.emitPuff(p.x, p.y, r.color, 0.45, budget());
    nudge();
  },
  /** شدت عطر ۰..۱ و رنگ آن؛ ۰ = خاموش */
  setAroma(intensity: number, color: string): void {
    const on = intensity > 0.01;
    const was = aroma.intensity > 0.01;
    aroma = { intensity: Math.max(0, Math.min(1, intensity)), color };
    if (on && !was) nudge();
  },
  /** برای آزمون */
  _sim: sim,
};

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __mortarDebug?: unknown }).__mortarDebug = {
    aim: getPestleAim,
    chips: getMortarChips,
    residue: getResidue,
    particles: () => sim.particles.length,
    FLOOR,
    MOUTH,
    HEAD_R,
  };
}

/* ------------------------------ رنگ ------------------------------ */

const rgbCache = new Map<string, string>();
function rgb(hex: string): string {
  const hit = rgbCache.get(hex);
  if (hit) return hit;
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  const out = m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '138,122,82';
  rgbCache.set(hex, out);
  return out;
}
const rgba = (hex: string, a: number) => `rgba(${rgb(hex)},${Math.max(0, Math.min(1, a)).toFixed(3)})`;

/* ------------------------------ رسم: لایهٔ رویین ------------------------------ */

function drawAbove(ctx: CanvasRenderingContext2D, now: number): boolean {
  let busy = false;
  // ذرات
  for (const p of sim.particles) {
    const a = particleAlpha(p);
    if (a <= 0.002) continue;
    const size = particleSize(p);
    const x = p.x - FX_RECT.x;
    const y = p.y - FX_RECT.y;
    if (p.kind === 'ripple') {
      ctx.strokeStyle = rgba(p.color, a);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.36, 0, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    if (p.kind === 'aroma') {
      const g = ctx.createRadialGradient(x, y, 0, x, y, size);
      g.addColorStop(0, rgba(p.color, a));
      g.addColorStop(1, rgba(p.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.55, size, Math.sin(p.life + p.seed * 6) * 0.4, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (p.kind === 'puff') {
      const g = ctx.createRadialGradient(x, y, 0, x, y, size);
      g.addColorStop(0, rgba(p.color, a * 0.9));
      g.addColorStop(0.6, rgba(p.color, a * 0.4));
      g.addColorStop(1, rgba(p.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (p.kind === 'spark') {
      ctx.fillStyle = rgba(p.color, a);
      ctx.shadowColor = rgba(p.color, a * 0.9);
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      continue;
    }
    if (p.kind === 'spill') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rot);
      ctx.fillStyle = rgba(p.color, a);
      ctx.beginPath();
      ctx.ellipse(0, 0, size, size * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      // لبهٔ تیره + برق کوچک تا تکه حجم داشته باشد
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = `rgba(40,20,6,${(a * 0.55).toFixed(3)})`;
      ctx.stroke();
      ctx.fillStyle = `rgba(255,244,220,${(a * 0.35).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(-size * 0.3, -size * 0.2, size * 0.32, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }
    // dust / trail
    ctx.fillStyle = rgba(p.color, a * 0.85);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  busy = sim.active;

  // موج براق روی لبهٔ دهانه (نیمهٔ نزدیک، چپ ⇒ راست)
  const alive: Sweep[] = [];
  for (const s of sweeps) {
    const t = (now - s.t0) / s.dur;
    if (t >= 1) continue;
    alive.push(s);
    const c = scenePoint(MOUTH.cx, MOUTH.cy);
    const rx = (MOUTH.rx / 100) * ZONE.width;
    const ry = (MOUTH.ry / 100) * ZONE.height;
    const ang = Math.PI * (0.06 + 0.88 * t);
    const fade = Math.sin(t * Math.PI);
    for (let i = 0; i < 9; i++) {
      const a = ang - i * 0.055;
      const px = c.x + Math.cos(a) * rx - FX_RECT.x;
      const py = c.y + Math.sin(a) * ry - FX_RECT.y;
      const k = (1 - i / 9) * fade * s.strength;
      ctx.fillStyle = `rgba(255,244,214,${(k * 0.85).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, 2.2 + (1 - i / 9) * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    busy = true;
  }
  sweeps = alive;

  // فلاش نرم شدن: هالهٔ کوتاه روی دهانه
  if (flash.t0 >= 0) {
    const t = (now - flash.t0) / 520;
    if (t < 1) {
      const c = scenePoint(MOUTH.cx, MOUTH.cy);
      const rx = (MOUTH.rx / 100) * ZONE.width * (1 + t * 0.12);
      const ry = (MOUTH.ry / 100) * ZONE.height * (1 + t * 0.12);
      ctx.strokeStyle = rgba(flash.color, (1 - t) * 0.6);
      ctx.lineWidth = 3 + (1 - t) * 5;
      ctx.beginPath();
      ctx.ellipse(c.x - FX_RECT.x, c.y - FX_RECT.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      busy = true;
    } else {
      flash = { ...flash, t0: -1 };
    }
  }
  return busy;
}

/** عطر: تولید پیوسته وابسته به شدت */
function emitAroma(dt: number): boolean {
  if (aroma.intensity <= 0.01) return false;
  const q = getQuality();
  if (q.reducedMotion) return false;
  aromaAcc += dt * (0.8 + aroma.intensity * 3.2) * q.particleScale;
  while (aromaAcc >= 1) {
    aromaAcc -= 1;
    const p = scenePoint(FLOOR.cx, FLOOR.cy - FLOOR.ry * 0.6);
    sim.emitAroma(p.x, p.y, aroma.color, aroma.intensity);
  }
  return true;
}

/* ------------------------------ رسم: لایهٔ زیرین ------------------------------ */

/** @returns true اگر انیمیشنی (جاروی قلم‌مو) هنوز ادامه دارد */
function drawBelow(ctx: CanvasRenderingContext2D, now: number): boolean {
  const chips = getMortarChips();
  const aim = getPestleAim();
  const q = getQuality();
  let busy = false;

  // فیلم پودر باقی‌مانده روی کف + چند دانه روی لبه
  const residue = getResidue();
  // جاروی جهت‌دار: لبهٔ پاک‌شدن از راست به چپ می‌رود؛ آنچه می‌ماند کم‌رنگ‌تر می‌شود
  const wipeU = wipe.t0 < 0 ? 0 : Math.min(1, (now - wipe.t0) / wipe.dur);
  if (residue && chips.length === 0 && wipeU < 1) {
    const c = scenePoint(FLOOR.cx, FLOOR.cy);
    const rx = (FLOOR.rx / 100) * ZONE.width * 0.92;
    const ry = (FLOOR.ry / 100) * ZONE.height * 1.5;
    ctx.save();
    if (wipeU > 0) {
      busy = true;
      const eased = 1 - (1 - wipeU) * (1 - wipeU);
      const left = c.x - FX_RECT.x - rx * 1.05;
      const keepW = rx * 2.1 * (1 - eased);
      ctx.beginPath();
      ctx.rect(left, c.y - FX_RECT.y - ry * 3, keepW, ry * 6);
      ctx.clip();
      ctx.globalAlpha = 1 - eased * 0.4;
    }
    const g = ctx.createRadialGradient(c.x - FX_RECT.x, c.y - FX_RECT.y, 0, c.x - FX_RECT.x, c.y - FX_RECT.y, rx);
    g.addColorStop(0, rgba(residue.color, 0.58 * residue.amount));
    g.addColorStop(0.7, rgba(residue.color, 0.3 * residue.amount));
    g.addColorStop(1, rgba(residue.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(c.x - FX_RECT.x, c.y - FX_RECT.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // دانه‌های ریز پاشیده روی کف و پای دیوارهٔ داخلی
    ctx.fillStyle = rgba(residue.color, 0.55 * residue.amount);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.4;
      const r = 0.55 + ((i * 37) % 11) / 22;
      const px = c.x + Math.cos(a) * rx * r - FX_RECT.x;
      const py = c.y + Math.sin(a) * ry * r - FX_RECT.y;
      ctx.beginPath();
      ctx.arc(px, py, 1.1 + ((i * 13) % 5) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (chips.length > 0) {
    // تودهٔ پودر: هرچه بیشترِ تپه گرد شده باشد، برآمده‌تر و پررنگ‌تر
    let total = 0;
    let dustArea = 0;
    const dustColors: string[] = [];
    for (const chip of chips) {
      const area = chip.w * chip.h;
      total += area;
      if (chip.kind === 'dust') {
        dustArea += area;
        if (chip.color) dustColors.push(chip.color);
      }
    }
    const frac = total > 0 ? dustArea / total : 0;
    if (frac > 0.05) {
      const color = mixColors(dustColors);
      const c = scenePoint(FLOOR.cx, FLOOR.cy - 1.5);
      const rx = (FLOOR.rx / 100) * ZONE.width * (0.55 + 0.45 * frac);
      const ry = (FLOOR.ry / 100) * ZONE.height * (1.4 + 0.8 * frac);
      const cx = c.x - FX_RECT.x;
      const cy = c.y - FX_RECT.y;
      // سایهٔ پای توده روی کف
      const sh = ctx.createRadialGradient(cx, cy + ry * 0.35, 0, cx, cy + ry * 0.35, rx * 1.05);
      sh.addColorStop(0, `rgba(28,14,4,${(0.38 * frac).toFixed(3)})`);
      sh.addColorStop(1, 'rgba(28,14,4,0)');
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry * 0.35, rx * 1.05, ry * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      // بدنهٔ توده: روشن در قله، تیره‌تر در پای دامنه
      const g = ctx.createRadialGradient(cx - rx * 0.18, cy - ry * 0.55, 0, cx, cy, rx);
      g.addColorStop(0, rgba(color, 0.98 * frac));
      g.addColorStop(0.5, rgba(color, 0.9 * frac));
      g.addColorStop(0.86, rgba(color, 0.55 * frac));
      g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // تیرگی دامنهٔ پایین (حجم)
      const dk = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
      dk.addColorStop(0, 'rgba(30,14,4,0)');
      dk.addColorStop(0.55, 'rgba(30,14,4,0)');
      dk.addColorStop(1, `rgba(30,14,4,${(0.32 * frac).toFixed(3)})`);
      ctx.fillStyle = dk;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.98, ry * 0.98, 0, 0, Math.PI * 2);
      ctx.fill();
      // دانه‌بندی: نقطه‌های روشن و تیرهٔ ریز
      for (let i = 0; i < 46; i++) {
        const a = i * 2.399963;
        const r = Math.sqrt((i + 0.5) / 46);
        const px = cx + Math.cos(a) * r * rx * 0.88;
        const py = cy + Math.sin(a) * r * ry * 0.82;
        ctx.fillStyle = i % 3 === 0 ? `rgba(40,20,6,${(0.28 * frac).toFixed(3)})` : `rgba(255,248,230,${(0.22 * frac).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, 0.7 + ((i * 7) % 4) * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // سایهٔ زندهٔ کوبه روی تپه/کف
  if (q.liveShadow && aim.mode !== 'lean' && (chips.length > 0 || aim.mode === 'grind')) {
    const contactY = aim.headY + HEAD_R.y * 0.6 + aim.lift * 15 * 0.9;
    const c = scenePoint(aim.headX, contactY);
    const rxZone = HEAD_R.x * (1.05 + aim.lift * 0.5);
    const rx = (rxZone / 100) * ZONE.width;
    const ry = ((rxZone * MORTAR_ASPECT * 0.42) / 100) * ZONE.height;
    const alpha = 0.34 * (1 - aim.lift * 0.55) + aim.impact * 0.1;
    const cx = c.x - FX_RECT.x;
    const cy = c.y - FX_RECT.y;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    g.addColorStop(0, `rgba(30,14,4,${alpha.toFixed(3)})`);
    g.addColorStop(0.7, `rgba(30,14,4,${(alpha * 0.5).toFixed(3)})`);
    g.addColorStop(1, 'rgba(30,14,4,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return busy;
}

/* ------------------------------ کامپوننت ------------------------------ */

function sceneScale(el: HTMLElement): number {
  const raw = getComputedStyle(el).getPropertyValue('--scene-scale');
  const v = parseFloat(raw);
  return Number.isFinite(v) && v > 0 ? v : 1;
}

export function MortarFxCanvas({ layer, z }: { layer: 'above' | 'below'; z: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  // لایهٔ زیرین با هر تغییر aim دوباره کشیده می‌شود (سایهٔ زنده)
  const aim = usePestleAim();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let dirty = true;

    const fit = () => {
      const q = getQuality();
      const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
      const k = Math.max(0.5, Math.min(q.dprCap, dpr * sceneScale(canvas)));
      const w = Math.round(FX_RECT.width * k);
      const h = Math.round(FX_RECT.height * k);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(k, 0, 0, k, 0, 0);
    };
    fit();

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t0 = performance.now();
      ctx.clearRect(0, 0, FX_RECT.width, FX_RECT.height);
      let busy = false;
      if (layer === 'above') {
        busy = emitAroma(dt) || busy;
        sim.step(dt);
        busy = drawAbove(ctx, now) || busy;
      } else {
        busy = drawBelow(ctx, now);
      }
      reportFrameTime(performance.now() - t0);
      dirty = false;
      if (busy) schedule();
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(frame);
    };
    const wakeUp = () => {
      dirty = true;
      last = performance.now();
      schedule();
    };

    wake.add(wakeUp);
    const unsubQ = subscribeQuality(() => {
      fit();
      wakeUp();
    });
    // لایهٔ زیرین با هر تغییر چیپ‌ها یا residue (قلم‌مو/فرود) دوباره کشیده می‌شود
    const unsubPile = layer === 'below' ? subscribeMortarPile(wakeUp) : () => {};
    const unsubResidue = layer === 'below' ? subscribeResidue(wakeUp) : () => {};
    const onResize = () => {
      fit();
      wakeUp();
    };
    window.addEventListener('resize', onResize);
    wakeUp();
    return () => {
      wake.delete(wakeUp);
      unsubQ();
      unsubPile();
      unsubResidue();
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
      void dirty;
    };
  }, [layer]);

  // سایهٔ زنده: هر تغییر aim ⇒ یک فریم تازه (فقط لایهٔ زیرین)
  useEffect(() => {
    if (layer !== 'below') return;
    nudge();
  }, [aim, layer]);

  return (
    <canvas
      ref={ref}
      className={`cst-fx cst-fx--${layer}`}
      aria-hidden
      style={{
        position: 'absolute',
        left: FX_RECT.x - ZONE.x,
        top: FX_RECT.y - ZONE.y,
        width: FX_RECT.width,
        height: FX_RECT.height,
        zIndex: z,
        pointerEvents: 'none',
      }}
    />
  );
}
