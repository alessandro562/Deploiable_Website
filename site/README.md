# Deploiable · "Make AI deployable."

Landing pre-lancio: una sola schermata, nessuno scroll, nessuna interazione. Le tre barre del simbolo
giocano da sole in 3D finché non scattano al loro posto; poi compare la frase.
Titolo: **Make AI deployable.** (in inglese): il nome è la promessa. Sottotitolo: "We find where AI pays off,
build the product, and measure the result." Sotto, il blocco pre-lancio: "Launching October 2026", modulo email
("Claim your spot") e l'offerta "The first 20 companies get a free AI process review."

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
  scelta salvata per la sessione; `?lang=en` per forzarla). L'headline "Make AI deployable." resta in inglese.
  Il mese di lancio è la costante `LAUNCH`.
- **Modulo** (`src/signup.ts`): email aziendale, azienda, consenso privacy obbligatorio. Invio a Google Apps Script →
  Google Sheet (`integrations/apps-script/`), URL nella variabile di repository `SIGNUP_ENDPOINT`.
- **Privacy**: `privacy.html` (bozza ex art. 13 GDPR, bilingue, da validare). Footer con i dati di WDA srl.
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

## Coming soon e iscrizione

Sotto la frase compaiono per ultimi (12,45–12,9 s) un piccolo "Coming soon" e il modulo email per il lancio.
Il modulo invia l'email con una POST all'indirizzo in `VITE_SIGNUP_ENDPOINT` (build), in formato FormData con
`Accept: application/json`: va bene un endpoint Formspree (`https://formspree.io/f/…`) o un servizio compatibile.
Senza indirizzo il modulo non finge l'iscrizione: risponde "Sign-ups open very soon.". C'è un campo nascosto anti-bot.

## Deploy

GitHub Pages via `.github/workflows/deploy-pages.yml` (push su `main`). Settings → Pages → Source: **GitHub Actions**.
Con un dominio proprio: `public/CNAME`, `BASE_PATH=/` nel workflow e `VITE_SITE_URL` in `.env`.

Font: solo Satoshi (Fontshare, licenza ITF FFL), servito dal sito. L'etichetta è in maiuscolo Light spaziato.

## Dettagli

- Ritmo verticale: lo spazio "a inchiostro" fra logo e frase è uguale a quello fra frase e "Coming soon" (entro 2 px, test automatico e `scripts/align.mjs`).
- Testo secondario in Moss pieno (su Lime), mai con l'opacità.
- Modulo: hover (Pine), pressione, anello di focus concentrico, autocompilazione del browser neutralizzata, errore con bordo più spesso e vibrazione, conferma con pillola Forest e spunta disegnata.
- Il cambio di palette Forest → Lime è un taglio netto anche per l'HTML: nessuna transizione CSS lo sfuma.
