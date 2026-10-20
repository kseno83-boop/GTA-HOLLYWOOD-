// ---------- Calcio al maxischermo ----------
// Partite solo alle 15:00 e alle 20:45 (ora di gioco). Fuori partita lo schermo dell'Hollywood è spento.
import { G, say } from "../core/state";
import { R, clamp, pick } from "../core/util";
import { sfx } from "../audio/sfx";
import { guests } from "./bar";

export const TEAMS: Record<string, [string, string]> = { MILAN: ["#d3121e", "#111"], INTER: ["#1446b8", "#111"], JUVENTUS: ["#f4f4f4", "#111"], NAPOLI: ["#4fb3f0", "#fff"], ROMA: ["#8e1f2f", "#f0b323"],
  LAZIO: ["#9fd6f3", "#fff"], ATALANTA: ["#1c3f94", "#111"], FIORENTINA: ["#6a2c96", "#fff"], COMO: ["#1e56b0", "#fff"], TORINO: ["#7a1c1c", "#fff"], BOLOGNA: ["#a3162a", "#1b2b5c"], GENOA: ["#a3162a", "#0d2240"] };
const FIXTURES = [["MILAN", "INTER"], ["JUVENTUS", "NAPOLI"], ["MILAN", "ROMA"], ["ATALANTA", "LAZIO"], ["COMO", "MILAN"], ["INTER", "FIORENTINA"], ["MILAN", "JUVENTUS"], ["TORINO", "BOLOGNA"], ["NAPOLI", "MILAN"], ["GENOA", "ROMA"]];
/** Posizioni dei giocatori (frazioni del campo) per la squadra che attacca verso destra. */
export const FORM = [[.05, .5], [.2, .2], [.2, .4], [.2, .6], [.2, .8], [.35, .25], [.35, .45], [.35, .65], [.35, .85], [.46, .4], [.46, .6]];
const KICKOFF = [15, 20.75];

export interface Match { i: number; h: string; a: string; gh: number; ga: number; t: number; tm: number; bx: number; by: number; vx: number; vy: number; flash: number; scorer: string }
export const F = { match: null as Match | null, fixIdx: 0 };

function newMatch(i: number): Match { const [h, a] = FIXTURES[i % FIXTURES.length]; return { i, h, a, gh: 0, ga: 0, t: 0, tm: 0, bx: .5, by: .5, vx: .1, vy: 0, flash: 0, scorer: "" }; }
/** Durata in minuti di gioco: 5 pre-partita, 45 primo tempo, 15 intervallo, 45 secondo tempo, 10 dopo il fischio. */
export const phase = (m: Match) => m.tm < 5 ? "PRE" : m.tm < 50 ? "1T" : m.tm < 65 ? "INT" : m.tm < 110 ? "2T" : "FT";
const minute = (m: Match) => { const p = phase(m); return p === "1T" ? m.tm - 4 : p === "2T" ? m.tm - 19 : p === "FT" ? 90 : p === "INT" ? 45 : 0; };
/** Modalità test: la prossima partita in calendario comincia adesso. */
export function startMatchNow() { if (!F.match) { F.match = newMatch(F.fixIdx++); F.match.t = 4; } }
export const milanLive = () => !!F.match && (F.match.h === "MILAN" || F.match.a === "MILAN") && phase(F.match) !== "FT";
export const playing = () => !!F.match && (phase(F.match) === "1T" || phase(F.match) === "2T");
/** Avvia la partita se l'orario è passato da a a b sopra un calcio d'inizio. */
export function checkKick(a: number, b: number) { for (const k of KICKOFF) if (!F.match && (a <= b ? a < k && k <= b : a < k || k <= b)) {
  F.match = newMatch(F.fixIdx++); F.match.t = ((b - k + 24) % 24) * 60; if (G.scene === "bar") say("CALCIO D'INIZIO", 2); } }
