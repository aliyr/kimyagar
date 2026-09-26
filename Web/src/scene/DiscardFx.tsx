/**
 * نمایش دور ریختن دیگ (سطل) — لایه‌ی کار: نسخه‌ی پرنده‌ی بدنه‌ی PNG و گلوله‌های
 * محتوا که از زیر قفسه به دیوارِ پشت می‌روند. لکه‌ی روی دیوار جدا و در لایه‌ی
 * پشت است (DiscardWallFx) تا پشتِ قفسه‌ی مواد بماند. حرکت و صحنه در
 * `cauldron/discardMotion.ts` (خالص)؛ اینجا Canvas 2D و زمان‌بندی صداها/لرزش.
 *
 * دیگ واقعی (CauldronStation) در این مدت پنهان است (sim.hidePot)؛ در
 * `respawnAt` همان شبیه‌ساز ریست می‌شود و دیگ نو را از بالا می‌اندازد؛ صدای
 * «شق» فرود و شرشر آب را ClassicCauldronFx (که شبیه‌ساز را جلو می‌برد) می‌زند.
 *
 * قرارداد تست: data-testid=discard-fx، data-phase (throw | wall | respawn | done).
 *
 * چرخه‌ی عمر: تا endDiscard در uiState می‌ماند؛ unmount این کامپوننت به‌تنهایی
 * وضعیت را نمی‌بندد (StrictMode افکت را دو بار اجرا می‌کند) — CauldronStation
 * هنگام unmount واقعی صحنه آن را می‌بندد. زمان از `discard.startedAt` است.
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { seedForCustomer } from '../art/flat/react/flatSeed';
import { flatHeatLevel } from '../art/flat/react/heatLevel';
import { sfx } from '../audio/sfx';
import { haptic } from '../platform/haptics';
import { artUrl, SCENE_ZONES } from './artManifest';
import { rectStyle } from './Zone';
import { useUiState, type DiscardState } from './uiState';
import type { ClassicBrewSim } from './cauldron/ClassicBrewSim';
import {
  buildDiscardScene,
  DISCARD,
  DISCARD_RECT,
  gobPosition,
  MOUTH_LOCAL,
  mouthLiquid,
  POT_SIZE,
  potPose,
  type DiscardScene,
} from './cauldron/discardMotion';
import { rgbA, tonesFor, type DiscardTones } from './cauldron/discardTones';
import './classic-stations.css';

const RECT = DISCARD_RECT;

let potImage: HTMLImageElement | null = null;
function loadPotImage(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (!potImage) {
    potImage = new Image();
    potImage.src = artUrl(SCENE_ZONES.cauldron.img);
  }
  return potImage;
}

class DiscardPainter {
  private potLayer: HTMLCanvasElement | null = null;
  private readonly scene: DiscardScene;
  private readonly tones: DiscardTones;

  constructor(scene: DiscardScene, tones: DiscardTones) {
    this.scene = scene;
    this.tones = tones;
  }

  render(ctx: CanvasRenderingContext2D, viewW: number, viewH: number, t: number, img: HTMLImageElement | null): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    const sx = viewW / RECT.width;
    const sy = viewH / RECT.height;
    ctx.setTransform(sx, 0, 0, sy, -RECT.x * sx, -RECT.y * sy);

    this.pot(ctx, t, img);
    // گلوله‌ها جلوی دیگ: تازه از دهانه جدا شده‌اند و پیش از دیگ به دیوار می‌رسند
    this.gobs(ctx, t);
  }

  /** گلوله‌های مایع در پرواز از دهانه تا دیوار — کشیده در جهت حرکت */
  private gobs(ctx: CanvasRenderingContext2D, t: number): void {
    const tone = this.tones;
    for (const g of this.scene.gobs) {
      const p = gobPosition(g, t);
      if (!p) continue;
      const next = gobPosition(g, Math.min(g.hit - 0.001, t + 0.016)) ?? p;
      const ang = Math.atan2(next.y - p.y, next.x - p.x);
      const stretch = 1 + 0.22 * Math.min(1, Math.hypot(next.x - p.x, next.y - p.y) / 14);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      const body = ctx.createRadialGradient(-g.r * 0.2, -g.r * 0.25, g.r * 0.05, 0, 0, g.r * stretch);
      body.addColorStop(0, rgbA(tone.light, 0.98));
      body.addColorStop(0.45, rgbA(tone.base, 0.97));
      body.addColorStop(1, rgbA(tone.deep, 0.92));
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(-g.r * stretch, 0);
      ctx.bezierCurveTo(-g.r * stretch * 0.6, -g.r, g.r * 0.3, -g.r, g.r, 0);
      ctx.bezierCurveTo(g.r * 0.3, g.r, -g.r * stretch * 0.6, g.r, -g.r * stretch, 0);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = 'rgba(255,253,247,0.95)';
      ctx.beginPath();
      ctx.ellipse(g.r * 0.05, -g.r * 0.4, g.r * 0.3, g.r * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /** بدنه‌ی پرنده: PNG با چرخش/مقیاس، مایعِ داخل دهانه تا جداشدن، تیرگی هنگام افتادن */
  private pot(ctx: CanvasRenderingContext2D, t: number, img: HTMLImageElement | null): void {
    const pose = potPose(t);
    if (!pose.visible) return;
    const falling = t >= DISCARD.potHit + DISCARD.bounceDur;
    const ready = img && img.complete && img.naturalWidth > 0;
    ctx.save();
    if (falling) {
      ctx.beginPath();
      ctx.rect(RECT.x, RECT.y, RECT.width, DISCARD.wallBottom - RECT.y);
      ctx.clip();
    }
    ctx.translate(pose.x, pose.y);
    ctx.rotate(pose.rot);
    ctx.scale(pose.scale, pose.scale);
    const w = POT_SIZE.width;
    const h = POT_SIZE.height;
    // مایع زیر PNG: فقط از سوراخ شفاف دهانه دیده می‌شود و روی مس فلش نمی‌زند
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(MOUTH_LOCAL.x, MOUTH_LOCAL.y, MOUTH_LOCAL.rx * 0.92, MOUTH_LOCAL.ry * 0.9, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = `rgba(30,14,8,${(1 - pose.dark * 0.6).toFixed(3)})`;
    ctx.fillRect(MOUTH_LOCAL.x - MOUTH_LOCAL.rx, MOUTH_LOCAL.y - MOUTH_LOCAL.ry, MOUTH_LOCAL.rx * 2, MOUTH_LOCAL.ry * 2);
    const liquid = mouthLiquid(t);
    if (liquid > 0.01) {
      ctx.globalAlpha = liquid;
      ctx.fillStyle = rgbA(this.tones.base, 1);
      ctx.beginPath();
      ctx.ellipse(MOUTH_LOCAL.x, MOUTH_LOCAL.y, MOUTH_LOCAL.rx * 0.9, MOUTH_LOCAL.ry * 0.82 * liquid, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (ready) {
      const layer = this.potSprite(img, pose.dark);
      ctx.drawImage(layer, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = `rgb(${Math.round(150 * (1 - pose.dark))},${Math.round(80 * (1 - pose.dark))},${Math.round(40 * (1 - pose.dark))})`;
      ctx.beginPath();
      ctx.ellipse(0, h * 0.1, w * 0.42, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /** بدنه‌ی PNG با تیرگی (source-atop فقط روی پیکسل‌های خودِ دیگ) */
  private potSprite(img: HTMLImageElement, dark: number): HTMLCanvasElement | HTMLImageElement {
    if (dark <= 0.01) return img;
    if (!this.potLayer) {
      this.potLayer = document.createElement('canvas');
      this.potLayer.width = 512;
      this.potLayer.height = Math.round((512 * POT_SIZE.height) / POT_SIZE.width);
    }
    const layer = this.potLayer;
    const g = layer.getContext('2d');
    if (!g) return img;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, layer.width, layer.height);
    g.drawImage(img, 0, 0, layer.width, layer.height);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = `rgba(4,2,1,${Math.min(0.96, dark).toFixed(3)})`;
    g.fillRect(0, 0, layer.width, layer.height);
    g.globalCompositeOperation = 'source-over';
    return layer;
  }
}

function phaseAt(t: number, settled: boolean): string {
  if (settled) return 'done';
  if (t >= DISCARD.respawnAt) return 'respawn';
  if (t >= DISCARD.gobsHit) return 'wall';
  return 'throw';
}

export function DiscardFx({ sim }: { sim: ClassicBrewSim }) {
  const discard = useUiState((s) => s.discard);
  if (!discard) return null;
  return (
    <DiscardRun
      key={discard.id}
      id={discard.id}
      liquid={discard.liquid}
      burnt={discard.burnt}
      startedAt={discard.startedAt}
      sim={sim}
    />
  );
}

/**
 * ورودی‌ها عمداً مقدارهای ساده‌اند (نه شیء DiscardState): settleDiscard شیء تازه
 * می‌سازد و اگر افکت به شیء وابسته بود، انیمیشن از نو شروع می‌شد.
 */
function DiscardRun({
  id,
  liquid,
  burnt,
  startedAt,
  sim,
}: Pick<DiscardState, 'id' | 'liquid' | 'burnt' | 'startedAt'> & { sim: ClassicBrewSim }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const painter = new DiscardPainter(buildDiscardScene(id), tonesFor(liquid, burnt));
    const img = loadPotImage();
    const ui = useUiState.getState();

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

    // رویدادهایی که پیش از این افکت گذشته‌اند (اجرای دوباره در StrictMode) دوباره پخش نشوند
    const t0 = (performance.now() - startedAt) / 1000;
    let splatFired = t0 >= DISCARD.gobsHit;
    let clangFired = t0 >= DISCARD.potHit;
    let thudFired = t0 >= DISCARD.thudAt;
    let respawned = t0 >= DISCARD.respawnAt || sim.potVisible;
    let settled = false;
    if (t0 < 0.05) {
      sfx.cauldronThrow();
      haptic('light');
    }

    let raf = 0;
    const respawnNow = () => {
      if (respawned) return;
      respawned = true;
      const st = useGameStore.getState();
      sim.reset(seedForCustomer(st.currentCustomer().id, st.customerIndex));
      sim.setHeatLevel(flatHeatLevel(st.brew.currentHeat));
      sim.respawn();
    };

    const loop = () => {
      const t = (performance.now() - startedAt) / 1000;
      if (!splatFired && t >= DISCARD.gobsHit) {
        splatFired = true;
        sfx.cauldronSplat();
      }
      if (!clangFired && t >= DISCARD.potHit) {
        clangFired = true;
        sfx.cauldronClang();
        haptic('heavy');
        ui.shakeScene('hit');
      }
      if (!thudFired && t >= DISCARD.thudAt) {
        thudFired = true;
        sfx.cauldronThud();
      }
      if (!respawned && t >= DISCARD.respawnAt) respawnNow();
      if (respawned && !settled && sim.potSettled) {
        settled = true;
        ui.settleDiscard(id);
      }
      try {
        painter.render(ctx, canvas.width, canvas.height, t, img);
      } catch (err) {
        canvas.dataset.fxError = err instanceof Error ? err.message : String(err);
      }
      canvas.dataset.phase = phaseAt(t, settled);
      if (t >= DISCARD.end && settled) {
        ui.endDiscard(id);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      // فقط حلقه می‌ایستد؛ وضعیت discard دست نمی‌خورد (StrictMode افکت را دو بار
      // اجرا می‌کند). پایان زودهنگامِ واقعی را CauldronStation در unmount خودش می‌بندد.
      cancelAnimationFrame(raf);
    };
  }, [id, liquid, burnt, startedAt, sim]);

  return (
    <canvas
      ref={canvasRef}
      className="cst-discard-fx"
      data-testid="discard-fx"
      data-phase="throw"
      style={rectStyle(RECT, SCENE_ZONES.cauldron.z - 10)}
      aria-hidden="true"
    />
  );
}
