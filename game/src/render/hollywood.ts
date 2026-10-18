// ---------- Disegno interno del Bar Hollywood (dalle foto dell'utente) ----------
// Muri blu con citazioni di film, bancone con spine di rame e cucina, tavolone scuro con sedie bistrot, telo del proiettore,
// bancali con led viola e libri, angolo viola sotto la scala, passaggio in pietra, bagni con porte arancioni, saletta sul retro.
import { G, P, PLOOK } from "../core/state";
import { K } from "../core/util";
import { F, playing, clockLine } from "../sim/football";
import { guests, barista, SLOTS, TABLE, HIGH, SCREEN, KITCHEN, COUNTER, FRIDGE, ALCOVE, WAINSCOT, LONG_TABLE, DRESSER, WC_WALL, BACK_TABLES, WALLS, DRINKS, BAR_W, BAR_H, type WallStyle } from "../sim/bar";
import { V, worldXf } from "./view";
import { person, drawFx } from "./sprites";
import { renderPitch } from "./pitch";

type Rect = number[];
let ctx: CanvasRenderingContext2D;
function rect(r: Rect, fill: string, stroke = K, lw = .06) { ctx.fillStyle = fill; ctx.fillRect(r[0], r[1], r[2], r[3]); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeRect(r[0], r[1], r[2], r[3]); } }
function dot(x: number, y: number, r: number, fill: string, stroke?: string) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = .04; ctx.stroke(); } }
function glow(x: number, y: number, r: number, rgb: string, a: number) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
/** Pavimento in legno a listoni. */
function planks(r: Rect, base: string, line: string, step = .32) { rect(r, base, ""); ctx.strokeStyle = line; ctx.lineWidth = .03; ctx.beginPath();
  for (let x = r[0] + step; x < r[0] + r[2]; x += step) { ctx.moveTo(x, r[1]); ctx.lineTo(x, r[1] + r[3]); }
  for (let x = r[0], k = 0; x < r[0] + r[2]; x += step, k++) for (let y = r[1] + (k % 3) * .7; y < r[1] + r[3]; y += 2.1) { ctx.moveTo(x, y); ctx.lineTo(x + step, y); }
  ctx.stroke(); }
/** Sedia bistrot in legno curvato vista dall'alto: seduta tonda e schienale ad arco opposto al tavolo. */
function bistro(x: number, y: number, a: number) { ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  dot(.05, .05, .24, "rgba(0,0,0,.3)"); dot(0, 0, .22, "#5b3420", K); ctx.strokeStyle = "#3b2014"; ctx.lineWidth = .07; ctx.beginPath(); ctx.arc(0, 0, .2, Math.PI * .6, Math.PI * 1.4); ctx.stroke(); ctx.restore(); }
function table(r: Rect, top: string) { rect([r[0] + .1, r[1] + .12, r[2], r[3]], "rgba(0,0,0,.35)", ""); rect(r, top, K, .08);
  ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = .025; ctx.beginPath(); for (let x = r[0] + .25; x < r[0] + r[2]; x += .25) { ctx.moveTo(x, r[1]); ctx.lineTo(x, r[1] + r[3]); } ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.1)"; ctx.fillRect(r[0], r[1], r[2], .08); }
const WALL_COL: Record<WallStyle, string> = { blu: "#3f66ad", pietra: "#cdbf9f", bianco: "#e6e0d3" };

