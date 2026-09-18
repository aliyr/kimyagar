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

const decodingImgs = new WeakSet<HTMLImageElement>();

function markDecoded(
  img: HTMLImageElement,
  forSrc: string,
  setReadyFor: (src: string) => void,
) {
  if (decodingImgs.has(img)) return;
  decodingImgs.add(img);
  const done = () => setReadyFor(forSrc);
  if (typeof img.decode === 'function') {
    void img.decode().then(done, done);
    return;
  }
  done();
}

/**
 * یک لایه‌ی هنری + خبر از بارشدنش.
 * تا وقتی تصویر decode نشده loaded=false می‌ماند تا صحنه
 * placeholder خودش را نشان دهد؛ تصویر که آمد، سرِ جای همان Zone می‌نشیند.
 * decode (نه فقط onLoad) تا دوربین/ورود روی پیکسل‌های خام نرود.
 */
export function useArt(src: string | undefined, options: ArtOptions = {}) {
  const [readyFor, setReadyFor] = useState<string | undefined>(undefined);
  const fit = options.fit ?? 'contain';
  const loaded = Boolean(src) && readyFor === src;

  const node = src ? (
    <img
      key={src}
      className={`zone-art zone-art--${fit}${options.className ? ` ${options.className}` : ''}`}
      src={artUrl(src)}
      alt=""
      onLoad={(e) => markDecoded(e.currentTarget, src, setReadyFor)}
      onError={() => setReadyFor((cur) => (cur === src ? undefined : cur))}
      ref={(el) => {
        // تصویر کش‌شده گاهی onLoad را قبل از وصل‌شدن handler می‌زند
        if (!el || readyFor === src) return;
        if (el.complete && el.naturalWidth > 0) {
          markDecoded(el, src, setReadyFor);
        }
      }}
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
