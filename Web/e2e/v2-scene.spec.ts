import { expect, test, type Locator, type Page } from '@playwright/test';
import { dragCenterToCenter, pause } from './gestures';

/**
 * درگ شیشه از قفسه به هاون: اول کشیدن عمودی به پایین (تا تفکیک ژست قفسه آن را
 * Drag تشخیص دهد نه اسکرول افقی)، بعد حرکت به مرکز هاون.
 */
async function dragJarToMortar(page: Page, jar: Locator, mortar: Locator): Promise<void> {
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

/**
 * اسکلت e2e صحنه‌ی v2.
 * Workstream B/A هنوز روت و ژست‌ها را کامل می‌کنند؛ این فایل روی testid های
 * قراردادشده نوشته شده. گام‌های gesture-driven و store-driven جدا علامت خورده‌اند.
 */

type KimyagarStore = {
  getState: () => {
    mortar: { quantity: number; ingredientId: string } | null;
    brew: { entries: { quantity: number }[]; bottled: boolean; stirCount: number };
    result: unknown;
    addUnitToMortar: (id: string) => void;
    applyGrindWork: (amount: number) => void;
    addMortarToCauldron: () => void;
    bottleBrew: () => void;
  };
};

async function mortarQuantity(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const store = (window as unknown as { __kimyagarStore?: KimyagarStore }).__kimyagarStore;
    if (!store) throw new Error('window.__kimyagarStore is missing');
    return store.getState().mortar?.quantity ?? null;
  });
}

