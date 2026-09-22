import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { seedForCustomer } from '../../src/art/flat/react/flatSeed';
import { FLAT_HEAT_LEVEL, flatHeatLevel } from '../../src/art/flat/react/heatLevel';
import { flatSvgMarkup, svgIdPrefix, uniquifyIds } from '../../src/art/flat/react/flatSvgMarkup';
import { FlatCookingScene } from '../../src/art/flat/kit/scene.ts';
import { FLAT_INGREDIENTS, ingredientIdleCss } from '../../src/art/flat/kit/ingredients.ts';
import { potShape } from '../../src/art/flat/kit/props.ts';
import { hexToRgb } from '../../src/art/flat/kit/color.ts';
import { parseRoute, hashNamesStyle } from '../../src/route';
import { FLAT_MOUTH_CENTER, burntLiquid, spoonAngleFor } from '../../src/scene/v2/flatCauldronGeometry';
import { settlePouredIngredient } from '../../src/scene/classicCauldronGeometry';
import { SHELF_INGREDIENT_ORDER } from '../../src/scene/v2/contracts';

describe('seedForCustomer', () => {
  it('is deterministic, non-zero and differs per customer/round', () => {
    expect(seedForCustomer('c1')).toBe(seedForCustomer('c1'));
    expect(seedForCustomer('c1')).not.toBe(0);
    expect(seedForCustomer('c1')).not.toBe(seedForCustomer('c2'));
    expect(seedForCustomer('c1', 0)).not.toBe(seedForCustomer('c1', 1));
    expect(Number.isInteger(seedForCustomer('گلنار'))).toBe(true);
  });
});

describe('flatHeatLevel', () => {
  it('maps low below the boil threshold and medium/high above it', () => {
    expect(flatHeatLevel('low')).toBeLessThanOrEqual(0.5);
    expect(flatHeatLevel('medium')).toBeGreaterThan(0.5);
    expect(flatHeatLevel('high')).toBe(1);
    expect(FLAT_HEAT_LEVEL.low).toBeLessThan(FLAT_HEAT_LEVEL.medium);
  });
});

