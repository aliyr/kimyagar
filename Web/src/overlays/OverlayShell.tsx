/**
 * قالب مشترک Overlay: پرده‌ی نیمه‌شفاف کارگاه + پنل کاغذ کهنه.
 * بستن با پس‌زمینه یا دکمه‌ی close (data-testid="overlay-close").
 */

import type { OverlayId } from '../store/gameStore';
import { useGameStore } from '../store/gameStore';
import { uiLabels } from '../data/labels';
import type { ReactNode } from 'react';

interface OverlayShellProps {
  overlayId: OverlayId;
  title?: string;
  children: ReactNode;
}

export function OverlayShell({ overlayId, title, children }: OverlayShellProps) {
  const closeOverlay = useGameStore((s) => s.closeOverlay);

  return (
    <div className="kimi-overlay-root" data-testid={`overlay-${overlayId}`} dir="rtl">
      <button
        type="button"
        className="kimi-overlay-backdrop"
        aria-label={uiLabels.closeOverlay}
        onClick={closeOverlay}
      />
      <div className="kimi-overlay-panel" role="dialog" aria-modal="true">
        <button
          type="button"
          className="kimi-overlay-close"
          data-testid="overlay-close"
          onClick={closeOverlay}
          aria-label={uiLabels.closeOverlay}
        >
          ×
        </button>
        {title ? <h2 className="kimi-overlay-title">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
