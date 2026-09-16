import { beforeEach, describe, expect, it } from 'vitest';
import * as engine from '../../src/engine';
import {
  GRIND_RATE,
  GRIND_THRESHOLDS,
  MAX_MORTAR_UNITS,
  MORTAR_GRIND_SECONDS,
  useGameStore,
} from '../../src/store/gameStore';

const CHAMOMILE = 'chamomile';
const MINT = 'mint';

function resetStore() {
  useGameStore.setState({
    brew: engine.createBrew(),
    mortar: null,
    result: null,
    evaluation: null,
    openOverlay: null,
    lastRecipe: null,
    discoveryQueue: [],
    usedIngredientIds: [],
    cabinetOpen: false,
    inspectedIngredientId: null,
  });
}

describe('addUnitToMortar', () => {
  beforeEach(() => {
    resetStore();
  });

  it('empty mortar → 1 unit of the dropped ingredient', () => {
    expect(useGameStore.getState().mortar).toBeNull();
    useGameStore.getState().addUnitToMortar(CHAMOMILE);
    expect(useGameStore.getState().mortar).toEqual({
      ingredientId: CHAMOMILE,
      quantity: 1,
      grindState: null,
      grindWork: 0,
      grinding: false,
    });
  });

  it('same id increments 1 → 2 → 3', () => {
    const { addUnitToMortar } = useGameStore.getState();
    addUnitToMortar(CHAMOMILE);
    expect(useGameStore.getState().mortar?.quantity).toBe(1);
    addUnitToMortar(CHAMOMILE);
    expect(useGameStore.getState().mortar?.quantity).toBe(2);
    addUnitToMortar(CHAMOMILE);
    expect(useGameStore.getState().mortar?.quantity).toBe(3);
    expect(useGameStore.getState().mortar?.quantity).toBe(MAX_MORTAR_UNITS);
  });

  it('4th call is a no-op (stays at 3)', () => {
    const { addUnitToMortar } = useGameStore.getState();
    addUnitToMortar(CHAMOMILE);
    addUnitToMortar(CHAMOMILE);
    addUnitToMortar(CHAMOMILE);
    useGameStore.getState().applyGrindWork(2);
    const before = useGameStore.getState().mortar;
    addUnitToMortar(CHAMOMILE);
    expect(useGameStore.getState().mortar).toEqual(before);
    expect(useGameStore.getState().mortar?.quantity).toBe(3);
  });

  it('different id replaces with 1 unit', () => {
    const { addUnitToMortar } = useGameStore.getState();
    addUnitToMortar(CHAMOMILE);
    addUnitToMortar(CHAMOMILE);
    expect(useGameStore.getState().mortar?.quantity).toBe(2);
    addUnitToMortar(MINT);
    expect(useGameStore.getState().mortar).toEqual({
      ingredientId: MINT,
      quantity: 1,
      grindState: null,
      grindWork: 0,
      grinding: false,
    });
  });

  it('each added unit resets grindState and grindWork', () => {
    const { addUnitToMortar, applyGrindWork } = useGameStore.getState();
    addUnitToMortar(CHAMOMILE);
    applyGrindWork(4);
    expect(useGameStore.getState().mortar?.grindWork).toBeGreaterThan(0);
    expect(useGameStore.getState().mortar?.grindState).not.toBeNull();

    addUnitToMortar(CHAMOMILE);
    expect(useGameStore.getState().mortar).toMatchObject({
      quantity: 2,
      grindState: null,
      grindWork: 0,
    });
  });
});

describe('auto grinding (classic click flow)', () => {
  beforeEach(() => {
    resetStore();
  });

  function tickFor(seconds: number, dt = 1 / 30) {
    for (let t = 0; t < seconds - 1e-9; t += dt) useGameStore.getState().tick(dt);
  }

  it('startGrinding + tick reaches coarse, crushed and fine at the planned times', () => {
    const { addUnitToMortar, startGrinding } = useGameStore.getState();
    addUnitToMortar(CHAMOMILE);
    startGrinding();
    expect(useGameStore.getState().mortar?.grinding).toBe(true);
    const [coarse, crushed, fine] = GRIND_THRESHOLDS;
    tickFor(coarse.work / GRIND_RATE + 0.1);
    expect(useGameStore.getState().mortar?.grindState).toBe(coarse.state);
    tickFor(crushed.work / GRIND_RATE - coarse.work / GRIND_RATE);
    expect(useGameStore.getState().mortar?.grindState).toBe(crushed.state);
    tickFor(MORTAR_GRIND_SECONDS);
    const m = useGameStore.getState().mortar;
    expect(m?.grindState).toBe(fine.state);
    expect(m?.grindWork).toBeCloseTo(fine.work, 6);
    // at the cap the auto grind stops by itself and the material waits for a tap
    expect(m?.grinding).toBe(false);
  });

  it('does not grind while an overlay pauses the game', () => {
    const { addUnitToMortar, startGrinding, openOverlayAction } = useGameStore.getState();
    addUnitToMortar(MINT);
    startGrinding();
    openOverlayAction('notebook');
    tickFor(3);
    expect(useGameStore.getState().mortar?.grindWork).toBe(0);
    useGameStore.getState().closeOverlay();
    tickFor(3);
    expect(useGameStore.getState().mortar?.grindWork).toBeGreaterThan(0);
  });

  it('transferMortar clamps an early tap to coarse and stops grinding', () => {
    const { addUnitToMortar, startGrinding, transferMortar } = useGameStore.getState();
    addUnitToMortar(MINT);
    startGrinding();
    tickFor(0.5);
    expect(useGameStore.getState().mortar?.grindState).toBeNull();
    expect(transferMortar()).toBe(true);
    const m = useGameStore.getState().mortar;
    expect(m?.grindState).toBe('coarse');
    expect(m?.grinding).toBe(false);
    // and the locked mortar can go straight into the cauldron
    useGameStore.getState().addMortarToCauldron();
    expect(useGameStore.getState().brew.entries[0]?.grindState).toBe('coarse');
    expect(useGameStore.getState().mortar).toBeNull();
  });

  it('transferMortar is a no-op on an empty mortar', () => {
    expect(useGameStore.getState().transferMortar()).toBe(false);
  });

  it('adding a unit mid-grind restarts the work but keeps grinding', () => {
    const { addUnitToMortar, startGrinding } = useGameStore.getState();
    addUnitToMortar(MINT);
    startGrinding();
    tickFor(2.5);
    expect(useGameStore.getState().mortar?.grindWork).toBeGreaterThan(0);
    addUnitToMortar(MINT);
    expect(useGameStore.getState().mortar).toMatchObject({ quantity: 2, grindWork: 0, grinding: true });
  });
});

describe('addMortarToCauldron with quantity 3', () => {
  beforeEach(() => {
    resetStore();
  });

  it('produces a brew entry with quantity 3', () => {
    const { addUnitToMortar, applyGrindWork, addMortarToCauldron } = useGameStore.getState();
    addUnitToMortar(CHAMOMILE);
    addUnitToMortar(CHAMOMILE);
    addUnitToMortar(CHAMOMILE);
    applyGrindWork(4);
    expect(useGameStore.getState().mortar?.quantity).toBe(3);
    expect(useGameStore.getState().mortar?.grindState).not.toBeNull();

    addMortarToCauldron();
    const entries = useGameStore.getState().brew.entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]?.quantity).toBe(3);
    expect(entries[0]?.ingredientId).toBe(CHAMOMILE);
    expect(useGameStore.getState().mortar).toBeNull();
  });
});
