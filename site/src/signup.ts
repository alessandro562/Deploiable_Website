// Iscrizione alla lista per il lancio. Il modulo invia l'email con una POST (FormData) all'indirizzo in
// VITE_SIGNUP_ENDPOINT, impostato al momento della build: funziona così con Formspree e servizi simili, che
// rispondono in JSON a "Accept: application/json". Senza indirizzo il modulo non finge di funzionare: lo dice.
const ENDPOINT: string | undefined = import.meta.env.VITE_SIGNUP_ENDPOINT;

const MESSAGES = {
  invalid: 'Please enter a valid email address.',
  sending: 'Adding you to the list…',
  done: 'See you at launch.',
  error: 'Something went wrong. Please try again.',
  closed: 'Sign-ups open very soon.',
};

export function initSignup() {
  const outro = document.querySelector<HTMLElement>('.outro');
  const form = document.querySelector<HTMLFormElement>('.signup');
  const note = document.querySelector<HTMLElement>('.signup-note');
  if (!outro || !form || !note) return;
  const email = form.querySelector<HTMLInputElement>('input[type="email"]')!;
  const trap = form.querySelector<HTMLInputElement>('.hp')!;
  const say = (text: string) => (note.textContent = text);
  const DEFAULT_NOTE = note.textContent ?? '';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    email.value = email.value.trim();
    if (!email.checkValidity()) {
      email.setAttribute('aria-invalid', 'true');
      fail(MESSAGES.invalid);
      email.focus();
      return;
    }
    email.removeAttribute('aria-invalid');
    if (outro.dataset.state === 'error') delete outro.dataset.state;
    // un bot ha riempito il campo nascosto: lo si saluta come un iscritto, senza inviare nulla
    if (trap.value) return finish();

    const endpoint = form.dataset.endpoint || ENDPOINT;
    if (!endpoint) return say(MESSAGES.closed);

    form.setAttribute('aria-busy', 'true');
    say(MESSAGES.sending);
    try {
      const res = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      finish();
    } catch {
      fail(MESSAGES.error);
    } finally {
      form.removeAttribute('aria-busy');
    }
  });

  // Errore: bordo più spesso e una vibrazione (CSS). Ritoccando l'email si torna allo stato normale.
  function fail(text: string) {
    delete outro!.dataset.state;
    void outro!.offsetWidth; // fa ripartire la vibrazione anche al secondo errore di fila
    outro!.dataset.state = 'error';
    say(text);
  }
  email.addEventListener('input', () => {
    if (outro.dataset.state !== 'error') return;
    delete outro.dataset.state;
    email.removeAttribute('aria-invalid');
    say(DEFAULT_NOTE);
  });

  function finish() {
    outro!.dataset.state = 'done';
    outro!.querySelector('.signup-done')?.removeAttribute('aria-hidden');
    say(MESSAGES.done);
  }
}
