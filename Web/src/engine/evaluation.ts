/**
 * ارزیابی مشتری — Smooth Evaluation (سند 05).
 *
 * Satisfaction هر Requirement عددی 0..1 است، نه دیوار Binary:
 * - at_least: مقدار ≥ آستانه ⇒ 1؛ به‌صورت Smoothstep تا ~۶۰٪ آستانه به 0 می‌رسد.
 * - at_most: مقدار ≤ آستانه ⇒ 1؛ به‌صورت Smoothstep تا ~۱.۶× آستانه به 0 می‌رسد.
 * Oversolving پاداش اضافه ندارد (Satisfaction در ۱ سقف می‌خورد).
 *
 * Core از ۱۰۰: بودجه‌ی مثبت بین must_have (وزن tuning.mustHave) و رعایت
 * avoid ها (باقی‌مانده تا ۱۰۰) تقسیم می‌شود؛ هر avoid نقض‌شده علاوه بر از دست
 * دادن سهم مثبت، جریمه‌ی قوی جداگانه (وزن tuning.avoid × میزان نقض) می‌خورد.
 * Preferred فقط Bonus کوچک است و با ضریب min(avoid satisfaction) مقیاس می‌شود
 * تا هرگز یک avoid خراب را جبران نکند.
 */

import type {
  AlchemyDefinitions,
  CustomerDefinition,
  CustomerEvaluation,
  CustomerRequirement,
  PotionResult,
  PropertyId,
  QualityBand,
  RequirementOutcome,
  TuningConfig,
} from './types';
import { clamp, smoothstep01, stabilityModifierFor } from './curves';

const EPS = 1e-9;

/** پهنای Ramp نسبت به آستانه: at_least از ۰.۶T و at_most تا ۱.۶T */
const AT_LEAST_RAMP_START = 0.6;
const AT_MOST_RAMP_END = 1.6;
/** پهنای Ramp برای آستانه‌ی صفر (حالت مرزی) */
const ZERO_THRESHOLD_RAMP = 0.8;

export function satisfactionOf(value: number, req: CustomerRequirement): number {
  const t = req.threshold;
  if (req.direction === 'at_least') {
    if (t <= EPS) return 1;
    return smoothstep01((value - AT_LEAST_RAMP_START * t) / ((1 - AT_LEAST_RAMP_START) * t));
  }
  if (t <= EPS) return smoothstep01((ZERO_THRESHOLD_RAMP - value) / ZERO_THRESHOLD_RAMP);
  return smoothstep01((AT_MOST_RAMP_END * t - value) / ((AT_MOST_RAMP_END - 1) * t));
}

function isSatisfied(value: number, req: CustomerRequirement): boolean {
  return req.direction === 'at_least' ? value >= req.threshold - EPS : value <= req.threshold + EPS;
}

function bandOf(score: number, tuning: TuningConfig): QualityBand {
  const t = tuning.bandThresholds;
  if (score >= t.excellent) return 'excellent';
  if (score >= t.good) return 'good';
  if (score >= t.partial) return 'partial';
  return 'failure';
}

/** حاشیه‌ی برآورده شدن — برای انتخاب «بهترین موفقیت» در واکنش مشتری */
function marginOf(outcome: RequirementOutcome): number {
  const { requirement: req, actualValue } = outcome;
  return req.direction === 'at_least' ? actualValue - req.threshold : req.threshold - actualValue;
}

/** شدت نقض: critical مقدم، بعد avoid، بعد must_have؛ در تساوی کمترین Satisfaction */
function severityRank(outcome: RequirementOutcome): number {
  const kindRank =
    outcome.requirement.kind === 'avoid' ? 1 : outcome.requirement.kind === 'must_have' ? 2 : 3;
  return (outcome.requirement.critical ? 0 : 10) + kindRank;
}

