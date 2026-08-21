# کیمیاگر --- Core Alchemy Overview

**Status:** v1.0 Candidate --- Design Complete / Awaiting Prototype
Validation\
**Source of truth:** Game Vision + Core Alchemy design decisions

## 1. Purpose

این مجموعه سند، طراحی هسته‌ی سیستم کیمیاگری «کیمیاگر» را تعریف می‌کند.
هدف، ساخت سیستمی است که بازیکن احساس کند **خودش منطق معجون را فهمیده و
کشف کرده است**؛ نه اینکه صرفاً Recipeهای از پیش تعیین‌شده را اجرا کند.

## 2. Alignment with Game Vision

هسته‌ی تجربه: \> «خودم فهمیدم چطور این معجون را بسازم.»

سه حس کلیدی: - حس خوب - کنجکاوی - کشف

تعادل تجربه: - 50% حل مسئله و فهم سیستم - 30% تجربه‌ی حسی/لمسی/صوتی - 20%
داستان

اولویت‌های مرتبط: - Alchemy \> Story - Curiosity \> Grind - System
Understanding \> Reflex - Polish \> Scope - Complexity باید از ترکیب
سیستم‌های ساده ایجاد شود، نه استثناهای فراوان.

## 3. Core Alchemy Fantasy

بازیکن مواد را می‌شناسد، مقدار و فرایند را کنترل می‌کند، نتیجه را مشاهده
می‌کند، از شکست یاد می‌گیرد و به مرور قادر می‌شود Effect Profile یک Potion
را مهندسی کند.

هدف «قوی‌ترین Potion» نیست: \> **Precision \> Raw Power**

Potion خوب، Potionی است که دقیق‌ترین پاسخ را به نیاز مشتری بدهد و عوارض،
تنش و بی‌ثباتی را کنترل کند.

## 4. Mental Loop

**نمی‌دانم → حدس می‌زنم → آزمایش می‌کنم → واکنش می‌بینم → یاد می‌گیرم → کشف
می‌کنم**

دانش بازیکن بخشی از Progression است. Mastery باید در ذهن بازیکن شکل
بگیرد، نه فقط در Level یا Skill Tree.

## 5. Player-Facing Brewing Loop

1.  انتخاب Ingredient
2.  انتخاب Quantity
3.  Grinding / Preparation
4.  افزودن به دیگ
5.  کنترل Heat
6.  مشاهده‌ی Processing/Reaction
7.  افزودن مواد بعدی
8.  Stir در صورت نیاز
9.  Bottle
10. مشاهده‌ی نتیجه
11. تحویل به Customer یا ذخیره
12. ثبت دانش/Recipe

## 6. Internal Calculation Pipeline

1.  Base Property Contribution
2.  Quantity Modifier
3.  Grinding Modifier
4.  Heat / Exposure Modifier
5.  Raw Property Contributions
6.  Axis Resolution
7.  Hidden Property Activation
8.  Synergy Evaluation
9.  Emergent / Layer D Reactions
10. Axis Recalculation
11. Internal Tension
12. Stability
13. Final Effect Profile
14. Customer Evaluation

## 7. Core Systems

-   Property Axes
-   Independent Properties
-   Ingredient Profiles
-   Quantity
-   Selective Extraction via Grinding
-   Heat and Exposure
-   Order through process context
-   Counterbalance
-   Internal Tension
-   Stability
-   Synergy / Quality Tags
-   Hidden Properties
-   Emergent Reactions (Layer D)
-   Customer Evaluation
-   Knowledge / Discovery State
-   Recipe and Process History

## 8. Complexity Strategy

Engine می‌تواند عمیق باشد، اما UI نباید همه‌ی عمق را همزمان نمایش دهد.

سه وضعیت برای مکانیک‌ها: - **Simulated:** در Engine فعال است. -
**Observable:** بازیکن اثرش را می‌بیند. - **Controllable:** بازیکن مفهوم
و ابزار کنترل آن را می‌شناسد.

مثال: Stability از ابتدا Simulated است، در Early Game غیرمستقیم
Observable می‌شود و در Mid Game به‌طور کامل Controllable می‌شود.

## 9. Golden Rules

1.  Property-based system، نه fixed-recipe-only.
2.  Recipe نتیجه‌ی سیستم است، نه جایگزین سیستم.
3.  Precision از Raw Power مهم‌تر است.
4.  Oversolving پاداش بزرگ نمی‌گیرد.
5.  Counterbalance مجاز است، اما رایگان نیست.
6.  Balance ≠ Absence؛ نیروهای متضاد حتی با خروجی خنثی می‌توانند Tension
    بسازند.
7.  Stability نباید Creativity را خفه کند.
8.  Hidden Complexity نباید Hidden Randomness باشد.
9.  Failure باید قابل‌فهم و آموزنده باشد.
10. Player-facing language عمدتاً کیفی است؛ اعداد برای Engine/Designer
    هستند.
11. No Universal Correction Method.
12. No Grind.
13. Early Game forgiving است.
14. Complexity به‌تدریج آشکار می‌شود.
15. هر Feature جدید باید به Curiosity، Discovery یا Core Loop خدمت کند.

## 10. Current Status

طراحی ساختاری Core Alchemy کامل است و برای Prototype آماده است. اعداد
Balance نهایی نیستند و تا Playtest نباید Freeze شوند.

**Next gate:** ساخت Prototype کوچک و پاسخ به این سؤال: \> آیا Alchemy
بدون Story و Art پیچیده هم لذت‌بخش است؟
