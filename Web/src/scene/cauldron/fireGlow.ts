/** درخشش کوره، مشترک بین FireLight و رندرر پاتیل/اجاق. */

let glow = 0;

export function setFireGlow(value: number): void {
  glow = value;
}

export function getFireGlow(): number {
  return glow;
}
