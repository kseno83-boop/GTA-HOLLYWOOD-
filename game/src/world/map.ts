// Mappa da OpenStreetMap (src/data/map.json, generato da tools/osm_export.py): strade, edifici, collisioni, locali.
import MAP from "../data/map.json";
import { clamp, hyp } from "../core/util";
import { P } from "../core/state";

/** Coordinate in metri, origine nell'angolo nord-ovest, y verso sud. */
export const WW = MAP.w / 10, WH = MAP.h / 10;
export const NX = MAP.nodes.filter((_, i) => i % 2 === 0).map(v => v / 10);
export const NY = MAP.nodes.filter((_, i) => i % 2).map(v => v / 10);

export type RoadType = "primary" | "secondary" | "tertiary" | "unclassified" | "residential" | "living_street" | "service" | "pedestrian" | "footway" | "cycleway" | "steps" | "path" | "ztl";
export interface Road {
  t: RoadType; w: number; car: boolean; ztl: boolean; oneway: boolean; name: string | null; ids: number[];
  x0: number; x1: number; y0: number; y1: number;
}
export interface Edge { n: number; r: Road; fwd: boolean }

const RW: Record<RoadType, number> = { primary: 11, secondary: 10, tertiary: 8.5, unclassified: 7, residential: 6.5, living_street: 5, service: 4, pedestrian: 7, footway: 2.2, cycleway: 2.2, steps: 2.2, path: 1.6, ztl: 7 };
const CARRO = new Set<RoadType>(["primary", "secondary", "tertiary", "unclassified", "residential", "living_street", "service"]);
/** Grafo stradale: per ogni nodo i lati uscenti (fwd = nel verso della way OSM, conta per i sensi unici). */
export const adj: Edge[][] = NX.map(() => []);
export const roads: Road[] = MAP.roads.map(r => {
  const t = MAP.types[r[0] % 100] as RoadType, ids = r.slice(2), xs = ids.map(i => NX[i]), ys = ids.map(i => NY[i]);
  const road: Road = { t, w: RW[t], car: CARRO.has(t), ztl: t === "ztl", oneway: r[0] >= 100, name: r[1] >= 0 ? MAP.names[r[1]] : null, ids,
    x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  for (let i = 0; i < ids.length - 1; i++) { adj[ids[i]].push({ n: ids[i + 1], r: road, fwd: true }); adj[ids[i + 1]].push({ n: ids[i], r: road, fwd: false }); }
  return road;
});
const polys = (a: number[][]) => a.map(f => f.map(v => v / 10));
export const green = polys(MAP.green), water = polys(MAP.water), rivers = polys(MAP.rivers), rails = polys(MAP.rails);

export interface Building { p: number[]; n: number; h: number; s: number; cx: number; cy: number; x0: number; y0: number; x1: number; y1: number; roof: number[] }
const ROOFS = [[178, 82, 64], [150, 70, 58], [196, 104, 70], [120, 108, 126], [166, 88, 84], [138, 118, 140]];
const CELL = 20, grid = new Map<number, Building[]>();
export const buildings: Building[] = MAP.buildings.map((b, k) => {
  const p = b.slice(1).map(v => v / 10), n = p.length / 2; let a2 = 0, cx = 0, cy = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; a2 += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; cx += p[2 * i]; cy += p[2 * i + 1];
    x0 = Math.min(x0, p[2 * i]); x1 = Math.max(x1, p[2 * i]); y0 = Math.min(y0, p[2 * i + 1]); y1 = Math.max(y1, p[2 * i + 1]); }
  const bd: Building = { p, n, h: b[0], s: Math.sign(a2) || 1, cx: cx / n, cy: cy / n, x0, y0, x1, y1, roof: ROOFS[k % ROOFS.length] };
  for (let gx = Math.floor(x0 / CELL); gx <= Math.floor(x1 / CELL); gx++) for (let gy = Math.floor(y0 / CELL); gy <= Math.floor(y1 / CELL); gy++) {
    const key = gx * 1000 + gy; let cell = grid.get(key); if (!cell) grid.set(key, cell = []); cell.push(bd); }
  return bd;
});
function inPoly(b: Building, x: number, y: number) { let c = false; const p = b.p; for (let i = 0, j = b.n - 1; i < b.n; j = i++) {
  const xi = p[2 * i], yi = p[2 * i + 1], xj = p[2 * j], yj = p[2 * j + 1];
  if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function nearestEdge(b: Building, x: number, y: number): [number, number, number] { let best = 1e9, bx = 0, by = 0; const p = b.p;
  for (let i = 0; i < b.n; i++) { const j = (i + 1) % b.n, ax = p[2 * i], ay = p[2 * i + 1], dx = p[2 * j] - ax, dy = p[2 * j + 1] - ay;
    const k = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1), px = ax + k * dx, py = ay + k * dy, d = hyp(x - px, y - py);
    if (d < best) { best = d; bx = px; by = py; } } return [best, bx, by]; }
function nearBuildings(x: number, y: number, r: number) { const out = new Set<Building>();
  for (let gx = Math.floor((x - r) / CELL); gx <= Math.floor((x + r) / CELL); gx++) for (let gy = Math.floor((y - r) / CELL); gy <= Math.floor((y + r) / CELL); gy++)
    for (const b of grid.get(gx * 1000 + gy) || []) out.add(b); return out; }
export function solidAt(x: number, y: number) { for (const b of nearBuildings(x, y, 0)) if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && inPoly(b, x, y)) return true; return false; }
/** Ostacoli rettangolari orientati oltre agli edifici (tavoli del dehors): centro, assi u e n, semi-lati. */
export const solids: { x: number; y: number; ux: number; uy: number; nx: number; ny: number; hu: number; hn: number }[] = [];
function pushSolids(e: { x: number; y: number }, r: number) { let hit = false;
  for (const s of solids) { const rx = e.x - s.x, ry = e.y - s.y; if (Math.abs(rx) > 6 || Math.abs(ry) > 6) continue;
    const a = rx * s.ux + ry * s.uy, b = rx * s.nx + ry * s.ny, ca = clamp(a, -s.hu, s.hu), cb = clamp(b, -s.hn, s.hn), d = hyp(a - ca, b - cb);
    if (d >= r) continue; hit = true; let na: number, nb: number;
    if (d > 0) { na = ca + (a - ca) / d * r; nb = cb + (b - cb) / d * r; }
    else if (s.hu - Math.abs(a) < s.hn - Math.abs(b)) { na = (Math.sign(a) || 1) * (s.hu + r); nb = b; } else { na = a; nb = (Math.sign(b) || 1) * (s.hn + r); }
    e.x = s.x + s.ux * na + s.nx * nb; e.y = s.y + s.uy * na + s.ny * nb; }
  return hit; }
