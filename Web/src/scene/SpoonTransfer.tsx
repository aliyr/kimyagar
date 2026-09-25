/**
 * انتقال محتوای هاون به پاتیل با قاشق سر بزیِ کلاسیک (classicSpoon؛ DOM/SVG، rAF).
 *
 * سه فاز که در uiState.transfer هم ثبت می‌شوند تا هاون/کوبه/پاتیل هم‌زمان
 * واکنش نشان دهند:
 *   scoop  (۰   – ۰٫۴۵ث): قاشق از بالا وارد کاسه‌ی هاون می‌شود؛ توده‌ی رنگ ماده
 *                        در کاسه‌ی قاشق ظاهر می‌شود (onScoop).
 *   carry  (۰٫۴۵– ۱٫۱۵ث): روی قوسی تا دهانه‌ی پاتیل می‌رود.
 *   drop   : کج می‌شود و مواد از کاسه‌ی قاشق داخل دهانه‌ی دیگ می‌افتند.
 *            onDrop وقتی مواد به سطح می‌رسند (نه یک افتادن دوم از بالای دیگ).
 *            سپس قاشق بالا می‌رود و محو می‌شود (onDone).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { SPOON_GEOMETRY, SPOON_SIZE } from '../art/flat/kit/props.ts';
import { FlatSvg } from '../art/flat/react/FlatSvg';
import { classicSpoonShape } from './classicSpoon';
import { SCENE_ZONES } from './artManifest';
import { CLASSIC_MOUTH } from './classicCauldronGeometry';
import { BOWL_MORTAR, scoopRest, scoopUnderSpoon, type MortarChip } from './mortarPile';
import { publishCauldronDrop } from './cauldron/cauldronDropChannel';
import type { TransferPhase } from './uiState';
import './classic-stations.css';

/** اندازه‌ی جعبه‌ی SVG قاشق روی صحنه (پیکسل) */
const SPOON_BOX = 250;
/** مرکز کاسه‌ی قاشق نسبت به جعبه (کسر) */
const BOWL_FX = SPOON_GEOMETRY.bowl.cx / SPOON_SIZE;
const BOWL_FY = SPOON_GEOMETRY.bowl.cy / SPOON_SIZE;

const T_IN = 0.32;
const T_STIR = 1.6;
const T_SCOOP = T_IN + T_STIR;
const T_CARRY = 0.7;
const T_DROP = 0.88;
const T_EXIT = 0.35;
const TOTAL = T_SCOOP + T_CARRY + T_DROP + T_EXIT;
/** کج‌شدن تمام می‌شود و مواد شروع به افتادن از قاشق می‌کنند (کسر فاز drop) */
const DROP_AT = 0.46;
const LAND = {
  x: CLASSIC_MOUTH.x,
  y: CLASSIC_MOUTH.y + CLASSIC_MOUTH.ry * 0.22,
};

const MORTAR = SCENE_ZONES.mortar;
/** سر قاشق داخل هاون، کمی بالاتر از سطح مواد. */
const MORTAR_LIFT = 28;
const START = {
  x: MORTAR.x + ((BOWL_MORTAR.left + BOWL_MORTAR.width / 2) / 100) * MORTAR.width,
  y: MORTAR.y + ((BOWL_MORTAR.top + BOWL_MORTAR.height * 0.68) / 100) * MORTAR.height - MORTAR_LIFT,
};
const ORBIT_X = MORTAR.width * (BOWL_MORTAR.width / 100) * 0.3;
const ORBIT_Y = MORTAR.height * (BOWL_MORTAR.height / 100) * 0.28;
/** ریختن از کمی بالای دهانه، تا مواد از قاشق داخل دیگ بیفتند. */
const END = { x: CLASSIC_MOUTH.x - CLASSIC_MOUTH.rx * 0.35, y: CLASSIC_MOUTH.y - 68 };
/** نقطه‌ی کنترل قوس حمل: بالای مسیر */
const CONTROL = { x: (START.x + END.x) / 2, y: Math.min(START.y, END.y) - 230 };

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function bezier(t: number) {
  const u = 1 - t;
  return {
    x: u * u * START.x + 2 * u * t * CONTROL.x + t * t * END.x,
    y: u * u * START.y + 2 * u * t * CONTROL.y + t * t * END.y,
  };
}

import { MortarPileView } from './MortarPileView';
import { mortarFx } from './MortarFx';
import { pieceUrl } from './mortarLayout';

