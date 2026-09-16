/**
 * افکت‌های صوتی سنتزی با Web Audio — بدون هیچ فایل صوتی.
 *
 * - AudioContext با اولین تعامل کاربر (pointerdown) باز می‌شود (سیاست autoplay).
 * - خاموش/روشن با `setEnabled` و ذخیره در localStorage (کلید SFX_STORAGE_KEY).
 * - هر صدا یک تابع کوتاه است: نویز فیلترشده، sweep، آرپژ سینوسی…؛ همه از
 *   یک master gain عبور می‌کنند تا سطح کلی یک‌جا کنترل شود.
 * - دو صدای محیطی پیوسته که با «سطح» ۰..۱ کم و زیاد می‌شوند:
 *   • قل‌قل (`setSimmer`): «بلوپ»های تصادفی حباب (سینوسی با جهش زیر⇒بالا) با نرخ
 *     وابسته به حرارت + زمزمه‌ی بم آب. بدون هیس نویز پیوسته.
 *   • آتش (`setFire`): غرش بم لرزان کوره + ترق‌تروق‌های تصادفی (کلیک‌های نویز
 *     زیر) و گاهی «پُق» بم‌تر؛ نرخ و بلندی با درجه‌ی آتش.
 *   با سطح ۰ کاملاً ساکت می‌شوند و زمان‌بند حباب/ترق متوقف می‌شود.
 *
 * در محیط تست (بدون AudioContext) همه‌ی توابع بی‌اثرند.
 */

export const SFX_STORAGE_KEY = 'kimiagar.sfx';

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let enabled = readStoredEnabled();
let unlocked = false;

/** زمزمه‌ی بم آب در حال جوش (حلقه‌ی نویز lowpass) */
let rumbleGain: GainNode | null = null;
/** غرش بم کوره (حلقه‌ی نویز lowpass با لرزش) */
let roarGain: GainNode | null = null;
let simmerLevel = 0;
let fireLevel = 0;
let bubbleTimer: number | null = null;
let crackleTimer: number | null = null;

function readStoredEnabled(): boolean {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(SFX_STORAGE_KEY);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

function hasAudio(): boolean {
  return typeof window !== 'undefined' && typeof (window as { AudioContext?: unknown }).AudioContext === 'function';
}

function ensureContext(): Ctx | null {
  if (!hasAudio()) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = enabled ? 0.55 : 0;
    master.connect(ctx.destination);
  }
  return ctx;
}

function getNoise(c: Ctx): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === c.sampleRate) return noiseBuffer;
  const seconds = 1.5;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

/** با اولین pointerdown صدا زده می‌شود تا context باز شود (idempotent). */
export function unlockAudio(): void {
  const c = ensureContext();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  unlocked = true;
  applyAmbience();
}

export function isSfxEnabled(): boolean {
  return enabled;
}

export function setSfxEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(SFX_STORAGE_KEY, on ? '1' : '0');
  } catch {
    /* بدون storage هم کار می‌کند */
  }
  if (master && ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(on ? 0.55 : 0, ctx.currentTime + 0.08);
  }
  if (on) unlockAudio();
}

/** آماده‌ی پخش؟ (context باز و صدا روشن) */
function live(): Ctx | null {
  if (!enabled || !unlocked) return null;
  const c = ensureContext();
  if (!c || !master || c.state !== 'running') return null;
  return c;
}

/** انفجار نویز کوتاه با فیلتر — پایه‌ی ضربه/شلپ/کوبش */
function noiseBurst(
  c: Ctx,
  opts: { dur: number; type: BiquadFilterType; freq: number; q?: number; gain: number; freqEnd?: number },
): void {
  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const filter = c.createBiquadFilter();
  filter.type = opts.type;
  filter.frequency.setValueAtTime(opts.freq, c.currentTime);
  if (opts.freqEnd !== undefined) filter.frequency.exponentialRampToValueAtTime(opts.freqEnd, c.currentTime + opts.dur);
  filter.Q.value = opts.q ?? 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(opts.gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + opts.dur);
  src.connect(filter).connect(g).connect(master!);
  src.start();
  src.stop(c.currentTime + opts.dur + 0.05);
}

function tone(
  c: Ctx,
  opts: { freq: number; dur: number; type?: OscillatorType; gain: number; at?: number; freqEnd?: number },
): void {
  const osc = c.createOscillator();
  osc.type = opts.type ?? 'sine';
  const t0 = c.currentTime + (opts.at ?? 0);
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + opts.dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g).connect(master!);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.05);
}

