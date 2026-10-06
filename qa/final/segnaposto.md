# Segnaposto da compilare prima della pubblicazione

## Landing (`site/index.html`)
- **Loghi clienti** `[CLIENTE_1]` … `[CLIENTE_5]`: salvare i file in `site/public/assets/clients/` (SVG o PNG trasparente)
  e sostituire ogni `<span class="client-ph">` con `<img src="assets/clients/nome.svg" alt="Nome cliente" loading="lazy" />`.
  Servono le autorizzazioni scritte all'uso del nome/logo.

## Invio del modulo (configurazione, non testo)
- **`SIGNUP_ENDPOINT`**: URL della web app Google Apps Script (istruzioni in `site/integrations/apps-script/README.md`).
  Finché manca, il modulo risponde "Le richieste si aprono a brevissimo." e non invia nulla.

## Informativa privacy (`site/privacy.html`, IT e EN) — tutta da validare legalmente
- `[EMAIL_PRIVACY]` (×4): email di contatto per la privacy.
- `[DPO — …]`: responsabile della protezione dei dati, se nominato (altrimenti eliminare la riga).
- `[DATI TECNICI — … [FORNITORE] … [DURATA]]` / `[TECHNICAL DATA — … [PROVIDER] … [PERIOD]]`: log tecnici dell'hosting.
- `[ALTRE FINALITÀ …]` / `[OTHER PURPOSES …]`: eventuali finalità ulteriori (es. newsletter con consenso separato).
- `[DA VALIDARE CON IL CONSULENTE LEGALE]` / `[TO BE VALIDATED BY LEGAL COUNSEL]`: base giuridica.
- `[DURATA — es. 12 mesi]` / `[PERIOD — e.g. 12 months]`: tempo di conservazione.
- `[EVENTUALE CONSERVAZIONE PIÙ LUNGA …]` / `[LONGER RETENTION …]`.
- `[VERIFICARE CONTRATTO/DPA E REGIONE DEI DATI]` / `[CHECK DPA AND DATA REGION]`: Google Workspace.
- `[VERIFICARE I LOG TECNICI TRATTATI]` / `[CHECK TECHNICAL LOGS PROCESSED]`: GitHub Pages.
- `[ALTRI DESTINATARI …]` / `[OTHER RECIPIENTS …]`.
- `[BASE DEL TRASFERIMENTO …]` / `[TRANSFER MECHANISM …]`: trasferimenti extra-SEE.
- `[AGGIORNARE SE SI AGGIUNGONO STRUMENTI DI ANALISI]` / `[UPDATE IF ANALYTICS ARE ADDED]`.
- `[DATA]` / `[DATE]`: data di ultimo aggiornamento.
- Banner "BOZZA — da validare legalmente prima della pubblicazione": da togliere solo dopo la validazione.

## Costanti da tenere aggiornate
- Mese di lancio: `LAUNCH` in `site/src/i18n.ts` (oggi Novembre 2026 / November 2026).
- Offerta "prime 20 aziende": chiave `form.offer` in `site/src/i18n.ts`.
