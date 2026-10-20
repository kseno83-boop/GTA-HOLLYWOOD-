// ---------- Incendi, esplosioni e soccorsi (stile GTA) ----------
// I mezzi danneggiati (incidenti, colpi d'arma) fumano, poi prendono fuoco ed esplodono dopo qualche secondo;
// l'esplosione uccide e danneggia tutto attorno e lascia un rottame che brucia. Pompieri e ambulanze accorrono
// a incendi e morti seguendo le strade: i pompieri spengono le fiamme, i paramedici rianimano i corpi.
import { G, P, TEST, peds, cars, parts, scorch, look, viewHalf, type Ped, type Vehicle, type VehType } from "../core/state";
import { R, pick, hyp, angDiff, clamp } from "../core/util";
import { NX, NY, adj, nearestNode, type Road } from "../world/map";
import { sfx } from "../audio/sfx";
import { VT } from "./traffic";
import { makePed, kill, hurt, snap, panic } from "./peds";

/** Punti vita dei mezzi: le moto e i monopattini cedono prima. */
const VHP: Record<VehType, number> = { car: 100, ztl: 100, police: 130, ambulance: 130, fire: 180, truck: 180, rider: 35, maranza: 35, scooter: 25 };
const vhp = (v: Vehicle) => v.hp ?? VHP[v.type];
/** Il mezzo fuma sotto questa frazione dei punti vita. */
export const smoking = (v: Vehicle) => !v.wreck && v.fire === undefined && vhp(v) < VHP[v.type] * .35;

/** Danno a un mezzo; a zero prende fuoco ed esplode dopo qualche secondo. */
export function damageVeh(v: Vehicle, n: number, byPlayer: boolean) {
  if (v.wreck || v.fire !== undefined || (TEST.invuln && v === P.car)) return; v.hp = vhp(v) - n; if (byPlayer) v.byP = true;
  if (v.hp <= 0) ignite(v); }
function ignite(v: Vehicle) {
  v.fire = VT[v.type].bike ? R(2.5, 4) : R(4.5, 7); report("fire", v.x, v.y);
  if (v === P.car) { G.msg = "IL MEZZO BRUCIA! SCENDI!"; G.msgT = 2.5; return; }
  // chi guida scende e scappa
  const driven = v.ai || !!v.mode || !!v.rider; v.ai = false; v.mode = null; v.siren = false; v.v *= .3;
  if (driven) makePed(v.x - Math.sin(v.a) * 1.8, v.y + Math.cos(v.a) * 1.8, Object.assign({}, v.rider || look({}), { st: "flee" as const, t: 8, spd: 5, bub: pick(["Brucia!!", "Scappate!", "Va a fuoco!"]), bubT: 2.5 }));
  v.rider = null; }
function explode(v: Vehicle) {
  v.fire = undefined; v.wreck = true; v.burn = R(25, 40); v.v = 0; v.ai = false; v.mode = null; v.siren = false; v.lights = false; v.hazard = false; v.rider = null;
  sfx.explode(); G.shake = Math.max(G.shake, hyp(v.x - P.x, v.y - P.y) < 40 ? .9 : .3);
  scorch.push({ x: v.x, y: v.y, r: VT[v.type].bike ? 1.6 : 3 }); if (scorch.length > 40) scorch.shift();
  for (let i = 0; i < 26; i++) { const a = R(0, 7), s = R(4, 14); parts.push({ x: v.x, y: v.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, T: R(.4, .9), k: i < 8 ? 3 : 1, r: R(.6, 1.4) }); }
  const big = VT[v.type].bike ? 4 : 6.5;
  for (const p of peds) { if (p.st === "dead") continue; const d = hyp(p.x - v.x, p.y - v.y); if (d < big) kill(p, (p.x - v.x) / (d || 1), (p.y - v.y) / (d || 1), !!v.byP); }
  panic(v.x, v.y, 40);
  if (G.scene === "out") { if (P.car === v) { P.car = null; hurt(TEST.invuln ? 0 : 200); } else if (!P.car) { const d = hyp(P.x - v.x, P.y - v.y); if (d < big) hurt(15 + 70 * (1 - d / big)); }
    else { const d = hyp(P.car.x - v.x, P.car.y - v.y); if (d < big + 2) damageVeh(P.car, 60 * (1 - d / (big + 2)) + 15, true); } }
  for (const o of cars) if (o !== v && o !== P.car) { const d = hyp(o.x - v.x, o.y - v.y); if (d < big + 2) damageVeh(o, 90 * (1 - d / (big + 2)) + 20, !!v.byP); }
  report("fire", v.x, v.y); }

// ---------- interventi ----------
interface Job { kind: "fire" | "medic"; x: number; y: number; t: number; unit: Vehicle | null; stage: "wait" | "drive" | "work" | "back"; wt: number; tt: number }
export const jobs: Job[] = [];
/** Segnala un incendio o un morto: se non c'è già un intervento lì vicino, ne parte uno dopo qualche secondo. */
export function report(kind: Job["kind"], x: number, y: number) {
  if (jobs.some(j => j.kind === kind && j.stage !== "back" && hyp(j.x - x, j.y - y) < 25) || jobs.filter(j => j.kind === kind).length >= 3) return;
  jobs.push({ kind, x, y, t: R(5, 10), unit: null, stage: "wait", wt: 0, tt: 0 }); }