export function drawBar() {
  ctx = V.ctx; const now = G.now, match = F.match, tv = playing();
  worldXf();
  ctx.fillStyle = "#0a0610"; ctx.fillRect(-30, -30, BAR_W + 60, BAR_H + 60);
  // pavimenti: legno scuro in sala, legno nel passaggio, piastrelle nei bagni, legno chiaro nella saletta
  planks([0, 9, 14, 10.35], "#4a3020", "rgba(0,0,0,.35)");
  planks([5.65, 5.25, 2.7, 4.1], "#5a3a22", "rgba(0,0,0,.3)");
  rect([2.05, 5.25, 3.95, 4.1], "#d8ccb0", ""); ctx.strokeStyle = "rgba(0,0,0,.15)"; ctx.lineWidth = .02; ctx.beginPath();
  for (let x = 2.4; x < 5.7; x += .3) { ctx.moveTo(x, 5.6); ctx.lineTo(x, 9); } for (let y = 5.6; y < 9; y += .3) { ctx.moveTo(2.4, y); ctx.lineTo(5.65, y); } ctx.stroke();
  planks([2.65, 0, 11.35, 5.6], "#6b4a2e", "rgba(0,0,0,.28)");
  // vano della scala del palazzo (inaccessibile): rampe viste dall'alto
  rect([8.35, 5.6, 5.3, 3.4], "#1c1622", ""); ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = .04; ctx.beginPath();
  for (let x = 8.6; x < 13.5; x += .3) { ctx.moveTo(x, 5.8); ctx.lineTo(x, 7.2); ctx.moveTo(x, 7.4); ctx.lineTo(x, 8.8); } ctx.stroke();
  rect([8.35, 7.2, 5.3, .2], "#2a2230", "");
  // gradini del passaggio
  ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = .05; ctx.beginPath(); for (const y of [8.35, 8.7, 9.05, 5.75, 6.1]) { ctx.moveTo(6, y); ctx.lineTo(8, y); } ctx.stroke();
  ctx.globalCompositeOperation = "lighter";
  glow(4.3, 10.2, 2.2, "150,40,255", .35); // angolo viola sotto la scala
  if (match) { const lg = ctx.createLinearGradient(9.8, 10.3, 9.8, 18.1); lg.addColorStop(0, `rgba(160,255,200,${tv ? .05 : .02})`); lg.addColorStop(1, `rgba(120,230,170,${tv ? .2 : .08})`);
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(9.6, 10.3); ctx.lineTo(10.0, 10.3); ctx.lineTo(SCREEN[0] + SCREEN[2], 18.1); ctx.lineTo(SCREEN[0], 18.1); ctx.fill(); }
  ctx.globalCompositeOperation = "source-over";
  drawFx();

  // cucina dietro al bancone: scaffali bianchi, cappa, affettatrice; frigo nell'angolo
  rect(KITCHEN, "#2a2a2e"); rect([.35, 9.6, .45, 3.0], "#e9e6df", K, .04);
  for (let i = 0; i < 9; i++) dot(.57, 9.85 + i * .3, .09, ["#f2c94c", "#3d7fe0", "#e8474f", "#efe8dc", "#49b86b"][i % 5]);
  rect([.35, 12.9, 1.0, 1.4], "#9aa0a8", K, .05); ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = .03; ctx.beginPath(); for (let y = 13.0; y < 14.3; y += .14) { ctx.moveTo(.4, y); ctx.lineTo(1.3, y); } ctx.stroke();
  dot(1.15, 15.4, .22, "#c9ccd6", K); dot(1.15, 15.4, .1, "#d3333a");
  rect(FRIDGE, "#dcdcd8", K, .06); ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(.35, 17.8, 1.2, .04);
  person(barista, barista.moving ? "walk" : "idle", 1.3);
  // bancone: piano in legno, fronte coperto di adesivi, spine di rame, cassa, bottiglie di gin, lavagnetta delle birre
  rect(COUNTER, "#6e3b22", K, .08); ctx.fillStyle = "#8a4b2a"; ctx.fillRect(COUNTER[0] + .55, COUNTER[1], .35, COUNTER[3]);
  for (let y = COUNTER[1] + .1, k = 0; y < COUNTER[1] + COUNTER[3] - .1; y += .22, k++) { ctx.fillStyle = ["#ff2e88", "#29f2e4", "#ffd166", "#f6f0ff", "#9b5de5", "#49b86b"][k % 6]; ctx.fillRect(COUNTER[0] + .8, y, .08, .14); }
  rect([2.05, 10.6, .3, 1.5], "#c87533", K, .04); for (let i = 0; i < 5; i++) dot(2.42, 10.75 + i * .3, .07, ["#e8474f", "#f2c94c", "#7d3cc8", "#3d7fe0", "#ff8a3d"][i]);
  rect([2.1, 13.1, .32, .42], "#141820", K, .03); ctx.fillStyle = "#29f2e4"; ctx.fillRect(2.14, 13.16, .24, .3);
  for (let i = 0; i < 7; i++) dot(2.15 + (i % 2) * .22, 15.0 + i * .15, .07, ["#29f2e4", "#7d3cc8", "#1f6fa8", "#e9f7ff", "#2b2b33"][i % 5], K);
  rect([.36, 10.3, .12, .9], "#1a1d1b", "#6b4428", .03);
  // angolo viola sotto la scala: mensola con bottiglie e teschio
  rect(ALCOVE, "#3a2014", K, .05); for (let i = 0; i < 9; i++) dot(3.0 + i * .3, 9.52, .08, ["#29f2e4", "#ff2e88", "#ffd166", "#f6f0ff"][i % 4]); dot(5.55, 9.52, .11, "#f2efe6", K);

  // sedie e sgabelli, poi chi è seduto, poi i tavoli (le gambe restano sotto il piano)
  for (const s of SLOTS) if (s.kind === "tavolo" || s.kind === "sala") bistro(s.x, s.y, s.a);
  for (const s of SLOTS) if (s.kind === "alto") { dot(s.x, s.y, .22, "#2b2b30", K); dot(s.x, s.y, .15, "#a3162a"); }
  for (const g of guests) if (g.st === "sit") person(g, g.cheer > 0 ? "cheer" : "sit", 1.25);
  table(TABLE, "#3d2216"); for (const [x, y, c] of DRINKS) dot(x, y, .09, c, K);
  rect([TABLE[0] + .5, TABLE[1] + 2.0, .45, .32], "#f0e4c8", K, .03); // libro sul tavolone
  table(HIGH, "#5a3420");
  for (const r of BACK_TABLES) table(r, "#b0844f"); table(LONG_TABLE, "#b0844f");
  dot(BACK_TABLES[0][0] + .35, BACK_TABLES[0][1] + .35, .1, "#ff8a3d", K); // la zucca sul tavolino
  // telo del proiettore (appeso sopra il tavolino alto): spento fuori partita
  const [sx, sy, sw, sh] = SCREEN;
  rect([sx - .12, sy - .1, sw + .24, sh + .2], "#1a1a1e", K, .06);
  if (!match) { rect([sx, sy, sw, sh], "#d8d6cf", ""); ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fillRect(sx, sy + sh - .2, sw, .2); }
  else if (tv) renderPitch(ctx, match, sx, sy, sw, sh);
  else { rect([sx, sy, sw, sh], "#101a3a", ""); ctx.fillStyle = "#ffd166"; ctx.font = ".34px Bungee, sans-serif"; ctx.textAlign = "center"; ctx.fillText(clockLine(match), sx + sw / 2, sy + sh * .66); }
  // proiettore nella cassetta di legno appesa al soffitto
  rect([9.55, 10.0, .5, .4], "#7a5230", K, .05); dot(9.8, 10.42, .06, match ? "#7dff9a" : "#2b4a33");
  // lampade bianche ai lati del telo
  dot(7.75, 18.55, .2, "#f4f2ff", K); dot(11.85, 18.55, .2, "#f4f2ff", K);
  // saletta: tenda verde con piante, TV sulla parete est, murale delle birre sul muro di fondo
  rect([10.9, .35, 2.75, .9], "#7d9a78", K, .05); ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = .04; ctx.beginPath(); for (let x = 11.1; x < 13.6; x += .3) { ctx.moveTo(x, .35); ctx.lineTo(x, 1.25); } ctx.stroke();
  for (const [x, y, r] of [[10.6, .95, .42], [13.25, 1.65, .38]]) { dot(x, y, r, "#2e7d32", K); dot(x - .1, y - .1, r * .55, "#43a047"); }
  rect([13.5, 4.0, .15, 1.0], "#111", K, .03); if (tv && match) renderPitch(ctx, match, 13.52, 4.05, .11, .9); else { ctx.fillStyle = "#1d2a3a"; ctx.fillRect(13.52, 4.05, .11, .9); }
  // passaggio: cassettiera, specchio; bagni: tramezzo con due porte arancioni, lavandino
  rect(DRESSER, "#e8e0cc", K, .04); rect([7.92, 7.9, .08, 1.05], "#cfe3f0", K, .02);
  rect(WC_WALL, "#e6e0d3", K, .04); rect([2.7, 7.78, .8, .19], "#ff5a1f", K, .03); rect([4.4, 7.78, .8, .19], "#ff5a1f", K, .03);
  rect([2.45, 6.0, .35, .5], "#f4f4f2", K, .03); dot(2.62, 6.25, .12, "#cfd8dc");

  // persone in piedi
  for (const g of guests) if (g.st !== "sit") person(g, g.cheer > 0 ? "cheer" : g.path.length ? "walk" : g.st === "stand" ? "drink" : "idle", 1.25);
  person(Object.assign(PLOOK, { x: P.x, y: P.y, a: P.a, anim: P.anim }), P.moving ? "walk" : "idle", 1.25);

  // muri
  for (const [x, y, w, h, st] of WALLS) { rect([x, y, w, h], WALL_COL[st], K, .08);
    if (st === "pietra") for (let i = 0; i < (w + h) * 5; i++) { const px = x + ((i * 37) % 100) / 100 * w, py = y + ((i * 61) % 100) / 100 * h; dot(px, py, .06, i % 3 ? "#e3d8bf" : "#a85a3c"); } }
  // citazioni scritte a gesso sui muri blu
  ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = .02; ctx.beginPath();
  for (const [x0, x1, y] of [[.6, 2.4, 9.17], [8.4, 11, 9.17], [12, 13.4, 9.17], [5.6, 8.8, 19.17]]) for (let x = x0; x < x1; x += .25) { ctx.moveTo(x, y); ctx.lineTo(x + .14, y + (x * 7 % 2 ? .03 : -.03)); }
  ctx.stroke();
  // parete est: bancali con led viola, libri e bottiglie sopra; lavagna e orologio sul muro
  rect(WAINSCOT, "#5b3420", K, .05); ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = .03; ctx.beginPath(); for (let y = 9.6; y < 19; y += .3) { ctx.moveTo(13.25, y); ctx.lineTo(13.65, y); } ctx.stroke();
  for (let y = 9.6, k = 0; y < 18.8; y += .17, k++) { ctx.fillStyle = ["#e8474f", "#f2c94c", "#3d7fe0", "#efe8dc", "#49b86b", "#7d3cc8", "#2b2b33"][(k * 5) % 7]; ctx.fillRect(13.45, y, .16, .13); }
  rect([13.68, 12.6, .3, 3.6], "#1f2b22", "#7a5230", .04); rect([13.68, 10.2, .3, .7], "#e8e2cc", K, .03);
  // bandierine: Italia '90 nell'angolo e una sciarpa rossonera (il bar è milanista)
  ctx.fillStyle = "#f4f4f4"; ctx.beginPath(); ctx.moveTo(13.65, 9.35); ctx.lineTo(13.0, 9.35); ctx.lineTo(13.4, 9.9); ctx.fill(); ctx.fillStyle = "#2e9e57"; ctx.fillRect(13.0, 9.35, .2, .1);
  for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? "#111" : "#d3121e"; ctx.fillRect(9 + i * .2, 9.05, .2, .25); }
  // porta dei bagni con cornice blu e cartello
  rect([5.6, 6.6, .45, .8], "#2340a8", K, .04); ctx.fillStyle = "#f4f0c8"; ctx.font = ".2px Bungee, sans-serif"; ctx.textAlign = "center"; ctx.fillText("WC", 5.83, 7.06);
  // murale delle birre sulla parete di fondo della saletta
  for (const [x, c] of [[8.6, "#f2a93b"], [9.3, "#f6c445"]] as [number, string][]) { ctx.fillStyle = c; ctx.fillRect(x, .08, .45, .22); ctx.fillStyle = "#fff8e0"; ctx.fillRect(x, .05, .45, .06); }

  // luci: lampade a sospensione sul bancone, led viola, lucine sul tubo, faretti nel passaggio e nella saletta
  ctx.globalCompositeOperation = "lighter";
  for (const y of [11.4, 14.2]) glow(2.6, y, 2.4, "255,200,130", .3);
  for (let y = 9.8; y < 18.8; y += 1.2) glow(13.2, y, 1.3, "220,40,255", .28 + .06 * Math.sin(now / 400 + y));
  glow(7.75, 18.55, 1.2, "235,230,255", .3); glow(11.85, 18.55, 1.2, "235,230,255", .3);
  for (let y = 6.0; y < 9; y += 1.2) glow(7.95, y, 1.0, "255,220,160", .22);
  for (const [x, y] of [[5.5, 2.2], [10.5, 3.0]]) glow(x, y, 2.6, "255,215,150", .22);
  if (tv && match) glow(sx + sw / 2, sy, 3, "90,230,140", .18);
  ctx.globalCompositeOperation = "source-over";
  for (let y = 9.7; y < 16.2; y += .35) dot(3.05, y + Math.sin(y * 3) * .05, .045, "#fff4c8");
  for (let x = 6.1; x < 8; x += .35) dot(x, 5.45 + Math.sin(x * 4) * .04, .04, "#fff4c8");
  // insegna al neon sulla porta
  ctx.fillStyle = `rgba(255,46,136,${.6 + .4 * (.5 + .5 * Math.sin(now / 200))})`; ctx.fillRect(3.45, 19.2, 1.5, .15);
}
