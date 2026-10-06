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
    'form.email.label': 'Email',
    'form.email.placeholder': 'nome@azienda.it',
    'form.submit': 'Riserva il tuo posto',
    'form.offer': 'Le prime 20 aziende ricevono una AI process review gratuita.',
    'form.done': 'Sei in lista',
    'msg.invalid': 'Inserisci un indirizzo email valido.',
    'msg.sending': 'Invio in corso…',
    'msg.done': 'Ti contatteremo prima del lancio.',
    'msg.error': 'Qualcosa non ha funzionato. Riprova.',
    'msg.closed': 'Le iscrizioni aprono a brevissimo.',
    'proof.line': 'Dal 2021 al fianco di PMI, corporate e startup',
  },
  en: {
    'meta.title': `Deploiable · ${TAGLINE}`,
    'meta.description': `${TAGLINE} ${SUB.en} Launching ${LAUNCH.en}.`,
    'og.description': `${SUB.en} Launching ${LAUNCH.en}.`,
    'lang.group': 'Language',
    sub: SUB.en,
    launch: `Launching ${LAUNCH.en}`,
    'form.email.label': 'Email',
    'form.email.placeholder': 'your@email.com',
    'form.submit': 'Claim your spot',
    'form.offer': 'The first 20 companies get a free AI process review.',
    'form.done': 'You’re on the list',
    'msg.invalid': 'Please enter a valid email address.',
    'msg.sending': 'Saving your spot…',
    'msg.done': 'We’ll be in touch before launch.',
    'msg.error': 'Something went wrong. Please try again.',
    'msg.closed': 'Sign-ups open very soon.',
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
