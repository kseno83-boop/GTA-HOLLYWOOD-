// Test rapido del gioco Phaser (game/dist/index.html, prima: cd game && npm run build).
// Avvia Chromium headless, controlla errori, renderer, traffico e sensi unici, Hollywood e partita,
// e il sistema dei personaggi con personaggi di prova (aggiunti solo qui, non nel gioco). Salva screenshot.
// Le attese sono in tempo di gioco: senza GPU il gioco può girare lento.
// Uso: node tools/smoke_test.js [cartella_output]
const path = require("path");
const { chromium } = require("playwright");
const out = process.argv[2] || ".";
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  const until = (fn, arg, timeout = 30000) => p.waitForFunction(fn, arg, { timeout, polling: 100 });
  /** aspetta che passino m minuti di gioco */
  const minutes = async m => { const h0 = await p.evaluate(() => window.__gta.G.hour); await until(([h0, m]) => (window.__gta.G.hour - h0 + 24) % 24 >= m / 60, [h0, m], 15000 + m * 5000); };
  const key = async k => { await p.keyboard.press(k); await p.waitForTimeout(250); };
  await p.goto("file://" + path.resolve(__dirname, "../game/dist/index.html"));
  await until(() => window.__gta && window.__gta.game.isBooted, null, 15000);
  await p.waitForTimeout(600); await p.click("#play"); await minutes(4);
  await p.screenshot({ path: path.join(out, "esterno.png") });
  const street = await p.evaluate(() => { const { game, peds, cars, VT } = window.__gta;
    return { renderer: game.renderer.type === 2 ? "WebGL" : "Canvas", fps: Math.round(game.loop.actualFps), peds: peds.length, traffic: cars.filter(c => c.ai).length,
      wrongWay: cars.filter(v => v.ai && !VT[v.type].bike && !v.siren && v.kind !== "wrong" && v.road && v.road.oneway && v.road.ids.indexOf(v.next) !== v.road.ids.indexOf(v.prev) + 1).length }; });
  // dehors dell'Hollywood: clienti seduti e tavoli solidi
  const dehors = await p.evaluate(() => { const { peds, P, dehors } = window.__gta, t = dehors.TABLES[1], c = dehors.toWorld(t.u, t.n);
    P.x = c.x; P.y = c.y; return { seated: peds.filter(p => p.seat !== undefined).length }; });
  // per 20 minuti di gioco: nessun mezzo deve passare in mezzo ai tavoli (la strada è deviata nella corsia libera)
  await p.evaluate(() => { const { cars, VT, dehors: d } = window.__gta; window.__intr = { cars: 0, samples: 0, passed: 0 };
    window.__iv = setInterval(() => { window.__intr.samples++; for (const c of cars) { if (!c.ai || VT[c.type].bike) continue; const l = d.toLocal(c.x, c.y);
      if (l.u > d.U0 && l.u < d.U1 && l.n > -1 && l.n < 9) { window.__intr.passed++; if (l.n < d.EDGE + .5) window.__intr.cars++; } } }, 100); });
  // un'auto col permesso ZTL imbocca Corso Magenta poco prima del dehors
  dehors.testCar = await p.evaluate(() => { const { cars, map, dehors: d } = window.__gta, r = map.roads.find(r => r.name === "Corso Magenta" && r.ids.some(i => { const l = d.toLocal(map.NX[i], map.NY[i]); return Math.abs(l.u) < 20 && l.n > d.EDGE; }));
    const k = r.ids.findIndex(i => { const l = d.toLocal(map.NX[i], map.NY[i]); return Math.abs(l.u) < 20 && l.n > d.EDGE; }), a = r.ids[k - 2], b = r.ids[k - 1];
    cars.push({ type: "ztl", ai: true, tmp: false, x: map.NX[a], y: map.NY[a], a: Math.atan2(map.NY[b] - map.NY[a], map.NX[b] - map.NX[a]), v: 4, prev: a, next: b, road: r, permit: true, lane: 1, col: "#c9ccd6", honkT: 0, insT: 0, bub: "", bubT: 0, wheelie: 0, kind: "test" });
    return { from: d.toLocal(map.NX[a], map.NY[a]) }; });
  await minutes(20);
  dehors.traffic = await p.evaluate(() => { clearInterval(window.__iv); return window.__intr; });
  dehors.pushedOffTable = await p.evaluate(() => { const { P, dehors } = window.__gta, t = dehors.TABLES[1], c = dehors.toWorld(t.u, t.n); return Math.hypot(P.x - c.x, P.y - c.y) > .5; });
  // personaggi di prova: uno al bancone, uno davanti al Maramao
  await p.evaluate(() => window.__gta.PERSONAGGI.push(
    { id: "prova", nome: "Personaggio di prova", posto: "bancone", aspetto: { shirt: "#ffd166" }, squadra: "MILAN",
      dialogo: ["Prima battuta di prova, abbastanza lunga per andare a capo nel riquadro del dialogo.", "Seconda battuta."] },
    { id: "fuori", nome: "Prova in strada", posto: { fuori: "BAR MARAMAO" }, dialogo: ["Ciao."], frasi: ["Frase di prova"] }));
  // Hollywood alle 20:42: la partita delle 20:45 inizia mentre sei dentro
  await p.evaluate(() => { const { P, DOOR, G } = window.__gta; P.x = DOOR.x; P.y = DOOR.y; G.hour = 20.7; }); await key("KeyE");
  await minutes(6);
  const bar = await p.evaluate(() => { const { G, guests, F, scoreLine, game } = window.__gta;
    return { scene: G.scene, activeScenes: game.scene.getScenes(true).map(s => s.scene.key), guests: guests.length, match: F.match && scoreLine(F.match), npcInBar: guests.some(g => g.npc === "prova") }; });
  await p.screenshot({ path: path.join(out, "hollywood.png") });
  // parla con il personaggio al bancone
  await p.evaluate(() => { const { guests, P } = window.__gta, g = guests.find(g => g.npc === "prova"); P.x = g.x + 1.3; P.y = g.y; });
  await key("KeyE"); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(out, "dialogo.png") });
  const d1 = await p.evaluate(() => ({ ...window.__gta.D }));
  await key("KeyE"); await key("KeyE");
  const d2 = await p.evaluate(() => ({ ...window.__gta.D }));
  await key("KeyE"); await key("KeyE");
  const d3 = await p.evaluate(() => ({ ...window.__gta.D }));
  const dialog = { opened: d1.id === "prova", second: d2.text === "Seconda battuta.", closedAtEnd: d3.id === "" };
  // esci e trova il personaggio in strada
  await p.evaluate(() => { const { P } = window.__gta; P.x = 4.2; P.y = 19.6; }); await minutes(1);
  const npcOut = await p.evaluate(() => { const { peds, G } = window.__gta, n = peds.find(p => p.npc === "fuori"); return { scene: G.scene, spawned: !!n }; });
  console.log(JSON.stringify({ street, dehors, bar, dialog, npcOut, errs }, null, 1));
  const ok = !errs.length && street.wrongWay === 0 && dehors.seated > 0 && dehors.pushedOffTable && dehors.traffic.cars === 0 && dehors.traffic.passed > 0 && bar.scene === "bar" && !!bar.match && bar.npcInBar && dialog.opened && dialog.second && dialog.closedAtEnd && npcOut.scene === "out" && npcOut.spawned;
  console.log(ok ? "OK" : "FALLITO");
  await b.close(); process.exit(ok ? 0 : 1);
})();
