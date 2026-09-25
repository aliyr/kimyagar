import { describe, expect, it } from 'vitest';
import { ClassicBrewSim } from '../../src/scene/cauldron/ClassicBrewSim';
import { hexToRgb } from '../../src/art/flat/kit/color.ts';
import { WATER } from '../../src/art/flat/kit/palette.ts';
import type { MortarChip } from '../../src/scene/mortarPile';

function chip(partial: Partial<MortarChip> = {}): MortarChip {
  return {
    id: 1,
    x: 50,
    y: 70,
    w: 30,
    h: 40,
    rot: 10,
    crush: 0.2,
    delay: 0,
    nick: 0,
    seed: 1,
    kind: 'petal',
    sprite: 0,
    generation: 0,
    vx: 0,
    vy: 0,
    hop: 0,
    color: '#d4891c',
    ingredientId: 'saffron',
    ...partial,
  };
}

function drop(sim: ClassicBrewSim, pieces: MortarChip[], id = 'saffron', tint = '#d4891c') {
  sim.dropChips({
    ingredient: { id, tint, strength: 1, quantity: 1 },
    chips: pieces,
  });
}

describe('ClassicBrewSim', () => {
  it('spins the vortex up with the spoon and keeps coasting after release', () => {
    const sim = new ClassicBrewSim(3);
    drop(sim, [chip(), chip({ id: 2 })]);
    let angle = 0;
    sim.setSpoonFollow(angle);
    for (let i = 0; i < 90; i++) {
      angle += 0.12;
      sim.setSpoonFollow(angle);
      sim.update(1 / 60);
    }
    const spinning = Math.abs(sim.omega);
    expect(spinning).toBeGreaterThan(0.8);
    sim.setSpoonFollow(null);
    sim.update(0.2);
    expect(Math.abs(sim.omega)).toBeGreaterThan(spinning * 0.5);
    for (let i = 0; i < 8 * 60; i++) sim.update(1 / 60);
    expect(Math.abs(sim.omega)).toBeLessThan(spinning * 0.15);
  });

  it('pushes chips near the spoon harder than chips across the pot', () => {
    const sim = new ClassicBrewSim(5);
    drop(sim, [chip({ id: 1 }), chip({ id: 2 })]);
    sim.setSpoonFollow(0);
    for (let i = 0; i < 30; i++) sim.update(1 / 60);
    sim.chips[0].u = 0.55;
    sim.chips[0].v = 0;
    sim.chips[1].u = -0.55;
    sim.chips[1].v = 0;
    const ang = (u: number, v: number) => Math.atan2(v, u);
    const turn = (a: number, b: number) => {
      let d = a - b;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return Math.abs(d);
    };
    const near0 = ang(sim.chips[0].u, sim.chips[0].v);
    const far0 = ang(sim.chips[1].u, sim.chips[1].v);
    sim.setSpoonFollow(1.4);
    sim.update(1 / 60);
    const near = turn(ang(sim.chips[0].u, sim.chips[0].v), near0);
    const far = turn(ang(sim.chips[1].u, sim.chips[1].v), far0);
    expect(near).toBeGreaterThan(far + 0.02);
  });

  it('keeps mortar kind, color and crush, and marks fine dust as powder', () => {
    const sim = new ClassicBrewSim(1);
    drop(sim, [
      chip({ kind: 'thread', color: '#c0392b', crush: 0.4 }),
      chip({ id: 2, kind: 'dust', crush: 0.95, color: '#e0c85a' }),
    ]);
    expect(sim.chips[0]).toMatchObject({ kind: 'thread', color: '#c0392b', crush: 0.4, powder: false });
    expect(sim.chips[1].powder).toBe(true);
    expect(sim.chips.find((c) => c.crush >= 0.9)?.powder).toBe(true);
  });

  it('celebrates with sparkles when ready and clears them when burnt', () => {
    const sim = new ClassicBrewSim(9);
    drop(sim, [chip()]);
    sim.setHeatLevel(1);
    sim.setDone(true);
    for (let i = 0; i < 120; i++) sim.update(1 / 60);
    expect(sim.sparkleCount).toBeGreaterThanOrEqual(1);
    sim.setBurnt(true);
    sim.update(1 / 60);
    expect(sim.sparkleCount).toBe(0);
  });

  it('boils in three steps: warm, rim simmer, rolling splash', () => {
    const sim = new ClassicBrewSim(4);
    drop(sim, [chip()]);
    sim.setHeatLevel(0.4);
    for (let i = 0; i < 180; i++) sim.update(1 / 60);
    expect(sim.boilTier).toBe('warm');
    expect(sim.bubbles.length).toBe(0);

    sim.setHeatLevel(0.75);
    for (let i = 0; i < 180; i++) sim.update(1 / 60);
    expect(sim.boilTier).toBe('simmer');
    expect(sim.bubbles.length).toBeGreaterThan(0);
    expect(sim.bubbles.every((b) => Math.hypot(b.u, b.v) > 0.5)).toBe(true);

    sim.setHeatLevel(1);
    for (let i = 0; i < 180; i++) sim.update(1 / 60);
    expect(sim.boilTier).toBe('rolling');
    expect(sim.dome).toBeGreaterThan(0);
    expect(sim.drops.length + sim.bubbles.length).toBeGreaterThan(0);
  });

  it('shifts the liquid toward the ingredient tint as it extracts', () => {
    const sim = new ClassicBrewSim(2);
    const tint = '#d4891c';
    drop(sim, [chip({ color: tint })], 'saffron', tint);
    const before = sim.liquidHex;
    sim.setIngredientProgress('saffron', 1);
    for (let i = 0; i < 90; i++) sim.update(1 / 60);
    const water = hexToRgb(WATER);
    const target = hexToRgb(tint);
    const after = hexToRgb(sim.liquidHex);
    const dist = (a: readonly number[], b: readonly number[]) =>
      Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    expect(dist(after, target)).toBeLessThan(dist(hexToRgb(before), target));
    expect(dist(after, target)).toBeLessThan(dist(after, water));
  });
});
