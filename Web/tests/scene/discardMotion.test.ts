import { describe, expect, it } from 'vitest';
import {
  BLOB_POINTS,
  blobPoint,
  buildDiscardScene,
  DISCARD,
  DISCARD_RECT,
  dripLength,
  dripPoint,
  gobPosition,
  mouthCenter,
  mouthLiquid,
  POT_RADIUS,
  POT_REST,
  potHalfHeight,
  potPose,
  SHELF_BOTTOM,
  splatAlpha,
  splatDryness,
  WALL_RECT,
} from '../../src/scene/cauldron/discardMotion';
import { SCENE_ZONES } from '../../src/scene/artManifest';

describe('discard motion (bucket ⇒ pot thrown at the back wall)', () => {
  it('starts at rest on the stove and reaches the wall smaller and tumbled', () => {
    const start = potPose(0);
    expect(start).toMatchObject({ x: POT_REST.x, y: POT_REST.y, scale: 1, rot: 0, dark: 0, visible: true });

    const hit = potPose(DISCARD.potHit);
    expect(hit.x).toBeCloseTo(DISCARD.impact.x, 3);
    expect(hit.y).toBeCloseTo(DISCARD.impact.y, 3);
    expect(hit.scale).toBeCloseTo(DISCARD.impactScale, 3);
    expect(Math.abs(hit.rot)).toBeGreaterThan(Math.PI / 2);
    expect(hit.visible).toBe(true);
    expect(hit.dark).toBe(0);
  });

  it('moves fast at launch and slows as it recedes', () => {
    const a = potPose(0.05);
    const b = potPose(0.1);
    const late1 = potPose(0.4);
    const late2 = potPose(0.45);
    const early = Math.hypot(b.x - a.x, b.y - a.y);
    const late = Math.hypot(late2.x - late1.x, late2.y - late1.y);
    expect(early).toBeGreaterThan(late);
  });

  it('passes under the shelf board all the way to the wall', () => {
    for (let t = 0; t <= DISCARD.potHit + DISCARD.bounceDur; t += 0.005) {
      const p = potPose(t);
      expect(p.y - potHalfHeight(p)).toBeGreaterThan(SHELF_BOTTOM);
    }
    // مدل «شعاع» برای پنهان‌شدن پشت میز، محافظه‌کارانه‌تر از نیم‌بلندی است
    expect(POT_RADIUS).toBeGreaterThanOrEqual(potHalfHeight(potPose(DISCARD.potHit)) / DISCARD.impactScale);
    // نقطه‌ی برخورد روی نوارِ دیوار بین قفسه و لبه‌ی میز
    expect(DISCARD.impact.y).toBeGreaterThan(SHELF_BOTTOM);
    expect(DISCARD.impact.y).toBeLessThan(DISCARD.wallBottom);
  });

  it('bounces off, then falls behind the table and vanishes below its back edge, darkening', () => {
    const afterBounce = potPose(DISCARD.potHit + DISCARD.bounceDur);
    expect(afterBounce.y).toBeGreaterThan(DISCARD.impact.y);
    expect(afterBounce.scale).toBeGreaterThan(DISCARD.impactScale);

    const falling = potPose(DISCARD.potHit + DISCARD.bounceDur + 0.2);
    expect(falling.y).toBeGreaterThan(afterBounce.y);
    expect(falling.dark).toBeGreaterThan(0.5);
    expect(DISCARD.wallBottom).toBe(SCENE_ZONES.workTable.y);

    const gone = potPose(DISCARD.thudAt);
    expect(gone.visible).toBe(false);
    expect(gone.dark).toBe(1);
    // پیش از فرمان دیگ نو، دیگ کهنه کاملاً رفته است
    expect(DISCARD.respawnAt).toBeGreaterThan(DISCARD.thudAt);
  });

  it('keeps the wall splat for a few seconds while it dries, then fades it before the effect ends', () => {
    expect(splatAlpha(DISCARD.gobsHit - 0.01)).toBe(0);
    expect(splatAlpha(DISCARD.gobsHit + 0.01)).toBe(1);
    expect(splatAlpha(DISCARD.gobsHit + DISCARD.splatHold - 0.01)).toBe(1);
    expect(DISCARD.splatHold).toBeGreaterThanOrEqual(2.5);
    const mid = splatAlpha(DISCARD.gobsHit + DISCARD.splatHold + DISCARD.splatFade / 2);
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
    expect(splatAlpha(DISCARD.gobsHit + DISCARD.splatHold + DISCARD.splatFade)).toBeLessThan(1e-9);
    expect(splatAlpha(DISCARD.end)).toBe(0);
    expect(DISCARD.end).toBeGreaterThanOrEqual(DISCARD.gobsHit + DISCARD.splatHold + DISCARD.splatFade);

    expect(splatDryness(DISCARD.gobsHit)).toBe(0);
    expect(splatDryness(DISCARD.gobsHit + 1)).toBeGreaterThan(0.1);
    expect(splatDryness(DISCARD.gobsHit + 1)).toBeLessThan(splatDryness(DISCARD.gobsHit + 2));
    expect(splatDryness(DISCARD.end)).toBe(1);
  });

  it('empties the mouth as the contents leave, and the gobs fly from the mouth to the wall under the shelf', () => {
    expect(mouthLiquid(0)).toBe(1);
    expect(mouthLiquid(DISCARD.gobsLeave + 0.2)).toBe(0);

    const scene = buildDiscardScene(3);
    expect(scene.gobs.length).toBeGreaterThan(8);
    for (const g of scene.gobs) {
      expect(g.leave).toBeGreaterThanOrEqual(DISCARD.gobsLeave);
      expect(g.hit).toBeLessThan(DISCARD.potHit);
      const from = mouthCenter(potPose(g.leave));
      expect(Math.hypot(g.fx - from.x, g.fy - from.y)).toBeLessThan(40);
      expect(gobPosition(g, g.leave - 0.01)).toBeNull();
      expect(gobPosition(g, g.hit)).toBeNull();
      const near = gobPosition(g, g.hit - 0.001);
      expect(near).not.toBeNull();
      expect(Math.abs(near!.x - g.tx)).toBeLessThan(2);
      expect(Math.abs(near!.y - g.ty)).toBeLessThan(2);
      // فرود روی نوارِ دیوار زیر قفسه، بالای لبه‌ی میز، داخل Canvas لکه
      expect(g.ty - g.r).toBeGreaterThan(SHELF_BOTTOM);
      expect(g.ty).toBeLessThan(DISCARD.wallBottom);
      expect(g.tx).toBeGreaterThan(WALL_RECT.x);
      expect(g.tx).toBeLessThan(WALL_RECT.x + WALL_RECT.width);
      // در کل پرواز زیر تخته‌ی قفسه می‌ماند
      for (let t = g.leave; t < g.hit; t += 0.01) {
        const p = gobPosition(g, t)!;
        expect(p.y - g.r).toBeGreaterThan(SHELF_BOTTOM);
      }
    }
  });

  it('builds an irregular, lobed stain whose parts all sit on the wall strip', () => {
    const scene = buildDiscardScene(5);
    expect(scene.blobs.length).toBeGreaterThan(10);
    expect(scene.tendrils.length).toBeGreaterThan(4);
    expect(scene.spatter.length).toBeGreaterThan(10);
    for (const b of scene.blobs) {
      expect(b.lobes).toHaveLength(BLOB_POINTS);
      const spread = Math.max(...b.lobes) - Math.min(...b.lobes);
      expect(spread).toBeGreaterThan(0.1);
      const p = blobPoint(b, 0, 1);
      expect(Math.hypot(p.x - b.x, p.y - b.y)).toBeCloseTo(b.rx * b.lobes[0], 6);
      // رشد جزئی ⇒ نقطه نزدیک‌تر به مرکز
      const q = blobPoint(b, 0, 0.5);
      expect(Math.hypot(q.x - b.x, q.y - b.y)).toBeLessThan(Math.hypot(p.x - b.x, p.y - b.y));
    }
    for (const s of scene.spatter) {
      expect(s.y).toBeGreaterThan(SHELF_BOTTOM);
      expect(s.stretch).toBeGreaterThanOrEqual(1);
    }
    for (const td of scene.tendrils) {
      expect(td.y).toBeGreaterThan(SHELF_BOTTOM);
      expect(td.len).toBeGreaterThan(0);
    }
  });

  it('is deterministic per seed; drips run downward, wobble and approach their cap', () => {
    const a = buildDiscardScene(11);
    const b = buildDiscardScene(11);
    const c = buildDiscardScene(12);
    expect(a).toEqual(b);
    expect(a.drips.map((d) => d.x)).not.toEqual(c.drips.map((d) => d.x));

    const drip = a.drips[0];
    expect(dripLength(drip, drip.delay - 0.01)).toBe(0);
    const l1 = dripLength(drip, drip.delay + 0.5);
    const l2 = dripLength(drip, drip.delay + 1.5);
    const l3 = dripLength(drip, drip.delay + 20);
    expect(l1).toBeGreaterThan(0);
    expect(l2).toBeGreaterThan(l1);
    expect(l3).toBeLessThanOrEqual(drip.maxLen);
    expect(l3).toBeGreaterThan(drip.maxLen * 0.99);

    const top = dripPoint(drip, 0);
    const bottom = dripPoint(drip, drip.maxLen);
    expect(top.x).toBe(drip.x);
    expect(bottom.y).toBeGreaterThan(top.y);
    const xs = Array.from({ length: 12 }, (_, i) => dripPoint(drip, (i / 11) * drip.maxLen).x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(drip.wobble * 2 + 1e-9);
  });

  it('keeps the whole flight inside the pot canvas', () => {
    for (let t = 0; t <= DISCARD.thudAt; t += 0.02) {
      const p = potPose(t);
      if (!p.visible) continue;
      expect(p.x).toBeGreaterThan(DISCARD_RECT.x);
      expect(p.x).toBeLessThan(DISCARD_RECT.x + DISCARD_RECT.width);
      expect(p.y - 250 * p.scale).toBeGreaterThan(DISCARD_RECT.y);
    }
  });
});
