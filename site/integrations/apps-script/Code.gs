/**
 * Deploiable · ricezione delle richieste di AI process review dalla landing.
 *
 * Il foglio collegato riceve una riga per richiesta. Pubblicazione: vedi README.md in questa cartella.
 * Il modulo invia (POST, application/x-www-form-urlencoded):
 *   email, company, consent ("si"), consent_text, lang, page, _gotcha (trappola per i bot: deve essere vuoto)
 */
var SHEET_NAME = 'Richieste';
var HEADERS = ['Data', 'Email', 'Azienda', 'Consenso', 'Testo del consenso', 'Lingua', 'Pagina'];

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
  return sheet;
}

function ok_() {
  return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
}
