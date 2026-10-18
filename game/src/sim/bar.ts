// ---------- Bar Hollywood (interno) ----------
// Pianta: bancone a sinistra (ovest) senza sgabelli, si beve in piedi; tavolone da 8 a destra (est);
// maxischermo sulla parete sud davanti al tavolone; porta a sud.
import { G, P, look, say, mouse, touchFire, type Body } from "../core/state";
import { R, clamp, pick, hyp, angDiff, TOUCH } from "../core/util";
import { DOOR } from "../world/map";
import { sfx } from "../audio/sfx";
import { milanLive, playing } from "./football";
import { inputVec, screenToWorld, shoot } from "./player";

export const BAR = { door: { x: 5.4, y: 11.3 }, hub: { x: 5.4, y: 9.3 }, order: { x: 2.45, y: 9.3 } };
export const TABLE = [10.5, 3.0, 1.8, 4.6], SCREEN = [9.3, 10.3, 4.2, .35];
/** Rettangoli solidi [x, y, w, h]: i primi 5 sono i muri. */
export const OBST = [[0, 0, 16, .35], [0, 0, .35, 11], [15.65, 0, .35, 11], [0, 10.65, 4.6, .35], [6.2, 10.65, 9.8, .35],
  [.35, .9, .5, 8], [2, 1, .9, 7.6], [13.5, .35, 2.15, 2.1], [9.15, 9.05, 4.5, 1.6], TABLE];
export interface Slot { x: number; y: number; a: number; kind: "bancone" | "tavolo"; via: [number, number][] }
export const SLOTS: Slot[] = [];
for (let y = 1.6; y < 8; y += 1) SLOTS.push({ x: 3.35, y, a: Math.PI, kind: "bancone", via: [[5.4, y], [3.35, y]] });
for (const y of [3.55, 4.65, 5.75, 6.85]) { SLOTS.push({ x: 9.95, y, a: 0, kind: "tavolo", via: [[8.9, 8.5], [8.9, y], [9.95, y]] });
  SLOTS.push({ x: 12.85, y, a: Math.PI, kind: "tavolo", via: [[13.4, 8.5], [13.4, y], [12.85, y]] }); }
/** Chiacchiere generiche degli avventori (anche nel dehors). */
export const LINES = ["Uno spritz!", "Il solito, grazie", "Un Campari", "Ma va là!", "Domani si lavora...", "Ancora una birra", "Offro io stasera", "Qui si sta bene", "Sta zitto va'", "Un caffè corretto", "Chi fa il mister stasera?", "Ai miei tempi Van Basten..."];

export interface Guest extends Body {
  slot: Slot; team: string | null; cheer: number; t: number; st: "walk" | "sit" | "stand" | "order" | "out";
  path: [number, number][]; wait?: number; t2?: number;
  /** Personaggio fisso (vedi src/characters). */
  npc?: string;
}
export const guests: Guest[] = [];
export const barista = look({ x: 1.4, y: 4, a: 0, ty: 4, shirt: "#ece6da", apron: "#1d1d22", hair: "#2b1d14", bub: "", bubT: 0, moving: false, npc: undefined as string | undefined });
let guestT = 0;
export const DRINKS = Array.from({ length: 14 }, () => [10.6 + Math.random() * 1.6, 3.2 + Math.random() * 4.2, pick(["#f3b33d", "#ff6b3d", "#f6f0d0", "#c2185b"])] as [number, number, string]);
/** Avventori attesi per ora del giorno (chiuso dalle 2 alle 6), di più quando gioca il Milan. */
export const barTarget = (h: number) => { const b = h >= 2 && h < 6 ? 0 : h < 9.5 ? 5 : h < 12 ? 3 : h < 14.5 ? 5 : h < 17.5 ? 3 : h < 21.5 ? 10 : 7; return b ? Math.min(SLOTS.length - 1, b + (milanLive() ? 4 : 0)) : 0; };
export const freeSlots = () => SLOTS.filter(s => !guests.some(g => g.slot === s));
export function newGuest(seated: boolean, extra: Partial<Guest> = {}, slot?: Slot) { const free = freeSlots(); if (!free.length) return;
  const tav = free.filter(f => f.kind === "tavolo"), s = slot ?? (milanLive() && tav.length && Math.random() < .7 ? pick(tav) : pick(free));
  const r = Math.random(), g = look({ x: BAR.door.x, y: BAR.door.y, a: -Math.PI / 2, slot: s, team: r < .62 ? "MILAN" : r < .72 ? "INTER" : null, cheer: 0, bub: "", bubT: 0, t: R(40, 110), st: "walk", path: [] }) as Guest;
  if (g.team === "MILAN" && Math.random() < .6) { g.stripes = "#111"; g.shirt = "#d3121e"; } if (g.team === "INTER" && Math.random() < .6) { g.stripes = "#111"; g.shirt = "#1446b8"; }
  Object.assign(g, extra);
  if (seated) { Object.assign(g, { x: s.x, y: s.y, a: s.a, st: s.kind === "tavolo" ? "sit" : "stand", path: [], t: extra.t ?? R(5, 90) }); }
  else { g.st = "walk"; g.path = [[BAR.hub.x, BAR.hub.y]]; if (s.kind === "tavolo") g.path.push([BAR.order.x, BAR.order.y], [BAR.hub.x, BAR.hub.y]); g.path.push(...s.via); }
  guests.push(g); return g; }
