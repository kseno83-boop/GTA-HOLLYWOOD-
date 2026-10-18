// Elementi HTML sopra il canvas: schermata iniziale, pulsanti touch, audio sì/no, caricamento brani.
import { G, touchFire, say } from "../core/state";
import { audio, audioInit } from "../audio/sfx";
import { addTracks, nextTrack, bgm } from "../audio/music";
import { action } from "../sim/player";

const $ = (id: string) => document.getElementById(id)!;
export function toggleMute() { audio.muted = !audio.muted; $("mute").textContent = audio.muted ? "AUDIO NO" : "AUDIO SÌ"; }

export function bindDom() {
  $("mute").addEventListener("click", toggleMute);
  $("tracks").addEventListener("change", e => { const files = [...((e.target as HTMLInputElement).files || [])];
    addTracks(files.map(f => ({ src: URL.createObjectURL(f), name: f.name.replace(/\.[^.]+$/, "") }))); if (G.started && bgm.paused) nextTrack(); });
  const bFire = $("bFire");
  bFire.addEventListener("touchstart", e => { e.preventDefault(); touchFire.held = true; }, { passive: false });
  bFire.addEventListener("touchend", () => { touchFire.held = false; });
  $("bAct").addEventListener("touchstart", e => { e.preventDefault(); action(); }, { passive: false });
  $("play").addEventListener("click", () => { audioInit(); nextTrack(); $("mute").hidden = false; G.started = true; $("intro").hidden = true; $("pad").classList.add("on"); say("CORSO MAGENTA", 2); });
}