export function evaluate(
  result: PotionResult,
  customer: CustomerDefinition,
  defs: AlchemyDefinitions,
): CustomerEvaluation {
  const w = defs.tuning.evaluationWeights;

  const perRequirement: RequirementOutcome[] = customer.requirements.map((requirement) => {
    const actualValue = result.effectProfile[requirement.propertyId] ?? 0;
    return {
      requirement,
      actualValue,
      satisfaction: satisfactionOf(actualValue, requirement),
      satisfied: isSatisfied(actualValue, requirement),
    };
  });

  const musts = perRequirement.filter((o) => o.requirement.kind === 'must_have');
  const avoids = perRequirement.filter((o) => o.requirement.kind === 'avoid');
  const preferred = perRequirement.filter((o) => o.requirement.kind === 'preferred');
  const avgSat = (xs: RequirementOutcome[]) =>
    xs.length === 0 ? 1 : xs.reduce((s, o) => s + o.satisfaction, 0) / xs.length;

  // بودجه‌ی مثبت ۱۰۰: سهم must_have ها (تقسیم بین‌شان) + سهم رعایت avoid ها
  const mustPart = w.mustHave * avgSat(musts);
  const avoidPart = (100 - w.mustHave) * avgSat(avoids);
  // جریمه‌ی قوی جداگانه برای هر avoid نقض‌شده
  const avoidPenalty = avoids.reduce((s, o) => s + w.avoid * (1 - o.satisfaction), 0);
  // Preferred: Bonus کوچک؛ هرگز avoid خراب را جبران نمی‌کند
  const minAvoidSat = avoids.reduce((m, o) => Math.min(m, o.satisfaction), 1);
  const preferredPart =
    preferred.length === 0 ? 0 : w.preferredBonus * avgSat(preferred) * minAvoidSat;

  const core = clamp(mustPart + avoidPart - avoidPenalty + preferredPart, 0, 100);

  // Side Effect های ناخواسته: فقط Property هایی که در هیچ Requirement نیامده‌اند
  // و از آستانه‌ی معافیت بالاترند جریمه می‌گیرند (Neutral Extra مجانی است)
  const requestedProperties = new Set(customer.requirements.map((r) => r.propertyId));
  let sideEffectPenalty = 0;
  for (const [propertyId, value] of Object.entries(result.effectProfile) as [
    PropertyId,
    number,
  ][]) {
    if (requestedProperties.has(propertyId)) continue;
    const over = value - w.sideEffectFreeThreshold;
    if (over > 0) sideEffectPenalty += w.sideEffectPenaltyPerUnit * over;
  }

  const stabilityModifier = stabilityModifierFor(result.stability, defs.tuning);
  const matchedTags = (customer.preferredTags ?? []).filter((t) =>
    result.qualityTags.includes(t),
  );
  const tagBonus = matchedTags.length * w.tagBonus;

  const quality = Math.max(0, core - sideEffectPenalty) * stabilityModifier + tagBonus;
  const score = clamp(quality, 0, 100);

  let band = bandOf(score, defs.tuning);
  // نقض شدید یک Requirement بحرانی ⇒ سقف Band روی partial
  const criticalViolated = perRequirement.some(
    (o) => o.requirement.critical === true && o.satisfaction < 0.5,
  );
  if (criticalViolated && (band === 'excellent' || band === 'good')) band = 'partial';

  // ── واکنش انسانی: حداقل یک موفقیت + یک مشکل مهم ──
  const successPool = musts.filter((o) => o.satisfied);
  const successFallback = preferred.filter((o) => o.satisfied);
  const pickBest = (xs: RequirementOutcome[]) =>
    xs.length === 0
      ? null
      : xs.reduce((best, o) => (marginOf(o) > marginOf(best) ? o : best), xs[0]);
  const bestSuccess = pickBest(successPool) ?? pickBest(successFallback);

  const violations = perRequirement
    .filter((o) => !o.satisfied)
    .sort((a, b) => severityRank(a) - severityRank(b) || a.satisfaction - b.satisfaction);
  const worstViolation = violations[0] ?? null;

  const keySuccessFa = bestSuccess ? bestSuccess.requirement.metFeedbackFa : null;
  const keyProblemFa = worstViolation ? worstViolation.requirement.unmetFeedbackFa : null;

  let reactionFa: string;
  if (keySuccessFa && keyProblemFa) {
    reactionFa = `${keySuccessFa}؛ ولی ${keyProblemFa}`;
  } else if (keySuccessFa) {
    reactionFa = `${keySuccessFa}. دقیقاً همان چیزی بود که می‌خواستم!`;
  } else if (keyProblemFa) {
    reactionFa = `${keyProblemFa}. این آن چیزی نبود که می‌خواستم…`;
  } else {
    reactionFa = 'چیز خاصی حس نکردم…';
  }

  return {
    customerId: customer.id,
    score,
    band,
    perRequirement,
    sideEffectPenalty,
    stabilityModifier,
    tagBonus,
    reactionFa,
    keySuccessFa,
    keyProblemFa,
  };
}
