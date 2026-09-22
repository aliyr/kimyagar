/**
 * روتینگ hash بدون کتابخانه (منطق خالص، جدا از App برای تست و Fast Refresh):
 * - '' یا '#/' یا '#/gate'      ⇒ سردر دکان (صفحهٔ ورودی)
 * - '#/classic'                 ⇒ کارگاه کلاسیک (نام صریح، برای لینک‌های قدیمی و آزمون)
 * - '#/v2'                      ⇒ صحنه‌ی نسخه ۲ با سبک ذخیره‌شده (پیش‌فرض: فلت)
 * - '#/v2/flat'                 ⇒ صحنه‌ی نسخه ۲ با سبک فلت
 * - '#/v2/pixel'                ⇒ صحنه‌ی نسخه ۲ با سبک پیکسل
 * - '#/v2/engraved'             ⇒ صحنه‌ی نسخه ۲ با سبک حکاکی
 * - هر چیز دیگر                 ⇒ کلاسیک
 */

import { createContext, useContext } from 'react';
import { DEFAULT_ART_STYLE } from './scene/v2/contracts';
import type { ArtStyle } from './scene/v2/contracts';

export type RouteKind = 'gate' | 'classic' | 'v2';
export type Route = { kind: 'gate' } | { kind: 'classic' } | { kind: 'v2'; artStyle: ArtStyle };

export function parseRoute(hash: string, storedStyle: ArtStyle | null = null): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
  if (path === '' || path === 'gate') return { kind: 'gate' };
  if (path === 'v2') return { kind: 'v2', artStyle: storedStyle ?? DEFAULT_ART_STYLE };
  if (path === 'v2/flat') return { kind: 'v2', artStyle: 'flat' };
  if (path === 'v2/pixel') return { kind: 'v2', artStyle: 'pixel' };
  if (path === 'v2/engraved') return { kind: 'v2', artStyle: 'engraved' };
  return { kind: 'classic' };
}

/** آیا hash یک سبک صریح v2 را نام می‌برد (که باید ذخیره شود)؟ */
export function hashNamesStyle(hash: string): boolean {
  return /^#\/?v2\/(flat|pixel|engraved)\/?$/i.test(hash);
}

/** نوع روت فعال؛ Overlayها با آن می‌فهمند در کلاسیک هستند یا v2 */
export const RouteKindContext = createContext<RouteKind>('v2');

export function useRouteKind(): RouteKind {
  return useContext(RouteKindContext);
}
