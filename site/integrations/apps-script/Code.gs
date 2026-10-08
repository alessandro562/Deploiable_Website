/**
 * Deploiable · ricezione delle richieste di contatto dalla landing.
 *
 * Il foglio collegato riceve una riga per richiesta. Pubblicazione: vedi README.md in questa cartella.
 * Il modulo invia (POST, application/x-www-form-urlencoded):
 *   email, company, consent ("si"), consent_text, lang, page, interest, _gotcha (trappola per i bot: deve essere vuoto)
 * interest: la strada scelta nel modulo, "transform" (trasformare un processo), "build" (costruire un prodotto AI)
 * oppure vuoto.
 */
var SHEET_NAME = 'Richieste';
var HEADERS = ['Data', 'Email', 'Azienda', 'Consenso', 'Testo del consenso', 'Lingua', 'Pagina', 'Interesse'];
var INTERESTS = { transform: 'Trasformare un processo', build: 'Costruire un prodotto AI' };

function doPost(e) {
  var p = (e && e.parameter) || {};
  // bot: campo nascosto compilato, oppure dati mancanti → si ignora senza errori
  if (p._gotcha || !p.email || !p.company || p.consent !== 'si') return ok_();

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = sheet_();
    sheet.appendRow([
      new Date(),
      String(p.email).slice(0, 254),
      String(p.company).slice(0, 200),
      'sì',
      String(p.consent_text || '').slice(0, 500),
      String(p.lang || '').slice(0, 5),
      String(p.page || '').slice(0, 500),
      INTERESTS[p.interest] || '',
    ]);
  } finally {
    lock.releaseLock();
  }
  return ok_();
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  // fogli creati prima della colonna "Interesse": si aggiunge l'intestazione mancante, le righe vecchie restano
  else if (sheet.getRange(1, HEADERS.length).getValue() === '') sheet.getRange(1, HEADERS.length).setValue(HEADERS[HEADERS.length - 1]);
  return sheet;
}

function ok_() {
  return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
}
