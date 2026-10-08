# Richieste dalla landing → Google Sheet

Il modulo della landing invia ogni richiesta (strada scelta, email aziendale, azienda, consenso, lingua) a un piccolo
Google Apps Script che la scrive in un Google Sheet. Nessun servizio esterno in più, i dati restano nel
vostro Google Workspace.

## Pubblicazione (una volta, circa 5 minuti)

1. Crea un Google Sheet (es. "Deploiable · Richieste review") con l'account aziendale.
2. Nel foglio: **Estensioni → Apps Script**. Cancella il contenuto e incolla `Code.gs` di questa cartella. Salva.
3. **Esegui il deployment → Nuovo deployment** → tipo **App web**:
   - *Esegui come*: **Me**
   - *Chi ha accesso*: **Chiunque**
   Autorizza quando richiesto e copia l'**URL dell'app web** (finisce con `/exec`).
4. Su GitHub: **Settings → Secrets and variables → Actions → Variables → New repository variable**
   - Nome: `SIGNUP_ENDPOINT`
   - Valore: l'URL copiato al punto 3
5. **Actions → "Deploy landing su GitHub Pages" → Run workflow**: il sito viene ricompilato con l'indirizzo.

## Note
- Il browser invia la richiesta in modalità `no-cors` (Apps Script non permette di leggere la risposta da un
  altro dominio): la pagina mostra la conferma quando l'invio non dà errori di rete. Per verificare, controlla
  che la riga compaia nel foglio.
- Se modifichi lo script, fai **Gestisci deployment → Modifica → Nuova versione**: l'URL resta lo stesso.
- **Colonna "Interesse" (V2 del sito)**: il modulo invia anche la strada scelta (`interest`: trasformare un
  processo o costruire un prodotto AI). Per salvarla incolla il nuovo `Code.gs` e pubblica una nuova versione
  come sopra; finché non lo fai, il campo viene ignorato e il resto della richiesta si salva come prima.
- Nell'informativa privacy va indicato Google come responsabile del trattamento (vedi `privacy.html`).
