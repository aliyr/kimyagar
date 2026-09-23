/**
 * فضای صوتی سردر (بیرون دکان، کوچه‌ی بازار) — سنتز با Web Audio، بدون فایل.
 *
 * - همهمه‌ی دور بازار: حلقه‌ی نویز lowpass بم با دو LFO آرام (موج جمعیت).
 * - باد: نویز bandpass که با یک LFO تصادفی‌وار «می‌وزد» (swell های نامنظم).
 * - زنگ باد: گاه‌به‌گاه آرپژ سینوسی نرم و میرا (مقام‌گونه، نه غربی).
 * - جرجر زنجیر تابلو: خودِ صحنه هم‌گام با تاب تابلو `sfx.chainCreak()` را می‌زند.
 *
 * `startAmbience()` معطل می‌ماند تا context زنده شود (اولین لمس)، بعد با fade
 * بالا می‌آید؛ `stopAmbience()` با fade خاموش می‌کند. همه‌چیز از master sfx
 * می‌گذرد؛ خاموش‌کردن صدا در تنظیمات این‌ها را هم ساکت می‌کند.
 */

import { getLiveAudio, onAudioLive } from './sfx';

interface Nodes {
  ctx: AudioContext;
  bus: GainNode;
  timers: number[];
}

let nodes: Nodes | null = null;
let wanted = false;
let unhook: (() => void) | null = null;

function noiseLoop(ctx: AudioContext, noise: AudioBuffer, type: BiquadFilterType, freq: number, q: number): { out: BiquadFilterNode; filter: BiquadFilterNode } {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  src.playbackRate.value = 0.9 + Math.random() * 0.2;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  src.connect(filter);
  src.start();
  return { out: filter, filter };
}

function lfo(ctx: AudioContext, hz: number, depth: number, target: AudioParam): void {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = hz;
  const g = ctx.createGain();
  g.gain.value = depth;
  osc.connect(g).connect(target);
  osc.start();
}

function build(): Nodes | null {
  const live = getLiveAudio();
  if (!live) return null;
  const { ctx, master, noise } = live;
  const bus = ctx.createGain();
  bus.gain.value = 0;
  bus.connect(master);

  // همهمه‌ی دور: بم، با دو موج آرامِ ناهم‌فاز تا «تنفس» جمعیت شبیه شود
  const murmur = noiseLoop(ctx, noise, 'lowpass', 420, 0.7);
  const murmurGain = ctx.createGain();
  murmurGain.gain.value = 0.16;
  lfo(ctx, 0.11, 0.05, murmurGain.gain);
  lfo(ctx, 0.047, 0.04, murmurGain.gain);
  lfo(ctx, 0.19, 90, murmur.filter.frequency);
  murmur.out.connect(murmurGain).connect(bus);

  // باد: bandpass میانی که فرکانس و بلندی‌اش با LFO های کند می‌وزد
  const wind = noiseLoop(ctx, noise, 'bandpass', 760, 0.9);
  const windGain = ctx.createGain();
  windGain.gain.value = 0.06;
  lfo(ctx, 0.07, 0.05, windGain.gain);
  lfo(ctx, 0.031, 0.03, windGain.gain);
  lfo(ctx, 0.09, 260, wind.filter.frequency);
  wind.out.connect(windGain).connect(bus);

  const timers: number[] = [];

  // زنگ باد: سه تا پنج نت سینوسی نرم از یک گام شور‌گونه، با فاصله‌های نامنظم
  const scale = [587, 659, 698, 784, 880, 1047];
  const chime = () => {
    const t0 = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 3);
    let at = 0;
    for (let i = 0; i < n; i++) {
      const f = scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.3 ? 2 : 1);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(0.035 + Math.random() * 0.02, t0 + at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 1.6 + Math.random() * 0.8);
      osc.connect(g).connect(bus);
      osc.start(t0 + at);
      osc.stop(t0 + at + 2.6);
      at += 0.08 + Math.random() * 0.22;
    }
    timers.push(window.setTimeout(chime, 7000 + Math.random() * 12000));
  };
  timers.push(window.setTimeout(chime, 2500 + Math.random() * 4000));

  return { ctx, bus, timers };
}

function fadeTo(level: number, seconds: number): void {
  if (!nodes) return;
  const { ctx, bus } = nodes;
  bus.gain.cancelScheduledValues(ctx.currentTime);
  bus.gain.setTargetAtTime(level, ctx.currentTime, seconds / 3);
}

function tryStart(): void {
  if (!wanted || nodes) return;
  nodes = build();
  if (nodes) fadeTo(1, 1.8);
}

/** فضای صوتی سردر را (به‌محض زنده‌شدن صدا) شروع می‌کند */
export function startAmbience(): void {
  wanted = true;
  if (!unhook) unhook = onAudioLive(tryStart);
  tryStart();
}

/** با fade خاموش می‌کند و همه‌ی گره‌ها را آزاد می‌کند */
export function stopAmbience(fadeSeconds = 1.2): void {
  wanted = false;
  unhook?.();
  unhook = null;
  const cur = nodes;
  if (!cur) return;
  nodes = null;
  for (const t of cur.timers) window.clearTimeout(t);
  cur.bus.gain.cancelScheduledValues(cur.ctx.currentTime);
  cur.bus.gain.setTargetAtTime(0, cur.ctx.currentTime, fadeSeconds / 3);
  window.setTimeout(() => cur.bus.disconnect(), fadeSeconds * 1000 + 300);
}
