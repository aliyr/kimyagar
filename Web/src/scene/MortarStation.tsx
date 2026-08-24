/**
 * ایستگاه هاون: کاسه، دسته‌هاون، ظرف‌های سهم‌بندی و قلم‌موی پاک‌کردن.
 *
 * - محتوای هاون با grindState بافت عوض می‌کند (تکه → درشت → نیم‌کوب → نرم).
 * - کوبیدن: فشار روی دسته‌هاون و حرکت دورانی (applyGrindWork).
 * - سهم: چهار ظرف کوچک ۰٫۵ / ۱ / ۱٫۵ / ۲ (setQuantity) — فرم نیست، ظرف است.
 * - محتوای کوبیده‌شده قابل برداشتن و ریختن در پاتیل است (addMortarToCauldron).
 *
 * z-order: ماده بالای دسته‌هاون است تا هم کوبیدن و هم برداشتنِ ماده هر دو
 * مستقل قابل لمس بمانند؛ کل ایستگاه زیر پنل کابینتِ باز می‌ماند مگر وقتی
 * شیشه‌ای در دست باشد (آن‌وقت باید مقصد Drop دیده شود).
 */

import { useMemo } from 'react';
import { GRIND_THRESHOLDS, useGameStore } from '../store/gameStore';
import { grindLabels, uiLabels } from '../data/labels';
import { tapProps, useDragSource, useGrindGesture } from '../gestures';
import { SCENE_ZONES } from './artManifest';
import { DISH_SIZE, PROPS, QUANTITY_DISHES } from './layout';
import { ArtLayer, rectStyle, useArt, vars } from './Zone';
import { useUiState } from './uiState';

const Z = SCENE_ZONES.mortar.z;
/**
 * پنل کابینتِ باز (z=40) جلوی هاون می‌ایستد. در حالت عادی همه‌ی اجزای ایستگاه
 * زیر آن می‌مانند (فیزیکیِ درست: درِ کشویی جلوی میز است)، ولی وقتی شیشه‌ای در
 * دست است، کل ایستگاه بالا می‌آید تا مقصدِ Drop دیده شود.
 */
const LIFT = 25;
const MAX_WORK = GRIND_THRESHOLDS[GRIND_THRESHOLDS.length - 1].work;
const PORTION_SCALE: Record<number, number> = { 0.5: 0.72, 1: 0.86, 1.5: 0.96, 2: 1.05 };
/** تکه‌های درشتِ ماده‌ی نکوبیده */
const CHUNKS = [
  { x: 6, y: 22, r: -18 },
  { x: 30, y: 8, r: 24 },
  { x: 54, y: 26, r: -8 },
  { x: 78, y: 12, r: 34 },
  { x: 42, y: 40, r: 12 },
];

