/**
 * دکمه‌ی چرخ‌دنده‌ی تنظیمات — بالا-چپ (فیزیکی)، بیرون از Stage.
 * Overlay «settings» را باز می‌کند (صدا / لرزش). جانشین دکمه‌ی صدای پایین‌چپ.
 *
 * همین کامپوننت AudioContext را با اولین pointerdown صفحه باز می‌کند تا هر
 * تعامل بعدی (Tap شیشه، کوبش…) بی‌درنگ صدا داشته باشد.
 */

import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { uiLabels } from '../data/labels';
import { unlockAudio } from '../audio/sfx';
import './settings-button.css';

export function SettingsButton() {
  const openOverlay = useGameStore((s) => s.openOverlay);
  const openOverlayAction = useGameStore((s) => s.openOverlayAction);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { passive: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  return (
    <button
      type="button"
      className={`settings-button${openOverlay === 'settings' ? ' is-open' : ''}`}
      data-testid="settings-button"
      aria-label={uiLabels.settings}
      title={uiLabels.settings}
      onClick={() => openOverlayAction('settings')}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path
          d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8zm8.2 3.4c0-.5-.05-1-.14-1.47l2.05-1.6-2-3.46-2.43 1a8.2 8.2 0 0 0-2.55-1.47L14.75 2h-5.5l-.38 2.6a8.2 8.2 0 0 0-2.55 1.47l-2.43-1-2 3.46 2.05 1.6A8.5 8.5 0 0 0 3.8 12c0 .5.05 1 .14 1.47l-2.05 1.6 2 3.46 2.43-1a8.2 8.2 0 0 0 2.55 1.47L9.25 22h5.5l.38-2.6a8.2 8.2 0 0 0 2.55-1.47l2.43 1 2-3.46-2.05-1.6c.09-.47.14-.97.14-1.47z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
