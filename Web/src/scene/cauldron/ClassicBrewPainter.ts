/**
 * نقاشی Canvas 2D داخل دهانه‌ی پاتیل کلاسیک.
 * نرمی از بلاب‌های گرادیانی ازپیش‌ساخته است؛ ctx.filter استفاده نمی‌شود.
 */

import { drawShape } from '../../art/flat/kit/canvas2d.ts';
import { rgbToHex, scaleRgb, tintWhite, type RGB } from '../../art/flat/kit/color.ts';
import { classicSpoonShape } from '../classicSpoon';
import { CLASSIC_FX_RECT_TALL, CLASSIC_MOUTH, CLASSIC_SPLASH_TABLE } from '../classicCauldronGeometry';
import { pieceUrl } from '../mortarLayout';
import type { PieceKind } from '../mortarPile';
import {
  BUBBLE_GROW,
  dropGroundY,
  dropScreen,
  tableVisible,
  type ClassicBrewSim,
  type SplashDrop,
} from './ClassicBrewSim';
import { kindPolygon, nickPolygon, tracePolygon } from './chipShapes';

const RECT = CLASSIC_FX_RECT_TALL;

function blobSprite(rgb: string, inner: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  if (!g) return c;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, rgb.replace(')', `,${inner})`).replace('rgb', 'rgba'));
  grad.addColorStop(0.55, rgb.replace(')', ',0.22)').replace('rgb', 'rgba'));
  grad.addColorStop(1, rgb.replace(')', ',0)').replace('rgb', 'rgba'));
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function rgbA([r, g, b]: RGB, a: number): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** رنگ‌های مشتق از مایع برای قطره و حباب — یک بار در هر فریم */
interface LiquidTones {
  base: RGB;
  deep: RGB;
  light: RGB;
  glint: RGB;
}

function tones(liquid: RGB): LiquidTones {
  return {
    base: liquid,
    deep: scaleRgb(liquid, 0.62),
    light: tintWhite(liquid, 0.38),
    glint: tintWhite(liquid, 0.7),
  };
}

export class ClassicBrewPainter {
  private sprites = new Map<string, HTMLCanvasElement>();
  private images = new Map<string, HTMLImageElement>();
  private spoonArt: HTMLCanvasElement | null = null;

  private soft(hex: string, inner = 0.85): HTMLCanvasElement {
    const key = `${hex}:${inner}`;
    const hit = this.sprites.get(key);
    if (hit) return hit;
    const n = parseInt(hex.replace('#', ''), 16);
    const rgb = `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`;
    const sprite = blobSprite(rgb, inner);
    this.sprites.set(key, sprite);
    return sprite;
  }

