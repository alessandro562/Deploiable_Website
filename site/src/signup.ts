// Richiesta della AI process review: email aziendale, nome azienda, consenso privacy.
//
// Invio: Google Apps Script pubblicato come web app (vedi integrations/apps-script/README.md). L'URL arriva al
// momento della build da VITE_SIGNUP_ENDPOINT (variabile di repository SIGNUP_ENDPOINT nel workflow di deploy).
// Apps Script non permette di leggere la risposta da un altro dominio: la richiesta parte in modalità "no-cors" e
// la conferma si mostra quando l'invio non dà errori di rete. Senza URL il modulo non finge di funzionare: lo dice.
import { onLangChange, t, type Key } from './i18n';

const ENDPOINT: string | undefined = import.meta.env.VITE_SIGNUP_ENDPOINT;

/** Provider di posta personale: non bloccano l'invio, ma suggeriscono di usare l'email aziendale. */
const PERSONAL = ['gmail', 'googlemail', 'hotmail', 'libero', 'yahoo', 'outlook', 'live', 'icloud', 'me'];
export const isPersonalEmail = (email: string) => {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return PERSONAL.some((p) => domain === `${p}.com` || domain === `${p}.it` || domain.startsWith(`${p}.`));
};

export function initSignup() {
  const outro = document.querySelector<HTMLElement>('.outro');
  const form = document.querySelector<HTMLFormElement>('.signup');
  const note = document.querySelector<HTMLElement>('.signup-note');
  if (!outro || !form || !note) return;
  const email = form.querySelector<HTMLInputElement>('[name="email"]')!;
  const company = form.querySelector<HTMLInputElement>('[name="company"]')!;
  const consent = form.querySelector<HTMLInputElement>('[name="consent"]')!;
  const trap = form.querySelector<HTMLInputElement>('.hp')!;

  // la nota mostra un messaggio del dizionario: cambiando lingua si ritraduce quello corrente
  let shown: Key = 'form.offer';
  const say = (key: Key) => {
    shown = key;
    note.textContent = t(key);
  };
  onLangChange(() => say(shown));

  const setState = (state?: 'error' | 'warn' | 'done') => {
    if (state) outro.dataset.state = state;
    else delete outro.dataset.state;
  };

  // Errore: bordo più spesso e una vibrazione (CSS) sul campo da correggere, che riceve il focus.
  function fail(key: Key, field: HTMLInputElement) {
    for (const f of [email, company, consent]) f.toggleAttribute('aria-invalid', f === field);
    field.setAttribute('aria-invalid', 'true');
    setState();
    void outro!.offsetWidth; // fa ripartire la vibrazione anche al secondo errore di fila
    setState('error');
    say(key);
    field.focus();
  }

  // Avviso morbido: email personale. Non blocca nulla.
  const warnIfPersonal = () => {
    if (outro.dataset.state === 'error' || !email.checkValidity() || !email.value) return;
    if (isPersonalEmail(email.value)) {
      setState('warn');
      say('msg.personal');
    } else if (outro.dataset.state === 'warn') {
      setState();
      say('form.offer');
    }
  };
  email.addEventListener('blur', () => {
    email.value = email.value.trim();
    warnIfPersonal();
  });

  // Ritoccando un campo in errore si torna allo stato normale.
  for (const f of [email, company, consent]) {
    f.addEventListener(f === consent ? 'change' : 'input', () => {
      if (f.getAttribute('aria-invalid') !== 'true') return;
      f.removeAttribute('aria-invalid');
      setState();
      say('form.offer');
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    email.value = email.value.trim();
    company.value = company.value.trim();
    if (!email.value || !email.checkValidity()) return fail('msg.invalid', email);
    if (!company.value) return fail('msg.company', company);
    if (!consent.checked) return fail('msg.consent', consent);
    for (const f of [email, company, consent]) f.removeAttribute('aria-invalid');
    setState();

    // un bot ha riempito il campo nascosto: lo si saluta come un utente, senza inviare nulla
    if (trap.value) return finish();

    const endpoint = form.dataset.endpoint || ENDPOINT;
    if (!endpoint) return say('msg.closed');

    const body = new URLSearchParams({
      email: email.value,
      company: company.value,
      consent: 'si',
      consent_text: `${t('form.consent.pre')}${t('form.consent.link')}${t('form.consent.post')}`,
      lang: document.documentElement.lang,
      page: location.href,
    });
    form.setAttribute('aria-busy', 'true');
    say('msg.sending');
    try {
      await fetch(endpoint, { method: 'POST', mode: 'no-cors', body });
      finish();
    } catch {
      setState('error');
      say('msg.error');
    } finally {
      form.removeAttribute('aria-busy');
    }
  });

  function finish() {
    setState('done');
    outro!.querySelector('.signup-done')?.removeAttribute('aria-hidden');
    say('msg.done');
  }
}