/** حلقه‌ی نویز lowpass پیوسته با gain صفر (پایه‌ی زمزمه/غرش) */
function noiseLoop(c: Ctx, opts: { freq: number; q: number; lfoHz?: number; lfoDepth?: number }): GainNode {
  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  src.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = opts.freq;
  lp.Q.value = opts.q;
  const g = c.createGain();
  g.gain.value = 0;
  if (opts.lfoHz) {
    // لرزش آرام فیلتر ⇒ صدا «زنده» به‌نظر برسد نه یک هیس ثابت
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = opts.lfoHz;
    const depth = c.createGain();
    depth.gain.value = opts.lfoDepth ?? opts.freq * 0.35;
    lfo.connect(depth).connect(lp.frequency);
    lfo.start();
  }
  src.connect(lp).connect(g).connect(master!);
  src.start();
  return g;
}

/** یک حباب: سینوسی کوتاه با جهش زیر⇒بالا («بلوپ») */
function bubble(c: Ctx, level: number): void {
  const f0 = 160 + Math.random() * 240;
  const dur = 0.045 + Math.random() * 0.085;
  tone(c, {
    freq: f0,
    freqEnd: f0 * (1.9 + Math.random() * 1.3),
    dur,
    type: 'sine',
    gain: 0.045 + Math.random() * 0.11 * (0.4 + level * 0.6),
  });
}

/** یک ترق آتش: کلیک نویز زیر و بسیار کوتاه؛ گاهی «پُق» بم‌تر */
function crackle(c: Ctx, level: number): void {
  if (Math.random() < 0.18) {
    noiseBurst(c, { dur: 0.035 + Math.random() * 0.03, type: 'lowpass', freq: 700, freqEnd: 250, gain: 0.14 + 0.16 * level });
    return;
  }
  noiseBurst(c, {
    dur: 0.008 + Math.random() * 0.02,
    type: 'highpass',
    freq: 1600 + Math.random() * 3200,
    q: 0.5,
    gain: 0.07 + Math.random() * 0.2 * (0.35 + level * 0.65),
  });
}

function scheduleBubbles(): void {
  if (bubbleTimer !== null) return;
  const step = () => {
    bubbleTimer = null;
    const c = live();
    if (!c || simmerLevel <= 0) return;
    bubble(c, simmerLevel);
    // در جوش شدید حباب‌ها جفت‌جفت می‌آیند
    if (Math.random() < simmerLevel * 0.55) {
      window.setTimeout(() => {
        const c2 = live();
        if (c2 && simmerLevel > 0) bubble(c2, simmerLevel * 0.7);
      }, 35 + Math.random() * 70);
    }
    const perSecond = 1.4 + simmerLevel * 7.5;
    bubbleTimer = window.setTimeout(step, (1000 / perSecond) * (0.35 + Math.random() * 1.3));
  };
  bubbleTimer = window.setTimeout(step, 60);
}

function scheduleCrackles(): void {
  if (crackleTimer !== null) return;
  const step = () => {
    crackleTimer = null;
    const c = live();
    if (!c || fireLevel <= 0) return;
    crackle(c, fireLevel);
    // خوشه‌ی ترق‌ها در آتش تند
    if (Math.random() < fireLevel * 0.45) {
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        window.setTimeout(() => {
          const c2 = live();
          if (c2 && fireLevel > 0) crackle(c2, fireLevel * 0.8);
        }, 18 + i * (14 + Math.random() * 40));
      }
    }
    const perSecond = 0.9 + fireLevel * 5.5;
    crackleTimer = window.setTimeout(step, (1000 / perSecond) * (0.3 + Math.random() * 1.4));
  };
  crackleTimer = window.setTimeout(step, 40);
}

/** سطح صداهای پیوسته را با وضعیت فعلی هم‌گام می‌کند و زمان‌بندها را روشن می‌کند */
function applyAmbience(): void {
  const c = live();
  if (!c) {
    if (ctx) {
      rumbleGain?.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      roarGain?.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    }
    return;
  }
  if (!rumbleGain) rumbleGain = noiseLoop(c, { freq: 150, q: 0.9, lfoHz: 2.3, lfoDepth: 45 });
  if (!roarGain) roarGain = noiseLoop(c, { freq: 300, q: 0.6, lfoHz: 0.45, lfoDepth: 120 });
  rumbleGain.gain.setTargetAtTime(simmerLevel * 0.11, c.currentTime, 0.3);
  roarGain.gain.setTargetAtTime(fireLevel * 0.1, c.currentTime, 0.4);
  if (simmerLevel > 0) scheduleBubbles();
  if (fireLevel > 0) scheduleCrackles();
}