  private piece(kind: PieceKind, sprite: number): HTMLImageElement | null {
    if (kind === 'dust' || typeof Image === 'undefined') return null;
    const url = pieceUrl(kind, sprite);
    let img = this.images.get(url);
    if (!img) {
      img = new Image();
      img.src = url;
      this.images.set(url, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  private spoonCanvas(): HTMLCanvasElement | null {
    if (this.spoonArt) return this.spoonArt;
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    drawShape(ctx, classicSpoonShape(), { width: 256, height: 256, scale: 1 });
    this.spoonArt = c;
    return c;
  }

  render(ctx: CanvasRenderingContext2D, viewW: number, viewH: number, sim: ClassicBrewSim): void {
    ctx.clearRect(0, 0, viewW, viewH);
    const sx = viewW / RECT.width;
    const sy = viewH / RECT.height;
    const mx = (CLASSIC_MOUTH.x - RECT.x) * sx;
    const my = (CLASSIC_MOUTH.y - RECT.y) * sy;
    const rx = CLASSIC_MOUTH.rx * sx;
    const ry = CLASSIC_MOUTH.ry * sy;
    const liquid = sim.liquidRgb;

    this.steam(ctx, mx, my, rx, ry, sim);
    this.heatHaze(ctx, mx, my, rx, ry, sim);
    this.drawSpoon(ctx, mx, my, rx, ry, sim);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(mx, my, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();

    this.interior(ctx, mx, my, rx, ry);
    this.liquid(ctx, mx, my, rx, ry, liquid, sim);
    this.blooms(ctx, mx, my, rx, ry, sim);
    this.chips(ctx, mx, my, rx, ry, liquid, sim);
    this.bubbles(ctx, mx, my, rx, ry, liquid, sim);
    this.spots(ctx, mx, my, rx, ry, sim);
    this.sheen(ctx, mx, my, rx, ry, sim);
    ctx.restore();

    this.droplets(ctx, mx, my, rx, ry, liquid, sim);
    this.shimmer(ctx, mx, my, rx, ry, sim);
  }

  private interior(ctx: CanvasRenderingContext2D, mx: number, my: number, rx: number, ry: number): void {
    const g = ctx.createRadialGradient(mx, my - ry * 0.2, rx * 0.2, mx, my, rx);
    g.addColorStop(0, '#4a2818');
    g.addColorStop(0.72, '#2a140c');
    g.addColorStop(1, '#140804');
    ctx.fillStyle = g;
    ctx.fillRect(mx - rx, my - ry, rx * 2, ry * 2);
  }

  private liquid(
    ctx: CanvasRenderingContext2D,
    mx: number,
    my: number,
    rx: number,
    ry: number,
    liquid: RGB,
    sim: ClassicBrewSim,
  ): void {
    // سطح آب: با fill<1 (دیگ نو در حال پرشدن) سطح از تهِ دیگ (پایینِ دهانه، کوچک‌تر و
    // تیره‌تر) به‌سمت لبه بالا می‌آید و پهن می‌شود — پرشدن از پایین به بالا.
    const fill = sim.fill;
    if (fill <= 0.01) return;
    const depth = 1 - fill;
    const level = 0.42 + 0.58 * fill;
    const ox = sim.sloshX * rx;
    const oy = sim.sloshY * ry + sim.shiver * ry * 0.02 + (sim.dome > 0 ? -ry * 0.03 * sim.dome : 0);
    const lx = mx + ox;
    const lrx = rx * 0.97 * level;
    const lry = ry * 0.88 * level;
    // سطحِ کوچک‌تر پایینِ دهانه می‌نشیند و با پرشدن بالا می‌آید (کمی از تهِ بیضی می‌گذرد تا عمق حس شود)
    const ly = my - ry * 0.04 + oy + depth * (ry * 1.15 - lry);
    if (depth > 0) {
      // سایه‌ی دیواره‌ی داخلی روی آبِ پایین: هرچه عمیق‌تر، تیره‌تر
      ctx.save();
      ctx.globalAlpha = 0.55 * depth;
      const wall = ctx.createLinearGradient(0, ly - lry, 0, ly + lry);
      wall.addColorStop(0, 'rgba(0,0,0,0.6)');
      wall.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = wall;
      ctx.fillRect(mx - rx, my - ry, rx * 2, ry * 2);
      ctx.restore();
    }
    const hex = rgbToHex(liquid);
    const deep = rgbToHex(tintWhite(liquid, -0.01));
    const g = ctx.createRadialGradient(lx - lrx * 0.15, ly - lry * 0.2, lrx * 0.1, lx, ly, lrx);
    g.addColorStop(0, rgba(hex, 0.92));
    g.addColorStop(0.62, rgba(hex, 0.97));
    g.addColorStop(1, rgba(deep, 1));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(lx, ly, lrx, lry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(sim.swirl);
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = 'rgba(255,244,220,0.9)';
    ctx.lineWidth = Math.max(1, ry * 0.035);
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, lrx * (0.34 + i * 0.22), lry * (0.26 + i * 0.18), i * 0.5, 0.4, Math.PI * 1.35);
      ctx.stroke();
    }
    ctx.restore();

    // منیسک و انعکاس مسی لبه
    ctx.strokeStyle = 'rgba(70, 32, 14, 0.45)';
    ctx.lineWidth = Math.max(1, ry * 0.028);
    ctx.beginPath();
    ctx.ellipse(lx, ly, lrx * 0.99, lry * 0.99, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(196, 120, 64, 0.4)';
    ctx.lineWidth = Math.max(1.2, ry * 0.03);
    ctx.beginPath();
    ctx.ellipse(lx, ly, lrx * 0.9, lry * 0.88, 0, Math.PI * 1.05, Math.PI * 1.85);
    ctx.stroke();

    const hx = lx - lrx * 0.22 + ox * 0.4;
    const hy = ly - lry * 0.28;
    const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, lrx * 0.45);
    hg.addColorStop(0, 'rgba(255,248,230,0.38)');
    hg.addColorStop(1, 'rgba(255,248,230,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(hx, hy, lrx * 0.38, lry * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // پرشدن: حلقه‌های موج از مرکز به لبه
    if (fill < 1) {
      ctx.strokeStyle = 'rgba(255,250,240,0.9)';
      ctx.lineWidth = Math.max(1, ry * 0.04);
      for (let i = 0; i < 3; i++) {
        const p = (sim.time * 1.7 + i / 3) % 1;
        ctx.globalAlpha = (1 - p) * 0.4 * Math.min(1, fill * 4);
        ctx.beginPath();
        ctx.ellipse(lx, ly, lrx * (0.1 + 0.85 * p), lry * (0.1 + 0.85 * p), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    if (sim.fireGlow > 0.02) {
      ctx.globalAlpha = sim.fireGlow * 0.28;
      const fg = ctx.createRadialGradient(lx, ly + lry * 0.4, 0, lx, ly, lrx);
      fg.addColorStop(0, 'rgba(255,150,50,0.0)');
      fg.addColorStop(0.7, 'rgba(255,120,40,0.45)');
      fg.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(mx - rx, my - ry, rx * 2, ry * 2);
      ctx.globalAlpha = 1;
    }
  }

  private blooms(ctx: CanvasRenderingContext2D, mx: number, my: number, rx: number, ry: number, sim: ClassicBrewSim): void {
    for (const b of sim.blooms) {
      const t = b.age / b.life;
      const a = Math.sin(Math.min(1, t) * Math.PI) * 0.42;
      const sprite = this.soft(b.color, 0.7);
      const rad = b.radius * rx * 0.85;
      ctx.globalAlpha = a;
      ctx.drawImage(sprite, mx + b.u * rx - rad, my + b.v * ry - rad * 0.55, rad * 2, rad * 1.1);
    }
    ctx.globalAlpha = 1;
  }

  private chips(
    ctx: CanvasRenderingContext2D,
    mx: number,
    my: number,
    rx: number,
    ry: number,
    liquid: RGB,
    sim: ClassicBrewSim,
  ): void {
    const hex = rgbToHex(liquid);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(mx, my - ry * 0.04, rx * 0.9, ry * 0.78, 0, 0, Math.PI * 2);
    ctx.clip();
    for (const c of sim.chips) {
      if (c.depth > 0.98) continue;
      const bob = Math.sin(c.bob) * ry * 0.035 * (1 - c.depth);
      const x = mx + c.u * rx;
      const y = my + c.v * ry + bob + c.depth * ry * 0.25;
      const scale = 1 - 0.5 * c.depth;
      const alpha = 1 - 0.65 * c.depth;
      const longest = c.size * (rx / CLASSIC_MOUTH.rx) * scale;
      const w = c.aspect >= 1 ? longest : longest * c.aspect;
      const h = c.aspect >= 1 ? longest / c.aspect : longest;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((c.rot * Math.PI) / 180);
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = 'rgba(20,10,4,0.8)';
      ctx.beginPath();
      ctx.ellipse(w * 0.08, h * 0.12, w * 0.46, h * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
      if (c.powder) {
        const sprite = this.soft(c.color, 0.9);
        ctx.drawImage(sprite, -w * 0.55, -h * 0.55, w * 1.1, h * 1.1);
      } else {
        const img = this.piece(c.kind, c.sprite);
        ctx.translate(-w / 2, -h / 2);
        ctx.beginPath();
        if (c.generation > 0) tracePolygon(ctx, nickPolygon(c.nick), w, h);
        else {
          const shape = kindPolygon(c.kind);
          if (shape && !img) tracePolygon(ctx, shape, w, h);
          else ctx.rect(0, 0, w, h);
        }
        ctx.clip();
        if (img) {
          ctx.drawImage(img, 0, 0, w, h);
          ctx.globalAlpha = alpha * 0.28;
          ctx.fillStyle = c.color;
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.fillStyle = c.depth > 0.45 ? hex : c.color;
          ctx.fillRect(0, 0, w, h);
          if (c.depth <= 0.45) {
            ctx.globalAlpha = alpha * 0.28;
            ctx.fillStyle = 'rgba(255,244,220,0.85)';
            ctx.beginPath();
            ctx.ellipse(w * 0.34, h * 0.3, w * 0.16, h * 0.1, -0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }

  private bubbles(
    ctx: CanvasRenderingContext2D,
    mx: number,
    my: number,
    rx: number,
    ry: number,
    liquid: RGB,
    sim: ClassicBrewSim,
  ): void {
    const tone = tones(liquid);
    const px = rx / CLASSIC_MOUTH.rx;
    /** گنبد حباب از بالا-جلو دیده می‌شود: کمی پهن‌تر از بلند */
    const DOME = 0.78;
    for (const b of sim.bubbles) {
      const t = b.age / b.dur;
      const base = 3.8 * b.size * px;
      const x = mx + b.u * rx;
      const y = my + b.v * ry;
      if (t < BUBBLE_GROW) {
        // رشد گنبد با لرزش ریز؛ نزدیک ترکیدن کمی می‌کشد و روشن‌تر می‌شود
        const g = easeOut(t / BUBBLE_GROW);
        const wob = 1 + 0.045 * Math.sin(sim.time * 21 + b.wob) * g;
        const rad = base * (0.28 + 0.72 * g) * wob;
        const ry2 = rad * DOME * (1 - 0.08 * Math.sin(sim.time * 21 + b.wob + 1.2) * g);
        const lift = rad * 0.22 * g;
        const cy = y - lift;
        const strain = Math.max(0, (t - BUBBLE_GROW * 0.7) / (BUBBLE_GROW * 0.3));

        // سایه‌ی زیر گنبد روی سطح مایع
        ctx.globalAlpha = 0.22 * g;
        ctx.fillStyle = rgbA(tone.deep, 1);
        ctx.beginPath();
        ctx.ellipse(x, y + rad * 0.12, rad * 1.02, ry2 * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // بدنه‌ی شیشه‌ای: وسط شفاف، لبه پرتر و روشن (شکست نور) با ته تیره‌تر
        const body = ctx.createRadialGradient(x - rad * 0.2, cy - ry2 * 0.25, rad * 0.05, x, cy, rad);
        body.addColorStop(0, rgbA(tone.light, 0.08));
        body.addColorStop(0.55, rgbA(tone.base, 0.1));
        body.addColorStop(0.86, rgbA(tone.deep, 0.32));
        body.addColorStop(1, rgbA(tone.glint, 0.62 + 0.25 * strain));
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(x, cy, rad, ry2, 0, 0, Math.PI * 2);
        ctx.fill();

        // نوار روشن لبه (بالا‌چپ پررنگ‌تر)
        ctx.globalAlpha = 0.75 + 0.2 * strain;
        ctx.strokeStyle = rgbA(tone.glint, 0.9);
        ctx.lineWidth = Math.max(0.7, rad * 0.16);
        ctx.beginPath();
        ctx.ellipse(x, cy, rad * 0.93, ry2 * 0.93, 0, Math.PI * 0.95, Math.PI * 1.9);
        ctx.stroke();
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = rgbA(tone.deep, 0.9);
        ctx.beginPath();
        ctx.ellipse(x, cy, rad * 0.93, ry2 * 0.93, 0, Math.PI * 0.1, Math.PI * 0.85);
        ctx.stroke();

        // برق اصلی و انعکاس کوچک پایین‌راست
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = 'rgba(255,252,246,0.95)';
        ctx.beginPath();
        ctx.ellipse(x - rad * 0.36, cy - ry2 * 0.42, rad * 0.26, ry2 * 0.18, -0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(x + rad * 0.42, cy + ry2 * 0.38, rad * 0.11, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // ترکیدن: حلقه‌ی نازکِ در حال بازشدن + چند ریزپاشه
        const p = (t - BUBBLE_GROW) / (1 - BUBBLE_GROW);
        const fade = 1 - p;
        const rad = base * (1 + p * 0.95);
        const cy = y - base * 0.22 * (1 - p);
        ctx.globalAlpha = 0.8 * fade;
        ctx.strokeStyle = rgbA(tone.glint, 0.95);
        ctx.lineWidth = Math.max(0.5, base * 0.16 * fade + 0.3);
        ctx.beginPath();
        ctx.ellipse(x, cy, rad, rad * DOME, 0, 0, Math.PI * 2);
        ctx.stroke();
        // سطح زیر حباب لحظه‌ای فرو می‌رود — چال کم‌رنگ تیره
        ctx.globalAlpha = 0.18 * fade;
        ctx.fillStyle = rgbA(tone.deep, 1);
        ctx.beginPath();
        ctx.ellipse(x, y, base * 0.7 * (1 - p * 0.5), base * 0.35 * (1 - p * 0.5), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.9 * fade;
        ctx.fillStyle = rgbA(tone.glint, 1);
        const n = 4;
        for (let i = 0; i < n; i++) {
          const a = b.wob + (i / n) * Math.PI * 2;
          const fly = rad * (1.05 + p * 0.55);
          const sx = x + Math.cos(a) * fly;
          const sy = cy + Math.sin(a) * fly * DOME - p * base * 0.9;
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(0.4, base * 0.18 * fade), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    for (const f of sim.foam) {
      const t = f.age / f.dur;
      ctx.globalAlpha = 0.35 * (1 - t);
      ctx.fillStyle = 'rgba(255,250,240,0.9)';
      ctx.beginPath();
      ctx.ellipse(mx + f.u * rx, my + f.v * ry, rx * 0.06, ry * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private spots(ctx: CanvasRenderingContext2D, mx: number, my: number, rx: number, ry: number, sim: ClassicBrewSim): void {
    if (!sim.spots.length) return;
    ctx.fillStyle = 'rgba(20,12,8,0.55)';
    for (const s of sim.spots) {
      ctx.beginPath();
      ctx.ellipse(mx + s.u * rx, my + s.v * ry, s.r * rx, s.r * ry * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private sheen(ctx: CanvasRenderingContext2D, mx: number, my: number, rx: number, ry: number, sim: ClassicBrewSim): void {
    if (sim.spots.length === 0) return;
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = 'rgba(180,160,120,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(mx, my, rx * 0.55, ry * 0.35, -0.4, 0.4, 2.2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawSpoon(ctx: CanvasRenderingContext2D, mx: number, my: number, rx: number, ry: number, sim: ClassicBrewSim): void {
    const drop = sim.spoonDrop;
    if (drop <= 0.01) return;
    const art = this.spoonCanvas();
    if (!art) return;
    const drawW = rx * 2.15;
    const drawH = drawW;
    const bowlRy = drawH * (38 / 256);
    const bx = mx + Math.cos(sim.spoonAngle) * rx * 0.55;
    const by = my + Math.sin(sim.spoonAngle) * ry * 0.35 + bowlRy * 0.1 * drop - (1 - drop) * ry * 8;
    const bowlFracX = 128 / 256;
    const bowlFracY = 210 / 256;
    const tilt = -Math.cos(sim.spoonAngle) * 16;
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx - rx * 3, my - ry * 24, rx * 6, my - ry * 0.2 - (my - ry * 24));
    ctx.ellipse(mx, my, rx * 0.96, ry * 0.92, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(bx, by);
    ctx.rotate((tilt * Math.PI) / 180);
    ctx.drawImage(art, -drawW * bowlFracX, -drawH * bowlFracY, drawW, drawH);
    ctx.restore();
  }

  private droplets(
    ctx: CanvasRenderingContext2D,
    mx: number,
    my: number,
    rx: number,
    _ry: number,
    liquid: RGB,
    sim: ClassicBrewSim,
  ): void {
    if (sim.drops.length === 0) return;
    const tone = tones(liquid);
    const px = rx / CLASSIC_MOUTH.rx;
    const depth = CLASSIC_SPLASH_TABLE.depth;

    // ۱) لکه‌های نشسته زیر همه، ۲) سایه‌ها، ۳) قطره‌های در پرواز رو
    for (const d of sim.drops) if (d.phase === 'dry') this.splat(ctx, mx, my, rx, px, tone, d);
    for (const d of sim.drops) {
      if (d.phase !== 'fly' || !tableVisible(d.x, d.z)) continue;
      const gx = mx + d.x * rx;
      const gy = my + dropGroundY(d) * rx;
      const h = Math.max(0, d.y);
      const rad = d.r * px * (1.1 - Math.min(0.5, h * 0.35));
      ctx.globalAlpha = Math.max(0, 0.3 - h * 0.14);
      ctx.fillStyle = 'rgba(24,12,4,1)';
      ctx.beginPath();
      ctx.ellipse(gx, gy, rad, rad * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const d of sim.drops) {
      if (d.phase !== 'fly') continue;
      const s = dropScreen(d);
      const x = mx + s.x * rx;
      const y = my + s.y * rx;
      // کشیدگی قطره در جهت حرکت روی صفحه
      const svx = d.vx;
      const svy = -d.vy + d.vz * depth;
      const speed = Math.hypot(svx, svy);
      const stretch = Math.min(0.85, speed * 0.16);
      const ang = Math.atan2(svy, svx);
      const rad = d.r * px;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      const rl = rad * (1 + stretch);
      const rs = rad * (1 - stretch * 0.32);
      // بدنه: شیشه‌ای همرنگ مایع، لبه‌ی پشت تیره‌تر (ضخامت)، جلو روشن
      const body = ctx.createRadialGradient(-rl * 0.25, -rs * 0.3, rs * 0.05, 0, 0, rl);
      body.addColorStop(0, rgbA(tone.light, 0.97));
      body.addColorStop(0.42, rgbA(tone.base, 0.96));
      body.addColorStop(1, rgbA(tone.deep, 0.92));
      ctx.globalAlpha = d.child ? 0.85 : 0.95;
      ctx.fillStyle = body;
      ctx.beginPath();
      // دُم اشکی: پشتِ قطره (خلاف حرکت) باریک می‌شود
      ctx.moveTo(-rl, 0);
      ctx.bezierCurveTo(-rl * 0.6, -rs, rl * 0.25, -rs, rl, 0);
      ctx.bezierCurveTo(rl * 0.25, rs, -rl * 0.6, rs, -rl, 0);
      ctx.closePath();
      ctx.fill();
      // برقِ نور
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = 'rgba(255,253,247,0.95)';
      ctx.beginPath();
      ctx.ellipse(rl * 0.05, -rs * 0.38, rl * 0.28, rs * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /** لکه‌ی خیسِ نشسته روی میز: بیضی فشرده با دو قطره‌ی کناری، برق لبه و حلقه‌ی برخورد */
  private splat(
    ctx: CanvasRenderingContext2D,
    mx: number,
    my: number,
    rx: number,
    px: number,
    tone: LiquidTones,
    d: SplashDrop,
  ): void {
    const s = dropScreen(d);
    const x = mx + s.x * rx;
    const y = my + s.y * rx;
    const dry = Math.min(1, d.dry);
    const wet = 1 - dry;
    // لکه ابتدا کمی پهن می‌شود، بعد از لبه‌ها خشک می‌شود و جمع می‌شود
    const settle = Math.min(1, d.hit / 0.12);
    const w = d.r * px * d.splat * (0.75 + 0.25 * easeOut(settle)) * (1 - 0.45 * dry * dry);
    const h = w * 0.4;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(d.rot * 0.35);
    ctx.globalAlpha = 0.9 * wet;
    ctx.fillStyle = rgbA(scaleRgb(tone.base, 0.85), 1);
    ctx.beginPath();
    ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
    if (!d.child) {
      ctx.ellipse(Math.cos(d.rot) * w * 0.85, Math.sin(d.rot) * h * 0.8, w * 0.28, h * 0.32, 0, 0, Math.PI * 2);
      ctx.ellipse(-Math.cos(d.rot + 0.7) * w * 0.8, -Math.sin(d.rot + 0.7) * h * 0.7, w * 0.2, h * 0.26, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    // لبه‌ی تیره‌ی ضخامت مایع و برقِ رطوبت روی لبه‌ی بالا
    ctx.globalAlpha = 0.35 * wet;
    ctx.strokeStyle = rgbA(tone.deep, 1);
    ctx.lineWidth = Math.max(0.6, h * 0.16);
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.96, h * 0.96, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.7 * wet * wet;
    ctx.strokeStyle = rgbA(tone.glint, 1);
    ctx.lineWidth = Math.max(0.6, h * 0.22);
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.05, w * 0.72, h * 0.62, 0, Math.PI * 1.1, Math.PI * 1.8);
    ctx.stroke();
    ctx.restore();

    // حلقه‌ی برخورد: در ۰٫۲۵ ثانیه‌ی اول باز می‌شود و محو می‌شود
    if (!d.child && d.hit < 0.25) {
      const p = d.hit / 0.25;
      const rr = d.r * px * (1.2 + p * 2.6);
      ctx.globalAlpha = 0.6 * (1 - p);
      ctx.strokeStyle = rgbA(tone.light, 1);
      ctx.lineWidth = Math.max(0.6, d.r * px * 0.45 * (1 - p));
      ctx.beginPath();
      ctx.ellipse(x, y, rr, rr * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private steam(ctx: CanvasRenderingContext2D, mx: number, my: number, rx: number, ry: number, sim: ClassicBrewSim): void {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of sim.steam) {
      const t = s.age / s.dur;
      const fade = Math.min(1, t * 4) * Math.pow(1 - t, 0.85);
      const y = my - ry * 1.2 - s.rise * ry * 5.5 - t * ry * 1.1;
      const x = mx + s.u * rx + Math.sin(s.phase + t * 4) * rx * 0.12;
      const size = (18 + t * 46) * s.size * (rx / CLASSIC_MOUTH.rx);
      const clockwise = s.phase > Math.PI;
      ctx.globalAlpha = fade * (s.smoke ? 0.55 : 0.7);
      ctx.strokeStyle = s.smoke ? '#6a625c' : s.tint && s.tint !== '#3f6f8f' ? s.tint : '#f4efe6';
      ctx.lineWidth = (s.smoke ? 5 : 3.2) * (0.6 + t);
      ctx.beginPath();
      const turns = s.smoke ? 1.2 : 1.6;
      for (let i = 0; i <= 28; i++) {
        const a = (i / 28) * Math.PI * 2 * turns + s.phase;
        const rad = (i / 28) * size;
        const px = x + Math.cos(a) * rad * (clockwise ? 1 : -1);
        const py = y - rad * 0.55 + Math.sin(a) * rad * 0.28;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private heatHaze(ctx: CanvasRenderingContext2D, mx: number, my: number, rx: number, ry: number, sim: ClassicBrewSim): void {
    if (sim.heat < 0.75) return;
    ctx.globalAlpha = (sim.heat - 0.7) * 0.18;
    ctx.strokeStyle = 'rgba(255,236,210,0.8)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const y = my - ry * (1.05 + i * 0.18);
      ctx.beginPath();
      for (let x = -rx; x <= rx; x += 8) {
        const yy = y + Math.sin(sim.time * 7 + x * 0.05 + i) * 2.5;
        if (x === -rx) ctx.moveTo(mx + x, yy);
        else ctx.lineTo(mx + x, yy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private shimmer(ctx: CanvasRenderingContext2D, mx: number, my: number, rx: number, ry: number, sim: ClassicBrewSim): void {
    if (sim.sparkleCount === 0) return;
    for (const s of sim.sparkles) {
      const t = s.age / 0.7;
      const a = Math.sin(Math.PI * t);
      const x = mx + s.u * rx;
      const y = my + s.v * ry - ry * 0.35;
      const rad = 7 + a * 11;
      const rot = t * 1.1;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = a;
      const star = (points: number, outer: number, inner: number, fill: string) => {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
          const ang = (i * Math.PI) / points - Math.PI / 2;
          const r = i % 2 === 0 ? outer : inner;
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      };
      star(8, rad, rad * 0.38, '#e8c15a');
      ctx.rotate(0.4);
      star(4, rad * 0.42, rad * 0.16, '#fff6d2');
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
