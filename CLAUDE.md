# GTA HOLLYWOOD — contesto per nuove sessioni

Sandbox criminale vista dall'alto ambientato nel centro di Legnano: open world stile GTA 1/2, interni stile Hotline Miami.
Hub: **Bar Hollywood**, Corso Magenta 44. L'utente scrive in italiano: rispondi in italiano.
Concept completo: `docs/CONCEPT.md`. Demo pubblicata (artifact privato dell'utente): https://claude.ai/artifact/XZJzg1FaUXSGDAfZ9cj3Yi
Branch di lavoro: `claude/gta-clone-legnano-concept-miik14`.

## File
- `demo/index.html` — tutto il gioco: un solo file HTML + JS canvas, nessuna libreria. Sezioni marcate con `// ---------- Nome ----------`
  (Mappa, Stato, Calcio al maxischermo, Passanti e sbirri, Traffico, Giocatore, Bar Hollywood, Sprite, Disegno esterno/interno, HUD, Audio, Colonna sonora, Ciclo, Input).
- `demo/map-data.js` — generato, non modificare a mano. `window.MAP` con coordinate in decimetri (origine angolo NO, y verso sud).
- `demo/music/playlist.js` — elenco brani; i file audio in `demo/music/` sono esclusi da git (brani segnaposto protetti da copyright: non committarli).
- `tools/osm_export.py` — OSM → `demo/map-data.js` (strade, edifici, verde, acqua, POI, locali, ZTL, sensi unici, porte dei locali).
- `tools/osm_preview.py` — anteprima SVG dell'area (`docs/mappa-area-gioco.svg`); contiene bbox e coordinate dell'Hollywood.
- `tools/smoke_test.js` — test headless con Playwright (screenshot + errori + controlli base).

## Comandi
```
python3 tools/osm_export.py centro.osm demo/map-data.js   # scarica centro.osm dall'API OSM se manca
node tools/smoke_test.js /percorso/output                   # usa Chromium in /opt/pw-browsers/chromium
```
Pubblicazione: Artifact con `file_path: demo/index.html` e `files: {"map-data.js": "demo/map-data.js", "music/playlist.js": "demo/music/playlist.js"}`, url sopra.

## Scelte fatte con l'utente (non rimettere in discussione)
- Area: bbox lon 8.9100–8.9260, lat 45.5870–45.5985 (~1,25 × 1,27 km). Dati © OpenStreetMap, ODbL (attribuzione nel gioco).
- Grafica stile Hotline Miami: rendering su canvas a bassa risoluzione (PX 2–4) ingrandito, color grading neon, scanline, oscillazione camera, sprite procedurali con contorno nero e pose (walk/run/gun/sit/drink/cheer/dead). Edifici pseudo-3D stile GTA2.
- Velocità: a piedi 5.6 m/s, corsa 9, nel bar 4.6. Ricercato a **5 stelle** (Polizia Locale → Polizia di Stato → Carabinieri → Carabinieri+Polizia → reparti speciali). Salute 100, cibo la ripristina.
- **Hollywood (interno)**: bancone a sinistra (ovest) SENZA sgabelli, si beve in piedi; tavolone da 8 a destra; **maxischermo sulla parete sud davanti al tavolone**; porta sulla parete sud (posizione da confermare con l'utente). Il bar è **milanista** ma si guardano tutte le partite.
- Partite solo ogni tanto: calci d'inizio alle 15:00 e 20:45 (ora di gioco, 1 s reale = 1 min). Fuori partita lo schermo è **spento**. Reazioni ai gol in base alla squadra degli avventori.
- Locali: **Bar Maramao** (Via Corridoni 20) e **Bar Morello** (Corso Magenta 36, confermato dall'utente) = rivali, con 3 membri di banda davanti. **Stuzzi Sushi** (Corso Magenta 41, in OSM ancora "SushiMi") e **Gran Prix** (Corso Magenta 101) = cibo/ristoro.
- Centro = isola pedonale/ZTL. Confine preso da OSM (`motor_vehicle/access=private`): Corso Magenta dal Gran Prix a San Magno + Via Gaeta, Giulini, Venegoni, Cairoli, B. Melzi, A. da Giussano, XXV Aprile, don Bosco. L'utente ha detto "fino al Lia Parrucche": negozio non trovato in OSM né online, confine da confermare.
- Traffico: auto solo su strade aperte, rispettano i **sensi unici** OSM (frecce sull'asfalto); in ZTL solo auto col permesso, volanti (ronde serali), ambulanze/pompieri rari con sirena, rider e maranza (bici/monopattino, impennano, ignorano i sensi unici e vengono insultati). Notte: camion che sbagliano strada, auto contromano che parcheggiano. Ogni mezzo si può rubare; volanti inseguono e fanno scendere agenti.
- Audio sintetizzato con Web Audio (nessun file). Colonna sonora fornita dall'utente: pulsante "Carica i tuoi brani" (file locali) o `demo/music/`.

## Da fare / in sospeso
- Dialoghi, missioni e personaggi: li definisce l'utente. Non inventarli.
- Interni dei bar rivali (missioni stile Hotline Miami), bande e controllo del territorio (vedi concept §6).
- Confermare: porta dell'Hollywood, confine ZTL (Lia Parrucche), pianta reale del bar (foto?).
- Avvertenza già data all'utente: nomi di locali reali associati a bande criminali = rischio legale/reputazione se il gioco viene diffuso.
- Prestazioni: in ambiente headless senza GPU ~20–30 fps; il traffico costa ~20%. Non testato su telefono reale.
- Il progetto "La Bocca del Paese" citato dall'utente non è accessibile da qui.
