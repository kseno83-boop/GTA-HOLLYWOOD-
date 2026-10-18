// Volumi dei suoni continui in base a cosa succede (auto, sirene vicine, bar pieno, partita in TV).
import { G, P, peds, cars, keys } from "../core/state";
import { clamp, hyp } from "../core/util";
import { VT } from "../sim/traffic";
import { guests } from "../sim/bar";
import { playing } from "../sim/football";
import { audio, LOOP, engineOsc, sfx } from "./sfx";
import { bgm } from "./music";

let stepPhase = 0;
export function audioFrame() { const AC = audio.ctx; if (!AC) return; const set = (n: string, v: number) => LOOP[n] && LOOP[n].gain.setTargetAtTime(audio.muted ? 0 : v, AC.currentTime, .12);
  const car = G.scene === "out" && P.car && !VT[P.car.type].bike ? P.car : null; set("engine", car ? .08 + Math.min(.12, Math.abs(car.v) * .005) : 0); if (car && engineOsc) engineOsc.frequency.setTargetAtTime(38 + Math.abs(car.v) * 4.5, AC.currentTime, .1);
  let near = 1e9, nearB = 1e9; if (G.heat > 0) for (const p of peds) if (p.cop && p.st !== "dead") near = Math.min(near, hyp(p.x - P.x, p.y - P.y));
  for (const c of cars) if (c.siren) { const d = hyp(c.x - P.x, c.y - P.y); if (c.type === "police") near = Math.min(near, d); else nearB = Math.min(nearB, d); }
  set("siren", G.scene === "out" ? clamp(.07 - near / 1200, 0, .07) : 0); set("bitone", G.scene === "out" ? clamp(.06 - nearB / 1500, 0, .06) : 0);
  set("chatter", G.scene === "bar" ? .05 + guests.length * .006 : 0); set("tv", G.scene === "bar" && playing() ? .035 : 0); set("city", G.scene === "out" ? .05 : 0);
  if (G.started && !P.car && P.moving) { const ph = Math.floor(P.anim / Math.PI); if (ph !== stepPhase) { stepPhase = ph; sfx.step(!!(keys.ShiftLeft || keys.ShiftRight)); } }
  bgm.volume = audio.muted ? 0 : G.scene === "bar" ? .3 : .55; }
