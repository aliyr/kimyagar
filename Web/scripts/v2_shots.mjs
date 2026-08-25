/**
 * اسکرین‌شات‌های بررسی بصری صحنه‌ی v2 (flat/pixel) و روت کلاسیک + گزارش خطاهای کنسول.
 * Usage: node scripts/v2_shots.mjs   (dev server باید روی 5173 بالا باشد)
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
page.on('requestfailed', (req) => consoleErrors.push(`requestfailed: ${req.url()}`));
page.on('response', (res) => {
  if (res.status() >= 400) consoleErrors.push(`HTTP ${res.status()}: ${res.url()}`);
});

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot ${name}`);
}

// ۱) v2 فلت — صحنه‌ی خالی
await page.goto(`${BASE}/#/v2`);
await page.getByTestId('v2-scene').waitFor({ timeout: 20000 });
await page.waitForTimeout(1600);
await shot('v2_flat_empty');

// ۲) ۳ واحد بابونه در هاون (store-driven تا وضعیت دقیق باشد)
await page.evaluate(() => {
  const s = window.__kimyagarStore.getState();
  s.addUnitToMortar('chamomile');
  s.addUnitToMortar('chamomile');
  s.addUnitToMortar('chamomile');
});
await page.waitForTimeout(600);
await shot('v2_flat_mortar3_raw');

// ۳) کوبیده + ریختن در پاتیل و حرارت
await page.evaluate(() => {
  window.__kimyagarStore.getState().applyGrindWork(4);
});
await page.waitForTimeout(400);
await shot('v2_flat_mortar3_ground');
await page.evaluate(() => {
  const s = window.__kimyagarStore.getState();
  s.addMortarToCauldron();
  if (s.setHeat) s.setHeat('high');
});
await page.waitForTimeout(900);
await shot('v2_flat_brewing');

// ۴) v2 پیکسل
await page.goto(`${BASE}/#/v2/pixel`);
await page.getByTestId('v2-scene').waitFor({ timeout: 20000 });
await page.waitForTimeout(1600);
await shot('v2_pixel_empty');
await page.evaluate(() => {
  const s = window.__kimyagarStore.getState();
  s.addUnitToMortar('saffron');
  s.addUnitToMortar('saffron');
});
await page.waitForTimeout(600);
await shot('v2_pixel_mortar2_raw');

// ۵) روت کلاسیک سالم مانده
await page.goto(`${BASE}/#/classic`);
await page.waitForTimeout(1800);
await shot('classic');

console.log(consoleErrors.length ? `CONSOLE ERRORS:\n${consoleErrors.join('\n')}` : 'no console errors');
await browser.close();
