// Modalità test: pannello con interruttori e scorciatoie per provare il gioco (tasto O, pulsante TEST sul telefono, o ?test nell'indirizzo).
// Le scelte restano salvate in questo browser.
import { G, P, TEST, peds, cars, say, CARCOL, type Vehicle } from "../core/state";
import { pick } from "../core/util";
import { DOOR, PLACES } from "../world/map";
import { snap } from "../sim/peds";
import { startMatchNow } from "../sim/football";

type Key = keyof typeof TEST;
const SWITCHES: [Key, string][] = [["invuln", "Invulnerabile"], ["noPolice", "Niente polizia (ricercato sempre a zero)"], ["rapidFire", "Fuoco rapido"],
  ["oneShot", "Un colpo uccide"], ["fast", "Super velocità"], ["ghost", "Fantasma: attraversi muri e tavoli"], ["freezeTime", "Tempo fermo"], ["debug", "Info di debug (posizione, FPS)"]];
const STORE = "gta-hollywood-test";

function save() { try { localStorage.setItem(STORE, JSON.stringify(TEST)); } catch { /* memoria del browser non disponibile */ } }
function load() { try { Object.assign(TEST, JSON.parse(localStorage.getItem(STORE) || "{}")); } catch { /* idem */ } }
const clearCops = () => { G.heat = 0; G.dispatch = 0; for (let i = peds.length - 1; i >= 0; i--) if (peds[i].cop) peds.splice(i, 1); for (const c of cars) if (c.mode === "chase") { c.mode = null; c.siren = false; } };
/** Porta il giocatore in un punto della città (uscendo dal bar se serve). */
function goTo(x: number, y: number, name: string) { if (P.car) { P.car.v = 0; P.car = null; } P.seat = -1; G.scene = "out"; P.x = x; P.y = y; G.camX = x; G.camY = y; say(name, 1.5); }
function setHour(h: number) { if (h < G.hour) G.day++; G.hour = h; say(`ORE ${Math.floor(h)}:${String(Math.round(h % 1 * 60)).padStart(2, "0")}`, 1.2); }

const ACTIONS: [string, () => void][] = [
  ["Salute piena", () => { P.hp = 100; }],
  ["+1 stella", () => { G.heat = Math.min(5.5, Math.floor(G.heat) + 1); G.dispatch = 0; G.calm = 0; }],
  ["Azzera stelle", clearCops],
  ["Ore 8:00", () => setHour(8)], ["Ore 12:00", () => setHour(12)], ["Ore 20:40", () => setHour(20 + 40 / 60)], ["Ore 23:30", () => setHour(23.5)],
  ["Partita adesso", startMatchNow],
  ["Giorno dopo (cambia turno)", () => { G.day++; say(`GIORNO ${G.day + 1}`, 1.2); }],
  ["Auto qui", () => { if (G.scene !== "out" || P.car) return; const c = snap({ type: "car", x: P.x + Math.cos(P.a) * 3, y: P.y + Math.sin(P.a) * 3, a: P.a, v: 0, col: pick(CARCOL), lane: 1, honkT: 0, insT: 0, bub: "", bubT: 0, wheelie: 0 }) as Vehicle; cars.push(c); }],
  ["→ Hollywood", () => goTo(DOOR.x, DOOR.y, "HOLLYWOOD")],
  ...PLACES.map(q => [`→ ${q.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}`, () => goTo(q.dx, q.dy, q.name)] as [string, () => void]),
];

export function bindTestMode() {
  load(); if (/[?&]test\b/.test(location.search)) document.documentElement.classList.add("testmode");
  const panel = document.createElement("div"); panel.id = "testpanel"; panel.hidden = true;
  panel.innerHTML = `<h2>Modalità test</h2><p class="hint">Tasto O per aprire e chiudere</p>
    <div class="sw">${SWITCHES.map(([k, l]) => `<label><input type="checkbox" data-k="${k}"> ${l}</label>`).join("")}</div>
    <div class="act">${ACTIONS.map(([l], i) => `<button type="button" data-i="${i}">${l}</button>`).join("")}</div>`;
  document.body.appendChild(panel);
  const btn = document.createElement("button"); btn.id = "testbtn"; btn.type = "button"; btn.textContent = "TEST"; document.body.appendChild(btn);
  for (const el of panel.querySelectorAll<HTMLInputElement>("input[data-k]")) { const k = el.dataset.k as Key; el.checked = TEST[k];
    el.addEventListener("change", () => { TEST[k] = el.checked; if (k === "noPolice" && el.checked) clearCops(); if (k === "debug") G.showFps = el.checked || G.showFps; save(); el.blur(); }); }
  for (const el of panel.querySelectorAll<HTMLButtonElement>("button[data-i]")) el.addEventListener("click", () => { ACTIONS[+el.dataset.i!][1](); el.blur(); });
  const toggle = () => { panel.hidden = !panel.hidden; };
  btn.addEventListener("click", () => { toggle(); btn.blur(); });
  window.addEventListener("keydown", e => { if (e.code === "KeyO" && G.started) toggle(); });
}
/** Vero se almeno un'opzione di test è attiva (per il cartellino nell'HUD). */
export const testActive = () => Object.values(TEST).some(Boolean);
