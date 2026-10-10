import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('nessuna violazione di accessibilità grave', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await page.waitForTimeout(2500); // le animazioni statiche finiscono entro ~2 s (senza riduzione del movimento)
  const res = await new AxeBuilder({ page }).analyze();
  const serious = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  await expect(page.locator('h1')).toHaveCount(1);
});

test('nessuna violazione grave anche in inglese e nella pagina privacy', async ({ page }) => {
  for (const url of ['/?lang=en', '/privacy.html', '/privacy.html?lang=en']) {
    await page.goto(url);
    await page.waitForTimeout(2500);
    const res = await new AxeBuilder({ page }).analyze();
    const serious = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${url} ${v.id}: ${v.nodes.length}`)).toEqual([]);
  }
});

test('tastiera: ordine di tabulazione logico e focus sempre visibile', async ({ page }, info) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await page.waitForTimeout(2500);
  const mobile = info.project.name === 'mobile';
  // logo, navigazione (su telefono il pulsante Menu), lingua, i due pulsanti dell'hero, i due link dei capitoli,
  // la scelta della strada, il modulo, il consenso con il link all'informativa, il footer
  const expected = [
    'a./',
    ...(mobile ? ['button.nav-toggle'] : ['a#cosa-facciamo', 'a#metodo', 'a#contact']),
    'lang-it',
    'lang-en',
    'a#contact',
    'a#cosa-facciamo',
    'a#contact',
    'a#contact',
    'input-interest',
    'signup-email',
    'signup-company',
    'button',
    'signup-consent',
    'aprivacy.html',
    'aprivacy.html',
  ];
  const seen: string[] = [];
  for (let i = 0; i < expected.length; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(250); // il contorno del modulo compare con una transizione di 0,16 s
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const id = el.dataset.lang
        ? `lang-${el.dataset.lang}`
        : el.id || (tag === 'a' ? `a${el.getAttribute('href')}` : tag === 'input' ? `input-${(el as HTMLInputElement).name}` : tag + (el.classList[0] ? `.${el.classList[0]}` : ''));
      // focus visibile: un contorno sull'elemento, sulla capsula del modulo, sulla casella del consenso o sulla
      // scheda della strada
      const ring = (e: Element | null) => !!e && getComputedStyle(e).outlineStyle !== 'none' && parseFloat(getComputedStyle(e).outlineWidth) >= 2 && getComputedStyle(e).outlineColor !== 'rgba(0, 0, 0, 0)';
      const visible = ring(el) || ring(el.closest('.signup-field')) || ring(el.parentElement?.querySelector('.consent-box') ?? null) || ring(el.closest('.path')?.querySelector('.path-box') ?? null);
      return { id, visible };
    });
    seen.push(info.id);
    expect(info.visible, `focus non visibile su ${info.id}`).toBe(true);
  }
  expect(seen).toEqual(expected);
});

test('movimento ridotto: niente 3D, niente animazioni in loop', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  expect(await page.evaluate(() => window.__DEPLOIABLE__!.mode)).toBe('static');
  expect(await page.locator('.soon-dot').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});

test('movimento ridotto: i loghi dei clienti restano fermi, in una sola fila', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  expect(await page.locator('.clients-track').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await expect(page.locator('.clients-track[aria-hidden="true"]')).toBeHidden();
});

test('telefono: ogni comando ha un’area di tocco di almeno 44 px in altezza e in larghezza', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'solo telefono');
  await page.goto('/');
  await page.waitForFunction(() => window.__DEPLOIABLE__?.ready === true);
  await page.waitForTimeout(2500);
  // i link dentro una frase (consenso) hanno la riga come area: restano fuori, come vuole WCAG 2.5.8
  const sel = ['.logo-slot', '.nav-toggle', '.lang button', '.hero-ctas .btn', '.line-link', '.path', '#signup-email', '#signup-company', '.signup button[type=submit]', '.foot-link'];
  for (const s of sel) {
    for (const el of await page.locator(s).all()) {
      await el.scrollIntoViewIfNeeded();
      const hit = await el.evaluate((e) => {
        const r = e.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const inside = (x: number, y: number) => {
          const t = document.elementFromPoint(x, y);
          return !!t && (t === e || e.contains(t) || t.contains(e) && t.closest('label, a, button') === e);
        };
        return { w: r.width, up: inside(cx, cy - 21.5), down: inside(cx, cy + 21.5) };
      });
      expect(hit.w, `${s}: larghezza`).toBeGreaterThanOrEqual(44);
      expect(hit.up && hit.down, `${s}: 44 px in altezza`).toBe(true);
    }
  }
});

test('tipografia: ogni testo piccolo usa una misura della scala (12, 13, 14, 16, 17 px)', async ({ page }) => {
  for (const path of ['/', '/privacy.html']) {
    await page.goto(path);
    await page.waitForTimeout(2500);
    const off = await page.evaluate(() => {
      const scale = [12, 13, 14, 16, 17];
      // titoli e frasi grandi hanno misure fluide (clamp) e stanno fuori da questo controllo
      const big =
        '.claim, .claim *, .sub, h2, h3, .line-title, .sec-lead, .contact-lead, .path-title, .nav-open .nav-list, .doc-body h1, .doc-lead, .doc-body h2';
      const out: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>('body *')) {
        if (el.closest(big) || el.closest('script, style, svg, noscript')) continue;
        const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim());
        if (!own) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (!scale.includes(fs)) out.push(`${el.tagName.toLowerCase()}.${el.className} ${fs}px`);
      }
      return out;
    });
    expect(off, `${path}: testi fuori scala`).toEqual([]);
  }
});
