import type { CSSProperties } from 'react';
import { chipClip, type MortarChip } from './mortarPile';

type Props = {
  chips: MortarChip[];
  settled: boolean;
  rawSrc: string;
  groundSrc: string;
  compact?: boolean;
};

export function MortarPileView({ chips, settled, rawSrc, groundSrc, compact = false }: Props) {
  return (
    <div
      className={`cst-bowl${settled ? ' is-settled' : ''}${compact ? ' is-compact' : ''}`}
      aria-hidden
    >
      {chips.map((chip) => {
        const src = chip.crush >= 0.45 && groundSrc ? groundSrc : rawSrc;
        const nicked = chip.generation > 0 && chip.kind !== 'dust' && chip.nick >= 0;
        const style = {
          left: `${chip.x}%`,
          top: `${chip.y}%`,
          width: `${chip.w}%`,
          height: `${chip.h}%`,
          ['--rot']: `${chip.rot}deg`,
          ['--delay']: `${chip.delay}s`,
          ['--mx']: `${40 + ((chip.seed * 13) % 24)}%`,
          ['--my']: `${26 + ((chip.seed * 7) % 16)}%`,
          ['--pile']: src ? `url("${src}")` : 'none',
          ...(chip.color ? { ['--ing-color']: chip.color } : {}),
          ...(nicked ? { clipPath: chipClip(chip.nick) } : {}),
        } as CSSProperties;
        return (
          <span key={chip.id} className={`cst-chip is-${chip.kind}`} style={style}>
            <span className="cst-chip__color" />
          </span>
        );
      })}
    </div>
  );
}
