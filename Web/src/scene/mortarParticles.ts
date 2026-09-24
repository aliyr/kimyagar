/**
 * شبیه‌سازی ذرات ایستگاه هاون — منطق خالص، بدون DOM/Canvas (قابل آزمون با seed).
 *
 * همه‌ی مختصات در فضای صحنه (پیکسل منطقی 1920×1080) هستند. سیستم‌ها:
 *   dust   گردِ ضربه، هم‌رنگ تکه‌های خورده؛ در نرم بیشتر و کندتر
 *   spark  جرقه‌ی طلایی ریز (برنج به برنج)
 *   puff   پاف نرم فرود/نرم‌شدن (حلقه‌ی بازشونده)
 *   spill  تکه‌هایی که از لبه روی میز می‌ریزند (جاذبه + جهش روی میز)
 *   trail  دانه‌های پودری که از قاشق می‌ریزند
 *   ripple حلقه‌ی رنگی روی سطح پاتیل
 *   aroma  رشته‌های عطر رنگی که با پیچش بالا می‌روند
 */

export type ParticleKind = 'dust' | 'spark' | 'puff' | 'spill' | 'trail' | 'ripple' | 'aroma';

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** ثانیه از تولد */
  life: number;
  ttl: number;
  size: number;
  color: string;
  seed: number;
  rot: number;
  spin: number;
  gravity: number;
  drag: number;
  /** برای spill: y میز که روی آن جهش می‌کند */
  floorY?: number;
  bounced?: boolean;
}

export interface EmitBudget {
  /** ضریب تعداد (۰..۱) */
  scale: number;
}

const GOLD = ['#fff1c4', '#ffd27a', '#ffb648'];

export class ParticleSystem {
  particles: Particle[] = [];
  private s: number;

  constructor(seed = 1) {
    this.s = seed >>> 0 || 1;
  }

  /** LCG قطعی */
  rand(): number {
    this.s = (this.s * 1664525 + 1013904223) >>> 0;
    return this.s / 4294967296;
  }

