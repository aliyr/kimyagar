/**
 * شیء در دست بازیکن — دقیقاً زیر انگشت/اشاره‌گر حرکت می‌کند.
 * تا Drop، همه‌چیز قابل لغو است؛ رهاکردن جای اشتباه بی‌هزینه است.
 */

import { useGameStore } from '../store/gameStore';
import { useArt, vars } from './Zone';
import { useUiState } from './uiState';

const SIZES = {
  jar: { width: 150, height: 150 },
  ground: { width: 140, height: 88 },
  bottle: { width: 150, height: 250 },
};

export function DragGhost() {
  const drag = useUiState((s) => s.drag);
  const ingredient = useGameStore((s) =>
    drag?.ingredientId ? s.ingredientById(drag.ingredientId) : undefined,
  );
  const jarArt = useArt(
    drag?.kind === 'jar' && drag.ingredientId
      ? `cabinet/jar_${drag.ingredientId}.png`
      : undefined,
  );
  const bottleArt = useArt(drag?.kind === 'bottle' ? 'bottles/bottle_empty.png' : undefined);

  if (!drag) return null;
  const size = SIZES[drag.kind];

  return (
    <div
      className={`ghost ghost--${drag.kind}${drag.over ? ' is-over' : ''}`}
      style={{
        position: 'absolute',
        left: drag.x - size.width / 2,
        top: drag.y - size.height / 2,
        width: size.width,
        height: size.height,
        zIndex: 90,
        ...vars({ '--ing-color': ingredient?.color ?? '#8a7a52' }),
      }}
    >
      {drag.kind === 'jar' ? (
        <>
          {jarArt.node}
          {jarArt.loaded ? null : (
            <span className="jar__ph">
              <span className="jar__body">
                <span className="jar__fill" />
                <span className="jar__gloss" />
              </span>
              <span className="jar__lid" />
            </span>
          )}
          <span className="jar__label">{ingredient?.nameFa}</span>
        </>
      ) : null}
      {drag.kind === 'ground' ? <span className="ghost__heap" /> : null}
      {drag.kind === 'bottle' ? (
        <>
          {bottleArt.node}
          {bottleArt.loaded ? null : (
            <>
              <span className="bottle__cork" />
              <span className="bottle__glass" />
              <span className="bottle__gloss" />
            </>
          )}
        </>
      ) : null}
      <span className="ghost__shadow" />
    </div>
  );
}
