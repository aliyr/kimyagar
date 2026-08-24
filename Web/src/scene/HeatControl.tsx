/**
 * اجاق زیر پاتیل — سه درجه‌ی حرارت.
 *
 * Tap روی خود آتش درجه را چرخشی جلو می‌برد (ملایم → متوسط → تند)، و سه اهرم
 * برنجی روی لبه‌ی جلویی میز هر درجه را مستقیم انتخاب می‌کنند. اهرم‌ها بیرون از
 * Zone آتش‌اند تا روی شعله‌ها نیفتند و هدف لمس بزرگ بماند (بخش ۱۵.۲).
 * شکل و ارتفاع شعله در هر درجه واضح متفاوت است (بخش ۶.۷).
 */

import { useGameStore } from '../store/gameStore';
import { heatLabels } from '../data/labels';
import type { HeatLevel } from '../engine/types';
import { tapProps } from '../gestures';
import { SCENE_ZONES } from './artManifest';
import { HEAT_NOTCHES } from './layout';
import { ArtLayer, rectStyle, vars, zoneStyle } from './Zone';

const ORDER: HeatLevel[] = ['low', 'medium', 'high'];
const FLAMES = [
  { left: 16, delay: 0 },
  { left: 38, delay: 0.35 },
  { left: 60, delay: 0.7 },
  { left: 78, delay: 0.15 },
];

export function HeatControl() {
  const heat = useGameStore((s) => s.brew.currentHeat);
  const setHeat = useGameStore((s) => s.setHeat);

  const cycle = () => setHeat(ORDER[(ORDER.indexOf(heat) + 1) % ORDER.length]);

  return (
    <>
      <div
        className="heat interactive"
        data-heat={heat}
        style={zoneStyle(SCENE_ZONES.heatSource)}
        {...tapProps(cycle)}
      >
        <ArtLayer src={SCENE_ZONES.heatSource.states[heat]}>
          <div className="heat__ph">
            <div className="heat__glow" />
            <div className="heat__flames">
              {FLAMES.map((f, i) => (
                <span
                  key={i}
                  className="heat__flame"
                  style={vars({ '--f-left': `${f.left}%`, '--f-delay': `${f.delay}s` })}
                />
              ))}
            </div>
            <div className="heat__log heat__log--a" />
            <div className="heat__log heat__log--b" />
            <div className="heat__embers" />
          </div>
        </ArtLayer>
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
