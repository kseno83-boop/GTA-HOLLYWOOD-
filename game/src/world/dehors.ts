// Dehors del Bar Hollywood (dalla foto dell'utente): pergolato di canne con lucine, tenda grigia sopra la porta,
// tavoli in legno con panche, sedie in metallo bianche/nere/verdi/rosse, botte, lavagnetta.
// Coordinate locali: u lungo la facciata (verso nord), n dalla facciata verso la strada; origine = porta sulla facciata.
import MAP from "../data/map.json";
import { DOOR, solids } from "./map";

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
/** Direzione locale → angolo nel mondo. */
export const dirWorld = (du: number, dn: number) => Math.atan2(F.uy * du + F.ny * dn, F.ux * du + F.nx * dn);

export const CHAIR = { white: "#e6e1d6", black: "#1d1c22", green: "#2e9e57", red: "#d3333a" };
export interface Table { u: number; n: number; w: number; d: number }
/** Sedia: posizione e verso cui guarda (il tavolo). */
export interface Chair { u: number; n: number; fu: number; fn: number; col: string }
/** Il pergolato finisce a n = 2,05: oltre passano pedoni e mezzi (in OSM il centro strada è a ~2,8 m dalla facciata). */
export const EDGE = 2.05;
export const LONG = { u: -4.2, n: 1.0, w: 2.4, d: .75 };
export const BENCHES = [{ u: -4.2, n: .42, w: 2.4, d: .3 }, { u: -4.2, n: 1.58, w: 2.4, d: .3 }];
export const TABLES: Table[] = [{ u: -6.9, n: 1.05, w: .7, d: .7 }, { u: -1.8, n: 1.0, w: .7, d: .7 }, { u: 1.8, n: .9, w: .7, d: .7 },
  { u: 3.6, n: 1.0, w: .7, d: .7 }, { u: 6.8, n: 1.0, w: .7, d: .7 }, { u: 8.7, n: .85, w: .7, d: .7 }];
const chair = (t: Table, du: number, dn: number, col: string): Chair => ({ u: t.u + du, n: t.n + dn, fu: -du, fn: -dn, col });
export const CHAIRS: Chair[] = [
  chair(TABLES[0], 0, .62, CHAIR.white), chair(TABLES[0], -.62, 0, CHAIR.black),
  chair(TABLES[1], 0, .62, CHAIR.green), chair(TABLES[1], -.62, 0, CHAIR.red),
  chair(TABLES[2], 0, .62, CHAIR.white), chair(TABLES[2], .62, 0, CHAIR.black),
  chair(TABLES[3], 0, .62, CHAIR.green), chair(TABLES[3], .62, 0, CHAIR.red),
  chair(TABLES[4], 0, .62, CHAIR.black), chair(TABLES[4], .62, 0, CHAIR.black),
  chair(TABLES[5], 0, .62, CHAIR.white),
];
export const BARREL = { u: 5.3, n: 1.65, r: .33 };
/** Lavagnetta col menù, appoggiata al muro a sinistra della porta. */
export const BOARD = { u: -1.2, n: .2 };
/** Coperture: canne a sud e a nord, tenda grigia davanti alla porta. */
export const ROOFS = [{ kind: "canne", u0: -7.7, u1: -.95 }, { kind: "tenda", u0: -.95, u1: 2.6 }, { kind: "canne", u0: 2.6, u1: 9.4 }] as const;
export const POSTS = [-7.7, -3.3, -.95, 2.6, 6, 9.4];

/** Posti a sedere: sedie + panche del tavolo lungo. a = angolo nel mondo verso il tavolo. */
export const SEATS = [
  ...CHAIRS.map(c => ({ ...toWorld(c.u, c.n), a: dirWorld(c.fu, c.fn) })),
  ...[-5, -4.2, -3.4].flatMap(u => [{ ...toWorld(u, BENCHES[0].n), a: dirWorld(0, 1) }, { ...toWorld(u, BENCHES[1].n), a: dirWorld(0, -1) }]),
];
/** Punto da cui escono e rientrano i clienti del dehors (soglia della porta). */
export const THRESHOLD = toWorld(0, .5);

// tavoli, panche e botte sono solidi (giocatore, auto, passanti)
const box = (u: number, n: number, w: number, d: number) => solids.push({ ...toWorld(u, n), ux: F.ux, uy: F.uy, nx: F.nx, ny: F.ny, hu: w / 2, hn: d / 2 });
box(LONG.u, (BENCHES[0].n + BENCHES[1].n) / 2, LONG.w, BENCHES[1].n - BENCHES[0].n + BENCHES[0].d);
for (const t of TABLES) box(t.u, t.n, t.w, t.d);
box(BARREL.u, BARREL.n, BARREL.r * 2, BARREL.r * 2);
