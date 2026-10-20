// ---------- Bar Hollywood (interno) ----------
// Pianta (dalle foto): sala principale con bancone a ovest (si beve in piedi, dietro la cucina, spine di rame),
// tavolone da 8 rivolto verso il telo del proiettore sulla parete dell'ingresso, tavolino alto con sgabelli sotto il telo,
// bancali con led viola, libri e lavagna a est, angolo viola sotto la scala. In fondo un passaggio in pietra con gradini
// porta ai bagni (porte arancioni) e alla saletta sul retro (tavoli quadrati, tavolo lungo, murale, tenda verde, TV).
import { G, P, TEST, look, say, mouse, touchFire, type Body } from "../core/state";
import { R, clamp, pick, hyp, angDiff, TOUCH } from "../core/util";
import { DOOR } from "../world/map";
import { sfx } from "../audio/sfx";
import { milanLive, playing } from "./football";
import { inputVec, screenToWorld, shoot } from "./player";

// Dalle foto dell'utente. Coordinate in metri: x verso est, y verso sud; la facciata (ingresso) è in basso.
export const BAR_W = 14, BAR_H = 19.35;
export const BAR = { door: { x: 4.2, y: 19.7 }, hub: { x: 4.2, y: 17.6 }, order: { x: 3.25, y: 15.9 } };
/** Muri [x, y, w, h, stile]: sala blu, passaggio in pietra, saletta e bagni bianchi. */
export type WallStyle = "blu" | "pietra" | "bianco";
export const WALLS: [number, number, number, number, WallStyle][] = [
  // sala principale (porta in basso tra x 3,4 e 5; apertura verso il passaggio in alto tra x 6 e 8)
  [0, 9, 6, .35, "blu"], [8, 9, 6, .35, "blu"], [0, 19, 3.4, .35, "blu"], [5, 19, 9, .35, "blu"], [0, 9, .35, 10.35, "blu"], [13.65, 0, .35, 19.35, "blu"],
  // passaggio in pietra (a ovest la porta dei bagni tra y 6,6 e 7,4)
  [5.65, 5.25, .35, 1.35, "pietra"], [5.65, 7.4, .35, 1.6, "pietra"], [8, 5.25, .35, 3.75, "pietra"],
  // bagni
  [2.05, 5.25, .35, 4.1, "bianco"],
  // saletta sul retro
  [2.65, 5.25, 3.35, .35, "bianco"], [8, 5.25, 5.65, .35, "bianco"], [2.65, 0, 11.35, .35, "bianco"], [2.65, 0, .35, 5.6, "bianco"],
];
/** Arredi principali [x, y, w, h]. */
export const KITCHEN = [.35, 9.35, 1.55, 6.85], COUNTER = [1.9, 10.2, .9, 6.0], FRIDGE = [.35, 16.6, 1.2, 2.4];
export const ALCOVE = [2.8, 9.35, 3.0, .35];
export const TABLE = [8.9, 11.4, 1.8, 4.6], HIGH = [8.6, 18.0, 2.4, .45], SCREEN = [8.1, 18.05, 3.4, .95];
export const WAINSCOT = [13.25, 9.35, .4, 9.65];
export const LONG_TABLE = [3.6, .7, 3.6, .7], DRESSER = [6.0, 7.55, .4, .7], WC_WALL = [2.4, 7.8, 3.25, .15];
export const BACK_TABLES = [[4.3, 3.5], [9.8, 2.3], [9.8, 4.2], [12.9, 2.6], [12.9, 4.3]].map(([x, y]) => [x - .375, y - .375, .75, .75]);
/** Rettangoli solidi per il giocatore. */
export const OBST = [...WALLS.map(([x, y, w, h]) => [x, y, w, h]), KITCHEN, COUNTER, FRIDGE, ALCOVE, TABLE, HIGH, WAINSCOT, LONG_TABLE, DRESSER, WC_WALL, ...BACK_TABLES,
  [8.35, 5.6, 5.3, 3.4]];
