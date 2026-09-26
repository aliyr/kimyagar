/**
 * لکه‌ی محتوای دورریخته روی دیوار چوبیِ پشت — لایه‌ی پشت صحنه (scene-depth--back):
 * روی دیوار، پشتِ قفسه‌ی مواد (لایه‌ی میانی) و زیرِ میز (z میز بالاتر است، پس
 * چکه‌ها زیر لبه‌ی پشتی میز خودبه‌خود پنهان می‌شوند).
 *
 * دو Canvas روی هم:
 *   - stain (mix-blend-mode: multiply): خودِ مایع؛ بافت چوب از زیرش دیده می‌شود.
 *   - gloss (normal): برق خیسی، لبه‌ی تیره‌ی ضخامت، حلقه‌ی برخورد؛ با خشک‌شدن کم می‌شود.
 *
 * زمان از `discard.startedAt` می‌آید تا با دیگِ پرنده (DiscardFx در لایه‌ی کار)
 * هم‌گام باشد. صحنه (توده‌ها، رشته‌ها، چکه‌ها، پاشش) در cauldron/discardMotion.
 *
 * قرارداد تست: data-testid=discard-wall.
 */

import { useEffect, useRef } from 'react';
import { rectStyle } from './Zone';
import { useUiState } from './uiState';
import {
  blobPoint,
  BLOB_POINTS,
  buildDiscardScene,
  DISCARD,
  dripLength,
  dripPoint,
  splatAlpha,
  splatDryness,
  WALL_RECT,
  type DiscardScene,
  type SplatBlob,
} from './cauldron/discardMotion';
import { clamp01, easeOut, rgbA, tonesFor, type DiscardTones } from './cauldron/discardTones';
import { SCENE_ZONES } from './artManifest';
import './classic-stations.css';

const RECT = WALL_RECT;

function blobGrow(b: SplatBlob, t: number): number {
  if (t < b.at) return 0;
  // اول تند پهن می‌شود، بعد کمی جمع می‌شود (ضخامت مایع خودش را می‌کشد)
  const u = clamp01((t - b.at) / 0.16);
  return 0.5 + 0.5 * easeOut(u) + 0.08 * Math.sin(Math.min(1, u) * Math.PI);
}

/** مسیرِ لَب‌دارِ توده با منحنی‌های نرم بین نقاط میانی */
function blobPath(ctx: CanvasRenderingContext2D, b: SplatBlob, g: number): void {
  const p0 = blobPoint(b, 0, g);
  const p1 = blobPoint(b, 1, g);
  ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
  for (let i = 1; i <= BLOB_POINTS; i++) {
    const a = blobPoint(b, i, g);
    const n = blobPoint(b, i + 1, g);
    ctx.quadraticCurveTo(a.x, a.y, (a.x + n.x) / 2, (a.y + n.y) / 2);
  }
  ctx.closePath();
}

class WallPainter {
  private readonly scene: DiscardScene;
  private readonly tones: DiscardTones;

  constructor(scene: DiscardScene, tones: DiscardTones) {
    this.scene = scene;
    this.tones = tones;
  }

  private setup(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    const sx = viewW / RECT.width;
    const sy = viewH / RECT.height;
    ctx.setTransform(sx, 0, 0, sy, -RECT.x * sx, -RECT.y * sy);
    // زیر لبه‌ی پشتی میز دیوار نیست
    ctx.beginPath();
    ctx.rect(RECT.x, RECT.y, RECT.width, DISCARD.wallBottom - RECT.y);
    ctx.clip();
  }

