// Dehors del Bar Hollywood (dalle foto e dalle indicazioni dell'utente): due file di tavoli lungo la facciata,
// pergolato di canne con lucine, tenda grigia sopra la porta, sedie in metallo bianche/nere/verdi/rosse, botte, lavagnetta.
// Davanti resta lo spazio giusto per far passare un'auto. A sinistra della porta (guardandola dalla strada) c'è il
// tavolo presidenziale, riservato agli abituali e al protagonista.
// Coordinate locali: u lungo la facciata (verso nord), n dalla facciata verso la strada; origine = porta sulla facciata.
import MAP from "../data/map.json";
import { DOOR, NX, NY, roads, solids, insertNodes } from "./map";

/** Bordo di edificio più vicino alla porta OSM dell'Hollywood: è la facciata su Corso Magenta. */
function facade() {
  let best = { d: 1e9, ax: 0, ay: 0, dx: 0, dy: 0, L: 1 };
  for (const b of MAP.buildings) { const p = b.slice(1).map(v => v / 10), n = p.length / 2;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, ax = p[2 * i], ay = p[2 * i + 1], dx = p[2 * j] - ax, dy = p[2 * j + 1] - ay, L = Math.hypot(dx, dy) || 1;
      const t = Math.max(0, Math.min(1, ((DOOR.x - ax) * dx + (DOOR.y - ay) * dy) / (L * L))), d = Math.hypot(DOOR.x - ax - t * dx, DOOR.y - ay - t * dy);
      if (d < best.d) best = { d, ax, ay, dx, dy, L }; } }
  let ux = best.dx / best.L, uy = best.dy / best.L; if (uy > 0) { ux = -ux; uy = -uy; } // u verso nord
  let nx = -uy, ny = ux; if ((DOOR.x - best.ax) * nx + (DOOR.y - best.ay) * ny < 0) { nx = -nx; ny = -ny; } // n verso la strada
  const t = (DOOR.x - best.ax) * ux + (DOOR.y - best.ay) * uy;
  return { ox: best.ax + ux * t, oy: best.ay + uy * t, ux, uy, nx, ny };
}
export const F = facade();
/** Angolo del sistema locale (asse x = u, asse y = n) per ctx.rotate. */
export const FACADE_ANGLE = Math.atan2(F.uy, F.ux);
export const toWorld = (u: number, n: number) => ({ x: F.ox + F.ux * u + F.nx * n, y: F.oy + F.uy * u + F.ny * n });
export const toLocal = (x: number, y: number) => { const rx = x - F.ox, ry = y - F.oy; return { u: rx * F.ux + ry * F.uy, n: rx * F.nx + ry * F.ny }; };
/** Direzione locale → angolo nel mondo. */
export const dirWorld = (du: number, dn: number) => Math.atan2(F.uy * du + F.ny * dn, F.ux * du + F.nx * dn);

/** Estensione lungo la facciata e profondità del dehors (Corso Magenta qui è larga 7,7 m da muro a muro). */
export const U0 = -7.7, U1 = 9.4, EDGE = 4.4;
/** Centro della corsia rimasta libera davanti al dehors: ci passa giusto un'auto. */
export const LANE = 6.05;
/** Vero se (x, y) è nel tratto di strada davanti al dehors (corsia stretta). */
export const inDehorsZone = (x: number, y: number) => { const l = toLocal(x, y); return l.u > U0 - 4 && l.u < U1 + 4 && l.n > -1 && l.n < 9; };

export const CHAIR = { white: "#e6e1d6", black: "#1d1c22", green: "#2e9e57", red: "#d3333a" };
export interface Table { u: number; n: number; w: number; d: number; pres?: boolean }
/** Sedia: posizione, verso cui guarda (il tavolo), colore; pres = del tavolo presidenziale. */
export interface Chair { u: number; n: number; fu: number; fn: number; col: string; pres?: boolean }
/** Tavolo lungo da birreria con due panche, prima fila a sud della porta. */
export const LONG = { u: -5.2, n: 1.0, w: 2.4, d: .75 };
export const BENCHES = [{ u: -5.2, n: .42, w: 2.4, d: .3 }, { u: -5.2, n: 1.58, w: 2.4, d: .3 }];
/** Tavolo presidenziale (dalla foto dell'utente): tavolo da birreria in legno chiaro con gambe pieghevoli e due panche,
 *  parallelo alla facciata, subito a sinistra dell'entrata guardando la porta dalla strada (lato sud). */
export const PRES: Table = { u: -2.35, n: 1.1, w: 2.0, d: .62, pres: true };
export const PRES_BENCHES = [{ u: PRES.u, n: .52, w: 2.0, d: .28 }, { u: PRES.u, n: 1.68, w: 2.0, d: .28 }];
export const TABLES: Table[] = [PRES,
  // prima fila (contro il muro)
  { u: 1.9, n: 1.0, w: .7, d: .7 }, { u: 3.7, n: 1.0, w: .7, d: .7 }, { u: 6.9, n: 1.0, w: .7, d: .7 }, { u: 8.7, n: .9, w: .7, d: .7 },
  // seconda fila (verso la strada)
  { u: -6.6, n: 3.2, w: .7, d: .7 }, { u: -4.2, n: 3.2, w: .7, d: .7 }, { u: -2.0, n: 3.25, w: .7, d: .7 },
  { u: 2.3, n: 3.2, w: .7, d: .7 }, { u: 4.6, n: 3.25, w: .7, d: .7 }, { u: 7.8, n: 3.2, w: .7, d: .7 }];