export type SlotKind = "bancone" | "tavolo" | "alto" | "sala";
export interface Slot { x: number; y: number; a: number; kind: SlotKind; via: [number, number][] }
export const SLOTS: Slot[] = [];
const S = (x: number, y: number, a: number, kind: SlotKind, via: [number, number][]) => SLOTS.push({ x, y, a, kind, via: [...via, [x, y]] });
const E = 0, W = Math.PI, N = -Math.PI / 2, SUD = Math.PI / 2;
// al bancone in piedi
for (const y of [10.9, 11.9, 12.9, 13.9, 14.9]) S(3.25, y, W, "bancone", [[4.2, y]]);
// tavolone da 8, rivolto verso il telo del proiettore
for (const y of [12.0, 13.1, 14.2, 15.3]) { S(8.4, y, E, "tavolo", [[7.3, 16.75], [7.3, y]]); S(11.2, y, W, "tavolo", [[7.3, 16.75], [12.1, 16.75], [12.1, y]]); }
// sgabelli del tavolino alto sotto il telo
for (const x of [9.0, 9.8, 10.6]) S(x, 17.6, SUD, "alto", [[7.3, 16.75], [x, 16.75]]);
// saletta sul retro, passando dal corridoio in pietra
const BACK: [number, number][] = [[7.0, 16.75], [7.0, 9.6], [7.0, 7.0], [7.0, 4.8]], RIGHT: [number, number][] = [...BACK, [8.45, 4.8]];
for (const x of [4.2, 5.3, 6.4]) S(x, 2.0, N, "sala", [...BACK, [7.0, 2.75], [x, 2.75]]);
S(3.6, 3.5, E, "sala", [...BACK, [3.6, 4.8]]); S(5.0, 3.5, W, "sala", [...BACK, [5.0, 4.8]]);
S(9.1, 2.3, E, "sala", [...RIGHT, [8.45, 2.3]]); S(10.5, 2.3, W, "sala", [...RIGHT, [8.45, 3.25], [11.35, 3.25], [11.35, 2.3]]);
S(9.1, 4.2, E, "sala", [...RIGHT, [8.45, 4.2]]); S(9.8, 4.95, N, "sala", [...BACK]);
S(12.2, 2.6, E, "sala", [...RIGHT, [8.45, 3.25], [12.2, 3.25]]); S(12.2, 4.3, E, "sala", [...RIGHT, [8.45, 3.25], [11.35, 3.25], [11.35, 4.3]]);
/** Chiacchiere generiche degli avventori (anche nel dehors). */
export const LINES = ["Uno spritz!", "Il solito, grazie", "Un Campari", "Ma va là!", "Domani si lavora...", "Ancora una birra", "Offro io stasera", "Qui si sta bene", "Sta zitto va'", "Un caffè corretto", "Chi fa il mister stasera?", "Ai miei tempi Van Basten..."];

export interface Guest extends Body {
  slot: Slot; team: string | null; cheer: number; t: number; st: "walk" | "sit" | "stand" | "order" | "out";
  path: [number, number][]; wait?: number; t2?: number;
  /** Personaggio fisso (vedi src/characters). */
  npc?: string;
}
export const guests: Guest[] = [];
/** Chi lavora dietro il bancone: personaggi di turno (vedi characters/turni.ts) o, se non c'è nessuno, un barista generico. */
export interface Staff extends Body { ty: number; npc?: string; path: [number, number][]; leaving?: boolean }
export const GENERIC = (): Staff => look({ x: 1.45, y: 12.5, a: 0, ty: 12.5, shirt: "#ece6da", apron: "#1d1d22", hair: "#2b1d14", bub: "", bubT: 0, moving: false, path: [] });
export const staff: Staff[] = [GENERIC()];
/** Ingresso dietro al bancone: dal lato nord, tra la mensola viola e la testa del bancone. */
const BEHIND: [number, number][] = [[BAR.hub.x, BAR.hub.y], [4.2, 10.0], [2.35, 9.95], [1.45, 9.95]];
/** Un membro dello staff entra in servizio: già al bancone (all'apertura della scena) o entrando dalla porta. */
export function staffArrive(b: Partial<Staff>, atCounter: boolean) {
  const ty = 10.6 + Math.random() * 5, s = Object.assign(GENERIC(), { apron: undefined, ty }, b);
  if (atCounter) Object.assign(s, { x: 1.45, y: ty }); else Object.assign(s, { x: BAR.door.x, y: BAR.door.y, path: [...BEHIND, [1.45, ty]] });
  staff.push(s); return s; }
/** Fine turno: esce dalla porta (o sparisce subito se la scena non è aperta). */
export function staffLeave(s: Staff, now = false) { if (now) { staff.splice(staff.indexOf(s), 1); return; }
  s.leaving = true; s.path = [[1.45, 9.95], ...[...BEHIND].reverse(), [BAR.door.x, BAR.door.y]]; }
