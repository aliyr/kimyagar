/**
 * انتخاب سبک هنری صحنه‌ی v2 — مالک: Workstream B.
 *
 * کنترل کوچک و کم‌سروصدا در گوشه‌ی صحنه؛ چون روتینگ بر پایه‌ی hash است،
 * هر گزینه فقط یک لینک است (#/v2/flat یا #/v2/pixel) و App با شنیدن
 * hashchange صحنه را با سبک تازه دوباره رندر می‌کند.
 */

import { useArtStyle } from './contracts';
import type { ArtStyle } from './contracts';

const STYLES: { id: ArtStyle; labelFa: string; href: string }[] = [
  { id: 'flat', labelFa: 'فلت', href: '#/v2/flat' },
  { id: 'pixel', labelFa: 'پیکسل', href: '#/v2/pixel' },
  { id: 'engraved', labelFa: 'حکاکی', href: '#/v2/engraved' },
];

/** مستطیل کنترل در فضای منطقی صحنه (گوشه‌ی بالا-چپ، دور از دست بازیکن) */
const SWITCHER_RECT = { left: 28, top: 24, width: 470, height: 56 };

export function StyleSwitcher() {
  const current = useArtStyle();

  return (
    <div
      data-testid="style-switcher"
      className="v2-style-switcher interactive"
      dir="rtl"
      style={{
        position: 'absolute',
        left: SWITCHER_RECT.left,
        top: SWITCHER_RECT.top,
        width: SWITCHER_RECT.width,
        height: SWITCHER_RECT.height,
        zIndex: 95,
      }}
    >
      {STYLES.map((s) => (
        <a
          key={s.id}
          data-testid={`style-${s.id}`}
          data-active={current === s.id ? 'true' : undefined}
          className={`v2-style-switcher__btn${current === s.id ? ' is-active' : ''}`}
          href={s.href}
        >
          {s.labelFa}
        </a>
      ))}
      <a className="v2-style-switcher__classic" href="#/classic">
        نسخه کلاسیک
      </a>
    </div>
  );
}