const chair = (t: Table, du: number, dn: number, col: string): Chair => ({ u: t.u + du, n: t.n + dn, fu: -du, fn: -dn, col, pres: t.pres });
const [, A1, A2, A3, A4, B1, B2, B3, B4, B5, B6] = TABLES;
export const CHAIRS: Chair[] = [
  chair(A1, 0, .62, CHAIR.white), chair(A1, .62, 0, CHAIR.black), chair(A2, 0, .62, CHAIR.green), chair(A2, .62, 0, CHAIR.red),
  chair(A3, 0, .62, CHAIR.black), chair(A3, .62, 0, CHAIR.black), chair(A4, 0, .62, CHAIR.white),
  chair(B1, 0, .62, CHAIR.black), chair(B1, -.62, 0, CHAIR.white), chair(B2, 0, .62, CHAIR.green), chair(B2, 0, -.62, CHAIR.red),
  chair(B3, 0, .62, CHAIR.red), chair(B3, -.62, 0, CHAIR.green), chair(B4, 0, .62, CHAIR.black), chair(B4, -.62, 0, CHAIR.white),
  chair(B5, 0, .62, CHAIR.green), chair(B5, .62, 0, CHAIR.red), chair(B6, 0, .62, CHAIR.black), chair(B6, -.62, 0, CHAIR.white),
];
export const BARREL = { u: 6.2, n: 2.25, r: .33 };
/** Lavagnetta col menù, appoggiata al muro a sinistra della porta. */
export const BOARD = { u: -1.05, n: .2 };
/** Coperture: canne a sud e a nord, tenda grigia davanti alla porta. */
export const ROOFS = [{ kind: "canne", u0: U0, u1: -.95 }, { kind: "tenda", u0: -.95, u1: 2.6 }, { kind: "canne", u0: 2.6, u1: U1 }] as const;
export const POSTS = [U0, -3.3, -.95, 2.6, 6, U1];

export interface Seat { x: number; y: number; a: number; pres?: boolean }
/** Posti a sedere: sedie + panche del tavolo lungo. a = angolo nel mondo verso il tavolo. */
export const SEATS: Seat[] = [
  ...CHAIRS.map(c => ({ ...toWorld(c.u, c.n), a: dirWorld(c.fu, c.fn), pres: c.pres })),
  ...[-1.75, -2.35, -2.95].flatMap(u => [{ ...toWorld(u, PRES_BENCHES[0].n), a: dirWorld(0, 1), pres: true }, { ...toWorld(u, PRES_BENCHES[1].n), a: dirWorld(0, -1), pres: true }]),
  ...[-6, -5.2, -4.4].flatMap(u => [{ ...toWorld(u, BENCHES[0].n), a: dirWorld(0, 1) }, { ...toWorld(u, BENCHES[1].n), a: dirWorld(0, -1) }]),
];
/** Punto da cui escono e rientrano i clienti del dehors (soglia della porta). */
export const THRESHOLD = toWorld(0, .5);

// la porta dell'Hollywood (ingresso, ritorno dopo arresto/morte) è sulla soglia, non al centro della strada OSM
Object.assign(DOOR, toWorld(0, .9));

// tavoli, panche e botte sono solidi (giocatore, auto, passanti)
const box = (u: number, n: number, w: number, d: number) => solids.push({ ...toWorld(u, n), ux: F.ux, uy: F.uy, nx: F.nx, ny: F.ny, hu: w / 2, hn: d / 2 });
box(LONG.u, (BENCHES[0].n + BENCHES[1].n) / 2, LONG.w, BENCHES[1].n - BENCHES[0].n + BENCHES[0].d);
box(PRES.u, (PRES_BENCHES[0].n + PRES_BENCHES[1].n) / 2, PRES.w, PRES_BENCHES[1].n - PRES_BENCHES[0].n + PRES_BENCHES[0].d);
for (const t of TABLES) box(t.u, t.n, t.w, t.d);
box(BARREL.u, BARREL.n, BARREL.r * 2, BARREL.r * 2);

/** Corso Magenta in OSM è un unico segmento che passa a ~2,8 m dalla facciata: lo si fa deviare nella corsia libera,
 *  così auto, bici e pedoni passano davanti al dehors invece che in mezzo ai tavoli. */
function detour() {
  let best: { a: number; b: number; d: number } | null = null;
  for (const r of roads) if (r.name === "Corso Magenta") for (let i = 0; i < r.ids.length - 1; i++) {
    const a = r.ids[i], b = r.ids[i + 1], la = toLocal(NX[a], NY[a]), lb = toLocal(NX[b], NY[b]);
    if (Math.min(la.u, lb.u) > U0 - 10 || Math.max(la.u, lb.u) < U1 + 10) continue; // il segmento deve coprire tutto il dehors
    const d = Math.abs((la.n + lb.n) / 2); if (!best || d < best.d) best = { a, b, d }; }
  if (!best) return;
  const la = toLocal(NX[best.a], NY[best.a]), lb = toLocal(NX[best.b], NY[best.b]), nAt = (u: number) => la.n + (lb.n - la.n) * (u - la.u) / (lb.u - la.u);
  let pts = [U0 - 9, U0 - 2.5, U1 + 2.5, U1 + 9].map((u, i) => toWorld(u, i === 0 || i === 3 ? nAt(u) : LANE));
  if (la.u > lb.u) pts = pts.reverse();
  insertNodes(best.a, best.b, pts);
}
detour();
