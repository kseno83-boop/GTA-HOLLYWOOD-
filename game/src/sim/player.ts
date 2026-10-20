// ---------- Giocatore ----------
// A piedi 5,6 m/s (corsa 9), nel bar 4,6. Ogni mezzo si può rubare.
import { G, P, TEST, peds, cars, bullets, blood, shells, keys, mouse, joy, touchFire, say } from "../core/state";
import { R, clamp, pick, hyp, angDiff, TOUCH } from "../core/util";
import { pushOut, solidAt, DOOR, placeNear } from "../world/map";
import { sfx } from "../audio/sfx";
import { VT, boxDist, boxPush, nearVeh, crashBike } from "./traffic";
import { makePed, panic, crime, hurt, kill, shootPed, INSULTS } from "./peds";
import { enterBar } from "./bar";
import { talkTarget, talk } from "../characters/runtime";
import { presSeatNear, sitPlayer, standPlayer } from "./dehors";
import { spotNear, spotAction } from "./poi";

export function inputVec(): [number, number] { if (joy.on) return [joy.dx, joy.dy];
  const x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), y = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  const l = hyp(x, y); return l ? [x / l, y / l] : [0, 0]; }
export function screenToWorld(sx: number, sy: number) { return [G.camX + (sx - G.cw / 2) / G.S, G.camY + (sy - G.ch / 2) / G.S]; }
export function shoot() { if (P.cool > 0) return; if (G.scene === "bar") { say("Niente armi all'Hollywood."); P.cool = 1; return; }
  if (P.car) return; P.cool = TEST.rapidFire ? .07 : .28; P.flash = .07; G.shake = Math.max(G.shake, .22); let a = P.a;
  if (TOUCH) { let best = 20, tgt = null; for (const p of peds) { if (p.st === "dead") continue; const d = hyp(p.x - P.x, p.y - P.y);
      if (d < best && Math.abs(angDiff(P.a, Math.atan2(p.y - P.y, p.x - P.x))) < .7) { best = d; tgt = p; } } if (tgt) a = P.a = Math.atan2(tgt.y - P.y, tgt.x - P.x); }
  sfx.shot(); bullets.push({ x: P.x + Math.cos(a) * .9, y: P.y + Math.sin(a) * .9, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, life: .5, px: P.x, py: P.y });
  shells.push({ x: P.x, y: P.y, vx: -Math.sin(a) * R(2, 4) + R(-1, 1), vy: Math.cos(a) * R(2, 4) + R(-1, 1), r: R(0, 3), t: .35 }); if (shells.length > 80) shells.shift();
  panic(P.x, P.y, 35); crime(.1); }
