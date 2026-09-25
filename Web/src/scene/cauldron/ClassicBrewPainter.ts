/**
 * نقاشی Canvas 2D داخل دهانه‌ی پاتیل کلاسیک.
 * نرمی از بلاب‌های گرادیانی ازپیش‌ساخته است؛ ctx.filter استفاده نمی‌شود.
 */

import { drawShape } from '../../art/flat/kit/canvas2d.ts';
import { rgbToHex, tintWhite, type RGB } from '../../art/flat/kit/color.ts';
import { classicSpoonShape } from '../classicSpoon';
import { CLASSIC_FX_RECT_TALL, CLASSIC_MOUTH } from '../classicCauldronGeometry';
import { pieceUrl } from '../mortarLayout';
import type { PieceKind } from '../mortarPile';
import type { BrewChip, ClassicBrewSim } from './ClassicBrewSim';
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
    this.powder(ctx, mx, my, rx, ry, sim);
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
    const ox = sim.sloshX * rx;
    const oy = sim.sloshY * ry + sim.shiver * ry * 0.02 + (sim.dome > 0 ? -ry * 0.03 * sim.dome : 0);
    const lx = mx + ox;
    const ly = my - ry * 0.04 + oy;
    const lrx = rx * 0.97;
    const lry = ry * 0.88;
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

  private powder(ctx: CanvasRenderingContext2D, mx: number, my: number, rx: number, ry: number, sim: ClassicBrewSim): void {
    const groups = new Map<string, BrewChip[]>();
    for (const c of sim.chips) {
      if (!c.powder || c.depth > 0.92) continue;
      const list = groups.get(c.color) ?? [];
      list.push(c);
      groups.set(c.color, list);
    }
    for (const [color, list] of groups) {
      if (list.length < 2) continue;
      const ordered = [...list].sort((a, b) => Math.atan2(a.v, a.u) - Math.atan2(b.v, b.u));
      ctx.beginPath();
      ordered.forEach((c, i) => {
        const x = mx + c.u * rx;
        const y = my + c.v * ry;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = rgba(color, 0.45);
      ctx.lineWidth = Math.max(4, ry * 0.18);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
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
        ctx.drawImage(sprite, -w, -h, w * 2, h * 2);
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
          const grd = ctx.createLinearGradient(0, 0, w, h);
          grd.addColorStop(0, rgba(c.color, 1));
          grd.addColorStop(0.55, '#fff0d2');
          grd.addColorStop(1, rgba(c.color, 1));
          ctx.fillStyle = c.depth > 0.45 ? hex : grd;
          ctx.fillRect(0, 0, w, h);
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
    const rim = rgbToHex(tintWhite(liquid, 0.45));
    for (const b of sim.bubbles) {
      const t = b.age / b.dur;
      const rad = (2.2 + t * 4.5) * (rx / CLASSIC_MOUTH.rx);
      const x = mx + b.u * rx;
      const y = my + b.v * ry - t * ry * (b.rim ? 0.05 : 0.2);
      ctx.globalAlpha = 0.85 * (1 - t * 0.3);
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(rim, 0.9);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.28, 0, Math.PI * 2);
      ctx.fill();
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
    const hex = rgbToHex(tintWhite(liquid, 0.2));
    ctx.fillStyle = hex;
    for (const d of sim.drops) {
      const dry = d.phase === 'dry' ? d.dry : 0;
      const rad = d.r * (rx / 90) * (1 - dry * 0.7);
      ctx.globalAlpha = d.phase === 'fly' ? 0.92 : Math.max(0, 1 - dry);
      const ySpan = rx * 0.95;
      ctx.beginPath();
      ctx.ellipse(mx + d.u * rx, my + d.v * ySpan, rad, rad * (d.phase === 'dry' ? 0.45 : 0.75), 0, 0, Math.PI * 2);
      ctx.fill();
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
