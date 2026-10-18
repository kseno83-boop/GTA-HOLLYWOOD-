// Scena dell'interno del Bar Hollywood: inquadratura fissa sulla sala, pixel più grossi.
import { G, mouse } from "../core/state";
import { clamp, TOUCH } from "../core/util";
import { updBar, guests, barista } from "../sim/bar";
import { drawBar } from "../render/hollywood";
import { B2S } from "../render/view";
import { WorldScene } from "./WorldScene";

export class BarScene extends WorldScene {
  protected readonly where = "bar" as const;
  constructor() { super("hollywood"); }
  protected simulate(dt: number) {
    if (G.started) updBar(dt);
    const { cw, ch } = G; G.S = Math.min(cw / 17, ch / 12.6);
    G.camX = 8 + (TOUCH ? 0 : clamp((mouse.x - cw / 2) / G.S * .08, -.6, .6)); G.camY = 5.6 + (TOUCH ? 0 : clamp((mouse.y - ch / 2) / G.S * .08, -.4, .4));
  }
  protected pixelSize() { return clamp(Math.round(G.S / 18), 2, 4); }
  protected draw() { drawBar(); }
  protected overlay() {
    for (const g of [barista, ...guests]) if (g.bubT > 0) { const [bx, by] = this.local(...B2S(g.x, g.y)); this.bubbles.add(bx, by - G.S * .55, g.bub); }
  }
}
