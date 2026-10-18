// ---------- Disegno interno del Bar Hollywood ----------
import { G, P, PLOOK } from "../core/state";
import { K } from "../core/util";
import { F, playing, clockLine } from "../sim/football";
import { guests, barista, SLOTS, TABLE, SCREEN, OBST, DRINKS } from "../sim/bar";
import { V, worldXf } from "./view";
import { person, drawFx } from "./sprites";
import { renderPitch } from "./pitch";

export function drawBar() {
  const ctx = V.ctx, now = G.now, match = F.match;
  worldXf();
  ctx.fillStyle = "#0c0714"; ctx.fillRect(-30, -30, 80, 70);
  for (let x = 0; x < 32; x++) for (let y = 0; y < 22; y++) { ctx.fillStyle = (x + y) % 2 ? "#3b1f5c" : "#5a2d7a"; ctx.fillRect(x / 2, y / 2, .5, .5); }
  ctx.fillStyle = "#4a2c1d"; ctx.fillRect(.35, .35, 2.6, 9.3); for (let y = .35; y < 9.6; y += .45) { ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(.35, y, 2.6, .05); }
  const sp = .5 + .5 * Math.sin(now / 200), tv = playing();
  if (match) { ctx.globalCompositeOperation = "lighter"; const lg = ctx.createLinearGradient(0, 10.3, 0, 6.5);
    lg.addColorStop(0, `rgba(80,220,140,${tv ? .28 : .14})`); lg.addColorStop(1, "rgba(80,220,140,0)"); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(9.3, 10.3); ctx.lineTo(13.5, 10.3); ctx.lineTo(14.8, 6.5); ctx.lineTo(8, 6.5); ctx.fill();
    ctx.globalCompositeOperation = "source-over"; }
  drawFx();
  // scaffale bottiglie e bancone
  ctx.fillStyle = "#23130c"; ctx.strokeStyle = K; ctx.lineWidth = .06; ctx.fillRect(.35, .9, .5, 8); ctx.strokeRect(.35, .9, .5, 8);
  for (let i = 0; i < 30; i++) { ctx.fillStyle = ["#29f2e4", "#ff2e88", "#ffd166", "#8ad16b", "#f6f0ff", "#ff8a3d"][i % 6]; ctx.fillRect(.45 + (i % 2) * .18, 1 + i * .26, .14, .14); }
  person(barista, barista.moving ? "walk" : "idle", 1.3);
  ctx.fillStyle = "#7a4528"; ctx.strokeStyle = K; ctx.lineWidth = .08; ctx.fillRect(2, 1, .9, 7.6); ctx.strokeRect(2, 1, .9, 7.6);
  ctx.fillStyle = "#a8683d"; ctx.fillRect(2.62, 1, .28, 7.6);
  for (const y of [2.4, 2.6, 2.8]) { ctx.fillStyle = "#c9ccd6"; ctx.beginPath(); ctx.arc(2.3, y, .08, 0, 7); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = "#1c1c22"; ctx.fillRect(2.15, 7.4, .6, .5); ctx.fillStyle = "#29f2e4"; ctx.fillRect(2.25, 7.5, .4, .12);
  // tavolone
  const [tx, ty, tw, th] = TABLE;
  for (const s of SLOTS) if (s.kind === "tavolo") { ctx.fillStyle = "#3a2318"; ctx.strokeStyle = K; ctx.lineWidth = .06; ctx.fillRect(s.x - .26, s.y - .26, .52, .52); ctx.strokeRect(s.x - .26, s.y - .26, .52, .52); }
  for (const g of guests) if (g.st === "sit") person(g, g.cheer > 0 ? "cheer" : "sit", 1.25);
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(tx + .12, ty + .12, tw, th);
  ctx.fillStyle = "#8b5a35"; ctx.strokeStyle = K; ctx.lineWidth = .1; ctx.fillRect(tx, ty, tw, th); ctx.strokeRect(tx, ty, tw, th);
  ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(tx, ty, tw, .15);
  for (const [x, y, c] of DRINKS) { ctx.fillStyle = c; ctx.strokeStyle = K; ctx.lineWidth = .04; ctx.beginPath(); ctx.arc(x, y, .09, 0, 7); ctx.fill(); ctx.stroke(); }
  // bagno
  ctx.fillStyle = "#16303a"; ctx.fillRect(13.5, .35, 2.15, 2.1); ctx.fillStyle = "#29f2e4"; ctx.font = ".5px Bungee, sans-serif"; ctx.textAlign = "center"; ctx.fillText("WC", 14.6, 1.6);
  // maxischermo sulla parete sud, inclinato verso la sala
  const [sx, sy, sw] = SCREEN;
  ctx.fillStyle = "#08060c"; ctx.fillRect(sx - .15, sy - 1.25, sw + .3, 1.6);
  if (!match) { ctx.fillStyle = "#06050a"; ctx.fillRect(sx, sy - 1.15, sw, 1.3); ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.beginPath(); ctx.moveTo(sx + .4, sy - 1.15); ctx.lineTo(sx + 1.4, sy - 1.15); ctx.lineTo(sx + .6, sy + .15); ctx.lineTo(sx - .0, sy + .15); ctx.fill();
    ctx.fillStyle = "#ff2040"; ctx.fillRect(sx + sw - .25, sy + .02, .08, .08); }
  else if (tv) renderPitch(ctx, match, sx, sy - 1.15, sw, 1.3); else { ctx.fillStyle = "#101a3a"; ctx.fillRect(sx, sy - 1.15, sw, 1.3); ctx.fillStyle = "#ffd166"; ctx.font = ".38px Bungee, sans-serif"; ctx.fillText(clockLine(match), sx + sw / 2, sy - .35); }
  ctx.fillStyle = "rgba(255,255,255,.07)"; ctx.fillRect(sx, sy - 1.15, sw, .3);
  ctx.strokeStyle = "#ff2e88"; ctx.lineWidth = .08; ctx.strokeRect(sx - .15, sy - 1.25, sw + .3, 1.6);
  // persone in piedi
  for (const g of guests) if (g.st !== "sit") person(g, g.cheer > 0 ? "cheer" : g.path.length ? "walk" : g.st === "stand" ? "drink" : "idle", 1.25);
  person(Object.assign(PLOOK, { x: P.x, y: P.y, a: P.a, anim: P.anim }), P.moving ? "walk" : "idle", 1.25);
  // muri
  for (const [x, y, w, h] of OBST.slice(0, 5)) { ctx.fillStyle = "#f2e6d6"; ctx.strokeStyle = K; ctx.lineWidth = .08; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); }
  // bandiere rossonere sul muro nord
  for (const fx of [4.5, 7.5]) for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? "#111" : "#d3121e"; ctx.fillRect(fx + i * .2, .05, .2, .28); }
  ctx.fillStyle = `rgba(255,46,136,${.6 + .4 * sp})`; ctx.fillRect(4.6, 10.85, 1.6, .15);
}
