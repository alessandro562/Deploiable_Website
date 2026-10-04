# Deploiable · "Ancora un gradino."

Landing pre-lancio: una sola schermata, nessuno scroll, nessuna interazione. Le tre barre del simbolo
giocano da sole in 3D finché non scattano al loro posto; poi compare la frase.
Titolo: **Ancora un gradino.** · CTA: **deploiable sta arrivando.**

## L'animazione (circa 13 secondi, poi resta ferma e "viva")

| Tempo | Atto | Cosa succede |
|---|---|---|
| 0–2,1 s | Buio | Una linea Lime inclinata di 8° si apre in tre barre (motion ufficiale: 120 ms di sfasamento). |
| 2,1–5 s | Le tre carte | Le barre si scambiano di posto in 3D, sempre più veloci. |
| 5,1–8,4 s | Il tentativo | Si impilano storte, oscillano, cadono con un rimbalzo, si disperdono. |
| 8,4–10,7 s | Il gradino | Si incastrano dal basso; ognuna alza il suo blocco di mezzo spessore. L'ultima scatta: lampo e scintille. |
| 10,7–12,9 s | Rivelazione | La camera si ritira, il simbolo si appiattisce nel simbolo ufficiale, compare la frase. |
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

Parametri URL: `?tier=high|mid|mobile|minimal`, `?mode=static`, `?__test=1` (hook per i test).

## Struttura

- `src/gl/symbol/symbolSpec.ts` · il simbolo, dal generatore del brand book (`geo()`): identico all'SVG ufficiale.
- `src/gl/symbol/barGeometry.ts` · barre estruse centrate sul loro perno, con il gradino regolabile (`lift`).
- `src/gl/choreography.ts` · la regia: tracce a keyframe sul tempo.
- `src/gl/stage.ts` · camera, barre e scintille; calcola quanto spazio occupa il simbolo.
- `src/gl/sparks.ts` · le scintille dell'incastro.
- `src/gl/engine.ts` · renderer e post-processing (bloom, vignettatura, aberrazione cromatica).
- `src/main.ts`, `src/core/capabilities.ts` · scelta tra animazione 3D e versione statica.

## Versione statica

Con riduzione del movimento attiva, senza WebGL2 o con risparmio dati, la pagina mostra direttamente il
simbolo piatto ufficiale con la sua motion (barre dall'alto, 120 ms, 400 ms) e la frase. Il codice 3D non viene scaricato.

## Regole del brand rispettate

- Nell'inquadratura finale i due colori sono **esattamente** Forest #10261B e Lime #C8F25A (test automatico, tolleranza 2).
- Niente tone mapping, niente grana né vignettatura sul finale. Il lampo dell'incastro è l'unico momento in cui il Lime va oltre il valore del brand.
- Le barre ruotate e inclinate sono supergrafica; il simbolo conforme e piatto compare solo alla fine.
- Titolo a sinistra, due pesi (Satoshi 300 + 900); il testo non sta mai sopra le barre.

## Deploy

GitHub Pages via `.github/workflows/deploy-pages.yml` (push su `main`). Settings → Pages → Source: **GitHub Actions**.
Con un dominio proprio: `public/CNAME`, `BASE_PATH=/` nel workflow e `VITE_SITE_URL` in `.env`.

Font: Satoshi (Fontshare, licenza ITF FFL) servito dal sito.