/** Strade dei soccorsi: tutte quelle carrabili più ZTL e isole pedonali, in entrambi i versi. */
const rescueRoad = (r: Road) => r.car || r.ztl || r.t === "pedestrian";
/** Percorso più breve (Dijkstra dal nodo dell'intervento) verso un nodo di partenza fuori dallo schermo, non troppo lontano. */
function plan(tx: number, ty: number): number[] | null {
  const goal = nearestNode(tx, ty), N = NX.length, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), [hw, hh] = viewHalf();
  dist[goal] = 0; const heap: [number, number][] = [[0, goal]]; let best = -1;
  while (heap.length) { let bi = 0; for (let i = 1; i < heap.length; i++) if (heap[i][0] < heap[bi][0]) bi = i; const [d, n] = heap[bi]; heap[bi] = heap[heap.length - 1]; heap.pop();
    if (d > dist[n]) continue; if (d > 700) break;
    const dx = Math.abs(NX[n] - P.x), dy = Math.abs(NY[n] - P.y);
    if ((dx > hw + 8 || dy > hh + 8) && dx < hw + 70 && dy < hh + 70 && d > 40) { best = n; break; }
    for (const e of adj[n]) if (rescueRoad(e.r)) { const nd = d + hyp(NX[e.n] - NX[n], NY[e.n] - NY[n]); if (nd < dist[e.n]) { dist[e.n] = nd; prev[e.n] = n; heap.push([nd, e.n]); } } }
  if (best < 0) return null; const path = [best]; while (path[path.length - 1] !== goal) path.push(prev[path[path.length - 1]]); return path; }
function dispatch(j: Job) { const path = plan(j.x, j.y); if (!path) return false; const n = path[0], m = path[1] ?? n, type = j.kind === "fire" ? "fire" : "ambulance";
  const v: Vehicle = { type, ai: false, tmp: true, mode: "resp", siren: true, x: NX[n], y: NY[n], a: Math.atan2(NY[m] - NY[n], NX[m] - NX[n]), v: 4, prev: n, next: m, road: adj[n].find(e => rescueRoad(e.r))!.r,
    permit: true, lane: 1, col: type === "fire" ? "#c81d25" : "#f4f4f4", honkT: 0, insT: 0, bub: "", bubT: 0, wheelie: 0, path, pi: 1 } as Vehicle;
  cars.push(v); j.unit = v; j.stage = "drive"; return true; }
const CREW = { medic: { shirt: "#f4f4f4", pants: "#f4f4f4", stripes: "#ff7a00", cap: undefined }, fire: { shirt: "#23232b", pants: "#23232b", stripes: "#ffd23f", cap: "#c81d25" } };
function deploy(j: Job) { const v = j.unit!, kind = j.kind === "fire" ? "fire" : "medic"; v.v = 0; v.lights = true; v.siren = false; v.crew = [];
  // i pompieri si fermano a qualche metro dalle fiamme (dal lato del camion), i paramedici accanto al corpo
  const d = hyp(v.x - j.x, v.y - j.y) || 1, back = kind === "fire" ? 3 : .9, ux = (v.x - j.x) / d, uy = (v.y - j.y) / d;
  for (const s of [-1, 1]) { const p = makePed(v.x - Math.sin(v.a) * s * 1.8, v.y + Math.cos(v.a) * s * 1.8, Object.assign(look({}), CREW[kind], { st: "loiter" as const, keep: true, crew: kind, spd: 4.2,
    hx: j.x + ux * back - uy * s * 1.1, hy: j.y + uy * back + ux * s * 1.1 } as Partial<Ped>)); v.crew.push(p); }
  j.stage = "work"; j.wt = kind === "fire" ? 6 : 4; j.tt = 0; }
/** Fine del lavoro: i pompieri spengono i mezzi in fiamme, i paramedici rianimano i corpi nel raggio dell'intervento (25 m, come per le segnalazioni). */
function finish(j: Job) {
  if (j.kind === "fire") { for (const c of cars) if (hyp(c.x - j.x, c.y - j.y) < 10) { if (c.fire !== undefined) { c.fire = undefined; c.wreck = true; c.ai = false; } c.burn = 0; } }
  else for (const p of peds) if (p.st === "dead" && !p.crew && hyp(p.x - j.x, p.y - j.y) < 25) { Object.assign(p, { st: "flee", t: 4, spd: 1.6, hp: undefined, bub: pick(["Cos'è successo?", "Che botta...", "Sono vivo!"]), bubT: 2.5 }); snap(p); }
  for (const p of j.unit!.crew || []) { p.hx = j.unit!.x; p.hy = j.unit!.y; } j.stage = "back"; }
