// ---------- Passanti, bande e sbirri ----------
import { G, P, peds, blood, look, activity, say, viewHalf, type Ped, type Look } from "../core/state";
import { R, clamp, pick, hyp, angDiff } from "../core/util";
import { NX, NY, adj, pushOut, nearestNode, DOOR, PLACES } from "../world/map";
import { sfx } from "../audio/sfx";
import { LINES } from "./bar";

/** Livelli di ricercato: Polizia Locale → Polizia di Stato → Carabinieri → Carabinieri+Polizia → reparti speciali. */
export const LEVELS = ["", "POLIZIA LOCALE", "POLIZIA DI STATO", "CARABINIERI", "CARABINIERI + POLIZIA", "REPARTI SPECIALI"];
export const COPLOOK: (Partial<Look> | null)[] = [null, { shirt: "#1f3b73", pants: "#141b33", cap: "#f2f2f2" }, { shirt: "#2f57b0", pants: "#1a2a55", cap: "#1a2a55" }, { shirt: "#15151a", pants: "#15151a", cap: "#15151a", stripes: "#c1121f" },
  { shirt: "#15151a", pants: "#15151a", cap: "#15151a", stripes: "#c1121f" }, { shirt: "#2b3326", pants: "#1d211a", cap: "#0b0b0b" }];
export const copLook = () => COPLOOK[clamp(Math.ceil(G.heat), 1, 5)]!;

/** Aggancia un'entità al lato del grafo stradale più vicino. */
export function snap<T extends { x: number; y: number }>(o: T) { const n = nearestNode(o.x, o.y), e = pick(adj[n]); return Object.assign(o, { prev: n, next: e.n, road: e.r }); }
export function makePed(x: number, y: number, extra: Partial<Ped>) {
  const p = snap(look(Object.assign({ x, y, a: 0, side: Math.random() < .5 ? 1 : -1, j: R(-.7, .7), spd: R(1.1, 1.6), st: "walk", t: 0, stuck: 0, bub: "", bubT: 0 }, extra))) as Ped;
  peds.push(p); return p; }

function spawnPed(cop: boolean, anywhere: boolean) {
  const [hw, hh] = viewHalf();
  for (let t = 0; t < 30; t++) { const n = Math.floor(Math.random() * NX.length), dx = Math.abs(NX[n] - P.x), dy = Math.abs(NY[n] - P.y);
    const inView = dx < hw + 4 && dy < hh + 4; if ((!anywhere && inView) || dx > hw + 55 || dy > hh + 55 || !adj[n].length) continue;
    const e = pick(adj[n]), p = look({ x: NX[n], y: NY[n], a: 0, prev: n, next: e.n, road: e.r, side: Math.random() < .5 ? 1 : -1, j: R(-.7, .7),
      spd: cop ? 5 + Math.ceil(G.heat) * .5 : R(1.1, 1.6), cop, st: (cop ? "chase" : "walk") as Ped["st"], t: 0, stuck: 0, bub: "", bubT: 0 }) as Ped;
    if (cop) Object.assign(p, copLook()); else if (Math.random() < .25) p.stripes = "#111";
    peds.push(p); return p; } }
/** Tre membri di banda davanti a ogni bar rivale. */
export function spawnGangs() { for (const q of PLACES) if (q.kind === "rival") for (let i = 0; i < 3; i++) {
  const a = i * 2.1 + .4, hx = q.dx + Math.cos(a) * 2.2, hy = q.dy + Math.sin(a) * 2.2;
  peds.push(snap(look({ x: hx, y: hy, hx, hy, a: a + Math.PI, st: "loiter", keep: true, gang: q.name, shirt: q.col, stripes: i === 1 ? "#111" : null, spd: 1.4, bub: "", bubT: 0, stuck: 0, t: 0, side: 1, j: 0 })) as Ped); } }
function pedTarget(p: Ped): [number, number] { const ax = NX[p.prev], ay = NY[p.prev], bx = NX[p.next], by = NY[p.next], L = hyp(bx - ax, by - ay) || 1;
  const off = p.road.car ? (p.road.w / 2 + 1.3) * p.side : p.j * Math.min(1, p.road.w / 2 - .4);
  return [bx - (by - ay) / L * off, by + (bx - ax) / L * off]; }
export function panic(x: number, y: number, r: number) { if (Math.random() < .4) sfx.scream(); for (const p of peds) if (!p.cop && p.st !== "dead" && hyp(p.x - x, p.y - y) < r) { p.st = "flee"; p.t = R(6, 10); p.spd = R(4.5, 5.8); if (Math.random() < .3) { p.bub = pick(["Aiuto!", "Scappa!", "Chiamate i carabinieri!", "Oh madonna!"]); p.bubT = 2; } } }
export function crime(v: number) { G.heat = Math.min(5, G.heat + v); G.calm = 0; }
export function hurt(v: number) { P.hp -= v; P.hurtT = .3; if (P.hp <= 0) wasted(); }
function backHome() { G.heat = 0; P.bust = 0; if (P.car) { P.car.v = 0; P.car = null; } P.x = DOOR.x; P.y = DOOR.y; for (let i = peds.length - 1; i >= 0; i--) if (peds[i].cop) peds.splice(i, 1); }
function wasted() { say("SEI MORTO", 3); sfx.groan(); P.hp = 100; backHome(); }
function busted() { say("ARRESTATO!", 3); sfx.whistle(2); backHome(); }
export function kill(p: Ped, dx = 0, dy = 0) { if (p.st === "dead") return; p.st = "dead"; sfx.hit(); p.bub = ""; p.a = Math.atan2(dy, dx) + Math.PI;
  blood.push({ x: p.x + dx * .4, y: p.y + dy * .4, r: .15, R: R(.6, 1), pool: true });
  for (let i = 0; i < 7; i++) { const k = R(.3, 2.2); blood.push({ x: p.x + dx * k + R(-.4, .4), y: p.y + dy * k + R(-.4, .4), r: R(.05, .2) }); }
  while (blood.length > 160) blood.shift(); crime(p.cop ? 1 : .6); panic(p.x, p.y, 30); }