export function MortarStation() {
  const mortar = useGameStore((s) => s.mortar);
  const ingredient = useGameStore((s) =>
    s.mortar ? s.ingredientById(s.mortar.ingredientId) : undefined,
  );
  const applyGrindWork = useGameStore((s) => s.applyGrindWork);
  const setQuantity = useGameStore((s) => s.setQuantity);
  const clearMortar = useGameStore((s) => s.clearMortar);
  const addMortarToCauldron = useGameStore((s) => s.addMortarToCauldron);

  const grinding = useUiState((s) => s.grinding);
  const dropHint = useUiState((s) => s.drag?.kind === 'jar');
  const dropActive = useUiState((s) => s.drag?.kind === 'jar' && s.drag.over === 'mortar');
  const carryingGround = useUiState((s) => s.drag?.kind === 'ground');
  const setGrinding = useUiState((s) => s.setGrinding);
  const pulse = useUiState((s) => s.pulse);

  const grindState = mortar?.grindState ?? null;
  const ready = grindState !== null;
  const progress = mortar ? Math.min(mortar.grindWork / MAX_WORK, 1) : 0;
  const z = dropHint ? Z + LIFT : Z;

  const pestleArt = useArt('mortar/mortar_pestle.png');
  // بافت ماده‌ی کوبیده‌شده؛ رنگ از خود ماده می‌آید (blend: luminosity)
  const textureArt = useArt(
    grindState === 'crushed' || grindState === 'fine'
      ? 'mortar/mortar_contents_crushed.png'
      : 'mortar/mortar_contents_base.png',
    { fit: 'fill', className: 'ground__texture' },
  );

  const grind = useGrindGesture({
    enabled: mortar !== null,
    onWork: applyGrindWork,
    onStroke: () => pulse('pourPulse'),
    onActiveChange: setGrinding,
  });

  const carry = useDragSource({
    kind: 'ground',
    ingredientId: mortar?.ingredientId,
    targets: ['cauldron'],
    draggable: ready,
    onDrop: (target) => {
      if (target !== 'cauldron') return;
      addMortarToCauldron();
      pulse('splashPulse');
    },
  });

  const contentsStyle = useMemo(
    () => ({
      ...rectStyle(PROPS.mortarContents, z + 4),
      ...vars({
        '--ing-color': ingredient?.color ?? '#8a7a52',
        '--portion': PORTION_SCALE[mortar?.quantity ?? 1] ?? 0.78,
        '--grind-progress': progress,
      }),
    }),
    [ingredient?.color, mortar?.quantity, progress, z],
  );

  return (
    <>
      <div
        data-testid="mortar"
        className={`mortar${dropHint ? ' is-target' : ''}${dropActive ? ' is-target-active' : ''}${
          grinding ? ' is-grinding' : ''
        }`}
        style={rectStyle(SCENE_ZONES.mortar, z)}
      >
        <ArtLayer src={SCENE_ZONES.mortar.img}>
          <div className="mortar__ph">
            <div className="mortar__foot" />
            <div className="mortar__bowl" />
            <div className="mortar__cavity" />
          </div>
        </ArtLayer>
        <div className="mortar__glow" />
      </div>

      <div
        data-testid="pestle"
        className={`pestle interactive${pestleArt.loaded ? ' is-art' : ''}${
          mortar ? ' is-usable' : ''
        }${grinding ? ' is-grinding' : ''}`}
        style={rectStyle(PROPS.pestle, z + 2)}
        {...grind}
      >
        {pestleArt.node}
        {pestleArt.loaded ? null : (
          <>
            <span className="pestle__rod" />
            <span className="pestle__head" />
          </>
        )}
      </div>

      {mortar ? (
        <div
          // قرارداد e2e: «mortar-contents» فقط وقتی ماده کوبیده و قابل درگ است
          data-testid={grindState ? 'mortar-contents' : 'mortar-contents-raw'}
          className={`ground interactive${ready ? ' is-ready' : ''}${
            grinding ? ' is-shaking' : ''
          }`}
          data-grind={grindState ?? 'whole'}
          style={contentsStyle}
          {...carry}
        >
          <div className="ground__heap" />
          {textureArt.node}
          {grindState === null
            ? CHUNKS.map((c, i) => (
                <span
                  key={i}
                  className="ground__chunk"
                  style={{ left: `${c.x}%`, top: `${c.y}%`, transform: `rotate(${c.r}deg)` }}
                />
              ))
            : null}
        </div>
      ) : null}

      {/* ظرف‌های سهم‌بندی — بالای دسته‌هاون تا لمسشان همیشه آزاد بماند */}
      {QUANTITY_DISHES.map((dish) => (
        <div
          key={dish.q}
          data-testid={`quantity-${dish.q}`}
          className={`dish interactive${mortar?.quantity === dish.q ? ' is-active' : ''}${
            mortar ? '' : ' is-idle'
          }`}
          style={rectStyle({ x: dish.x, y: dish.y, width: DISH_SIZE, height: DISH_SIZE }, z + 3)}
          {...tapProps(() => setQuantity(dish.q))}
        >
          <span className="dish__bowl" />
          <span className="dish__label">{dish.faLabel}</span>
        </div>
      ))}

      {/* قلم‌مو: خالی کردن هاون پیش از افزودن (بی‌هزینه) */}
      {mortar && !carryingGround ? (
        <div
          className="brush interactive"
          title="خالی کردن هاون"
          style={rectStyle(PROPS.brush, z + 1)}
          {...tapProps(clearMortar)}
        >
          <span className="brush__handle" />
          <span className="brush__ferrule" />
          <span className="brush__bristles" />
        </div>
      ) : null}

      {mortar ? (
        <div className="mortar-label" style={rectStyle(PROPS.mortarLabel, z + 3)}>
          {grindState ? (
            <span className="mortar-label__state">{grindLabels[grindState]}</span>
          ) : (
            <span className="mortar-label__hint">{uiLabels.grindHint}</span>
          )}
        </div>
      ) : null}
    </>
  );
}