test.describe('Kimyagar v2 scene skeleton', () => {
  test('shelf → three mortar units (cap at 3) → brew → result', async ({ page }) => {
    await page.goto('/#/v2');

    // --- gesture-driven: صحنه‌ی v2 باید دیده شود ---
    const scene = page.getByTestId('v2-scene');
    const shelf = page.getByTestId('v2-shelf');
    await expect(scene).toBeVisible({ timeout: 20_000 });
    await expect(shelf).toBeVisible();

    // --- gesture-driven: اسکرول افقی قفسه ---
    if (await shelf.isVisible().catch(() => false)) {
      await shelf.evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
      });
      await pause(page, 120);
      await shelf.evaluate((el) => {
        el.scrollLeft = 0;
      });
      await pause(page, 80);
    }

    const jar = page.getByTestId('v2-jar-chamomile');
    const mortar = page.getByTestId('v2-mortar');
    const jarReady = await jar.isVisible().catch(() => false);
    const mortarReady = await mortar.isVisible().catch(() => false);

    if (jarReady && mortarReady) {
      // --- gesture-driven: سه بار درگ همان شیشه به هاون ---
      for (let i = 0; i < 3; i++) {
        await dragJarToMortar(page, jar, mortar);
        await pause(page, 150);
      }
    } else {
      // --- store-driven fallback: هاون/شیشه هنوز در DOM نیست ---
      await page.evaluate(() => {
        const store = (window as unknown as { __kimyagarStore?: KimyagarStore }).__kimyagarStore;
        if (!store) throw new Error('window.__kimyagarStore is missing');
        const add = store.getState().addUnitToMortar;
        add('chamomile');
        add('chamomile');
        add('chamomile');
      });
    }

    const qtyAfterThree = await mortarQuantity(page);
    expect(qtyAfterThree).toBe(3);

    const units = page.getByTestId('v2-mortar-units');
    if (await units.isVisible().catch(() => false)) {
      await expect(units).toContainText(/3|۳|سه/);
    }

    // --- gesture-driven (با fallback store): درگ چهارم از ۳ بیشتر نشود ---
    if (jarReady && mortarReady) {
      await dragJarToMortar(page, jar, mortar);
      await pause(page, 150);
    } else {
      await page.evaluate(() => {
        const store = (window as unknown as { __kimyagarStore?: KimyagarStore }).__kimyagarStore;
        if (!store) throw new Error('window.__kimyagarStore is missing');
        store.getState().addUnitToMortar('chamomile');
      });
    }
    expect(await mortarQuantity(page)).toBe(3);

    // --- store-driven: کوبش ژست ممکن است در اسکلت ناپایدار باشد ---
    await page.evaluate(() => {
      const store = (window as unknown as { __kimyagarStore?: KimyagarStore }).__kimyagarStore;
      if (!store) throw new Error('window.__kimyagarStore is missing');
      store.getState().applyGrindWork(4);
    });

    const cauldron = page.getByTestId('v2-cauldron');
    const pestle = page.getByTestId('v2-pestle');
    const contentsVisible = await pestle.isVisible().catch(() => false);
    const cauldronReady = await cauldron.isVisible().catch(() => false);
    if (contentsVisible && cauldronReady) {
      // --- gesture-driven: ریختن هاون در پاتیل (اگر محتوای قابل درگ موجود باشد) ---
      await dragCenterToCenter(page, mortar, cauldron);
      await pause(page, 150);
    }

    // --- store-driven: افزودن به پاتیل و بطری (مستقل از انیمیشن Overlay) ---
    await page.evaluate(() => {
      const store = (window as unknown as { __kimyagarStore?: KimyagarStore }).__kimyagarStore;
      if (!store) throw new Error('window.__kimyagarStore is missing');
      const s = store.getState();
      if (s.mortar) s.addMortarToCauldron();
      s.bottleBrew();
    });

    const hasResult = await page.evaluate(() => {
      const store = (window as unknown as { __kimyagarStore?: KimyagarStore }).__kimyagarStore;
      if (!store) throw new Error('window.__kimyagarStore is missing');
      return store.getState().result != null;
    });
    expect(hasResult).toBe(true);
  });

  test('empty route opens the classic workshop; #/v2 opens v2 flat by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('cauldron')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('v2-route-link')).toBeVisible();

    await page.goto('/#/v2');
    const scene = page.getByTestId('v2-scene');
    await expect(scene).toBeVisible({ timeout: 20_000 });
    await expect(scene).toHaveAttribute('data-art-style', 'flat');
    await expect(page.getByTestId('v2-flat-cauldron-canvas')).toBeVisible();
  });

  test('art style is remembered: #/v2/pixel then #/v2 stays pixel', async ({ page }) => {
    await page.goto('/#/v2/pixel');
    await expect(page.getByTestId('v2-scene')).toHaveAttribute('data-art-style', 'pixel', { timeout: 20_000 });
    await page.goto('/#/v2');
    await expect(page.getByTestId('v2-scene')).toHaveAttribute('data-art-style', 'pixel', { timeout: 20_000 });
    // انتخاب صریح فلت دوباره ذخیره می‌شود
    await page.goto('/#/v2/flat');
    await expect(page.getByTestId('v2-scene')).toHaveAttribute('data-art-style', 'flat', { timeout: 20_000 });
  });

  test('flat cauldron: live canvas, vector jars, auto-stir after drop', async ({ page }) => {
    await page.goto('/#/v2/flat');
    await expect(page.getByTestId('v2-flat-cauldron-canvas')).toBeVisible({ timeout: 20_000 });
    // شیشه‌ی برداری (SVG) به‌جای PNG
    await expect(page.getByTestId('v2-flat-jar-chamomile').locator('svg').first()).toBeVisible();
    // هیت‌باکس پاتیل و اهرم‌های حرارت هنوز هستند
    await expect(page.getByTestId('v2-cauldron')).toBeVisible();
    await expect(page.getByTestId('heat-high')).toBeVisible();

    const stirBefore = await page.evaluate(() => {
      const store = (window as unknown as { __kimyagarStore?: KimyagarStore }).__kimyagarStore;
      if (!store) throw new Error('window.__kimyagarStore is missing');
      return store.getState().brew.stirCount;
    });
    expect(stirBefore).toBe(0);

    // --- store-driven: ریختن یک ماده ⇒ هم‌زدن خودکار پس از فرود ---
    await page.evaluate(() => {
      const store = (window as unknown as { __kimyagarStore?: KimyagarStore }).__kimyagarStore;
      if (!store) throw new Error('window.__kimyagarStore is missing');
      const s = store.getState();
      s.addUnitToMortar('saffron');
      s.applyGrindWork(100);
      s.addMortarToCauldron();
    });
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const store = (window as unknown as { __kimyagarStore?: KimyagarStore }).__kimyagarStore;
            return store?.getState().brew.stirCount ?? -1;
          }),
        { timeout: 5_000 },
      )
      .toBe(1);
  });

  test('style switch smoke: #/v2/pixel renders v2-scene', async ({ page }) => {
    await page.goto('/#/v2/pixel');
    // --- gesture-driven / render smoke ---
    await expect(page.getByTestId('v2-scene')).toBeVisible({ timeout: 20_000 });
  });

  test('style switch smoke: #/v2/engraved renders v2-scene', async ({ page }) => {
    await page.goto('/#/v2/engraved');
    // --- gesture-driven / render smoke ---
    const scene = page.getByTestId('v2-scene');
    await expect(scene).toBeVisible({ timeout: 20_000 });
    await expect(scene).toHaveAttribute('data-art-style', 'engraved');
  });
});
