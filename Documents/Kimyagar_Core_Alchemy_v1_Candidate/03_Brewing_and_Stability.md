# 03 --- Brewing, Timeline & Stability

## 1. Player Timeline

**Select → Quantity → Grind → Add → Heat → Observe → Add Next → Stir →
Bottle**

بازیکن لازم نیست از ابتدا کل Recipe را برنامه‌ریزی کند؛ تصمیم‌ها می‌توانند
مرحله‌ای باشند.

## 2. Brew Entry

برای هر ورود ماده ثبت می‌شود: - ingredient_id - quantity - grind_state -
entry_order - heat_at_entry - processing exposure - extracted properties

دو بار افزودن یک ماده = دو Brew Entry.

## 3. Process Events

هر Action مهم Event است: - ingredient_added - heat_changed - stirred -
bottled

این History برای Debug و Recipe replay ذخیره می‌شود.

## 4. Stirring

در v1: - یک Action ساده است. - Stir intensity/direction نداریم. - Early
Game: Mix Completion و tactile action. - Mid Game: Stability Correction.

Correction دارای Diminishing Returns است؛ نمونه‌ی Prototype: - first
useful stir: +0.15 correction - second: +0.08 - third: +0.03

اعداد نهایی وابسته به Playtest هستند.

## 5. Bottle

Bottle تصمیم صریح بازیکن برای پایان Brew است. در این لحظه Final Pipeline
اجرا می‌شود.

زود Bottle کردن = extraction ناقص.\
خیلی دیر = احتمال overprocessing.

## 6. Stability Purpose

Stability برای این نیست که هر Potion پیچیده را «بد» اعلام کند.
کارکردش: - هزینه دادن به Complexity و Conflict - جلوگیری از Everything
Potion - Reliability - Side-effect fluctuation / chaotic outcomes در
شدت‌های پایین - ایجاد فضای Mastery برای Stirring و Process

## 7. Prototype Formula

`Base Instability = Ingredient Complexity + Tension Cost + Process Error`

`Final Instability = Base Instability - Stirring Correction`

`Stability = 1 - normalized(Final Instability)`

Prototype starting point: `Tension Cost = Total Tension × 0.08`

همه‌ی مقادیر Clamp می‌شوند.

## 8. Player-facing Stability

عدد خام نمایش داده نمی‌شود: - پایدار - کمی ناپایدار - ناپایدار - بسیار
ناپایدار

## 9. Quality Modifier Curve

Stability متوسط نباید Potion خوب را نابود کند.

Starting curve: \| Stability \| Quality Modifier \| \|---:\|---:\| \|
0.90+ \| ×1.00 \| \| 0.75 \| ×0.98 \| \| 0.60 \| ×0.93 \| \| 0.45 \|
×0.82 \| \| 0.30 \| ×0.65 \| \| 0.15 \| ×0.40 \|

## 10. Stability Unlock Rule

Stability از روز اول **Simulated** است.\
Early Game اثرش غیرمستقیم دیده می‌شود.\
Mid Game نام، UI و ابزار کنترلش معرفی می‌شود.

## 11. Core Principle

> Stability باید هزینه‌ی Complexity باشد، نه مجازات Creativity.

Counterbalance ماهرانه می‌تواند همچنان Excellent شود؛ brute-force
correction باید گران‌تر، پرعارضه‌تر و ناپایدارتر باشد.
