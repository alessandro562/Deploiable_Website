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
