# Deploiable · landing "Tre linee"

Landing pre-lancio: un film in 3D guidato dallo scroll, costruito dalle tre barre del simbolo.
CTA: **deploiable sta arrivando.**

## Il racconto

| # | Scena | Cosa succede |
|---|---|---|
| 0 | Prologo | Tre filamenti Lime entrano con la motion ufficiale del logo. |
| 1 | Il rumore | I filamenti esplodono in una nube di trattini. "Tutti parlano di AI." |
| 2 | Due mezze risposte | La nube diventa un piano (Gantt congelato) e uno strumento (cubo chiuso). In mezzo, il vuoto. |
| 3 | Tre linee | Dal vuoto si accendono tre barre: Analisi (la scansione ordina la griglia), Pilota (il gradino), Produzione (la barra corre all'infinito). "Meno demo. Più deploy." |
| 4 | Il simbolo | La camera arretra: l'autostrada era il simbolo. |
| 5 | Finale | Tre fasce Lime allagano lo schermo, il logo piatto entra con la motion ufficiale. |

Tutti i testi sono in `index.html` (attributi `data-in` / `data-out` con le etichette della regia).
La regia (camera, particelle, barre) è in `src/core/choreography.ts`: ogni canale è una traccia a
keyframe sul tempo dello scroll, quindi avanti e indietro danno sempre lo stesso fotogramma.

## Comandi

```bash
npm ci
npm run dev        # sviluppo, http://localhost:5173
npm run build      # typecheck + build in dist/ + controllo pesi
npm run preview    # serve dist/ su :4173
npm test           # test unitari (simbolo identico all'SVG ufficiale)
npm run e2e        # test end-to-end (Playwright, Chromium)
```

Utili per la revisione (con `npm run preview` attivo):

```bash
node scripts/shots.mjs http://localhost:4173/ mobile 1440 900   # screenshot per scena in artifacts/
node scripts/render-film.mjs 36 24 1280 720                      # film deterministico → artifacts/film.mp4
node scripts/make-posters.mjs                                    # public/og.jpg e apple-touch-icon.png
```

Parametri URL: `?tier=high|mid|mobile|minimal`, `?mode=static`, `?noIntro`, `?particles=N`.

## Struttura

- `src/gl/symbol/symbolSpec.ts` · porting del generatore del simbolo dal brand book (`geo()`), con
  tracciamento degli angoli per deformare le barre (gradino, estensione, accensione).
- `src/gl/particles/` · un solo sistema di trattini istanziati, stati calcolati nello shader.
- `src/gl/engine.ts` · renderer, post-processing (bloom, grana, vignettatura, aberrazione cromatica).
- `src/ui/` · testi, parole del rumore, timecode, indicatore di fase, finale.
- `src/fallback/staticMode.ts` · versione statica per reduced motion, browser senza WebGL2, risparmio dati.
- `scripts/prepare-brand-assets.mjs` · legge gli SVG ufficiali alla radice del repo (gira prima di dev/build).

## Regole del brand rispettate

- Lime esatto (#C8F25A) sulle facce frontali e nel finale: niente tone mapping, test automatico sul colore.
- Su Lime solo Forest; mai Lime su fondo chiaro; dietro al testo solo tono su tono.
- Le barre 3D sono supergrafica; il logo vero compare solo piatto (topbar e finale).
- Titoli allineati a sinistra, al massimo due pesi (Satoshi 300 + 900).

## Deploy

GitHub Pages via `.github/workflows/deploy-pages.yml` (push su `main`). Nelle impostazioni del repo:
Settings → Pages → Source: **GitHub Actions**. Con un dominio proprio: aggiungere `public/CNAME`,
impostare `BASE_PATH=/` nel workflow e aggiornare `VITE_SITE_URL` in `.env`.

Font: Satoshi (Fontshare, licenza ITF FFL) servito dal sito; Instrument Serif e JetBrains Mono (OFL) da npm.