  /** لایه‌ی مایع (multiply روی چوب) */
  stain(ctx: CanvasRenderingContext2D, viewW: number, viewH: number, t: number): void {
    const alpha = splatAlpha(t);
    if (alpha <= 0) return;
    const dry = splatDryness(t);
    const a = t - DISCARD.gobsHit;
    const tone = this.tones;
    ctx.save();
    this.setup(ctx, viewW, viewH);
    // خشک‌شدن: لکه کمی جمع می‌شود و کم‌رنگ‌تر (ولی تا محو نهایی می‌ماند)
    const shrink = 1 - 0.07 * dry;
    const body = rgbA(tone.base, 1);
    const thick = rgbA(tone.deep, 1);

    // پاشش ریز: قطره‌های کشیده در جهت دورشدن از مرکز برخورد
    ctx.fillStyle = body;
    for (const s of this.scene.spatter) {
      if (t < s.at) continue;
      const g = easeOut(clamp01((t - s.at) / 0.1)) * shrink;
      ctx.globalAlpha = alpha * 0.9;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.ang);
      ctx.beginPath();
      ctx.moveTo(-s.r * g, 0);
      ctx.bezierCurveTo(-s.r * g * 0.5, -s.r * g, s.r * s.stretch * g * 0.6, -s.r * g * 0.55, s.r * s.stretch * g, 0);
      ctx.bezierCurveTo(s.r * s.stretch * g * 0.6, s.r * g * 0.55, -s.r * g * 0.5, s.r * g, -s.r * g, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // رشته‌های کشیده از توده‌ی اصلی
    ctx.globalAlpha = alpha * 0.92;
    for (const td of this.scene.tendrils) {
      if (t < td.at) continue;
      const g = easeOut(clamp01((t - td.at) / 0.14)) * shrink;
      const len = td.len * g;
      ctx.save();
      ctx.translate(td.x, td.y);
      ctx.rotate(td.ang);
      ctx.beginPath();
      ctx.moveTo(-4, -td.width / 2);
      ctx.quadraticCurveTo(len * 0.55, -td.width * 0.22, len, 0);
      ctx.quadraticCurveTo(len * 0.55, td.width * 0.22, -4, td.width / 2);
      ctx.closePath();
      ctx.fill();
      // قطره‌ی سرِ رشته
      ctx.beginPath();
      ctx.ellipse(len, 0, td.width * 0.34, td.width * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // توده‌ها: یک مسیر تا هم‌پوشانی‌ها تیره‌تر نشوند
    ctx.globalAlpha = alpha * 0.95;
    ctx.beginPath();
    for (const b of this.scene.blobs) {
      const g = blobGrow(b, t) * shrink;
      if (g <= 0) continue;
      blobPath(ctx, b, g);
    }
    ctx.fill();

    // ضخامت: مرکز توده‌های بزرگ غلیظ‌تر (گرادیان شعاعی، فقط داخل توده)
    for (const b of this.scene.blobs) {
      if (b.rx < 60) continue;
      const g = blobGrow(b, t) * shrink;
      if (g <= 0) continue;
      const grad = ctx.createRadialGradient(b.x, b.y + b.ry * 0.15, 0, b.x, b.y, b.rx * g);
      grad.addColorStop(0, rgbA(tone.deep, 0.55 * (1 - 0.5 * dry)));
      grad.addColorStop(0.7, rgbA(tone.deep, 0.15));
      grad.addColorStop(1, rgbA(tone.deep, 0));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = grad;
      ctx.beginPath();
      blobPath(ctx, b, g);
      ctx.fill();
    }

    // چکه‌ها: مایعِ روان غلیظ‌تر (تیره‌تر) از لکه‌ی پهن — تا روی خودِ لکه هم دیده شوند؛
    // مسیرِ پیچ‌دار با پهنای رو به کم + قطره‌ی سر
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const run = rgbA(tone.deep, 1);
    for (const d of this.scene.drips) {
      const len = dripLength(d, a);
      if (len <= 0.5) continue;
      const steps = Math.max(2, Math.ceil(len / 8));
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = run;
      for (let i = 0; i < steps; i++) {
        const s0 = (i / steps) * len;
        const s1 = ((i + 1) / steps) * len;
        const p0 = dripPoint(d, s0);
        const p1 = dripPoint(d, s1);
        const taper = 1 - 0.55 * (s1 / Math.max(len, 1));
        ctx.lineWidth = Math.max(1.2, d.width * taper * (1 - 0.25 * dry));
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      // سر: قطره‌ی آویزان، هرچه چکه پرتر، درشت‌تر؛ رو به پایان کوچک می‌شود
      const head = dripPoint(d, len);
      const full = 1 - len / d.maxLen;
      const hr = d.width * (0.5 + 0.45 * full) * (1 - 0.3 * dry);
      ctx.fillStyle = run;
      ctx.beginPath();
      ctx.ellipse(head.x, head.y + hr * 0.3, hr, hr * 1.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = thick;
      ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath();
      ctx.ellipse(head.x, head.y + hr * 0.55, hr * 0.6, hr * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /** لایه‌ی برق و لبه (normal) — با خشک‌شدن کم می‌شود */
  gloss(ctx: CanvasRenderingContext2D, viewW: number, viewH: number, t: number): void {
    const alpha = splatAlpha(t);
    if (alpha <= 0) return;
    const wet = 1 - splatDryness(t);
    const a = t - DISCARD.gobsHit;
    const tone = this.tones;
    ctx.save();
    this.setup(ctx, viewW, viewH);

    // حلقه‌ی برخورد: در ۰٫۲ ثانیه‌ی اول باز می‌شود و محو
    if (a < 0.22) {
      const p = a / 0.22;
      ctx.globalAlpha = 0.55 * (1 - p);
      ctx.strokeStyle = rgbA(tone.glint, 1);
      ctx.lineWidth = 6 * (1 - p) + 1;
      ctx.beginPath();
      ctx.ellipse(DISCARD.impact.x, DISCARD.impact.y, 60 + p * 150, 34 + p * 80, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const b of this.scene.blobs) {
      const g = blobGrow(b, t) * (1 - 0.07 * (1 - wet));
      if (g <= 0) continue;
      // لبه‌ی تیره‌ی ضخامت مایع
      ctx.globalAlpha = alpha * (0.22 + 0.2 * wet);
      ctx.strokeStyle = rgbA(tone.deep, 1);
      ctx.lineWidth = b.rx > 60 ? 2.4 : 1.4;
      ctx.beginPath();
      blobPath(ctx, b, g);
      ctx.stroke();
      // برق خیسی بالا-چپ (نور از بالا-چپ می‌آید)
      if (b.rx >= 30) {
        ctx.globalAlpha = alpha * 0.42 * wet;
        const hx = b.x - b.rx * g * 0.32;
        const hy = b.y - b.ry * g * 0.36;
        const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, b.rx * g * 0.5);
        hg.addColorStop(0, rgbA(tone.glint, 0.9));
        hg.addColorStop(1, rgbA(tone.glint, 0));
        ctx.fillStyle = hg;
        ctx.beginPath();
        blobPath(ctx, b, g);
        ctx.fill();
      }
    }

    // برقِ سرِ چکه‌ها و رگه‌ی روشن روی خودِ چکه
    for (const d of this.scene.drips) {
      const len = dripLength(d, a);
      if (len <= 2) continue;
      const head = dripPoint(d, len);
      const full = 1 - len / d.maxLen;
      const hr = d.width * (0.5 + 0.45 * full);
      ctx.globalAlpha = alpha * 0.7 * wet;
      ctx.fillStyle = 'rgba(255,252,246,0.95)';
      ctx.beginPath();
      ctx.ellipse(head.x - hr * 0.3, head.y - hr * 0.05, hr * 0.22, hr * 0.32, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.3 * wet;
      ctx.strokeStyle = rgbA(tone.glint, 1);
      ctx.lineWidth = Math.max(0.8, d.width * 0.18);
      ctx.beginPath();
      const steps = Math.max(2, Math.ceil(len / 10));
      for (let i = 0; i <= steps; i++) {
        const p = dripPoint(d, (i / steps) * len * 0.85);
        if (i === 0) ctx.moveTo(p.x - d.width * 0.22, p.y);
        else ctx.lineTo(p.x - d.width * 0.22, p.y);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

export function DiscardWallFx() {
  const discard = useUiState((s) => s.discard);
  if (!discard) return null;
  return <WallRun key={discard.id} id={discard.id} liquid={discard.liquid} burnt={discard.burnt} startedAt={discard.startedAt} />;
}

function WallRun({ id, liquid, burnt, startedAt }: { id: number; liquid: string; burnt: boolean; startedAt: number }) {
  const stainRef = useRef<HTMLCanvasElement | null>(null);
  const glossRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const stain = stainRef.current;
    const gloss = glossRef.current;
    if (!stain || !gloss) return;
    const sctx = stain.getContext('2d');
    const gctx = gloss.getContext('2d');
    if (!sctx || !gctx) return;
    const painter = new WallPainter(buildDiscardScene(id), tonesFor(liquid, burnt));

    const measure = (canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    measure(stain);
    measure(gloss);

    let raf = 0;
    const loop = () => {
      const t = (performance.now() - startedAt) / 1000;
      try {
        painter.stain(sctx, stain.width, stain.height, t);
        painter.gloss(gctx, gloss.width, gloss.height, t);
      } catch (err) {
        stain.dataset.fxError = err instanceof Error ? err.message : String(err);
      }
      if (t >= DISCARD.end) return;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id, liquid, burnt, startedAt]);

  // z بین دیوار (۰) و میز (۱۰) در لایه‌ی پشت
  const z = SCENE_ZONES.workTable.z - 4;
  return (
    <>
      <canvas
        ref={stainRef}
        className="cst-discard-wall cst-discard-wall--stain"
        data-testid="discard-wall"
        style={rectStyle(RECT, z)}
        aria-hidden="true"
      />
      <canvas
        ref={glossRef}
        className="cst-discard-wall cst-discard-wall--gloss"
        style={rectStyle(RECT, z + 1)}
        aria-hidden="true"
      />
    </>
  );
}
