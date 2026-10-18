// Scena della città: centro di Legnano con traffico, passanti, bande e polizia.
import Phaser from "phaser";
import { G, P, peds, cars, mouse, dark } from "../core/state";
import { clamp, TOUCH } from "../core/util";
import { SIGN, PLACES, streetAt } from "../world/map";
import { updPlayer, updBullets } from "../sim/player";
import { updPeds } from "../sim/peds";
import { updVeh } from "../sim/traffic";
import { updStreetNpcs } from "../characters/runtime";
import { updDehors } from "../sim/dehors";
import { drawOut } from "../render/street";
import { B2S } from "../render/view";
import { WorldScene } from "./WorldScene";
import { mkText, setT, DISPLAY } from "../ui/text";

/** Dimensione di base dei testi delle insegne: si scalano invece di ridisegnarli a ogni zoom. */
const BASE = 40;

export class StreetScene extends WorldScene {
  protected readonly where = "out" as const;
  private sign!: Phaser.GameObjects.Text;
  private names: Phaser.GameObjects.Text[] = [];
  private blurKey = "";
  constructor() { super("street"); }

  protected createOverlay() {
    // margine attorno al testo, altrimenti il bagliore viene tagliato ai bordi della texture
    const glow = (t: Phaser.GameObjects.Text) => { const pad = 40; t.setPadding(pad, pad, pad, pad); return t.setOrigin(.5, (pad + .8 * (t.height - 2 * pad)) / t.height); };
    this.sign = glow(mkText(this, BASE, DISPLAY, "#ff2e88").setText("HOLLYWOOD"));
    this.names = PLACES.map(q => glow(mkText(this, BASE, DISPLAY, q.col).setText(q.name)));
    this.layer.add([this.sign, ...this.names]);
  }
  protected simulate(dt: number) {
    if (G.started) { updPlayer(dt); updBullets(dt); }
    updPeds(G.started ? dt : .016); updVeh(G.started ? dt : .016); updDehors(G.started ? dt : .016); updStreetNpcs(dt);
    const { cw, ch } = G, z = clamp(Math.max(cw, ch) / 1100, .9, 1.15), tS = (P.car ? clamp(17 - Math.abs(P.car.v) * .4, 8.5, 17) : 26) * z;
    G.S += (tS - G.S) * Math.min(1, dt * 2);
    let lx = 0, ly = 0;
    if (!P.car) { if (TOUCH) { lx = Math.cos(P.a) * 3; ly = Math.sin(P.a) * 3; } else { lx = clamp((mouse.x - cw / 2) / G.S * .3, -7, 7); ly = clamp((mouse.y - ch / 2) / G.S * .3, -5, 5); } }
    G.camX += (P.x + lx - G.camX) * Math.min(1, dt * 5); G.camY += (P.y + ly - G.camY) * Math.min(1, dt * 5);
    if ((G.streetT -= dt) <= 0) { G.street = streetAt(P.x, P.y); G.streetT = .5; }
  }
  protected pixelSize() { return 2; }
  protected draw() { drawOut(); }
  protected overlay() {
    const nt = dark(G.hour), S = G.S, now = G.now;
    // insegne al neon: il bagliore cresce con il buio
    const fs = Math.max(14, S * 1.1), fn = Math.max(11, S * .62), blur = Math.round(8 + 12 * nt);
    const flick = Math.sin(now / 90) > .97, col = flick ? "#5a1030" : nt > .3 ? "#ffd1e6" : "#ff2e88", key = `${blur}|${Math.round(fs)}|${Math.round(fn)}`;
    setT(this.sign, "HOLLYWOOD", col);
    if (key !== this.blurKey) { this.blurKey = key;
      this.sign.setShadow(0, 0, "#ff2e88", blur * BASE / fs, false, true);
      this.names.forEach((t, i) => t.setShadow(0, 0, PLACES[i].col, blur * BASE / fn, false, true)); }
    const [qx, qy] = this.local(...B2S(SIGN.x, SIGN.y)); this.sign.setPosition(qx, qy - S * 2.2).setScale(fs / BASE);
    PLACES.forEach((q, i) => { const [x, y] = this.local(...B2S(q.x, q.y)); this.names[i].setPosition(x, y - S * 1.6).setScale(fn / BASE); });
    for (const p of peds) if (p.bubT > 0) { const [bx, by] = this.local(...B2S(p.x, p.y)); this.bubbles.add(bx, by - S * .9, p.bub, p.cop); }
    for (const c of cars) if (c.bubT > 0) { const [bx, by] = this.local(...B2S(c.x, c.y)); this.bubbles.add(bx, by - S * 1.4, c.bub); }
  }
}
