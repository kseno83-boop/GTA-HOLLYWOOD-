// Turni dietro il bancone dell'Hollywood (indicazioni dell'utente): i proprietari Max e Giada sono raramente insieme,
// il resto dello staff ruota. In ogni fascia oraria: un proprietario (di rado tutti e due) + una persona dello staff.
import { G } from "../core/state";

export const TURNI = {
  /** Fasce orarie (ore di gioco); l'ultima passa la mezzanotte, il bar chiude alle 2. */
  fasce: [[6, 14], [14, 20], [20, 2]] as [number, number][],
  proprietari: ["max", "giada"],
  staff: ["mary", "annie", "martina", "lollo"],
  /** Probabilità che i due proprietari siano in turno insieme. */
  insieme: .12,
};

/** Numero pseudo-casuale fisso per giorno e fascia: lo stesso turno dà sempre le stesse persone. */
function rnd(day: number, fascia: number, k: number) { let x = (day * 374761393 + fascia * 668265263 + k * 2147483647) | 0; x = (x ^ (x >>> 13)) * 1274126177; x ^= x >>> 16; return (x >>> 0) / 4294967296; }

/** Id dei personaggi in servizio adesso (vuoto se il bar è chiuso). */
export function inServizio(h = G.hour, day = G.day): string[] {
  const s = TURNI.fasce.findIndex(([a, b]) => a <= b ? h >= a && h < b : h >= a || h < b); if (s < 0) return [];
  const d = h < TURNI.fasce[0][0] ? day - 1 : day; // dopo mezzanotte è ancora il turno della sera prima
  const P = TURNI.proprietari, chi = rnd(d, s, 1) < TURNI.insieme ? [...P] : [P[rnd(d, s, 2) < .5 ? 0 : 1]];
  return [...chi, TURNI.staff[((d * 3 + s) % TURNI.staff.length + TURNI.staff.length) % TURNI.staff.length]];
}
