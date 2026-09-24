import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  describeQuality,
  getQuality,
  reportFrameTime,
  setQualityTier,
  setReducedMotion,
  subscribeQuality,
} from '../../src/platform/quality';

describe('platform quality', () => {
  beforeEach(() => {
    setQualityTier('high');
    setReducedMotion(false);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setQualityTier('high');
    setReducedMotion(false);
    vi.restoreAllMocks();
  });

  it('exposes the fixed budgets per tier', () => {
    setQualityTier('high');
    expect(getQuality()).toMatchObject({
      tier: 'high',
      particleScale: 1,
      dprCap: 1.5,
      specular: true,
      liveShadow: true,
      reducedMotion: false,
    });

    setQualityTier('medium');
    expect(getQuality()).toMatchObject({
      tier: 'medium',
      particleScale: 0.6,
      dprCap: 1,
      specular: true,
      liveShadow: true,
    });

    setQualityTier('low');
    expect(getQuality()).toMatchObject({
      tier: 'low',
      particleScale: 0.3,
      dprCap: 0.75,
      specular: false,
      liveShadow: false,
    });
  });

  it('notifies subscribers on change and not on no-op', () => {
    const spy = vi.fn();
    const unsub = subscribeQuality(spy);

    setQualityTier('medium');
    expect(spy).toHaveBeenCalledTimes(1);

    setQualityTier('medium');
    expect(spy).toHaveBeenCalledTimes(1);

    setReducedMotion(true);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(getQuality().reducedMotion).toBe(true);

    setReducedMotion(true);
    expect(spy).toHaveBeenCalledTimes(2);

    unsub();
    setQualityTier('low');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('drops a tier after slow frames and climbs back after cooldown', () => {
    setQualityTier('high');
    const spy = vi.fn();
    subscribeQuality(spy);

    let fakeNow = 1_000;
    vi.spyOn(performance, 'now').mockImplementation(() => fakeNow);

    for (let i = 0; i < 90; i++) reportFrameTime(30);
    expect(getQuality().tier).toBe('medium');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(describeQuality()).toBe('medium (auto)');

    // Still in cooldown — ignore further samples
    for (let i = 0; i < 90; i++) reportFrameTime(5);
    expect(getQuality().tier).toBe('medium');
    expect(spy).toHaveBeenCalledTimes(1);

    fakeNow += 1_500;
    for (let i = 0; i < 90; i++) reportFrameTime(5);
    expect(getQuality().tier).toBe('high');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('toggles the reducedMotion flag', () => {
    expect(getQuality().reducedMotion).toBe(false);
    setReducedMotion(true);
    expect(getQuality().reducedMotion).toBe(true);
    setReducedMotion(false);
    expect(getQuality().reducedMotion).toBe(false);
  });
});
