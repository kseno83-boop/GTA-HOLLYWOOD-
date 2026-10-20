// ---------- HUD e comandi ----------
// Scena sempre attiva sopra il mondo: scanline e vignettatura, orologio, ricercato, salute, minimappa,
// partita in TV, suggerimenti, messaggi grandi, dialoghi dei personaggi; raccoglie tastiera, mouse e tocco.
import Phaser from "phaser";
import { G, P, TEST, peds, cars, keys, mouse, joy } from "../core/state";
import { testActive } from "../ui/testmode";
import { K, hyp, TOUCH } from "../core/util";
import { DOOR, PLACES, placeNear } from "../world/map";
import { F, phase, scoreLine, clockLine, nextKick } from "../sim/football";
import { LEVELS, stars as nStars } from "../sim/peds";
import { STEAL, nearVeh } from "../sim/traffic";
import { action } from "../sim/player";
import { skipHour } from "../sim/clock";
import { track, nextTrack } from "../audio/music";
import { sfx } from "../audio/sfx";
import { D, talkTarget } from "../characters/runtime";
import { presSeatNear } from "../sim/dehors";
import { renderPitch } from "../render/pitch";
import { buildMini, MINI_K } from "../ui/minimap";
import { mkText, setT, HmText, DISPLAY } from "../ui/text";
import { toggleMute } from "../ui/dom";

const col = (s: string) => Phaser.Display.Color.HexStringToColor(s).color;

export class HudScene extends Phaser.Scene {
  private hurt!: Phaser.GameObjects.Rectangle;
  private scan!: Phaser.GameObjects.TileSprite;
  private back!: Phaser.GameObjects.Graphics;
  private front!: Phaser.GameObjects.Graphics;
  private mini!: Phaser.GameObjects.Image;
  private pitch!: Phaser.GameObjects.Image;
  private title!: HmText;
  private goal!: HmText;
  private msg!: HmText;
  private T: Record<string, Phaser.GameObjects.Text> = {};
  private typed = 0;
  constructor() { super({ key: "hud", active: true }); }

