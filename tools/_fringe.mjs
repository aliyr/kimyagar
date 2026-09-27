import sharp from 'sharp';
import { existsSync } from 'node:fs';

// لبه‌ی روشن: پیکسل مات کنار شفاف که روشن و بی‌رنگ است (باقی‌مانده‌ی پس‌زمینه)
const [dir, sheet, ...ids] = process.argv.slice(2);
const TW = 200;
const TH = 270;
const tiles = [];
let col = 0;
const report = [];
for (const id of ids) {
  for (const emo of ['', '_happy', '_sad']) {
    const file = `${dir}/customer_${id}${emo}.png`;
    if (!existsSync(file)) {
      report.push(`${id}${emo}: MISSING`);
      continue;
    }
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    let edge = 0;
    let light = 0;
    let islands = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        const a = data[p * 4 + 3];
        if (a < 128) continue;
        const r = data[p * 4];
        const g = data[p * 4 + 1];
        const b = data[p * 4 + 2];
        const lum = (r + g + b) / 3;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        const nb = [p - 1, p + 1, p - w, p + w];
        const touches = nb.some((n) => data[n * 4 + 3] < 40);
        if (touches) {
          edge++;
          if (lum > 205 && sat < 28) light++;
        }
        if (lum > 215 && sat < 20) islands++;
      }
    }
    const pct = edge ? ((light / edge) * 100).toFixed(1) : '0';
    report.push(`${id}${emo}: fringe ${pct}%  paleArea ${((islands / (w * h)) * 100).toFixed(2)}%`);
    if (emo === '' && sheet) {
      const buf = await sharp(file)
        .resize(TW, TH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .flatten({ background: '#1a120c' })
        .png()
        .toBuffer();
      tiles.push({ input: buf, left: (col % 8) * TW, top: Math.floor(col / 8) * TH });
      col++;
    }
  }
}
console.log(report.join('\n'));
if (sheet && tiles.length) {
  const rows = Math.ceil(tiles.length / 8);
  await sharp({ create: { width: 8 * TW, height: rows * TH, channels: 3, background: '#1a120c' } })
    .composite(tiles)
    .jpeg({ quality: 85 })
    .toFile(sheet);
  console.log('sheet', sheet);
}
