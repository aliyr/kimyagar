import type { Locator, Page } from '@playwright/test';

async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`No bounding box for ${locator}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export async function pause(page: Page, ms = 40): Promise<void> {
  await page.waitForTimeout(ms);
}

/** درگ دستی بین مرکز دو عنصر، با گام‌های کوچک. */
export async function dragCenterToCenter(
  page: Page,
  source: Locator,
  target: Locator,
): Promise<void> {
  const from = await centerOf(source);
  const to = await centerOf(target);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await pause(page, 30);
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    await pause(page, 18);
  }
  await page.mouse.up();
  await pause(page, 80);
}

/** حرکت دایره‌ای کوچک حول مرکز عنصر؛ mouse down از قبل یا همین‌جا. */
export async function circularMoves(
  page: Page,
  locator: Locator,
  moves: number,
  radius = 16,
): Promise<void> {
  const c = await centerOf(locator);
  await page.mouse.move(c.x + radius, c.y);
  await page.mouse.down();
  await pause(page, 30);
  for (let i = 1; i <= moves; i++) {
    const a = (i / moves) * Math.PI * 2 * Math.max(1, moves / 16);
    await page.mouse.move(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius);
    await pause(page, 20);
  }
  await page.mouse.up();
  await pause(page, 60);
}

/**
 * درگ شیشه از قفسه‌ی دیواری به هاون: اول کشیدن عمودی به پایین (تا ژست قفسه
 * آن را Drag تشخیص دهد نه اسکرول افقی)، بعد حرکت به مرکز هاون.
 */
export async function dragJarToMortar(page: Page, jar: Locator, mortar: Locator): Promise<void> {
  const jarBox = await jar.boundingBox();
  const mortarBox = await mortar.boundingBox();
  if (!jarBox || !mortarBox) throw new Error('jar/mortar bounding box missing');
  const from = { x: jarBox.x + jarBox.width / 2, y: jarBox.y + jarBox.height / 2 };
  const mid = { x: from.x, y: from.y + 70 };
  const to = { x: mortarBox.x + mortarBox.width / 2, y: mortarBox.y + mortarBox.height / 2 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await pause(page, 30);
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(from.x, from.y + (mid.y - from.y) * (i / 6));
    await pause(page, 18);
  }
  const steps = 18;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(mid.x + (to.x - mid.x) * t, mid.y + (to.y - mid.y) * t);
    await pause(page, 18);
  }
  await page.mouse.up();
  await pause(page, 80);
}

/** کشیدن افقی با اشاره‌گر — برای اسکرول قفسه‌ی دیواری. */
export async function dragHorizontally(
  page: Page,
  from: { x: number; y: number },
  dx: number,
  steps = 20,
): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await pause(page, 30);
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + (dx * i) / steps, from.y);
    await pause(page, 18);
  }
  await page.mouse.up();
  await pause(page, 80);
}

/** دو دور کامل حول مرکز (هم‌زدن). */
export async function twoCircles(page: Page, locator: Locator, radius = 22): Promise<void> {
  const c = await centerOf(locator);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await pause(page, 30);
  const steps = 48;
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 4;
    await page.mouse.move(c.x + Math.cos(a) * radius, c.y + Math.sin(a) * radius);
    await pause(page, 18);
  }
  await page.mouse.up();
  await pause(page, 60);
}
