// Clienti seduti nel dehors dell'Hollywood: quanti dipende dall'ora (chiuso dalle 2 alle 6, pieno la sera).
import { G, P, peds, viewHalf } from "../core/state";
import { R, pick } from "../core/util";
import { SEATS, THRESHOLD } from "../world/dehors";
import { makePed } from "./peds";
import { barTarget } from "./bar";

const target = (h: number) => barTarget(h) === 0 ? 0 : h < 11 ? 2 : h < 15 ? 3 : h < 18 ? 4 : h < 23 ? 8 : 6;
let t = 0;
export function updDehors(dt: number) {
  if ((t -= dt) > 0) return; t = G.started ? R(2, 6) : 0;
  const sitting = peds.filter(p => p.seat !== undefined && p.st !== "dead"), want = target(G.hour);
  if (sitting.length < want) {
    const free = SEATS.map((_, i) => i).filter(i => !sitting.some(p => p.seatIdx === i)), i = pick(free), s = SEATS[i], [hw, hh] = viewHalf();
    // se il posto è in vista il cliente esce dalla porta e va a sedersi, altrimenti compare già seduto
    const seen = G.started && Math.abs(s.x - P.x) < hw + 2 && Math.abs(s.y - P.y) < hh + 2, from = seen ? THRESHOLD : s;
    makePed(from.x, from.y, { st: "loiter", keep: true, hx: s.x, hy: s.y, seat: s.a, seatIdx: i, a: s.a, spd: 1.3 });
  } else if (sitting.length > want) {
    // chi se ne va torna un passante qualunque
    const p = pick(sitting.filter(p => p.st === "loiter")); if (p) Object.assign(p, { keep: false, seat: undefined, seatIdx: undefined, st: "walk", spd: R(1.1, 1.6) });
  }
}
