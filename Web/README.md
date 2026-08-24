# کیمیاگر

نمونه‌ی وب بازی کیمیاگری فارسی **کیمیاگر** — کارگاه عطاری برای ساخت معجون، با موتور کیفی، ارزیابی مشتری، و زبان انسانی (بدون عدد خام برای بازیکن).

پشته: Vite + React 19 + TypeScript + Zustand. موتور خالص است؛ محتوا data-driven است.

اسناد طراحی:

- [Core Alchemy v1 Candidate](../Documents/Kimyagar_Core_Alchemy_v1_Candidate/README.md)
- [تعریف UX کیمیاگری](../Documents/Core_Alchemy_UX_Definition_v1.0_Candidate.md)

## اجرا

از پوشه‌ی `Web`:

```bash
npm install
npx playwright install chromium
npm run dev
```

اگر دانلود مرورگر از CDN رسمی مسدود بود (خطای ۴۰۳)، آینه را امتحان کنید:

```powershell
$env:PLAYWRIGHT_DOWNLOAD_HOST="https://cdn.npmmirror.com/binaries/playwright"
npx playwright install chromium
```

آدرس پیش‌فرض: [http://localhost:5173](http://localhost:5173)

| دستور | کار |
| --- | --- |
| `npm run dev` | سرور توسعه |
| `npm test` | آزمون واحد موتور (Vitest) |
| `npm run e2e` | آزمون انتهابه‌انتهای Playwright |
| `npm run build` | ساخت تولید |
| `npm run lint` | Oxlint |

میان‌بر `Shift+D` یا دکمه‌ی کوچک `dbg` گوشه‌ی پایین-چپ، نمای اشکال‌زدایی را باز می‌کند (اعداد خام فقط آنجا).

## ساختار پوشه‌ها

```
Web/
  src/
    data/        تعاریف JSON + برچسب‌های فارسی
    engine/      موتور خالص کیمیاگری
    store/       حالت بازی (zustand)
    scene/       کارگاه تعاملی
    gestures/    اشاره‌های هاون / هم‌زدن
    overlays/    پوشش‌ها (جزئیات ماده، نامه، تاریخچه، دفترچه، نتیجه)
    debug/       نمای اشکال‌زدایی
  e2e/           مشخصات Playwright
  tests/         آزمون واحد
```

## محتوای داده‌محور

بدون دست‌زدن به کد موتور می‌توان این فایل‌ها را ویرایش کرد:

| فایل | محتوا |
| --- | --- |
| `src/data/ingredients.json` | ۶ ماده با خواص پایه، ضرایب حرارت/کوبش، رنگ، طعم و سرنخ |
| `src/data/customers.json` | ۱۰ مشتری با درخواست انسانی و Requirementهای موتور |
| `src/data/qualityTags.json` | نشان‌های کیفیت (مثل خوابِ راحت) |
| `src/data/properties.json` | محورها و آستانه‌های کیفی |
| `src/data/tuning.json` | ضرایب تعادل |
| `src/data/labels.ts` | برچسب‌های UI (کم / متوسط / زیاد، …) |

شناسه‌ی خواص مجاز: `calm`, `excitement`, `sleep`, `wake`, `warm`, `cold`, `strength`, `weakness`, `focus`, `distract`, `pain_relief`, `joy`.

متن `requestFa` باید انسانی و ضمنی باشد — عدد و نام مکانیک در زبان مشتری نیاید. سرنخ‌های `cluesFa` پس از به‌کاربردن ماده در دفترچه دیده می‌شوند.

## آزمون e2e

Playwright فقط Chromium را هدف می‌گیرد (viewport ۱۲۸۰×۷۲۰). مشخصه‌ی اصلی در `e2e/brew-loop.spec.ts` حلقه‌ی کامل دم‌کردن را با `data-testid`های توافق‌شده طی می‌کند.
