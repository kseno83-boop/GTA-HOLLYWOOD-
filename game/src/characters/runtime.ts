// Mette in scena i personaggi fissi: presenza per orario, posto all'Hollywood o in strada, dialogo con il tasto E.
import { G, P, peds, viewHalf, type Body } from "../core/state";
import { hyp, pick } from "../core/util";
import { DOOR, PLACES } from "../world/map";
import { makePed } from "../sim/peds";
import { barHooks, barista, guests, freeSlots, leaveBar, newGuest } from "../sim/bar";
import { PERSONAGGI } from "./index";
import type { Personaggio } from "./types";

/** In ore di gioco; una fascia come [22, 2] passa la mezzanotte. */
export function present(c: Personaggio, h = G.hour) {
  if (!c.orari || !c.orari.length) return true;
  return c.orari.some(([a, b]) => a <= b ? h >= a && h < b : h >= a || h < b);
}
const byId = (id: string) => PERSONAGGI.find(c => c.id === id);
/** Personaggi uccisi: non tornano per il resto della partita. */
const dead = new Set<string>();

// --- Hollywood ---
/** Aspetto del barista generico, da ripristinare quando il personaggio barista non c'è. */
let BARISTA0: Partial<Body> | null = null;
function guestFor(c: Personaggio, seated: boolean) {
  const kind = c.posto as "bancone" | "tavolo", slot = freeSlots().find(s => s.kind === kind);
  if (!slot) return;
  newGuest(seated, { npc: c.id, team: c.squadra ?? null, stripes: null, t: 1e9, ...c.aspetto }, slot);
}
function syncBar(entering: boolean) {
  BARISTA0 ??= { shirt: barista.shirt, pants: barista.pants, skin: barista.skin, hair: barista.hair, apron: barista.apron, cap: barista.cap, stripes: barista.stripes };
  const bc = PERSONAGGI.find(c => c.posto === "barista" && present(c));
  if (bc && barista.npc !== bc.id) Object.assign(barista, BARISTA0, bc.aspetto, { npc: bc.id });
  else if (!bc && barista.npc) Object.assign(barista, BARISTA0, { npc: undefined });
  for (const c of PERSONAGGI) { if (c.posto !== "bancone" && c.posto !== "tavolo") continue;
    const g = guests.find(g => g.npc === c.id), here = present(c) && !dead.has(c.id);
    if (here && !g) guestFor(c, entering);
    else if (!here && g && g.st !== "out") leaveBar(g); }
}
let barT = 0;
/** Da chiamare all'avvio: aggancia i personaggi all'ingresso e all'aggiornamento del bar. */
export function initCharacters() {
  barHooks.onEnter.push(() => { barT = 0; syncBar(true); });
  barHooks.onUpdate.push(dt => { if ((barT -= dt) <= 0) { barT = 1; syncBar(false); } ambient(dt); });
}

// --- Strada ---
function doorOf(l: string) { if (l === "HOLLYWOOD") return DOOR; const q = PLACES.find(q => q.name === l); return q ? { x: q.dx, y: q.dy } : null; }
export function updStreetNpcs(dt: number) {
  const [hw, hh] = viewHalf();
  PERSONAGGI.forEach((c, i) => { if (typeof c.posto !== "object") return;
    const p = peds.find(p => p.npc === c.id);
    if (p && p.st === "dead") { dead.add(c.id); return; }
    const here = present(c) && !dead.has(c.id);
    if (here && !p) { const d = doorOf(c.posto.fuori); if (!d) return; const a = 1.45 + i * 2.4, hx = d.x + Math.cos(a) * 2.6, hy = d.y + Math.sin(a) * 2.6;
      makePed(hx, hy, { hx, hy, a: a + Math.PI, st: "loiter", keep: true, npc: c.id, spd: 1.4, stripes: null, ...c.aspetto }); }
    else if (!here && p && (Math.abs(p.x - P.x) > hw + 4 || Math.abs(p.y - P.y) > hh + 4)) peds.splice(peds.indexOf(p), 1); });
  ambient(dt);
}

// --- Frasi spontanee ---
function bodies(): [Personaggio, Body][] {
  const out: [Personaggio, Body][] = [];
  if (G.scene === "bar") { if (barista.npc) out.push([byId(barista.npc)!, barista]); for (const g of guests) if (g.npc && g.st !== "out") out.push([byId(g.npc)!, g]); }
  else for (const p of peds) if (p.npc && p.st !== "dead") out.push([byId(p.npc)!, p]);
  return out.filter(([c]) => c);
}
function ambient(dt: number) {
  for (const [c, b] of bodies()) if (c.frasi?.length && !(b.bubT > 0) && D.id !== c.id && Math.random() < dt / 12) { b.bub = pick(c.frasi); b.bubT = 2.6; }
}

// --- Dialogo ---
/** Dialogo aperto: battuta corrente e quanti caratteri sono già apparsi (effetto macchina da scrivere). */
export const D = { id: "", nome: "", text: "", i: 0, shown: 0, scene: "" };
let talkBody: Body | null = null;
export function talkTarget(): { c: Personaggio; b: Body } | null {
  let best: { c: Personaggio; b: Body } | null = null, bd = 1e9;
  for (const [c, b] of bodies()) { const d = hyp(b.x - P.x, b.y - P.y), r = b === barista ? 2.9 : 2;
    if (d < r && d < bd && !P.car) { bd = d; best = { c, b }; } }
  return best;
}
export function talk(t: { c: Personaggio; b: Body }) {
  if (!t.c.dialogo.length) return;
  if (D.id === t.c.id) { if (D.shown < D.text.length) { D.shown = D.text.length; return; } D.i++; }
  else { D.id = t.c.id; D.nome = t.c.nome; D.i = 0; }
  if (D.i >= t.c.dialogo.length) { closeDialog(); return; }
  D.text = t.c.dialogo[D.i]; D.shown = 0; D.scene = G.scene; talkBody = t.b; t.b.bubT = 0;
  if (G.scene === "out" || t.b !== barista) t.b.a = Math.atan2(P.y - t.b.y, P.x - t.b.x);
}
export function closeDialog() { D.id = ""; D.text = ""; talkBody = null; }
/** Avanza la scrittura e chiude il dialogo se ti allontani o cambi scena. */
export function updDialog(dt: number) {
  if (!D.id) return;
  D.shown = Math.min(D.text.length, D.shown + dt * 40);
  if (!talkBody || D.scene !== G.scene || hyp(talkBody.x - P.x, talkBody.y - P.y) > 4 || P.car) closeDialog();
}
