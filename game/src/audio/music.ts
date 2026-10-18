// ---------- Colonna sonora (brani forniti dall'utente) ----------
// Da public/music/playlist.js (window.PLAYLIST) o dal pulsante "Carica i tuoi brani" (file locali, non escono dal dispositivo).
export const bgm = new Audio();
export const track = { list: [] as { src: string; name: string }[], i: -1, name: "", t: 0 };

export function addTracks(items: { src: string; name: string }[]) { for (const it of items) if (it && it.src) track.list.push(it);
  const el = document.getElementById("tcount"); if (el) el.textContent = `colonna sonora: ${track.list.length} ${track.list.length === 1 ? "brano" : "brani"}`; }
export function nextTrack() { if (!track.list.length) return; track.i = (track.i + 1) % track.list.length; const it = track.list[track.i];
  bgm.src = it.src; bgm.play().then(() => { track.name = it.name; track.t = 4; }).catch(() => {}); }
bgm.addEventListener("ended", nextTrack); bgm.addEventListener("error", () => { if (track.list.length > 1) nextTrack(); });
const playlist = (window as unknown as { PLAYLIST?: string[] }).PLAYLIST || [];
addTracks(playlist.map(f => ({ src: "music/" + f, name: f.replace(/\.[^.]+$/, "") })));
