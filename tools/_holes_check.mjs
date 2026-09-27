import sharp from 'sharp';
import { existsSync } from 'node:fs';

// سوراخ شفاف داخل آدمک (محصور، به لبه‌ی تصویر وصل نیست) — مثل شیشه‌ی معجون که بریده شده
const [dir, ...ids] = process.argv.slice(2);
for (const id of ids) {
  for (const emo of ['', '_happy', '_sad']) {
    const file = `${dir}/customer_${id}${emo}.png`;
    if (!existsSync(file)) continue;
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    const clear = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] < 40) clear[p] = 1;
    const seen = new Uint8Array(w * h);
    const holes = [];
    for (let s = 0; s < w * h; s++) {
      if (!clear[s] || seen[s]) continue;
      const stack = [s];
      seen[s] = 1;
      let n = 0;
      let border = false;
      let minx = w, maxx = 0, miny = h, maxy = 0;
      while (stack.length) {
        const p = stack.pop();
        n++;
        const x = p % w;
        const y = (p - x) / w;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (y < miny) miny = y;
        if (y > maxy) maxy = y;
        for (const q of [p - 1, p + 1, p - w, p + w]) {
          if (q < 0 || q >= w * h) continue;
          if (Math.abs((q % w) - x) > 1) continue;
          if (clear[q] && !seen[q]) {
            seen[q] = 1;
            stack.push(q);
          }
        }
      }
      if (!border && n > 150) holes.push({ n, minx, maxx, miny, maxy });
    }
    holes.sort((a, b) => b.n - a.n);
    console.log(`${id}${emo}`, holes.length ? JSON.stringify(holes.slice(0, 4)) : 'ok');
  }
}
