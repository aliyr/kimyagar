# سبک پیکسل‌آرت — یادداشت تولید

- تولید با GenerateImage (AI) روی پس‌زمینه‌ی روشن یکدست (#e9e2d4) یا مشکی خالص (آتش‌ها).
- کلیدواژه‌های پایه: pixel art game sprite، پیکسل‌های درشت 16-bit، پالت محدود گرم، بدون سایه، نقوش ایرانی ساده‌شده.
- پردازش: حذف پس‌زمینه (image_utils.mjs)، trim آلفا، و مشتق‌سازی state ها
  (برش back/front هاون، ۳ اندازه‌ی محتوا، ۳ فریم چرخش کوبه) در build_ui_styles.mjs.
- نام فایل‌های runtime از قرارداد V2_ART در Web/src/scene/v2/contracts.tsx می‌آید.
- رندر صحنه با image-rendering: pixelated (کلاس zone-art--pixelated).
