// GTA Hollywood: avvio. Phaser gestisce ciclo, scene, ridimensionamento, input e HUD;
// il mondo in stile Hotline Miami è disegnato a mano su una tela a bassa risoluzione (vedi render/).
import Phaser from "phaser";
import { G, P, peds, cars } from "./core/state";
import { TOUCH } from "./core/util";
import { DOOR, roads, NX, NY } from "./world/map";
import { parkCars, VT } from "./sim/traffic";
import { spawnGangs, shootPed, crime, stars, hurt } from "./sim/peds";
import { guests } from "./sim/bar";
import { F, scoreLine } from "./sim/football";
import { PERSONAGGI } from "./characters";
import { D, initCharacters } from "./characters/runtime";
import { inServizio } from "./characters/turni";
import { staff } from "./sim/bar";
import { StreetScene } from "./scenes/StreetScene";
import { BarScene } from "./scenes/BarScene";
import { HudScene } from "./scenes/HudScene";
import { bindDom } from "./ui/dom";
import { TEST } from "./core/state";
import { SPOTS, isOpen } from "./world/poi";
import { spotNear, spotAction } from "./sim/poi";
import { toWorld, toLocal, TABLES, EDGE, U0, U1 } from "./world/dehors";

if (TOUCH) document.documentElement.classList.add("touch");
P.x = DOOR.x; P.y = DOOR.y; G.camX = P.x; G.camY = P.y;
parkCars(); spawnGangs(); initCharacters(); bindDom();

/** Misure in pixel CSS; il canvas ha la risoluzione del dispositivo (massimo 2x) e Phaser lo rimpicciolisce con lo zoom. */
function measure() { G.cw = window.innerWidth; G.ch = window.innerHeight; G.dpr = Math.min(2, window.devicePixelRatio || 1); }
measure();

async function boot() {
  // i testi di Phaser vanno creati quando i font Google sono pronti (al massimo 2,5 s di attesa)
  await Promise.race([Promise.all(["24px VT323", "24px Bungee"].map(f => document.fonts.load(f))).catch(() => {}), new Promise(r => setTimeout(r, 2500))]);
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: "game", backgroundColor: "#120b1c", antialias: true, antialiasGL: false,
    scale: { mode: Phaser.Scale.NONE, width: Math.round(G.cw * G.dpr), height: Math.round(G.ch * G.dpr), zoom: 1 / G.dpr },
    input: { activePointers: 3 }, disableContextMenu: true, banner: false,
    // una texture per lotto: lo shader multi-texture sceglie la texture confrontando un float interpolato,
    // e con GPU software (SwiftShader) gli oggetti ruotati venivano disegnati a pezzi
    render: { maxTextures: 1 },
    scene: [StreetScene, BarScene, HudScene],
  });
  window.addEventListener("resize", () => { measure(); game.scale.setZoom(1 / G.dpr); game.scale.resize(Math.round(G.cw * G.dpr), Math.round(G.ch * G.dpr)); });
  // accesso per i test automatici (tools/smoke_test.js)
  Object.assign(window, { __gta: { game, G, P, peds, cars, guests, VT, DOOR, F, scoreLine, PERSONAGGI, D, inServizio, staff, shootPed, crime, stars, hurt, TEST, SPOTS, isOpen, spotNear, spotAction, dehors: { toWorld, toLocal, TABLES, EDGE, U0, U1 }, map: { roads, NX, NY } } });
}
boot();
