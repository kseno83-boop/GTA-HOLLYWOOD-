// ---------- Audio (sintetizzato con Web Audio, nessun file) ----------
import { R } from "../core/util";

export const audio = { ctx: null as AudioContext | null, out: null as GainNode | null, noise: null as AudioBuffer | null, muted: false };
/** Suoni continui (motore, sirene, brusio del bar...): se ne regola solo il volume. */
export const LOOP: Record<string, GainNode> = {};
export let engineOsc: OscillatorNode | null = null;

export function audioInit() { if (audio.ctx) return; let AC: AudioContext;
  try { AC = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { return; }
  audio.ctx = AC; const OUT = audio.out = AC.createGain(); OUT.gain.value = .7; OUT.connect(AC.destination);
  const NB = audio.noise = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const loop = (name: string, make: (g: GainNode) => void) => { const g = AC.createGain(); g.gain.value = 0; g.connect(OUT); make(g); LOOP[name] = g; };
  const nsrc = () => { const s = AC.createBufferSource(); s.buffer = NB; s.loop = true; s.start(); return s; };
  loop("engine", g => { const o = AC.createOscillator(), f = AC.createBiquadFilter(); o.type = "sawtooth"; f.type = "lowpass"; f.frequency.value = 500; o.connect(f).connect(g); o.start(); engineOsc = o; });
  loop("siren", g => { const o = AC.createOscillator(), l = AC.createOscillator(), lg = AC.createGain(); o.type = "square"; o.frequency.value = 800; l.frequency.value = 1.3; lg.gain.value = 180; l.connect(lg).connect(o.frequency); const f = AC.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1800; o.connect(f).connect(g); o.start(); l.start(); });
  loop("bitone", g => { const o = AC.createOscillator(), l = AC.createOscillator(), lg = AC.createGain(); o.type = "triangle"; o.frequency.value = 770; l.type = "square"; l.frequency.value = .8; lg.gain.value = 110; l.connect(lg).connect(o.frequency); o.connect(g); o.start(); l.start(); });
  loop("chatter", g => { const f = AC.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 520; f.Q.value = .9; const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = 3.1; lg.gain.value = .25; const am = AC.createGain(); am.gain.value = .75; l.connect(lg).connect(am.gain); nsrc().connect(f).connect(am).connect(g); l.start(); });
  loop("tv", g => { const f = AC.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1100; f.Q.value = .5; nsrc().connect(f).connect(g); });
  loop("city", g => { const f = AC.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 260; nsrc().connect(f).connect(g); }); }

function env(node: GainNode, at: number, vol: number, a: number, d: number) { node.gain.setValueAtTime(0, at); node.gain.linearRampToValueAtTime(vol, at + a); node.gain.exponentialRampToValueAtTime(.0001, at + a + d); }
interface NoiseOpt { delay?: number; type?: BiquadFilterType; f?: number; q?: number; vol?: number; a?: number }
function noiseHit(d: number, o: NoiseOpt = {}) { const AC = audio.ctx; if (!AC || audio.muted) return; const t = AC.currentTime + (o.delay || 0), s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = audio.noise; f.type = o.type || "bandpass"; f.frequency.value = o.f || 1000; f.Q.value = o.q || 1; s.connect(f).connect(g).connect(audio.out!); env(g, t, o.vol || .5, o.a || .003, d); s.start(t, Math.random()); s.stop(t + d + .1); }
interface ToneOpt { delay?: number; type?: OscillatorType; to?: number; vib?: boolean; vol?: number; a?: number }
function tone(fr: number, d: number, o: ToneOpt = {}) { const AC = audio.ctx; if (!AC || audio.muted) return; const t = AC.currentTime + (o.delay || 0), s = AC.createOscillator(), g = AC.createGain();
  s.type = o.type || "sine"; s.frequency.setValueAtTime(fr, t); if (o.to) s.frequency.exponentialRampToValueAtTime(o.to, t + d);
  if (o.vib) { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = 28; lg.gain.value = 120; l.connect(lg).connect(s.frequency); l.start(t); l.stop(t + d); }
  s.connect(g).connect(audio.out!); env(g, t, o.vol || .2, o.a || .005, d); s.start(t); s.stop(t + d + .05); }
export const sfx = {
  shot() { noiseHit(.22, { type: "lowpass", f: 3200, vol: .9 }); tone(140, .16, { type: "triangle", vol: .7, to: 40 }); tone(R(3200, 4200), .04, { type: "square", vol: .04, delay: .3 }); },
  hit() { noiseHit(.12, { f: 500, vol: .6 }); tone(90, .12, { vol: .4, to: 50 }); },
  step(run: boolean) { noiseHit(.05, { f: R(260, 420), q: 2, vol: run ? .16 : .1 }); },
  door() { tone(1320, .5, { vol: .12 }); tone(990, .7, { vol: .1, delay: .12 }); },
  carDoor() { noiseHit(.14, { type: "lowpass", f: 450, vol: .7 }); tone(70, .1, { vol: .4 }); },
  crash() { noiseHit(.45, { type: "lowpass", f: 900, vol: 1 }); tone(55, .35, { type: "sawtooth", vol: .35, to: 30 }); },
  whistle(n: number) { for (let i = 0; i < n; i++) tone(2900, i === n - 1 ? .6 : .25, { vol: .1, vib: true, delay: i * .35 }); },
  cheer() { noiseHit(3, { f: 900, q: .6, vol: .45, a: .25 }); noiseHit(2.4, { f: 1800, q: 1.5, vol: .2, a: .4 }); },
  groan() { noiseHit(1.8, { f: 320, q: .8, vol: .35, a: .2 }); tone(240, 1.3, { type: "sawtooth", vol: .025, to: 150 }); },
  eat() { for (let i = 0; i < 4; i++) noiseHit(.07, { f: 2400, q: 3, vol: .25, delay: i * .16 }); tone(660, .15, { vol: .08, delay: .7 }); tone(880, .2, { vol: .08, delay: .82 }); },
  horn() { tone(392, .3, { type: "square", vol: .05 }); tone(494, .3, { type: "square", vol: .04 }); },
  scream() { tone(R(650, 900), .55, { type: "sawtooth", vol: .05, to: R(380, 520), a: .05 }); },
  /** Campane di San Magno: n rintocchi, volume in base alla distanza. */
  bell(vol: number, n: number) { for (let i = 0; i < n; i++) { const d = i * 1.7; tone(392, 2.6, { vol: .16 * vol, delay: d, a: .004 }); tone(784, 1.6, { vol: .07 * vol, delay: d }); tone(1176, .9, { vol: .035 * vol, delay: d }); tone(196, 3, { vol: .06 * vol, delay: d }); } },
  alarm() { for (let i = 0; i < 8; i++) tone(i % 2 ? 960 : 1250, .24, { type: "square", vol: .05, delay: i * .25 }); },
  cash() { tone(1568, .12, { type: "triangle", vol: .1 }); tone(2093, .3, { type: "triangle", vol: .09, delay: .09 }); noiseHit(.08, { f: 5000, q: 2, vol: .15 }); },
  explode() { noiseHit(1.6, { type: "lowpass", f: 700, vol: 1.2 }); noiseHit(.5, { f: 2200, q: .7, vol: .5 }); tone(60, 1.2, { type: "sawtooth", vol: .4, to: 25 }); tone(110, .5, { type: "triangle", vol: .4, to: 35 }); },
  ding() { tone(R(1800, 2400), .08, { type: "square", vol: .03 }); noiseHit(.04, { f: 3500, q: 3, vol: .12 }); },
  blip() { tone(R(520, 640), .03, { type: "square", vol: .025 }); },
};
