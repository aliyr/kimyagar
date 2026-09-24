import { beforeEach, describe, expect, it } from 'vitest';
import { loadDefinitions } from '../../src/data';
import {
  BOWL_MORTAR,
  chipInsideBowl,
  clearResidue,
  generationCapForWork,
  getMortarChips,
  getPestleAim,
  getResidue,
  handleTipY,
  pestleInFront,
  kindForIngredient,
  setPestleMode,
  spriteCount,
  strikeProfile,
  subscribeStrike,
  tickMortarVisuals,
  scoopRest,
  scoopUnderSpoon,
  syncMortarMix,
  syncMortarPile,
  type PieceKind,
  type StrikeEvent,
} from '../../src/scene/mortarPile';
import { SCENE_ZONES } from '../../src/scene/artManifest';

/** مرز فازها — همان ثابت‌های mortarPile (PH_LIFT_END / PH_FALL_END / PH_PRESS_END) */
const PH_LIFT_END = 0.42;
const PH_FALL_END = 0.56;
const PH_PRESS_END = 0.78;

const PIECE_KINDS = ['thread', 'seed', 'petal', 'flower', 'leaf', 'root', 'star'] as const;

describe('classic mortar pile', () => {
  beforeEach(() => {
    syncMortarPile(null, 1, 0);
    clearResidue();
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

  it('پروفایل ضربه: خیز، برخورد و پیچش در فازهای درست', () => {
    const samples: { phase: number; lift: number; impact: number; twist: number }[] = [];
    for (let i = 0; i < 100; i++) {
      const phase = i / 100;
      const p = strikeProfile(phase);
      expect(p.lift).toBeGreaterThanOrEqual(0);
      expect(p.lift).toBeLessThanOrEqual(1);
      expect(p.impact).toBeGreaterThanOrEqual(0);
      expect(p.impact).toBeLessThanOrEqual(1);
      expect(Math.abs(p.twist)).toBeLessThanOrEqual(6);
      samples.push({ phase, ...p });
    }

    const at0 = strikeProfile(0);
    expect(at0.lift).toBeLessThan(0.05);
    expect(at0.impact).toBe(0);
    expect(at0.twist).toBe(0);

    // پایان پنجرهٔ خیز ≈ اوج lift
    const atLiftEnd = strikeProfile(PH_LIFT_END - 0.001);
    expect(atLiftEnd.lift).toBeGreaterThan(0.95);
    expect(atLiftEnd.impact).toBe(0);
    expect(atLiftEnd.twist).toBe(0);

    // پایان سقوط: lift≈0؛ شروع فشار: impact بالا
    const atFallEnd = strikeProfile(PH_FALL_END);
    expect(atFallEnd.lift).toBeLessThan(0.05);
    expect(atFallEnd.impact).toBeGreaterThan(0.5);
    expect(atFallEnd.twist).toBe(0);

    // در بقیهٔ فشار/رهاسازی lift صفر می‌ماند
    for (const s of samples) {
      if (s.phase >= PH_FALL_END) expect(s.lift).toBe(0);
      if (s.phase < PH_LIFT_END) {
        expect(s.impact).toBe(0);
        expect(s.twist).toBe(0);
      }
      if (s.phase >= PH_LIFT_END && s.phase < PH_FALL_END) {
        expect(s.twist).toBe(0);
      }
    }

    // پیچش فقط در فاز فشار غیرصفر است
    const pressTwist = samples.filter(
      (s) => s.phase >= PH_FALL_END && s.phase < PH_PRESS_END && Math.abs(s.twist) > 0.01,
    );
    expect(pressTwist.length).toBeGreaterThan(0);
    for (const s of samples) {
      if (s.phase < PH_FALL_END || s.phase >= PH_PRESS_END) expect(s.twist).toBe(0);
    }

    // impact در پایان چرخه به صفر نزدیک می‌شود
    expect(strikeProfile(0.99).impact).toBeLessThan(0.15);
    expect(strikeProfile(1).impact).toBe(0);
  });

  it('هدف کوبه: فریم و مقادیر در حالت grind و lean', () => {
    syncMortarPile('mint:1', 1, 0);
    setPestleMode('grind');
    const grind = getPestleAim();
    expect(grind.mode).toBe('grind');
    expect(Number.isInteger(grind.frame)).toBe(true);
    expect(grind.frame).toBeGreaterThanOrEqual(1);
    expect(grind.frame).toBeLessThanOrEqual(6);
    expect(grind.impact).toBeGreaterThanOrEqual(0);
    expect(grind.impact).toBeLessThanOrEqual(1);
    expect(grind.lift).toBeGreaterThanOrEqual(0);
    expect(grind.lift).toBeLessThanOrEqual(1);

    syncMortarPile(null, 1, 0);
    const lean = getPestleAim();
    expect(lean.mode).toBe('lean');
    expect(Number.isInteger(lean.frame)).toBe(true);
    expect(lean.frame).toBeGreaterThanOrEqual(1);
    expect(lean.frame).toBeLessThanOrEqual(6);
    expect(lean.impact).toBe(0);
  });

  it('subscribeStrike: هنگام کوبش حداقل یک ضربه می‌آید و unsubscribe قطع می‌کند', () => {
    syncMortarPile('chamomile:1', 1, 0.4);
    setPestleMode('grind');

    const events: StrikeEvent[] = [];
    const unsub = subscribeStrike((e) => {
      events.push(e);
    });

    for (let i = 0; i < 200; i++) tickMortarVisuals(0.016);

    expect(events.length).toBeGreaterThan(0);
    const e = events[0];
    expect(Number.isFinite(e.x)).toBe(true);
    expect(Number.isFinite(e.y)).toBe(true);
    expect(e.hits).toBeGreaterThanOrEqual(0);
    expect(e.fineness).toBeGreaterThanOrEqual(0);
    expect(e.fineness).toBeLessThanOrEqual(1);
    expect(Array.isArray(e.colors)).toBe(true);

    const countBefore = events.length;
    unsub();
    for (let i = 0; i < 200; i++) tickMortarVisuals(0.016);
    expect(events.length).toBe(countBefore);
  });

  it('رد پودر: scoopRest رد می‌گذارد و clearResidue پاک می‌کند', () => {
    // رنگ فقط از طریق mix روی تکه‌ها می‌نشیند؛ بدون رنگ residue ساخته نمی‌شود
    syncMortarMix('saffron:1', [
      { ingredientId: 'saffron', quantity: 1, grindWork: 3.6, color: '#c23b12' },
    ]);
    expect(getMortarChips().length).toBeGreaterThan(0);
    const taken = scoopRest();
    expect(taken.length).toBeGreaterThan(0);

    const res = getResidue();
    expect(res).not.toBeNull();
    expect(res!.amount).toBeGreaterThan(0);
    expect(res!.color).toMatch(/^(#|rgb)/i);

    clearResidue();
    expect(getResidue()).toBeNull();

    // syncMortarPile(null) در سورس residue را پاک نمی‌کند — آن ادعا را نمی‌نویسیم
  });

  it('kindForIngredient و spriteCount برای همهٔ مواد و گونه‌ها', () => {
    const { ingredients } = loadDefinitions();
    for (const ing of ingredients) {
      const kind = kindForIngredient(ing.id);
      expect(PIECE_KINDS).toContain(kind);
    }
    for (const kind of PIECE_KINDS) {
      expect(spriteCount(kind)).toBeGreaterThanOrEqual(1);
    }
    // گرد اسپرایت جدا ندارد (سورس ۰ برمی‌گرداند)
    expect(spriteCount('dust' as PieceKind)).toBe(0);
  });
});
