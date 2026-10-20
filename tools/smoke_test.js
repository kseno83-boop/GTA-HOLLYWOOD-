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
  const page_wait = (pg, ms) => pg.waitForTimeout(ms);
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
  // regole di combattimento e polizia: passante 2 colpi, banda 3, agente 4; stelle intere; agenti 8–12 s dopo la prima stella
  const rules = await p.evaluate(() => { const g = window.__gta, ped = g.peds.find(p => !p.cop && !p.keep && p.st !== "dead"), gang = g.peds.find(p => p.gang && p.st !== "dead");
    const hits = p => { let n = 0; while (p.st !== "dead" && n < 10) { g.shootPed(p, 1, 0); n++; } return n; };
    const r = { passante: hits(ped), banda: hits(gang), agente: hits({ ...ped, cop: true, st: "chase", hp: undefined }) };
    g.G.heat = 0; g.G.dispatch = 0; g.crime(1.2); r.stelle = g.stars(); r.dispatch = +g.G.dispatch.toFixed(1); g.G.heat = 0; return r; });
  // modalità test: pannello col tasto O, invulnerabile, niente polizia, teletrasporto al Maramao
  await key("KeyO");
  const testmode = await p.evaluate(() => { const panel = document.getElementById("testpanel"), g = window.__gta, r = { panelOpen: !panel.hidden };
    for (const k of ["invuln", "noPolice"]) { const el = panel.querySelector(`input[data-k=${k}]`); el.click(); }
    const hp = g.P.hp; g.hurt(50); r.invuln = g.P.hp === hp; g.crime(3); r.heatWithNoPolice = g.G.heat;
    [...panel.querySelectorAll("button")].find(b => b.textContent.includes("Maramao")).click();
    return r; });
  await page_wait(p, 300);
  Object.assign(testmode, await p.evaluate(() => { const g = window.__gta, panel = document.getElementById("testpanel");
    const r = { scene: g.G.scene, street: g.G.street }; for (const k of ["invuln", "noPolice"]) panel.querySelector(`input[data-k=${k}]`).click(); return r; }));
  await p.screenshot({ path: path.join(out, "modalita_test.png") }); await key("KeyO");
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
  // dopo l'ultima battuta il dialogo si chiude (una pressione in più se la battuta sta ancora apparendo)
  let d3 = d2; for (let i = 0; i < 3 && d3.id; i++) { await key("KeyE"); d3 = await p.evaluate(() => ({ ...window.__gta.D })); }
  const dialog = { opened: d1.id === "prova", second: d2.text === "Seconda battuta.", closedAtEnd: d3.id === "" };
  // esci e trova il personaggio in strada
  await p.evaluate(() => { const { P } = window.__gta; P.x = 4.2; P.y = 19.6; }); await minutes(1);
  const npcOut = await p.evaluate(() => { const { peds, G } = window.__gta, n = peds.find(p => p.npc === "fuori"); return { scene: G.scene, spawned: !!n }; });
  // punti d'interesse: rapina in banca (soldi e stelle), farmacia (salute), insegne vicine
  const poi = await p.evaluate(() => { const { P, G, TEST, SPOTS, spotNear, spotAction } = window.__gta; for (const k in TEST) TEST[k] = false;
    const at = n => { const q = SPOTS.find(q => q.name === n); P.car = null; P.x = q.dx; P.y = q.dy; return spotNear(); };
    G.hour = 11; G.heat = 0; const m0 = P.money, bank = at("BANCA DEL CARROCCIO"); if (bank) spotAction(bank);
    const robbed = { money: P.money - m0, heat: G.heat }; G.heat = 0;
    P.hp = 40; const ph = at("FARMACIA CENTRALE"); if (ph) spotAction(ph);
    return { count: SPOTS.length, robbed, healed: P.hp === 100 }; });
  await p.evaluate(() => { const { P, SPOTS, G } = window.__gta, q = SPOTS.find(q => q.name === "BASILICA DI SAN MAGNO"); P.x = q.dx; P.y = q.dy + 4; G.camX = P.x; G.camY = P.y; G.hour = 21.5; });
  await p.waitForTimeout(1500); await p.screenshot({ path: path.join(out, "san_magno.png") });
  // Olona: in auto non si attraversa fuori dai ponti; mezzo distrutto: fuoco, esplosione, pompieri chiamati
  const tgt = await p.evaluate(() => { const { waterAt, map } = window.__gta; for (let y = 200; y < 1100; y += 7) for (let x = 700; x < 1050; x++) if (waterAt(x, y) && waterAt(x + 3, y)) {
    let near = false; for (let k = 0; k < map.NX.length; k++) if (Math.abs(map.NX[k] - x) < 30 && Math.abs(map.NY[k] - y) < 30) { near = true; break; } if (!near) return { x, y }; break; } return null; });
  await p.evaluate(t => { const { P, cars, G, TEST, map } = window.__gta; TEST.noPolice = true; G.heat = 0; const c = { type: "car", x: t.x - 9, y: t.y, a: 0, v: 0, col: "#e0303f", prev: 0, next: 1, road: map.roads[0], lane: 1, honkT: 0, insT: 0, bub: "", bubT: 0, wheelie: 0 };
    cars.push(c); P.car = c; P.x = c.x; P.y = c.y; G.camX = P.x; G.camY = P.y; }, tgt);
  await p.keyboard.down("KeyW"); await p.waitForTimeout(4000); await p.keyboard.up("KeyW");
  const river = await p.evaluate(t => ({ water: t, carX: window.__gta.P.x, blocked: window.__gta.P.x < t.x }), tgt);
  await p.evaluate(() => { const { P, cars, G, damageVeh, dehors } = window.__gta; P.car = null; const pw = dehors.toWorld(-1, 6.05), w = dehors.toWorld(-9, 6.05); P.x = pw.x; P.y = pw.y; G.camX = P.x; G.camY = P.y;
    const c = { type: "car", x: w.x, y: w.y, a: 0, v: 0, col: "#2f6fd0", prev: 0, next: 1, road: window.__gta.map.roads[0], lane: 1, honkT: 0, insT: 0, bub: "", bubT: 0, wheelie: 0 };
    cars.push(c); window.__c = c; damageVeh(c, 999, false); });
  await p.waitForTimeout(1200); await p.screenshot({ path: path.join(out, "auto_in_fiamme.png") });
  await until(() => window.__c.wreck, null, 30000);
  const fire = await p.evaluate(() => ({ wreck: window.__c.wreck, heat: window.__gta.G.heat, fireJob: window.__gta.jobs.some(j => j.kind === "fire") }));
  await until(() => window.__gta.jobs.some(j => j.kind === "fire" && j.unit), null, 30000).catch(() => {});
  fire.truck = await p.evaluate(() => window.__gta.jobs.some(j => j.kind === "fire" && j.unit && j.unit.type === "fire"));
  console.log(JSON.stringify({ street, rules, testmode, dehors, bar, dialog, npcOut, poi, river, fire, errs }, null, 1));
  const ok = !errs.length && testmode.panelOpen && testmode.invuln && testmode.heatWithNoPolice === 0 && testmode.scene === "out" && rules.passante === 2 && rules.banda === 3 && rules.agente === 4 && (rules.stelle === 0 || rules.dispatch >= 8) && street.wrongWay === 0 && dehors.seated > 0 && dehors.pushedOffTable && dehors.traffic.cars === 0 && dehors.traffic.passed > 0 && bar.scene === "bar" && !!bar.match && bar.npcInBar && dialog.opened && dialog.second && dialog.closedAtEnd && npcOut.scene === "out" && npcOut.spawned && poi.count >= 38 && poi.robbed.money >= 800 && poi.robbed.heat >= 3 && poi.healed && river.blocked && fire.wreck && fire.heat === 0 && fire.fireJob && fire.truck;
  console.log(ok ? "OK" : "FALLITO");
  await b.close(); process.exit(ok ? 0 : 1);
})();
