import { expect, test } from '@playwright/test';
import { circularMoves, dragCenterToCenter, pause, twoCircles } from './gestures';

test.describe('Kimyagar brew loop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('stage')).toBeVisible({ timeout: 20_000 });
  });

  test('happy path: cabinet → grind chamomile → brew → bottle → deliver → next customer', async ({
    page,
  }) => {
    await page.getByTestId('cabinet-handle').click();
    await expect(page.getByTestId('cabinet-panel')).toBeVisible();
    await expect(page.getByTestId('jar-chamomile')).toBeVisible();
    await pause(page, 120);

    await dragCenterToCenter(page, page.getByTestId('jar-chamomile'), page.getByTestId('mortar'));
    await pause(page, 200);

    await page.getByTestId('quantity-1.5').click();
    await pause(page, 120);

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

    // انیمیشن ریختن در بطری پخش می‌شود و بعد پاسخ مشتری خودکار می‌آید
    await expect(page.getByTestId('pouring')).toBeVisible();

    const result = page.getByTestId('overlay-result');
    await expect(result).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('customer-reaction')).toBeVisible();

    await page.getByTestId('action-next-customer').click();
    await expect(result).toBeHidden();
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