/** Tasto E / AZIONE: parla, entra, mangia, usa i punti d'interesse (sim/poi.ts), ruba o scendi dal mezzo. */
export function action() {
  const npc = talkTarget(); if (npc) { talk(npc); return; }
  if (G.scene === "bar") return;
  if (P.seat >= 0) { standPlayer(); return; }
  const seat = presSeatNear(); if (seat >= 0) { sitPlayer(seat); say("TAVOLO PRESIDENZIALE", 2); return; }
  if (P.car) { const c = P.car; if (Math.abs(c.v) > 3) return; c.v = 0; P.car = null; sfx.carDoor(); const ew = VT[c.type].W / 2 + .8; P.x = c.x - Math.sin(c.a) * ew; P.y = c.y + Math.cos(c.a) * ew; pushOut(P, .35); return; }
  if (hyp(P.x - DOOR.x, P.y - DOOR.y) < 3.5) { enterBar(); return; }
  const q = placeNear(); if (q) { if (q.kind === "food") { if (P.hp < 100) { P.hp = 100; sfx.eat(); say(`${q.name} · SALUTE PIENA`); } else say("Non hai fame adesso.");
    } else { say(`${q.name} · TERRITORIO RIVALE`); for (const p of peds) if (p.gang === q.name && p.st === "loiter" && !p.npc) { p.bub = pick(["Fuori di qui!", "Qui non entri", "Torna all'Hollywood"]); p.bubT = 2; } } return; }
  const s = spotNear(); if (s) { spotAction(s); return; }
  const c = nearVeh();
  if (c) { if (c.ai || c.mode || c.rider) { makePed(P.x, P.y, Object.assign({}, c.rider || {}, { st: "flee" as const, t: 6, spd: 5, bub: pick(["Ladro!!", "Fermatelo!", "Il mio mezzo!"]), bubT: 2.5 })); crime(c.type === "police" ? 1.2 : .35); }
    Object.assign(c, { ai: false, mode: null, siren: false, rider: null, tmp: false, inLane: false, wheelie: 0, hazard: false }); P.car = c; sfx.carDoor(); if (peds.some(p => p.st !== "dead" && hyp(p.x - P.x, p.y - P.y) < 15)) crime(.4); }
}
export function updPlayer(dt: number) {
  const [ix, iy] = inputVec(); P.cool -= dt; P.flash -= dt;
  if (P.car) { const c = P.car, T = VT[c.type]; let thr = 0, steer = 0;
    if (joy.on) { const m = hyp(ix, iy); if (m > .2) { const d = angDiff(c.a, Math.atan2(iy, ix)); if (Math.abs(d) < 2.2) { steer = clamp(d * 2, -1, 1); thr = m * Math.max(.25, Math.cos(d)); } else { thr = -m * .6; steer = -clamp(d, -1, 1); } } }
    else { thr = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0); steer = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0); }
    c.v += thr * (thr * c.v < 0 ? T.acc * 1.5 : T.acc) * dt; c.v = clamp(c.v, -T.max * .25, T.max * (TEST.fast ? 1.6 : 1)); c.v *= 1 - (thr ? .25 : 1.1) * dt; if (keys.Space) c.v *= 1 - 3 * dt;
    c.a += c.v / (T.L * .75) * Math.tan(steer * .55) * dt;
    c.x += Math.cos(c.a) * c.v * dt; c.y += Math.sin(c.a) * c.v * dt;
    const k = Math.max(0, T.L / 2 - 1), rr = Math.min(.95, T.W / 2 + .05), f = { x: c.x + Math.cos(c.a) * k, y: c.y + Math.sin(c.a) * k }, b = { x: c.x - Math.cos(c.a) * k, y: c.y - Math.sin(c.a) * k };
    const hf = !TEST.ghost && pushOut(f, rr), hb = !TEST.ghost && pushOut(b, rr), sp0 = Math.abs(c.v);
    if (hf || hb) { c.x = (f.x + b.x) / 2; c.y = (f.y + b.y) / 2; if (sp0 > 7) { G.shake = .3; sfx.crash(); if (sp0 > 12) hurt((sp0 - 12) * 2.5); } c.v *= sp0 > 7 ? -.3 : .93; }
    let hitV = null;
    for (const o of cars) { if (o === c || Math.abs(o.x - c.x) > 16 || Math.abs(o.y - c.y) > 16) continue;
      for (const s of [-1, 0, 1]) { const pt = { x: c.x + Math.cos(c.a) * s * k, y: c.y + Math.sin(c.a) * s * k }, ox = pt.x, oy = pt.y; if (boxPush(pt, o, rr)) { c.x += pt.x - ox; c.y += pt.y - oy; hitV = o; } } }
    if (hitV) { if (sp0 > 7) { G.shake = .3; sfx.crash(); if (VT[hitV.type].bike && hitV.rider) crashBike(hitV); else if (hitV.ai) { hitV.v = 0; hitV.bub = pick(["Ma sei scemo?!", "La mia macchina!!", "Chiamo i vigili!"]); hitV.bubT = 2.5; crime(.3); } } c.v *= sp0 > 7 ? -.3 : .85; }
    for (const p of peds) if (p.st !== "dead" && sp0 > 4 && boxDist(p, c) < .25) { if (T.bike) { if (p.st !== "flee") { p.st = "flee"; p.t = 4; p.spd = 5; p.bub = pick(INSULTS); p.bubT = 2; } } else kill(p, Math.cos(c.a), Math.sin(c.a)); }
    P.x = c.x; P.y = c.y; P.a = c.a; return; }
  // seduto al tavolo presidenziale: ci si alza muovendosi (o con E)
  if (P.seat >= 0) { if (!ix && !iy) { P.moving = false; if (mouse.down || touchFire.held) { if (!TOUCH) { const [wx, wy] = screenToWorld(mouse.x, mouse.y); P.a = Math.atan2(wy - P.y, wx - P.x); } shoot(); } return; } standPlayer(); }
  const run = keys.ShiftLeft || keys.ShiftRight || (joy.on && hyp(ix, iy) > .92), sp = (run ? 12 : 7.5) * (TEST.fast ? 2 : 1);
  P.x += ix * sp * dt; P.y += iy * sp * dt; P.moving = !!(ix || iy); if (P.moving) { P.anim += sp * dt * 4.5; if (TOUCH) P.a += angDiff(P.a, Math.atan2(iy, ix)) * Math.min(1, dt * 12); }
  if (!TOUCH) { const [wx, wy] = screenToWorld(mouse.x, mouse.y); P.a = Math.atan2(wy - P.y, wx - P.x); }
  if (!TEST.ghost) { for (const o of cars) if (Math.abs(o.x - P.x) < 9 && Math.abs(o.y - P.y) < 9) boxPush(P, o, .35); pushOut(P, .35); }
  if (mouse.down || touchFire.held) shoot(); }
export function updBullets(dt: number) {
  for (let i = bullets.length - 1; i >= 0; i--) { const b = bullets[i]; let dead = (b.life -= dt) <= 0; b.px = b.x; b.py = b.y;
    for (let s = 0; s < 4 && !dead; s++) { b.x += b.vx * dt / 4; b.y += b.vy * dt / 4; if (solidAt(b.x, b.y)) dead = true;
      for (const p of peds) if (p.st !== "dead" && hyp(p.x - b.x, p.y - b.y) < .45) { shootPed(p, b.vx / 80, b.vy / 80); dead = true; break; } }
    if (dead) bullets.splice(i, 1); }
  for (const s of shells) if (s.t > 0) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += dt * 20; }
  for (const b of blood) if (b.pool && b.r! < b.R!) b.r += dt * .35; }