const INSULTS = ["Vai piano, pirla!", "Scendi da quella bici!", "Ma va' a lavurà!", "Siamo in centro, deficiente!", "Rallenta!", "Ma guarda questo...", "Ti sei bevuto il cervello?", "Prima o poi ti stendi!"];
export { INSULTS };
/** Il passante più vicino a (x, y) dice una delle frasi. */
export function insultNear(x: number, y: number, lines = INSULTS) { let best = 11, who: Ped | null = null; for (const p of peds) { if (p.st === "dead" || p.cop || p.bubT > 0) continue; const d = hyp(p.x - x, p.y - y); if (d < best) { best = d; who = p; } }
  if (who) { who.bub = pick(lines); who.bubT = 2.4; if (who.st === "walk" || who.st === "idle") who.a = Math.atan2(y - who.y, x - who.x); } }

export function updPeds(dt: number) {
  const [hw, hh] = viewHalf(), want = Math.round((22 + 40 * activity(G.hour)) * Math.min(1.4, (hw * hh) / 4000 + .5)), cops = Math.min(10, Math.ceil(G.heat) * 2);
  let nc = 0, np = 0; for (const p of peds) if (p.st !== "dead" && !p.keep) p.cop ? nc++ : np++;
  if (np < want) spawnPed(false, !G.started); if (nc < cops) spawnPed(true, false);
  for (let i = peds.length - 1; i >= 0; i--) { const p = peds[i]; if (!p) continue;
    if (!p.keep && (Math.abs(p.x - P.x) > hw + 75 || Math.abs(p.y - P.y) > hh + 75 || (p.cop && G.heat === 0 && Math.abs(p.x - P.x) > hw))) { peds.splice(i, 1); continue; }
    if (p.bubT > 0) p.bubT -= dt; if (p.st === "dead") continue;
    let tx: number, ty: number; const sp = p.spd;
    if (p.st === "chase") { if (G.heat === 0) { p.st = "walk"; p.spd = 1.4; continue; } tx = P.x; ty = P.y;
      const d = hyp(P.x - p.x, P.y - p.y), car = P.car;
      if (d < (car ? 2.6 : 1.3) && (!car || Math.abs(car.v) < 1.2)) { P.bust += dt; if (!car) hurt(dt * (5 + G.heat * 3)); if (P.bust > 1.5) busted(); }
      if (Math.random() < dt * .15) { p.bub = pick(["Fermo! Polizia!", "Alt!", "Mani in alto!"]); p.bubT = 1.6; } }
    else if (p.st === "flee") { p.t -= dt; const d = hyp(p.x - P.x, p.y - P.y) || 1; tx = p.x + (p.x - P.x) / d * 5 + R(-1, 1); ty = p.y + (p.y - P.y) / d * 5 + R(-1, 1);
      if (p.t <= 0) { p.st = p.keep ? "loiter" : "walk"; p.spd = R(1.1, 1.6); } }
    else if (p.st === "loiter") { p.mv = hyp(p.hx! - p.x, p.hy! - p.y) > .4;
      if (p.mv) { tx = p.hx!; ty = p.hy!; } else if (p.seat !== undefined) { p.x = p.hx!; p.y = p.hy!; p.a += angDiff(p.a, p.seat) * Math.min(1, dt * 6);
        if (!(p.bubT > 0) && Math.random() < dt / 14) { p.bub = pick(LINES); p.bubT = 2.2; } continue; } else { const dp = hyp(P.x - p.x, P.y - p.y);
        if (dp < 9 && G.scene === "out" && !p.npc) { p.a += angDiff(p.a, Math.atan2(P.y - p.y, P.x - p.x)) * Math.min(1, dt * 6); if (!(p.bubT > 0) && Math.random() < dt * .35) { p.bub = pick(["Che vuoi?", "Questo è territorio nostro", "Torna all'Hollywood", "Occhio a te", "Sparisci"]); p.bubT = 2.2; } }
        continue; } }
    else if (p.st === "idle") { p.t -= dt; if (p.t <= 0) p.st = "walk"; continue; }
    else { [tx, ty] = pedTarget(p); if (hyp(tx - p.x, ty - p.y) < .5) { const opts = adj[p.next].filter(e => e.n !== p.prev), e = pick(opts.length ? opts : adj[p.next]);
        p.prev = p.next; p.next = e.n; p.road = e.r; if (Math.random() < .08) { p.st = "idle"; p.t = R(2, 6); if (Math.random() < .3) { p.bub = pick(["Che freddo stasera", "Ciao bella!", "Stasera gioca il Milan?", "Andiamo all'Hollywood?", "Uff, il parcheggio..."]); p.bubT = 2.4; } } continue; } }
    const dx = tx - p.x, dy = ty - p.y, d = hyp(dx, dy) || 1, ox = p.x, oy = p.y;
    p.x += dx / d * sp * dt; p.y += dy / d * sp * dt; p.a += angDiff(p.a, Math.atan2(dy, dx)) * Math.min(1, dt * 10); p.anim += sp * dt * 4.5; if (p.seat === undefined || p.st !== "loiter") pushOut(p, .32);
    p.stuck = hyp(p.x - ox, p.y - oy) < sp * dt * .3 ? p.stuck + dt : 0; if (p.stuck > 4 && p.st === "walk" && !p.keep) { peds.splice(i, 1); } } }
