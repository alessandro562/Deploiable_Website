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

const TITLE = {
  it: 'Dai problemi di business all’AI in produzione.',
  en: 'From business problems to production AI.',
};
const SUB = {
  it: 'Ripensiamo i processi aziendali e costruiamo prodotti AI-\u2060native: su misura per le aziende, di nicchia per il mercato. Dall’analisi alla messa in produzione, integrati nei sistemi che la tua azienda usa già.',
  en: 'We redesign business processes and build AI-\u2060native products: custom for companies, niche products for the market. From discovery to production, integrated with the systems your company already uses.',
};

// il "word joiner" (U+2060) tiene unito "AI-native" a capo; nei meta non serve
const plain = (t: string) => t.replace(/\u2060/g, '');

const DICT = {
  it: {
    'meta.title': `Deploiable · ${TITLE.it}`,
    'meta.description': plain(SUB.it),
    'og.description': plain(SUB.it),
    'lang.group': 'Lingua',
    'nav.method': 'Come lavoriamo',
    'approach.k': 'Cosa facciamo',
    'approach.t': 'Un product lab, due linee di prodotto.',
    'line.1.k': '01 · Per i processi delle aziende',
    'line.1.t': 'Soluzioni AI integrate nei processi del cliente.',
    'line.1.s': 'Individuiamo i processi in cui l’AI incide su costi, tempi o ricavi e la portiamo in produzione, dentro l’operatività del cliente, con un modello legato al risultato. Se le automazioni non bastano, creiamo un prodotto su misura e lo consegniamo chiavi in mano.',
    'line.1.tag.1': 'Workflow AI',
    'line.1.tag.2': 'Agenti AI',
    'line.1.tag.3': 'Prodotto su misura',
    'line.1.link': 'Parliamo di un tuo processo',
    'line.2.k': '02 · Product Studio',
    'line.2.t': 'Prodotti di nicchia per acquirenti strategici.',
    'line.2.s': 'Troviamo la nicchia, costruiamo il prodotto AI-\u2060native e lo portiamo sul mercato. L’azienda lo acquista quando funziona e ha già clienti, senza avviare un progetto interno. Lo vendiamo a imprese che vogliono innovare per ampliare o integrare il proprio business.',
    'line.2.tag.1': 'Prodotti AI-\u2060native',
    'line.2.tag.2': 'Lancio sul mercato',
    'line.2.tag.3': 'Vendita a imprese',
    'line.2.link': 'Parliamo di un tuo prodotto',
    'nav.label': 'Navigazione principale',
    'nav.menu': 'Menu',
    'nav.approach': 'Approccio',
    'nav.contact': 'Contatti',
    'claim.1': 'Dai problemi di business',
    'claim.2': 'all’AI in produzione.',
    sub: SUB.it,
    launch: LAUNCH,
    'cta.primary': 'Costruiamo ciò che serve',
    'cta.secondary': 'Scopri il nostro approccio',
    'proof.line': 'clienti dal 2021',
    'method.k': 'Come lavoriamo',
    'method.t': 'Comprendiamo. Costruiamo. Mettiamo in produzione.',
    'step.1.t': 'Comprendiamo',
    'step.1.s': 'Analizziamo processi, utenti, dati, sistemi e opportunità.',
    'step.2.t': 'Costruiamo',
    'step.2.s': 'Progettiamo e sviluppiamo la soluzione più adatta: workflow, agente, applicazione o prodotto AI-⁠native.',
    'step.3.t': 'Mettiamo in produzione',
    'step.3.s': 'Integriamo, testiamo, rilasciamo, monitoriamo e miglioriamo nel tempo.',
    'contact.k': 'Contatti',
    'contact.t': 'Cosa vuoi trasformare?',
    'contact.s': 'Che tu voglia migliorare un processo esistente o costruire un nuovo prodotto AI, troviamo insieme l’approccio giusto.',
    'contact.legend': 'Da dove partiamo?',
    'path.transform': 'Trasformare un processo',
    'path.transform.s': 'Ridisegnare un processo esistente con AI e automazione.',
    'path.build': 'Costruire un prodotto AI',
    'path.build.s': 'Progettare e sviluppare un’applicazione o un prodotto AI-⁠native.',
    'form.email.label': 'Email aziendale',
    'form.email.placeholder': 'nome@azienda.it',
    'form.company.label': 'Azienda',
    'form.company.placeholder': 'Azienda',
    'form.submit': 'Parliamone',
    'form.consent.pre': 'Ho letto l’',
    'form.consent.link': 'informativa privacy',
    'form.consent.post': ' e acconsento al trattamento dei miei dati per essere ricontattato/a.',
    'form.offer.title': 'AI process review gratuita',
    'form.offer': 'Per le prime 20 aziende: analizziamo i tuoi processi e ti mostriamo dove l’AI rende di più.',
    'form.done': 'Richiesta ricevuta.',
    'msg.invalid': 'Inserisci un indirizzo email valido.',
    'msg.company': 'Inserisci il nome della tua azienda.',
    'msg.consent': 'Per continuare, conferma di aver letto l’informativa privacy.',
    'msg.personal': 'Suggerimento: con l’email aziendale possiamo prepararci meglio.',
    'msg.sending': 'Invio in corso…',
    'msg.done': 'Ti ricontattiamo entro 3 giorni lavorativi.',
    'msg.error': 'Invio non riuscito: controlla la connessione e riprova.',
    'msg.closed': 'Le richieste si aprono a brevissimo.',
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
    'meta.title': `Deploiable · ${TITLE.en}`,
    'meta.description': plain(SUB.en),
    'og.description': plain(SUB.en),
    'lang.group': 'Language',
    'nav.method': 'How we work',
    'approach.k': 'What we do',
    'approach.t': 'A product lab, two lines of product.',
    'line.1.k': '01 · For business processes',
    'line.1.t': 'AI solutions integrated into your processes.',
    'line.1.s': 'We identify the processes where AI moves costs, time or revenue, and bring the solution into production, inside your daily operations, with a model tied to results. When automation isn’t enough, we build a custom product and hand it over turnkey.',
    'line.1.tag.1': 'AI workflows',
    'line.1.tag.2': 'AI agents',
    'line.1.tag.3': 'Custom product',
    'line.1.link': 'Talk to us about a process',
    'line.2.k': '02 · Product Studio',
    'line.2.t': 'Niche products for strategic buyers.',
    'line.2.s': 'We find the niche, build the AI-\u2060native product and take it to market. Companies buy it once it works and already has customers, without starting an internal project. We sell it to companies that want to innovate, to grow or integrate their business.',
    'line.2.tag.1': 'AI-\u2060native products',
    'line.2.tag.2': 'Market launch',
    'line.2.tag.3': 'Sales to companies',
    'line.2.link': 'Talk to us about a product',
    'nav.label': 'Main navigation',
    'nav.menu': 'Menu',
    'nav.approach': 'Approach',
    'nav.contact': 'Contact',
    'claim.1': 'From business problems',
    'claim.2': 'to production AI.',
    sub: SUB.en,
    launch: LAUNCH,
    'cta.primary': 'Let’s build what’s next',
    'cta.secondary': 'Explore our approach',
    'proof.line': 'clients since 2021',
    'method.k': 'How we work',
    'method.t': 'Understand. Build. Deploy.',
    'step.1.t': 'Understand',
    'step.1.s': 'We analyse processes, users, data, systems and opportunities.',
    'step.2.t': 'Build',
    'step.2.s': 'We design and develop the right solution: workflow, agent, application or AI-⁠native product.',
    'step.3.t': 'Deploy',
    'step.3.s': 'We integrate, validate, launch, monitor and keep improving.',
    'contact.k': 'Contact',
    'contact.t': 'What do you want to change?',
    'contact.s': 'Whether you want to improve an existing process or build a new AI product, let’s find the right approach.',
    'contact.legend': 'Where should we start?',
    'path.transform': 'Transform a process',
    'path.transform.s': 'Redesign an existing process with AI and automation.',
    'path.build': 'Build an AI product',
    'path.build.s': 'Design and develop an AI-⁠native application or product.',
    'form.email.label': 'Work email',
    'form.email.placeholder': 'name@company.com',
    'form.company.label': 'Company',
    'form.company.placeholder': 'Company',
    'form.submit': 'Let’s talk',
    'form.consent.pre': 'I have read the ',
    'form.consent.link': 'privacy notice',
    'form.consent.post': ' and consent to the processing of my data in order to be contacted.',
    'form.offer.title': 'Free AI process review',
    'form.offer': 'For the first 20 companies: we analyse your processes and show you where AI pays off most.',
    'form.done': 'Request received.',
    'msg.invalid': 'Please enter a valid email address.',
    'msg.company': 'Please enter your company name.',
    'msg.consent': 'To continue, please confirm you have read the privacy notice.',
    'msg.personal': 'Tip: a work email helps us prepare.',
    'msg.sending': 'Sending…',
    'msg.done': 'We’ll get back to you within 3 working days.',
    'msg.error': 'Sending failed: check your connection and try again.',
    'msg.closed': 'Requests open very soon.',
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