function drive(v: Vehicle, dt: number, j: Job) { const T = VT[v.type], path = v.path!;
  const tn = path[Math.min(v.pi!, path.length - 1)], tx = NX[tn], ty = NY[tn], left = hyp(j.x - v.x, j.y - v.y);
  if (left < 9 || v.pi! >= path.length) { v.v = Math.max(0, v.v - 20 * dt); v.x += Math.cos(v.a) * v.v * dt; v.y += Math.sin(v.a) * v.v * dt; if (v.v < .3) deploy(j); return; }
  if (hyp(tx - v.x, ty - v.y) < Math.max(2, v.v * .35)) { v.pi!++; return; }
  const da = angDiff(v.a, Math.atan2(ty - v.y, tx - v.x)), want = Math.min(T.cruise * 1.4, left * .8 + 4) * (Math.abs(da) > .6 ? .45 : 1);
  v.v += clamp(want - v.v, -T.acc * 2 * dt, T.acc * dt); v.a += clamp(da, -1.3, 1.3) * Math.min(1, dt * (1.6 + v.v * .35));
  v.x += Math.cos(v.a) * v.v * dt; v.y += Math.sin(v.a) * v.v * dt; }
function leave(v: Vehicle) { v.mode = null; v.siren = false; v.lights = false; v.crew = undefined; v.path = undefined; Object.assign(v, snap({ x: v.x, y: v.y })); v.ai = true; v.permit = true; }

// ---------- aggiornamento ----------
export function updEmergency(dt: number) {
  for (const v of cars) {
    if (v.fire !== undefined) { v.fire -= dt; if (Math.random() < dt * 30) emit(v, 1); if (v.fire <= 0) { explode(v); continue; } }
    else if (v.wreck && v.burn! > 0) { v.burn! -= dt; if (Math.random() < dt * 18) emit(v, 1); if (Math.random() < dt * 8) emit(v, 0); }
    else if (smoking(v) && Math.random() < dt * 10) emit(v, 0); }
  for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; if (q.t >= q.T) { parts.splice(i, 1); continue; }
    const drag = q.k === 2 ? 1 : 3; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - drag * dt; q.vy *= 1 - drag * dt; }
  if (parts.length > 500) parts.splice(0, parts.length - 500);
  const [hw, hh] = viewHalf();
  for (let i = jobs.length - 1; i >= 0; i--) { const j = jobs[i], v = j.unit;
    // il mezzo è sparito, è stato rubato o è troppo lontano: intervento annullato
    if (v && (!cars.includes(v) || (v.mode !== "resp" && j.stage !== "back"))) { for (const p of v.crew || []) p.keep = false; jobs.splice(i, 1); continue; }
    if (j.stage === "wait") { if (Math.abs(j.x - P.x) > hw + 80 || Math.abs(j.y - P.y) > hh + 80) { jobs.splice(i, 1); continue; } if ((j.t -= dt) <= 0 && !dispatch(j)) j.t = 3; continue; }
    if (!v) continue;
    if (j.stage === "drive") drive(v, dt, j);
    else if (j.stage === "work") { const crew = v.crew!.filter(p => p.st !== "dead"); if (!crew.length) { finish(j); continue; }
      // al lavoro quando sono arrivati (o dopo 10 s, se qualcosa gli sbarra la strada)
      j.tt += dt; if (j.tt > 10 || crew.every(p => !p.mv || hyp(p.x - j.x, p.y - j.y) < 4.5)) { j.wt -= dt; for (const p of crew) { p.a += angDiff(p.a, Math.atan2(j.y - p.y, j.x - p.x)) * Math.min(1, dt * 8);
        if (j.kind === "fire" && Math.random() < dt * 25) { const a = p.a + R(-.15, .15), s = R(7, 10); parts.push({ x: p.x + Math.cos(p.a) * .5, y: p.y + Math.sin(p.a) * .5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, T: R(.35, .6), k: 2, r: R(.15, .3) }); } } }
      if (j.wt <= 0) finish(j); }
    else if (j.stage === "back") { const crew = v.crew!.filter(p => p.st !== "dead");
      for (const p of crew) if (hyp(p.x - v.x, p.y - v.y) < 2.2) { const k = peds.indexOf(p); if (k >= 0) peds.splice(k, 1); }
      for (const p of v.crew!) if (p.st === "dead") p.keep = false;
      if (!crew.some(p => peds.includes(p))) { leave(v); jobs.splice(i, 1); } } } }
function emit(v: Vehicle, k: number) { const T = VT[v.type], f = R(-.3, .5) * T.L / 2, ca = Math.cos(v.a), sa = Math.sin(v.a);
  parts.push({ x: v.x + ca * f + R(-.4, .4), y: v.y + sa * f + R(-.4, .4), vx: R(-.6, .6) + 1.2, vy: R(-.6, .6) - .8, t: 0, T: k ? R(.35, .7) : R(1.2, 2.2), k, r: k ? R(.3, .6) : R(.4, .8) }); }
