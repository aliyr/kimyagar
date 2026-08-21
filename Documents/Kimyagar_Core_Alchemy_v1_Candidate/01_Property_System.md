# 01 --- Property System

## 1. Principle

هر Ingredient دارای مجموعه‌ای از Property Contributionهاست. Potion از
جمع، تقابل و تبدیل این Contributionها ساخته می‌شود.

## 2. Property Types

### Axis Properties

دو Property متضاد روی یک محور: - Sleep ↔ Wake - Warm ↔ Cold - Calm ↔
Excitement - Strength ↔ Weakness - Focus ↔ Distract

فهرست دقیق 5--6 محور نهایی در Content Pass تثبیت می‌شود؛ معماری باید
Data-driven باشد.

### Independent Properties

خواصی که لزوماً Opposite مستقیم ندارند؛ هدف بلندمدت حدود 10 مورد.
نمونه‌های Prototype: - Pain Relief - Joy

در آینده خواصی مثل Healing، Dream، Vision و موارد خاص می‌توانند
Independent باشند.

## 3. Ingredient Complexity Rule

هر Ingredient ترجیحاً فقط روی حدود 3 محور/سیستم اثر جدی داشته باشد. عمق
باید از **ترکیب مواد** ایجاد شود، نه اینکه هر Ingredient ده قانون
استثنایی داشته باشد.

## 4. Internal Numeric / External Qualitative

Engine مقدار عددی نگه می‌دارد، ولی UI عادی از برچسب‌های کیفی استفاده
می‌کند: - کم - متوسط - زیاد - بسیار زیاد

Notebook پس از کشف کامل می‌تواند اطلاعات دقیق‌تر ارائه کند، مطابق Game
Vision.

## 5. Axis Resolution

برای دو سمت یک Axis:

`Resolved = Side A - Side B`

سمت علامت نتیجه تعیین می‌کند کدام Property غالب است.

مثال: - Sleep Raw = 3.4 - Wake Raw = 2.6 - Resolved Sleep = 0.8

## 6. Internal Tension

خنثی شدن ظاهری به معنی نبود نیرو نیست.

`Axis Tension = min(Side A, Side B)`

مثال: - Sleep 3.4 / Wake 3.4 - Resolved = 0 - Tension = 3.4

اصل: \> **Balance ≠ Absence**

`Total Tension = sum(Axis Tension)`

وزن‌دهی پیچیده‌تر فقط در صورت نیاز Playtest اضافه می‌شود.

## 7. Property Scale / Cap

Property Scale دارای سقف سخت است، اما رسیدن به سقف باید به‌دلیل
Diminishing Returns و هزینه‌ی مواد/عوارض سخت باشد. هدف جلوگیری از رشد
بی‌نهایت و ساده نگه‌داشتن Balance است.

## 8. Counterbalance

بازیکن می‌تواند Property نامطلوب را با Opposite آن کاهش دهد.

Counterbalance: - Effect Profile را اصلاح می‌کند. - Internal Tension
می‌سازد. - ممکن است Stability را کاهش دهد. - ممکن است Property/Side
Effect جدید وارد Potion کند.

بنابراین Counterbalance ابزار مهم است، ولی Universal Fix نیست.

## 9. Design Constraint

Fine-tuning باید ممکن باشد، اما هیچ محور یا Property نباید تنها پاسخ
همه‌ی مسائل باشد.
