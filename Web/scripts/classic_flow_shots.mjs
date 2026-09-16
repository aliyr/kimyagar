/**
 * اسکرین‌شات‌های فلو کلیکی کلاسیک (روت /) + گزارش خطاهای کنسول.
 * Usage: node scripts/classic_flow_shots.mjs   (dev server باید روی 5173 بالا باشد)
 * خروجی: screenshots/classic-flow/
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const OUT = 'screenshots/classic-flow';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
page.on('response', (res) => {
  if (res.status() >= 400) consoleErrors.push(`HTTP ${res.status()}: ${res.url()}`);
});

let n = 0;
async function shot(name) {
  n += 1;
  const file = `${OUT}/${String(n).padStart(2, '0')}_${name}.png`;
  await page.screenshot({ path: file });
  console.log(`shot ${file}`);
}

const tid = (id) => page.getByTestId(id);

// ۱) کارگاه خالی — میز با کوره، قفسه، دفترچه‌ی پایین‌راست
await page.goto(`${BASE}/`);
await tid('stage').waitFor({ timeout: 20000 });
await page.waitForTimeout(1800);
await shot('workshop');

// ۲) Tap شیشه ⇒ پرواز ماده (لحظه‌ی میانی)
await tid('jar-chamomile').click();
await page.waitForTimeout(260);
await shot('jar_tap_flight');
await tid('ingredient-flight').waitFor({ state: 'hidden', timeout: 5000 });

// ۳) کوبش خودکار: گرد و خاک، جرقه، حلقه‌ی برنجی
await tid('jar-chamomile').click();
await tid('ingredient-flight').waitFor({ state: 'hidden', timeout: 5000 });
await page.waitForTimeout(900);
await shot('auto_grind_ring');

// ۴) نرم شده (پس از ۷ ثانیه) — منتظر Tap
await page.waitForTimeout(6200);
await shot('ground_fine_waiting');

// ۵) Tap هاون ⇒ قاشق سر بزی در راه
await tid('mortar').click();
await page.waitForTimeout(700);
await shot('spoon_transfer');
await tid('spoon-transfer').waitFor({ state: 'hidden', timeout: 8000 });

// ۶) پخت با آتش تند — مایع کیت فلت داخل دهانه‌ی PNG، آتش کوره
await tid('heat-high').click();
await page.waitForTimeout(1600);
await shot('brewing_high_heat');

// ۷) ماده‌ی دوم (خشخاش، آهسته‌تر فرو می‌رود؛ در دید اولیه‌ی قفسه است — قفسه clip است و
//    Playwright نمی‌تواند شیشه‌های بیرون از دید را اسکرول کند) + هم‌زدن خودکار
await tid('jar-poppy').click();
await tid('ingredient-flight').waitFor({ state: 'hidden', timeout: 5000 });
await page.waitForTimeout(2600);
await tid('mortar').click();
await tid('spoon-transfer').waitFor({ state: 'hidden', timeout: 8000 });
await page.waitForTimeout(2500);
await shot('two_ingredients_sinking');

// ۸) Tap دیگ ⇒ کج‌شدن و جریان در شیشه
await tid('cauldron').click();
await page.waitForTimeout(950);
await shot('pour_stream');

// ۹) شیشه تا مشتری
await page.waitForTimeout(1200);
await shot('deliver_slide');

// ۱۰) واکنش مشتری + نتیجه
await tid('overlay-result').waitFor({ timeout: 20000 });
await page.waitForTimeout(400);
await shot('customer_reaction');
await tid('customer-reaction').waitFor({ timeout: 20000 });
await page.waitForTimeout(300);
await shot('result');

// ۱۱) مشتری بعدی (ظاهر جدید)
await tid('action-next-customer').click();
await page.waitForTimeout(1600);
await shot('next_customer');

console.log(consoleErrors.length ? `CONSOLE ERRORS:\n${consoleErrors.join('\n')}` : 'no console errors');
await browser.close();