/** Chiamata all'ingresso: popola il bar in base all'ora. */
export const barHooks = { onEnter: [] as (() => void)[], onUpdate: [] as ((dt: number) => void)[] };
export function enterBar() { if (barTarget(G.hour) === 0) { say("L'Hollywood è chiuso. Riapre alle 6:00."); return; }
  G.scene = "bar"; sfx.door(); P.car = null; P.x = BAR.hub.x; P.y = 9.9; P.a = -Math.PI / 2; guests.length = 0;
  for (const f of barHooks.onEnter) f();
  for (let i = 0; i < barTarget(G.hour) - 2; i++) newGuest(true); say("BAR HOLLYWOOD", 2); }
export function updBar(dt: number) {
  const [ix, iy] = inputVec(), sp = 4.6; P.x += ix * sp * dt; P.y += iy * sp * dt; P.cool -= dt; P.moving = !!(ix || iy);
  if (P.moving) { P.anim += sp * dt * 4.5; if (TOUCH) P.a += angDiff(P.a, Math.atan2(iy, ix)) * Math.min(1, dt * 12); }
  if (!TOUCH) { const [wx, wy] = screenToWorld(mouse.x, mouse.y); P.a = Math.atan2(wy - P.y, wx - P.x); }
  for (const [x, y, w, h] of OBST) { const cx = clamp(P.x, x, x + w), cy = clamp(P.y, y, y + h), d = hyp(P.x - cx, P.y - cy);
    if (d < .33) { if (d === 0) P.y = y + h + .33; else { P.x = cx + (P.x - cx) / d * .33; P.y = cy + (P.y - cy) / d * .33; } } }
  if (P.y > 10.9) { G.scene = "out"; sfx.door(); P.x = DOOR.x; P.y = DOOR.y; P.a = Math.PI / 2; say("CORSO MAGENTA"); return; }
  if (mouse.down || touchFire.held) shoot();
  const present = guests.filter(g => g.st !== "out" && !g.npc).length, tgt = barTarget(G.hour); guestT -= dt;
  if (guestT <= 0 && present < tgt) { newGuest(false); guestT = R(1.5, 5); }
  for (const f of barHooks.onUpdate) f(dt);
  let ordering: Guest | null = null;
  for (let i = guests.length - 1; i >= 0; i--) { const g = guests[i]; if (g.bubT > 0) g.bubT -= dt; if (g.cheer > 0) g.cheer -= dt;
    if (g.wait && g.wait > 0) { g.wait -= dt; g.a = -Math.PI / 2; ordering = g; continue; }
    if (g.path.length) { const [tx, ty] = g.path[0], dx = tx - g.x, dy = ty - g.y, d = hyp(dx, dy);
      if (d < .08) { g.path.shift();
        if (tx === BAR.order.x && ty === BAR.order.y) { g.wait = R(2, 3.2); g.bub = pick(["Una birra al tavolo!", "Due spritz", "Un giro per tutti!"]); g.bubT = 2; }
        if (!g.path.length) { if (g.st === "out") { guests.splice(i, 1); continue; }
          g.a = g.slot.a; g.st = g.slot.kind === "tavolo" ? "sit" : "order"; if (g.st === "order") { g.t2 = R(2, 3.5); g.bub = pick(["Uno spritz!", "Una media", "Il solito", "Due birre", "Un Negroni"]); g.bubT = 2; } } }
      else { const step = Math.min(d, 1.4 * dt); g.x += dx / d * step; g.y += dy / d * step; g.a += angDiff(g.a, Math.atan2(dy, dx)) * Math.min(1, dt * 12); g.anim += dt * 6.5; }
      continue; }
    if (g.st === "order") { ordering = g; if ((g.t2! -= dt) <= 0) g.st = "stand"; }
    else { if (!g.npc) g.t -= dt * (present > tgt + 1 ? 3 : 1);
      if (!g.npc && Math.random() < dt / 11 && !g.bubT) { g.bub = pick(playing() ? LINES.concat(["Dai che la vinciamo", "Tira!!", "Arbitro!", "Passala!"]) : LINES); g.bubT = 2.2; }
      if (g.t <= 0) leaveBar(g); } }
  barista.ty = ordering ? clamp(ordering.y, 1.4, 8.3) : (Math.random() < dt / 3 ? R(1.4, 8.3) : barista.ty);
  const bd = barista.ty - barista.y; if (Math.abs(bd) > .1) { barista.y += Math.sign(bd) * Math.min(Math.abs(bd), 1.8 * dt); barista.anim += dt * 7; barista.a = bd > 0 ? Math.PI / 2 : -Math.PI / 2; barista.moving = true; } else { barista.a = 0; barista.moving = false; } }
export function leaveBar(g: Guest) { g.st = "out"; g.path = [...g.slot.via].reverse().concat([[BAR.hub.x, BAR.hub.y], [BAR.door.x, BAR.door.y]]); }