export function nextKick() { const k = KICKOFF.find(k => k > G.hour) ?? KICKOFF[0], [h, a] = FIXTURES[F.fixIdx % FIXTURES.length]; return `${Math.floor(k)}:${String(Math.round(k % 1 * 60)).padStart(2, "0")} ${h}-${a}`; }
/** dm = minuti di gioco trascorsi, dt = secondi reali (per l'animazione della palla). */
export function updMatch(dm: number, dt: number) {
  const m = F.match; if (!m) return; m.t += dm;
  while (m.tm < Math.floor(m.t)) { m.tm++; const p = phase(m), live = m.t - m.tm < 2;
    if (m.tm >= 120) { F.match = null; return; }
    if (live && G.scene === "bar" && (m.tm === 5 || m.tm === 65)) sfx.whistle(1); if (live && G.scene === "bar" && (m.tm === 50 || m.tm === 110)) sfx.whistle(3);
    if (p === "1T" || p === "2T") for (const side of ["h", "a"] as const) if (Math.random() < (m[side] === "MILAN" ? .03 : .024)) goal(m, side, live); }
  const live = phase(m) === "1T" || phase(m) === "2T"; m.flash -= dt;
  if (live) { m.vx += R(-1, 1) * dt * 1.4; m.vy += R(-1, 1) * dt * 1.4; m.vx = clamp(m.vx, -.35, .35); m.vy = clamp(m.vy, -.3, .3);
    m.bx += m.vx * dt; m.by += m.vy * dt; if (m.bx < .04 || m.bx > .96) m.vx *= -1; if (m.by < .08 || m.by > .92) m.vy *= -1;
    m.bx = clamp(m.bx, .04, .96); m.by = clamp(m.by, .08, .92); } else { m.bx = .5; m.by = .5; } }
/** Gol: gli avventori reagiscono in base alla loro squadra (il bar è milanista). */
function goal(m: Match, side: "h" | "a", react: boolean) { const team = m[side], other = m[side === "h" ? "a" : "h"]; side === "h" ? m.gh++ : m.ga++;
  m.flash = 3.5; m.scorer = team; m.bx = .5; m.by = .5; if (!react) return;
  if (G.scene !== "bar") { if (team === "MILAN") say("GOL DEL MILAN!", 2.5); return; }
  const fans = guests.filter(g => g.team === team).length, foes = guests.filter(g => g.team === other).length; fans >= foes ? sfx.cheer() : sfx.groan();
  for (const g of guests) { if (g.st === "walk") continue; const fan = g.team;
    if (fan && fan === team) { g.cheer = R(2.5, 4); if (Math.random() < .75) { g.bub = pick(fan === "MILAN" ? ["GOOOOL!", "FORZA MILAN!", "ROSSONERI!", "Che gol!!", "Vaiii!"] : ["GOL!", "Sìììì!"]); g.bubT = 2.5; } }
    else if (fan && fan === other) { g.cheer = 0; if (Math.random() < .7) { g.bub = pick(["Nooo!", "Ma daiii", "Arbitro venduto!", "Svegliaaa!", "Non ci credo"]); g.bubT = 2.5; } }
    else if (other === "INTER" && Math.random() < .6) { g.cheer = 2; g.bub = pick(["Godo!", "Ahah, Inter!", "Bene così"]); g.bubT = 2.2; }
    else if (Math.random() < .3) { g.bub = pick(["Bel gol", "Che botta", "Fuorigioco!"]); g.bubT = 2; } }
  G.shake = Math.max(G.shake, team === "MILAN" ? .5 : .15); }
export const scoreLine = (m: Match) => `${m.h} ${m.gh}-${m.ga} ${m.a}`;
export const clockLine = (m: Match) => { const p = phase(m); return p === "PRE" ? "PRE-PARTITA" : p === "INT" ? "INTERVALLO" : p === "FT" ? "FINALE" : `${minute(m)}'`; };
