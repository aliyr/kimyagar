# Kimyagar — Project Context & Current Status

**Purpose:** مرجع زنده‌ی وضعیت پروژه «کیمیاگر» برای ادامه‌ی مرحله‌به‌مرحله‌ی طراحی و توسعه.

## 1. Source of Truth Hierarchy

1. **Game Vision**
   - مرجع بالادستی محصول و تجربه‌ی بازی.
2. **Core Design Documents**
   - هر سیستم اصلی سند تخصصی خودش را دارد.
3. **UX Design Documents**
   - قرارداد تجربه، معماری اطلاعات، Flow، Progression، Wireframe و Interaction Design.
   - برای Alchemy، مرجع فعلی `Core_Alchemy_UX_Definition_v1.0_Candidate.md` است.
4. **Prototype / Balance Documents**
   - اعداد آزمایشی، یافته‌های تست و Balance.
5. **Backlog**
   - ایده‌های خوب ولی تأییدنشده یا Deferred.
6. **Current Status**
   - این فایل؛ مشخص می‌کند الان کجای پروژه هستیم و قدم بعدی چیست.

## 2. Current Project State

### Game Vision
**Status:** Defined / Active Source of Truth

هسته‌ی تجربه:
- حس خوب
- کنجکاوی
- کشف

قواعد کلیدی:
- Alchemy > Story
- Curiosity > Grind
- System Understanding > Reflex
- Player Experience > Monetization
- Polish > Scope
- No Grind
- Easy to learn, hard to master

### Core Alchemy
**Status:** v1.0 Candidate — Design Complete / Awaiting Prototype Validation

مجموعه‌ی سندهای Core Alchemy:
- 00_Core_Alchemy_Overview
- 01_Property_System
- 02_Ingredients_and_Processing
- 03_Brewing_and_Stability
- 04_Reactions_and_Discovery
- 05_Customer_Evaluation
- 06_Alchemy_Progression
- 07_Alchemy_Technical_Spec
- 08_Prototype_and_Balance
- 09_Alchemy_Backlog

تصمیم مهم:
Core Alchemy فعلاً **Freeze** است. ایده‌های جدید ابتدا وارد Backlog می‌شوند و تغییر Structural فقط با شواهد Prototype/Playtest انجام می‌شود.

### Core Alchemy UX Definition
**Status:** v1.0 Candidate — Design Complete / Awaiting Downstream UX & Prototype Validation

سند اصلی:
- `Core_Alchemy_UX_Definition_v1.0_Candidate.md`

تصمیم‌های کلیدی:
- Persistent Contextual Workspace
- Pause / Safe State هنگام Overlayهای تصمیم‌گیری
- Guided Recreation برای Recipeهای شناخته‌شده
- Add Ingredient پس از Drop غیرقابل Undo
- Live Effect Visibility تدریجی و وابسته به Knowledge
- Interrupted Brew در نسخه‌ی نهایی Pause و حفظ می‌شود
- Goal Summary فشرده و دائمی + متن کامل On-demand
- Process History لایه‌ای
- Known Potion Result پیش از Customer Delivery
- Free Experiment Result چندلایه و بدون Quality Score عمومی

Prototype Hypothesisهای منتخب:
- Feedback کلی Cauldron + Entry Detail هنگام Inspect
- Stir کوتاه یک یا دو دوری به‌عنوان Action گسسته
- Drag Bottle به Bottling Point + Auto-fill
- Discovery Micro-feedback غیرمسدودکننده‌ی حدود 1–2 ثانیه

این چهار فرضیه از نظر Timing، Threshold، خوانایی و حس نهایی باید در Graybox Prototype اعتبارسنجی شوند.

## 3. Current Immediate Goal

**Core Alchemy Information Architecture**

هدف:
سازمان‌دهی اطلاعات و سطوح دسترسی تجربه‌ی کیمیاگری براساس UX Definition فریز‌شده.

Information Architecture باید شامل این موارد باشد:
- فهرست Information Objectهای Alchemy
- رابطه‌ی Workspace، Ingredient Browser، Goal، Notebook، Process History و Result
- تفکیک Persistent / Contextual / On-demand / Progressive / Result-only / Debug-only
- اولویت اطلاعات روی Mobile Landscape
- قواعد دسترسی و بازگشت میان Contextها
- ورودی روشن برای مرحله‌ی Alchemy User Flows

در این مرحله Layout دقیق، Wireframe، Visual Design و Asset Production انجام نمی‌شود.

## 4. Prototype Goal

سؤال اصلی Prototype:

> آیا Alchemy بدون Story و Art پیچیده هم به‌خودی‌خود سرگرم‌کننده است؟

Prototype باید موارد زیر را اعتبارسنجی کند:
- Understandability
- Agency
- Discovery
- Desire to Experiment
- Multiple valid solutions
- Cause → Effect clarity

