import { OverlayShell } from './OverlayShell';
import { PropertyChips } from './PropertyChips';
import { useGameStore } from '../store/gameStore';
import { uiLabels } from '../data/labels';

export function IngredientDetailOverlay() {
  const inspectedIngredientId = useGameStore((s) => s.inspectedIngredientId);
  const ingredientById = useGameStore((s) => s.ingredientById);
  const usedIngredientIds = useGameStore((s) => s.usedIngredientIds);

  const ingredient = inspectedIngredientId ? ingredientById(inspectedIngredientId) : undefined;
  const known = ingredient ? usedIngredientIds.includes(ingredient.id) : false;

  return (
    <OverlayShell overlayId="ingredient_detail">
      {ingredient ? (
        <>
          <div className="kimi-ingredient-head">
            <span
              className="kimi-color-swatch"
              style={{ background: ingredient.color }}
              aria-hidden
            />
            <div>
              <h2 className="kimi-overlay-title kimi-overlay-title-inline">{ingredient.nameFa}</h2>
              <p className="kimi-ingredient-en">{ingredient.nameEn}</p>
            </div>
          </div>
          <p className="kimi-flavor">{ingredient.flavorFa}</p>
          <PropertyChips values={ingredient.baseProperties} />
          <div className="kimi-clues">
            {known && ingredient.cluesFa && ingredient.cluesFa.length > 0 ? (
              ingredient.cluesFa.map((clue) => (
                <p key={clue} className="kimi-clue">
                  {clue}
                </p>
              ))
            ) : (
              <p className="kimi-clue kimi-clue-unknown">{uiLabels.unknownSecret}</p>
            )}
          </div>
        </>
      ) : (
        <p className="kimi-flavor">{uiLabels.unknownSecret}</p>
      )}
    </OverlayShell>
  );
}
