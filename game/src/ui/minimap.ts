// Minimappa statica (verde, fiumi, strade), disegnata una volta su una tela.
import { NX, NY, WW, WH, roads, green, rivers } from "../world/map";

/** Scala della minimappa rispetto ai metri del mondo. */
export const MINI_K = .14;
export function buildMini() { const k = MINI_K, mini = document.createElement("canvas"); mini.width = WW * k; mini.height = WH * k; const m = mini.getContext("2d")!;
  m.fillStyle = "#1c1226"; m.fillRect(0, 0, mini.width, mini.height); m.scale(k, k); m.lineCap = "round";
  m.fillStyle = "#2f5a3a"; for (const g of green) { m.beginPath(); for (let i = 0; i < g.length; i += 2) m.lineTo(g[i], g[i + 1]); m.fill(); }
  m.strokeStyle = "#1f6fa8"; m.lineWidth = 12; for (const g of rivers) { m.beginPath(); for (let i = 0; i < g.length; i += 2) m.lineTo(g[i], g[i + 1]); m.stroke(); }
  for (const r of roads) { m.strokeStyle = r.car ? "#8a7d92" : "#5d5066"; m.lineWidth = r.car ? 9 : 5; m.beginPath(); for (const i of r.ids) m.lineTo(NX[i], NY[i]); m.stroke(); }
  return mini; }