/** از هر ماده یکی‌یکی برمی‌دارد تا رنگ‌های ریز بین تکه‌های درشت گم نشوند. */
function pourSample(list: MortarChip[], limit: number): MortarChip[] {
  const groups = new Map<string, MortarChip[]>();
  for (const chip of list) {
    const id = chip.ingredientId ?? chip.color ?? chip.kind;
    const group = groups.get(id);
    if (group) group.push(chip);
    else groups.set(id, [chip]);
  }
  const ordered = [...groups.values()];
  for (const group of ordered) group.sort((a, b) => b.w * b.h - a.w * a.h);
  const picked: MortarChip[] = [];
  let progressed = true;
  while (picked.length < limit && progressed) {
    progressed = false;
    for (const group of ordered) {
      if (picked.length >= limit) break;
      const chip = group.shift();
      if (!chip) continue;
      picked.push(chip);
      progressed = true;
    }
  }
  return picked;
}

export function SpoonTransfer({
  color,
  onPhase,
  onScoop,
  onDrop,
  onDone,
}: {
  color: string;
  onPhase: (phase: TransferPhase) => void;
  onScoop: () => void;
  onDrop: () => void;
  onDone: () => void;
}) {
  const shape = useMemo(() => classicSpoonShape(), []);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const blobRef = useRef<HTMLSpanElement | null>(null);
  const fallRef = useRef<HTMLDivElement | null>(null);
  const scoopedRef = useRef<MortarChip[]>([]);
  const [spoonChips, setSpoonChips] = useState<MortarChip[]>([]);
  const shownChips = pourSample(spoonChips, 16)
    .map((chip, index) => {
      const angle = index * 2.399;
      const rad = Math.sqrt((index + 0.5) / 16);
      return {
        ...chip,
        x: 50 + Math.cos(angle) * rad * 18,
        y: 46 + Math.sin(angle) * rad * 14,
        w: Math.min(26, Math.max(9, chip.w * 0.4)),
        h: Math.min(30, Math.max(11, chip.h * 0.4)),
      };
    });
  const callbacks = useRef({ onPhase, onScoop, onDrop, onDone });
  callbacks.current = { onPhase, onScoop, onDrop, onDone };

  useEffect(() => {
    const root = rootRef.current;
    const blob = blobRef.current;
    const fall = fallRef.current;
    if (!root || !blob || !fall) return;
    root.style.setProperty('--ing-color', color);
    fall.style.setProperty('--ing-color', color);
    let raf = 0;
    const t0 = performance.now();
    let phase: TransferPhase = 'scoop';
    let scooped = false;
    let swept = false;
    let released = false;
    let dropped = false;
    let finished = false;
    let announced = false;
    const land = () => {
      if (!announced) {
        announced = true;
        publishCauldronDrop(scoopedRef.current);
      }
      callbacks.current.onDrop();
    };
    const releasePour = () => {
      const list = pourSample(scoopedRef.current, 12);
      fall.replaceChildren();
      if (list.length === 0) {
        dropped = true;
        land();
        return;
      }
      const n = list.length;
      list.forEach((chip, i) => {
        const angle = i * 2.399;
        const rad = Math.sqrt((i + 0.5) / n);
        const el = document.createElement('span');
        el.className = `cst-chip is-${chip.kind}`;
        const w = Math.min(36, Math.max(18, chip.w * 0.5));
        const h = Math.min(30, Math.max(14, chip.h * 0.46));
        el.style.left = `${END.x + Math.cos(angle) * rad * 26}px`;
        el.style.top = `${END.y + Math.sin(angle) * rad * 10}px`;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        el.style.transition = 'none';
        el.style.setProperty('--rot', `${chip.rot}deg`);
        el.style.setProperty('--hop', '0');
        if (chip.color) el.style.setProperty('--ing-color', chip.color);
        if (chip.kind === 'dust') {
          const colorEl = document.createElement('span');
          colorEl.className = 'cst-chip__color';
          el.appendChild(colorEl);
        } else {
          el.style.setProperty('--sprite', `url("${pieceUrl(chip.kind, chip.sprite)}")`);
          const art = document.createElement('span');
          art.className = 'cst-chip__art';
          const tint = document.createElement('span');
          tint.className = 'cst-chip__tint';
          el.append(art, tint);
        }
        fall.appendChild(el);
      });
    };
    const take = (list: MortarChip[]) => {
      if (list.length === 0) return;
      scoopedRef.current = [...scoopedRef.current, ...list];
      setSpoonChips(scoopedRef.current);
      if (!scooped) {
        scooped = true;
        callbacks.current.onScoop();
      }
    };
    callbacks.current.onPhase('scoop');
    /** دانه‌های پودری که در راه از لبهٔ قاشق می‌ریزند */
    let trailAcc = 0;
    let lastNow = t0;
    const trailColor = () => {
      const list = scoopedRef.current;
      if (list.length === 0) return color;
      const chip = list[Math.floor(Math.random() * list.length)];
      return chip.color ?? color;
    };

    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;
      let x = START.x;
      let y = START.y;
      let rot = 0;
      let opacity = 1;
      let blobScale = 0;

      if (t < T_IN) {
        const k = easeOut(t / T_IN);
        y = START.y - 210 * (1 - k);
        rot = -22 * (1 - k);
      } else if (t < T_SCOOP) {
        const k = (t - T_IN) / T_STIR;
        const ang = k * Math.PI * 2;
        x = START.x + Math.cos(ang) * ORBIT_X;
        y = START.y + Math.sin(ang) * ORBIT_Y;
        rot = 18 * Math.sin(ang);
        take(scoopUnderSpoon(x, y));
        if (k > 0.86 && !swept) {
          swept = true;
          take(scoopRest());
        }
        blobScale = scoopedRef.current.length === 0 ? 0 : Math.min(1, 0.45 + scoopedRef.current.length / 10);
      } else if (t < T_SCOOP + T_CARRY) {
        if (phase !== 'carry') {
          phase = 'carry';
          callbacks.current.onPhase('carry');
        }
        const k = easeInOut((t - T_SCOOP) / T_CARRY);
        const p = bezier(k);
        x = p.x;
        y = p.y;
        // کمی به جهت حرکت خم می‌شود
        rot = 8 * Math.sin(k * Math.PI);
        blobScale = 1;
        // دنبالهٔ پودر: هرچه تکه‌های ریزتر، بیشتر می‌ریزد
        const fine = scoopedRef.current.filter((chip) => chip.kind === 'dust').length;
        trailAcc += dt * (6 + Math.min(18, fine * 1.5));
        while (trailAcc >= 1) {
          trailAcc -= 1;
          mortarFx.trail(x + (Math.random() - 0.5) * 26, y + 10, trailColor());
        }
      } else if (t < T_SCOOP + T_CARRY + T_DROP) {
        if (phase !== 'drop') {
          phase = 'drop';
          callbacks.current.onPhase('drop');
        }
        const k = (t - T_SCOOP - T_CARRY) / T_DROP;
        x = END.x + 10 * easeOut(Math.min(1, k / DROP_AT));
        y = END.y;
        rot = 75 * easeInOut(clamp01(k / DROP_AT));
        if (k >= DROP_AT && !released) {
          released = true;
          releasePour();
        }
        if (released && !dropped) {
          const pour = clamp01((k - DROP_AT) / (1 - DROP_AT));
          const eased = pour * pour;
          fall.style.transform = `translate(${((LAND.x - END.x) * eased).toFixed(1)}px, ${((LAND.y - END.y) * eased).toFixed(1)}px)`;
          fall.style.opacity = pour < 0.72 ? '1' : (1 - (pour - 0.72) / 0.28).toFixed(3);
          if (pour >= 0.92) {
            dropped = true;
            fall.style.opacity = '0';
            // حلقه‌های رنگی روی سطح معجون، جای فرود
            for (let i = 0; i < 3; i++) {
              mortarFx.ripple(LAND.x + (i - 1) * 16, LAND.y + (i % 2) * 4, trailColor());
            }
            land();
          }
        }
        blobScale = released ? 0 : 1;
      } else if (t < TOTAL) {
        if (released && !dropped) {
          dropped = true;
          fall.style.opacity = '0';
          land();
        }
        const k = easeIn((t - T_SCOOP - T_CARRY - T_DROP) / T_EXIT);
        x = END.x + 10;
        y = END.y - 160 * k;
        rot = 75 - 60 * k;
        opacity = 1 - k;
        blobScale = 0;
      } else if (!finished) {
        finished = true;
        callbacks.current.onDone();
        return;
      }

      root.style.transform = `translate(${(x - SPOON_BOX * BOWL_FX).toFixed(1)}px, ${(y - SPOON_BOX * BOWL_FY).toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
      root.style.opacity = opacity.toFixed(3);
      blob.style.transform = `translate(-50%, -50%) scale(${blobScale.toFixed(3)})`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
    <div
      ref={rootRef}
      data-testid="spoon-transfer"
      className="cst-spoon-transfer"
      style={{
        width: SPOON_BOX,
        height: SPOON_BOX,
        transformOrigin: `${BOWL_FX * 100}% ${BOWL_FY * 100}%`,
        opacity: 0,
      }}
    >
      <FlatSvg shape={shape} designSize={SPOON_SIZE} className="cst-spoon-transfer__svg" />
      <span
        ref={blobRef}
        className="cst-spoon-transfer__blob"
        style={{
          left: `${BOWL_FX * 100}%`,
          top: `${BOWL_FY * 100 - 3}%`,
          background: 'transparent',
          transform: 'translate(-50%, -50%) scale(0)',
        }}
      >
        <MortarPileView chips={shownChips} settled compact />
      </span>
    </div>
    <div ref={fallRef} className="cst-spoon-fall" />
    </>
  );
}
