# Deploiable · "Dai problemi di business all'AI in produzione."

Landing di Deploiable (marchio di WDA srl). Posizionamento su due pilastri di pari peso: **AI Transformation**
(ridisegnare i processi esistenti e integrarli nei sistemi dell'azienda) e **AI-native Product Studio** (costruire
prodotti software AI su misura), con un solo standard di arrivo: **AI in produzione**.

La pagina, dall'alto:

1. **Hero**: l'intro 3D del logo (sotto), poi la headline bilingue ("Dai problemi di business / all'AI in
   produzione." · "From business problems / to production AI.") con la macchina da scrivere sulla seconda riga,
   il sottotitolo con le due anime, due pulsanti (contatto, racconto) e la prova sociale.
2. **Il racconto** (`#approach`, `src/narrative.ts`): un solo sistema in 2.5D che evolve mentre si scorre
   (scorrimento nativo, nessun blocco). Problema → due strade → processo trasformato (persona ed Excel si
   comprimono nell'AI, l'approvazione resta alla persona) → prodotto che si assembla fino a un'interfaccia vera →
   convergenza in uno stack in produzione nel contesto reale → integrazione con ERP, CRM, email, documenti, dati,
   PowerPoint, Teams e le interfacce d'uscita.
3. **Cosa realizziamo** (sei forme), **Come lavoriamo** (Comprendiamo · Costruiamo · Mettiamo in produzione),
   **Esempi** (tre scenari dichiarati come esempi, non casi cliente): ogni figura è un frammento dello stesso sistema.
4. **Contatto** su Lime: la strada (trasformare un processo / costruire un prodotto AI) e il modulo.

### Il sistema in SVG (`src/system/`)

- `engine.ts` · motore 2.5D: camera con prospettiva "debole" (ogni oggetto prende la scala della sua profondità,
  le facce restano affini: testi veri e nitidi), lastre estruse con fianchi ombreggiati, ombre a terra,
  collegamenti ortogonali che si disegnano, impulsi di dati, ordinamento per profondità. Stati chiave interpolati.
- `journey.ts` · gli otto stati chiave del racconto, in composizione orizzontale (desktop) e verticale (telefono).
- `minis.ts` · i frammenti delle sezioni (entrata, riposo, attivo al passaggio del mouse o al centro dello schermo).
- `faces.ts` · ciò che sta sulle facce: l'interfaccia del prodotto, la persona che approva, l'indicatore "live".
- `camera.ts` · inquadratura: dagli stati chiave della camera ai parametri a schermo.

Il racconto e le sezioni non dipendono dal 3D: funzionano anche senza WebGL. Con `prefers-reduced-motion` la
scena non si muove e ogni capitolo ha la sua immagine ferma, disegnata dallo stesso motore. Peso: ~15 KB gzip.

## L'animazione (circa 6,6 secondi, poi resta ferma e "viva")

| Tempo | Atto | Cosa succede |
|---|---|---|
| 0–1,3 s | La linea | Su Forest una linea Lime si allarga e diventa una barra. Sembra una sola: sono tre, allineate in profondità. |
| 1,2–2,7 s | Il segreto | La camera gira di lato e sale: la barra si sfoglia in tre lastre parallele. |
| 2,65–4,1 s | Il deploy | Ognuna vola al suo posto nel simbolo con un avvitamento completo (120–150 ms di sfasamento), la camera torna frontale. Si incastrano dal basso con un clic secco; all'ultimo lo schermo passa al Lime e le barre diventano Forest. |
| 4,1–4,6 s | Silenzio | Tutto fermo. |
| 4,6–6,6 s | Il logo | Una linea Forest a 8° attraversa lo schermo; la camera si ritira sul logo completo e le undici lettere del naming, in 3D, si aprono una dopo l'altra. Intanto entra dal bordo la supergrafica. Poi la frase, poi "Coming soon" e il modulo. |
| dopo | Vivo, in ciclo di 5 s | Le barre del logo fanno un giro completo su se stesse (sfalsate di 120 ms) e tornano ferme e allineate; la supergrafica ruota lentissima e a metà ciclo le sue barre scivolano in avanti lungo gli 8°. |

