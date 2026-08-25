/**
 * اجاق زیر پاتیل — سه درجه‌ی حرارت با سوختن واقعی (۳ فریم + کراس‌فید).
 *
 * Tap روی خود آتش درجه را چرخشی جلو می‌برد (ملایم → متوسط → تند)، و سه اهرم
 * برنجی روی لبه‌ی جلویی میز هر درجه را مستقیم انتخاب می‌کنند. اهرم‌ها بیرون از
 * Zone آتش‌اند تا روی شعله‌ها نیفتند و هدف لمس بزرگ بماند (بخش ۱۵.۲).
 */

import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { heatLabels } from '../data/labels';
import type { HeatLevel } from '../engine/types';
import { tapProps } from '../gestures';
import { artUrl, CLASSIC_ART, SCENE_ZONES } from './artManifest';
import { HEAT_NOTCHES } from './layout';
import { ArtLayer, rectStyle, zoneStyle } from './Zone';
import './classic-props.css';

const ORDER: HeatLevel[] = ['low', 'medium', 'high'];

/** فاصله‌ی تعویض فریم در هر درجه — با لرزش تصادفی تا مکانیکی نباشد. */
const FRAME_MS: Record<HeatLevel, number> = {
  low: 300,
  medium: 240,
  high: 180,
};
const FRAME_JITTER_MS = 60;

function nextFrameDelay(level: HeatLevel): number {
  return FRAME_MS[level] + (Math.random() * 2 - 1) * FRAME_JITTER_MS;
}

function FireStack({ level, on }: { level: HeatLevel; on: boolean }) {
  const [frame, setFrame] = useState(0);
  const srcs = CLASSIC_ART.fireFrames[level];

  useEffect(() => {
    let timer = 0;
    let cancelled = false;
    const loop = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setFrame((i) => (i + 1) % srcs.length);
        loop();
      }, nextFrameDelay(level));
    };
    loop();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [level, srcs.length]);

  return (
    <div className={`hc-stack${on ? ' is-on' : ''}`} data-hc-level={level}>
      {srcs.map((src, i) => (
        <div key={src} className={`hc-frame${i === frame ? ' is-dominant' : ''}`}>
          <ArtLayer src={src} fit="fill" className="hc-flame-img" />
        </div>
      ))}
    </div>
  );
}

export function HeatControl() {
  const heat = useGameStore((s) => s.brew.currentHeat);
  const setHeat = useGameStore((s) => s.setHeat);
  const [framesReady, setFramesReady] = useState(false);

  const cycle = () => setHeat(ORDER[(ORDER.indexOf(heat) + 1) % ORDER.length]);

  useEffect(() => {
    const urls = ORDER.flatMap((lvl) => CLASSIC_ART.fireFrames[lvl].map(artUrl));
    let left = urls.length;
    if (left === 0) {
      setFramesReady(true);
      return;
    }
    for (const src of urls) {
      const img = new Image();
      const done = () => {
        left -= 1;
        if (left <= 0) setFramesReady(true);
      };
      img.onload = done;
      img.onerror = done;
      img.src = src;
    }
  }, []);

  return (
    <>
      <div
        className="heat interactive"
        data-heat={heat}
        style={zoneStyle(SCENE_ZONES.heatSource)}
        {...tapProps(cycle)}
      >
        <div className="hc-ember" />
        {ORDER.map((level) => (
          <FireStack key={level} level={level} on={heat === level} />
        ))}
        <div className={`hc-ph${framesReady ? ' is-ready' : ''}`} aria-hidden>
          <div className="hc-ph-glow" />
          <div className="hc-ph-flame" />
        </div>
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