/** Spinge fuori dagli edifici, dagli ostacoli e dentro i bordi della mappa un cerchio di raggio r. */
export function pushOut(e: { x: number; y: number }, r: number) { let hit = pushSolids(e, r);
  for (const b of nearBuildings(e.x, e.y, r)) { if (e.x < b.x0 - r || e.x > b.x1 + r || e.y < b.y0 - r || e.y > b.y1 + r) continue;
    const ins = inPoly(b, e.x, e.y), [d, px, py] = nearestEdge(b, e.x, e.y);
    if (ins) { const ux = (px - e.x) / (d || 1), uy = (py - e.y) / (d || 1); e.x = px + ux * r; e.y = py + uy * r; hit = true; }
    else if (d < r) { e.x = px + (e.x - px) / d * r; e.y = py + (e.y - py) / d * r; hit = true; } }
  if (e.x < 1 || e.y < 1 || e.x > WW - 1 || e.y > WH - 1) { e.x = clamp(e.x, 1, WW - 1); e.y = clamp(e.y, 1, WH - 1); hit = true; }
  return hit; }
export function streetAt(x: number, y: number) { let best = 28, name: string | null = null;
  for (const r of roads) { if (!r.name || x < r.x0 - best || x > r.x1 + best || y < r.y0 - best || y > r.y1 + best) continue;
    for (let i = 0; i < r.ids.length - 1; i++) { const a = r.ids[i], b = r.ids[i + 1], dx = NX[b] - NX[a], dy = NY[b] - NY[a];
      const k = clamp(((x - NX[a]) * dx + (y - NY[a]) * dy) / (dx * dx + dy * dy || 1), 0, 1), d = hyp(x - NX[a] - k * dx, y - NY[a] - k * dy);
      if (d < best) { best = d; name = r.name; } } } return name; }
