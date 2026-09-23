import { describe, expect, it } from 'vitest';
import {
  MAX_SCORE_HISTORY,
  PROGRESS_VERSION,
  emptyProgress,
  hasProgress,
  parseProgress,
  serializeProgress,
  withScore,
} from '../../src/store/progressStore';
import { useGameStore } from '../../src/store/gameStore';
import { useProgressStore } from '../../src/store/progressStore';

describe('progress serialize / parse', () => {
  it('round-trips a full record', () => {
    const p = withScore(
      { ...emptyProgress(), customerIndex: 3, discoveredTagIds: ['restful'], usedIngredientIds: ['mint'] as never },
      { customerId: 'c1', score: 72, band: 'good', at: 1000 },
    );
    const back = parseProgress(serializeProgress(p));
    expect(back).toEqual({ ...p, version: PROGRESS_VERSION });
    expect(hasProgress(back)).toBe(true);
  });

  it('falls back to empty on garbage and on unknown newer versions', () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress('not json')).toEqual(emptyProgress());
    expect(parseProgress('42')).toEqual(emptyProgress());
    expect(parseProgress(JSON.stringify({ version: PROGRESS_VERSION + 1, customerIndex: 9 }))).toEqual(emptyProgress());
  });

  it('sanitizes broken fields individually', () => {
    const p = parseProgress(
      JSON.stringify({
        version: 1,
        customerIndex: -2,
        discoveredTagIds: 'nope',
        scoreHistory: [
          { customerId: 'ok', score: 55, band: 'partial', at: 5 },
          { customerId: 'bad-band', score: 10, band: 'legendary' },
          { score: 1, band: 'good' },
        ],
      }),
    );
    expect(p.customerIndex).toBe(0);
    expect(p.discoveredTagIds).toEqual([]);
    expect(p.scoreHistory).toEqual([{ customerId: 'ok', score: 55, band: 'partial', at: 5 }]);
    expect(p.bestScore).toBe(55);
  });

  it('caps history and tracks the best score', () => {
    let p = emptyProgress();
    for (let i = 0; i < MAX_SCORE_HISTORY + 5; i++) {
      p = withScore(p, { customerId: `c${i}`, score: i, band: 'good', at: i });
    }
    expect(p.scoreHistory).toHaveLength(MAX_SCORE_HISTORY);
    expect(p.scoreHistory[0].customerId).toBe('c5');
    expect(p.bestScore).toBe(MAX_SCORE_HISTORY + 4);
    expect(p.lastPlayedAt).toBe(MAX_SCORE_HISTORY + 4);
  });
});

describe('gameStore ⇄ progress', () => {
  it('records a score on deliver and advances the saved customer index', () => {
    useGameStore.getState().startFresh();
    const g = useGameStore.getState();
    g.addClassicUnit(g.defs.ingredients[0].id);
    g.applyGrindWork(10);
    g.transferMortar();
    g.addMortarToCauldron();
    g.bottleBrew();
    g.deliver();
    const afterDeliver = useProgressStore.getState().progress;
    expect(afterDeliver.scoreHistory).toHaveLength(1);
    expect(afterDeliver.scoreHistory[0].customerId).toBe(g.currentCustomer().id);
    expect(afterDeliver.usedIngredientIds).toEqual([g.defs.ingredients[0].id]);

    useGameStore.getState().nextCustomer();
    expect(useProgressStore.getState().progress.customerIndex).toBe(1);
    expect(hasProgress(useProgressStore.getState().progress)).toBe(true);

    useGameStore.getState().startFresh();
    expect(useProgressStore.getState().progress).toEqual(emptyProgress());
    expect(useGameStore.getState().customerIndex).toBe(0);
  });
});
