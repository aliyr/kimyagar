import { expect, test, type Page } from '@playwright/test';
import {
  circularMoves,
  dragCenterToCenter,
  dragHorizontally,
  dragJarToMortar,
  pause,
  twoCircles,
} from './gestures';

type KimyagarStore = {
  getState: () => {
    mortar: { quantity: number; ingredientId: string } | null;
  };
};

async function storeMortarQuantity(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const store = (window as unknown as { __kimyagarStore?: KimyagarStore }).__kimyagarStore;
    if (!store) throw new Error('window.__kimyagarStore is missing');
    return store.getState().mortar?.quantity ?? null;
  });
}

test.describe('Kimyagar brew loop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('stage')).toBeVisible({ timeout: 20_000 });
  });

  test('happy path: shelf → grind chamomile → brew → bottle → deliver → next customer', async ({
    page,
  }) => {
    const shelf = page.getByTestId('shelf');
    const jar = page.getByTestId('jar-chamomile');
    const mortar = page.getByTestId('mortar');

    await expect(shelf).toBeVisible();
    await expect(jar).toBeVisible();
    await pause(page, 120);

    await dragJarToMortar(page, jar, mortar);
    await pause(page, 200);
    await expect(mortar).toHaveAttribute('data-mortar-units', '1');

    await dragJarToMortar(page, jar, mortar);
    await pause(page, 200);
    await expect(mortar).toHaveAttribute('data-mortar-units', '2');

    await expect(page.getByTestId('mortar-contents-raw')).toBeVisible();

    const contents = page.getByTestId('mortar-contents');
    for (let attempt = 0; attempt < 4; attempt++) {
      await circularMoves(page, page.getByTestId('pestle'), 30, 14);
      if (await contents.isVisible().catch(() => false)) break;
    }
    await expect(contents).toBeVisible();

    await dragCenterToCenter(page, contents, page.getByTestId('cauldron'));
    await pause(page, 200);

    const heatHigh = page.getByTestId('heat-high');
    await heatHigh.click();
    await expect(heatHigh).toHaveAttribute('data-active');

    await twoCircles(page, page.getByTestId('cauldron'), 22);
    await pause(page, 150);

    await dragCenterToCenter(
      page,
      page.getByTestId('bottle-empty'),
      page.getByTestId('bottling-point'),
    );

    await expect(page.getByTestId('pouring')).toBeVisible();

    const emotion = page.getByTestId('customer-emotion');
    await expect(emotion).toBeVisible({ timeout: 20_000 });
    await expect(emotion).toHaveAttribute('data-emotion', /^(happy|sad)$/);

    const result = page.getByTestId('overlay-result');
    await expect(result).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('customer-reaction')).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('action-next-customer').click();
    await expect(result).toBeHidden();
  });

  test('mortar unit cap stays at 3 after a fourth jar drop', async ({ page }) => {
    const jar = page.getByTestId('jar-chamomile');
    const mortar = page.getByTestId('mortar');
    await expect(jar).toBeVisible();
    await expect(mortar).toBeVisible();

    for (let i = 0; i < 4; i++) {
      await dragJarToMortar(page, jar, mortar);
      await pause(page, 180);
    }

    await expect(mortar).toHaveAttribute('data-mortar-units', '3');
    expect(await storeMortarQuantity(page)).toBe(3);
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

  test('reset-button empties process history', async ({ page }) => {
    await page.getByTestId('reset-button').click();
    await pause(page, 150);
    await page.getByTestId('history-button').click();
    const history = page.getByTestId('overlay-process_history');
    await expect(history).toBeVisible();
    await expect(history).toContainText('هنوز چیزی در پاتیل نریخته‌ای');
  });
});
