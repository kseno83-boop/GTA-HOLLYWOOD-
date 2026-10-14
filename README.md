# GTA HOLLYWOOD

Sandbox criminale a vista dall'alto ambientato nel centro di Legnano: open world stile GTA 1/2 + interni stile Hotline Miami, con il **Bar Hollywood** di Corso Magenta come quartier generale.

**Stato:** concept + prima demo giocabile (movimento, passanti, auto, interno del bar).

- [Concept v0.1](docs/CONCEPT.md)
- **Demo:** apri `demo/index.html` nel browser (nessuna installazione). Mappa rigenerabile con `python3 tools/osm_export.py`.

## Demo: cosa c'è
- Centro di Legnano da OpenStreetMap (~1,25 × 1,27 km), edifici in pseudo-3D stile GTA2, minimappa, nome della via.
- A piedi (WASD + mouse, Shift corre) o in auto (E per rubarla/scendere; W/S gas, A/D sterza, Spazio freno a mano).
- Passanti con routine sui marciapiedi, panico agli spari, livello di ricercato a 4 stelle, vigili/agenti che ti inseguono e arrestano.
- Bar Hollywood: E davanti alla porta. Interno in stile Hotline Miami con barista e avventori che entrano, ordinano, si siedono, chiacchierano ed escono; affluenza legata all'ora (aperitivo pieno, chiuso 2:00–6:00).
- Ciclo giorno/notte (1 secondo = 1 minuto, T avanza di un'ora). Su telefono: joystick a sinistra, pulsanti SPARA e AZIONE.
- [Anteprima area di gioco](docs/mappa-area-gioco.svg), rigenerabile con `python3 tools/osm_preview.py`

Dati cartografici © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licenza ODbL.
