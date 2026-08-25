/**
 * شیء در دست بازیکن — دقیقاً زیر انگشت/اشاره‌گر حرکت می‌کند.
 * تا Drop، همه‌چیز قابل لغو است؛ رهاکردن جای اشتباه بی‌هزینه است.
 *
 * ماده‌ی کوبیده (kind: 'ground') با تصویر واقعی contents_{units}_ground و
 * tint رنگ ماده رندر می‌شود (همان تکنیک mask + luminosity هاون)؛ روی پاتیل
 * ~۲۰ درجه کج می‌شود، انگار آماده‌ی ریختن است.
 */

import { useGameStore } from '../store/gameStore';
import { CLASSIC_ART, artUrl } from './artManifest';
import { useArt, vars } from './Zone';
import { useUiState } from './uiState';
import './classic-stations.css';

const SIZES = {
  jar: { width: 150, height: 150 },
  /* بوم مشترک هاون ~مربع است؛ تپه وسطِ آن می‌نشیند */
  ground: { width: 190, height: 194 },
  bottle: { width: 150, height: 250 },
};

export function DragGhost() {
  const drag = useUiState((s) => s.drag);
  const ingredient = useGameStore((s) =>
    drag?.ingredientId ? s.ingredientById(drag.ingredientId) : undefined,
  );
  /** واحدهای هاون هنگام درگ (هاون تا Drop خالی نمی‌شود) */
  const mortarUnits = useGameStore((s) =>
    s.mortar ? (Math.min(3, Math.max(1, Math.round(s.mortar.quantity))) as 1 | 2 | 3) : 1,
  );
  const jarArt = useArt(
    drag?.kind === 'jar' && drag.ingredientId
      ? `cabinet/jar_${drag.ingredientId}.png`
      : undefined,
  );
  const bottleArt = useArt(drag?.kind === 'bottle' ? 'bottles/bottle_empty.png' : undefined);

  if (!drag) return null;
  const size = SIZES[drag.kind];
  const groundSrc =
    drag.kind === 'ground' ? artUrl(CLASSIC_ART.mortar.contents(mortarUnits, 'ground')) : undefined;

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
      {drag.kind === 'ground' && groundSrc ? (
        <span
          className={`cst-ghost-ground${drag.over === 'cauldron' ? ' is-pouring' : ''}`}
        >
          <span
            className="cst-contents__color"
            style={{
              WebkitMaskImage: `url("${groundSrc}")`,
              maskImage: `url("${groundSrc}")`,
            }}
          />
          <img className="cst-fit cst-contents__texture" src={groundSrc} alt="" draggable={false} />
        </span>
      ) : null}
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
