/**
 * ماندگاری سبک هنری انتخاب‌شده در localStorage تا با روت خالی (`/`) همان
 * سبک آخر باز شود (همان کلید Kimiagar.Works).
 */

import type { ArtStyle } from './contracts';

export const ART_STYLE_STORAGE_KEY = 'kimiagar.artStyle';

const STYLES: readonly ArtStyle[] = ['flat', 'pixel', 'engraved'];

export function isArtStyle(value: unknown): value is ArtStyle {
  return typeof value === 'string' && (STYLES as readonly string[]).includes(value);
}

export function readStoredArtStyle(): ArtStyle | null {
  try {
    const raw = globalThis.localStorage?.getItem(ART_STYLE_STORAGE_KEY);
    return isArtStyle(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function storeArtStyle(style: ArtStyle): void {
  try {
    globalThis.localStorage?.setItem(ART_STYLE_STORAGE_KEY, style);
  } catch {
    // حالت خصوصی / فضای پر: بی‌صدا
  }
}
