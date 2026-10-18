// ---------- Traffico ----------
// Auto solo su strade aperte e nel verso dei sensi unici OSM; in ZTL solo chi ha il permesso.
// Volanti di ronda la sera, ambulanze e pompieri rari, rider e maranza che ignorano i sensi unici; di notte camion persi e auto contromano.
import { G, P, cars, peds, look, activity, viewHalf, CARCOL, type Ped, type Vehicle, type VehType } from "../core/state";
import { R, clamp, pick, hyp, angDiff, rnd } from "../core/util";
import { NX, NY, adj, roads, pushOut, solidAt, type Edge, type Road } from "../world/map";
import { sfx } from "../audio/sfx";
import { inDehorsZone } from "../world/dehors";
import { makePed, snap, crime, hurt, insultNear, copLook, INSULTS } from "./peds";

export interface VehSpec { L: number; W: number; cruise: number; max: number; acc: number; bike?: boolean }
export const VT: Record<VehType, VehSpec> = { car: { L: 4.3, W: 1.9, cruise: 10, max: 32, acc: 12 }, ztl: { L: 4.3, W: 1.9, cruise: 4.5, max: 30, acc: 11 }, police: { L: 4.6, W: 1.95, cruise: 8, max: 34, acc: 13 },
  ambulance: { L: 5.8, W: 2.2, cruise: 11, max: 28, acc: 9 }, fire: { L: 8.5, W: 2.5, cruise: 9, max: 24, acc: 7 }, truck: { L: 13, W: 2.6, cruise: 4, max: 20, acc: 5 },
  rider: { L: 1.8, W: .6, cruise: 7, max: 12, acc: 8, bike: true }, maranza: { L: 1.8, W: .6, cruise: 8.5, max: 14, acc: 10, bike: true }, scooter: { L: 1.1, W: .5, cruise: 7.5, max: 11, acc: 9, bike: true } };
export const STEAL: Record<VehType, string> = { car: "ruba l'auto", ztl: "ruba l'auto", police: "ruba la volante", ambulance: "ruba l'ambulanza", fire: "ruba il camion dei pompieri", truck: "ruba il camion", rider: "ruba la bici", maranza: "ruba la bici", scooter: "ruba il monopattino" };
const DRIVER: Record<string, string[]> = { car: ["Spostati!", "Oh! Ti muovi?", "Pirla!", "Ma dove vai?"], ztl: ["Ho il permesso, eh!", "Permesso, permesso..."], truck: ["Ma dove sono finito?!", "Navigatore maledetto!", "Qui non ci passo..."] };
// sensi unici: bici e monopattini li ignorano, così come mezzi con sirena e chi va contromano apposta
export const useEdge = (v: Pick<Vehicle, "type" | "kind" | "siren">, e: Edge) => !e.r.oneway || e.fwd || v.kind === "wrong" || !!v.siren || !!VT[v.type].bike;
const useRoad = (permit: boolean | undefined, r: Road) => r.car || (!!permit && (r.ztl || r.t === "pedestrian"));
let evT = R(60, 150);

/** Auto parcheggiate lungo le strade carrabili (sempre le stesse: casuale con seme). */
export function parkCars() {
  for (const r of roads) { if (!r.car || r.t === "service" || r.t === "primary") continue;
    for (let i = 0; i < r.ids.length - 1; i++) { const a = r.ids[i], b = r.ids[i + 1], L = hyp(NX[b] - NX[a], NY[b] - NY[a]), an = Math.atan2(NY[b] - NY[a], NX[b] - NX[a]);
      for (let s = 6; s < L - 6; s += 14) { if (rnd() > .13) continue; const side = rnd() < .5 ? 1 : -1, off = r.w / 2 + .3, k = s / L;
        const c = { type: "car", x: NX[a] + (NX[b] - NX[a]) * k - Math.sin(an) * off * side, y: NY[a] + (NY[b] - NY[a]) * k + Math.cos(an) * off * side, a: an + (rnd() < .5 ? 0 : Math.PI), v: 0,
          col: CARCOL[Math.floor(rnd() * CARCOL.length)], prev: a, next: b, road: r, lane: 1, honkT: 0, insT: 0, bub: "", bubT: 0, wheelie: 0 } as Vehicle;
        const fx = Math.cos(c.a) * 2.3, fy = Math.sin(c.a) * 2.3, sx = -fy * .45, sy = fx * .45;
        if (![[0, 0], [fx + sx, fy + sy], [fx - sx, fy - sy], [-fx + sx, -fy + sy], [-fx - sx, -fy - sy]].some(([u, v]) => solidAt(c.x + u, c.y + v)) && !cars.some(o => hyp(o.x - c.x, o.y - c.y) < 6)) cars.push(c); } } } }

