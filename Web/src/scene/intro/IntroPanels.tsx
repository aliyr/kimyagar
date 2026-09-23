/**
 * پنل‌های سردر — همه در فضای صحنه‌ی ۱۹۲۰×۱۰۸۰ و با هنر خودشان:
 *   نقشه‌ی بازار (مراحل)  — پوستِ لوله‌شده باز می‌شود؛ روی هر مرحله یک مُهر
 *   دفتر حساب (امتیازها) — ردیف‌های تحویل‌های قبلی از progress؛ حالت خالی
 *   ورق تأیید «دکان تازه»
 */

import { bandLabels, uiLabels } from '../../data/labels';
import { isStageUnlocked, stages } from '../../data/stages';
import { useGameStore } from '../../store/gameStore';
import { useProgressStore } from '../../store/progressStore';
import type { ScoreEntry } from '../../store/progressStore';
import { GATE_ART, INTRO_ART, artUrl } from '../artManifest';
import type { IntroPanel } from './introState';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
function fa(n: number): string {
  return String(n).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

function formatDate(at: number): string {
  if (!at) return '';
  try {
    return new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric' }).format(new Date(at));
  } catch {
    return '';
  }
}

function Scrim({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      className="intro__scrim interactive"
      aria-label={uiLabels.closeOverlay}
      data-testid="gate-panel-scrim"
      onClick={onClose}
    />
  );
}

function StagesPanel({ onClose }: { onClose: () => void }) {
  return (
    <>
      <Scrim onClose={onClose} />
      <section className="intro__panel intro__panel--map" role="dialog" aria-label={uiLabels.gateMapTitle} data-testid="gate-stages-panel">
        <img className="intro__panel-art" src={artUrl(INTRO_ART.mapOpen)} alt="" draggable={false} />
        <h2 className="intro__panel-title intro__panel-title--map">{uiLabels.gateMapTitle}</h2>
        {stages.map((stage, i) => {
          const open = isStageUnlocked(i);
          return (
            <div
              key={stage.id}
              className={`intro__stamp${open ? ' is-open' : ' is-locked'}`}
              style={{ left: `${stage.mapX}%`, top: `${stage.mapY}%` }}
              data-testid={`gate-stage-${stage.id}`}
            >
              <span className="intro__stamp-seal" aria-hidden>
                {open ? <span className="intro__stamp-star" /> : <span className="intro__stamp-lock" />}
              </span>
              <span className="intro__stamp-name">{stage.nameFa}</span>
              <span className="intro__stamp-hint">{open ? stage.hintFa : uiLabels.gateLocked}</span>
            </div>
          );
        })}
        <button type="button" className="intro__panel-close interactive" data-testid="gate-panel-close" onClick={onClose} aria-label={uiLabels.closeOverlay}>
          ×
        </button>
      </section>
    </>
  );
}

function LedgerRows({ entries, customerName }: { entries: ScoreEntry[]; customerName: (id: string) => string }) {
  return (
    <ol className="intro__ledger-rows">
      {entries.map((e, i) => (
        <li key={`${e.at}-${i}`} className={`intro__ledger-row is-${e.band}`}>
          <span className="intro__ledger-customer">{customerName(e.customerId)}</span>
          <span className="intro__ledger-dots" aria-hidden />
          <span className="intro__ledger-band">{bandLabels[e.band]}</span>
          <span className="intro__ledger-date">{formatDate(e.at)}</span>
        </li>
      ))}
    </ol>
  );
}

function ScoresPanel({ onClose }: { onClose: () => void }) {
  const progress = useProgressStore((s) => s.progress);
  const defs = useGameStore((s) => s.defs);
  const customerName = (id: string) => defs.customers.find((c) => c.id === id)?.nameFa ?? id;
  // تازه‌ترین بالا؛ صفحه‌ی راست اول (RTL)، بعد چپ
  const recent = [...progress.scoreHistory].reverse();
  const PER_PAGE = 7;
  const right = recent.slice(0, PER_PAGE);
  const left = recent.slice(PER_PAGE, PER_PAGE * 2);
  const best = recent.reduce<ScoreEntry | null>((m, e) => (m === null || e.score > m.score ? e : m), null);

  return (
    <>
      <Scrim onClose={onClose} />
      <section className="intro__panel intro__panel--ledger" role="dialog" aria-label={uiLabels.gateLedgerTitle} data-testid="gate-scores-panel">
        <img className="intro__panel-art" src={artUrl(INTRO_ART.ledgerOpen)} alt="" draggable={false} />
        <div className="intro__page intro__page--right">
          <h2 className="intro__panel-title intro__panel-title--ledger">{uiLabels.gateLedgerTitle}</h2>
          {best ? (
            <p className="intro__ledger-best">
              <span>{uiLabels.gateLedgerBest}</span>
              <strong>{customerName(best.customerId)}</strong>
              <em className={`is-${best.band}`}>{bandLabels[best.band]}</em>
            </p>
          ) : null}
          {right.length > 0 ? (
            <LedgerRows entries={right} customerName={customerName} />
          ) : (
            <div className="intro__ledger-empty" data-testid="gate-ledger-empty">
              <p>{uiLabels.gateLedgerEmpty}</p>
              <small>{uiLabels.gateLedgerEmptyHint}</small>
            </div>
          )}
        </div>
        <div className="intro__page intro__page--left">
          {left.length > 0 ? <LedgerRows entries={left} customerName={customerName} /> : null}
          {recent.length > 0 ? (
            <p className="intro__ledger-total">
              {fa(recent.length)} {recent.length === 1 ? 'تحویل' : 'تحویل'}
            </p>
          ) : null}
        </div>
        <button type="button" className="intro__panel-close interactive" data-testid="gate-panel-close" onClick={onClose} aria-label={uiLabels.closeOverlay}>
          ×
        </button>
      </section>
    </>
  );
}

function ConfirmFreshPanel({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <>
      <Scrim onClose={onClose} />
      <section className="intro__panel intro__panel--note" role="alertdialog" aria-label={uiLabels.gateFresh} data-testid="gate-fresh-panel">
        <img className="intro__panel-art" src={artUrl(GATE_ART.parchment)} alt="" draggable={false} />
        <div className="intro__note-body">
          <h2>{uiLabels.gateFresh}</h2>
          <p>{uiLabels.gateFreshConfirm}</p>
          <div className="intro__note-actions">
            <button type="button" className="intro__note-btn intro__note-btn--danger interactive" data-testid="gate-fresh-yes" onClick={onConfirm}>
              {uiLabels.gateFreshYes}
            </button>
            <button type="button" className="intro__note-btn interactive" data-testid="gate-fresh-no" onClick={onClose}>
              {uiLabels.gateFreshNo}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export function IntroPanels({
  panel,
  onClose,
  onFresh,
}: {
  panel: IntroPanel;
  onClose: () => void;
  onFresh: () => void;
}) {
  if (panel === 'stages') return <StagesPanel onClose={onClose} />;
  if (panel === 'scores') return <ScoresPanel onClose={onClose} />;
  if (panel === 'confirmFresh') return <ConfirmFreshPanel onClose={onClose} onConfirm={onFresh} />;
  return null;
}
