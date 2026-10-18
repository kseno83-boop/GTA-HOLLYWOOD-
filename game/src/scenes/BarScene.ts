// Scena dell'interno del Bar Hollywood: inquadratura sulla sala che segue il giocatore verso il fondo, pixel più grossi.
import { G, P, mouse } from "../core/state";
import { clamp, TOUCH } from "../core/util";
import { updBar, guests, barista, BAR_W, BAR_H } from "../sim/bar";
import { drawBar } from "../render/hollywood";
import { B2S } from "../render/view";
import { WorldScene } from "./WorldScene";

export class BarScene extends WorldScene {
  protected readonly where = "bar" as const;
  constructor() { super("hollywood"); }
  protected simulate(dt: number) {
    if (G.started) updBar(dt);
    // la sala principale sta tutta nello schermo; verso il passaggio e la saletta la camera segue il giocatore
    const { cw, ch } = G; G.S = Math.min(cw / 15.2, ch / 11.6); const hh = ch / 2 / G.S;
    const ty = Math.max(hh - .4, Math.min(BAR_H + .4 - hh, P.y - 1.2));
    G.camY += (ty - G.camY) * Math.min(1, dt * 4); if (Math.abs(G.camY - ty) > 12) G.camY = ty;
    G.camX = BAR_W / 2 + (TOUCH ? 0 : clamp((mouse.x - cw / 2) / G.S * .08, -.6, .6));
  }
  protected pixelSize() { return clamp(Math.round(G.S / 18), 2, 4); }
  protected draw() { drawBar(); }
  protected overlay() {
    for (const g of [barista, ...guests]) if (g.bubT > 0) { const [bx, by] = this.local(...B2S(g.x, g.y)); this.bubbles.add(bx, by - G.S * .55, g.bub); }
  }
}