export function nearestNode(x: number, y: number) { let b = 0, bd = 1e9; for (let i = 0; i < NX.length; i++) { const d = (NX[i] - x) ** 2 + (NY[i] - y) ** 2; if (d < bd && adj[i].length) { bd = d; b = i; } } return b; }

/** Porta e insegna del Bar Hollywood (Corso Magenta 44). */
export const DOOR = { x: MAP.door[0] / 10, y: MAP.door[1] / 10 }, SIGN = { x: MAP.bar[0] / 10, y: MAP.bar[1] / 10 };
/** Punti di interesse illuminati di notte (k = categoria). */
export const POIS = MAP.pois.map(p => ({ k: p[0], x: p[1] / 10, y: p[2] / 10 }));
export interface Place { name: string; kind: "rival" | "food"; x: number; y: number; dx: number; dy: number; col: string }
const PCOL: Record<string, string> = { "BAR MARAMAO": "#ff9f1c", "BAR MORELLO": "#a3e635", "STUZZI SUSHI": "#29f2e4", "GRAN PRIX": "#ffd166" };
/** Altri locali: (x, y) insegna, (dx, dy) porta. */
export const PLACES: Place[] = (MAP.places as [string, string, number, number, number, number][]).map(([name, kind, x, y, dx, dy]) =>
  ({ name, kind: kind as Place["kind"], x: x / 10, y: y / 10, dx: dx / 10, dy: dy / 10, col: PCOL[name] || "#fff" }));
export const placeNear = () => PLACES.find(q => hyp(P.x - q.dx, P.y - q.dy) < 3.5);

/** Inserisce nuovi nodi tra due nodi consecutivi di una strada (pts nell'ordine da a verso b). Serve a deviare una strada
 *  attorno a un ostacolo che OSM non conosce (es. il dehors dell'Hollywood). Ritorna false se a e b non sono consecutivi. */
export function insertNodes(a: number, b: number, pts: { x: number; y: number }[]) {
  for (const r of roads) for (let i = 0; i < r.ids.length - 1; i++) {
    const fwd = r.ids[i] === a && r.ids[i + 1] === b, rev = r.ids[i] === b && r.ids[i + 1] === a; if (!fwd && !rev) continue;
    const ids = pts.map(p => { NX.push(p.x); NY.push(p.y); adj.push([]); return NX.length - 1; }), seq = fwd ? ids : ids.reverse();
    r.ids.splice(i + 1, 0, ...seq);
    const p = r.ids[i], q = r.ids[i + seq.length + 1];
    adj[p] = adj[p].filter(e => !(e.n === q && e.r === r)); adj[q] = adj[q].filter(e => !(e.n === p && e.r === r));
    for (let k = i; k <= i + seq.length; k++) { const m = r.ids[k], n = r.ids[k + 1]; adj[m].push({ n, r, fwd: true }); adj[n].push({ n: m, r, fwd: false }); }
    for (const id of ids) { r.x0 = Math.min(r.x0, NX[id]); r.x1 = Math.max(r.x1, NX[id]); r.y0 = Math.min(r.y0, NY[id]); r.y1 = Math.max(r.y1, NY[id]); }
    return true; }
  return false;
}
