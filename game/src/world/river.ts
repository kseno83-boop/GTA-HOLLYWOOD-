// Olona (e acque di OSM): invalicabile per auto e moto, si passa solo sui ponti.
// Griglia da 1 m calcolata all'avvio: acqua = fascia attorno all'asse del fiume + specchi d'acqua,
// tolte le fasce delle strade (sui ponti la strada attraversa il fiume, lungo gli argini è terraferma).
import { WW, WH, NX, NY, roads, rivers, water } from "./map";

/** Mezza larghezza del fiume attorno all'asse (come lo disegna render/street.ts). */
const RIV_HW = 4.5;
const GW = Math.ceil(WW), GH = Math.ceil(WH), grid = new Uint8Array(GW * GH);

function stroke(p: number[], hw: number, v: number) {
  for (let i = 0; i + 3 < p.length; i += 2) { const ax = p[i], ay = p[i + 1], bx = p[i + 2], by = p[i + 3], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - hw)), x1 = Math.min(GW - 1, Math.ceil(Math.max(ax, bx) + hw));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - hw)), y1 = Math.min(GH - 1, Math.ceil(Math.max(ay, by) + hw));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const cx = x + .5, cy = y + .5, k = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / L2));
      if ((cx - ax - k * dx) ** 2 + (cy - ay - k * dy) ** 2 <= hw * hw) grid[y * GW + x] = v; } } }
function fill(p: number[]) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const n = p.length / 2;
  for (let i = 0; i < n; i++) { x0 = Math.min(x0, p[2 * i]); x1 = Math.max(x1, p[2 * i]); y0 = Math.min(y0, p[2 * i + 1]); y1 = Math.max(y1, p[2 * i + 1]); }
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(GH - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(GW - 1, Math.ceil(x1)); x++) {
    const cx = x + .5, cy = y + .5; let c = false;
    for (let i = 0, j = n - 1; i < n; j = i++) { const xi = p[2 * i], yi = p[2 * i + 1], xj = p[2 * j], yj = p[2 * j + 1]; if ((yi > cy) !== (yj > cy) && cx < (xj - xi) * (cy - yi) / (yj - yi) + xi) c = !c; }
    if (c) grid[y * GW + x] = 1; } }
for (const r of rivers) stroke(r, RIV_HW, 1);
for (const w of water) fill(w);
for (const r of roads) stroke(r.ids.flatMap(i => [NX[i], NY[i]]), r.w / 2 + 1, 0);

/** Vero se il punto è in acqua (fuori dai ponti). */
export function waterAt(x: number, y: number) { const gx = Math.floor(x), gy = Math.floor(y); return gx >= 0 && gy >= 0 && gx < GW && gy < GH && grid[gy * GW + gx] === 1; }
