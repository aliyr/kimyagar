import { describe, expect, it } from 'vitest';
import { ParticleSystem, particleAlpha, particleSize } from '../../src/scene/mortarParticles';

describe('mortar particles', () => {
  it('replays identical positions for the same seed after step', () => {
    const a = new ParticleSystem(42);
    const b = new ParticleSystem(42);
    a.emitStrikeDust(100, 200, ['#c4a15a'], 0.4, { scale: 1 });
    b.emitStrikeDust(100, 200, ['#c4a15a'], 0.4, { scale: 1 });
    a.step(1 / 60);
    b.step(1 / 60);
    expect(a.particles.map((p) => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy }))).toEqual(
      b.particles.map((p) => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy })),
    );
  });

  it('emits more, higher-drag dust at fineness 1 than at 0; scale 0 emits nothing', () => {
    const fine = new ParticleSystem(7);
    const coarse = new ParticleSystem(7);
    fine.emitStrikeDust(50, 50, ['#abc'], 1, { scale: 1 });
    coarse.emitStrikeDust(50, 50, ['#abc'], 0, { scale: 1 });
    expect(fine.particles.length).toBeGreaterThan(coarse.particles.length);
    expect(fine.particles.every((p) => p.drag > coarse.particles[0]!.drag)).toBe(true);

    const none = new ParticleSystem(7);
    none.emitStrikeDust(50, 50, ['#abc'], 1, { scale: 0 });
    expect(none.particles).toHaveLength(0);
  });

  it('stops spill particles at floorY and marks bounced', () => {
    const sys = new ParticleSystem(3);
    const floorY = 400;
    sys.emitSpill(200, 100, floorY, ['#c4a15a'], { scale: 1 });
    expect(sys.particles.length).toBeGreaterThan(0);

    let bounced = false;
    for (let i = 0; i < 90 && !bounced; i++) {
      sys.step(1 / 60);
      bounced = sys.particles.some((p) => p.bounced === true);
    }
    expect(bounced).toBe(true);
    expect(sys.particles.length).toBeGreaterThan(0);
    for (const p of sys.particles.filter((p) => p.bounced)) {
      expect(p.y).toBeLessThanOrEqual(floorY + 0.001);
    }
  });

  it('removes particles once life reaches ttl', () => {
    const sys = new ParticleSystem(11);
    sys.emitStrikeDust(0, 0, ['#fff'], 0.5, { scale: 1 });
    const ttl = Math.min(...sys.particles.map((p) => p.ttl));
    sys.step(ttl + 0.01);
    expect(sys.particles.every((p) => p.life < p.ttl)).toBe(true);
    // Advance far past every particle's life
    for (let i = 0; i < 200; i++) sys.step(0.1);
    expect(sys.particles).toHaveLength(0);
  });

  it('particleAlpha is 0 at end of life for dust', () => {
    const sys = new ParticleSystem(5);
    sys.emitStrikeDust(0, 0, ['#fff'], 0.2, { scale: 1 });
    const p = sys.particles[0]!;
    p.life = p.ttl;
    expect(particleAlpha(p)).toBe(0);
    expect(particleSize(p)).toBeGreaterThan(0);
  });
});
