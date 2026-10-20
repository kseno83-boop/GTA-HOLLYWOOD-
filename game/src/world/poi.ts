// Punti d'interesse del centro (src/data/poi.json, generato da tools/osm_poi.py; elenco approvato dall'utente).
// Banche, gioiellerie, sala bingo e tabaccheria sono nei posti veri ma con nomi inventati.
import DATA from "../data/poi.json";
import { hyp } from "../core/util";

export type SpotCat = "police" | "fire" | "station" | "landmark" | "show" | "food" | "gelato" | "bar" | "bank" | "jewel" | "bingo" | "tabacchi"
  | "pharmacy" | "fuel" | "parking" | "shop" | "park" | "sport";
export interface Spot { name: string; cat: SpotCat; x: number; y: number; dx: number; dy: number; col: string;
  /** giorno di gioco dell'ultima rapina (una al giorno per posto) */
  robbed: number }

/** Colori del neon per categoria. */
export const SPOT_COL: Record<SpotCat, string> = { police: "#4d7cff", fire: "#ff3b30", station: "#e0e0ff", landmark: "#c79bff", show: "#ff5ec4",
  food: "#ffd166", gelato: "#ffb3d9", bar: "#ff9f6b", bank: "#7dffb2", jewel: "#7dffe9", bingo: "#ff4df0", tabacchi: "#b0ff4d",
  pharmacy: "#3dff6e", fuel: "#ff7a3d", parking: "#5aa9ff", shop: "#f2e6c9", park: "#6bdc7a", sport: "#4de1ff" };
/** Orari di apertura (ora di inizio e di fine, la fine può passare la mezzanotte); senza voce = sempre aperto. */
export const HOURS: Partial<Record<SpotCat, [number, number]>> = { food: [11, 24], gelato: [12, 24], bar: [7, 2], bank: [8.5, 16.5], jewel: [9.5, 19.5],
  bingo: [10, 3], tabacchi: [7, 20], shop: [9.5, 19.5] };
export const isOpen = (q: Spot, h: number) => { const o = HOURS[q.cat]; if (!o) return true; const [a, b] = o; return a < b ? h >= a && h < b : h >= a || h < b; };

export const SPOTS: Spot[] = (DATA.pois as [string, SpotCat, number, number, number, number][]).map(([name, cat, x, y, dx, dy]) =>
  ({ name, cat, x: x / 10, y: y / 10, dx: dx / 10, dy: dy / 10, col: SPOT_COL[cat], robbed: -1 }));
export const spotByName = (n: string) => SPOTS.find(q => q.name === n)!;
/** Il posto più vicino di una categoria (es. il comando di polizia per chi viene arrestato). */
export function nearestSpot(cat: SpotCat, x: number, y: number) { let best: Spot | null = null, bd = 1e9;
  for (const q of SPOTS) if (q.cat === cat) { const d = hyp(q.dx - x, q.dy - y); if (d < bd) { bd = d; best = q; } } return best!; }
