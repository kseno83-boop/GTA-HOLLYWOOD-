// Tela del mondo a bassa risoluzione (PX pixel dello schermo per pixel di tela), poi ingrandita da Phaser senza sfumare.
import { G } from "../core/state";

export const V = {
  /** Contesto 2D della tela del mondo (una CanvasTexture di Phaser). */
  ctx: undefined as unknown as CanvasRenderingContext2D,
  PX: 2, LW: 0, LH: 0,
};
/** Trasformazione mondo (metri) → tela bassa risoluzione, centrata sulla camera. */
export function worldXf() { const k = G.S / V.PX, ctx = V.ctx; ctx.setTransform(k, 0, 0, k, V.LW / 2 - G.camX * k, V.LH / 2 - G.camY * k); }
/** Mondo → pixel CSS dello schermo (prima dell'oscillazione della camera). */
export const B2S = (x: number, y: number): [number, number] => [(x - G.camX) * G.S + V.LW * V.PX / 2, (y - G.camY) * G.S + V.LH * V.PX / 2];

// texture a pixel (1 pixel = 12,5 cm)
function tile(n: number, fn: (g: CanvasRenderingContext2D, n: number) => void) { const c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d")!; fn(g, n);
  const p = g.createPattern(c, "repeat")!; p.setTransform(new DOMMatrix().scale(1 / 8)); return p; }
function noise(g: CanvasRenderingContext2D, n: number, base: string, amt: number) { g.fillStyle = base; g.fillRect(0, 0, n, n); for (let i = 0; i < n * n / 3; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? "255,255,255" : "0,0,0"},${Math.random() * amt})`; g.fillRect(Math.random() * n | 0, Math.random() * n | 0, 1, 1); } }
export const PAT = {
  asph: tile(16, (g, n) => noise(g, n, "#2f2c36", .12)),
  side: tile(8, (g, n) => { noise(g, n, "#9a8f86", .08); g.fillStyle = "#7c726c"; g.fillRect(0, 0, n, 1); g.fillRect(0, 0, 1, n); }),
  porf: tile(8, (g, n) => { g.fillStyle = "#6e5a4a"; g.fillRect(0, 0, n, n); for (let x = 0; x < n; x += 2) for (let y = 0; y < n; y += 2) { const v = 150 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v},${v * .82 | 0},${v * .66 | 0})`; g.fillRect(x, y, 1.6, 1.6); } }),
  grass: tile(16, (g, n) => noise(g, n, "#356b3c", .25)),
  ground: tile(16, (g, n) => noise(g, n, "#3a3330", .2)),
};
/** Color grading neon (rosa in alto a sinistra, ciano in basso a destra) e vignettatura scura ai bordi.
 *  Stanno nella tela del mondo invece che in strati a tutto schermo: ogni strato in più costa riempimento GPU. */
export function grade() { const ctx = V.ctx, w = V.LW, h = V.LH; ctx.setTransform(1, 0, 0, 1, 0, 0); const gr = ctx.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "rgba(255,46,136,.22)"); gr.addColorStop(1, "rgba(41,242,228,.18)");
  ctx.globalCompositeOperation = "overlay"; ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = "source-over";
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.max(w, h) * .75); vg.addColorStop(0, "rgba(10,0,20,0)"); vg.addColorStop(1, "rgba(10,0,20,.6)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h); }
