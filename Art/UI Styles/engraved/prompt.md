# سبک حکاکی — یادداشت تولید

- منبع: پک vendor حکاکی/کنده‌کاری (Art/Vendor/engraved_pack) — تصاویر شفاف آماده.
- آماده‌سازی master ها (برش از sprite-sheet ها، بازسازی هاون متقارن، کوبه‌ی SVG،
  سطح مایع procedural): tools/prepare_engraved_masters.mjs
- سپس مشتق‌سازی state ها (برش back/front هاون، ۳ اندازه‌ی محتوا، ۳ فریم چرخش
  کوبه) در build_ui_styles.mjs — بدون حذف پس‌زمینه (ورودی از قبل آلفا دارد).
- نام فایل‌های runtime از قرارداد V2_ART در Web/src/scene/v2/contracts.tsx می‌آید.
