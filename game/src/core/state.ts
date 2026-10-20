// Stato condiviso del gioco: orario, ricercato, giocatore, entità e palette.
import { pick } from "./util";
import type { Road } from "../world/map";

export interface Look {
  shirt: string; pants: string; skin: string; hair: string; anim: number;
  stripes?: string | null; cap?: string; apron?: string;
  /** Corporatura (1 = normale), capigliatura, infradito ai piedi. */
  size?: number; hairStyle?: "short" | "long" | "wild"; flipflops?: boolean;
}
/** Qualunque persona disegnabile: passante, avventore, giocatore. */
export interface Body extends Look {
  x: number; y: number; a: number;
  bub: string; bubT: number; moving?: boolean; flash?: number;
}
export type PedState = "walk" | "idle" | "flee" | "chase" | "loiter" | "dead";
export interface Ped extends Body {
  st: PedState; spd: number; t: number; stuck: number;
  prev: number; next: number; road: Road; side: number; j: number;
  cop?: boolean; keep?: boolean; gang?: string; hx?: number; hy?: number; mv?: boolean;
  /** Personaggio fisso (vedi src/characters). */
  npc?: string;
  /** Cliente seduto nel dehors: angolo verso il tavolo e indice del posto. */
  seat?: number; seatIdx?: number;
  /** Punti vita (colpi d'arma da fuoco): passanti 50, banda e personaggi fissi 75, agenti 100; 25 a colpo. */
  hp?: number;
  /** Si sta scansando per far passare un mezzo: tempo rimasto e punto dove si sposta. */
  dodgeT?: number; gx?: number; gy?: number;
}
export type VehType = "car" | "ztl" | "police" | "ambulance" | "fire" | "truck" | "rider" | "maranza" | "scooter";
export interface Vehicle {
  type: VehType; x: number; y: number; a: number; v: number; col: string;
  ai?: boolean; tmp?: boolean; prev: number; next: number; road: Road; permit?: boolean; lane: number;
  honkT: number; insT: number; bub: string; bubT: number; wheelie: number;
  kind?: string; mode?: string | null; siren?: boolean; lights?: boolean; deployed?: boolean; inLane?: boolean;
  hazard?: boolean; ghost?: number; blockT?: number; stuckT?: number; dist?: number; ztlOnly?: boolean;
  rider?: Look | null; box?: string;
}
export type Scene = "out" | "bar";

export const P = {
  x: 0, y: 0, a: Math.PI / 2, car: null as Vehicle | null, anim: 0, cool: 0, flash: 0, hp: 100, hurtT: 0,
  moving: false, bust: 0,
  /** Seduto al tavolo presidenziale: indice del posto (-1 = in piedi). */
  seat: -1,
};

/** Variabili globali di partita (orario, ricercato, camera, messaggi). */
export const G = {
  scene: "out" as Scene, hour: 18.5, day: 0, heat: 0, calm: 0,
  /** secondi prima che arrivino gli agenti dopo la prima stella */
  dispatch: 0, msg: "", msgT: 0, street: "" as string | null, streetT: 0,
  /** pixel CSS per metro */
  S: 20, camX: 0, camY: 0, started: false, shake: 0, now: 0,
  /** dimensioni della finestra in pixel CSS e rapporto pixel del dispositivo */
  cw: 1280, ch: 720, dpr: 1,
  /** contatore FPS (tasto F, oppure ?fps nell'indirizzo) */
  showFps: /[?&]fps\b/.test(location.search),
};
/** Opzioni della modalità test (pannello col tasto O, vedi ui/testmode.ts). */
export const TEST = { invuln: false, noPolice: false, rapidFire: false, oneShot: false, fast: false, ghost: false, freezeTime: false, debug: false };

export const peds: Ped[] = [];
export const cars: Vehicle[] = [];
export const bullets: { x: number; y: number; vx: number; vy: number; life: number; px: number; py: number }[] = [];
export const blood: { x: number; y: number; r: number; R?: number; pool?: boolean }[] = [];
export const shells: { x: number; y: number; vx: number; vy: number; r: number; t: number }[] = [];
/** Tasti premuti per codice fisico (KeyW, ShiftLeft...). */
export const keys: Record<string, boolean> = {};
export const mouse = { x: 0, y: 0, down: false };
export const joy = { on: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
export const touchFire = { held: false };

export const SHIRTS = ["#e8474f", "#3d7fe0", "#f2c94c", "#49b86b", "#efe8dc", "#9b5de5", "#f3872f", "#2b2b33", "#2ec4d6", "#e05c9c"];
export const PANTS = ["#2b2f45", "#3b3b40", "#4a3a2a", "#1d3557", "#5a5a64"];
export const SKINS = ["#f6cfae", "#e0a982", "#b07650", "#73492f", "#fbe0c6"];
export const HAIR = ["#2b1d14", "#5a3b22", "#d9b25a", "#141414", "#a8a8a8", "#8a3a1e"];
export const CARCOL = ["#e0303f", "#2f6fd0", "#ecebe6", "#23222b", "#8a93a0", "#f2b41e", "#2ea86b", "#7d3cc8", "#ff6b2f"];
/** Aspetto del giocatore. */
export const PLOOK: Look & Partial<Body> = { shirt: "#f4efe6", pants: "#2a2a35", skin: "#e0a982", hair: "#141414", anim: 0 };

export const say = (t: string, d = 2.6) => { G.msg = t; G.msgT = d; };
/** Affollamento delle strade per ora del giorno (0..1). */
export const activity = (h: number) => 0.15 + 0.85 * Math.max(Math.exp(-((h - 8.5) ** 2) / 3), Math.exp(-((h - 12.8) ** 2) / 2) * .8, Math.exp(-((h - 19) ** 2) / 5), h < 6 ? 0 : .35);
/** Buio: 0 di giorno, 1 di notte. */
export const dark = (h: number) => h < 6 ? 1 : h < 8 ? 1 - (h - 6) / 2 : h < 19 ? 0 : h < 21.5 ? (h - 19) / 2.5 : 1;
export const look = <T extends object>(o: T): T & Look =>
  Object.assign({ shirt: pick(SHIRTS), pants: pick(PANTS), skin: pick(SKINS), hair: pick(HAIR), anim: Math.random() * 6 }, o);
export const viewHalf = (): [number, number] => [G.cw / 2 / G.S, G.ch / 2 / G.S];
