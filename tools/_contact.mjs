import sharp from 'sharp';
import { existsSync } from 'node:fs';

const [dir, out, cols, ...ids] = process.argv.slice(2);
const W = 256;
const H = 342;
const n = Number(cols);
const tiles = [];
for (let i = 0; i < ids.length; i++) {
  const file = `${dir}/customer_${ids[i]}.png`;
  if (!existsSync(file)) continue;
  const buf = await sharp(file).resize(W, H, { fit: 'cover', position: 'top' }).png().toBuffer();
  tiles.push({ input: buf, left: (i % n) * W, top: Math.floor(i / n) * H });
}
const rows = Math.ceil(ids.length / n);
await sharp({ create: { width: n * W, height: rows * H, channels: 3, background: '#333' } })
  .composite(tiles)
  .jpeg({ quality: 82 })
  .toFile(out);
console.log(out, tiles.length);