  create() {
    // post-processing: rosso quando ti colpiscono, scanline (la vignettatura è nella tela del mondo, render/view.ts)
    this.hurt = this.add.rectangle(0, 0, 10, 10, 0xff0028).setOrigin(0).setAlpha(0);
    const sc = this.textures.createCanvas("scan", 1, 3)!; const sg = sc.getContext(); sg.fillStyle = "rgba(0,0,0,.5)"; sg.fillRect(0, 2, 1, 1); sc.refresh(); sc.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.scan = this.add.tileSprite(0, 0, 10, 10, "scan").setOrigin(0).setAlpha(.35);
    this.back = this.add.graphics();
    this.mini = this.add.image(0, 0, this.textures.addCanvas("mini", buildMini())!).setOrigin(0);
    this.textures.createCanvas("pitch", 8, 8);
    this.pitch = this.add.image(0, 0, "pitch").setOrigin(0);
    this.front = this.add.graphics();
    this.title = new HmText(this, DISPLAY, "left");
    const t = (k: string, size: number, font?: string, color?: string) => (this.T[k] = mkText(this, size, font, color));
    t("clock", 24, undefined, "#ffd166").setOrigin(0, .8); t("level", 18, undefined, "#7aa2ff").setOrigin(0, .8);
    t("tv", 20, undefined, "#29f2e4").setOrigin(0, .8); t("off", 20, undefined, "#29f2e4").setOrigin(1, .8);
    t("score", 16, DISPLAY, "#fff3fb").setOrigin(0, .8); t("mclock", 16, DISPLAY, "#ffd166").setOrigin(1, .8);
    t("track", 20, undefined, "#ffd166").setOrigin(0, .8); t("hint", 24, undefined, "#29f2e4").setOrigin(.5, .8);
    t("fps", 18, undefined, "#8ad16b").setOrigin(1, .8); t("test", 18, undefined, "#ffd166").setOrigin(0, .8); t("dbg", 18, undefined, "#ffd166").setOrigin(1, 1); t("who", 18, DISPLAY, "#ff2e88").setOrigin(0, 0); t("say", 24, undefined, "#fff3fb").setOrigin(0, 0);
    this.goal = new HmText(this); this.msg = new HmText(this);
    this.fit(); this.scale.on("resize", this.fit, this);
    this.bindInput();
  }
  /** Camera in pixel CSS e strati a tutto schermo ridimensionati. */
  private fit() {
    const { cw, ch, dpr } = G;
    this.cameras.main.setSize(this.scale.width, this.scale.height).setOrigin(0, 0).setZoom(dpr).setScroll(0, 0);
    this.hurt.setSize(cw, ch); this.scan.setSize(cw, ch);
    for (const t of Object.values(this.T)) t.setResolution(dpr);
  }
  private bindInput() {
    const kb = this.input.keyboard!;
    kb.addCapture("SPACE,UP,DOWN,LEFT,RIGHT");
    kb.on("keydown", (e: KeyboardEvent) => { keys[e.code] = true; if (!G.started) return;
      if (e.code === "KeyE") action(); if (e.code === "KeyT") skipHour(); if (e.code === "KeyM") toggleMute(); if (e.code === "KeyN") nextTrack(); if (e.code === "KeyF") G.showFps = !G.showFps; });
    kb.on("keyup", (e: KeyboardEvent) => { keys[e.code] = false; });
    window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
    this.input.addPointer(2);
    const css = (p: Phaser.Input.Pointer): [number, number] => [p.x / G.dpr, p.y / G.dpr];
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => { const [x, y] = css(p);
      if (p.wasTouch) { if (joy.on && p.id === joy.id) { let dx = (x - joy.ox) / 50, dy = (y - joy.oy) / 50; const l = hyp(dx, dy); if (l > 1) { dx /= l; dy /= l; } joy.dx = dx; joy.dy = dy; } }
      else { mouse.x = x; mouse.y = y; } });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => { const [x, y] = css(p);
      if (p.wasTouch) { if (!joy.on && x < G.cw * .55) Object.assign(joy, { on: true, id: p.id, ox: x, oy: y, dx: 0, dy: 0 }); }
      else { mouse.x = x; mouse.y = y; mouse.down = G.started && p.button === 0; } });
    const up = (p: Phaser.Input.Pointer) => { if (p.wasTouch) { if (p.id === joy.id) { joy.on = false; joy.id = -1; } } else mouse.down = false; };
    this.input.on("pointerup", up); this.input.on("pointerupoutside", up);
  }

  update() {
    const { cw, ch, now } = G, pad = 14, top = 12, g = this.back, f = this.front, T = this.T, match = F.match, out = G.scene === "out";
    g.clear(); f.clear();
    this.hurt.setVisible(P.hurtT > 0).setAlpha(P.hurtT * .5);
    // nome della strada (o del bar) che oscilla
    const ts = cw < 500 ? 20 : 26, title = G.scene === "bar" ? "BAR HOLLYWOOD" : (G.street || "Legnano").toUpperCase();
    this.title.set(title, pad, top + 26, ts, "#fff3fb", Math.sin(now / 700) * .025, [-2 / ts, 2 / ts, 2 / ts, -1 / ts]);
    // orologio, stelle del ricercato, salute
    const hh = Math.floor(G.hour) % 24, mm = Math.floor((G.hour % 1) * 60); let stars = ""; for (let i = 0; i < 5; i++) stars += i < nStars() ? "★" : "☆";
    setT(T.clock, `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}   ${stars}`).setPosition(pad, top + 52);
    setT(T.level, LEVELS[nStars()]).setPosition(pad + 160, top + 52).setVisible(nStars() > 0);
    g.fillStyle(col(K)).fillRect(pad + 2, top + 82, 124, 12); g.fillStyle(0x3a1530).fillRect(pad, top + 80, 124, 12);
    g.fillStyle(col(P.hurtT > 0 ? "#ffffff" : P.hp > 35 ? "#ff2e88" : "#ff4d4d")).fillRect(pad, top + 80, 124 * Math.max(0, P.hp) / 100, 12);
    T.tv.setVisible(!!(out && match && phase(match) !== "PRE")); if (T.tv.visible) setT(T.tv, `HOLLYWOOD TV · ${scoreLine(match!)} · ${clockLine(match!)}`).setPosition(pad, top + 112);
    // minimappa
    this.mini.setVisible(out);
    if (out) { const mw = Math.min(170, cw * .3), k = mw / this.mini.frame.width, mh = this.mini.frame.height * k, x = cw - mw - pad, y = top, s = k * MINI_K;
      g.fillStyle(0x29f2e4).fillRect(x + 4, y + 4, mw, mh); this.mini.setPosition(x, y).setDisplaySize(mw, mh); f.lineStyle(3, 0xff2e88).strokeRect(x, y, mw, mh);
      for (const q of PLACES) f.fillStyle(col(q.col)).fillRect(x + q.dx * s - 2.5, y + q.dy * s - 2.5, 5, 5);
      f.fillStyle(0xff2e88).fillRect(x + DOOR.x * s - 3, y + DOOR.y * s - 3, 6, 6);
      f.fillStyle(0x3d6bff); for (const c of cars) if (c.type === "police") f.fillRect(x + c.x * s - 2, y + c.y * s - 2, 4, 4);
      for (const p of peds) if (p.cop && p.st !== "dead") f.fillRect(x + p.x * s - 1.5, y + p.y * s - 1.5, 3, 3);
      f.fillStyle(0xffffff).fillCircle(x + P.x * s, y + P.y * s, 3.5); }
    // maxischermo: spento fuori partita, altrimenti riquadro con la partita
    T.off.setVisible(G.scene === "bar" && !match); if (T.off.visible) setT(T.off, `Maxischermo spento · prossima partita ${nextKick()}`).setPosition(cw - pad, top + 20);
    const box = G.scene === "bar" && match; this.pitch.setVisible(!!box); T.score.setVisible(!!box); T.mclock.setVisible(!!box);
    if (box) { const w = Math.min(300, cw * .42), h = w * .62, x = cw - w - pad, y = top;
      g.fillStyle(col(K)).fillRect(x + 5, y + 5, w, h + 30); g.fillStyle(0x170c24).fillRect(x, y, w, h + 30);
      this.drawPitch(x + 6, y + 30, w - 12, h - 6);
      const fs = w < 240 ? 13 : 16; setT(T.score, scoreLine(match), undefined, fs).setPosition(x + 8, y + 21); setT(T.mclock, clockLine(match), undefined, fs).setPosition(x + w - 8, y + 21);
      f.lineStyle(3, 0xff2e88).strokeRect(x, y, w, h + 30);
      if (match.flash > 0) this.goal.set(match.scorer === "MILAN" ? "GOL MILAN!" : "GOL!", x + w / 2, y + h / 2 + 30, w * .11, "#fff3fb", Math.sin(now / 80) * .08); else this.goal.hide(); }
    else this.goal.hide();
    T.track.setVisible(track.t > 0); if (track.t > 0) setT(T.track, `♪ ${track.name}`).setPosition(pad, ch - (TOUCH ? 110 : 64));
    // suggerimento del tasto azione
    const E = TOUCH ? "AZIONE" : "E", tt = talkTarget(); let hint = "";
    if (D.id) hint = `${E} · ${D.shown < D.text.length ? "salta" : "avanti"}`;
    else if (tt) hint = `${E} · parla con ${tt.c.nome}`;
    else if (G.scene === "bar") hint = "Esci dalla porta in basso per tornare in Corso Magenta";
    else if (P.seat >= 0) hint = `${E} · alzati`;
    else if (presSeatNear() >= 0) hint = `${E} · siediti al tavolo presidenziale`;
    else if (P.car) hint = Math.abs(P.car.v) > 3 ? "" : `${E} · scendi dall'auto`;
    else if (hyp(P.x - DOOR.x, P.y - DOOR.y) < 3.5) hint = `${E} · entra all'Hollywood`;
    else { const q = placeNear(); if (q) hint = `${E} · ${q.kind === "food" ? "mangia da " + q.name : q.name + " (rivali)"}`;
      else { const nv = nearVeh(); if (nv) hint = `${E} · ${STEAL[nv.type]}`; } }
    T.hint.setVisible(!!hint);
    if (hint) { setT(T.hint, hint).setPosition(cw / 2, ch - 40); const w = T.hint.width + 24;
      g.fillStyle(0xff2e88).fillRect(cw / 2 - w / 2 + 4, ch - 60, w, 34); g.fillStyle(0x170c24).fillRect(cw / 2 - w / 2, ch - 64, w, 34); }
    this.dialog(cw, ch);
    // messaggi grandi (CORSO MAGENTA, ARRESTATO!...)
    if (G.msgT > 0) this.msg.set(G.msg, cw / 2, ch * .3, Math.min(56, cw / 11), G.msg === "ARRESTATO!" || G.msg === "SEI MORTO" ? "#ff4d4d" : "#fff3fb", Math.sin(now / 160) * .06); else this.msg.hide();
    // modalità test: cartellino e informazioni di debug
    T.test.setVisible(testActive()); if (T.test.visible) setT(T.test, "MODALITÀ TEST · O").setPosition(pad, top + 132);
    T.dbg.setVisible(TEST.debug); if (TEST.debug) setT(T.dbg, `${G.scene === "bar" ? "bar" : G.street || "-"}  x ${P.x.toFixed(1)}  y ${P.y.toFixed(1)}\ngiorno ${G.day + 1}  calore ${G.heat.toFixed(2)}  chiamata ${Math.max(0, G.dispatch).toFixed(1)}s\npassanti ${peds.length}  mezzi ${cars.length}`).setPosition(cw - pad, ch - (TOUCH ? 140 : 44));
    T.fps.setVisible(G.showFps); if (G.showFps) setT(T.fps, `${Math.round(this.game.loop.actualFps)} FPS`).setPosition(cw - pad, ch - (TOUCH ? 110 : 20));
    if (joy.on) { f.lineStyle(3, 0x29f2e4, .6).strokeCircle(joy.ox, joy.oy, 50); f.fillStyle(0x29f2e4, .5).fillCircle(joy.ox + joy.dx * 50, joy.oy + joy.dy * 50, 22); }
  }
  private drawPitch(x: number, y: number, w: number, h: number) {
    const tex = this.textures.get("pitch") as Phaser.Textures.CanvasTexture, d = G.dpr, W = Math.round(w * d), H = Math.round(h * d);
    if (tex.width !== W || tex.height !== H) { tex.setSize(W, H); this.pitch.setSizeToFrame(); }
    const c = tex.getContext(); c.setTransform(d, 0, 0, d, 0, 0); renderPitch(c, F.match!, 0, 0, w, h); tex.refresh();
    this.pitch.setPosition(x, y).setDisplaySize(w, h);
  }
  /** Riquadro del dialogo: nome al neon e battuta che appare lettera per lettera. */
  private dialog(cw: number, ch: number) {
    const { who, say } = this.T, on = !!D.id; who.setVisible(on); say.setVisible(on);
    if (!on) { this.typed = 0; return; }
    const w = Math.min(560, cw - 32), x = (cw - w) / 2, shown = Math.floor(D.shown);
    if (shown > this.typed && shown % 3 === 0) sfx.blip(); this.typed = shown;
    if (say.style.wordWrapWidth !== w - 32) say.setWordWrapWidth(w - 32);
    setT(who, D.nome.toUpperCase()); setT(say, D.text.slice(0, shown));
    const lines = say.getWrappedText(D.text).length, h = lines * 26 + 52, y = ch - 76 - h;
    who.setPosition(x + 16, y + 10); say.setPosition(x + 16, y + 36);
    const g = this.back; g.fillStyle(0x29f2e4).fillRect(x + 5, y + 5, w, h); g.fillStyle(0x170c24).fillRect(x, y, w, h); g.lineStyle(3, 0xff2e88).strokeRect(x, y, w, h);
  }
}
