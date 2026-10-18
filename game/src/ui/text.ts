// Testi Phaser per HUD e scritte nel mondo: font, titoli neon a tre strati, nuvolette.
import Phaser from "phaser";
import { G } from "../core/state";
import { K } from "../core/util";

export const DISPLAY = "Bungee, Impact, sans-serif", MONO = "VT323, monospace";

/** Testo nitido sugli schermi ad alta densità; la linea di base è circa all'80% dell'altezza (come fillText). */
export function mkText(scene: Phaser.Scene, size: number, font = MONO, color = "#fff3fb") {
  const t = scene.add.text(0, 0, "", { fontFamily: font, fontSize: `${size}px`, color }).setResolution(G.dpr);
  return t;
}
/** Imposta testo, colore e dimensione solo se cambiano (ogni cambio ridisegna la texture). */
export function setT(t: Phaser.GameObjects.Text, s: string, color?: string, size?: number) {
  if (t.text !== s) t.setText(s);
  if (color && t.style.color !== color) t.setColor(color);
  if (size && t.style.fontSize !== `${size}px`) t.setFontSize(size);
  return t;
}

/** Titolo stile Hotline Miami: copia ciano e copia rosa sfalsate sotto il colore principale. */
export class HmText {
  readonly root: Phaser.GameObjects.Container;
  private layers: Phaser.GameObjects.Text[];
  private size = 0;
  constructor(scene: Phaser.Scene, font = DISPLAY, align: "center" | "left" = "center") {
    this.layers = ["#29f2e4", "#ff2e88", "#fff3fb"].map(c => mkText(scene, 20, font, c).setOrigin(align === "center" ? .5 : 0, .8));
    this.root = scene.add.container(0, 0, this.layers);
  }
  /** off = spostamento degli strati in frazioni della dimensione: [ciano x, ciano y, rosa x, rosa y]. */
  set(t: string, x: number, y: number, size: number, col: string, rot = 0, off = [-.07, .05, .07, -.03]) {
    const [c, p, m] = this.layers;
    if (size !== this.size) { this.size = size; for (const l of this.layers) l.setFontSize(Math.round(size)); }
    for (const l of this.layers) setT(l, t);
    setT(m, t, col);
    c.setPosition(size * off[0], size * off[1]); p.setPosition(size * off[2], size * off[3]);
    this.root.setPosition(x, y).setRotation(rot).setVisible(true);
  }
  hide() { this.root.setVisible(false); }
}

/** Nuvolette di dialogo sopra le teste: un pool di testi riusati a ogni fotogramma. */
export class Bubbles {
  private box: Phaser.GameObjects.Graphics;
  private pool: Phaser.GameObjects.Text[] = [];
  private used = 0;
  constructor(private scene: Phaser.Scene, private parent: Phaser.GameObjects.Container) {
    this.box = scene.add.graphics(); parent.add(this.box);
  }
  begin() { this.box.clear(); this.used = 0; }
  /** (x, y) = punto sotto la nuvoletta, nelle coordinate del contenitore. */
  add(x: number, y: number, s: string, cop = false) {
    let t = this.pool[this.used];
    if (!t) { t = mkText(this.scene, 20).setOrigin(.5, .5); this.pool.push(t); this.parent.add(t); }
    this.used++;
    setT(t, s, cop ? "#ffffff" : "#1a0e22").setPosition(x, y - 12).setVisible(true);
    const w = t.width + 14;
    this.box.fillStyle(Phaser.Display.Color.HexStringToColor(K).color, 1).fillRect(x - w / 2 + 3, y - 19, w, 22);
    this.box.fillStyle(cop ? 0x22346e : 0xfff6fb, 1).fillRect(x - w / 2, y - 22, w, 22);
  }
  end() { for (let i = this.used; i < this.pool.length; i++) this.pool[i].setVisible(false); }
}
