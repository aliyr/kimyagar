import { useState } from 'react';
import { OverlayShell } from './OverlayShell';
import { heatFromPayload, toFaDigits } from './format';
import {
  grindLabels,
  heatLabels,
  stageLabels,
  uiLabels,
  quantityLabels,
} from '../data/labels';
import { useGameStore } from '../store/gameStore';
import type { Quantity } from '../engine/types';

function quantityFa(q: Quantity): string {
  return quantityLabels[q];
}

export function ProcessHistoryOverlay() {
  const brew = useGameStore((s) => s.brew);
  const ingredientById = useGameStore((s) => s.ingredientById);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const heatEvents = brew.history.filter((e) => e.type === 'heat_changed');
  const stirEvents = brew.history.filter((e) => e.type === 'stirred');
  const stirTotal = Math.max(brew.stirCount, stirEvents.length);

  return (
    <OverlayShell overlayId="process_history" title={uiLabels.processHistory}>
      {brew.entries.length === 0 ? (
        <p className="kimi-empty">{uiLabels.emptyHistory}</p>
      ) : (
        <ol className="kimi-history-list">
          {brew.entries.map((entry, index) => {
            const name = ingredientById(entry.ingredientId)?.nameFa ?? entry.ingredientId;
            const order = entry.entryOrder >= 1 ? entry.entryOrder : index + 1;
            const open = expandedId === entry.id;
            return (
              <li key={entry.id} className={open ? 'kimi-history-item is-open' : 'kimi-history-item'}>
                <button
                  type="button"
                  className="kimi-history-row"
                  onClick={() => setExpandedId(open ? null : entry.id)}
                >
                  <span className="kimi-history-order">{toFaDigits(order)}</span>
                  <span className="kimi-history-name">{name}</span>
                  <span className="kimi-history-stage">{stageLabels[entry.stage]}</span>
                </button>
                {open ? (
                  <dl className="kimi-history-detail">
                    <div>
                      <dt>{uiLabels.quantity}</dt>
                      <dd>{quantityFa(entry.quantity)}</dd>
                    </div>
                    <div>
                      <dt>{uiLabels.grindState}</dt>
                      <dd>{grindLabels[entry.grindState]}</dd>
                    </div>
                    <div>
                      <dt>{uiLabels.heatAtEntry}</dt>
                      <dd>{heatLabels[entry.heatAtEntry]}</dd>
                    </div>
                  </dl>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <div className="kimi-history-meta">
        <p>
          {uiLabels.stirCount}: {toFaDigits(stirTotal)} بار
        </p>
        {heatEvents.length > 0 ? (
          <ul className="kimi-heat-events">
            <li className="kimi-heat-events-label">{uiLabels.heatChanges}</li>
            {heatEvents.map((ev, i) => {
              const heat = heatFromPayload(ev.payload);
              return (
                <li key={`${ev.atTime}-${i}`}>
                  {heat ? heatLabels[heat] : uiLabels.heatChanges}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </OverlayShell>
  );
}
