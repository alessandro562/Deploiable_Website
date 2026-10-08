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
  it: 'Ripensiamo i processi aziendali e sviluppiamo prodotti AI-⁠native su misura. Dall’analisi alla messa in produzione, integrati nei sistemi che la tua azienda usa già.',
  en: 'We redesign existing operations and build custom AI-⁠native products. From discovery to deployment, integrated into the way your business works.',
};

// il "word joiner" (U+2060) tiene unito "AI-native" a capo; nei meta non serve
const plain = (t: string) => t.replace(/\u2060/g, '');

const DICT = {
  it: {
    'meta.title': `Deploiable · ${TITLE.it}`,
    'meta.description': plain(SUB.it),
    'og.description': plain(SUB.it),
    'lang.group': 'Lingua',
    'nav.label': 'Navigazione principale',
    'nav.menu': 'Menu',
    'nav.approach': 'Approccio',
    'nav.build': 'Cosa realizziamo',
    'nav.cases': 'Esempi',
    'nav.contact': 'Contatti',
    'claim.1': 'Dai problemi di business',
    'claim.2': 'all’AI in produzione.',
    sub: SUB.it,
    launch: LAUNCH,
    'cta.primary': 'Costruiamo ciò che serve',
    'cta.secondary': 'Scopri il nostro approccio',
    'proof.line': 'clienti dal 2021',
    'n0.k': 'Il nostro approccio',
    'n0.t': 'Tutto parte da un problema di business.',
    'n0.s': 'Non partiamo da uno strumento AI. Partiamo da come lavorano le persone, i dati e i sistemi della tua azienda, e da ciò che serve davvero.',
    'n1.k': 'Due strade',
    'n1.t': 'Due modi per creare valore.',
    'n1.s': 'A volte la risposta è trasformare il modo in cui lavori oggi. A volte è costruire un prodotto che ancora non esiste. Ti aiutiamo a capire quale strada serve.',
    'n2.t': 'Trasformiamo i processi esistenti.',
    'n2.s': 'Individuiamo i processi inefficienti, li riprogettiamo con AI e automazione e li integriamo nei sistemi che la tua azienda utilizza già.',
    'n2.link': 'Parliamo di un tuo processo',
    'n3.t': 'Costruiamo ciò che ancora non esiste.',
    'n3.s': 'Quando i software esistenti non bastano, progettiamo e sviluppiamo applicazioni AI-⁠native, strumenti interni e piattaforme su misura per i bisogni, i dati e le persone della tua azienda.',
    'n3.link': 'Parliamo di un tuo prodotto',
    'n4.k': 'In produzione',
    'n4.t': 'Sfide diverse. Un unico risultato.',
    'n4.big': 'AI pronta per il mondo reale.',
    'n4.s': 'Non solo prototipi. Progettiamo soluzioni AI per operare con utenti reali, dati aziendali e infrastrutture esistenti.',
    'n5.k': 'Integrazione',
    'n5.t': 'Integrata nel modo in cui la tua azienda lavora.',
    'n5.s': 'L’AI non richiede sempre un nuovo strumento. Integriamo le soluzioni nei software che i tuoi team usano già, oppure sviluppiamo un’applicazione dedicata quando il problema lo richiede.',
    'build.k': 'Cosa realizziamo',
    'build.t': 'Cosa realizziamo, concretamente.',
    'build.s': 'Dalla singola automazione al prodotto completo: scegliamo la forma giusta per il problema, poi la costruiamo e la mettiamo in produzione.',
    'cap.1.t': 'AI Workflow',
    'cap.1.s': 'Automatizzano attività operative ripetitive e coordinano i sistemi esistenti.',
    'cap.2.t': 'Agenti AI',
    'cap.2.s': 'Sistemi che svolgono compiti definiti usando dati, strumenti e decisioni controllate.',
    'cap.3.t': 'Strumenti AI interni',
    'cap.3.s': 'Applicazioni costruite su misura per supportare i team aziendali.',
    'cap.4.t': 'Prodotti AI-⁠native',
    'cap.4.s': 'Prodotti software su misura, con l’AI al centro delle loro funzionalità.',
    'cap.5.t': 'Interfacce AI',
    'cap.5.s': 'Copilot, add-in e interfacce dedicate, collegati ai software che già usi.',
    'cap.6.t': 'Sistemi AI e integrazioni',
    'cap.6.s': 'Il software, le connessioni ai dati e i componenti operativi che servono a far funzionare le soluzioni AI.',
    'method.k': 'Come lavoriamo',
    'method.t': 'Comprendiamo. Costruiamo. Mettiamo in produzione.',
    'step.1.t': 'Comprendiamo',
    'step.1.s': 'Analizziamo processi, utenti, dati, sistemi e opportunità.',
    'step.2.t': 'Costruiamo',
    'step.2.s': 'Progettiamo e sviluppiamo la soluzione più adatta: workflow, agente, applicazione o prodotto AI-⁠native.',
    'step.3.t': 'Mettiamo in produzione',
    'step.3.s': 'Integriamo, testiamo, rilasciamo, monitoriamo e miglioriamo nel tempo.',
    'cases.k': 'Esempi',
    'cases.t': 'Dall’opportunità a un sistema che funziona.',
    'cases.note': 'Scenari di esempio, non casi cliente.',
    'cases.example': 'Esempio',
    'case.1.t': 'Reporting direzionale',
    'case.1.s': 'Colleghiamo i dati aziendali, calcoliamo i KPI, generiamo l’analisi e prepariamo le presentazioni per il management.',
    'case.1.f': 'ERP + CRM + dati finance → analisi → presentazione',
    'case.2.t': 'Pianificazione intelligente dei turni',
    'case.2.s': 'Combiniamo regole operative, disponibilità del personale ed esigenze di business per proporre turni ottimizzati, che il manager approva.',
    'case.2.f': 'persone + vincoli + disponibilità → sistema AI → approvazione del manager',
    'case.3.t': 'Applicazione AI su misura',
    'case.3.s': 'Trasformiamo un bisogno specifico in un’applicazione AI-⁠native, con logica, interfaccia e integrazioni dedicate, fino alla messa in produzione.',
    'case.3.f': 'bisogno di business → design del prodotto → applicazione AI → messa in produzione',
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
    'nav.label': 'Main navigation',
    'nav.menu': 'Menu',
    'nav.approach': 'Approach',
    'nav.build': 'What we build',
    'nav.cases': 'Use cases',
    'nav.contact': 'Contact',
    'claim.1': 'From business problems',
    'claim.2': 'to production AI.',
    sub: SUB.en,
    launch: LAUNCH,
    'cta.primary': 'Let’s build what’s next',
    'cta.secondary': 'Explore our approach',
    'proof.line': 'clients since 2021',
    'n0.k': 'Our approach',
    'n0.t': 'It all starts with a business problem.',
    'n0.s': 'We don’t start from an AI tool. We start from how your people, data and systems actually work, and from what is really needed.',
    'n1.k': 'Two paths',
    'n1.t': 'Two ways to create value.',
    'n1.s': 'Sometimes the answer is to transform how you work today. Sometimes it is to build a product that doesn’t exist yet. We help you work out which one you need.',
    'n2.t': 'Transform existing operations.',
    'n2.s': 'We identify inefficient workflows, redesign them around AI and automation, and integrate them into the systems your company already uses.',
    'n2.link': 'Talk to us about a process',
    'n3.t': 'Build what doesn’t exist yet.',
    'n3.s': 'When existing software isn’t enough, we design and build custom AI-⁠native applications, internal tools and platforms around your business needs, data and users.',
    'n3.link': 'Talk to us about a product',
    'n4.k': 'In production',
    'n4.t': 'Different challenges. One destination.',
    'n4.big': 'Production AI.',
    'n4.s': 'Not just prototypes. We engineer AI solutions to work with real users, business data and existing infrastructure.',
    'n5.k': 'Integration',
    'n5.t': 'Built into the way your company works.',
    'n5.s': 'AI doesn’t always need another interface. We integrate our solutions into the tools your teams already use, or build a dedicated application when the problem calls for one.',
    'build.k': 'Capabilities',
    'build.t': 'What we actually build.',
    'build.s': 'From a single workflow to a complete product: we choose the form that fits the problem, then build it and put it into production.',
    'cap.1.t': 'AI Workflows',
    'cap.1.s': 'Automate repetitive operational activities and coordinate existing systems.',
    'cap.2.t': 'AI Agents',
    'cap.2.s': 'Systems that execute defined tasks using data, tools and controlled decision-making.',
    'cap.3.t': 'Internal AI Tools',
    'cap.3.s': 'Purpose-built applications that support business teams.',
    'cap.4.t': 'AI-⁠native Products',
    'cap.4.s': 'Custom software products with AI integrated into their core functionality.',
    'cap.5.t': 'AI Interfaces',
    'cap.5.s': 'Copilots, add-ins and dedicated interfaces connected to the software you already use.',
    'cap.6.t': 'AI Systems & Integrations',
    'cap.6.s': 'The underlying software, data connections and operational components required to make AI solutions work.',
    'method.k': 'How we work',
    'method.t': 'Understand. Build. Deploy.',
    'step.1.t': 'Understand',
    'step.1.s': 'We analyse processes, users, data, systems and opportunities.',
    'step.2.t': 'Build',
    'step.2.s': 'We design and develop the right solution: workflow, agent, application or AI-⁠native product.',
    'step.3.t': 'Deploy',
    'step.3.s': 'We integrate, validate, launch, monitor and keep improving.',
    'cases.k': 'Use cases',
    'cases.t': 'From opportunity to working system.',
    'cases.note': 'Illustrative scenarios, not client case studies.',
    'cases.example': 'Example',
    'case.1.t': 'Management reporting',
    'case.1.s': 'Connect company data, calculate KPIs, generate analysis and produce management presentations.',
    'case.1.f': 'ERP + CRM + finance data → analysis → presentation',
    'case.2.t': 'Intelligent workforce planning',
    'case.2.s': 'Combine operational rules, personnel availability and business requirements to propose optimised schedules for a manager to approve.',
    'case.2.f': 'people + constraints + availability → AI system → manager approval',
    'case.3.t': 'Custom AI application',
    'case.3.s': 'Translate a specific business need into an AI-⁠native application with dedicated logic, interface and integrations, all the way to production.',
    'case.3.f': 'business need → product design → AI application → deployment',
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
