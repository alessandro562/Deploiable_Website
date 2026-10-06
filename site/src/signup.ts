// Iscrizione alla lista per il lancio. Il modulo invia l'email con una POST (FormData) all'indirizzo in
// VITE_SIGNUP_ENDPOINT, impostato al momento della build: funziona così con Formspree e servizi simili, che
// rispondono in JSON a "Accept: application/json". Senza indirizzo il modulo non finge di funzionare: lo dice.
const ENDPOINT: string | undefined = import.meta.env.VITE_SIGNUP_ENDPOINT;

import { onLangChange, t, type Key } from './i18n';

export function initSignup() {
  const outro = document.querySelector<HTMLElement>('.outro');
  const form = document.querySelector<HTMLFormElement>('.signup');
  const note = document.querySelector<HTMLElement>('.signup-note');
  if (!outro || !form || !note) return;
  const email = form.querySelector<HTMLInputElement>('input[type="email"]')!;
  const trap = form.querySelector<HTMLInputElement>('.hp')!;
  // la nota mostra un messaggio del dizionario: cambiando lingua si ritraduce quello corrente
  let shown: Key = 'form.offer';
  const say = (key: Key) => {
    shown = key;
    note.textContent = t(key);
  };
  onLangChange(() => say(shown));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    email.value = email.value.trim();
    if (!email.checkValidity()) {
      email.setAttribute('aria-invalid', 'true');
      fail('msg.invalid');
      email.focus();
      return;
    }
    email.removeAttribute('aria-invalid');
    if (outro.dataset.state === 'error') delete outro.dataset.state;
    // un bot ha riempito il campo nascosto: lo si saluta come un iscritto, senza inviare nulla
    if (trap.value) return finish();

    const endpoint = form.dataset.endpoint || ENDPOINT;
    if (!endpoint) return say('msg.closed');

    form.setAttribute('aria-busy', 'true');
    say('msg.sending');
    try {
      const res = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      finish();
    } catch {
      fail('msg.error');
    } finally {
      form.removeAttribute('aria-busy');
    }
  });

  // Errore: bordo più spesso e una vibrazione (CSS). Ritoccando l'email si torna allo stato normale.
  function fail(key: Key) {
    delete outro!.dataset.state;
    void outro!.offsetWidth; // fa ripartire la vibrazione anche al secondo errore di fila
    outro!.dataset.state = 'error';
    say(key);
  }
  email.addEventListener('input', () => {
    if (outro.dataset.state !== 'error') return;
    delete outro.dataset.state;
    email.removeAttribute('aria-invalid');
    say('form.offer');
  });

  function finish() {
    outro!.dataset.state = 'done';
    outro!.querySelector('.signup-done')?.removeAttribute('aria-hidden');
    say('msg.done');
  }
}
