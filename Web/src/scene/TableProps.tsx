/**
 * سه شیء کوچک و کم‌سروصدا (بدون دکمه‌ی بزرگ، همه فیزیکی):
 * - دفترچه‌ی چرمی تکیه‌داده به دیوار ⇒ Overlay دفترچه
 * - دسته‌کاغذ کنار پاتیل ⇒ آنچه تا حالا ریخته‌ای
 * - سطل چوبی ⇒ خالی کردن پاتیل
 */

import { useGameStore } from '../store/gameStore';
import { uiLabels } from '../data/labels';
import { tapProps } from '../gestures';
import { PROPS } from './layout';
import { rectStyle } from './Zone';

export function TableProps() {
  const openOverlay = useGameStore((s) => s.openOverlayAction);
  const resetBrew = useGameStore((s) => s.resetBrew);
  const hasBrew = useGameStore((s) => s.brew.entries.length > 0 || s.mortar !== null);

  return (
    <>
      <div
        data-testid="notebook-button"
        className="notebook interactive"
        title={uiLabels.notebook}
        style={rectStyle(PROPS.notebook, 45)}
        {...tapProps(() => openOverlay('notebook'))}
      >
        <span className="notebook__cover">
          <span className="notebook__band" />
          <span className="notebook__title">{uiLabels.notebook}</span>
        </span>
        <span className="notebook__pages" />
      </div>

      <div
        data-testid="history-button"
        className="ledger interactive"
        title={uiLabels.processHistory}
        style={rectStyle(PROPS.ledger, 45)}
        {...tapProps(() => openOverlay('process_history'))}
      >
        <span className="ledger__sheet ledger__sheet--c" />
        <span className="ledger__sheet ledger__sheet--b" />
        <span className="ledger__sheet ledger__sheet--a">
          <span className="ledger__lines" />
        </span>
      </div>

      <div
        data-testid="reset-button"
        className={`bucket interactive${hasBrew ? ' is-live' : ''}`}
        title={uiLabels.resetBrew}
        style={rectStyle(PROPS.bucket, 45)}
        {...tapProps(resetBrew)}
      >
        <span className="bucket__body" />
        <span className="bucket__band bucket__band--top" />
        <span className="bucket__band bucket__band--bottom" />
        <span className="bucket__handle" />
      </div>
    </>
  );
}
