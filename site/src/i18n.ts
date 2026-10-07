// Testi della pagina in italiano (lingua predefinita) e in inglese. Nessuna dipendenza: un dizionario e gli
// attributi data-i18n nell'HTML. L'HTML contiene già i testi italiani, così la pagina è completa anche senza JS.
//
//   data-i18n="chiave"                → textContent
//   data-i18n-attr="attributo:chiave" → attributi (più coppie separate da ";"), es. placeholder, aria-label
//
// La scelta della lingua vale per la sessione (sessionStorage, con fallback all'italiano se non disponibile).
// Per i test e la QA si può forzare con ?lang=it|en.

export type Lang = 'it' | 'en';

/** Etichetta del lancio: niente data per ora, solo "Coming soon" (in maiuscolo dal CSS), uguale nelle due lingue. */
export const LAUNCH = 'Coming soon';

const TAGLINE = 'We build the AI products companies run on.'; // resta in inglese in entrambe le lingue: breve e diretta, è la firma del brand
const SUB = {
  it: 'Li costruiamo dentro la tua azienda o li validiamo prima sul mercato, e li portiamo fino all’uso di ogni giorno.',
  en: 'Built inside your company or proven on the market first, and taken all the way to everyday use.',
};

const DICT = {
  it: {
    'meta.title': `Deploiable · ${TAGLINE}`,
    'meta.description': `${TAGLINE} ${SUB.it} Coming soon.`,
    'og.description': `${SUB.it} Coming soon.`,
    'lang.group': 'Lingua',
    sub: SUB.it,
    launch: LAUNCH,
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
    'proof.line': 'clienti dal 2021',
    'story.label': 'Come lavoriamo',
    'story.1k': 'Problema',
    'story.2k': 'Prodotto',
    'story.3k': 'Uso',
    'story.1': 'Partiamo dal problema.',
    'story.1s': 'Troviamo dove l’AI cambia davvero il lavoro di ogni giorno: tempo, errori, decisioni.',
    'story.2': 'Costruiamo il prodotto.',
    'story.2s': 'Su misura dentro la tua azienda, oppure già provato sul mercato e pronto da adottare.',
    'story.3': 'Lo portiamo in uso.',
    'story.3s': 'Integrato nei processi e nei sistemi, misurato con i KPI, pronto a scalare.',
    'foot.mark': 'Deploiable è un marchio di WDA srl',
    'foot.vat': 'P.IVA e C.F.',
    'foot.pec': 'PEC',
    'foot.office': 'Sede legale',
    'foot.address': 'Via Marsala 29/H, 00185 Roma (RM)',
    'foot.privacy': 'Privacy',
    'privacy.title': 'Informativa privacy · Deploiable',
    'privacy.description': 'Informativa sul trattamento dei dati personali raccolti dal modulo di contatto di Deploiable.',
    'privacy.back': 'Torna alla pagina principale',
  },
  en: {
    'meta.title': `Deploiable · ${TAGLINE}`,
    'meta.description': `${TAGLINE} ${SUB.en} Coming soon.`,
    'og.description': `${SUB.en} Coming soon.`,
    'lang.group': 'Language',
    sub: SUB.en,
    launch: LAUNCH,
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
    'proof.line': 'clients since 2021',
    'story.label': 'How we work',
    'story.1k': 'Problem',
    'story.2k': 'Product',
    'story.3k': 'Adoption',
    'story.1': 'We start from the problem.',
    'story.1s': 'We find where AI really changes everyday work: time, errors, decisions.',
    'story.2': 'We build the product.',
    'story.2s': 'Tailored inside your company, or already proven on the market and ready to adopt.',
    'story.3': 'We put it to work.',
    'story.3s': 'Integrated into your processes and systems, measured with KPIs, ready to scale.',
    'foot.mark': 'Deploiable is a trademark of WDA srl',
    'foot.vat': 'VAT no. & tax code',
    'foot.pec': 'Certified email',
    'foot.office': 'Registered office',
    'foot.address': 'Via Marsala 29/H, 00185 Rome (RM), Italy',
    'foot.privacy': 'Privacy',
    'privacy.title': 'Privacy notice · Deploiable',
    'privacy.description': 'Notice on the processing of personal data collected through the Deploiable contact form.',
    'privacy.back': 'Back to the main page',
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
  // ogni pagina indica la chiave del suo titolo (data-title-key su <html>), la landing usa meta.title
  document.title = t((root.dataset.titleKey as Key) || 'meta.title');
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
