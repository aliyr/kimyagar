/**
 * کوره‌ی توکار میز — جایگزین بصری HeatControl.
 *
 * - Canvas داخل دهانه‌ی طاق (FURNACE_RECT) با اتوماتای `Fire` کیت (۲۴×۱۲) که به‌جای
 *   پیکسل، «نقاشی‌گونه» رندر می‌شود: هر سلول داغ یک بلاب گرادیانی افزایشی (`lighter`)
 *   از یک اسپرایت کش‌شده است؛ رویش پنج زبانه‌ی نرم می‌رقصند، اخگرها بالا می‌روند و
 *   دود کم‌رنگی از سقف طاق بیرون می‌زند.
 * - شدت ملایم/متوسط/تند = ۰٫۳۵/۰٫۷/۱٫۰ (FURNACE_LEVEL).
 * - Tap روی کوره درجه را می‌چرخاند؛ سه اهرم برنجی کنار دهانه هر درجه را مستقیم می‌زنند.
 * - `FireLight`: سه لایه‌ی radial-gradient روی شکم پاتیل، سطح میز و هاون که opacity
 *   آن‌ها از همان rAF با متغیر `--fire-glow` لرزان می‌شود (نور واقعی، نه CSS تکراری).
 * - صدا: `sfx.fire()` در تغییر درجه، `sfx.setFire()` غرش/ترق‌تروق پیوسته با درجه،
 *   `sfx.setSimmer()` حباب‌های جوش با حرارت × پُر بودن دیگ.
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { heatLabels } from '../data/labels';
import type { HeatLevel } from '../engine/types';
import { tapProps } from '../gestures';
import { Fire } from '../art/flat/kit/fire.ts';
import { Rng } from '../art/flat/kit/rng.ts';
import { sfx } from '../audio/sfx';
import { SCENE_ZONES } from './artManifest';
import { HEAT_NOTCHES } from './layout';
import { FURNACE_LEVEL, FURNACE_RECT } from './furnaceGeometry';
import { STOVE_HOLE } from './classicCauldronGeometry';
import { rectStyle, zoneStyle } from './Zone';
import './classic-props.css';

const ORDER: HeatLevel[] = ['low', 'medium', 'high'];

const GRID_W = 24;
const GRID_H = 12;
const FIXED_DT = 1 / 60;
const SPRITE_PX = 48;
const COLOR_BUCKETS = 14;
const TONGUES = 5;
const MAX_EMBERS = 28;

/** پالت آتش (هم‌خوان با Fire.colorFor کیت که private است) */
function fireColor(h: number): [number, number, number] {
  const mix = (a: number[], b: number[], t: number): [number, number, number] => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
  const YELLOW = [245, 197, 66];
  const WHITE_HOT = [255, 242, 192];
  const ORANGE = [232, 128, 42];
  const RED = [192, 57, 43];
  const DEEP_RED = [122, 31, 20];
  if (h > 0.85) return mix(YELLOW, WHITE_HOT, Math.min(1, (h - 0.85) / 0.15));
  if (h > 0.6) return mix(ORANGE, YELLOW, (h - 0.6) / 0.25);
  if (h > 0.35) return mix(RED, ORANGE, (h - 0.35) / 0.25);
  return mix(DEEP_RED, RED, h / 0.35);
}

