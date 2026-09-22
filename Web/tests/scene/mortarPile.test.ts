import { beforeEach, describe, expect, it } from 'vitest';
import {
  BOWL_MORTAR,
  chipInsideBowl,
  generationCapForWork,
  getMortarChips,
  getPestleAim,
  handleTipY,
  pestleInFront,
  kindForIngredient,
  setPestleMode,
  tickMortarVisuals,
  scoopRest,
  scoopUnderSpoon,
  syncMortarMix,
  syncMortarPile,
} from '../../src/scene/mortarPile';
import { SCENE_ZONES } from '../../src/scene/artManifest';

describe('classic mortar pile', () => {
  beforeEach(() => {
    syncMortarPile(null, 1, 0);
    setPestleMode('lean');
  });

  it('maps each ingredient to its own coarse shape', () => {
    expect(kindForIngredient('chamomile')).toBe('flower');
    expect(kindForIngredient('borage')).toBe('star');
    expect(kindForIngredient('mint')).toBe('leaf');
    expect(kindForIngredient('saffron')).toBe('thread');
    expect(kindForIngredient('poppy')).toBe('seed');
    expect(kindForIngredient('ginger')).toBe('root');
  });

  it('starts a unit as a few large pieces that stay inside the mouth', () => {
    syncMortarPile('chamomile:1', 1, 0);
    const chips = getMortarChips();
    expect(chips.length).toBeGreaterThanOrEqual(3);
    expect(chips.length).toBeLessThanOrEqual(4);
    expect(chips.every((chip) => chip.kind === 'flower' && chip.generation === 0)).toBe(true);
    expect(chips.every(chipInsideBowl)).toBe(true);
  });

  it('keeps the pile volume while pieces break into visible powder', () => {
    expect(generationCapForWork(0.4)).toBe(0);
    expect(generationCapForWork(1.4)).toBe(1);
    expect(generationCapForWork(2.4)).toBe(2);
    expect(generationCapForWork(3.6)).toBe(3);

    syncMortarPile('mint:1', 1, 0);
    const start = getMortarChips();
    syncMortarPile('mint:1', 1, 1.4);
    const coarse = getMortarChips();
    expect(coarse.length).toBeGreaterThan(start.length);
    expect(coarse.some((chip) => chip.kind !== 'dust')).toBe(true);
    expect(coarse.every(chipInsideBowl)).toBe(true);

    syncMortarPile('ginger:raw', 1, 0);
    const gingerArea = getMortarChips().reduce((sum, chip) => sum + chip.w * chip.h, 0);
    syncMortarPile('ginger:fine', 1, 3.6);
    const fine = getMortarChips();
    const fineArea = fine.reduce((sum, chip) => sum + chip.w * chip.h, 0);
    const xs = fine.map((chip) => chip.x);
    const ys = fine.map((chip) => chip.y);
    expect(fine.length).toBeGreaterThan(start.length);
    expect(fine.every((chip) => chip.kind === 'dust' && chip.w >= 8 && chip.h >= 8)).toBe(true);
    expect(fineArea).toBeGreaterThan(gingerArea * 0.2);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(20);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(8);
    expect(fine.every(chipInsideBowl)).toBe(true);
  });

  it('moves pieces under the spoon into the scoop', () => {
    syncMortarPile('chamomile:1', 1, 0);
    const before = getMortarChips();
    const chip = before[0];
    const zone = SCENE_ZONES.mortar;
    const sx = zone.x + ((BOWL_MORTAR.left + (chip.x / 100) * BOWL_MORTAR.width) / 100) * zone.width;
    const sy = zone.y + ((BOWL_MORTAR.top + (chip.y / 100) * BOWL_MORTAR.height) / 100) * zone.height;
    const taken = scoopUnderSpoon(sx, sy);
    expect(taken.length).toBeGreaterThan(0);
    expect(getMortarChips().length).toBe(before.length - taken.length);
    const rest = scoopRest();
    expect(rest.length + taken.length).toBe(before.length);
    expect(getMortarChips()).toHaveLength(0);
  });

  it('mixes each ingredient’s shape and color, and keeps a fine pile beside a raw one', () => {
    syncMortarMix('saffron:1|poppy:2', [
      { ingredientId: 'saffron', quantity: 1, grindWork: 3.6, color: '#c23b12' },
      { ingredientId: 'poppy', quantity: 2, grindWork: 0, color: '#a07888' },
    ]);
    const chips = getMortarChips();
    const saffron = chips.filter((chip) => chip.ingredientId === 'saffron');
    const poppy = chips.filter((chip) => chip.ingredientId === 'poppy');
    expect(saffron.length).toBeGreaterThan(0);
    expect(poppy.length).toBeGreaterThan(0);
    expect(saffron.every((chip) => chip.kind === 'dust' && chip.color === '#c23b12')).toBe(true);
    expect(poppy.every((chip) => chip.kind === 'seed' && chip.generation === 0 && chip.color === '#a07888')).toBe(true);
    expect(chips.every(chipInsideBowl)).toBe(true);
  });

  it('rebuilds coarse pieces when a portion’s grind is reset', () => {
    syncMortarMix('saffron:1', [
      { ingredientId: 'saffron', quantity: 1, grindWork: 3.6, color: '#c23b12' },
    ]);
    expect(getMortarChips().every((chip) => chip.kind === 'dust')).toBe(true);
    syncMortarMix('saffron:1', [
      { ingredientId: 'saffron', quantity: 1, grindWork: 0, color: '#c23b12' },
    ]);
    const chips = getMortarChips();
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.every((chip) => chip.kind === 'thread' && chip.generation === 0 && chip.color === '#c23b12')).toBe(true);
    expect(chips.every(chipInsideBowl)).toBe(true);
  });

  it('puts the pestle behind the pile on the far half and in front at rest', () => {
    syncMortarPile('mint:1', 1, 0.4);
    setPestleMode('grind');
    expect(pestleInFront(getPestleAim())).toBe(false);
    tickMortarVisuals(0.5);
    expect(pestleInFront(getPestleAim())).toBe(true);
    setPestleMode('rest');
    expect(pestleInFront(getPestleAim())).toBe(true);
  });

  it('holds the empty pestle handle higher than the loaded rest pose', () => {
    const empty = handleTipY(getPestleAim());
    syncMortarPile('saffron:1', 1, 0);
    setPestleMode('rest');
    const loaded = handleTipY(getPestleAim());
    expect(getPestleAim().mode).toBe('rest');
    expect(empty).toBeLessThan(loaded);
  });
});