function boxLocal(e: { x: number; y: number }, c: Vehicle) { const ca = Math.cos(c.a), sa = Math.sin(c.a), rx = e.x - c.x, ry = e.y - c.y; return [rx * ca + ry * sa, -rx * sa + ry * ca, ca, sa]; }
/** Distanza di un punto dal rettangolo del mezzo. */
export function boxDist(e: { x: number; y: number }, c: Vehicle) { const T = VT[c.type], [f, l] = boxLocal(e, c); return hyp(Math.max(0, Math.abs(f) - T.L / 2), Math.max(0, Math.abs(l) - T.W / 2)); }
/** Spinge un punto fuori dal rettangolo del mezzo (allargato di pad). */
export function boxPush(e: { x: number; y: number }, c: Vehicle, pad: number) { const T = VT[c.type], [f, l, ca, sa] = boxLocal(e, c), hl = T.L / 2 + pad, hw = T.W / 2 + pad;
  if (Math.abs(f) >= hl || Math.abs(l) >= hw) return false; const pf = hl - Math.abs(f), pl = hw - Math.abs(l);
  if (pf < pl) { const s = Math.sign(f) || 1; e.x += ca * pf * s; e.y += sa * pf * s; } else { const s = Math.sign(l) || 1; e.x -= sa * pl * s; e.y += ca * pl * s; } return true; }
export function nearVeh() { let best = 1.4, c: Vehicle | null = null; for (const o of cars) { if (Math.abs(o.x - P.x) > 10 || Math.abs(o.y - P.y) > 10) continue; const d = boxDist(P, o); if (d < best) { best = d; c = o; } } return c; }
export function crashBike(v: Vehicle) { v.ai = false; v.v = 0; v.wheelie = 0; if (v.rider) makePed(v.x + 1, v.y, Object.assign({}, v.rider, { st: "flee", t: 5, spd: 5, bub: "Ma sei fuori?!", bubT: 2.5 } as Partial<Ped>)); v.rider = null; crime(.3); }
function spawnVeh(type: VehType, o: Partial<Vehicle> = {}, anywhere = false) {
  const T = VT[type], [hw, hh] = viewHalf(), permit = o.permit ?? type !== "car";
  const cand: number[] = []; for (let i = 0; i < NX.length; i++) { const dx = Math.abs(NX[i] - P.x), dy = Math.abs(NY[i] - P.y); if (dx < hw + 60 && dy < hh + 60 && (anywhere || dx > hw + 6 || dy > hh + 6)) cand.push(i); }
  for (let k = 0; k < 20 && cand.length; k++) { const n = pick(cand);
    let opts = adj[n].filter(e => useRoad(permit, e.r) && useEdge(Object.assign({ type }, o), e)); if (o.ztlOnly) opts = opts.filter(e => !e.r.car); if (!opts.length) continue;
    const e = pick(opts), v = Object.assign({ type, ai: true, tmp: true, x: NX[n], y: NY[n], a: Math.atan2(NY[e.n] - NY[n], NX[e.n] - NX[n]), v: T.cruise * .6, prev: n, next: e.n, road: e.r, permit, lane: 1,
      col: pick(CARCOL), honkT: 0, insT: 0, bub: "", bubT: 0, wheelie: 0 }, o) as Vehicle;
    if (T.bike) { if (type === "rider") v.box = pick(["#2ec4b6", "#ff6b35", "#ffd23f"]); v.rider = look(type === "rider" ? { cap: "#202020", shirt: v.box } : { shirt: "#1b1b1b", stripes: "#e8e8e8", cap: "#111" }); }
    cars.push(v); return v; } }