describe('FlatCookingScene game API', () => {
  function runFor(scene: FlatCookingScene, seconds: number) {
    const dt = 1 / 60;
    for (let t = 0; t < seconds; t += dt) scene.update(dt);
  }

  it('settlePouredIngredient lands in the pot without staying in the falling phase', () => {
    const scene = new FlatCookingScene(4);
    settlePouredIngredient(scene, 'mint', { tint: '#22aa55' });
    expect(scene.phase).not.toBe('dropping');
    expect(scene.recipe.map((item) => item.id)).toEqual(['mint']);
    scene.update(0.4);
    expect(scene.phase).not.toBe('dropping');
  });

  it('drop() honours a tint override so the liquid follows the game colour', () => {
    const scene = new FlatCookingScene(3);
    scene.setHeatLevel(1);
    scene.drop('chamomile', { tint: '#0000ff', strength: 1 });
    runFor(scene, 8);
    const [r, g, b] = hexToRgb(scene.liquidHex);
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  it('setHeatLevel(0) puts the fire out and boiling needs a level above 0.5', () => {
    const cold = new FlatCookingScene(1);
    cold.setHeatLevel(0.4);
    cold.drop('saffron');
    runFor(cold, 6);
    expect(cold.phase).not.toBe('boiling');

    const hot = new FlatCookingScene(1);
    hot.setHeatLevel(0.75);
    hot.drop('saffron');
    runFor(hot, 6);
    expect(hot.phase).toBe('boiling');

    hot.setHeatLevel(0);
    runFor(hot, 3);
    expect(hot.fire.intensity).toBe(0);
  });

  it('setSpoonFollow keeps the spoon in the pot until released', () => {
    const scene = new FlatCookingScene(5);
    scene.drop('mint');
    runFor(scene, 2);
    scene.setSpoonFollow(0);
    runFor(scene, 4); // longer than a scripted stir
    expect(scene.isStirring).toBe(true);
    scene.setSpoonFollow(null);
    runFor(scene, 1);
    expect(scene.isStirring).toBe(false);
  });

  it('reset(seed) reseeds and clears the pot', () => {
    const scene = new FlatCookingScene(9);
    scene.drop('ginger');
    runFor(scene, 3);
    expect(scene.recipe.length).toBe(1);
    scene.reset(42);
    expect(scene.recipe.length).toBe(0);
    expect(scene.phase).toBe('idle');
  });

  it('knows every shelf ingredient of the game', () => {
    const ids = FLAT_INGREDIENTS.map((i) => i.id);
    for (const id of SHELF_INGREDIENT_ORDER) expect(ids).toContain(id);
  });

  function collectIds(shape: { id?: string; children?: readonly unknown[] }, out: string[] = []): string[] {
    if (shape.id) out.push(shape.id);
    for (const c of shape.children ?? []) collectIds(c as { id?: string; children?: readonly unknown[] }, out);
    return out;
  }

  it('drawPot/drawHearth:false hide the vector pot and hearth but keep the liquid', () => {
    const scene = new FlatCookingScene({ seed: 2, drawPot: false, drawHearth: false });
    scene.setHeatLevel(1);
    scene.drop('saffron');
    runFor(scene, 2);
    const ids = collectIds(scene.render());
    expect(ids).not.toContain('pot-back');
    expect(ids).not.toContain('pot-front');
    expect(ids).not.toContain('hearth-and-fire');
    expect(ids).toContain('pot-liquid');
  });

  it('mouth override moves the liquid surface and the spoon orbit', () => {
    const mouth = { cx: 128, cy: 90, rx: 88, ry: 20 };
    const scene = new FlatCookingScene({ seed: 2, mouth });
    expect(scene.mouth).toEqual(mouth);
    expect(scene.surfaceY).toBe(90);
    scene.drop('mint');
    runFor(scene, 3);
    // still lands and floats: phase is not stuck in dropping
    expect(scene.phase).not.toBe('dropping');
    expect(scene.recipe.length).toBe(1);
  });

  it('external progress sinks specks only as the host reports extraction', () => {
    const scene = new FlatCookingScene({ seed: 4 });
    scene.setExternalProgress(true);
    scene.setHeatLevel(1);
    scene.drop('chamomile');
    runFor(scene, 6); // boiling would normally dissolve everything
    expect(scene.phase).not.toBe('done');
    const floatingBefore = hexToRgb(scene.liquidHex);
    scene.setIngredientProgress('chamomile', 1);
    runFor(scene, 3);
    const after = hexToRgb(scene.liquidHex);
    // the liquid only takes the ingredient colour once the host sank the specks
    expect(after).not.toEqual(floatingBefore);
    expect(scene.done).toBe(false);
    scene.setDone(true);
    runFor(scene, 0.5);
    expect(scene.phase).toBe('done');
    scene.setBurnt(true);
    runFor(scene, 1);
    expect(collectIds(scene.render()).length).toBeGreaterThan(0);
  });

  function layerById(shape: { id?: string; children?: readonly unknown[] }, id: string): { id?: string; children?: readonly unknown[] } | null {
    if (shape.id === id) return shape;
    for (const c of shape.children ?? []) {
      const hit = layerById(c as { id?: string; children?: readonly unknown[] }, id);
      if (hit) return hit;
    }
    return null;
  }

  it('setBurnt clears done sparkles instead of leaving them frozen', () => {
    const scene = new FlatCookingScene({ seed: 2 });
    scene.setExternalProgress(true);
    scene.setHeatLevel(0);
    scene.setDone(true);
    runFor(scene, 0.5);
    expect(layerById(scene.render(), 'steam-and-sparkles')?.children?.length).toBeGreaterThan(0);
    expect(scene.sparkleCount).toBeGreaterThan(0);
    scene.setBurnt(true);
    expect(scene.sparkleCount).toBe(0);
    expect(layerById(scene.render(), 'steam-and-sparkles')).toBeNull();
  });

  it('turning done off lets leftover sparkles fade instead of freezing', () => {
    const scene = new FlatCookingScene({ seed: 2 });
    scene.setExternalProgress(true);
    scene.setHeatLevel(0);
    scene.setDone(true);
    runFor(scene, 0.25);
    expect(layerById(scene.render(), 'steam-and-sparkles')?.children?.length).toBeGreaterThan(0);
    scene.setDone(false);
    runFor(scene, 1);
    expect(layerById(scene.render(), 'steam-and-sparkles')).toBeNull();
  });

  it('squash getter follows the landing impact spring', () => {
    const scene = new FlatCookingScene(11);
    expect(scene.squash).toEqual({ x: 1, y: 1 });
    scene.drop('poppy');
    let moved = false;
    for (let t = 0; t < 3 && !moved; t += 1 / 60) {
      scene.update(1 / 60);
      if (Math.abs(scene.squash.y - 1) > 0.01) moved = true;
    }
    expect(moved).toBe(true);
  });
});

describe('flat SVG markup', () => {
  it('namespaces ids and clip references with the instance prefix', () => {
    const prefix = svgIdPrefix('«r1»');
    expect(prefix).toMatch(/^f[a-zA-Z0-9_-]*-$/);
    const markup = flatSvgMarkup(potShape(), 256, prefix, { vars: { '--liquid': '#123456' } });
    expect(markup).toContain(`id="${prefix}pot-front"`);
    expect(markup).not.toMatch(/ id="pot-/);
    expect(markup).toContain(`url(#${prefix}clip-0)`);
    expect(markup).toContain('--liquid:#123456');
  });

  it('ingredientIdleCss(prefix) targets the prefixed ids', () => {
    const css = ingredientIdleCss('abc-');
    expect(css).toContain('#abc-idle-bob');
    expect(css).toContain('#abc-idle-glint');
    expect(css).toContain('prefers-reduced-motion');
    expect(uniquifyIds('<g id="idle-bob"/>', 'abc-')).toBe('<g id="abc-idle-bob"/>');
  });
});

describe('hash routing', () => {
  it('empty route is the shop gate; #/classic stays classic; #/v2 opens the stored style', () => {
    expect(parseRoute('')).toEqual({ kind: 'gate' });
    expect(parseRoute('#/')).toEqual({ kind: 'gate' });
    expect(parseRoute('#/gate')).toEqual({ kind: 'gate' });
    expect(parseRoute('', 'pixel')).toEqual({ kind: 'gate' });
    expect(parseRoute('#/classic')).toEqual({ kind: 'classic' });
    expect(parseRoute('#/v2')).toEqual({ kind: 'v2', artStyle: 'flat' });
    expect(parseRoute('#/v2', 'pixel')).toEqual({ kind: 'v2', artStyle: 'pixel' });
    expect(parseRoute('#/v2/engraved')).toEqual({ kind: 'v2', artStyle: 'engraved' });
    expect(parseRoute('#/nonsense', 'pixel')).toEqual({ kind: 'classic' });
  });

  it('only explicit #/v2/<style> hashes are persisted', () => {
    expect(hashNamesStyle('#/v2/pixel')).toBe(true);
    expect(hashNamesStyle('#/v2')).toBe(false);
    expect(hashNamesStyle('')).toBe(false);
    expect(hashNamesStyle('#/classic')).toBe(false);
  });
});

describe('flat cauldron geometry', () => {
  it('spoon angle is measured around the mouth centre', () => {
    const { x, y, rx, ry } = FLAT_MOUTH_CENTER;
    expect(spoonAngleFor({ x: x + rx, y })).toBeCloseTo(0, 5);
    expect(spoonAngleFor({ x, y: y + ry })).toBeCloseTo(Math.PI / 2, 5);
    expect(spoonAngleFor({ x: x - rx, y })).toBeCloseTo(Math.PI, 5);
  });

  it('burnt liquid is darker and less saturated', () => {
    const [r, g, b] = burntLiquid([200, 40, 40]);
    expect(r).toBeLessThan(200);
    expect(r - g).toBeLessThan(160);
    expect(g).toBeGreaterThan(40 * 0.7 - 1);
    expect(b).toBeGreaterThan(0);
  });
});

describe('sync-works-flat --check', () => {
  const worksDir = process.env.KIMIAGAR_WORKS_DIR ?? resolve(__dirname, '..', '..', '..', '..', 'Kimiagar.Works');
  it.skipIf(!existsSync(worksDir))('kit/ matches Kimiagar.Works', () => {
    const script = resolve(__dirname, '..', '..', 'scripts', 'sync-works-flat.mjs');
    const out = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
    expect(out.stderr).toBe('');
    expect(out.status).toBe(0);
  });
});
