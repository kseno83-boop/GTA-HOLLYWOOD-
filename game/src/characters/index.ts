// Elenco dei personaggi fissi del gioco (formato in types.ts, istruzioni in README.md).
// Descrizioni fornite dall'utente; colori dei vestiti e battute ancora da definire (lo staff indossa la maglietta nera, come nelle foto).
import type { Personaggio } from "./types";

const STAFF_SHIRT = "#1b1b20";

export const PERSONAGGI: Personaggio[] = [
  // proprietari: raramente in turno insieme (vedi turni.ts)
  { id: "max", nome: "Max", ruolo: "proprietario: omaccione alto, capelli bianchi un po' pazzi, sempre in infradito", posto: "barista",
    aspetto: { size: 1.3, hair: "#f4f4f0", hairStyle: "wild", skin: "#e7b38e", shirt: "#3b3b44", pants: "#2c3140", flipflops: true }, dialogo: [] },
  { id: "giada", nome: "Giada", ruolo: "proprietaria: bassina, giovane, pallida, capelli neri", posto: "barista",
    aspetto: { size: .86, hair: "#111114", hairStyle: "long", skin: "#fbe8de", shirt: STAFF_SHIRT }, dialogo: [] },
  // staff a rotazione
  { id: "mary", nome: "Mary", ruolo: "staff: capelli neri", posto: "barista", aspetto: { hair: "#111114", hairStyle: "long", shirt: STAFF_SHIRT }, dialogo: [] },
  { id: "annie", nome: "Annie", ruolo: "staff: capelli neri", posto: "barista", aspetto: { hair: "#141418", hairStyle: "long", shirt: STAFF_SHIRT }, dialogo: [] },
  { id: "martina", nome: "Martina", ruolo: "staff: castana", posto: "barista", aspetto: { hair: "#6b3e22", hairStyle: "long", shirt: STAFF_SHIRT }, dialogo: [] },
  { id: "lollo", nome: "Lollo", ruolo: "staff (Lorenzo): alto, giovane, capelli neri", posto: "barista", aspetto: { size: 1.15, hair: "#111114", hairStyle: "short", shirt: STAFF_SHIRT }, dialogo: [] },
];
