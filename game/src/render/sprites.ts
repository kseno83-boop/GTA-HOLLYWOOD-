// ---------- Sprite procedurali dei personaggi e dei mezzi (stile Hotline Miami) ----------
// Contorno nero, vista dall'alto, pose: walk/run/gun/sit/drink/cheer/dead/idle.
import { G, P, PLOOK, blood, shells, bullets, type Body, type Look, type Ped, type Vehicle } from "../core/state";
import { K } from "../core/util";
import { VT } from "../sim/traffic";
import { V } from "./view";

export type Pose = "walk" | "run" | "gun" | "sit" | "drink" | "cheer" | "dead" | "idle";
/** Luci dinamiche raccolte mentre si disegnano i mezzi (lampeggianti, fari, quattro frecce). */
export const LIGHTS: { x: number; y: number; k?: string; r?: number; a?: number; cone?: boolean }[] = [];

function capsule(x1: number, y1: number, x2: number, y2: number, w: number, col: string) { const ctx = V.ctx; ctx.lineCap = "round"; ctx.strokeStyle = K; ctx.lineWidth = w + .08; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); }
function blob(x: number, y: number, rx: number, ry: number, col: string) { const ctx = V.ctx; ctx.fillStyle = col; ctx.strokeStyle = K; ctx.lineWidth = .07; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); ctx.stroke(); }
export function person(o: Look & Pick<Body, "x" | "y" | "a"> & { flash?: number }, pose: Pose, sc = 1.9) {
  const ctx = V.ctx, now = G.now;
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a); ctx.scale(sc * (o.size ?? 1), sc * (o.size ?? 1));
  if (pose === "dead") { capsule(-.1, -.12, -.55, -.38, .13, o.pants); capsule(-.1, .12, -.6, .2, .13, o.pants); capsule(.1, -.22, .45, -.5, .1, o.shirt); capsule(.1, .22, .5, .35, .1, o.shirt);
    blob(0, 0, .28, .22, o.shirt); blob(.36, 0, .14, .14, o.skin); ctx.restore(); return; }
  const s = Math.sin(o.anim || 0), moving = pose === "walk" || pose === "run", bob = moving ? 1 + Math.abs(s) * .05 : pose === "cheer" ? 1.08 + Math.abs(Math.sin(now / 90)) * .08 : 1;
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(.06, .08, .36, .42, 0, 0, 7); ctx.fill(); ctx.scale(bob, bob);
  if (pose === "sit") { capsule(.05, -.13, .48, -.13, .15, o.pants); capsule(.05, .13, .48, .13, .15, o.pants); }
  else if (moving) { const st = pose === "run" ? .3 : .22; capsule(0, -.13, s * st, -.13, .16, o.pants); capsule(0, .13, -s * st, .13, .16, o.pants); }
  // infradito: piedi nudi con la striscia
  if (o.flipflops) { const st = pose === "run" ? .3 : .22, fx = pose === "sit" ? [.54, .54] : moving ? [s * st + .08, -s * st + .08] : [.22, .2];
    for (const [k, fy] of [[0, -.13], [1, .13]]) { blob(fx[k], fy, .08, .055, o.skin); ctx.strokeStyle = "#2a6fd0"; ctx.lineWidth = .03; ctx.beginPath(); ctx.moveTo(fx[k] - .04, fy - .04); ctx.lineTo(fx[k] + .03, fy); ctx.lineTo(fx[k] - .04, fy + .04); ctx.stroke(); } }
  // braccia
  if (pose === "gun") { capsule(0, -.26, .42, -.06, .11, o.shirt); capsule(0, .26, .42, .06, .11, o.shirt); blob(.45, 0, .08, .09, o.skin);
    ctx.fillStyle = K; ctx.fillRect(.45, -.045, .32, .09); if (o.flash && o.flash > 0) { ctx.fillStyle = "#fff36b"; ctx.beginPath(); ctx.moveTo(.78, 0); ctx.lineTo(1.15, -.16); ctx.lineTo(1.0, 0); ctx.lineTo(1.15, .16); ctx.fill(); } }
  else if (pose === "cheer") { const w = Math.sin(now / 90) * .08; capsule(0, -.26, .12 + w, -.62, .11, o.shirt); capsule(0, .26, .12 - w, .62, .11, o.shirt); blob(.12 + w, -.66, .08, .08, o.skin); blob(.12 - w, .66, .08, .08, o.skin); }
  else if (pose === "sit" || pose === "drink") { capsule(0, -.26, .36, -.2, .11, o.shirt); capsule(0, .26, .36, .2, .11, o.shirt); blob(.38, -.2, .07, .07, o.skin); blob(.38, .2, .07, .07, o.skin);
    if (pose === "drink") { ctx.fillStyle = "#f3b33d"; ctx.fillRect(.4, .14, .14, .14); } }
  else { const sw = moving ? s * .2 : 0; capsule(0, -.27, -sw, -.32, .11, o.shirt); capsule(0, .27, sw, .32, .11, o.shirt); blob(-sw + .02, -.34, .07, .07, o.skin); blob(sw + .02, .34, .07, .07, o.skin); }
  // busto
  ctx.fillStyle = o.shirt; ctx.strokeStyle = K; ctx.lineWidth = .08; ctx.beginPath(); ctx.roundRect(-.17, -.3, .34, .6, .14); ctx.fill(); ctx.stroke();
  if (o.stripes) { ctx.save(); ctx.clip(); ctx.fillStyle = o.stripes; for (let y = -.26; y < .3; y += .16) ctx.fillRect(-.2, y, .4, .07); ctx.restore(); }
  if (o.apron) { ctx.fillStyle = o.apron; ctx.fillRect(.05, -.2, .12, .4); }
  ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(-.17, -.28, .09, .56);
  // testa (capelli lunghi: ricadono dietro la nuca)
  if (o.hairStyle === "long" && !o.cap) blob(-.15, 0, .13, .15, o.hair);
  blob(.03, 0, .15, .15, o.skin); ctx.fillStyle = o.cap || o.hair; ctx.beginPath(); ctx.arc(.01, 0, .155, Math.PI / 2, Math.PI * 1.5); ctx.fill();
  if (o.cap) { ctx.fillRect(.08, -.12, .14, .24); } else { ctx.beginPath(); ctx.ellipse(-.02, 0, o.hairStyle === "short" ? .1 : .12, o.hairStyle === "short" ? .13 : .15, 0, 0, 7); ctx.fill(); }
  // capelli arruffati: ciuffi che sparano in tutte le direzioni
  if (o.hairStyle === "wild" && !o.cap) { ctx.fillStyle = o.hair; ctx.strokeStyle = K; ctx.lineWidth = .03;
    for (let k = 0; k < 9; k++) { const t = Math.PI * (.45 + k * .14), r = .15 + (k % 3) * .025; ctx.beginPath(); ctx.arc(Math.cos(t) * r, Math.sin(t) * r, .055, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(-.03, 0, .13, .16, 0, 0, 7); ctx.fill(); }
  ctx.restore(); }

export function vehicle(c: Vehicle, night: boolean) { const ctx = V.ctx, T = VT[c.type], L = T.L / 2, W = T.W / 2, blink = Math.floor(G.now / 250) % 2;
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
  if (T.bike) { drawBike(c); ctx.restore(); return; }
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(-L + .2, -W + .15, T.L, T.W); ctx.strokeStyle = K; ctx.lineWidth = .12;
  if (c.type === "truck" || c.type === "fire" || c.type === "ambulance") { const cab = c.type === "truck" ? 2.3 : c.type === "fire" ? 2 : 1.4, body = T.L - cab - .1;
    ctx.fillStyle = c.type === "truck" ? "#e6e1d6" : c.col; ctx.beginPath(); ctx.roundRect(-L, -W, body, T.W, .15); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.type === "truck" ? "#3d5a80" : c.col; ctx.beginPath(); ctx.roundRect(L - cab, -W + .05, cab, T.W - .1, .3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#121a2a"; ctx.fillRect(L - .55, -W + .25, .35, T.W - .5);
    if (c.type === "truck") { ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = .06; for (let x = -L + .8; x < L - cab; x += .8) { ctx.beginPath(); ctx.moveTo(x, -W); ctx.lineTo(x, W); ctx.stroke(); } }
    if (c.type === "fire") { ctx.strokeStyle = "#c9ccd6"; ctx.lineWidth = .1; ctx.beginPath(); ctx.moveTo(-L + .3, -.4); ctx.lineTo(L - cab - .3, -.4); ctx.moveTo(-L + .3, .4); ctx.lineTo(L - cab - .3, .4);
      for (let x = -L + .5; x < L - cab - .3; x += .5) { ctx.moveTo(x, -.4); ctx.lineTo(x, .4); } ctx.stroke(); }
    if (c.type === "ambulance") { ctx.fillStyle = "#ff7a00"; ctx.fillRect(-L, -W, body, .22); ctx.fillRect(-L, W - .22, body, .22); ctx.fillStyle = "#1e5bd8"; ctx.fillRect(-L + 1, -.25, 1.6, .5); } }
  else { ctx.fillStyle = c.type === "police" ? "#1d4fa8" : c.col; ctx.beginPath(); ctx.roundRect(-L, -W, T.L, T.W, .45); ctx.fill(); ctx.stroke();
    if (c.type === "police") { ctx.fillStyle = "#f2f2f2"; ctx.fillRect(-L + .3, -W, T.L - .6, .2); ctx.fillRect(-L + .3, W - .2, T.L - .6, .2); }
    ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(-L + .25, -W + .1, T.L - .5, .25);
    ctx.fillStyle = "#121a2a"; ctx.beginPath(); ctx.roundRect(.4, -W + .17, .75, T.W - .34, .15); ctx.fill(); ctx.beginPath(); ctx.roundRect(-1.6, -W + .21, .55, T.W - .42, .12); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(-1.05, -W + .15, 1.45, T.W - .3); ctx.fillStyle = "#6fd3ff"; ctx.fillRect(.55, -.6, .12, .5);
    if (c.type === "ztl") { ctx.fillStyle = "#ffd166"; ctx.fillRect(.75, W - .45, .18, .18); } }
  ctx.fillStyle = "#fff6c8"; ctx.fillRect(L - .2, -W + .15, .2, .4); ctx.fillRect(L - .2, W - .55, .2, .4);
  ctx.fillStyle = "#ff2040"; ctx.fillRect(-L, -W + .15, .14, .35); ctx.fillRect(-L, W - .5, .14, .35);
  const bar = c.type === "police" || c.type === "ambulance" || c.type === "fire", on = c.siren || c.lights;
  if (bar) { const x = c.type === "police" ? -.4 : L - (c.type === "fire" ? 1.6 : 1.1); ctx.fillStyle = on && blink ? "#9cc3ff" : "#1b3a8a"; ctx.fillRect(x, -W + .35, .3, .5); ctx.fillStyle = on && !blink ? "#9cc3ff" : "#1b3a8a"; ctx.fillRect(x, W - .85, .3, .5); }
  if (c.hazard && blink) { ctx.fillStyle = "#ffb000"; for (const [x, y] of [[L - .15, -W], [L - .15, W - .2], [-L, -W], [-L, W - .2]]) ctx.fillRect(x, y, .2, .2); }
  ctx.restore();
  if (bar && on) LIGHTS.push({ x: c.x, y: c.y, k: blink ? "90,150,255" : "40,90,255", r: 7 });
  if (c.hazard && blink) LIGHTS.push({ x: c.x, y: c.y, k: "255,170,0", r: 5 });
  if (night && (c === P.car || c.ai || c.mode)) LIGHTS.push({ x: c.x + Math.cos(c.a) * L, y: c.y + Math.sin(c.a) * L, a: c.a, cone: true }); }
function drawBike(c: Vehicle) { const ctx = V.ctx, T = VT[c.type], wh = c.wheelie > 0, sc = c.type === "scooter", fw = T.L / 2 - .2, rw = -T.L / 2 + .2;
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(.1, .12, T.L / 2, .35, 0, 0, 7); ctx.fill();
  capsule(rw, 0, fw, 0, sc ? .2 : .1, sc ? "#2b2b33" : c.type === "rider" ? "#3a3a44" : "#c1121f");
  blob(rw, 0, sc ? .14 : .3, .09, "#15151a"); if (wh) blob(fw + .15, -.05, .26, .1, "#5a5a66"); else blob(fw, 0, sc ? .14 : .3, .09, "#15151a");
  capsule(fw - .1, -.32, fw - .1, .32, .06, "#c9ccd6");
  if (c.box) { ctx.fillStyle = c.box; ctx.strokeStyle = K; ctx.lineWidth = .06; ctx.fillRect(rw - .25, -.3, .55, .6); ctx.strokeRect(rw - .25, -.3, .55, .6); }
  const r = c === P.car ? PLOOK : c.rider; if (r) person(Object.assign(r, { x: wh ? -.25 : sc ? 0 : -.05, y: 0, a: 0, anim: 0 }), "sit", 1.25); }
export function drawLights(nt: number) { const ctx = V.ctx; ctx.globalCompositeOperation = "lighter";
  for (const l of LIGHTS) { if (l.cone) { if (nt < .3) continue; ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.a!); const g = ctx.createRadialGradient(4, 0, .5, 4, 0, 9);
      g.addColorStop(0, `rgba(255,240,190,${.35 * nt})`); g.addColorStop(1, "rgba(255,240,190,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -.6); ctx.lineTo(11, -4.5); ctx.lineTo(11, 4.5); ctx.lineTo(0, .6); ctx.fill(); ctx.restore(); continue; }
    const r = l.r!, g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r); g.addColorStop(0, `rgba(${l.k},${.25 + .35 * nt})`); g.addColorStop(1, `rgba(${l.k},0)`); ctx.fillStyle = g; ctx.fillRect(l.x - r, l.y - r, r * 2, r * 2); }
  ctx.globalCompositeOperation = "source-over"; }
export function pedPose(p: Ped): Pose { return p.st === "dead" ? "dead" : p.st === "loiter" && !p.mv && p.seat !== undefined ? "sit" : p.st === "idle" || (p.st === "loiter" && !p.mv) ? "idle" : p.st === "flee" || p.st === "chase" ? "run" : "walk"; }
export function drawFx() { const ctx = V.ctx;
  for (const b of blood) { ctx.fillStyle = b.pool ? "#5c0711" : "#7d0b17"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    if (b.pool) { ctx.fillStyle = "#9c1022"; ctx.beginPath(); ctx.arc(b.x - b.r * .25, b.y - b.r * .25, b.r * .45, 0, 7); ctx.fill(); } }
  ctx.fillStyle = "#e8b839"; for (const s of shells) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.r); ctx.fillRect(-.06, -.03, .12, .06); ctx.restore(); } }
export function drawBullets() { const ctx = V.ctx; ctx.lineCap = "round"; for (const b of bullets) { ctx.strokeStyle = "rgba(255,240,140,.9)"; ctx.lineWidth = .12; ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
