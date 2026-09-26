/**
 * صفحه‌ی نتیجه — فشرده و پس از انیمیشن واکنش مشتری.
 *
 * ترتیب موردنظر: با تحویل، اول صحنه واکنش مشتری را بازی می‌کند
 * (CustomerArea با آمدن evaluation فاز react را شروع می‌کند) و تا REACTION_MS
 * پنل متنی جای خود را به یک نوار نازکِ بی‌مانع می‌دهد تا صحنه دیده شود؛
 * بعد پنل ارزیابی (با data-testid="customer-reaction") ظاهر می‌شود.
 *
 * پرده‌ی تیره‌ی OverlayShell در این پنجره رندر نمی‌شود (چون خود Shell را رندر
 * نمی‌کنیم) و تیرگی Vignette صحنه هم با کلاس amb-reaction روی body کم می‌شود.
 */

import { useEffect, useMemo, useState } from 'react';
import { OverlayShell } from './OverlayShell';
import { PropertyChips } from './PropertyChips';
import { toFaDigits } from './format';
import { bandLabels, heatLabels, stabilityLabels, uiLabels } from '../data/labels';
import { useGameStore } from '../store/gameStore';
import { useRouteKind } from '../route';
import { useArtStyle } from '../scene/v2/contracts';
import { desaturate, mixColors, rgbString, shade } from '../scene/colors';
import { FlatPotSvg } from '../art/flat/react/FlatPotSvg';
import { sfx } from '../audio/sfx';
import { discardCauldron } from '../scene/cauldron/discard';
import '../scene/classic-ambience.css';

/** مدت پخش واکنش مشتری روی صحنه پیش از نمایش پنل متنی */
const REACTION_MS = 2200;

/**
 * در سبک فلت (روت v2): دیگ برداری کوچک با رنگ نهایی معجون — همان ترکیب وزنی
 * رنگ مواد که در پاتیل دیده می‌شد؛ سوخته ⇒ کم‌اشباع و تیره.
 */
function ResultPot() {
  const routeKind = useRouteKind();
  const artStyle = useArtStyle();
  const flat = routeKind === 'v2' && artStyle === 'flat';
  const entries = useGameStore((s) => s.result?.entries ?? s.brew.entries);
  const ingredientById = useGameStore((s) => s.ingredientById);
  const liquid = useMemo(() => {
    if (entries.length === 0) return null;
    let rgb = shade(
      mixColors(entries.map((e) => ({ color: ingredientById(e.ingredientId)?.color ?? '#6b6b4a', weight: e.quantity }))),
      -0.18,
    );
    if (entries.some((e) => e.stage === 'overprocessed')) rgb = shade(desaturate(rgb, 0.45), -0.3);
    return rgbString(rgb);
  }, [entries, ingredientById]);
  if (!flat || !liquid) return null;
  return <FlatPotSvg liquid={liquid} className="res-pot" data-testid="result-flat-pot" />;
}