**Supergrafica** (`src/gl/backdrop.ts`): il simbolo ingrandito e tagliato dal bordo, tono su tono, come da brand book
(05 · Elementi grafici): Lime Deep su Lime, a tutto campo e anche dietro al testo. In 3D, con una camera propria
(non segue zoom e spostamenti del logo). Nella versione statica è lo stesso simbolo in SVG, fermo.

I tempi sono in `src/gl/timeline.ts` (li usano anche test e script). Tutta la regia è in `src/gl/choreography.ts`: ogni movimento è una funzione del tempo, quindi con
lo stesso tempo si ottiene sempre lo stesso fotogramma (è ciò che permette test e render del video).

## Comandi

```bash
npm ci
npm run dev        # sviluppo, http://localhost:5173
npm run build      # typecheck + build in dist/ + controllo pesi
npm run preview    # serve dist/ su :4173
npm test           # test unitari (il simbolo coincide con l'SVG ufficiale)
npm run e2e        # test end-to-end (Playwright, Chromium)
```

Con `npm run preview` attivo:

```bash
node scripts/shots.mjs http://localhost:4173/ mobile 1440 900   # screenshot in artifacts/ (secondi in POINTS="1,5,9")
node scripts/render-film.mjs 1280 720 30 high                     # video → artifacts/film.mp4
node scripts/render-film.mjs 720 1280 30 high 1.5 artifacts/film-verticale.mp4   # per i social
node scripts/make-posters.mjs                                     # public/og.jpg e apple-touch-icon.png
```

Parametri URL: `?tier=high|mid|mobile|minimal` (cambia solo nitidezza: densità di pixel e antialiasing), `?mode=static`, `?palette=forest|lime|flip` (barre Lime su Forest, barre Forest su Lime, oppure Forest che passa a Lime al clic dell'ultima barra; predefinito: `flip`, impostato in `src/app.ts`), `?__test=1` (hook per i test).

## Lingue, modulo, privacy

- **Bilingue**: italiano predefinito, inglese col selettore IT / EN (`src/i18n.ts`: dizionario, attributi `data-i18n`,
  scelta salvata per la sessione; `?lang=en` per forzarla). Si traducono anche le etichette della scena, la
  headline (ricostruita in lettere per la macchina da scrivere) e le catene degli esempi.
  L'etichetta del lancio è la costante `LAUNCH` (oggi solo "Coming soon", senza data).
- **Modulo** (`src/signup.ts`): strada scelta (facoltativa, `interest`: `transform` | `build`), email aziendale,
  azienda, consenso privacy obbligatorio. I link "Parliamo di un tuo processo / prodotto" del racconto la
  preselezionano. Invio a Google Apps Script → Google Sheet (`integrations/apps-script/`, colonna "Interesse"),
  URL nella variabile di repository `SIGNUP_ENDPOINT`.
- **Privacy**: `privacy.html` (bozza ex art. 13 GDPR, bilingue, da validare). Footer con i dati di WDA srl.
- **Dettagli animati**: il simbolo nell'header gira su se stesso al passaggio del mouse (o al focus da tastiera;
  nella versione statica le barre fanno un piccolo salto). "deployable." ha un effetto macchina da scrivere in
  ciclo (tempi in `src/gl/timeline.ts`, `TW_*`), con la parola intera sempre disponibile ai lettori di schermo.