/** اسپرایت‌های بلاب گرادیانی برای هر سطل رنگ — یک‌بار ساخته می‌شوند */
function buildSprites(): HTMLCanvasElement[] {
  const sprites: HTMLCanvasElement[] = [];
  for (let i = 0; i < COLOR_BUCKETS; i++) {
    const h = (i + 0.5) / COLOR_BUCKETS;
    const [r, g, b] = fireColor(h).map(Math.round);
    const c = document.createElement('canvas');
    c.width = SPRITE_PX;
    c.height = SPRITE_PX;
    const ctx = c.getContext('2d');
    if (!ctx) continue;
    const grad = ctx.createRadialGradient(SPRITE_PX / 2, SPRITE_PX / 2, 0, SPRITE_PX / 2, SPRITE_PX / 2, SPRITE_PX / 2);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
    grad.addColorStop(0.45, `rgba(${r},${g},${b},0.42)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
    sprites.push(c);
  }
  return sprites;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

class FurnaceRenderer {
  readonly fire = new Fire(GRID_W, GRID_H);
  private readonly rng = new Rng(7);
  private readonly sprites = buildSprites();
  private embers: Ember[] = [];
  private time = 0;
  private accumulator = 0;
  private readonly tonguePhase = Array.from({ length: TONGUES }, (_, i) => i * 1.7);
  /** ۰..۱ — برای FireLight (نرم‌شده) */
  glow = 0;

  constructor() {
    this.fire.lit = true;
  }

  step(dt: number): void {
    this.time += dt;
    this.fire.update(dt, this.rng);
    const intensity = this.fire.intensity;

    // اخگرها
    if (intensity > 0.05 && this.embers.length < MAX_EMBERS && this.rng.chance(0.06 + intensity * 0.22)) {
      this.embers.push({
        x: this.rng.range(0.3, 0.7),
        y: this.rng.range(0.55, 0.85),
        vx: this.rng.range(-0.05, 0.05),
        vy: -this.rng.range(0.25, 0.55) * (0.6 + intensity * 0.6),
        life: 0,
        maxLife: this.rng.range(0.9, 1.9),
        size: this.rng.range(1.2, 2.6),
      });
    }
    for (const e of this.embers) {
      e.life += dt;
      e.vx += Math.sin(this.time * 6 + e.y * 20) * dt * 0.25;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    }
    this.embers = this.embers.filter((e) => e.life < e.maxLife && e.y > -0.2);

    // نور: میانگین حرارت ستون‌های میانی + لرزش
    let sum = 0;
    for (let x = 6; x < GRID_W - 6; x++) sum += this.fire.columnHeat(x);
    const target = Math.min(1, (sum / (GRID_W - 12)) * 1.6) * (0.75 + 0.25 * Math.sin(this.time * 9.3) * Math.sin(this.time * 4.1));
    this.glow += (target - this.glow) * Math.min(1, dt * 12);
  }

  advance(elapsed: number): void {
    this.accumulator += elapsed;
    while (this.accumulator >= FIXED_DT) {
      this.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.clearRect(0, 0, w, h);
    const intensity = this.fire.intensity;
    if (intensity <= 0.001) return;

    // بستر اخگرِ درخشان در کف دهانه
    ctx.globalCompositeOperation = 'source-over';
    const bed = ctx.createRadialGradient(w / 2, h * 0.92, 0, w / 2, h * 0.92, w * 0.42);
    bed.addColorStop(0, `rgba(255,120,40,${0.55 * intensity})`);
    bed.addColorStop(0.6, `rgba(180,50,20,${0.28 * intensity})`);
    bed.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bed;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);

    // بلاب‌های اتوماتا (افزایشی)
    ctx.globalCompositeOperation = 'lighter';
    const cellW = (w * 0.86) / GRID_W;
    const cellH = (h * 0.78) / GRID_H;
    const ox = w * 0.07;
    const oy = h * 0.16;
    const blob = Math.max(cellW, cellH) * 2.3;
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const heat = this.fire.heatAt(x, y);
        if (heat < 0.12) continue;
        const bucket = Math.min(COLOR_BUCKETS - 1, Math.floor(Math.min(1, heat) * COLOR_BUCKETS));
        const sprite = this.sprites[bucket];
        if (!sprite) continue;
        ctx.globalAlpha = Math.min(1, heat * 0.9);
        ctx.drawImage(sprite, ox + x * cellW + cellW / 2 - blob / 2, oy + y * cellH + cellH / 2 - blob / 2, blob, blob);
      }
    }

    // زبانه‌های نرم
    for (let i = 0; i < TONGUES; i++) {
      const t = this.time * (2.2 + i * 0.37) + this.tonguePhase[i];
      const cx = w * (0.28 + (i / (TONGUES - 1)) * 0.44) + Math.sin(t * 1.3) * w * 0.03;
      const height = h * (0.28 + 0.34 * intensity) * (0.8 + 0.2 * Math.sin(t * 2.1)) * (i === Math.floor(TONGUES / 2) ? 1.15 : 0.92);
      const baseY = h * 0.92;
      const halfW = w * (0.055 + 0.03 * intensity);
      const grad = ctx.createLinearGradient(0, baseY - height, 0, baseY);
      grad.addColorStop(0, 'rgba(255,240,180,0)');
      grad.addColorStop(0.35, `rgba(255,190,70,${0.5 * intensity})`);
      grad.addColorStop(0.75, `rgba(240,110,30,${0.6 * intensity})`);
      grad.addColorStop(1, `rgba(200,50,20,${0.3 * intensity})`);
      ctx.fillStyle = grad;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(cx - halfW, baseY);
      ctx.bezierCurveTo(cx - halfW * 1.1, baseY - height * 0.45, cx - halfW * 0.25, baseY - height * 0.75, cx + Math.sin(t) * halfW * 0.4, baseY - height);
      ctx.bezierCurveTo(cx + halfW * 0.3, baseY - height * 0.75, cx + halfW * 1.1, baseY - height * 0.45, cx + halfW, baseY);
      ctx.closePath();
      ctx.fill();
    }

    // اخگرها
    for (const e of this.embers) {
      const k = e.life / e.maxLife;
      const a = (1 - k) * (k < 0.15 ? k / 0.15 : 1);
      ctx.globalAlpha = a * 0.95;
      ctx.fillStyle = k < 0.5 ? '#ffd27a' : '#ff8c3a';
      ctx.beginPath();
      ctx.arc(e.x * w, e.y * h, e.size * (w / 160), 0, Math.PI * 2);
      ctx.fill();
    }

    // دود کم‌رنگ زیر سقف طاق
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.16 + 0.1 * intensity;
    const smoke = ctx.createLinearGradient(0, 0, 0, h * 0.3);
    smoke.addColorStop(0, 'rgba(70,60,60,0.7)');
    smoke.addColorStop(1, 'rgba(70,60,60,0)');
    ctx.fillStyle = smoke;
    ctx.fillRect(0, 0, w, h * 0.3);
    ctx.globalAlpha = 1;
  }
}

/** لایه‌های نور لرزان آتش روی اشیای صحنه — opacity از rAF کوره تنظیم می‌شود */
function FireLight({ hostRef }: { hostRef: React.RefObject<HTMLDivElement | null> }) {
  const cauldron = SCENE_ZONES.cauldron;
  const mortar = SCENE_ZONES.mortar;
  return (
    <div ref={hostRef} className="fire-light" aria-hidden>
      {/* شکم پاتیل: نور از زیر */}
      <div
        className="fire-light__layer fire-light__layer--pot"
        style={rectStyle(
          { x: cauldron.x + cauldron.width * 0.12, y: cauldron.y + cauldron.height * 0.45, width: cauldron.width * 0.76, height: cauldron.height * 0.5 },
          cauldron.z + 1,
        )}
      />
      {/* ته سوراخ اجاق: نور از زیر دیگ بیرون می‌زند */}
      <div
        className="fire-light__layer fire-light__layer--hole"
        style={rectStyle(
          { x: STOVE_HOLE.cx - STOVE_HOLE.rx * 0.9, y: STOVE_HOLE.cy - STOVE_HOLE.ry * 0.8, width: STOVE_HOLE.rx * 1.8, height: STOVE_HOLE.ry * 1.6 },
          SCENE_ZONES.workTable.z + 2,
        )}
      />
      {/* سطح میز دور دهانه‌ی کوره */}
      <div
        className="fire-light__layer fire-light__layer--table"
        style={rectStyle(
          { x: FURNACE_RECT.x - FURNACE_RECT.width * 0.9, y: FURNACE_RECT.y - FURNACE_RECT.height * 0.55, width: FURNACE_RECT.width * 2.8, height: FURNACE_RECT.height * 1.9 },
          SCENE_ZONES.workTable.z + 1,
        )}
      />
      {/* هاون: نور از راست */}
      <div
        className="fire-light__layer fire-light__layer--mortar"
        style={rectStyle(
          { x: mortar.x + mortar.width * 0.3, y: mortar.y + mortar.height * 0.3, width: mortar.width * 0.8, height: mortar.height * 0.7 },
          mortar.z + 1,
        )}
      />
    </div>
  );
}

export function FurnaceFire() {
  const heat = useGameStore((s) => s.brew.currentHeat);
  const setHeat = useGameStore((s) => s.setHeat);
  const hasContents = useGameStore((s) => s.brew.entries.length > 0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<FurnaceRenderer | null>(null);
  const firstHeat = useRef(true);

  const cycle = () => setHeat(ORDER[(ORDER.indexOf(heat) + 1) % ORDER.length]);

  // شدت آتش با درجه؛ پف صدا در تغییر (نه در بارگذاری اول)
  useEffect(() => {
    if (!rendererRef.current) rendererRef.current = new FurnaceRenderer();
    rendererRef.current.fire.level = FURNACE_LEVEL[heat];
    if (firstHeat.current) {
      firstHeat.current = false;
      return;
    }
    sfx.fire();
  }, [heat]);

  // قل‌قل پیوسته (فقط با محتوا) + ترق‌تروق و غرش آتش (همیشه، با شدت درجه)
  useEffect(() => {
    sfx.setSimmer(hasContents ? FURNACE_LEVEL[heat] : 0);
    sfx.setFire(FURNACE_LEVEL[heat]);
    return () => {
      sfx.setSimmer(0);
      sfx.setFire(0);
    };
  }, [heat, hasContents]);

  // حلقه‌ی رندر
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!rendererRef.current) rendererRef.current = new FurnaceRenderer();
    const renderer = rendererRef.current;
    renderer.fire.level = FURNACE_LEVEL[useGameStore.getState().brew.currentHeat];

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    measure();
    window.addEventListener('resize', measure);

    let raf = 0;
    let previous = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const elapsed = Math.min(0.25, (now - previous) / 1000);
      previous = now;
      renderer.advance(elapsed);
      if (++frame % 20 === 0) measure();
      renderer.render(ctx, canvas.width, canvas.height);
      if (frame % 2 === 0 && lightRef.current) {
        lightRef.current.style.setProperty('--fire-glow', renderer.glow.toFixed(3));
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <>
      <FireLight hostRef={lightRef} />

      <div
        className="heat furnace interactive"
        data-heat={heat}
        data-testid="furnace"
        style={zoneStyle(SCENE_ZONES.heatSource)}
        {...tapProps(cycle)}
      >
        <canvas
          ref={canvasRef}
          className="furnace__canvas"
          style={{
            position: 'absolute',
            left: FURNACE_RECT.x - SCENE_ZONES.heatSource.x,
            top: FURNACE_RECT.y - SCENE_ZONES.heatSource.y,
            width: FURNACE_RECT.width,
            height: FURNACE_RECT.height,
          }}
        />
      </div>

      {ORDER.map((level, i) => (
        <div
          key={level}
          data-testid={`heat-${level}`}
          data-active={heat === level ? 'true' : undefined}
          className={`notch interactive${heat === level ? ' is-active' : ''}`}
          style={rectStyle(HEAT_NOTCHES[i], 46)}
          {...tapProps(() => setHeat(level))}
        >
          <span className="notch__lever" />
          <span className="notch__label">{heatLabels[level]}</span>
        </div>
      ))}
    </>
  );
}
