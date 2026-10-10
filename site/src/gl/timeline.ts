// I tempi della regia (secondi), senza dipendenze: li usano la regia (choreography.ts), i test e gli script.

/** Fine dell'animazione: logo, frase e modulo sono al loro posto. */
export const DURATION = 6.6;

/** Istante in cui ogni barra (alta, centrale, bassa) scatta al suo posto: prima la bassa, 150 ms fra l'una e l'altra.
 *  All'ultimo clic (LOCK[0]) lo schermo passa dal Forest al Lime. */
export const LOCK: [number, number, number] = [4.1, 3.95, 3.8];

/** Fine del silenzio: parte la linea del finale. */
export const SILENZIO_A = 4.6;

/** Momenti rappresentativi di ogni atto. */
export const TIMES = {
  linea: 1.0, // una sola barra frontale (in realtà tre, allineate in profondità)
  segreto: 2.5, // la camera di lato: si vedono le tre lastre
  deploy: 3.3, // le barre in volo verso il simbolo, avvitandosi
  silenzio: 4.4, // tutto fermo, dopo l'ultimo clic
  linea_finale: 4.8, // la linea a 8° attraversa lo schermo
  logo: 5.1, // il naming si sta aprendo
};

/** Dopo la fine, tutto continua a muoversi in un ciclo di LOOP_PERIOD secondi che parte a LOOP_START. */
export const LOOP_PERIOD = 5;
export const LOOP_START = DURATION + 1.2;

/** Macchina da scrivere su "Ready to be yours.": dopo TW_START, in ciclo. Ferma per TW_HOLD a parola intera, poi
 *  si cancella lettera per lettera, una pausa a vuoto, si riscrive lettera per lettera. */
export const TW_START = DURATION + 3;
export const TW_HOLD = 5.2;
export const TW_ERASE = 0.065; // secondi per lettera cancellata (più veloce: si cancella di getto)
export const TW_EMPTY = 0.55; // pausa con la riga vuota (solo il cursore)
export const TW_TYPE = 0.115; // secondi per lettera scritta
