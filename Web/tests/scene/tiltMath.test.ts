import { describe, expect, it } from 'vitest';
import {
  angleDelta,
  applyDeadzone,
  clampUnit,
  pointerTilt,
  projectMid,
  screenTilt,
  unprojectMid,
  unprojectWork,
} from '../../src/scene/tilt/tiltMath';

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
