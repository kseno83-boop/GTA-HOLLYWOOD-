// ---------- Disegno esterno ----------
// Terreno, strade con sensi unici, mezzi e persone, poi edifici pseudo-3D stile GTA2, notte e luci.
import { G, P, PLOOK, peds, cars, dark } from "../core/state";
import { K, hyp } from "../core/util";
import { NX, NY, WW, WH, roads, green, water, rivers, rails, buildings, DOOR, SIGN, POIS, PLACES, type Road } from "../world/map";
import { V, PAT, worldXf } from "./view";
import { SPOTS } from "../world/poi";
import { drawDehorsGround, drawDehorsTop, drawDehorsGlow } from "./dehors";
import { LIGHTS, person, vehicle, drawFx, drawBullets, drawLights, pedPose, wreckOverlay, drawParts } from "./sprites";

function pathPts(p: number[]) { const ctx = V.ctx; ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); }
function roadPath(r: Road) { const ctx = V.ctx; ctx.beginPath(); ctx.moveTo(NX[r.ids[0]], NY[r.ids[0]]); for (let i = 1; i < r.ids.length; i++) ctx.lineTo(NX[r.ids[i]], NY[r.ids[i]]); }
export function drawOut() {
  const ctx = V.ctx, { camX, camY, S, now } = G;
  const hw = V.LW * V.PX / 2 / S, hh = V.LH * V.PX / 2 / S, vx0 = camX - hw - 30, vx1 = camX + hw + 30, vy0 = camY - hh - 30, vy1 = camY + hh + 30, nt = dark(G.hour);
  worldXf();
  ctx.fillStyle = "#120b1c"; ctx.fillRect(camX - hw - 2, camY - hh - 2, hw * 2 + 4, hh * 2 + 4);
  ctx.fillStyle = PAT.ground; ctx.fillRect(0, 0, WW, WH);
  ctx.fillStyle = PAT.grass; for (const g of green) { pathPts(g); ctx.fill(); }
  ctx.fillStyle = "#1f6fa8"; for (const g of water) { pathPts(g); ctx.fill(); }
  ctx.lineJoin = ctx.lineCap = "round"; ctx.strokeStyle = "#1f6fa8"; ctx.lineWidth = 9; for (const g of rivers) { pathPts(g); ctx.stroke(); }
  ctx.strokeStyle = "rgba(140,220,255,.35)"; ctx.lineWidth = .3; ctx.setLineDash([1.2, 2.5]); ctx.lineDashOffset = -now / 300; for (const g of rivers) { pathPts(g); ctx.stroke(); } ctx.setLineDash([]); ctx.lineDashOffset = 0;
  const vis = roads.filter(r => r.x1 > vx0 && r.x0 < vx1 && r.y1 > vy0 && r.y0 < vy1);
  ctx.strokeStyle = K; for (const r of vis) if (r.car) { ctx.lineWidth = r.w + 3.6; roadPath(r); ctx.stroke(); }
  ctx.strokeStyle = PAT.side; for (const r of vis) if (r.car) { ctx.lineWidth = r.w + 3.2; roadPath(r); ctx.stroke(); }
  for (const r of vis) if (!r.car) { ctx.strokeStyle = r.t === "pedestrian" || r.ztl ? PAT.porf : PAT.side; ctx.lineWidth = r.w; roadPath(r); ctx.stroke(); }
  ctx.strokeStyle = "#1c1a22"; for (const r of vis) if (r.car) { ctx.lineWidth = r.w + .4; roadPath(r); ctx.stroke(); }
  ctx.strokeStyle = PAT.asph; for (const r of vis) if (r.car) { ctx.lineWidth = r.w; roadPath(r); ctx.stroke(); }
  ctx.strokeStyle = "#e9dc8f"; ctx.lineWidth = .18; ctx.setLineDash([2.5, 3]); for (const r of vis) if (r.w >= 8.5 && r.car && !r.oneway) { roadPath(r); ctx.stroke(); } ctx.setLineDash([]);
  // frecce dei sensi unici sull'asfalto
  ctx.strokeStyle = "rgba(240,236,220,.55)"; ctx.lineWidth = .3; for (const r of vis) if (r.oneway) for (let i = 0; i < r.ids.length - 1; i++) {
    const a = r.ids[i], b = r.ids[i + 1], L = hyp(NX[b] - NX[a], NY[b] - NY[a]), ux = (NX[b] - NX[a]) / (L || 1), uy = (NY[b] - NY[a]) / (L || 1);
    for (let d = 6; d < L - 3; d += 18) { const x = NX[a] + ux * d, y = NY[a] + uy * d; ctx.beginPath(); ctx.moveTo(x - ux * .9 - uy * .7, y - uy * .9 + ux * .7); ctx.lineTo(x, y); ctx.lineTo(x - ux * .9 + uy * .7, y - uy * .9 - ux * .7); ctx.moveTo(x, y); ctx.lineTo(x - ux * 2.2, y - uy * 2.2); ctx.stroke(); } }
  ctx.strokeStyle = "#5b4130"; ctx.lineWidth = 2.6; for (const g of rails) { pathPts(g); ctx.stroke(); }
  ctx.strokeStyle = "#c9c0b3"; ctx.lineWidth = .25; ctx.setLineDash([.3, .7]); for (const g of rails) { pathPts(g); ctx.stroke(); } ctx.setLineDash([]);
  drawFx();
  const pulse = .5 + .5 * Math.sin(now / 250);
  ctx.strokeStyle = `rgba(255,46,136,${.45 + .5 * pulse})`; ctx.lineWidth = .3; ctx.beginPath(); ctx.arc(DOOR.x, DOOR.y, 1.4 + pulse * .4, 0, 7); ctx.stroke();
  for (const q of PLACES) { ctx.strokeStyle = q.col; ctx.globalAlpha = .45 + .4 * pulse; ctx.lineWidth = .25; ctx.beginPath(); ctx.arc(q.dx, q.dy, 1.2 + pulse * .3, 0, 7); ctx.stroke(); }
  // punti d'interesse: cerchio più piccolo e tenue davanti alla porta
  ctx.lineWidth = .18; for (const q of SPOTS) { if (q.dx < vx0 || q.dx > vx1 || q.dy < vy0 || q.dy > vy1) continue; ctx.strokeStyle = q.col; ctx.globalAlpha = .3 + .3 * pulse; ctx.beginPath(); ctx.arc(q.dx, q.dy, .9 + pulse * .2, 0, 7); ctx.stroke(); }
  ctx.globalAlpha = 1;
  drawDehorsGround();
  LIGHTS.length = 0; for (const c of cars) if (c.x > vx0 && c.x < vx1 && c.y > vy0 && c.y < vy1) { vehicle(c, nt > .3); if (c.wreck) wreckOverlay(c); }
  for (const p of peds) if (p.st === "dead") person(p, "dead");
  for (const p of peds) if (p.st !== "dead") person(p, pedPose(p));
  if (!P.car) person(Object.assign(PLOOK, { x: P.x, y: P.y, a: P.a, anim: P.anim, flash: P.flash }), P.seat >= 0 && !(P.flash > 0) ? "sit" : "gun");
  drawBullets(); drawParts();
  drawDehorsTop(nt);
  // edifici in pseudo-3D: tetti proiettati verso la camera come in GTA2
  const CH = Math.max(55, 1300 / S), list = buildings.filter(b => b.x1 > vx0 && b.x0 < vx1 && b.y1 > vy0 && b.y0 < vy1);
  list.sort((a, b) => hyp(b.cx - camX, b.cy - camY) - hyp(a.cx - camX, a.cy - camY));
  for (const b of list) { const f = b.h / (CH - b.h), p = b.p, n = b.n, rx: number[] = [], ry: number[] = [], [r0, g0, b0] = b.roof;
    for (let i = 0; i < n; i++) { rx.push(p[2 * i] + (p[2 * i] - camX) * f); ry.push(p[2 * i + 1] + (p[2 * i + 1] - camY) * f); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, dx = p[2 * j] - p[2 * i], dy = p[2 * j + 1] - p[2 * i + 1], L = hyp(dx, dy) || 1, nx = b.s * dy / L, ny = -b.s * dx / L;
      if (nx * (camX - p[2 * i]) + ny * (camY - p[2 * i + 1]) <= 0) continue;
      const sh = .32 + .32 * Math.max(0, -nx * .6 - ny * .8);
      ctx.fillStyle = `rgb(${215 * sh | 0},${180 * sh | 0},${190 * sh | 0})`; ctx.strokeStyle = K; ctx.lineWidth = .12;
      ctx.beginPath(); ctx.moveTo(p[2 * i], p[2 * i + 1]); ctx.lineTo(p[2 * j], p[2 * j + 1]); ctx.lineTo(rx[j], ry[j]); ctx.lineTo(rx[i], ry[i]); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = `rgb(${r0},${g0},${b0})`; ctx.strokeStyle = K; ctx.lineWidth = .3;
    ctx.beginPath(); ctx.moveTo(rx[0], ry[0]); for (let i = 1; i < n; i++) ctx.lineTo(rx[i], ry[i]); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,.14)`; ctx.lineWidth = .5; ctx.stroke(); }
  // notte e luci
  if (nt > 0) { ctx.fillStyle = `rgba(20,8,48,${.6 * nt})`; ctx.fillRect(camX - hw - 2, camY - hh - 2, hw * 2 + 4, hh * 2 + 4);
    ctx.globalCompositeOperation = "lighter";
    for (const q of POIS) { if (q.x < vx0 || q.x > vx1 || q.y < vy0 || q.y > vy1) continue; const col = q.k === 2 ? "70,110,255" : q.k === 4 ? "255,80,60" : q.k === 3 ? "190,120,255" : "255,150,70";
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 9); g.addColorStop(0, `rgba(${col},${.4 * nt})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(q.x - 9, q.y - 9, 18, 18); }
    if (!P.car) { const l = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, 5); l.addColorStop(0, `rgba(255,220,200,${.3 * nt})`); l.addColorStop(1, "rgba(255,220,200,0)"); ctx.fillStyle = l; ctx.fillRect(P.x - 5, P.y - 5, 10, 10); }
    for (const q of PLACES) { const l = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 10); l.addColorStop(0, q.col + "55"); l.addColorStop(1, q.col + "00"); ctx.fillStyle = l; ctx.fillRect(q.x - 10, q.y - 10, 20, 20); }
    for (const q of SPOTS) { if (q.x < vx0 || q.x > vx1 || q.y < vy0 || q.y > vy1) continue; const l = ctx.createRadialGradient(q.dx, q.dy, 0, q.dx, q.dy, 7); l.addColorStop(0, q.col + "40"); l.addColorStop(1, q.col + "00"); ctx.fillStyle = l; ctx.fillRect(q.dx - 7, q.dy - 7, 14, 14); }
    drawDehorsGlow(nt);
    const g = ctx.createRadialGradient(SIGN.x, SIGN.y, 0, SIGN.x, SIGN.y, 16); g.addColorStop(0, `rgba(255,46,136,${.35 * nt})`); g.addColorStop(1, "rgba(255,46,136,0)"); ctx.fillStyle = g; ctx.fillRect(SIGN.x - 16, SIGN.y - 16, 32, 32);
    ctx.globalCompositeOperation = "source-over"; }
  drawLights(nt); }
