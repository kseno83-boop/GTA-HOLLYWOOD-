// ---------- Punti d'interesse: cosa si fa nei posti del centro ----------
// Mangiare e gelati gratis, caffè al bar, farmacie, bingo e gratta e vinci, rapine a banche e gioiellerie;
// folle all'uscita da stazione, cinema e teatro, campane di San Magno. Prezzi e probabilità provvisori (da rivedere con l'utente).
import { G, P, TEST, say } from "../core/state";
import { R, hyp, clamp } from "../core/util";
import { sfx } from "../audio/sfx";
import { SPOTS, isOpen, HOURS, spotByName, type Spot } from "../world/poi";
import { makePed, panic, stars } from "./peds";

export const euro = (v: number) => `€ ${v.toFixed(2).replace(".", ",")}`;
const hm = (h: number) => `${Math.floor(h) % 24}:${String(Math.round(h % 1 * 60)).padStart(2, "0")}`;
/** Posti dove il tasto E fa qualcosa. */
const ACT = new Set(["food", "gelato", "bar", "pharmacy", "bank", "jewel", "bingo", "tabacchi"]);
const ROB = { bank: { lo: 800, hi: 1500, heat: 3.2 }, jewel: { lo: 300, hi: 700, heat: 2.2 } } as const;

/** Il punto d'interesse con cui si può interagire (a piedi, vicino alla porta). */
export const spotNear = () => P.car ? undefined : SPOTS.find(q => ACT.has(q.cat) && hyp(P.x - q.dx, P.y - q.dy) < 3);
export function spotHint(q: Spot) {
  if (!isOpen(q, G.hour)) return `${q.name} · chiuso (apre alle ${hm(HOURS[q.cat]![0])})`;
  switch (q.cat) {
    case "food": return `mangia da ${q.name}`;
    case "gelato": return `gelato da ${q.name}`;
    case "bar": return `caffè al ${q.name} (${euro(1.5)})`;
    case "pharmacy": return `${q.name} · medicine (${euro(30)})`;
    case "bank": case "jewel": return q.robbed === G.day ? `${q.name} · cassa già svuotata oggi` : `rapina ${q.name}`;
    case "bingo": return `${q.name} · gioca una cartella (${euro(10)})`;
    case "tabacchi": return `${q.name} · gratta e vinci (${euro(2)})`;
  }
  return q.name;
}
const pay = (v: number) => { if (P.money < v) { say("NON HAI ABBASTANZA SOLDI", 2); return false; } P.money -= v; return true; };
const heal = (v: number) => { P.hp = Math.min(100, P.hp + v); };
/** Tasto E vicino a un punto d'interesse. */
export function spotAction(q: Spot) {
  if (!isOpen(q, G.hour)) { say(`${q.name} · CHIUSO`, 2); return; }
  switch (q.cat) {
    case "food": if (P.hp < 100) { heal(100); sfx.eat(); say(`${q.name} · SALUTE PIENA`); } else say("Non hai fame adesso."); return;
    case "gelato": if (P.hp < 100) { heal(50); sfx.eat(); say(`${q.name} · +50 SALUTE`); } else say("Non hai voglia di un gelato adesso."); return;
    case "bar": if (pay(1.5)) { heal(10); sfx.eat(); say(`CAFFÈ · +10 SALUTE`, 2); } return;
    case "pharmacy": if (P.hp >= 100) { say("Stai benissimo, non ti serve niente."); return; } if (pay(30)) { heal(100); sfx.cash(); say(`${q.name} · SALUTE PIENA`); } return;
    case "bingo": if (!pay(10)) return; if (Math.random() < .35) { P.money += 25; sfx.cash(); say(`BINGO! +${euro(25)}`, 2.5); } else say("Niente da fare, cartella persa.", 2); return;
    case "tabacchi": { if (!pay(2)) return; const r = Math.random(), win = r < .01 ? 100 : r < .11 ? 10 : 0;
      if (win) { P.money += win; sfx.cash(); say(`GRATTA E VINCI · +${euro(win)}`, 2.5); } else say("Gratta e... perdi.", 2); return; }
    case "bank": case "jewel": rob(q, ROB[q.cat]); return;
  }
}
/** Rapina: una al giorno per posto, scatta l'allarme e il ricercato sale subito (l'allarme avvisa la polizia anche senza testimoni). */
function rob(q: Spot, o: { lo: number; hi: number; heat: number }) {
  if (q.robbed === G.day) { say("La cassa è già vuota. Torna domani.", 2.2); return; }
  q.robbed = G.day; const v = Math.round(R(o.lo, o.hi) / 10) * 10; P.money += v; sfx.alarm(); sfx.cash(); G.shake = Math.max(G.shake, .3);
  say(`RAPINA · +${euro(v)}`, 3); panic(q.dx, q.dy, 40);
  if (TEST.noPolice) return; const s0 = stars(); G.heat = clamp(Math.max(G.heat + .5, o.heat), 0, 5.5); G.calm = 0; if (s0 === 0) G.dispatch = R(4, 7);
}

// eventi a orario: folle (stazione ogni mezz'ora, uscita da cinema e teatro) e campane
let lastMin = -1;
const SHOWS = [17, 22.5];
function crowd(q: Spot, n: number) { if (hyp(q.dx - P.x, q.dy - P.y) > 160) return;
  for (let i = 0; i < n; i++) makePed(q.dx + R(-2, 2), q.dy + R(-2, 2), { spd: R(1.2, 1.7) }); }
export function updSpots() {
  const m = Math.floor(G.hour * 60), prev = lastMin; lastMin = m; if (prev < 0 || m === prev) return;
  // dopo un salto d'orario (tasto T, modalità test) niente eventi arretrati
  if ((m - prev + 1440) % 1440 > 3) return;
  const h = Math.floor(m / 60) % 24, mm = m % 60;
  if (h >= 6 && h <= 23 && (mm === 0 || mm === 30)) crowd(spotByName("STAZIONE"), Math.round(R(4, 9)));
  if (SHOWS.some(s => Math.round(s * 60) === m)) for (const q of SPOTS) if (q.cat === "show") crowd(q, Math.round(R(8, 14)));
  if (mm === 0 && h >= 7 && h <= 22) { const b = spotByName("BASILICA DI SAN MAGNO"), d = hyp(b.x - P.x, b.y - P.y), vol = clamp(1 - d / 600, .08, 1) * (G.scene === "bar" ? .35 : 1);
    sfx.bell(vol, h % 12 || 12); }
}
