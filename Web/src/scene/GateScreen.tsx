/**
 * سردر دکان — روی قاب ۱۹۲۰×۱۰۸۰، بیرون از دوربین سینمایی.
 * کارگاه واقعی پشت پرده است؛ لمس شمع در را باز می‌کند و به #/classic می‌رود.
 * مراحل و امتیازها فقط ورق «هنوز مهر نشده» را نشان می‌دهند.
 */

import { useEffect, useState } from 'react';
import { uiLabels } from '../data/labels';
import { sfx, unlockAudio } from '../audio/sfx';
import { GATE_ART, artUrl } from './artManifest';
import { preloadArt } from './preloadArt';
import { ArtLayer } from './Zone';
import './gate.css';

const OPEN_MS = 1480;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function GateScreen() {
  const [opening, setOpening] = useState(false);
  const [note, setNote] = useState<'stages' | 'scores' | null>(null);

  useEffect(() => {
    if (!opening) return;
    const id = window.setTimeout(() => {
      window.location.hash = '#/classic';
    }, OPEN_MS);
    return () => window.clearTimeout(id);
  }, [opening]);

  useEffect(() => {
    void preloadArt([
      GATE_ART.doorWest,
      GATE_ART.doorEast,
      GATE_ART.lintel,
      GATE_ART.sill,
      GATE_ART.sign,
      GATE_ART.plaque,
      GATE_ART.seal,
      GATE_ART.parchment,
      GATE_ART.drop,
      GATE_ART.customerShadow,
      GATE_ART.candle,
      ...GATE_ART.flames,
    ]);
  }, []);

  function enter() {
    if (opening) return;
    unlockAudio();
    sfx.shopBell();
    if (prefersReducedMotion()) {
      window.location.hash = '#/classic';
      return;
    }
    setOpening(true);
  }

  function toggleNote(which: 'stages' | 'scores') {
    setNote((cur) => (cur === which ? null : which));
  }

  return (
    <div className={`gate${opening ? ' is-opening' : ''}`} data-testid="gate-screen">
      <div className="gate__veil" />

      <header className="gate__mast">
        <div className="gate__sign">
          <ArtLayer src={GATE_ART.sign} fit="contain" />
          <h1 className="gate__title">{uiLabels.gameTitle}</h1>
          <p className="gate__subtitle">{uiLabels.gateSubtitle}</p>
        </div>
      </header>
      <span className="gate__drop" aria-hidden>
        <img src={artUrl(GATE_ART.drop)} alt="" />
      </span>

      <button
        type="button"
        className={`gate__plaque gate__plaque--stages${note === 'stages' ? ' is-open' : ''}`}
        data-testid="gate-stages"
        aria-expanded={note === 'stages'}
        onClick={() => toggleNote('stages')}
      >
        <span className="gate__plaque-label">{uiLabels.gateStages}</span>
        <ArtLayer src={GATE_ART.plaque} fit="fill">
          <span className="gate__plaque-seal" aria-hidden />
        </ArtLayer>
      </button>

      <div className="gate__doorway">
        <div className="gate__lintel">
          <ArtLayer src={GATE_ART.lintel} fit="contain" />
        </div>
        <div className="gate__leaf gate__leaf--west">
          <ArtLayer src={GATE_ART.doorWest} fit="fill">
            <div className="gate__window" />
            <div className="gate__panel" />
            <div className="gate__panel gate__panel--low" />
            <span className="gate__hinge gate__hinge--a" />
            <span className="gate__hinge gate__hinge--b" />
          </ArtLayer>
        </div>
        <div className="gate__leaf gate__leaf--east">
          <div className="gate__customer" aria-hidden>
            <ArtLayer src={GATE_ART.customerShadow} fit="contain">
              <span className="gate__customer-head" />
              <span className="gate__customer-body" />
            </ArtLayer>
          </div>
          <ArtLayer src={GATE_ART.doorEast} fit="fill">
            <div className="gate__window" />
            <div className="gate__panel" />
            <div className="gate__panel gate__panel--low" />
            <span className="gate__hinge gate__hinge--a" />
            <span className="gate__hinge gate__hinge--b" />
          </ArtLayer>
        </div>
        <div className="gate__crack" aria-hidden />
        <div className="gate__seal" aria-hidden>
          <ArtLayer src={GATE_ART.seal} fit="contain">
            <span className="gate__seal-ring" />
          </ArtLayer>
        </div>
        <div className="gate__sill">
          <ArtLayer src={GATE_ART.sill} fit="contain" />
        </div>
      </div>

      <button
        type="button"
        className={`gate__plaque gate__plaque--scores${note === 'scores' ? ' is-open' : ''}`}
        data-testid="gate-scores"
        aria-expanded={note === 'scores'}
        onClick={() => toggleNote('scores')}
      >
        <span className="gate__plaque-label">{uiLabels.gateScores}</span>
        <ArtLayer src={GATE_ART.plaque} fit="fill">
          <span className="gate__plaque-seal" aria-hidden />
        </ArtLayer>
      </button>

      <button
        type="button"
        className="gate__candle"
        data-testid="gate-candle"
        aria-label={uiLabels.gateStart}
        onClick={enter}
      >
        <span className="gate__flames" aria-hidden>
          {GATE_ART.flames.map((src, i) => (
            <img key={src} className="gate__flame-frame" src={artUrl(src)} alt="" style={{ animationDelay: `${i * 0.16}s` }} />
          ))}
        </span>
        <ArtLayer src={GATE_ART.candle} fit="contain">
          <span className="gate__flame" aria-hidden />
          <span className="gate__wick" aria-hidden />
          <span className="gate__wax" aria-hidden />
          <span className="gate__saucer" aria-hidden />
        </ArtLayer>
        <span className="gate__candle-label">{uiLabels.gateStart}</span>
      </button>

      {note ? (
        <>
          <button type="button" className="gate__note-scrim" aria-label={uiLabels.closeOverlay} onClick={() => setNote(null)} />
          <button type="button" className="gate__note" data-testid="gate-sealed-note" onClick={() => setNote(null)}>
            <ArtLayer src={GATE_ART.parchment} fit="contain" />
            <span className="gate__note-text">{uiLabels.gateSealed}</span>
          </button>
        </>
      ) : null}
    </div>
  );
}
