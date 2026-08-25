# سبک فلت 2D — یادداشت تولید

- تولید با GenerateImage (AI) روی پس‌زمینه‌ی روشن یکدست (#e9e2d4) یا مشکی خالص (آتش‌ها).
- کلیدواژه‌های پایه: flat 2D vector-style game asset، رنگ‌های تخت، بدون سایه/گرادیان/عمق، پالت گرم ایرانی، نقوش اسلیمی/گره ساده.
- پردازش: حذف پس‌زمینه (image_utils.mjs)، trim آلفا، و مشتق‌سازی state ها
  (برش back/front هاون، ۳ اندازه‌ی محتوا، ۳ فریم چرخش کوبه) در build_ui_styles.mjs.
- نام فایل‌های runtime از قرارداد V2_ART در Web/src/scene/v2/contracts.tsx می‌آید.
