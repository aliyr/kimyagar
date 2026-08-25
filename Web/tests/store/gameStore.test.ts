import { beforeEach, describe, expect, it } from 'vitest';
import * as engine from '../../src/engine';
import { MAX_MORTAR_UNITS, useGameStore } from '../../src/store/gameStore';

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