- **QA**: `scripts/qa-shots.mjs` (screenshot a pagina intera, `PAGE=privacy.html` per l'informativa),
  `scripts/contrast.mjs` (contrasto WCAG di ogni testo). Screenshot e report in `qa/` alla radice del repo.

## Struttura

- `src/gl/symbol/symbolSpec.ts` · il simbolo, dal generatore del brand book (`geo()`): identico all'SVG ufficiale.
- `src/gl/symbol/barGeometry.ts` · barre estruse centrate sul loro perno, con il gradino regolabile (`lift`).
- `src/gl/choreography.ts` · la regia: tracce a keyframe sul tempo.
- `src/gl/wordmark.ts` · il naming in 3D: il lettering ufficiale del logo (già in curve) estruso con la profondità delle barre e posizionato come nel logo orizzontale.
- `src/gl/stage.ts` · camera, barre e lettere. Nel finale inquadra il segnaposto `.logo-slot` della pagina, così il logo 3D coincide con il layout (misurato: entro 1 px).
- `src/gl/engine.ts` · renderer semplice: niente post-produzione, niente tone mapping.
- `src/main.ts`, `src/core/capabilities.ts` · scelta tra animazione 3D e versione statica.
- `scripts/align.mjs` · misura sui pixel l'allineamento del finale (centri del logo e delle due righe, spazi) a nove formati di schermo.
- `src/narrative.ts` · il racconto: avanzamento dai capitoli, camera, inclinazione col puntatore, immagini ferme.
- `src/sections.ts` · header sopra le fasce scure, menu su telefono, link interni, frammenti, entrate dei blocchi.
- `scripts/v2-shots.mjs` · fotogrammi del racconto e delle sezioni; `scripts/deliver-shots.mjs` · screenshot IT/EN;
  `scripts/perf.mjs` · LCP, CLS, task lunghi e fluidità; `scripts/capture.mjs` · video fotogramma per fotogramma.

## Versione statica

Con riduzione del movimento attiva, senza WebGL2 o con risparmio dati, la pagina mostra direttamente il
logo completo ufficiale con la sua motion (barre dall'alto, 120 ms, 400 ms; lettering per ultimo, senza movimento) e la frase. Il codice 3D non viene scaricato.

## Regole del brand rispettate

- Il gioco delle barre è Lime su Forest; dal clic dell'ultima barra in poi è Forest su Lime, come le copertine e gli annunci del brand book (su Lime solo Forest). Fondo, barre e logo sono **esattamente** Forest #10261B e Lime #C8F25A (test automatico, tolleranza 2).
- La versione statica e l'anteprima social mostrano il finale: logo e frase Forest su Lime.
- La texture del fondo è solo la supergrafica tono su tono (Lime Deep esatto sulla faccia frontale, test automatico).
- Nessun effetto: niente bagliore, grana, vignettatura o scintille. Neppure un pixel supera il Lime del brand (test automatico).
- Le barre ruotate e inclinate sono supergrafica; il simbolo conforme e piatto compare solo alla fine.
- Logo e frase centrati sulla pagina, due pesi (Satoshi 300 + 900); il testo non sta mai sopra le barre.

## Deploy

GitHub Pages via `.github/workflows/deploy-pages.yml` (push su `main`). Settings → Pages → Source: **GitHub Actions**.
Con un dominio proprio: `public/CNAME`, `BASE_PATH=/` nel workflow e `VITE_SITE_URL` in `.env`.

Font: solo Satoshi (Fontshare, licenza ITF FFL), servito dal sito. L'etichetta è in maiuscolo Light spaziato.

## Dettagli

- Ritmo verticale: lo spazio "a inchiostro" fra logo e frase è uguale a quello fra frase e "Coming soon" (entro 2 px, test automatico e `scripts/align.mjs`).
- Testo secondario in Moss pieno (su Lime), mai con l'opacità.
- Modulo: hover (Pine), pressione, anello di focus concentrico, autocompilazione del browser neutralizzata, errore con bordo più spesso e vibrazione, conferma con pillola Forest e spunta disegnata.
- Il cambio di palette Forest → Lime è un taglio netto anche per l'HTML: nessuna transizione CSS lo sfuma.
