/**
 * تنظیمات — دو کلید: صدا (sfx.ts) و لرزش (platform/haptics.ts).
 * هر دو در localStorage می‌مانند؛ تغییرشان بی‌درنگ اثر می‌کند.
 * باز می‌شود از دکمه‌ی چرخ‌دنده‌ی بالا (ui/SettingsButton).
 */

import { useState } from 'react';
import { OverlayShell } from './OverlayShell';
import { uiLabels } from '../data/labels';
import { isSfxEnabled, setSfxEnabled, unlockAudio, sfx } from '../audio/sfx';
import { haptic, isHapticsEnabled, setHapticsEnabled } from '../platform/haptics';

function ToggleRow({
  id,
  label,
  hint,
  on,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="kimi-setting-row">
      <div className="kimi-setting-text">
        <span className="kimi-setting-label">{label}</span>
        <span className="kimi-setting-hint">{hint}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        data-testid={id}
        className={`kimi-switch${on ? ' is-on' : ''}`}
        onClick={() => onChange(!on)}
      >
        <span className="kimi-switch__knob" />
        <span className="kimi-switch__text">{on ? uiLabels.on : uiLabels.off}</span>
      </button>
    </div>
  );
}

export function SettingsOverlay() {
  const [sound, setSound] = useState(isSfxEnabled);
  const [haptics, setHaptics] = useState(isHapticsEnabled);

  return (
    <OverlayShell overlayId="settings" title={uiLabels.settings}>
      <div className="kimi-settings" data-testid="settings-panel">
        <ToggleRow
          id="settings-sound"
          label={uiLabels.settingSound}
          hint={uiLabels.settingSoundHint}
          on={sound}
          onChange={(next) => {
            setSfxEnabled(next);
            setSound(next);
            if (next) {
              unlockAudio();
              sfx.cork();
            }
          }}
        />
        <ToggleRow
          id="settings-haptics"
          label={uiLabels.settingHaptics}
          hint={uiLabels.settingHapticsHint}
          on={haptics}
          onChange={(next) => {
            setHapticsEnabled(next);
            setHaptics(next);
            if (next) haptic('medium');
          }}
        />
      </div>
    </OverlayShell>
  );
}
