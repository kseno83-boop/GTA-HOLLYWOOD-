# GTA HOLLYWOOD — contesto per nuove sessioni

Sandbox criminale vista dall'alto ambientato nel centro di Legnano: open world stile GTA 1/2, interni stile Hotline Miami.
Hub: **Bar Hollywood**, Corso Magenta 44. L'utente scrive in italiano: rispondi in italiano.
Concept completo: `docs/CONCEPT.md`. Demo pubblicata (artifact privato dell'utente): https://claude.ai/artifact/XZJzg1FaUXSGDAfZ9cj3Yi
Branch di lavoro: `claude/confident-brahmagupta-570lby` (prima: `claude/gta-clone-legnano-concept-miik14`).

## File
Il gioco è in `game/` (Phaser 4 + TypeScript + Vite, scelto dall'utente). `demo/` è la vecchia demo in un solo file HTML, tenuta come riferimento.
- `game/src/main.ts` — avvio: Phaser (scale NONE con zoom 1/dpr: tutte le coordinate di scene e HUD sono in pixel CSS), scene, `window.__gta` per i test.
- `game/src/core/` — `state.ts` (stato condiviso `G`, giocatore `P`, entità, palette), `util.ts`.
- `game/src/world/dehors.ts` — dehors dell'Hollywood (geometria lungo la facciata, ostacoli solidi, posti a sedere); disegno in `render/dehors.ts`, clienti in `sim/dehors.ts`.
- `game/src/world/river.ts` — griglia dell'acqua (Olona + specchi d'acqua OSM, meno le fasce stradali = ponti e argini): `waterAt`.
- `game/src/world/map.ts` — mappa OSM, grafo stradale, collisioni (edifici + ostacoli `solids`), locali. Dati in `game/src/data/map.json` (generato, non modificare a mano; decimetri, origine angolo NO, y verso sud).
- `game/src/sim/` — `peds.ts` (passanti, bande, sbirri, ricercato), `traffic.ts`, `emergency.ts` (danni ai mezzi, fuoco, esplosioni, pompieri e ambulanze), `player.ts`, `bar.ts` (interno Hollywood), `football.ts` (maxischermo), `clock.ts`.
- `game/src/render/` — il mondo è disegnato con Canvas 2D su una tela a bassa risoluzione (`view.ts`, una CanvasTexture di Phaser) per tenere lo stile Hotline Miami: `street.ts`, `buildings.ts` (edifici), `hollywood.ts`, `sprites.ts`, `pitch.ts`.
- `game/src/scenes/` — `StreetScene` e `BarScene` (base comune `WorldScene`: simula, disegna, ingrandisce, oscillazione camera) e `HudScene` (sempre attiva: HUD, dialoghi, tastiera/mouse/touch).
- `game/src/characters/` — personaggi fissi: formato in `types.ts`, elenco `PERSONAGGI` in `index.ts`, turni dietro il bancone in `turni.ts`, istruzioni in `README.md`, messa in scena in `runtime.ts`.
- `game/src/audio/` — effetti sintetizzati (Web Audio), volumi, colonna sonora. `game/public/music/playlist.js` elenca i brani (file audio esclusi da git: protetti da copyright).
- `tools/osm_export.py` — OSM → `game/src/data/map.json` (o `demo/map-data.js` se l'output finisce in .js). Per il gioco gli edifici sono `[piani×10 (0 = ignoti), indice in bkinds (tipo OSM), ...poligono]`. Scarica con il bbox `DOWNLOAD_BBOX` di `osm_preview.py` (più largo dell'area di gioco): con un bbox diverso cambiano nodi e strade.
- `tools/osm_poi.py` — punti d'interesse approvati dall'utente (elenco nel file, id OSM) → `game/src/data/poi.json`; logica in `world/poi.ts` (categorie, colori, orari) e `sim/poi.ts` (azioni col tasto E, rapine, folle, campane).
- `tools/osm_preview.py` — anteprima SVG dell'area (`docs/mappa-area-gioco.svg`); contiene bbox e coordinate dell'Hollywood.
- `tools/smoke_test.js` — test headless del gioco (errori, renderer, sensi unici, Hollywood, partita, personaggi di prova, screenshot). `tools/smoke_test_demo.js` = vecchia demo.

## Comandi
```
cd game && npm install && npm run build                    # typecheck + build in game/dist/index.html (un solo file)
cd game && npm run dev                                      # server di sviluppo Vite
node tools/smoke_test.js /percorso/output                   # dopo la build; usa Chromium in /opt/pw-browsers/chromium
python3 tools/osm_export.py centro.osm game/src/data/map.json   # scarica centro.osm dall'API OSM se manca
```
Pubblicazione: Artifact con `file_path: game/dist/index.html` e `files: {"music/playlist.js": "game/public/music/playlist.js"}`, url sopra.
Tasti in gioco: WASD/mouse, E azione/parla, T +1 ora, M audio, N brano, F contatore FPS (anche `?fps` nell'indirizzo).
**Modalità test** (`game/src/ui/testmode.ts`, tasto **O**, pulsante TEST sul telefono o con `?test`): invulnerabile, niente polizia, fuoco rapido, un colpo uccide, super velocità, fantasma (attraversa muri e tavoli), tempo fermo, info di debug; azioni: salute piena, ±stelle, ore preimpostate, partita adesso, giorno dopo (cambia turno), auto qui, teletrasporto ai locali. Opzioni salvate nel browser (localStorage). Per nuove opzioni: aggiungi una voce a `TEST` in `core/state.ts` e a `SWITCHES`/`ACTIONS`.

## Scelte fatte con l'utente (non rimettere in discussione)
- Area: bbox lon 8.9100–8.9260, lat 45.5870–45.5985 (~1,25 × 1,27 km). Dati © OpenStreetMap, ODbL (attribuzione nel gioco).
- Grafica stile Hotline Miami: rendering su canvas a bassa risoluzione (PX 2–4) ingrandito, color grading neon, scanline, oscillazione camera, sprite procedurali con contorno nero e pose (walk/run/gun/sit/drink/cheer/dead). Edifici pseudo-3D stile GTA2, resi vari (richiesta utente "sono tutti troppo uguali") in `render/buildings.ts`: altezza dai piani OSM (solo ~1/3 li ha) o stimata da tipo e superficie; facciate in colori lombardi con file di finestre, persiane verdi/marroni, vetrine al piano terra; tetti a padiglione in coppi, piani con parapetto e impianti, capannoni in lamiera, box bassi; di notte finestre accese. Aspetto stabile per edificio (seme dalle coordinate).
- Velocità: a piedi 7.5 m/s, corsa 12, nel bar 6. Polizia: stelle intere (la prima arriva dopo un po' di reati), agenti in arrivo 8–12 s dopo la prima stella, reati non visti pesano il 30%. All'esterno niente morte al primo colpo: passanti 2 colpi, banda 3, agenti 4 (decisi con l'utente in un'altra conversazione sulla vecchia demo, portati nel gioco Phaser). Ricercato a **5 stelle** (Polizia Locale → Polizia di Stato → Carabinieri → Carabinieri+Polizia → reparti speciali). Salute 100, cibo la ripristina.
- **Hollywood (interno, dalle foto dell'utente)**: ingresso in basso (facciata). Sala principale con muri blu e citazioni di film a gesso; **bancone a ovest senza sgabelli** (si beve in piedi), dietro la cucina (scaffali, cappa, affettatrice), spine di rame, cassa, gin; **tavolone scuro da 8** con sedie bistrot, rivolto verso il **telo del proiettore sulla parete d'ingresso** (a sinistra della porta guardando dall'interno verso la strada); sotto il telo un **tavolino alto con 3 sgabelli** (gli sgabelli visti dalla porta sono questi) e due lampade bianche; parete est con bancali, **led viola**, libri, lavagna, orologio, gagliardetto Italia '90; angolo viola sotto la scala accanto al bancone. In fondo un **passaggio in pietra** con gradini, specchio e cassettiera; **bagni** con cornice blu e due porte arancioni; **saletta sul retro** (pareti bianche, murale delle birre, tavolo lungo, 5 tavolini, tenda verde con piante, TV). Il bar è **milanista** ma si guardano tutte le partite. Pianta in `sim/bar.ts` (muri, arredi, posti), disegno in `render/hollywood.ts`; la camera segue il giocatore verso il fondo. Posizioni relative ricavate dalle foto: da confermare con l'utente.
- Partite solo ogni tanto: calci d'inizio alle 15:00 e 20:45 (ora di gioco, 1 s reale = 1 min). Fuori partita lo schermo è **spento**. Reazioni ai gol in base alla squadra degli avventori.
- **Hollywood (esterno, dalla foto dell'utente)**: dehors lungo la facciata su Corso Magenta, **due file di tavoli** (confermato), pergolato di canne con lucine, tenda grigia sopra la porta, tavolo lungo con panche, sedie in metallo bianche/nere/verdi/rosse, botte, lavagnetta; di notte luce viola dei led dalla porta. Davanti resta **lo spazio giusto per un'auto** (strada 7,7 m da muro a muro, dehors 4,4 m): in `world/dehors.ts` il segmento OSM di Corso Magenta viene deviato nella corsia libera; **i pedoni si fanno da parte** quando arriva un mezzo (`dodge` in `sim/peds.ts`). **Tavolo presidenziale** (foto dell'utente): tavolo da birreria in legno chiaro con gambe pieghevoli nere e due panche, parallelo alla facciata, subito a sinistra dell'entrata guardando la porta dalla strada, riservato agli abituali e al protagonista (i clienti qualunque non ci si siedono; il giocatore si siede con E; personaggi con `posto: "presidenziale"`).
- Locali: **Bar Maramao** (Via Corridoni 20) e **Bar Morello** (Corso Magenta 36, confermato dall'utente) = rivali, con 3 membri di banda davanti. **Stuzzi Sushi** (Corso Magenta 41, in OSM ancora "SushiMi") e **Gran Prix** (Corso Magenta 101) = cibo/ristoro.
- Centro = isola pedonale/ZTL. Confine preso da OSM (`motor_vehicle/access=private`): Corso Magenta dal Gran Prix a San Magno + Via Gaeta, Giulini, Venegoni, Cairoli, B. Melzi, A. da Giussano, XXV Aprile, don Bosco. L'utente ha detto "fino al Lia Parrucche": negozio non trovato in OSM né online, confine da confermare.
- Traffico: auto solo su strade aperte, rispettano i **sensi unici** OSM (frecce sull'asfalto); in ZTL solo auto col permesso, volanti (ronde serali), ambulanze/pompieri rari con sirena, rider e maranza (bici/monopattino, impennano, ignorano i sensi unici e vengono insultati). Notte: camion che sbagliano strada, auto contromano che parcheggiano. Ogni mezzo si può rubare; volanti inseguono e fanno scendere agenti.
- Motore: Phaser 4 + TypeScript + Vite (Godot eventualmente più avanti, per Steam/console/store).
- Personaggi: tasto E per parlare, riquadro di dialogo stile Hotline Miami (proposto all'utente, non ancora confermato esplicitamente).
- Audio sintetizzato con Web Audio (nessun file). Colonna sonora fornita dall'utente: pulsante "Carica i tuoi brani" (file locali) o `game/public/music/`.

- **Punti d'interesse** (approvati in blocco dall'utente, "poi correggo man mano"): 55 posti fra caserme/commissariato/polizia locale, pompieri, stazione, monumenti, cinema/teatro, cibo, gelaterie, bar neutrali, farmacie, banche e gioiellerie (posti veri, **nomi inventati**: Banca del Carroccio, Credito del Guerriero, Gioielleria del Corso, Gioielleria Magenta), Sala Bingo, Tabacchi, distributore, parcheggi, negozi, parchi, piscina. Valori provvisori decisi da me: soldi iniziali 50 €, caffè 1,50 € (+10), farmacia 30 € (salute piena), gelato +50 gratis, bingo 10 € (35% vinci 25), gratta e vinci 2 € (10% 10 €, 1% 100 €), rapina banca 800–1500 € e 3 stelle, gioielleria 300–700 € e 2 stelle (una al giorno per posto, solo in orario di apertura); arresto = metà dei soldi e ripartenza dal comando di polizia più vicino. Folle dalla stazione ogni mezz'ora e da cinema/teatro alle 17 e 22:30, campane di San Magno a ogni ora (7–22).

- **Incendi e soccorsi (richiesta utente, stile GTA)**: i mezzi hanno punti vita (auto 100, volanti/ambulanze 130, camion/pompieri 180, bici 35, monopattino 25); incidenti (sopra 6 m/s) e colpi (10 a colpo) li danneggiano; sotto il 35% fumano, a zero prendono fuoco (chi guida scappa) ed esplodono dopo 4,5–7 s (bici 2,5–4): raggio 6,5 m (bici 4), uccide i pedoni, ferisce il giocatore, danneggia gli altri mezzi (esplosioni a catena), lascia rottame e bruciatura. Le morti contano come reato solo se colpa del giocatore. Incendi e morti chiamano pompieri e ambulanze (dopo 5–10 s, partono da fuori schermo e seguono le strade con Dijkstra, anche in ZTL/isola pedonale e contromano): i pompieri spengono, i paramedici **rianimano** i corpi entro 25 m, poi ripartono. Modalità invulnerabile = anche l'auto del giocatore non si danneggia.
- **Olona invalicabile** in auto e moto fuori dai ponti (richiesta utente); a piedi per ora si passa (non specificato).

## Personaggi (definiti dall'utente)
- **Proprietari:** **Max** (omaccione alto, capelli bianchi un po' pazzi, sempre in infradito) e **Giada** (bassina, giovane, pallida, capelli neri). Raramente insieme.
- **Staff a rotazione:** **Mary** e **Annie** (capelli neri), **Martina** (castana), **Lollo**/Lorenzo (alto, giovane, capelli neri).
- Turni in `characters/turni.ts`: fasce 6–14, 14–20, 20–2; per fascia un proprietario (12% entrambi) + uno dello staff a rotazione per giorno (`G.day`). Al cambio turno chi finisce esce dalla porta e chi arriva entra. Nomi sopra la testa quando sei vicino. **Battute ancora da scrivere** (dialogo vuoto: non parlano). Colori dei vestiti non indicati: staff in maglietta nera come nelle foto. Mary e Annie oggi si distinguono solo dal nome.
- Prossimo passo: gli abituè.

## Da fare / in sospeso
- Dialoghi, missioni e personaggi: li definisce l'utente. Non inventarli.
- Interni dei bar rivali (missioni stile Hotline Miami), bande e controllo del territorio (vedi concept §6).
- Confermare: disposizione relativa delle stanze dell'Hollywood ricavata dalle foto, confine ZTL (Lia Parrucche).
- Avvertenza già data all'utente: nomi di locali reali associati a bande criminali = rischio legale/reputazione se il gioco viene diffuso.
- Prestazioni: in ambiente headless senza GPU (SwiftShader) la versione Phaser fa ~12–14 fps contro ~31 della vecchia demo: il costo è la composizione GPU emulata (senza disegnare nulla sulla GPU la logica gira a ~37 fps). Su GPU vere dovrebbe essere trascurabile, ma va verificato dall'utente su PC e telefono (tasto F / `?fps`).
- La tela del mondo va rimessa a filtro NEAREST dopo ogni `refresh()` (Phaser la ricrea col filtro di default, morbido con antialias attivo): vedi `WorldScene`.
- `render: { maxTextures: 1 }` in `main.ts`: con più texture per lotto lo shader di Phaser confronta float interpolati e con GPU software gli oggetti ruotati venivano disegnati a pezzi.
- Il vecchio branch `claude/gta-clone-legnano-concept-miik14` (vecchia demo) è stato unito qui il 20/10; lavorare solo su questo branch e sul gioco in `game/`. Non ripubblicare `demo/index.html` sull'artifact: sovrascriverebbe il gioco Phaser.
- Il progetto "La Bocca del Paese" citato dall'utente non è accessibile da qui.