export const sfx = {
  /** ضربه‌ی کوبه در هاون (هر تیک کوبش) */
  grindTick(): void {
    const c = live();
    if (!c) return;
    noiseBurst(c, { dur: 0.09, type: 'lowpass', freq: 900, freqEnd: 220, gain: 0.5 });
    tone(c, { freq: 180 + Math.random() * 40, dur: 0.07, type: 'triangle', gain: 0.18, freqEnd: 90 });
  },
  /** فرود ماده در هاون */
  jarDrop(): void {
    const c = live();
    if (!c) return;
    noiseBurst(c, { dur: 0.12, type: 'bandpass', freq: 1800, q: 1.2, gain: 0.25 });
  },
  /** برداشتن با قاشق */
  scoop(): void {
    const c = live();
    if (!c) return;
    noiseBurst(c, { dur: 0.18, type: 'highpass', freq: 1400, gain: 0.18 });
  },
  /** شلپ ریختن در پاتیل: نویز + افت زیر */
  splash(): void {
    const c = live();
    if (!c) return;
    noiseBurst(c, { dur: 0.32, type: 'lowpass', freq: 2200, freqEnd: 300, gain: 0.45 });
    tone(c, { freq: 320, dur: 0.28, gain: 0.22, freqEnd: 110 });
  },
  /** یک دور هم‌زدن */
  stir(): void {
    const c = live();
    if (!c) return;
    noiseBurst(c, { dur: 0.4, type: 'bandpass', freq: 600, q: 0.6, gain: 0.12, freqEnd: 900 });
  },
  /** ریختن در شیشه: sweep بالا‌رونده (شیشه پر می‌شود) */
  pour(durationSec = 1.2): void {
    const c = live();
    if (!c) return;
    noiseBurst(c, { dur: durationSec, type: 'bandpass', freq: 700, q: 1.4, gain: 0.3, freqEnd: 1900 });
    tone(c, { freq: 260, dur: durationSec, type: 'sine', gain: 0.08, freqEnd: 640 });
  },
  /** «پُق» چوب‌پنبه روی شیشه‌ی پر */
  cork(): void {
    const c = live();
    if (!c) return;
    noiseBurst(c, { dur: 0.05, type: 'bandpass', freq: 900, q: 2.5, gain: 0.35 });
    tone(c, { freq: 520, dur: 0.09, type: 'sine', gain: 0.2, freqEnd: 260 });
  },
  /** رسیدن شیشه به دست مشتری */
  deliver(): void {
    const c = live();
    if (!c) return;
    tone(c, { freq: 1200, dur: 0.12, type: 'triangle', gain: 0.16 });
    noiseBurst(c, { dur: 0.08, type: 'highpass', freq: 3000, gain: 0.12 });
  },
  /** شمسه‌ی «رسیده»: آرپژ سینوسی کوتاه */
  sparkle(): void {
    const c = live();
    if (!c) return;
    const notes = [784, 988, 1175, 1568];
    notes.forEach((f, i) => tone(c, { freq: f, dur: 0.35, gain: 0.12, at: i * 0.09 }));
  },
  /** استینگر موفقیت */
  success(): void {
    const c = live();
    if (!c) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(c, { freq: f, dur: 0.5, type: 'triangle', gain: 0.16, at: i * 0.11 }));
  },
  /** استینگر ناموفق */
  failure(): void {
    const c = live();
    if (!c) return;
    tone(c, { freq: 330, dur: 0.5, type: 'sawtooth', gain: 0.1, freqEnd: 220 });
    tone(c, { freq: 247, dur: 0.6, type: 'sawtooth', gain: 0.1, at: 0.18, freqEnd: 150 });
  },
  /** تغییر درجه‌ی آتش: پفِ شعله + چند ترق پشت‌سرهم */
  fire(): void {
    const c = live();
    if (!c) return;
    noiseBurst(c, { dur: 0.35, type: 'lowpass', freq: 500, freqEnd: 1800, gain: 0.22 });
    for (let i = 0; i < 4; i++) {
      window.setTimeout(() => {
        const c2 = live();
        if (c2) crackle(c2, 1);
      }, 60 + i * (40 + Math.random() * 70));
    }
  },
  /** سطح قل‌قل پیوسته (۰..۱) — با حرارت و پُر بودن پاتیل */
  setSimmer(level: number): void {
    simmerLevel = Math.min(1, Math.max(0, level));
    applyAmbience();
  },
  /** شدت پیوسته‌ی آتش کوره (۰..۱) — غرش و نرخ ترق‌تروق */
  setFire(level: number): void {
    fireLevel = Math.min(1, Math.max(0, level));
    applyAmbience();
  },
};
