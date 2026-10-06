// Testi della pagina in italiano (lingua predefinita) e in inglese. Nessuna dipendenza: un dizionario e gli
// attributi data-i18n nell'HTML. L'HTML contiene già i testi italiani, così la pagina è completa anche senza JS.
//
//   data-i18n="chiave"                → textContent
//   data-i18n-attr="attributo:chiave" → attributi (più coppie separate da ";"), es. placeholder, aria-label
//
// La scelta della lingua vale per la sessione (sessionStorage, con fallback all'italiano se non disponibile).
// Per i test e la QA si può forzare con ?lang=it|en.

export type Lang = 'it' | 'en';

/** Mese di lancio: l'unico punto da cambiare se la data si sposta. */
export const LAUNCH: Record<Lang, string> = { it: 'Novembre 2026', en: 'November 2026' };

const TAGLINE = 'Make AI deployable.'; // resta in inglese in entrambe le lingue: il gioco di parole vive solo così
const SUB = {
  it: 'Troviamo dove l’AI ripaga, costruiamo il prodotto e misuriamo il risultato.',
  en: 'We find where AI pays off, build the product, and measure the result.',
};

const DICT = {
  it: {
    'meta.title': `Deploiable · ${TAGLINE}`,
    'meta.description': `${TAGLINE} ${SUB.it} Lancio a ${LAUNCH.it.toLowerCase()}.`,
    'og.description': `${SUB.it} Lancio a ${LAUNCH.it.toLowerCase()}.`,
    'lang.group': 'Lingua',
    sub: SUB.it,
    launch: `Lancio · ${LAUNCH.it}`,
    'form.email.label': 'Email aziendale',
    'form.email.placeholder': 'nome@azienda.it',
    'form.company.label': 'Azienda',
    'form.company.placeholder': 'Azienda',
    'form.submit': 'Prenota la tua AI process review',
    'form.consent.pre': 'Ho letto l’',
    'form.consent.link': 'informativa privacy',
    'form.consent.post': ' e acconsento al trattamento dei dati per essere ricontattato.',
    'form.offer': 'Le prime 20 aziende ricevono una AI process review gratuita.',
    'form.done': 'Richiesta ricevuta.',
    'msg.invalid': 'Inserisci un indirizzo email valido.',
    'msg.company': 'Inserisci il nome della tua azienda.',
    'msg.consent': 'Per continuare, conferma di aver letto l’informativa privacy.',
    'msg.personal': 'Suggerimento: con l’email aziendale prepariamo meglio la review.',
    'msg.sending': 'Invio in corso…',
    'msg.done': 'Ti contattiamo entro 3 giorni lavorativi per fissare la review.',
    'msg.error': 'Invio non riuscito: controlla la connessione e riprova.',
    'msg.closed': 'Le richieste si aprono a brevissimo.',
    'proof.line': 'Dal 2021 al fianco di PMI, corporate e startup',
  },
  en: {
    'meta.title': `Deploiable · ${TAGLINE}`,
    'meta.description': `${TAGLINE} ${SUB.en} Launching ${LAUNCH.en}.`,
    'og.description': `${SUB.en} Launching ${LAUNCH.en}.`,
    'lang.group': 'Language',
    sub: SUB.en,
    launch: `Launching ${LAUNCH.en}`,
    'form.email.label': 'Work email',
    'form.email.placeholder': 'name@company.com',
    'form.company.label': 'Company',
    'form.company.placeholder': 'Company',
    'form.submit': 'Book your AI process review',
    'form.consent.pre': 'I have read the ',
    'form.consent.link': 'privacy notice',
    'form.consent.post': ' and consent to the processing of my data in order to be contacted.',
    'form.offer': 'The first 20 companies get a free AI process review.',
    'form.done': 'Request received.',
    'msg.invalid': 'Please enter a valid email address.',
    'msg.company': 'Please enter your company name.',
    'msg.consent': 'To continue, please confirm you have read the privacy notice.',
    'msg.personal': 'Tip: a work email helps us prepare your review.',
    'msg.sending': 'Sending…',
    'msg.done': 'We’ll contact you within 3 working days to schedule the review.',
    'msg.error': 'Sending failed: check your connection and try again.',
    'msg.closed': 'Requests open very soon.',
    'proof.line': 'Since 2021, working with SMEs, corporates and startups',
  },
} satisfies Record<Lang, Record<string, string>>;

export type Key = keyof (typeof DICT)['it'];

const STORE = 'deploiable.lang';
let current: Lang = 'it';
const listeners: ((lang: Lang) => void)[] = [];

export const lang = () => current;
export const t = (key: Key) => DICT[current][key] ?? DICT.it[key];
export const onLangChange = (fn: (lang: Lang) => void) => listeners.push(fn);

const isLang = (v: unknown): v is Lang => v === 'it' || v === 'en';

function initialLang(): Lang {
  const forced = new URLSearchParams(location.search).get('lang');
  if (isLang(forced)) return forced;
  try {
    const saved = sessionStorage.getItem(STORE);
    if (isLang(saved)) return saved;
  } catch {
    /* sessionStorage non disponibile (navigazione privata, cookie bloccati): si resta in italiano */
  }
  return 'it';
}

function apply() {
  const root = document.documentElement;
  root.lang = current;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as Key);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.dataset.i18nAttr!.split(';')) {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key as Key));
    }
  });
  document.title = t('meta.title');
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === current));
  });
}

export function setLang(next: Lang) {
  current = next;
  try {
    sessionStorage.setItem(STORE, next);
  } catch {
    /* nessun salvataggio: la scelta vale finché la pagina resta aperta */
  }
  apply();
  for (const fn of listeners) fn(next);
}

export function initI18n() {
  current = initialLang();
  apply();
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => {
    b.addEventListener('click', () => {
      if (isLang(b.dataset.lang) && b.dataset.lang !== current) setLang(b.dataset.lang);
    });
  });
}
