# 05 --- Customer Evaluation

## 1. Principle

> Potion خوب، قوی‌ترین Potion نیست؛ دقیق‌ترین پاسخ به نیاز مشتری است.

Customer request در UI به زبان انسانی و ضمنی بیان می‌شود؛ Engine آن را به
Requirement تبدیل می‌کند.

## 2. Requirement Types

### Must Have

اثر ضروری.

### Avoid

اثری که مشتری صریحاً نمی‌خواهد.

### Preferred

Bonus؛ نبودنش شکست نیست.

### Target Range

برای Mid/Late Game؛ مقدار باید در محدوده باشد و Overshoot هم نامطلوب
است.

## 3. Smooth Evaluation

Thresholdها دیوار Binary نیستند. نزدیک بودن به Target باید Satisfaction
تدریجی ایجاد کند.

## 4. Oversolving

بعد از تأمین نیاز، افزایش شدید Property پاداش زیادی نمی‌دهد.

این رفتار بازیکن را از «قدرت بیشتر» به «تمیزتر کردن Profile» هدایت
می‌کند.

## 5. Weight Philosophy

-   Must Have: وزن مثبت اصلی
-   Avoid: وزن منفی قوی
-   Target Range: متوسط/زیاد
-   Preferred: Bonus کوچک

Preferred نباید Avoid خراب را جبران کند.

## 6. Critical Requirements

برخی Avoid/Must-haveها `critical` هستند. نقض شدید می‌تواند حداکثر Result
را به Partial محدود کند.

## 7. Unrequested Side Effects

Extra effects سه دسته‌اند: - Neutral Extra: تقریباً بدون Penalty -
Contextually Undesirable: Penalty کوچک/متوسط - Intrinsic Burden: معمولاً
Penalty دارد (مثل Weakness/Confusion در صورت وجود)

Propertyها مطلقاً good/bad نیستند؛ Context مهم است.

## 8. Stability

Stability Modifier ثانویه است و فقط در مقدار بسیار پایین ضربه‌ی جدی
می‌زند.

## 9. Quality Tags

Tag فقط در Context مرتبط Bonus می‌دهد. Restful برای مشتری خواب ارزش دارد،
نه لزوماً برای هر Customer.

## 10. Conceptual Formula

`Core Score = MustHave + Avoid Satisfaction + Target Satisfaction + Preferred Bonus`

`Adjusted = Core Score - SideEffectPenalty`

`Quality = Adjusted × StabilityModifier + RelevantTagBonus`

Starting bands: - 90--100: Excellent - 70--89: Good - 40--69: Partial -
\<40: Failure

اعداد نهایی Playtest-dependent هستند.

## 11. Player Feedback

Score عددی به بازیکن نمایش داده نمی‌شود.

Customer reaction باید Debugger انسانی بازیکن باشد: \> «دردم خیلی بهتر
شد، ولی تا شب انگار جون توی تنم نبود.»

بازیکن از دیالوگ می‌فهمد چه چیز درست و چه چیز خراب بوده است.

## 12. Prototype Customers

C1 Calm: Calm ≥ 1.8\
C2 Calm without Sleep: Calm ≥ 1.8, Sleep ≤ 1.2\
C3 Pain: Pain ≥ 2.2\
C4 Strong Pain without Sleep: Pain ≥ 2.7, Sleep ≤ 1.3, Preferred
Weakness ≤ 1.2\
C5 Focus: Focus ≥ 1.7\
C6 Focus without Excitement: Focus ≥ 1.7, Excitement ≤ 1.0\
C7 Warm & Strong: Warm ≥ 2.0, Strength ≥ 1.7\
C8 Restful Sleep: Sleep ≥ 1.8, Calm ≥ 1.8, relevant Restful bonus
