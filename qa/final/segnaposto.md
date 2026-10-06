# Segnaposto da compilare prima della pubblicazione

## Landing (`site/index.html`)
- **Loghi clienti**: online Comtel, Braga Moro, Marchiani, Junker (servono le autorizzazioni scritte all'uso).
  **Green Stone** è pronto in `site/integrations/clients-pending/green-stone.svg`, fuori dai file pubblicati (NDA nel brief):
  con l'autorizzazione, spostarlo in `site/public/assets/clients/` e aggiungerlo (commento sopra i loghi in `index.html`).

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
- Etichetta di lancio: `LAUNCH` in `site/src/i18n.ts` (oggi "Coming soon", senza data).
- Offerta "prime 20 aziende": chiave `form.offer` in `site/src/i18n.ts`.