let guestT = 0;
export const DRINKS = Array.from({ length: 14 }, () => [TABLE[0] + .2 + Math.random() * (TABLE[2] - .4), TABLE[1] + .3 + Math.random() * (TABLE[3] - .6), pick(["#f3b33d", "#ff6b3d", "#f6f0d0", "#c2185b"])] as [number, number, string]);
/** Avventori attesi per ora del giorno (chiuso dalle 2 alle 6), di più quando gioca il Milan. */
export const barTarget = (h: number) => { const b = h >= 2 && h < 6 ? 0 : h < 9.5 ? 5 : h < 12 ? 3 : h < 14.5 ? 6 : h < 17.5 ? 4 : h < 21.5 ? 14 : 10; return b ? Math.min(SLOTS.length - 2, b + (milanLive() ? 5 : 0)) : 0; };
export const freeSlots = () => SLOTS.filter(s => !guests.some(g => g.slot === s));
export function newGuest(seated: boolean, extra: Partial<Guest> = {}, slot?: Slot) { const free = freeSlots(); if (!free.length) return;
  // con il Milan in TV si cercano i posti davanti al telo; la saletta sul retro si riempie per ultima
  const tav = free.filter(f => f.kind === "tavolo" || f.kind === "alto"), front = free.filter(f => f.kind !== "sala");
  const s = slot ?? (milanLive() && tav.length && Math.random() < .7 ? pick(tav) : front.length && Math.random() < .85 ? pick(front) : pick(free));
  const r = Math.random(), g = look({ x: BAR.door.x, y: BAR.door.y, a: -Math.PI / 2, slot: s, team: r < .62 ? "MILAN" : r < .72 ? "INTER" : null, cheer: 0, bub: "", bubT: 0, t: R(40, 110), st: "walk", path: [] }) as Guest;
  if (g.team === "MILAN" && Math.random() < .6) { g.stripes = "#111"; g.shirt = "#d3121e"; } if (g.team === "INTER" && Math.random() < .6) { g.stripes = "#111"; g.shirt = "#1446b8"; }
  Object.assign(g, extra);
  if (seated) { Object.assign(g, { x: s.x, y: s.y, a: s.a, st: s.kind === "bancone" ? "stand" : "sit", path: [], t: extra.t ?? R(5, 90) }); }
  else { g.st = "walk"; g.path = [[BAR.hub.x, BAR.hub.y]]; if (s.kind !== "bancone") g.path.push([BAR.order.x, BAR.order.y], [BAR.hub.x, BAR.hub.y]); g.path.push(...s.via); }
  guests.push(g); return g; }
/** Chiamata all'ingresso: popola il bar in base all'ora. */
export const barHooks = { onEnter: [] as (() => void)[], onUpdate: [] as ((dt: number) => void)[] };
export function enterBar() { if (barTarget(G.hour) === 0) { say("L'Hollywood è chiuso. Riapre alle 6:00."); return; }
  G.scene = "bar"; sfx.door(); P.car = null; P.x = BAR.hub.x; P.y = 18.6; P.a = -Math.PI / 2; guests.length = 0;
  for (const f of barHooks.onEnter) f();
  for (let i = 0; i < barTarget(G.hour) - 2; i++) newGuest(true); say("BAR HOLLYWOOD", 2); }
