# Production assets — ترازو و هاون

این پوشه خروجی production-ready دو design master موجود در `Art/Assets/Vertical Slice` است.

## Scale

- فایل‌های `scale_*.png` دارای alpha واقعی و پس‌زمینهٔ شفاف‌اند.
- `scale_beam`، زنجیرها و کفه‌ها متحرک‌اند؛ pivot اصلی کل مجموعه در `scale_manifest.json` ثبت شده است.
- در Godot، `BeamPivot` را در نقطهٔ pivot تیر بسازید و Beam/Chain/Panها را فرزند آن کنید. برای ثابت ماندن کفه‌ها می‌توان rotation آن‌ها را با مقدار منفی rotation تیر جبران کرد.

## Mortar

- `mortar_body` ثابت و `mortar_pestle` قطعهٔ متحرک اصلی است.
- محتوای خام و خردشده برای crossfade، سه ingredient piece و دو فریم dust مستقل هستند.
- pivot دسته‌هاون نزدیک محل گرفتن ثبت شده تا حرکت قوسی طبیعی ایجاد شود.

## Preview و انیمیشن

- `Scale/scale_preview.png` و `Mortar/mortar_preview.png`: preview ترکیبی 2048×2048 با پس‌زمینهٔ شفاف.
- `Previews/scale_animation_preview.gif`: مرور Idle، وزن چپ/راست و بازگشت به تعادل.
- `Previews/mortar_grinding_preview.gif`: loop نمونهٔ کوبش قوسی و dust impact.

## Import

- Filter روشن، Mipmaps خاموش برای کاربرد UI/موبایل نزدیک، و Compression روی Lossless پیشنهاد می‌شود.
- مقادیر دقیق bounds، pivot و زمان‌بندی پیشنهادی در `scale_manifest.json` و `mortar_manifest.json` هستند.
- همهٔ PNGها فضای رنگی sRGB و alpha مستقیم دارند.

## چک‌لیست تحویل

- [x] پس‌زمینهٔ شفاف و چهار گوشهٔ alpha-zero برای همهٔ PNGها
- [x] قطعات متحرک اصلی به فایل مستقل تفکیک شده‌اند
- [x] نام‌گذاری انگلیسی ثابت و مطابق سند است
- [x] preview ترکیبی 2048×2048 برای هر دارایی موجود است
- [x] bounds، pivot و زمان‌بندی پیشنهادی انیمیشن ثبت شده است
- [x] محتوای خام/خردشده و FX ضربه برای هاون موجود است
- [x] shadow و glow اختیاری، مستقل از بدنه‌اند
- [x] آزمون ماشینی ۲۳ فایل در `validation_report.json` پاس شده است
