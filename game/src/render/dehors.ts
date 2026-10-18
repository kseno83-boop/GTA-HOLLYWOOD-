// Disegno del dehors dell'Hollywood: arredi a terra (sotto le persone), coperture e lucine (sopra), bagliore di notte.
import { G } from "../core/state";
import { K } from "../core/util";
import { F, FACADE_ANGLE, EDGE, U0, U1, LONG, BENCHES, TABLES, PRES, PRES_BENCHES, CHAIRS, BARREL, BOARD, ROOFS, POSTS, toWorld, type Table } from "../world/dehors";
import { V, PAT } from "./view";

/** Esegue fn nel sistema locale della facciata (x = u, y = n). */
function local(fn: (ctx: CanvasRenderingContext2D) => void) { const ctx = V.ctx; ctx.save(); ctx.translate(F.ox, F.oy); ctx.rotate(FACADE_ANGLE); fn(ctx); ctx.restore(); }
function wood(ctx: CanvasRenderingContext2D, t: Table, dark = false, light = false) {
  const x = t.u - t.w / 2, y = t.n - t.d / 2;
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(x + .08, y + .1, t.w, t.d);
  ctx.fillStyle = light ? "#a8875e" : dark ? "#4a3020" : "#6b4428"; ctx.strokeStyle = K; ctx.lineWidth = .06; ctx.fillRect(x, y, t.w, t.d); ctx.strokeRect(x, y, t.w, t.d);
  ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = .03; ctx.beginPath();
  if (t.w > t.d) for (let k = y + .15; k < y + t.d - .05; k += .15) { ctx.moveTo(x, k); ctx.lineTo(x + t.w, k); }
  else for (let k = x + .15; k < x + t.w - .05; k += .15) { ctx.moveTo(k, y); ctx.lineTo(k, y + t.d); }
  ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(x, y, t.w, .06);
}
/** Arredi a terra: si disegnano prima delle persone, così chi è seduto sta sopra la sedia. */
export function drawDehorsGround() {
  // porfido sotto il dehors e lungo la facciata (la strada OSM qui è deviata verso il centro); in coordinate del mondo
  // perché la trama combaci con quella della strada
  const ctx0 = V.ctx; ctx0.fillStyle = PAT.porf; ctx0.beginPath();
  for (const [u, n] of [[U0 - 9.5, 0], [U1 + 9.5, 0], [U1 + 9.5, EDGE + .4], [U0 - 9.5, EDGE + .4]]) { const p = toWorld(u, n); ctx0.lineTo(p.x, p.y); }
  ctx0.fill();
  local(ctx => {
    // sedie in metallo (stile Tolix): seduta quadrata e schienale dalla parte opposta al tavolo
    for (const c of CHAIRS) { ctx.save(); ctx.translate(c.u, c.n); ctx.rotate(Math.atan2(c.fn, c.fu));
      ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(-.17, -.17, .44, .44);
      ctx.fillStyle = c.col; ctx.strokeStyle = K; ctx.lineWidth = .05; ctx.fillRect(-.21, -.21, .42, .42); ctx.strokeRect(-.21, -.21, .42, .42);
      ctx.fillRect(-.27, -.22, .08, .44); ctx.strokeRect(-.27, -.22, .08, .44);
      ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(-.15, -.15, .3, .06); ctx.restore(); }
    for (const b of BENCHES) wood(ctx, b, true);
    for (const b of PRES_BENCHES) wood(ctx, b, false, true);
    wood(ctx, LONG); for (const t of TABLES) wood(ctx, t, false, !!t.pres);
    // gambe pieghevoli nere del tavolo presidenziale (si vedono ai lati corti)
    ctx.fillStyle = "#1b1b20"; for (const du of [-PRES.w / 2 - .03, PRES.w / 2 - .03]) ctx.fillRect(PRES.u + du, PRES.n - PRES.d / 2 + .05, .06, PRES.d - .1);
    // bicchieri e posacenere sui tavoli
    ctx.fillStyle = "#e8f4ff"; for (const t of TABLES) { ctx.beginPath(); ctx.arc(t.u + .15, t.n - .1, .06, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#2b2b33"; ctx.beginPath(); ctx.arc(LONG.u - .5, LONG.n, .08, 0, 7); ctx.fill();
    // tavolo presidenziale: posacenere, birre, telefono e cartellino "riservato"
    ctx.fillStyle = "#2b2b33"; ctx.beginPath(); ctx.arc(PRES.u - .75, PRES.n, .08, 0, 7); ctx.fill();
    for (const [du, dn] of [[-.4, .1], [.1, -.12], [.6, .08]]) { ctx.fillStyle = "#f3b33d"; ctx.beginPath(); ctx.arc(PRES.u + du, PRES.n + dn, .07, 0, 7); ctx.fill(); ctx.strokeStyle = "#fff8e0"; ctx.lineWidth = .02; ctx.stroke(); }
    ctx.fillStyle = "#14201a"; ctx.fillRect(PRES.u - .2, PRES.n + .05, .1, .18);
    ctx.fillStyle = "#f4efe6"; ctx.strokeStyle = K; ctx.lineWidth = .03; ctx.fillRect(PRES.u + .32, PRES.n - .2, .28, .16); ctx.strokeRect(PRES.u + .32, PRES.n - .2, .28, .16);
    ctx.fillStyle = "#d3121e"; ctx.fillRect(PRES.u + .36, PRES.n - .14, .2, .04);
    // botte
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.arc(BARREL.u + .08, BARREL.n + .1, BARREL.r, 0, 7); ctx.fill();
    ctx.fillStyle = "#6e4426"; ctx.strokeStyle = K; ctx.lineWidth = .06; ctx.beginPath(); ctx.arc(BARREL.u, BARREL.n, BARREL.r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#8f8f96"; ctx.lineWidth = .04; for (const r of [BARREL.r * .78, BARREL.r * .45]) { ctx.beginPath(); ctx.arc(BARREL.u, BARREL.n, r, 0, 7); ctx.stroke(); }
    // lavagnetta col menù
    ctx.fillStyle = "#1a1d1b"; ctx.strokeStyle = "#6b4428"; ctx.lineWidth = .06; ctx.fillRect(BOARD.u - .3, BOARD.n - .1, .6, .22); ctx.strokeRect(BOARD.u - .3, BOARD.n - .1, .6, .22);
    ctx.strokeStyle = "rgba(240,240,230,.7)"; ctx.lineWidth = .025; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(BOARD.u - .22, BOARD.n - .05 + i * .045); ctx.lineTo(BOARD.u + (i % 2 ? .1 : .2), BOARD.n - .05 + i * .045); } ctx.stroke();
  });
}
/** Lucine appese lungo il bordo del pergolato (con un po' di pancia tra un palo e l'altro). */
function bulbs() { const out: { u: number; n: number }[] = [];
  for (let i = 0; i < POSTS.length - 1; i++) { const a = POSTS[i], b = POSTS[i + 1], k = Math.max(2, Math.round((b - a) / .75));
    for (let j = 0; j < k; j++) { const t = j / k; out.push({ u: a + (b - a) * t, n: EDGE - Math.sin(t * Math.PI) * .25 }); } }
  return out; }
const BULBS = bulbs();
/** Coperture viste dall'alto: canne rade e tenda semitrasparenti per vedere chi c'è sotto. */
export function drawDehorsTop(nt: number) {
  local(ctx => {
    for (const r of ROOFS) { const w = r.u1 - r.u0;
      if (r.kind === "tenda") {
        ctx.fillStyle = "rgba(150,150,158,.5)"; ctx.fillRect(r.u0, 0, w, EDGE - .15);
        ctx.fillStyle = "rgba(120,120,128,.65)"; for (let u = r.u0; u < r.u1; u += .3) { ctx.beginPath(); ctx.arc(u + .15, EDGE - .15, .15, 0, Math.PI); ctx.fill(); }
        ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = .04; ctx.beginPath(); for (let u = r.u0 + .4; u < r.u1; u += .4) { ctx.moveTo(u, 0); ctx.lineTo(u, EDGE - .15); } ctx.stroke();
      } else {
        ctx.strokeStyle = "rgba(196,164,96,.38)"; ctx.lineWidth = .07; ctx.beginPath();
        for (let n = .1; n < EDGE; n += .14) { ctx.moveTo(r.u0, n); ctx.lineTo(r.u1, n + Math.sin(n * 37) * .03); } ctx.stroke();
        ctx.strokeStyle = "rgba(120,96,50,.45)"; ctx.lineWidth = .03; ctx.beginPath(); for (let n = .17; n < EDGE; n += .42) { ctx.moveTo(r.u0, n); ctx.lineTo(r.u1, n); } ctx.stroke();
      }
      // telaio in ferro
      ctx.strokeStyle = "#2a2a30"; ctx.lineWidth = .08; ctx.strokeRect(r.u0, 0, w, EDGE);
    }
    ctx.fillStyle = "#1b1b20"; for (const u of POSTS) ctx.fillRect(u - .07, EDGE - .07, .14, .14);
    // filo e lampadine
    ctx.strokeStyle = "rgba(20,20,24,.8)"; ctx.lineWidth = .03; ctx.beginPath(); BULBS.forEach((b, i) => i ? ctx.lineTo(b.u, b.n) : ctx.moveTo(b.u, b.n)); ctx.stroke();
    const on = nt > .05; for (const b of BULBS) { ctx.fillStyle = on ? "#fff4c8" : "rgba(235,235,225,.8)"; ctx.beginPath(); ctx.arc(b.u, b.n, .07, 0, 7); ctx.fill(); }
  });
}
/** Di notte: bagliore caldo delle lucine e luce viola dei led del bancone che esce dalla porta. */
export function drawDehorsGlow(nt: number) {
  const ctx = V.ctx, door = toWorld(0, .3), flick = .85 + .15 * Math.sin(G.now / 130);
  let g = ctx.createRadialGradient(door.x, door.y, 0, door.x, door.y, 3.2); g.addColorStop(0, `rgba(170,60,255,${.28 * nt * flick})`); g.addColorStop(1, "rgba(170,60,255,0)");
  ctx.fillStyle = g; ctx.fillRect(door.x - 3.2, door.y - 3.2, 6.4, 6.4);
  for (let i = 0; i < BULBS.length; i += 3) { const p = toWorld(BULBS[i].u, BULBS[i].n); g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 1.2);
    g.addColorStop(0, `rgba(255,214,140,${.16 * nt})`); g.addColorStop(1, "rgba(255,214,140,0)"); ctx.fillStyle = g; ctx.fillRect(p.x - 1.2, p.y - 1.2, 2.4, 2.4); }
}
