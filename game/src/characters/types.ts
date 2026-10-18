// Formato dei personaggi fissi. I contenuti (nomi, frasi, missioni) li decide l'autore: vedi README.md in questa cartella.
import type { Look } from "../core/state";

/** Locali dove può stare un personaggio all'aperto (davanti alla porta). */
export type Luogo = "HOLLYWOOD" | "BAR MARAMAO" | "BAR MORELLO" | "STUZZI SUSHI" | "GRAN PRIX";

export interface Personaggio {
  /** Identificativo unico, senza spazi (es. "gestore"). */
  id: string;
  /** Nome mostrato nel dialogo. */
  nome: string;
  /** Solo descrittivo, per ricordarsi chi è. */
  ruolo?: string;
  /**
   * Dove sta:
   * - "barista": prende il posto del barista dietro il bancone dell'Hollywood;
   * - "bancone" / "tavolo": avventore fisso dell'Hollywood (in piedi al bancone o al tavolone);
   * - { fuori: luogo }: in strada, davanti alla porta di quel locale.
   */
  posto: "barista" | "bancone" | "tavolo" | { fuori: Luogo };
  /** Fasce orarie di presenza in ore di gioco, es. [[18, 24], [0, 1.5]]. Se manca: sempre (negli orari di apertura). */
  orari?: [number, number][];
  /** Aspetto: colori CSS. cap = cappellino, stripes = righe sulla maglia, apron = grembiule. */
  aspetto?: Partial<Pick<Look, "shirt" | "pants" | "skin" | "hair" | "cap" | "stripes" | "apron">>;
  /** Squadra del cuore (nome come nel calcio al maxischermo, es. "MILAN"): decide come reagisce ai gol. */
  squadra?: string | null;
  /** Dialogo quando gli parli (tasto E / AZIONE): una battuta per pressione, poi ricomincia. */
  dialogo: string[];
  /** Frasi che dice ogni tanto da solo (nuvoletta). */
  frasi?: string[];
}
