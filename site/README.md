# Deploiable · "We deploy AI. Measurably."

Landing pre-lancio: una sola schermata, nessuno scroll, nessuna interazione. Le tre barre del simbolo
giocano da sole in 3D finché non scattano al loro posto; poi compare la frase.
Titolo: **We deploy AI. Measurably.** (in inglese)

## L'animazione (circa 13 secondi, poi resta ferma e "viva")

| Tempo | Atto | Cosa succede |
|---|---|---|
| 0–2,1 s | Buio | Una linea Lime inclinata di 8° si apre in tre barre (motion ufficiale: 120 ms di sfasamento). |
| 2,1–5 s | Le tre carte | Le barre si scambiano di posto in 3D, sempre più veloci. |
| 5,1–8,4 s | Il tentativo | Si impilano storte, oscillano, cadono con un rimbalzo, si disperdono. |
| 8,4–10,4 s | Il gradino | Si incastrano dal basso; ognuna alza il suo blocco di mezzo spessore e scatta con un clic secco. Al clic dell'ultima barra lo schermo passa di colpo dal Forest al Lime e le barre diventano Forest. Nessuna luce, nessun effetto. |
| 10,4–10,9 s | Silenzio | Tutto fermo, mezzo secondo. |
| 10,9–12,9 s | Il logo | Una linea Forest a 8° attraversa lo schermo (come quella con cui si apre). Mentre passa la camera si ritira sul logo completo e le undici lettere del naming, in 3D, si aprono una dopo l'altra da sinistra a destra, accanto al simbolo che si appiattisce. Poi compare la frase. |
| dopo | Vivo | Ogni ~6 s le tre barre si danno una piccola spinta in sequenza. |

Tutta la regia è in `src/gl/choreography.ts`: ogni movimento è una funzione del tempo, quindi con
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
- Nessun effetto: niente bagliore, grana, vignettatura o scintille. Neppure un pixel supera il Lime del brand (test automatico).
- Le barre ruotate e inclinate sono supergrafica; il simbolo conforme e piatto compare solo alla fine.
- Logo e frase centrati sulla pagina, due pesi (Satoshi 300 + 900); il testo non sta mai sopra le barre.

## Deploy

GitHub Pages via `.github/workflows/deploy-pages.yml` (push su `main`). Settings → Pages → Source: **GitHub Actions**.
Con un dominio proprio: `public/CNAME`, `BASE_PATH=/` nel workflow e `VITE_SITE_URL` in `.env`.

Font: Satoshi (Fontshare, licenza ITF FFL) servito dal sito.