function laneOff(v: Vehicle) { const r = v.road; if (VT[v.type].bike) return (inDehorsZone(v.x, v.y) ? .7 : r.w / 2 - .7) * v.lane; if (!r.car) return 0; if (r.oneway) return v.kind === "wrong" ? r.w / 5 : 0; return (r.w > 7.5 ? r.w / 4 : r.w / 5) * v.lane; }
/** Volante all'inseguimento: punta il giocatore, se è a piedi e vicino si ferma e fa scendere due agenti. */
function chase(v: Vehicle, dt: number) { const T = VT[v.type], d = hyp(P.x - v.x, P.y - v.y);
  if (!P.car && d < 9) { v.v = Math.max(0, v.v - 25 * dt); if (v.v < .5 && !v.deployed) { v.deployed = true; v.mode = null; v.ai = false; v.inLane = true; v.lights = true; v.siren = false;
      for (const s of [-1, 1]) makePed(v.x - Math.sin(v.a) * s * 1.6, v.y + Math.cos(v.a) * s * 1.6, Object.assign({ cop: true, st: "chase", spd: 5 + Math.ceil(G.heat) * .5 } as Partial<Ped>, copLook())); }
    return; }
  const da = angDiff(v.a, Math.atan2(P.y - v.y, P.x - v.x)), want = clamp(d * .8, 6, T.max * .65) * (Math.abs(da) > 1.2 ? .4 : 1);
  v.v += clamp(want - v.v, -T.acc * 2 * dt, T.acc * dt); v.a += clamp(da, -1, 1) * Math.min(1, dt * (1.5 + v.v * .3));
  v.x += Math.cos(v.a) * v.v * dt; v.y += Math.sin(v.a) * v.v * dt;
  const f = { x: v.x + Math.cos(v.a) * 1.4, y: v.y + Math.sin(v.a) * 1.4 }, b = { x: v.x - Math.cos(v.a) * 1.4, y: v.y - Math.sin(v.a) * 1.4 };
  if (+pushOut(f, .95) | +pushOut(b, .95)) { v.x = (f.x + b.x) / 2; v.y = (f.y + b.y) / 2; v.v *= .6; v.stuckT = (v.stuckT || 0) + dt; if (v.stuckT > 2) { v.a += Math.PI / 2; v.stuckT = 0; } } }

