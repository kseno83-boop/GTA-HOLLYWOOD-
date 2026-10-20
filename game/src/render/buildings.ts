// ---------- Edifici in pseudo-3D (stile GTA2) ----------
// Ogni edificio ha un aspetto stabile ricavato da tipo e piani OSM (se mancano, stimati da tipo e superficie):
// facciate nei colori lombardi con file di finestre e persiane, vetrine al piano terra, tetti a padiglione in coppi,
// tetti piani con parapetto e impianti, capannoni in lamiera, tettoie e box bassi. Di notte qualche finestra è accesa.
// La proiezione verso la camera è affine a quota costante: un punto a quota z va in p + (p - camera) * z / (CH - z).
import { G } from "../core/state";
import { K, hyp } from "../core/util";
import { buildings, type Building } from "../world/map";
import { V } from "./view";

type Rgb = [number, number, number];
const hex = (s: string): Rgb => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
/** Numeri casuali con seme: lo stesso edificio ha sempre lo stesso aspetto. */
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = <T>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];

// tavolozze: intonaci del centro (ocra, giallo, salmone, crema, grigio, rosa antico...), palazzi moderni, capannoni
const FACADE = ["#d9a85b", "#e8c66a", "#e39a7b", "#efe0c0", "#c9c6c0", "#d8a3a0", "#ece9e2", "#c4704f", "#b9c4a8", "#e6b98a", "#a89a88", "#e0c9a0"].map(hex);
const MODERN = ["#e8e6e1", "#c9c9c9", "#d9cfbf", "#b8bcc2", "#9aa0a6", "#cfc3b0"].map(hex);
const INDUS = ["#9b9a96", "#a5523a", "#8c949c", "#b8b0a2"].map(hex);
const TILES = ["#b5523b", "#a8452f", "#c0603f", "#9a4a35", "#8f4a3a", "#b86a4a"].map(hex);
const FLAT = ["#8d8a86", "#9c958c", "#6f6d6b", "#a7a29a", "#7f8a8f", "#8a8478"].map(hex);
const CORR = ["#7b8794", "#6a7b88", "#9aa3a8", "#5f6b73", "#8a7f74"].map(hex);
const SHUTTERS = ["#3f6b45", "#2f5a3c", "#6b4a2e", "#5b5f3a"];
const LOW = new Set(["garages", "garage", "roof", "shed", "service", "carport", "parking"]);

type RoofKind = "flat" | "tiles" | "corr" | "shed";
interface Prop { pts: number[]; z0: number; z1: number; col: Rgb; fan?: boolean }
interface Style { h: number; floors: number; wall: Rgb; roof: Rgb; rk: RoofKind; rh: number; inner: number[] | null; parapet: number[] | null;
  props: Prop[]; shutters: string | null; shops: boolean; seed: number; ang: number }

function inPoly(p: number[], x: number, y: number) { let c = false; const n = p.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) { const xi = p[2 * i], yi = p[2 * i + 1], xj = p[2 * j], yj = p[2 * j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
/** Poligono rientrato di d verso l'interno (spigoli raccordati a punta); null se degenera (lati che si ribaltano, punte fuori). */
function inset(b: Building, d: number): number[] | null { const p = b.p, n = b.n, out: number[] = [];
  for (let i = 0; i < n; i++) { const h = (i + n - 1) % n, j = (i + 1) % n;
    const ax = p[2 * i] - p[2 * h], ay = p[2 * i + 1] - p[2 * h + 1], la = hyp(ax, ay) || 1, bx = p[2 * j] - p[2 * i], by = p[2 * j + 1] - p[2 * i + 1], lb = hyp(bx, by) || 1;
    // normali verso l'interno dei due lati
    const n1x = -b.s * ay / la, n1y = b.s * ax / la, n2x = -b.s * by / lb, n2y = b.s * bx / lb; let mx = n1x + n2x, my = n1y + n2y; const ml = hyp(mx, my);
    if (ml < .2) return null; mx /= ml; my /= ml; const c = mx * n1x + my * n1y; if (c < .3) return null;
    out.push(p[2 * i] + mx * d / c, p[2 * i + 1] + my * d / c); }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, ox = p[2 * j] - p[2 * i], oy = p[2 * j + 1] - p[2 * i + 1], ix = out[2 * j] - out[2 * i], iy = out[2 * j + 1] - out[2 * i + 1];
    if (ox * ix + oy * iy < 0 || !inPoly(p, out[2 * i], out[2 * i + 1])) return null; }
  return out; }
function perimeter(b: Building) { let s = 0; for (let i = 0; i < b.n; i++) { const j = (i + 1) % b.n; s += hyp(b.p[2 * j] - b.p[2 * i], b.p[2 * j + 1] - b.p[2 * i + 1]); } return s; }
function longestAngle(b: Building) { let best = 0, a = 0; for (let i = 0; i < b.n; i++) { const j = (i + 1) % b.n, dx = b.p[2 * j] - b.p[2 * i], dy = b.p[2 * j + 1] - b.p[2 * i + 1], L = hyp(dx, dy); if (L > best) { best = L; a = Math.atan2(dy, dx); } } return a; }
const box = (x: number, y: number, w: number, d: number, a: number) => { const c = Math.cos(a), s = Math.sin(a), pts: number[] = [];
  for (const [u, v] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]) pts.push(x + u * c - v * s, y + u * s + v * c); return pts; };