## 5. Prototype Scope

### Include
- 6 Ingredients
- Property System مورد نیاز Prototype
- Quantity
- Grinding
- Heat
- Ingredient Order / Exposure
- Simple Stir
- Bottle
- Axis Resolution
- Internal Tension
- Stability
- Customer Evaluation
- 8–12 Test Customers
- Data-driven definitions
- Alchemy Debug View
- Reset Brew
- Repeat Last Brew

### Exclude
- Full Story
- Bazaar واقعی
- Garden
- Economy کامل
- Reputation / Factions
- Shop upgrades
- Rare/Mythical content
- Full Hidden Property system
- Layer D
- Monetization
- Full Save/Progression
- Final polished art

## 6. Core Alchemy Design Principles

- Property-based, not fixed-recipe-only.
- Recipe نتیجه‌ی سیستم است، نه جایگزین سیستم.
- Precision > Raw Power.
- Balance ≠ Absence.
- Counterbalance رایگان نیست.
- Internal Tension هزینه‌ی تضادهاست.
- Stability نباید Creativity را خفه کند.
- No Universal Ingredient.
- No Universal Correction Method.
- Failure باید قابل‌فهم و آموزنده باشد.
- Hidden Complexity نباید Hidden Randomness باشد.
- UI ساده، Engine عمیق.
- Knowledge is Progression.

## 7. Project Workflow From Now On

مسیر رسمی فعلی Alchemy UI/UX:

1. Core Alchemy UX Definition — **Completed / v1.0 Candidate**
2. Core Alchemy Information Architecture — **Current**
3. Alchemy User Flows
4. UX Progression
5. Low-Fidelity Wireframes
6. Interaction Design
7. Programmer Handoff
8. Godot Graybox Prototype
9. Internal UX / Gameplay Test
10. External Blind UX / Gameplay Playtest
11. Core / UX Revision
12. Tactile / Audio / Haptic Pass
13. Visual UI Design
14. High-Fidelity Interactive Prototype
15. Vertical Slice UX

تفکیک رسمی:
- UX Design ابتدا مشخص می‌کند بازیکن چه می‌کند، چه می‌بیند و Flow / Layout چگونه است.
- Visual Exploration می‌تواند موازی انجام شود، اما Production Asset نیست.
- Production Asset پس از روشن‌شدن UX و Low‑Fi انجام می‌شود.

## 8. Context Preservation Rule

در شروع هر گفتگوی جدید داخل پروژه «کیمیاگر»، اگر درخواست مربوط به ادامه‌ی پروژه باشد:

- ابتدا وضعیت فعلی پروژه را از این فایل و اسناد Source of Truth بازیابی کن.
- اگر کار مربوط به Alchemy UX، Information Architecture، User Flow، UX Progression، Wireframe، Interaction Design یا Prototype UX است، `Core_Alchemy_UX_Definition_v1.0_Candidate.md` را نیز به‌عنوان Source of Truth بخوان.
- تصمیم‌های قطعی قبلی را دوباره از نو سؤال نکن.
- مشخص کن کاربر در کدام مرحله قرار دارد.
- کار را از **Next Step** ادامه بده.
- اگر ایده‌ی جدید با تصمیم Freeze‌شده تعارض داشت، آن را مستقیم وارد Core نکن؛ ابتدا Backlog یا Change Proposal بساز.
- مراحل پایین‌دستی UX باید تصمیم‌های UX Definition را سازمان‌دهی و اجرا کنند، نه اینکه بی‌دلیل از نو تعریفشان کنند.
- بعد از پایان هر Milestone، این فایل باید با Current Status و Next Step جدید به‌روزرسانی شود.

## 9. Next Step

### Next:
**Core Alchemy Information Architecture v0.1**

پس از آن:
1. Alchemy User Flows
2. UX Progression
3. Low-Fidelity Wireframes
4. Interaction Design
5. Programmer Handoff
6. Godot Graybox Prototype
7. Internal Test
8. External Blind Playtest
9. Core / UX Revision if needed

## 10. Active Project Sources

### Product Vision

- `Game_Vision_Source.md`

### Core Alchemy v1.0 Candidate

- `README.md`
- `00_Core_Alchemy_Overview.md`
- `01_Property_System.md`
- `02_Ingredients_and_Processing.md`
- `03_Brewing_and_Stability.md`
- `04_Reactions_and_Discovery.md`
- `05_Customer_Evaluation.md`
- `06_Alchemy_Progression.md`
- `07_Alchemy_Technical_Spec.md`
- `08_Prototype_and_Balance.md`
- `09_Alchemy_Backlog.md`

### Alchemy UX

- `Core_Alchemy_UX_Definition_v1.0_Candidate.md`

### Live Status

- همین فایل: **Kimyagar — Project Context & Current Status**

## 11. Last Updated

2026-08-22
