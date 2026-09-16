import { OverlayShell } from './OverlayShell';
import { useGameStore } from '../store/gameStore';
import { uiLabels } from '../data/labels';
import { useRouteKind } from '../route';
import { useArtStyle } from '../scene/v2/contracts';
import { FlatIngredientIcon } from '../art/flat/react/FlatIngredientIcon';
import { flatIngredientById } from '../art/flat/kit/ingredients.ts';

export function NotebookOverlay() {
  const defs = useGameStore((s) => s.defs);
  const discoveredTagIds = useGameStore((s) => s.discoveredTagIds);
  const usedIngredientIds = useGameStore((s) => s.usedIngredientIds);
  // سبک فلت (v2): آیکون برداری ماده به‌جای لکه‌ی رنگ
  const routeKind = useRouteKind();
  const artStyle = useArtStyle();
  const flatIcons = routeKind === 'v2' && artStyle === 'flat';

  const discoveredTags = defs.qualityTags.filter((t) => discoveredTagIds.includes(t.id));
  const hiddenTagCount = defs.qualityTags.length - discoveredTags.length;

  return (
    <OverlayShell overlayId="notebook" title={uiLabels.notebook}>
      <section className="kimi-notebook-section">
        <h3>{uiLabels.notebookTags}</h3>
        {discoveredTags.length === 0 && hiddenTagCount === 0 ? (
          <p className="kimi-empty">{uiLabels.noDiscoveries}</p>
        ) : (
          <ul className="kimi-notebook-list">
            {discoveredTags.map((tag) => (
              <li key={tag.id} className="kimi-notebook-card">
                <strong>{tag.nameFa}</strong>
                <p>{tag.discoveryFa}</p>
              </li>
            ))}
            {Array.from({ length: hiddenTagCount }, (_, i) => (
              <li key={`hidden-tag-${i}`} className="kimi-notebook-card is-unknown">
                {uiLabels.unknownMark}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="kimi-notebook-section">
        <h3>{uiLabels.notebookIngredients}</h3>
        <ul className="kimi-notebook-list">
          {defs.ingredients.map((ing) => {
            const used = usedIngredientIds.includes(ing.id);
            return (
              <li key={ing.id} className="kimi-notebook-card">
                <div className="kimi-ingredient-head kimi-ingredient-head-compact">
                  {flatIcons && flatIngredientById(ing.id) ? (
                    <span className="kimi-flat-icon" aria-hidden data-testid={`notebook-flat-icon-${ing.id}`}>
                      <FlatIngredientIcon ingredientId={ing.id} />
                    </span>
                  ) : (
                    <span className="kimi-color-swatch" style={{ background: ing.color }} aria-hidden />
                  )}
                  <strong>{ing.nameFa}</strong>
                </div>
                {used && ing.cluesFa && ing.cluesFa.length > 0 ? (
                  ing.cluesFa.map((clue) => (
                    <p key={clue} className="kimi-clue">
                      {clue}
                    </p>
                  ))
                ) : (
                  <p className="kimi-clue kimi-clue-unknown">{uiLabels.unknownMark}</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </OverlayShell>
  );
}