export function ResultOverlay() {
  const result = useGameStore((s) => s.result);
  const evaluation = useGameStore((s) => s.evaluation);
  const brew = useGameStore((s) => s.brew);
  const defs = useGameStore((s) => s.defs);
  const customer = useGameStore((s) => s.currentCustomer());
  const deliver = useGameStore((s) => s.deliver);
  const nextCustomer = useGameStore((s) => s.nextCustomer);
  /** تلاش دوباره = همان دور ریختن سطل: ریست store + پرت‌شدن دیگ در صحنه‌ی کلاسیک */
  const resetBrew = discardCauldron;
  const repeatLastBrew = useGameStore((s) => s.repeatLastBrew);
  const closeOverlay = useGameStore((s) => s.closeOverlay);
  const lastRecipe = useGameStore((s) => s.lastRecipe);

  /** آیا پنل ارزیابی دیده شود؟ تا پایان انیمیشن واکنش، نه */
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!evaluation) {
      setRevealed(false);
      return;
    }
    setRevealed(false);
    // استینگر با واکنش مشتری: موفق (عالی/خوب) یا ناموفق (ناقص/شکست)
    if (evaluation.band === 'excellent' || evaluation.band === 'good') sfx.success();
    else sfx.failure();
    const timer = window.setTimeout(() => setRevealed(true), REACTION_MS);
    return () => window.clearTimeout(timer);
  }, [evaluation]);

  /** در پنجره‌ی واکنش، تیرگی صحنه کم می‌شود تا مشتری خوب دیده شود */
  const inReactionWindow = Boolean(evaluation) && !revealed;
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('amb-reaction', inReactionWindow);
    return () => document.body.classList.remove('amb-reaction');
  }, [inReactionWindow]);

  if (!result) return null;

  if (inReactionWindow) {
    return (
      <div className="res-waiting" dir="rtl" data-testid="result-reaction-wait">
        <span className="res-waiting__dot" />
        <span>واکنش {customer.nameFa}…</span>
      </div>
    );
  }

  if (evaluation) {
    return (
      <OverlayShell overlayId="result">
        <div className="res-compact">
          <ResultPot />
          <p className="kimi-letter-name">{customer.nameFa}</p>
          <blockquote className="kimi-speech" data-testid="customer-reaction">
            {evaluation.reactionFa}
          </blockquote>
          <p className="kimi-band">{bandLabels[evaluation.band]}</p>
          <section className="kimi-result-section">
            <h3>{uiLabels.effectProfile}</h3>
            <PropertyChips values={result.effectProfile} />
          </section>
          <div className="kimi-actions">
            <button
              type="button"
              className="kimi-action-btn kimi-action-primary"
              data-testid="action-next-customer"
              onClick={nextCustomer}
            >
              {uiLabels.nextCustomer}
            </button>
            <button
              type="button"
              className="kimi-action-btn"
              data-testid="action-retry"
              onClick={resetBrew}
            >
              {uiLabels.retry}
            </button>
            <button
              type="button"
              className="kimi-action-btn"
              data-testid="action-repeat"
              onClick={repeatLastBrew}
              disabled={!lastRecipe}
            >
              {uiLabels.repeatLast}
            </button>
          </div>
        </div>
      </OverlayShell>
    );
  }

  const stirs = Math.max(
    brew.stirCount,
    result.history.filter((e) => e.type === 'stirred').length,
  );
  const tagNames = result.qualityTags
    .map((id) => defs.qualityTags.find((t) => t.id === id)?.nameFa)
    .filter((n): n is string => Boolean(n));

  return (
    <OverlayShell overlayId="result">
      <div className="res-compact">
        <ResultPot />
        <h2 className="kimi-overlay-title kimi-overlay-title-inline">{uiLabels.potionReady}</h2>

        <section className="kimi-result-section">
          <h3>{uiLabels.effectProfile}</h3>
          <PropertyChips values={result.effectProfile} />
        </section>

        <p className="kimi-stability">{stabilityLabels[result.stabilityLabel]}</p>

        {tagNames.length > 0 ? (
          <section className="kimi-result-section">
            <h3>{uiLabels.qualityTagsHeading}</h3>
            <ul className="kimi-prop-chips">
              {tagNames.map((name) => (
                <li key={name} className="kimi-prop-chip kimi-tag-chip">
                  {name}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="kimi-process-summary">
          {uiLabels.processSummary}: {toFaDigits(result.entries.length)} ماده،{' '}
          {toFaDigits(stirs)} هم‌زدن، حرارت {heatLabels[brew.currentHeat]}
        </p>

        <div className="kimi-actions">
          <button
            type="button"
            className="kimi-action-btn kimi-action-primary"
            data-testid="action-deliver"
            onClick={deliver}
          >
            {uiLabels.deliver}
          </button>
          <button
            type="button"
            className="kimi-action-btn"
            data-testid="action-retry"
            onClick={resetBrew}
          >
            {uiLabels.retry}
          </button>
          <button
            type="button"
            className="kimi-action-btn"
            data-testid="action-repeat"
            onClick={repeatLastBrew}
            disabled={!lastRecipe}
          >
            {uiLabels.repeatLast}
          </button>
        </div>
        <button type="button" className="kimi-keep" onClick={closeOverlay}>
          {uiLabels.keep}
        </button>
      </div>
    </OverlayShell>
  );
}