function styleOf(b: Building): Style {
  const r = rng(Math.floor(b.p[0] * 73.1) * 31 + Math.floor(b.p[1] * 41.7)), k = b.kind, A = b.area;
  let floors: number, h: number, wall = pick(r, FACADE), rk: RoofKind = "tiles", roof = pick(r, TILES);
  if (b.levels > 0) floors = Math.round(b.levels);
  else if (LOW.has(k)) floors = 1;
  else if (k === "house" || k === "detached" || k === "villa") floors = 2 + (r() < .4 ? 1 : 0);
  else if (k === "apartments" || k === "residential") floors = A > 300 ? 4 + Math.floor(r() * 3) : 3 + Math.floor(r() * 2);
  else if (k === "commercial" || k === "retail" || k === "office") floors = 3 + Math.floor(r() * 3);
  else if (k === "school" || k === "public" || k === "train_station") floors = 3;
  else if (k === "grandstand") floors = 2;
  else floors = A < 35 ? 1 : A < 150 ? 2 + (r() < .5 ? 1 : 0) : A < 700 ? 3 + Math.floor(r() * 2) : 4 + Math.floor(r() * 2);
  h = floors * 3.1 + .6;
  if (LOW.has(k)) { h = 2.8 + r() * .6; rk = "shed"; roof = pick(r, FLAT).map(v => v * .75) as Rgb; wall = pick(r, MODERN); floors = 0; }
  else if (k === "industrial" || k === "warehouse" || k === "grandstand") { h = b.levels > 0 ? h : 7 + r() * 3; rk = "corr"; roof = pick(r, CORR); wall = pick(r, INDUS); floors = 1; }
  else if (k === "church") { h = 16; floors = 2; wall = hex("#d8cfbf"); roof = hex("#7a3b2e"); }
  else { const modern = (k === "apartments" && A > 400 && r() < .5) || ((k === "office" || k === "commercial" || k === "retail") && r() < .7)
      || ((k === "school" || k === "public" || k === "train_station") && r() < .6) || A > 1500 || r() < .15;
    if (modern) { rk = "flat"; roof = pick(r, FLAT); if (r() < .6) wall = pick(r, MODERN); } }
  h = Math.min(h, 40);
  // tetto a padiglione: rientro della linea di colmo in base alla larghezza tipica (2·area/perimetro)
  let inner: number[] | null = null, rh = 0;
  if (rk === "tiles") { let d = Math.min(4.5, Math.max(.8, 1.25 * A / perimeter(b))); for (let t = 0; t < 4 && !inner; t++, d *= .7) inner = inset(b, d);
    if (inner) rh = d / .7 * .55; else { rk = "flat"; roof = pick(r, FLAT); } }
  const parapet = rk === "flat" ? inset(b, .45) : null, ang = longestAngle(b), props: Prop[] = [];
  // impianti sui tetti piani (condizionatori, comignoli, vano scala, lucernari), comignoli sui coppi
  const want = rk === "flat" ? Math.min(5, A < 80 ? 0 : 1 + Math.floor(A / 250 * r())) : rk === "tiles" ? (r() < .7 ? 1 + (r() < .4 ? 1 : 0) : 0) : 0;
  for (let t = 0; t < want * 8 && props.length < want; t++) { const x = b.x0 + r() * (b.x1 - b.x0), y = b.y0 + r() * (b.y1 - b.y0);
    if (!inPoly(b.p, x, y) || (parapet && !inPoly(parapet, x, y)) || (inner && rk === "tiles" && inPoly(inner, x, y))) continue;
    if (rk === "tiles") { props.push({ pts: box(x, y, .55, .55, ang), z0: h + rh * .5, z1: h + rh * .5 + 1.1, col: hex("#8a4b3a") }); continue; }
    const q = r(); if (q < .45) props.push({ pts: box(x, y, .95, .7, ang), z0: h, z1: h + .7, col: hex("#cfd2d4"), fan: true });
    else if (q < .7) props.push({ pts: box(x, y, .5, .5, ang), z0: h, z1: h + 1.3, col: hex("#7d5a4a") });
    else if (q < .88) props.push({ pts: box(x, y, 2.4, 2, ang), z0: h, z1: h + 2.3, col: wall.map(v => v * .92) as Rgb });
    else props.push({ pts: box(x, y, 1.8, 1, ang), z0: h, z1: h + .25, col: hex("#6fa8c8") }); }
  const shops = floors >= 2 && rk !== "corr" && (k === "commercial" || k === "retail" || r() < .35);
  return { h, floors, wall, roof, rk, rh, inner, parapet, props, shutters: rk === "tiles" && r() < .75 ? pick(r, SHUTTERS) : null, shops, seed: Math.floor(r() * 1e6), ang };
}
const STYLE = new Map<Building, Style>(buildings.map(b => [b, styleOf(b)]));
/** Altezza in metri (per chi deve sapere quanto è alto un edificio). */
export const heightOf = (b: Building) => STYLE.get(b)!.h;