export function updVeh(dt: number) {
  const [hw, hh] = viewHalf(), h = G.hour, night = h >= 22 || h < 5, eve = h >= 18 || h < 2, cnt: Record<string, number> = {}, init = !G.started;
  for (const c of cars) if (c.tmp) cnt[c.kind || c.type] = (cnt[c.kind || c.type] || 0) + 1;
  const n = (k: string) => cnt[k] || 0;
  if (n("car") < Math.round(3 + 9 * activity(h))) spawnVeh("car", {}, init);
  else if (n("ztl") < 1 && h >= 7 && h < 20 && Math.random() < dt * .03) spawnVeh("ztl", { ztlOnly: true, col: pick(["#c9ccd6", "#2b2b33", "#8a93a0"]) }, init);
  else if (n("patrol") < (eve ? (h >= 21 || h < 1 ? 2 : 1) : 0)) spawnVeh("police", { kind: "patrol" }, init);
  else if (n("chase") < (G.heat >= 2 ? Math.min(3, Math.ceil(G.heat) - 1) : 0)) spawnVeh("police", { kind: "chase", mode: "chase", siren: true });
  else if (n("rider") < Math.round(1 + 3 * Math.max(Math.exp(-((h - 13) ** 2) / 2), Math.exp(-((h - 20.5) ** 2) / 3)))) spawnVeh("rider", {}, init);
  else if (n("maranza") + n("scooter") < (h >= 15 || h < 2 ? 4 : 1)) spawnVeh(Math.random() < .5 ? "maranza" : "scooter", {}, init);
  else if (night && n("truck") < 1 && Math.random() < dt / 90) spawnVeh("truck", { lane: 0, hazard: true, col: "#d8d4cc" });
  else if (night && n("wrong") < 1 && Math.random() < dt / 70) spawnVeh("car", { kind: "wrong", lane: -1, dist: R(30, 70), bub: "Tanto è un attimo!", bubT: 2.5 });
  if (G.started && (evT -= dt) <= 0) { evT = R(150, 320); const t = Math.random() < .7 ? "ambulance" : "fire"; spawnVeh(t, { siren: true, col: t === "fire" ? "#c81d25" : "#f4f4f4" }); }
  for (let i = cars.length - 1; i >= 0; i--) { const v = cars[i]; if (v === P.car) continue; const T = VT[v.type];
    if (v.bubT > 0) v.bubT -= dt; v.honkT -= dt; v.insT -= dt;
    if (v.tmp && (Math.abs(v.x - P.x) > hw + 90 || Math.abs(v.y - P.y) > hh + 90)) { cars.splice(i, 1); continue; }
    if (v.mode === "chase") { if (G.heat === 0) { v.mode = null; v.siren = false; snap(v); v.ai = true; } else { chase(v, dt); continue; } }
    if (!v.ai) continue;
    if (v.type === "police" && G.heat > 0 && !v.deployed && hyp(v.x - P.x, v.y - P.y) < 50) { v.mode = "chase"; v.siren = true; continue; }
    const ax = NX[v.prev], ay = NY[v.prev], bx = NX[v.next], by = NY[v.next], L = hyp(bx - ax, by - ay) || 1, off = laneOff(v);
    const tx = bx - (by - ay) / L * off, ty = by + (bx - ax) / L * off;
    if (hyp(tx - v.x, ty - v.y) < Math.max(1.6, v.v * .3)) {
      const opts = adj[v.next].filter(e => e.n !== v.prev && useRoad(v.permit, e.r) && useEdge(v, e)), e = opts.length ? pick(opts) : adj[v.next].find(e => e.n === v.prev);
      if (!e) { v.ai = false; v.v = 0; continue; } v.prev = v.next; v.next = e.n; v.road = e.r; continue; }
    let want = T.cruise * (v.road.car ? 1 : .6);
    if (T.bike && v.type !== "rider") { if (v.wheelie > 0) { v.wheelie -= dt; want *= 1.4; } else if (Math.random() < dt * .1) { v.wheelie = R(1.2, 3); insultNear(v.x, v.y); } }
    if (T.bike && v.insT <= 0 && (v.wheelie > 0 || !v.road.car) && Math.random() < dt * .6) { v.insT = R(4, 8); insultNear(v.x, v.y, v.road.car ? INSULTS : INSULTS.concat(["Qui è isola pedonale!", "Scendi dalla bici, qui si cammina!"])); }
    const ta = Math.atan2(ty - v.y, tx - v.x), da = angDiff(v.a, ta); if (Math.abs(da) > .5) want *= .45;
    const ahead = T.L / 2 + 2.5 + v.v * .8, ca = Math.cos(v.a), sa = Math.sin(v.a); let block: unknown = null;
    const check = (e: { x: number; y: number }, w: number) => { const rx = e.x - v.x, ry = e.y - v.y, f = rx * ca + ry * sa, l = -rx * sa + ry * ca; if (f > T.L / 2 - .3 && f < ahead && Math.abs(l) < T.W / 2 + w) block = e; };
    if (v.ghost && v.ghost > 0) v.ghost -= dt; else {
      if (!P.car && G.scene === "out") check(P, .5);
      { const pw = inDehorsZone(v.x, v.y) ? .15 : .4; for (const p of peds) if (p.st !== "dead" && Math.abs(p.x - v.x) < ahead + 2 && Math.abs(p.y - v.y) < ahead + 2) check(p, pw); }
      for (const o of cars) if (o !== v && (o.ai || o === P.car || o.inLane) && Math.abs(o.x - v.x) < ahead + 8 && Math.abs(o.y - v.y) < ahead + 8) check(o, VT[o.type].W / 2); }
    if (block) { want = 0; v.blockT = (v.blockT || 0) + dt;
      if (v.blockT > 1.2 && v.honkT <= 0 && !T.bike) { v.honkT = R(2.5, 4.5); if (hyp(v.x - P.x, v.y - P.y) < 40) sfx.horn(); v.bub = pick(DRIVER[v.type] || DRIVER.car); v.bubT = 2; }
      if (v.blockT > 7) { v.ghost = 2.5; v.blockT = 0; } } else v.blockT = 0;
    if (v.kind === "wrong" && (v.dist! -= v.v * dt) <= 0) { v.ai = false; v.v = 0; v.inLane = true; v.hazard = true; v.bub = "Due minuti e vado!"; v.bubT = 3; continue; }
    if (v.type === "truck" && Math.random() < dt * .05) { v.bub = pick(DRIVER.truck); v.bubT = 2.5; if (hyp(v.x - P.x, v.y - P.y) < 40) sfx.horn(); }
    v.v += clamp(want - v.v, -T.acc * 1.8 * dt, T.acc * dt);
    v.a += clamp(da, -1.2, 1.2) * Math.min(1, dt * (1.5 + v.v * .4));
    v.x += Math.cos(v.a) * v.v * dt; v.y += Math.sin(v.a) * v.v * dt;
    if (!P.car && G.scene === "out" && v.v > 3 && boxPush(P, v, .35)) { hurt(v.v * 1.5); G.shake = .3; sfx.hit(); v.bub = "Ma guarda dove vai!"; v.bubT = 2; } } }
