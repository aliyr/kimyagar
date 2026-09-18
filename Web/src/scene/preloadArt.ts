/**
 * پیش‌بار و decode تصویرهای صحنه — تا دوربین/ورود مشتری روی placeholder نرود.
 * هر URL یک‌بار در cache می‌ماند؛ خطا نادیده گرفته می‌شود تا بازی گیر نکند.
 */

import { artUrl } from './artManifest';

const cache = new Map<string, Promise<void>>();

function loadOne(url: string): Promise<void> {
  const hit = cache.get(url);
  if (hit) return hit;
  const job = new Promise<void>((resolve) => {
    if (typeof Image === 'undefined') {
      resolve();
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    const done = () => resolve();
    img.onload = () => {
      if (typeof img.decode === 'function') {
        void img.decode().then(done, done);
        return;
      }
      done();
    };
    img.onerror = done;
    img.src = url;
  });
  cache.set(url, job);
  return job;
}

export function preloadArt(relPaths: ReadonlyArray<string | undefined>): Promise<void> {
  return Promise.all(relPaths.filter((p): p is string => Boolean(p)).map((rel) => loadOne(artUrl(rel)))).then(
    () => undefined,
  );
}
