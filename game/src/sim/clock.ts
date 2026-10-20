// Orologio di gioco (1 s reale = 1 minuto), calo del ricercato col tempo, partite.
import { G, P, TEST, say } from "../core/state";
import { checkKick, updMatch, F } from "./football";
import { track } from "../audio/music";
import { updDialog } from "../characters/runtime";
import { updSpots } from "./poi";

export function tick(dt: number) {
  if (G.started) { const h0 = G.hour; if (!TEST.freezeTime) G.hour = (G.hour + dt / 60) % 24; if (G.hour < h0) G.day++; checkKick(h0, G.hour); track.t -= dt; P.hurtT -= dt; G.msgT -= dt; G.calm += dt; G.dispatch -= dt;
    if (G.calm > 12 && G.heat > 0) { G.heat = Math.max(0, G.heat - .5); G.calm = 6; } }
  if (G.started) updSpots();
  updMatch(G.started ? dt : 0, dt);
  updDialog(dt);
}
/** Tasto T: avanti di un'ora (la partita in corso avanza di 60 minuti). */
export function skipHour() { const had = !!F.match, h0 = G.hour; G.hour = (G.hour + 1) % 24; if (G.hour < h0) G.day++; if (had) updMatch(60, 0); checkKick(h0, G.hour); updMatch(0, 0); say("+1 ORA", 1); }
