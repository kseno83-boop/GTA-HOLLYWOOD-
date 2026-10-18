# GTA HOLLYWOOD

Sandbox criminale a vista dall'alto ambientato nel centro di Legnano: open world stile GTA 1/2 + interni stile Hotline Miami, con il **Bar Hollywood** di Corso Magenta come quartier generale.

**Stato:** concept + prima demo giocabile (movimento, passanti, auto, interno del bar).

- [Concept v0.1](docs/CONCEPT.md)
- **Demo:** apri `demo/index.html` nel browser (nessuna installazione). Mappa rigenerabile con `python3 tools/osm_export.py`.

## Demo: cosa c'è
- Centro di Legnano da OpenStreetMap (~1,25 × 1,27 km), edifici in pseudo-3D stile GTA2, minimappa, nome della via.
- A piedi (WASD + mouse, Shift corre) o in auto (E per rubarla/scendere; W/S gas, A/D sterza, Spazio freno a mano).
- Passanti con routine sui marciapiedi, panico agli spari. Ricercato a 5 stelle (Polizia Locale → Polizia di Stato → Carabinieri → reparti speciali): gli agenti ti inseguono, ti picchiano e ti arrestano. Barra della salute: se arriva a zero riparti dall'Hollywood.
- Traffico: auto sulle strade aperte, parcheggi mezzi sul marciapiede. Corso Magenta e le vie ZTL del centro (accesso riservato secondo OSM) sono isola pedonale: passano solo auto col permesso, volanti (ronde serali), ambulanze e pompieri (rari, con sirena bitonale), rider e maranza in bici o monopattino che impennano e si prendono gli insulti dei passanti. Di notte: camion enormi che sbagliano strada e chi fa un pezzo contromano per parcheggiare. Con E si ruba qualsiasi mezzo; da 2 stelle in su arrivano le volanti, che si fermano e fanno scendere gli agenti.
- Locali: Bar Maramao e Bar Morello (rivali, con la loro banda davanti all'ingresso), Stuzzi Sushi e Gran Prix (E per mangiare e recuperare salute).
- Effetti sonori sintetizzati (spari, passi, motore, sirene, porte, cori allo stadio). Colonna sonora: pulsante "Carica i tuoi brani" oppure file in `demo/music/` elencati in `demo/music/playlist.js` (esclusi dal repository).
- Grafica in stile Hotline Miami: resa a pixel, sprite con contorno e animazioni (camminata, corsa, pistola, seduti, esultanza), sangue e bossoli, camera che oscilla e si sposta verso la mira, scanline e colori neon.
- Bar Hollywood (E davanti alla porta): bancone a sinistra con barista, tavolone da 8 a destra, maxischermo sulla parete sud. Gli avventori ordinano, bevono in piedi al bancone o si siedono al tavolone; affluenza legata all'ora (più gente quando gioca il Milan, chiuso 2:00–6:00).
- Calcio al maxischermo: partite alle 15:00 e alle 20:45 (ora di gioco), schermo spento nel resto del tempo; risultato anche fuori dal bar. Il locale è milanista: ai gol del Milan si esulta, ai gol subiti si protesta, e un gol contro l'Inter fa sempre piacere.
- Ciclo giorno/notte (1 secondo = 1 minuto, T avanza di un'ora). Su telefono: joystick a sinistra, pulsanti SPARA e AZIONE.
- [Anteprima area di gioco](docs/mappa-area-gioco.svg), rigenerabile con `python3 tools/osm_preview.py`

Dati cartografici © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licenza ODbL.
