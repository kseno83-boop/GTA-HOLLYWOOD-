// Campo da calcio con giocatori e palla, usato sul maxischermo del bar e nel riquadro dell'HUD.
import { G } from "../core/state";
import { TEAMS, FORM, phase, type Match } from "../sim/football";

export function renderPitch(g: CanvasRenderingContext2D, m: Match, x: number, y: number, w: number, h: number) {
  for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? "#2f8f3a" : "#38a245"; g.fillRect(x + w * i / 10, y, w / 10 + .01, h); }
  g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = Math.max(w, h) * .008; g.strokeRect(x + w * .02, y + h * .04, w * .96, h * .92);
  g.beginPath(); g.moveTo(x + w / 2, y + h * .04); g.lineTo(x + w / 2, y + h * .96); g.stroke(); g.beginPath(); g.arc(x + w / 2, y + h / 2, h * .14, 0, 7); g.stroke();
  g.strokeRect(x + w * .02, y + h * .28, w * .12, h * .44); g.strokeRect(x + w * .86, y + h * .28, w * .12, h * .44);
  const swap = phase(m) === "2T", r = Math.max(h * .035, w * .008), now = G.now;
  for (const [team, mir] of [[m.h, swap], [m.a, !swap]] as [string, boolean][]) { const [c1, c2] = TEAMS[team];
    for (let i = 0; i < 11; i++) { let [fx, fy] = FORM[i]; if (mir) fx = 1 - fx; fx += (m.bx - fx) * .28 + Math.sin(now / 400 + i * 1.7) * .012; fy += (m.by - fy) * .22 + Math.cos(now / 500 + i) * .015;
      g.fillStyle = c1; g.strokeStyle = c2; g.lineWidth = r * .45; g.beginPath(); g.arc(x + w * fx, y + h * fy, r, 0, 7); g.fill(); g.stroke(); } }
  g.fillStyle = "#fff"; g.beginPath(); g.arc(x + w * m.bx, y + h * m.by, r * .7, 0, 7); g.fill(); }
