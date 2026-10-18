// Base delle scene di gioco (strada, interni): simula, disegna il mondo sulla tela a bassa risoluzione,
// la ingrandisce senza sfumature con oscillazione e scossoni della camera, poi aggiunge scritte e nuvolette.
import Phaser from "phaser";
import { G, type Scene as Where } from "../core/state";
import { R } from "../core/util";
import { V, grade } from "../render/view";
import { tick } from "../sim/clock";
import { audioFrame } from "../audio/mix";
import { Bubbles } from "../ui/text";

export const WORLD_TEX = "world";
/** Scena Phaser corrispondente a G.scene. */
export const SCENE_KEY: Record<Where, string> = { out: "street", bar: "hollywood" };

export abstract class WorldScene extends Phaser.Scene {
  protected layer!: Phaser.GameObjects.Container;
  protected bubbles!: Bubbles;
  private img!: Phaser.GameObjects.Image;
  protected abstract readonly where: Where;

  create() {
    if (!this.textures.exists(WORLD_TEX)) { const t = this.textures.createCanvas(WORLD_TEX, 64, 64)!; t.setFilter(Phaser.Textures.FilterMode.NEAREST); }
    this.layer = this.add.container(0, 0);
    this.img = this.add.image(0, 0, WORLD_TEX).setOrigin(0);
    this.layer.add(this.img);
    this.createOverlay();
    this.bubbles = new Bubbles(this, this.layer);
    this.fitCamera();
    this.scale.on("resize", this.fitCamera, this);
    this.events.on("shutdown", () => this.scale.off("resize", this.fitCamera, this));
  }
  /** La camera lavora in pixel CSS: zoom = devicePixelRatio. */
  private fitCamera() { this.cameras.main.setSize(this.scale.width, this.scale.height).setOrigin(0, 0).setZoom(G.dpr).setScroll(0, 0); }

  update(time: number, delta: number) {
    const dt = Math.min(.05, delta / 1000 || 0); G.now = time;
    tick(dt);
    this.simulate(dt);
    const { cw, ch } = G;
    V.PX = this.pixelSize();
    const LW = Math.ceil(cw / V.PX) + 2, LH = Math.ceil(ch / V.PX) + 2, tex = this.textures.get(WORLD_TEX) as Phaser.Textures.CanvasTexture;
    if (tex.width !== LW || tex.height !== LH) { tex.setSize(LW, LH); this.img.setSizeToFrame(); }
    V.LW = LW; V.LH = LH; V.ctx = tex.getContext(); V.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.draw(); grade(); tex.refresh();
    // oscillazione della camera e scossoni
    G.shake = Math.max(0, G.shake - dt); const sx = G.shake ? R(-1, 1) * G.shake * 14 : 0, sy = G.shake ? R(-1, 1) * G.shake * 14 : 0, sway = Math.sin(time / 1700) * .012 + Math.sin(time / 4100) * .008;
    this.layer.setPosition(cw / 2 + sx, ch / 2 + sy).setRotation(sway).setScale(1.04);
    this.img.setPosition(-cw / 2, -ch / 2).setScale(V.PX);
    this.bubbles.begin(); this.overlay(); this.bubbles.end();
    audioFrame();
    if (G.scene !== this.where) this.scene.switch(SCENE_KEY[G.scene]);
  }
  /** Coordinate CSS dello schermo → coordinate del contenitore (centrato). */
  protected local(x: number, y: number): [number, number] { return [x - G.cw / 2, y - G.ch / 2]; }
  protected createOverlay() {}
  protected abstract simulate(dt: number): void;
  protected abstract pixelSize(): number;
  protected abstract draw(): void;
  protected abstract overlay(): void;
}