const frac = (v: number) => v - Math.floor(v);
const hash = (a: number, b: number) => frac(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453);
const NIGHT: Rgb = [20, 8, 48];

/** veil = opacità del velo della notte: gli edifici lo applicano ai propri colori, così le finestre accese (disegnate subito,
 *  in modalità "lighter") restano nascoste dietro agli edifici più vicini. */
export function drawBuildings(vx0: number, vx1: number, vy0: number, vy1: number, veil: number) {
  const ctx = V.ctx, { camX, camY, S } = G, CH = Math.max(55, 1300 / S), lit = veil / .6;
  const col = (c: Rgb, k = 1) => `rgb(${Math.min(255, c[0] * k) * (1 - veil) + NIGHT[0] * veil | 0},${Math.min(255, c[1] * k) * (1 - veil) + NIGHT[1] * veil | 0},${Math.min(255, c[2] * k) * (1 - veil) + NIGHT[2] * veil | 0})`;
  const list = buildings.filter(b => b.x1 > vx0 && b.x0 < vx1 && b.y1 > vy0 && b.y0 < vy1);
  list.sort((a, b) => hyp(b.cx - camX, b.cy - camY) - hyp(a.cx - camX, a.cy - camY));
  ctx.lineCap = "butt";
  const proj = (x: number, y: number, z: number): [number, number] => { const f = z / (CH - z); return [x + (x - camX) * f, y + (y - camY) * f]; };
  for (const b of list) { const st = STYLE.get(b)!, p = b.p, n = b.n, f = st.h / (CH - st.h), rx: number[] = [], ry: number[] = [];
    for (let i = 0; i < n; i++) { rx.push(p[2 * i] + (p[2 * i] - camX) * f); ry.push(p[2 * i + 1] + (p[2 * i + 1] - camY) * f); }
    // pareti verso la camera, con finestre piano per piano
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, dx = p[2 * j] - p[2 * i], dy = p[2 * j + 1] - p[2 * i + 1], L = hyp(dx, dy) || 1, nx = b.s * dy / L, ny = -b.s * dx / L;
      if (nx * (camX - p[2 * i]) + ny * (camY - p[2 * i + 1]) <= 0) continue;
      const sh = .4 + .45 * Math.max(0, -nx * .6 - ny * .8);
      ctx.fillStyle = col(st.wall, sh); ctx.beginPath(); ctx.moveTo(p[2 * i], p[2 * i + 1]); ctx.lineTo(p[2 * j], p[2 * j + 1]); ctx.lineTo(rx[j], ry[j]); ctx.lineTo(rx[i], ry[i]); ctx.closePath(); ctx.fill();
      const lw = (hyp(rx[i] - p[2 * i], ry[i] - p[2 * i + 1]) + hyp(rx[j] - p[2 * j], ry[j] - p[2 * j + 1])) / 2 / Math.max(1, st.floors) * .42;
      if (st.floors > 0 && L > 2.2 && lw > .07) for (let k = 0; k < st.floors; k++) {
        const t = (k + .55) / st.floors, x1 = p[2 * i] + (rx[i] - p[2 * i]) * t, y1 = p[2 * i + 1] + (ry[i] - p[2 * i + 1]) * t, x2 = p[2 * j] + (rx[j] - p[2 * j]) * t, y2 = p[2 * j + 1] + (ry[j] - p[2 * j + 1]) * t;
        const sc = 1 + f * t, Lp = hyp(x2 - x1, y2 - y1), shop = k === 0 && st.shops, church = b.kind === "church";
        const step = (shop ? 3.2 : church ? 3.6 : 2.6) * sc, win = (shop ? 2.4 : church ? .8 : .9) * sc, off = -((Lp % step) + step - win) / 2;
        ctx.lineWidth = lw * (church ? 1.6 : 1);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        if (st.shutters && !shop) { ctx.setLineDash([win + .6 * sc, step - win - .6 * sc]); ctx.lineDashOffset = off + .3 * sc; ctx.strokeStyle = col(hex(st.shutters), sh * 1.3); ctx.stroke(); }
        ctx.setLineDash([win, step - win]); ctx.lineDashOffset = off; ctx.strokeStyle = shop ? "#1d2a36" : "#1f2235"; ctx.stroke();
        // di notte finestre accese (una su 1–4, diversa per piano e per facciata) e vetrine illuminate
        if (lit > .15) { const m1 = 1 + Math.floor(hash(st.seed + k, i) * 4), m2 = 1 + Math.floor(hash(i, st.seed - k) * 3);
          ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = shop ? `rgba(140,225,255,${.55 * lit})` : `rgba(255,205,120,${.6 * lit})`;
          ctx.setLineDash(shop ? [win, step - win] : [win, step * m1 - win, win, step * m2 - win]); ctx.lineDashOffset = off - (shop ? 0 : step * Math.floor(hash(k, i + st.seed) * 3));
          ctx.stroke(); ctx.globalCompositeOperation = "source-over"; } }
      ctx.setLineDash([]); ctx.strokeStyle = K; ctx.lineWidth = .12;
      ctx.beginPath(); ctx.moveTo(p[2 * i], p[2 * i + 1]); ctx.lineTo(p[2 * j], p[2 * j + 1]); ctx.lineTo(rx[j], ry[j]); ctx.lineTo(rx[i], ry[i]); ctx.closePath(); ctx.stroke();
      // cornicione
      ctx.strokeStyle = col(st.wall, sh * .7); ctx.lineWidth = .2; ctx.beginPath(); ctx.moveTo(rx[i], ry[i]); ctx.lineTo(rx[j], ry[j]); ctx.stroke(); }
    // tetto
    if (st.rk === "tiles" && st.inner) { const ix: number[] = [], iy: number[] = [], zt = st.h + st.rh;
      for (let i = 0; i < n; i++) { const [x, y] = proj(st.inner[2 * i], st.inner[2 * i + 1], zt); ix.push(x); iy.push(y); }
      for (let i = 0; i < n; i++) { const j = (i + 1) % n, dx = p[2 * j] - p[2 * i], dy = p[2 * j + 1] - p[2 * i + 1], L = hyp(dx, dy) || 1, nx = b.s * dy / L, ny = -b.s * dx / L;
        ctx.fillStyle = col(st.roof, .62 + .45 * Math.max(0, -nx * .6 - ny * .8)); ctx.beginPath(); ctx.moveTo(rx[i], ry[i]); ctx.lineTo(rx[j], ry[j]); ctx.lineTo(ix[j], iy[j]); ctx.lineTo(ix[i], iy[i]); ctx.closePath(); ctx.fill();
        // file di coppi
        ctx.strokeStyle = "rgba(60,20,12,.35)"; ctx.lineWidth = .14; ctx.beginPath();
        for (const t of [.25, .5, .75]) { ctx.moveTo(rx[i] + (ix[i] - rx[i]) * t, ry[i] + (iy[i] - ry[i]) * t); ctx.lineTo(rx[j] + (ix[j] - rx[j]) * t, ry[j] + (iy[j] - ry[j]) * t); } ctx.stroke(); }
      ctx.fillStyle = col(st.roof, .95); ctx.beginPath(); ctx.moveTo(ix[0], iy[0]); for (let i = 1; i < n; i++) ctx.lineTo(ix[i], iy[i]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(40,12,8,.6)"; ctx.lineWidth = .12; ctx.beginPath(); for (let i = 0; i < n; i++) { ctx.moveTo(rx[i], ry[i]); ctx.lineTo(ix[i], iy[i]); }
      ctx.moveTo(ix[0], iy[0]); for (let i = 1; i <= n; i++) ctx.lineTo(ix[i % n], iy[i % n]); ctx.stroke();
      ctx.strokeStyle = K; ctx.lineWidth = .3; ctx.beginPath(); ctx.moveTo(rx[0], ry[0]); for (let i = 1; i < n; i++) ctx.lineTo(rx[i], ry[i]); ctx.closePath(); ctx.stroke(); }
    else { ctx.save(); ctx.translate(-camX * f, -camY * f); ctx.scale(1 + f, 1 + f); const lk = 1 / (1 + f);
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 1; i < n; i++) ctx.lineTo(p[2 * i], p[2 * i + 1]); ctx.closePath();
      ctx.fillStyle = col(st.roof); ctx.fill();
      if (st.rk === "corr") { ctx.save(); ctx.clip(); const c = Math.cos(st.ang), s = Math.sin(st.ang), R = hyp(b.x1 - b.x0, b.y1 - b.y0) / 2 + 1;
        ctx.strokeStyle = col(st.roof, .78); ctx.lineWidth = .18 * lk; ctx.beginPath();
        for (let o = -R; o < R; o += 1.1) { ctx.moveTo(b.cx - s * o - c * R, b.cy + c * o - s * R); ctx.lineTo(b.cx - s * o + c * R, b.cy + c * o + s * R); } ctx.stroke(); ctx.restore(); }
      ctx.strokeStyle = K; ctx.lineWidth = .3 * lk; ctx.stroke();
      if (st.parapet) { const q = st.parapet; ctx.strokeStyle = col(st.roof, 1.25); ctx.lineWidth = .35 * lk; ctx.beginPath(); ctx.moveTo(q[0], q[1]); for (let i = 1; i < n; i++) ctx.lineTo(q[2 * i], q[2 * i + 1]); ctx.closePath(); ctx.stroke(); }
      else if (st.rk !== "corr") { ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.lineWidth = .5 * lk; ctx.stroke(); }
      ctx.restore(); }
    // impianti e comignoli: base scura alla quota del tetto, cima chiara alla quota dell'oggetto
    for (const pr of st.props) { const q = pr.pts;
      for (const [z, k] of [[pr.z0, .55], [pr.z1, 1]] as [number, number][]) { ctx.fillStyle = col(pr.col, k); ctx.beginPath();
        for (let i = 0; i < 4; i++) { const [x, y] = proj(q[2 * i], q[2 * i + 1], z); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.fill(); if (k === 1) { ctx.strokeStyle = K; ctx.lineWidth = .08; ctx.stroke(); } }
      if (pr.fan) { const cx = (q[0] + q[4]) / 2, cy = (q[1] + q[5]) / 2, [x, y] = proj(cx, cy, pr.z1); ctx.strokeStyle = "#5a5e63"; ctx.lineWidth = .08; ctx.beginPath(); ctx.arc(x, y, .25, 0, 7); ctx.stroke(); } } }
}
