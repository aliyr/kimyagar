/**
 * نمای تکه‌های داخل هاون (و داخل قاشق) — هر تکه یک اسپرایت واقعی است.
 *
 * - نسل ۰: اسپرایت کامل + لایهٔ tint نرم به رنگ ماده (soft-light) تا با پالت بازی بنشیند.
 * - نسل ۱–۲ (`is-cracked`): همان اسپرایت با بریدگی (`chipClip`) و لبهٔ تیره‌تر.
 * - `dust`: دانهٔ گرد نرم به رنگ ماده (تودهٔ حجم‌دار پودر را Canvas زیرین می‌کشد).
 * - `--hop`: پرش کوتاه بعد از ضربه (translateY + scale).
 */

import type { CSSProperties } from 'react';
import { chipClip, type MortarChip } from './mortarPile';
import { BOWL_MORTAR, pieceUrl } from './mortarLayout';

type Props = {
  chips: MortarChip[];
  settled: boolean;
  compact?: boolean;
};

/** نسبت اندازهٔ رسم دانهٔ گرد به اندازهٔ مدل (مدل برای حفظ حجم بزرگ می‌ماند) */
const DUST_DRAW = 0.42;

/** جعبهٔ bowl از هندسهٔ v3 (درصد Zone) — نسخهٔ compact کل میزبان را پر می‌کند */
const BOWL_STYLE: CSSProperties = {
  left: `${BOWL_MORTAR.left}%`,
  top: `${BOWL_MORTAR.top}%`,
  width: `${BOWL_MORTAR.width}%`,
  height: `${BOWL_MORTAR.height}%`,
};

export function MortarPileView({ chips, settled, compact = false }: Props) {
  return (
    <div
      className={`cst-bowl${settled ? ' is-settled' : ''}${compact ? ' is-compact' : ''}`}
      style={compact ? undefined : BOWL_STYLE}
      aria-hidden
    >
      {chips.map((chip) => {
        const dust = chip.kind === 'dust';
        const nicked = !dust && chip.generation > 0 && chip.nick >= 0;
        const sprite = chip.kind === 'dust' ? null : pieceUrl(chip.kind, chip.sprite);
        // دانه‌های گرد کوچک‌تر از اندازهٔ مدل کشیده می‌شوند؛ حجم پودر را Canvas زیرین می‌دهد
        const k = dust ? DUST_DRAW : 1;
        const style = {
          left: `${chip.x}%`,
          top: `${chip.y}%`,
          width: `${chip.w * k}%`,
          height: `${chip.h * k}%`,
          ['--rot']: `${chip.rot}deg`,
          ['--delay']: `${chip.delay}s`,
          ['--hop']: chip.hop.toFixed(3),
          ...(sprite ? { ['--sprite']: `url("${sprite}")` } : {}),
          ...(chip.color ? { ['--ing-color']: chip.color } : {}),
          ...(nicked ? { clipPath: chipClip(chip.nick) } : {}),
        } as CSSProperties;
        const cls = `cst-chip is-${chip.kind}${nicked ? ' is-cracked' : ''}${
          chip.generation >= 2 && !dust ? ' is-crushed' : ''
        }`;
        return (
          <span key={chip.id} className={cls} style={style}>
            {dust ? (
              <span className="cst-chip__color" />
            ) : (
              <>
                <span className="cst-chip__art" />
                <span className="cst-chip__tint" />
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}
