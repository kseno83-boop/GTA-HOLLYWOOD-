// Test rapido della demo: avvia il gioco in Chromium headless, controlla errori, traffico,
// sensi unici e bar, salva screenshot. Uso: node tools/smoke_test.js [cartella_output]
const path = require("path");
const { chromium } = require("playwright");
const out = process.argv[2] || ".";
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + path.resolve(__dirname, "../demo/index.html")); await p.waitForTimeout(800);
  await p.click("#play"); await p.waitForTimeout(5000);
  await p.screenshot({ path: path.join(out, "esterno.png") });
  const out1 = await p.evaluate(() => ({ peds: peds.length, traffic: cars.filter(c => c.ai).length,
    wrongWay: cars.filter(v => v.ai && !VT[v.type].bike && !v.siren && v.kind !== "wrong" && v.road && v.road.oneway && v.road.ids.indexOf(v.next) !== v.road.ids.indexOf(v.prev) + 1).length }));
  await p.evaluate(() => { P.x = DOOR.x; P.y = DOOR.y; hour = 20.7; }); await p.keyboard.press("KeyE"); await p.waitForTimeout(4000);
  const out2 = await p.evaluate(() => ({ scene, guests: guests.length, match: match && scoreLine() }));
  await p.screenshot({ path: path.join(out, "hollywood.png") });
  console.log(JSON.stringify({ ...out1, ...out2, errs }, null, 1));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