export function updBar(dt: number) {
  const [ix, iy] = inputVec(), sp = 6 * (TEST.fast ? 2 : 1); P.x += ix * sp * dt; P.y += iy * sp * dt; P.cool -= dt; P.moving = !!(ix || iy);
  if (P.moving) { P.anim += sp * dt * 4.5; if (TOUCH) P.a += angDiff(P.a, Math.atan2(iy, ix)) * Math.min(1, dt * 12); }
  if (!TOUCH) { const [wx, wy] = screenToWorld(mouse.x, mouse.y); P.a = Math.atan2(wy - P.y, wx - P.x); }
  if (!TEST.ghost) for (const [x, y, w, h] of OBST) { const cx = clamp(P.x, x, x + w), cy = clamp(P.y, y, y + h), d = hyp(P.x - cx, P.y - cy);
    if (d < .33) { if (d === 0) P.y = y + h + .33; else { P.x = cx + (P.x - cx) / d * .33; P.y = cy + (P.y - cy) / d * .33; } } }
  if (P.y > BAR_H + .1) { G.scene = "out"; sfx.door(); P.x = DOOR.x; P.y = DOOR.y; P.a = Math.PI / 2; say("CORSO MAGENTA"); return; }
  if (mouse.down || touchFire.held) shoot();
  const present = guests.filter(g => g.st !== "out" && !g.npc).length, tgt = barTarget(G.hour); guestT -= dt;
  if (guestT <= 0 && present < tgt) { newGuest(false); guestT = R(1.5, 5); }
  for (const f of barHooks.onUpdate) f(dt);
  let ordering: Guest | null = null;
  for (let i = guests.length - 1; i >= 0; i--) { const g = guests[i]; if (g.bubT > 0) g.bubT -= dt; if (g.cheer > 0) g.cheer -= dt;
    if (g.wait && g.wait > 0) { g.wait -= dt; g.a = Math.PI; ordering = g; continue; }
    if (g.path.length) { const [tx, ty] = g.path[0], dx = tx - g.x, dy = ty - g.y, d = hyp(dx, dy);
      if (d < .08) { g.path.shift();
        if (tx === BAR.order.x && ty === BAR.order.y) { g.wait = R(2, 3.2); g.bub = pick(["Una birra al tavolo!", "Due spritz", "Un giro per tutti!"]); g.bubT = 2; }
        if (!g.path.length) { if (g.st === "out") { guests.splice(i, 1); continue; }
          g.a = g.slot.a; g.st = g.slot.kind === "bancone" ? "order" : "sit"; if (g.st === "order") { g.t2 = R(2, 3.5); g.bub = pick(["Uno spritz!", "Una media", "Il solito", "Due birre", "Un Negroni"]); g.bubT = 2; } } }
      else { const step = Math.min(d, 1.4 * dt); g.x += dx / d * step; g.y += dy / d * step; g.a += angDiff(g.a, Math.atan2(dy, dx)) * Math.min(1, dt * 12); g.anim += dt * 6.5; }
      continue; }
    if (g.st === "order") { ordering = g; if ((g.t2! -= dt) <= 0) g.st = "stand"; }
    else { if (!g.npc) g.t -= dt * (present > tgt + 1 ? 3 : 1);
      if (!g.npc && Math.random() < dt / 11 && !g.bubT) { g.bub = pick(playing() ? LINES.concat(["Dai che la vinciamo", "Tira!!", "Arbitro!", "Passala!"]) : LINES); g.bubT = 2.2; }
      if (g.t <= 0) leaveBar(g); } }
  updStaff(dt, ordering);
}
function updStaff(dt: number, ordering: Guest | null) {
  let server = true;
  for (let i = staff.length - 1; i >= 0; i--) { const b = staff[i]; if (b.bubT > 0) b.bubT -= dt;
    if (b.path.length) { const [tx, ty] = b.path[0], dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy);
      if (d < .08) { b.path.shift(); if (!b.path.length && b.leaving) staff.splice(i, 1); continue; }
      const step = Math.min(d, 1.6 * dt); b.x += dx / d * step; b.y += dy / d * step; b.a = Math.atan2(dy, dx); b.anim += dt * 7; b.moving = true; continue; }
    // il primo libero serve chi sta ordinando, gli altri si spostano lungo il bancone senza pestarsi i piedi
    if (server && ordering && ordering.x < 4) { b.ty = clamp(ordering.y, 10.5, 15.9); server = false; }
    else if (Math.random() < dt / 3) b.ty = R(10.5, 15.9);
    for (const o of staff) if (o !== b && !o.path.length && Math.abs(o.ty - b.ty) < .8) b.ty = clamp(b.ty + (b.ty >= o.ty ? .9 : -.9), 10.5, 15.9);
    const bd = b.ty - b.y; if (Math.abs(bd) > .1) { b.y += Math.sign(bd) * Math.min(Math.abs(bd), 1.8 * dt); b.anim += dt * 7; b.a = bd > 0 ? Math.PI / 2 : -Math.PI / 2; b.moving = true; } else { b.a = 0; b.moving = false; } }
}
export function leaveBar(g: Guest) { g.st = "out"; g.path = [...g.slot.via].reverse().concat([[BAR.hub.x, BAR.hub.y], [BAR.door.x, BAR.door.y]]); }
