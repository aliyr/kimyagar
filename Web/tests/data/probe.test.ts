import { it } from 'vitest';
import * as engine from '../../src/engine';
import { loadDefinitions } from '../../src/data';
import type { CustomerDefinition, CustomerRequirement, GrindState, HeatLevel, Quantity } from '../../src/engine/types';

const defs = loadDefinitions();
const Q: Quantity[] = [0.5, 1, 1.5, 2];
const H: HeatLevel[] = ['low', 'medium', 'high'];
const comb = <T,>(a: T[], k: number): T[][] => (k === 0 ? [[]] : a.flatMap((x, i) => comb(a.slice(i + 1), k - 1).map((r) => [x, ...r])));
const prod = <T,>(l: T[][]): T[][] => l.reduce<T[][]>((acc, xs) => acc.flatMap((a) => xs.map((x) => [...a, x])), [[]]);

const potions: { label: string; potion: ReturnType<typeof engine.bottle> }[] = [];
for (let k = 1; k <= 3; k++) for (const set of comb(defs.ingredients, k)) {
  const opts = set.map((ing) => prod<unknown>([Q, ['fine', ...Object.keys(ing.grindingModifiers)]]).map(([q, g]) => ({ id: ing.id, q: q as Quantity, g: g as GrindState, s: ing.extractionSpeed ?? 1 })));
  for (const adds of prod(opts)) for (const h of H) {
    const rate = defs.tuning.heatExposureRate[h];
    const sec = 14 / (rate * Math.min(...adds.map((a) => a.s)));
    if (sec * rate * Math.max(...adds.map((a) => a.s)) >= 42) continue;
    let b = engine.setHeat(engine.createBrew(), h, defs);
    for (const a of adds) b = engine.addIngredient(b, a.id, a.q, a.g, defs);
    b = engine.advanceTime(b, sec + 0.01, defs);
    potions.push({ label: `${h}: ${adds.map((a) => `${a.id}x${a.q}${a.g === 'fine' ? '' : a.g}`).join(' + ')}`, potion: engine.bottle(b, defs) });
  }
}

const r = (kind: CustomerRequirement['kind'], propertyId: CustomerRequirement['propertyId'], threshold: number, critical = false): CustomerRequirement => ({
  kind, propertyId, threshold, direction: kind === 'avoid' || (kind === 'preferred' && threshold < 0) ? 'at_most' : 'at_least', critical, metFeedbackFa: 'm', unmetFeedbackFa: 'u',
});
const pm = (propertyId: CustomerRequirement['propertyId'], threshold: number): CustomerRequirement => ({ kind: 'preferred', propertyId, threshold, direction: 'at_most', metFeedbackFa: 'm', unmetFeedbackFa: 'u' });
const c = (id: string, requirements: CustomerRequirement[]): CustomerDefinition => ({ id, nameFa: id, requestFa: id, summaryFa: id, requirements, appearance: 'x' });

const DRAFTS = [
  c('potter', [r('must_have', 'pain_relief', 2.2), r('avoid', 'sleep', 1.5), pm('weakness', 1.0)]),
  c('potter_b', [r('must_have', 'pain_relief', 2.4), r('avoid', 'sleep', 1.4), pm('weakness', 1.0)]),
  c('rider', [r('must_have', 'strength', 1.8), r('preferred', 'warm', 1.2), r('avoid', 'excitement', 1.2, true)]),
  c('jeweler', [r('must_have', 'focus', 1.6), r('must_have', 'cold', 1.2), r('preferred', 'wake', 1.0)]),
];

it('probe', () => {
  for (const cust of DRAFTS) {
    const ranked = potions
      .map((p) => ({ p, e: engine.evaluate(p.potion, cust, defs) }))
      .sort((a, b) => {
        const ca = a.e.band === 'partial' || a.e.band === 'failure' ? 1 : 0;
        const cb = b.e.band === 'partial' || b.e.band === 'failure' ? 1 : 0;
        return ca - cb || b.e.score - a.e.score;
      });
    const good = ranked.filter((x) => x.e.band === 'good' || x.e.band === 'excellent').length;
    const exc = ranked.filter((x) => x.e.band === 'excellent').length;
    console.log(`${cust.id}: excellent=${exc} good+=${good}`);
    for (const x of ranked.slice(0, 3)) console.log(`   ${x.e.band} ${x.e.score.toFixed(1)}  ${x.p.label}  | ${Object.entries(x.p.potion.effectProfile).filter(([, v]) => (v as number) > 0.3).map(([k, v]) => `${k}=${(v as number).toFixed(2)}`).join(' ')}`);
  }
});
