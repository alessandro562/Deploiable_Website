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
