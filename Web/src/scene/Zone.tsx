/**
 * ابزارهای پایه‌ی لایه‌های صحنه:
 * - zoneStyle/rectStyle: قرار دادن یک المان در مختصات منطقی صحنه.
 * - ArtLayer: تصویر لایه + placeholder سازگار (اگر فایل هنری نبود یا خطا داد،
 *   placeholder می‌ماند؛ به‌محض بارشدن تصویر، placeholder کنار می‌رود).
 */

import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { artUrl } from './artManifest';
import type { SceneZone } from './artManifest';
import type { Rect } from './layout';

export function rectStyle(r: Rect, z: number, extra?: CSSProperties): CSSProperties {
  return {
    position: 'absolute',
    left: r.x,
    top: r.y,
    width: r.width,
    height: r.height,
    zIndex: z,
    ...extra,
  };
}

export function zoneStyle(zone: SceneZone, extra?: CSSProperties): CSSProperties {
  return rectStyle(zone, zone.z, extra);
}

/** نوشتن CSS Custom Property ها بدون درگیری با تایپ CSSProperties */
export function vars(v: Record<string, string | number>): CSSProperties {
  return v as CSSProperties;
}

/**
 * contain: شکل شیء حفظ می‌شود (پیش‌فرض).
 * cover: کل Zone پر می‌شود (پس‌زمینه و کاغذ سفارش).
 * fill: دقیقاً روی مستطیل Zone کشیده می‌شود — وقتی لازم است نقاط داخل تصویر
 *       (مثل تخته‌های قفسه‌ی کابینت) با مختصات ما هم‌تراز بمانند.
 */
export type ArtFit = 'contain' | 'cover' | 'fill';

export interface ArtOptions {
  fit?: ArtFit;
  className?: string;
}

/**
 * یک لایه‌ی هنری + خبر از بارشدنش.
 * تا وقتی تصویر نیامده (یا وجود ندارد) loaded=false می‌ماند تا صحنه
 * placeholder خودش را نشان دهد؛ تصویر که آمد، سرِ جای همان Zone می‌نشیند.
 */
export function useArt(src: string | undefined, options: ArtOptions = {}) {
  const [loaded, setLoaded] = useState(false);
  const fit = options.fit ?? 'contain';

  const node = src ? (
    <img
      key={src}
      className={`zone-art zone-art--${fit}${options.className ? ` ${options.className}` : ''}`}
      src={artUrl(src)}
      alt=""
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(false)}
    />
  ) : null;

  return { loaded, node };
}

export function ArtLayer({
  src,
  fit,
  className,
  children,
}: {
  /** مسیر نسبی داخل public/art — ممکن است هنوز تولید نشده باشد */
  src?: string;
  fit?: ArtFit;
  className?: string;
  /** placeholder ای که تا بار نشدن تصویر دیده می‌شود */
  children?: ReactNode;
}) {
  const { loaded, node } = useArt(src, { fit, className });
  return (
    <>
      {node}
      {loaded ? null : children}
    </>
  );
}
