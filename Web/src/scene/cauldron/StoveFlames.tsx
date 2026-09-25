/**
 * آتش داخل سوراخ اجاق، به سبک بلاب‌های کوره‌ی توکار.
 * لایه‌ی پشت زیر بدنه‌ی PNG است تا مس وسط شعله را بشکند.
 * لایه‌ی جلو فقط هلال پایین سوراخ است (روی حلقه‌ی سیاه) تا شعله دور پایه دیده شود
 * و روی شکم دیگ ننشیند.
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { SCENE_ZONES } from '../artManifest';
import { STOVE_HOLE } from '../classicCauldronGeometry';
import { FURNACE_LEVEL } from '../furnaceGeometry';
import { rectStyle } from '../Zone';

const RECT = {
  x: STOVE_HOLE.cx - STOVE_HOLE.rx,
  y: STOVE_HOLE.cy - STOVE_HOLE.ry,
  width: STOVE_HOLE.rx * 2,
  height: STOVE_HOLE.ry * 2,
};

function tongue(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  half: number,
  height: number,
  lean: number,
  level: number,
): void {
  const g = ctx.createLinearGradient(0, baseY - height, 0, baseY);
  g.addColorStop(0, 'rgba(255,240,180,0)');
  g.addColorStop(0.35, `rgba(255,190,70,${0.55 * level})`);
  g.addColorStop(0.75, `rgba(240,110,30,${0.7 * level})`);
  g.addColorStop(1, `rgba(200,50,20,${0.35 * level})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - half, baseY);
  ctx.bezierCurveTo(cx - half * 1.1, baseY - height * 0.45, cx - half * 0.2, baseY - height * 0.75, cx + lean, baseY - height);
  ctx.bezierCurveTo(cx + half * 0.25, baseY - height * 0.7, cx + half * 1.05, baseY - height * 0.4, cx + half, baseY);
  ctx.closePath();
  ctx.fill();
}

function paint(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, level: number, front: boolean): void {
  ctx.clearRect(0, 0, w, h);
  if (level <= 0.01) return;
  const cx = w / 2;
  const cy = h / 2;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.5, h * 0.48, 0, 0, Math.PI * 2);
  ctx.clip();
  if (front) {
    ctx.beginPath();
    ctx.rect(0, cy - h * 0.02, w, h);
    ctx.clip();
  }
  ctx.globalCompositeOperation = 'source-over';
  const tongues = front ? 5 : 7;
  const baseY = front ? h * 0.92 : h * 0.78;
  for (let i = 0; i < tongues; i++) {
    const t = time * (2.2 + i * 0.37) + i * 1.3;
    const side = i / (tongues - 1);
    const x = w * (0.16 + side * 0.68) + Math.sin(t * 1.3) * w * 0.03;
    const edge = 0.72 + Math.abs(side - 0.5) * 0.7;
    const height = h * (front ? 0.55 : 0.7) * level * edge * (0.75 + 0.25 * Math.sin(t * 2.1));
    tongue(ctx, x, baseY, w * (0.055 + level * 0.02), height, Math.sin(t) * w * 0.04, level);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function StoveFlames() {
  const heat = useGameStore((s) => s.brew.currentHeat);
  const bottled = useGameStore((s) => s.brew.bottled);
  const backRef = useRef<HTMLCanvasElement | null>(null);
  const frontRef = useRef<HTMLCanvasElement | null>(null);
  const levelRef = useRef(0);
  levelRef.current = bottled ? 0 : FURNACE_LEVEL[heat];

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    let time = 0;
    const fit = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      return canvas.getContext('2d');
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      time += dt;
      const level = levelRef.current;
      const back = fit(backRef.current);
      const front = fit(frontRef.current);
      if (back && backRef.current) paint(back, backRef.current.width, backRef.current.height, time, level, false);
      if (front && frontRef.current) paint(front, frontRef.current.width, frontRef.current.height, time, level, true);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <canvas ref={backRef} aria-hidden className="stove-flames" style={rectStyle(RECT, SCENE_ZONES.cauldron.z - 1)} />
      <canvas
        ref={frontRef}
        aria-hidden
        className="stove-flames stove-flames--front"
        style={rectStyle(RECT, SCENE_ZONES.cauldron.z + 3)}
      />
    </>
  );
}
