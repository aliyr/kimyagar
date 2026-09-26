import { describe, expect, it } from 'vitest';
import {
  angleDelta,
  applyDeadzone,
  clampUnit,
  depthTransform,
  pointerTilt,
  projectMid,
  rigTransform,
  screenTilt,
  tiltModeFor,
  unprojectMid,
  unprojectWork,
} from '../../src/scene/tilt/tiltMath';

describe('tilt engine modes', () => {
  it('maps quality tier to mode, with reduced motion and the session latch forcing off', () => {
    expect(tiltModeFor('high', false, false)).toBe('full');
    expect(tiltModeFor('medium', false, false)).toBe('lite');
    expect(tiltModeFor('low', false, false)).toBe('flat');
    expect(tiltModeFor('high', true, false)).toBe('off');
    expect(tiltModeFor('medium', false, true)).toBe('off');
  });

  it('keeps the 3D rotation in full and lite, drops it in flat, and clears in off', () => {
    const pose = { px: 0.5, py: -1 };
    expect(rigTransform(pose, 'full')).toBe('scale(1.06) rotateX(2deg) rotateY(1.1deg)');
    expect(rigTransform(pose, 'lite')).toBe(rigTransform(pose, 'full'));
    expect(rigTransform(pose, 'flat')).toBe('scale(1.06)');
    expect(rigTransform(pose, 'off')).toBe('');
    expect(rigTransform({ px: 0, py: 0 }, 'full')).toBe('scale(1.06) rotateX(0deg) rotateY(0deg)');
  });

  it('translates depth layers by their depth in every mode but off', () => {
    const pose = { px: 0.25, py: -0.5 };
    expect(depthTransform(pose, 36, 'full')).toBe('translate3d(9px, -18px, 0)');
    expect(depthTransform(pose, 36, 'flat')).toBe('translate3d(9px, -18px, 0)');
    expect(depthTransform(pose, 36, 'off')).toBe('');
    expect(depthTransform({ px: 1 / 3, py: 0 }, 2, 'lite')).toBe('translate3d(0.667px, 0px, 0)');
  });
});

describe('screenTilt', () => {
  it('unwraps angle deltas across the ±180 / ±90 seams', () => {
    expect(angleDelta(178, -178, 360)).toBe(-4);
    expect(angleDelta(-178, 178, 360)).toBe(4);
    expect(angleDelta(88, -88, 180)).toBe(-4);
    expect(angleDelta(10, 4, 360)).toBe(6);
  });

  it('ignores tremor inside the deadzone and eases past it', () => {
    expect(applyDeadzone(1.2)).toBe(0);
    expect(applyDeadzone(-1.5)).toBe(0);
    expect(applyDeadzone(3.5)).toBeCloseTo(2);
    expect(applyDeadzone(-4)).toBeCloseTo(-2.5);
  });

  it('maps portrait gamma to x and beta to y', () => {
    const pose = screenTilt(10, 6, 0, 0, 0);
    expect(pose.px).toBeCloseTo(4.5 / 18);
    expect(pose.py).toBeCloseTo(8.5 / 18);
  });

  it('swaps axes for landscape orientations', () => {
    const right = screenTilt(0, 0, 0, 6, 90);
    expect(right.px).toBe(0);
    expect(right.py).toBeCloseTo(4.5 / 18);

    const left = screenTilt(8, 0, 0, 0, 270);
    expect(left.px).toBeCloseTo(-6.5 / 18);
    expect(left.py).toBe(0);

    const upside = screenTilt(0, 8, 0, 0, 180);
    expect(upside.px).toBeCloseTo(-6.5 / 18);
    expect(upside.py).toBe(0);
  });

  it('normalizes negative orientation angles and clamps to ±1', () => {
    const pose = screenTilt(0, 40, 0, 0, -90);
    expect(pose.px).toBe(0);
    expect(pose.py).toBe(1);
    expect(clampUnit(4)).toBe(1);
    expect(clampUnit(-2)).toBe(-1);
  });
});

describe('pointerTilt', () => {
  it('is zero at the center and ±1 at the edges', () => {
    expect(pointerTilt(960, 540, 1920, 1080)).toEqual({ px: 0, py: 0 });
    expect(pointerTilt(0, 0, 1920, 1080)).toEqual({ px: -1, py: -1 });
    expect(pointerTilt(1920, 1080, 1920, 1080)).toEqual({ px: 1, py: 1 });
  });
});

describe('unprojectWork', () => {
  it('shifts the work plane by only two scene pixels at full tilt', () => {
    expect(unprojectWork({ px: 1, py: -1 }, 400, 700)).toEqual({ x: 398, y: 702 });
    expect(unprojectWork({ px: 0, py: 0 }, 400, 700)).toEqual({ x: 400, y: 700 });
  });
});

describe('unprojectMid', () => {
  it('round-trips the mid layer through perspective, rotation and depth shift', () => {
    const samples = [
      { pose: { px: 0, py: 0 }, u: 100, v: 80 },
      { pose: { px: 0, py: 0 }, u: 1600, v: 900 },
      { pose: { px: 0.85, py: -0.4 }, u: 400, v: 700 },
      { pose: { px: -1, py: 1 }, u: 960, v: 540 },
      { pose: { px: 0.3, py: 0.7 }, u: 1200, v: 200 },
    ];
    for (const { pose, u, v } of samples) {
      const screen = projectMid(pose, u, v);
      const back = unprojectMid(pose, screen.x, screen.y);
      expect(back.x).toBeCloseTo(u, 4);
      expect(back.y).toBeCloseTo(v, 4);
    }
  });
});
