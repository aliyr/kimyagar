/**
 * Debug View — جدا از UI بازیکن؛ اعداد خام فقط اینجا مجازند.
 */

import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { uiLabels } from '../data/labels';
import './debug.css';

function n(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : String(value);
}

export function DebugMount() {
  const debugOpen = useGameStore((s) => s.debugOpen);
  const toggleDebug = useGameStore((s) => s.toggleDebug);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyD' || !e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.repeat) return;
      e.preventDefault();
      useGameStore.getState().toggleDebug();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        className="kimi-debug-toggle"
        data-testid="debug-toggle"
        onClick={toggleDebug}
        title={`${uiLabels.debugView} (Shift+D)`}
        aria-label={uiLabels.debugView}
        aria-pressed={debugOpen}
      >
        dbg
      </button>
      {debugOpen ? <DebugPanel /> : null}
    </>
  );
}

function DebugPanel() {
  const brew = useGameStore((s) => s.brew);
  const result = useGameStore((s) => s.result);
  const evaluation = useGameStore((s) => s.evaluation);
  const customer = useGameStore((s) => s.currentCustomer());

  return (
    <aside className="kimi-debug-panel" data-testid="debug-panel" dir="ltr">
      <h2>Debug View</h2>

      <section>
        <h3>BrewState</h3>
        <p>
          heat={brew.currentHeat} elapsed={n(brew.elapsedTime)}s stirs={brew.stirCount}{' '}
          stirCorrection={n(brew.stirCorrection)} bottled={String(brew.bottled)} entries=
          {brew.entries.length}
        </p>
        {brew.entries.length === 0 ? (
          <p className="kimi-debug-muted">(empty brew)</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ord</th>
                <th>id</th>
                <th>qty</th>
                <th>grind</th>
                <th>heat@in</th>
                <th>exposure</th>
                <th>stage</th>
                <th>contributions</th>
              </tr>
            </thead>
            <tbody>
              {brew.entries.map((e) => (
                <tr key={e.id}>
                  <td>{e.entryOrder}</td>
                  <td>{e.ingredientId}</td>
                  <td>{e.quantity}</td>
                  <td>{e.grindState}</td>
                  <td>{e.heatAtEntry}</td>
                  <td>{n(e.exposure)}</td>
                  <td>{e.stage}</td>
                  <td className="kimi-debug-json">
                    {JSON.stringify(e.contributions)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="kimi-debug-muted">history: {brew.history.map((h) => h.type).join(' → ') || '—'}</p>
      </section>

      {result ? (
        <section>
          <h3>DebugBreakdown</h3>
          <table>
            <thead>
              <tr>
                <th>entry</th>
                <th>ing</th>
                <th>prop</th>
                <th>base</th>
                <th>qty</th>
                <th>grind</th>
                <th>heatExp</th>
                <th>final</th>
              </tr>
            </thead>
            <tbody>
              {result.debug.contributions.map((c, i) => (
                <tr key={`${c.entryId}-${c.propertyId}-${i}`}>
                  <td>{c.entryId}</td>
                  <td>{c.ingredientId}</td>
                  <td>{c.propertyId}</td>
                  <td>{n(c.base)}</td>
                  <td>{n(c.quantityFactor)}</td>
                  <td>{n(c.grindingFactor)}</td>
                  <td>{n(c.heatExposureFactor)}</td>
                  <td>{n(c.final)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4>Raw vs Resolved axes</h4>
          <table>
            <thead>
              <tr>
                <th>axis</th>
                <th>A</th>
                <th>B</th>
                <th>sideA</th>
                <th>sideB</th>
                <th>resolved</th>
                <th>dominant</th>
                <th>tension</th>
              </tr>
            </thead>
            <tbody>
              {result.debug.rawAxes.map((a) => (
                <tr key={a.axisId}>
                  <td>{a.axisId}</td>
                  <td>{a.sideAProperty}</td>
                  <td>{a.sideBProperty}</td>
                  <td>{n(a.sideA)}</td>
                  <td>{n(a.sideB)}</td>
                  <td>{n(a.resolved)}</td>
                  <td>{a.dominantProperty ?? '—'}</td>
                  <td>{n(a.tension)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            tension={n(result.debug.totalTension)} complexity={n(result.debug.complexity)}{' '}
            tensionCost={n(result.debug.tensionCost)} processError={n(result.debug.processError)}{' '}
            stirCorrection={n(result.debug.stirCorrection)} baseInstability=
            {n(result.debug.baseInstability)} instability={n(result.debug.finalInstability)}{' '}
            stability={n(result.debug.stability)} label={result.stabilityLabel}
          </p>
        </section>
      ) : null}

      {evaluation ? (
        <section>
          <h3>Evaluation — {customer.id}</h3>
          <table>
            <thead>
              <tr>
                <th>kind</th>
                <th>prop</th>
                <th>dir</th>
                <th>thr</th>
                <th>crit</th>
                <th>actual</th>
                <th>sat</th>
                <th>ok</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.perRequirement.map((o, i) => (
                <tr key={`${o.requirement.propertyId}-${i}`}>
                  <td>{o.requirement.kind}</td>
                  <td>{o.requirement.propertyId}</td>
                  <td>{o.requirement.direction}</td>
                  <td>{n(o.requirement.threshold)}</td>
                  <td>{o.requirement.critical ? 'Y' : ''}</td>
                  <td>{n(o.actualValue)}</td>
                  <td>{n(o.satisfaction)}</td>
                  <td>{o.satisfied ? 'Y' : 'N'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            sideEffectPenalty={n(evaluation.sideEffectPenalty)} stabilityModifier=
            {n(evaluation.stabilityModifier)} tagBonus={n(evaluation.tagBonus)} score=
            {n(evaluation.score)} band={evaluation.band}
          </p>
        </section>
      ) : null}
    </aside>
  );
}
