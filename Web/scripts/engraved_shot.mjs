/**
 * اسکرین‌شات سریع صحنه‌ی v2 با سبک حکاکی — برای بازبینی بصری.
 * Usage: node scripts/engraved_shot.mjs   (dev server باید روی 5173 بالا باشد)
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
mkdirSync('screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });

await page.goto(`${BASE}/#/v2/engraved`);
await page.getByTestId('v2-scene').waitFor({ timeout: 20000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: 'screenshots/v2_engraved_empty.png' });
console.log('shot v2_engraved_empty');

// هاون پر + آسیاب‌شده تا لایه‌های mortar دیده شوند
await page.evaluate(() => {
  const s = window.__kimyagarStore.getState();
  s.addUnitToMortar('chamomile');
  s.addUnitToMortar('chamomile');
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/v2_engraved_mortar.png' });
console.log('shot v2_engraved_mortar');

if (errors.length) {
  console.log('errors:');
  for (const e of errors) console.log(' -', e);
}
await browser.close();
