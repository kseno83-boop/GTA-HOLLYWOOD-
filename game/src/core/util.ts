// Funzioni matematiche e casuali condivise da tutti i sistemi.

let seed = 7;
/** Casuale deterministico: le auto parcheggiate sono sempre le stesse a ogni avvio. */
export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const R = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
export const hyp = Math.hypot;
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const angDiff = (a: number, b: number) => {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
};
/** Nero dei contorni (stile Hotline Miami). */
export const K = "#0b0612";
export const TOUCH = "ontouchstart" in window;