  private range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.rand();
  }

  private pick<T>(list: readonly T[], fallback: T): T {
    if (list.length === 0) return fallback;
    return list[Math.floor(this.rand() * list.length)] ?? fallback;
  }

  private count(n: number, budget: EmitBudget): number {
    return Math.max(0, Math.round(n * budget.scale));
  }

  private push(p: Omit<Particle, 'life' | 'seed' | 'rot' | 'spin'> & Partial<Pick<Particle, 'rot' | 'spin'>>): void {
    this.particles.push({ life: 0, seed: this.rand(), rot: p.rot ?? 0, spin: p.spin ?? 0, ...p });
  }

  /** گرد ضربه از نقطهٔ تماس؛ درشت = چند تکهٔ سنگین، نرم = ابر ریز و کند */
  emitStrikeDust(x: number, y: number, colors: readonly string[], fineness: number, budget: EmitBudget): void {
    const n = this.count(5 + fineness * 9, budget);
    for (let i = 0; i < n; i++) {
      const ang = this.range(-Math.PI * 0.95, -Math.PI * 0.05);
      const speed = this.range(30, 90) * (1 - fineness * 0.45);
      this.push({
        kind: 'dust',
        x: x + this.range(-6, 6),
        y: y + this.range(-3, 2),
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 20,
        ttl: this.range(0.45, 0.95) + fineness * 0.4,
        size: this.range(2.2, 5.5) + fineness * 2,
        color: this.pick(colors, '#c4a15a'),
        gravity: 40 * (1 - fineness * 0.7),
        drag: 2.4 + fineness * 1.6,
      });
    }
  }

  /** جرقهٔ برنجی ریز در نقطهٔ برخورد */
  emitSparks(x: number, y: number, n: number, budget: EmitBudget): void {
    const count = this.count(n, budget);
    for (let i = 0; i < count; i++) {
      const ang = this.range(-Math.PI * 0.9, -Math.PI * 0.1);
      const speed = this.range(90, 210);
      this.push({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        ttl: this.range(0.22, 0.42),
        size: this.range(1.2, 2.4),
        color: this.pick(GOLD, GOLD[1]),
        gravity: 320,
        drag: 0.6,
      });
    }
  }

  /** پاف نرم (فرود ماده، لحظهٔ نرم شدن) — حلقه‌های بازشونده */
  emitPuff(x: number, y: number, color: string, strength: number, budget: EmitBudget): void {
    const n = this.count(3 + strength * 4, budget);
    for (let i = 0; i < n; i++) {
      const ang = this.range(0, Math.PI * 2);
      this.push({
        kind: 'puff',
        x: x + Math.cos(ang) * this.range(0, 10),
        y: y + Math.sin(ang) * this.range(0, 4),
        vx: Math.cos(ang) * this.range(8, 26),
        vy: -this.range(12, 30) * strength,
        ttl: this.range(0.5, 0.9),
        size: this.range(8, 16) * (0.6 + strength * 0.6),
        color,
        gravity: -6,
        drag: 1.6,
      });
    }
  }

  /** لبریز: تکه‌های کوچک از لبه روی میز می‌ریزند */
  emitSpill(x: number, y: number, floorY: number, colors: readonly string[], budget: EmitBudget): void {
    const n = this.count(4, budget);
    for (let i = 0; i < n; i++) {
      const dir = this.rand() < 0.5 ? -1 : 1;
      this.push({
        kind: 'spill',
        x: x + dir * this.range(20, 60),
        y: y + this.range(-6, 4),
        vx: dir * this.range(40, 120),
        vy: -this.range(40, 110),
        ttl: this.range(1.1, 1.5),
        size: this.range(4, 8),
        color: this.pick(colors, '#c4a15a'),
        gravity: 900,
        drag: 0.3,
        rot: this.range(0, Math.PI * 2),
        spin: this.range(-6, 6),
        floorY,
      });
    }
  }

  /** دانهٔ پودر که از لبهٔ قاشق می‌ریزد */
  emitTrail(x: number, y: number, color: string, budget: EmitBudget): void {
    if (this.count(1, budget) < 1 && this.rand() > budget.scale) return;
    this.push({
      kind: 'trail',
      x: x + this.range(-5, 5),
      y,
      vx: this.range(-12, 12),
      vy: this.range(0, 30),
      ttl: this.range(0.45, 0.7),
      size: this.range(1.6, 3.2),
      color,
      gravity: 700,
      drag: 0.5,
    });
  }

  /** حلقهٔ رنگی روی سطح معجون */
  emitRipple(x: number, y: number, color: string): void {
    this.push({ kind: 'ripple', x, y, vx: 0, vy: 0, ttl: 0.7, size: 6, color, gravity: 0, drag: 0 });
  }

  /** رشتهٔ عطر — از سطح تپه بالا می‌رود و می‌پیچد */
  emitAroma(x: number, y: number, color: string, intensity: number): void {
    this.push({
      kind: 'aroma',
      x: x + this.range(-18, 18),
      y,
      vx: this.range(-6, 6),
      vy: -this.range(22, 40) * (0.7 + intensity * 0.5),
      ttl: this.range(1.6, 2.6),
      size: this.range(6, 12) * (0.7 + intensity * 0.6),
      color,
      gravity: -4,
      drag: 0.2,
    });
  }

  /** یک قدم شبیه‌سازی؛ ذرات مرده حذف می‌شوند */
  step(dt: number): void {
    if (this.particles.length === 0) return;
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.life += dt;
      if (p.life >= p.ttl) continue;
      p.vy += p.gravity * dt;
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      if (p.kind === 'aroma') {
        // پیچش: نویز سینوسی با فاز مخصوص هر ذره
        p.x += Math.sin(p.life * 2.2 + p.seed * 12.9) * 16 * dt;
      }
      if (p.kind === 'spill' && p.floorY !== undefined && p.y >= p.floorY) {
        p.y = p.floorY;
        if (!p.bounced) {
          p.bounced = true;
          p.vy = -Math.abs(p.vy) * 0.28;
          p.vx *= 0.55;
          p.spin *= 0.4;
        } else {
          p.vy = 0;
          p.vx *= 0.8;
          p.spin = 0;
        }
      }
      next.push(p);
    }
    this.particles = next;
  }

  get active(): boolean {
    return this.particles.length > 0;
  }

  clear(): void {
    this.particles = [];
  }
}

/** شفافیت ذره بر اساس سن (۰..۱) — ورود سریع، خروج نرم */
export function particleAlpha(p: Particle): number {
  const t = p.life / p.ttl;
  if (p.kind === 'spark') return 1 - t * t;
  if (p.kind === 'ripple') return (1 - t) * 0.55;
  if (p.kind === 'aroma') return Math.sin(Math.min(1, t) * Math.PI) * 0.34;
  if (p.kind === 'puff') return (1 - t) * 0.5;
  // تکهٔ لبریز: تا ۶۰٪ عمر کاملاً پیدا، بعد روی میز محو می‌شود
  if (p.kind === 'spill') return t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
  const fadeIn = Math.min(1, t * 6);
  return fadeIn * (1 - t) ;
}

/** اندازهٔ رسم بر اساس سن */
export function particleSize(p: Particle): number {
  const t = p.life / p.ttl;
  if (p.kind === 'puff') return p.size * (1 + t * 1.8);
  if (p.kind === 'ripple') return p.size + t * 34;
  if (p.kind === 'aroma') return p.size * (1 + t * 0.9);
  if (p.kind === 'dust') return p.size * (1 + t * 0.3);
  return p.size;
}
