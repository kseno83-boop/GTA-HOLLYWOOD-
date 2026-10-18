# Personaggi fissi

I personaggi si aggiungono in `index.ts`, nell'elenco `PERSONAGGI`. Il formato è descritto in `types.ts`.
Per ora l'elenco è vuoto: i personaggi li definisce l'autore del gioco.

## Cosa fa già il gioco con un personaggio

- **Presenza per orario**: compare solo nelle fasce di `orari` (ore di gioco; `[22, 2]` passa la mezzanotte).
- **Posto**:
  - `"barista"`: prende il posto del barista dietro il bancone dell'Hollywood;
  - `"bancone"` o `"tavolo"`: avventore fisso dell'Hollywood. Entra dalla porta, resta finché è nel suo orario, poi esce;
  - `{ fuori: "BAR MARAMAO" }` (oppure `"HOLLYWOOD"`, `"BAR MORELLO"`, `"STUZZI SUSHI"`, `"GRAN PRIX"`): sta in strada davanti a quel locale.
- **Dialogo**: avvicinati e premi **E** (sul telefono **AZIONE**). Il personaggio dice una battuta di `dialogo` per pressione, con il nome al neon e il testo che appare lettera per lettera. Dopo l'ultima battuta il dialogo si chiude, e la volta dopo ricomincia dall'inizio. Il dialogo si chiude anche se ti allontani.
- **Frasi spontanee**: ogni tanto dice una delle `frasi` in una nuvoletta.
- **Partite**: con `squadra` esulta o si dispera ai gol come gli altri avventori.
- **Se viene ucciso** non torna per il resto della partita. Le conseguenze (missioni, vendette) sono ancora da decidere.

## Modello da copiare

I valori qui sotto sono segnaposto, da sostituire con quelli veri:

```ts
{
  id: "nome-senza-spazi",
  nome: "Nome mostrato",
  ruolo: "chi è (solo promemoria)",
  posto: "bancone",                 // "barista" | "bancone" | "tavolo" | { fuori: "BAR MARAMAO" }
  orari: [[18, 24], [0, 1.5]],      // facoltativo
  aspetto: { shirt: "#d3121e", stripes: "#111", hair: "#2b1d14", cap: "#111" }, // facoltativo
  squadra: "MILAN",                 // facoltativo
  dialogo: ["Prima battuta", "Seconda battuta"],
  frasi: ["Frase detta da solo"],   // facoltativo
},
```
