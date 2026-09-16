import { expect, test, type Locator, type Page } from '@playwright/test';
import { dragHorizontally, pause, twoCircles } from './gestures';

type KimyagarStore = {
  getState: () => {
    mortar: { quantity: number; ingredientId: string; grindState: string | null; grinding: boolean } | null;
    brew: { entries: unknown[]; bottled: boolean };
  };
};

async function storeState(page: Page) {
  return page.evaluate(() => {
    const store = (window as unknown as { __kimyagarStore?: KimyagarStore }).__kimyagarStore;
    if (!store) throw new Error('window.__kimyagarStore is missing');
    const s = store.getState();
    return { mortar: s.mortar, entries: s.brew.entries.length, bottled: s.brew.bottled };
  });
}

/** Tap شیشه ⇒ پرواز ماده تا هاون ⇒ فرود (پایان پرواز). */
async function tapJarAndLand(page: Page, jar: Locator): Promise<void> {
  await jar.click();
  const flight = page.getByTestId('ingredient-flight');
  await expect(flight).toBeVisible({ timeout: 3_000 });
  await expect(flight).toBeHidden({ timeout: 5_000 });
  await pause(page, 60);
}

test.describe('Kimyagar brew loop (classic, click flow)', () => {
  test.beforeEach(async ({ page }) => {
    // روت خالی حالا کارگاه کلاسیک است
    await page.goto('/');
    await expect(page.getByTestId('stage')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('furnace')).toBeVisible();
  });

  test('happy path: tap jar → auto-grind → tap mortar (spoon) → heat → stir → tap cauldron → deliver → next customer', async ({
    page,
  }) => {
    const jar = page.getByTestId('jar-chamomile');
    const mortar = page.getByTestId('mortar');
    await expect(page.getByTestId('shelf')).toBeVisible();
    await expect(jar).toBeVisible();
    await pause(page, 120);

    // دو Tap روی شیشه ⇒ دو واحد در هاون؛ کوبش خودکار شروع می‌شود
    await tapJarAndLand(page, jar);
    await expect(mortar).toHaveAttribute('data-mortar-units', '1');
    await expect(mortar).toHaveAttribute('data-grinding', 'true');
    await expect(page.getByTestId('grind-ring')).toBeVisible();

    await tapJarAndLand(page, jar);
    await expect(mortar).toHaveAttribute('data-mortar-units', '2');
    await expect(page.getByTestId('mortar-contents-raw')).toBeVisible();

    // انتظار تا درجه‌ی «درشت» (~۱٫۹ث) — سپس Tap هاون ⇒ قاشق سر بزی تا دیگ
    const contents = page.getByTestId('mortar-contents');
    await expect(contents).toBeVisible({ timeout: 8_000 });
    await mortar.click();

    const spoon = page.getByTestId('spoon-transfer');
    await expect(spoon).toBeVisible({ timeout: 3_000 });
    await expect(spoon).toBeHidden({ timeout: 8_000 });
    await expect(mortar).toHaveAttribute('data-mortar-units', '0');
    expect((await storeState(page)).entries).toBe(1);

    // حرارت تند از اهرم؛ Tap کوره درجه را می‌چرخاند
    const heatHigh = page.getByTestId('heat-high');
    await heatHigh.click();
    await expect(heatHigh).toHaveAttribute('data-active');
    await page.getByTestId('furnace').click();
    await expect(page.getByTestId('heat-low')).toHaveAttribute('data-active');
    await heatHigh.click();
    await expect(heatHigh).toHaveAttribute('data-active');

    // هم‌زدن دستی
    const cauldron = page.getByTestId('cauldron');
    await twoCircles(page, cauldron, 22);
    await pause(page, 150);

    // Tap دیگ ⇒ توالی ریختن: کج‌شدن، جریان، سُرخوردن تا مشتری
    await cauldron.click();
    const pouring = page.getByTestId('pouring');
    await expect(pouring).toBeVisible({ timeout: 3_000 });
    await expect(pouring).toHaveAttribute('data-phase', 'stream', { timeout: 3_000 });
    await expect(pouring).toHaveAttribute('data-phase', 'deliver', { timeout: 4_000 });

    const emotion = page.getByTestId('customer-emotion');
    await expect(emotion).toHaveAttribute('data-emotion', /^(happy|sad)$/, { timeout: 20_000 });

    const result = page.getByTestId('overlay-result');
    await expect(result).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('customer-reaction')).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('action-next-customer').click();
    await expect(result).toBeHidden();
  });

  test('mortar unit cap stays at 3 after a fourth jar tap', async ({ page }) => {
    const jar = page.getByTestId('jar-chamomile');
    const mortar = page.getByTestId('mortar');
    await expect(jar).toBeVisible();
    await expect(mortar).toBeVisible();

    for (let i = 0; i < 3; i++) await tapJarAndLand(page, jar);
    await expect(mortar).toHaveAttribute('data-mortar-units', '3');

    // چهارمین Tap: پروازی نیست، هاون «جا ندارد» می‌لرزد
    await jar.click();
    await pause(page, 400);
    await expect(page.getByTestId('ingredient-flight')).toHaveCount(0);
    await expect(mortar).toHaveAttribute('data-mortar-units', '3');
    expect((await storeState(page)).mortar?.quantity).toBe(3);
  });

  test('early mortar tap clamps grind to coarse and still transfers', async ({ page }) => {
    const jar = page.getByTestId('jar-mint');
    const mortar = page.getByTestId('mortar');
    await tapJarAndLand(page, jar);
    await expect(mortar).toHaveAttribute('data-mortar-units', '1');

    // Tap فوری (قبل از ۱٫۹ث) ⇒ درشت
    await mortar.click();
    await expect(page.getByTestId('spoon-transfer')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByTestId('spoon-transfer')).toBeHidden({ timeout: 8_000 });
    expect((await storeState(page)).entries).toBe(1);
  });

  test('shelf scrolls horizontally by pointer drag', async ({ page }) => {
    const shelf = page.getByTestId('shelf');
    await expect(shelf).toBeVisible();

    const jars = page.locator('[data-testid^="jar-"]');
    await expect(jars.first()).toBeVisible();
    const count = await jars.count();
    expect(count).toBeGreaterThan(0);

    const before: Array<{ x: number; y: number } | null> = [];
    for (let i = 0; i < count; i++) {
      const box = await jars.nth(i).boundingBox();
      before.push(box ? { x: box.x, y: box.y } : null);
    }

    const shelfBox = await shelf.boundingBox();
    if (!shelfBox) throw new Error('shelf bounding box missing');
    // نوار قفسه در شروع کاملاً سمت راست است (RTL)؛ کشیدن به راست
    // شیشه‌های پنهانِ سمت چپ را می‌آورد.
    await dragHorizontally(
      page,
      { x: shelfBox.x + shelfBox.width * 0.42, y: shelfBox.y + shelfBox.height * 0.82 },
      shelfBox.width * 0.42,
    );

    let moved = 0;
    for (let i = 0; i < count; i++) {
      const box = await jars.nth(i).boundingBox();
      const prev = before[i];
      if (!box || !prev) continue;
      if (Math.abs(box.x - prev.x) > 8) moved += 1;
    }
    expect(moved).toBeGreaterThan(0);
  });

  test('goal-note opens overlay-customer_request and closes', async ({ page }) => {
    await page.getByTestId('goal-note').click();
    await expect(page.getByTestId('overlay-customer_request')).toBeVisible();
    await page.getByTestId('overlay-close').click();
    await expect(page.getByTestId('overlay-customer_request')).toBeHidden();
  });

  test('notebook sits bottom-right and opens overlay-notebook', async ({ page }) => {
    const notebook = page.getByTestId('notebook-button');
    const stage = page.getByTestId('stage');
    const nb = await notebook.boundingBox();
    const st = await stage.boundingBox();
    if (!nb || !st) throw new Error('bounding box missing');
    expect(nb.x + nb.width / 2).toBeGreaterThan(st.x + st.width * 0.85);
    expect(nb.y + nb.height / 2).toBeGreaterThan(st.y + st.height * 0.8);
    await notebook.click();
    await expect(page.getByTestId('overlay-notebook')).toBeVisible();
    await page.getByTestId('overlay-close').click();
  });

  test('settings overlay: sound and haptics toggles persist in localStorage', async ({ page }) => {
    await page.getByTestId('settings-button').click();
    await expect(page.getByTestId('overlay-settings')).toBeVisible();

    const sound = page.getByTestId('settings-sound');
    const haptics = page.getByTestId('settings-haptics');
    await expect(sound).toHaveAttribute('aria-checked', 'true');
    await expect(haptics).toHaveAttribute('aria-checked', 'true');

    await sound.click();
    await haptics.click();
    await expect(sound).toHaveAttribute('aria-checked', 'false');
    await expect(haptics).toHaveAttribute('aria-checked', 'false');
    expect(await page.evaluate(() => localStorage.getItem('kimiagar.sfx'))).toBe('0');
    expect(await page.evaluate(() => localStorage.getItem('kimiagar.haptics'))).toBe('0');

    await page.getByTestId('overlay-close').click();
    await expect(page.getByTestId('overlay-settings')).toHaveCount(0);

    await page.reload();
    await page.getByTestId('settings-button').click();
    await expect(page.getByTestId('settings-sound')).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByTestId('settings-haptics')).toHaveAttribute('aria-checked', 'false');
  });

  test('failed brew: shelf bottle is taken during pour, bucket glows for retry after closing result', async ({
    page,
  }) => {
    // زعفران برای «آرامش» کافی نیست ⇒ نتیجه‌ی ناموفق/ناقص
    const mortar = page.getByTestId('mortar');
    await tapJarAndLand(page, page.getByTestId('jar-saffron'));
    await expect(page.getByTestId('mortar-contents')).toBeVisible({ timeout: 8_000 });
    await mortar.click();
    await expect(page.getByTestId('spoon-transfer')).toBeHidden({ timeout: 8_000 });

    const bucket = page.getByTestId('reset-button');
    await expect(bucket).not.toHaveAttribute('data-retry');

    const shelfBottle = page.getByTestId('shelf-bottle');
    await expect(shelfBottle).toBeVisible();
    await page.getByTestId('cauldron').click();
    const pouring = page.getByTestId('pouring');
    await expect(pouring).toBeVisible({ timeout: 3_000 });
    // همان شیشه‌ی روی میز برداشته می‌شود — شیشه‌ای از هوا نمی‌آید
    await expect(shelfBottle).toHaveClass(/is-taken/);

    const result = page.getByTestId('overlay-result');
    await expect(result).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('customer-reaction')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('overlay-close').click();
    await expect(result).toBeHidden();

    // شیشه‌ی تازه دوباره روی میز؛ سطل بالای Vignette می‌درخشد
    await expect(shelfBottle).not.toHaveClass(/is-taken/);
    await expect(bucket).toHaveAttribute('data-retry', 'true');
    await expect(bucket).toContainText('آزمایش دوباره');
    await bucket.click();
    await expect(bucket).not.toHaveAttribute('data-retry');
    expect((await storeState(page)).entries).toBe(0);
  });

  test('reset-button empties process history', async ({ page }) => {
    await page.getByTestId('reset-button').click();
    await pause(page, 150);
    await page.getByTestId('history-button').click();
    const history = page.getByTestId('overlay-process_history');
    await expect(history).toBeVisible();
    await expect(history).toContainText('هنوز چیزی در پاتیل نریخته‌ای');
  });
});
