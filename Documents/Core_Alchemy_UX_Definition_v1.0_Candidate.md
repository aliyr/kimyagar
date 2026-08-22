# Kimyagar — Core Alchemy UX Definition

**Version:** v1.0 Candidate  
**Status:** Design Complete / Awaiting Downstream UX & Prototype Validation  
**Date:** 2026-08-22  
**Completed Milestone:** Core Alchemy UX Definition  
**Next Milestone:** Core Alchemy Information Architecture

---

## 0. Document Purpose

این سند قرارداد تجربه‌ی کاربری سیستم کیمیاگری «کیمیاگر» را تعریف می‌کند؛ یعنی مشخص می‌کند بازیکن در تجربه‌ی ساخت معجون:

- با چه هدفی وارد می‌شود؛
- چه کارهایی انجام می‌دهد؛
- پیش از هر تصمیم چه اطلاعاتی نیاز دارد؛
- سیستم چگونه نتیجه‌ی اعمال را قابل‌فهم می‌کند؛
- چگونه از آزمایش، موفقیت و شکست یاد می‌گیرد؛
- و پیچیدگی پنهان Engine چگونه به‌تدریج در Player Interface آشکار می‌شود.

این سند پاسخ نهایی به Layout، Wireframe، Visual Design یا Implementation نیست. وظیفه‌ی آن ساختن یک مبنای روشن برای مراحل بعدی است:

1. Information Architecture
2. Alchemy User Flows
3. UX Progression
4. Low-Fidelity Wireframes
5. Interaction Design
6. Programmer Handoff
7. Godot Graybox Prototype

### 0.1 Source of Truth

این سند از منابع زیر پیروی می‌کند:

1. Game Vision
2. Core Alchemy v1.0 Candidate
3. Prototype & Balance Scope
4. UI/UX Roadmap رسمی پروژه
5. تصمیم‌های محصولی ثبت‌شده در ادامه‌ی همین فرایند

در صورت تعارض، Game Vision و اسناد تخصصی Core Alchemy بر این سند مقدم‌اند. این سند اجازه ندارد بدون شواهد Prototype یا Playtest ساختار Core Alchemy را تغییر دهد.

### 0.2 Decision Labels

برای جلوگیری از تبدیل‌شدن فرض‌ها به تصمیم قطعی، از این برچسب‌ها استفاده می‌شود:

- **Confirmed:** مستقیماً از Source of Truth یا تصمیم قطعی قبلی آمده است.
- **Proposed:** پیشنهاد UX سازگار با Core است، اما هنوز نیازمند تأیید محصولی است.
- **Open Question:** تصمیمی است که پاسخ آن رفتار یا ساختار تجربه را تغییر می‌دهد.
- **Prototype Validation:** تصمیمی که پاسخ نهایی آن باید از تست عملی به‌دست آید.
- **Deferred:** خارج از Scope این Milestone یا این نسخه است.

---

# 1. Scope

## 1.1 In Scope

این سند فقط UX مربوط به Core Alchemy را پوشش می‌دهد:

- ورود به یک Brewing Session؛
- دریافت یا مرور هدف ساخت؛
- انتخاب و بررسی Ingredient؛
- انتخاب Quantity؛
- Grinding / Preparation؛
- افزودن Ingredient به Cauldron؛
- Heat و Processing؛
- Ingredient Order / Exposure؛
- Stir؛
- Bottle؛
- Potion Result؛
- Stability و Side Effect Feedback؛
- Discovery؛
- Recipe / Process History در حد لازم برای Alchemy؛
- Repeat، Reset و Retry؛
- Progressive Disclosure مکانیک‌های Alchemy؛
- نیازهای UX مربوط به Prototype و Playtest.

## 1.2 Out of Scope

موارد زیر در این Milestone طراحی کامل نمی‌شوند:

- Full Customer / Narrative UX؛
- دیالوگ‌نویسی نهایی مشتریان؛
- Market و خرید مواد؛
- Garden؛
- Economy کامل؛
- Reputation، Factions و Fame؛
- Shop Progression؛
- Full Discovery Book؛
- Full Game Navigation و Meta UX؛
- Settings؛
- Monetization؛
- Visual UI Design؛
- Art Asset Production؛
- Sound Asset Production؛
- Haptic Tuning نهایی؛
- High-Fidelity Prototype؛
- Programmer Task Breakdown.

Customer Request و Notebook فقط تا جایی بررسی می‌شوند که برای تجربه‌ی Alchemy ضروری‌اند.

## 1.3 Structural Constraint

**Confirmed:** Core Alchemy v1.0 Candidate از نظر ساختاری Freeze است.

بنابراین:

- UX باید سیستم موجود را قابل‌فهم کند، نه اینکه آن را با سیستم تازه جایگزین کند؛
- ایده‌ی مکانیکی جدید ابتدا وارد Backlog می‌شود؛
- تغییر Structural فقط با شواهد Prototype / Playtest مجاز است؛
- اعداد Balance و Thresholdها همچنان قابل تغییرند؛
- Mechanical State باید از UI Visibility جدا بماند.

---

# 2. Alchemy Experience Contract

## 2.1 Core Player Fantasy

**Confirmed:** بازیکن باید احساس کند یک کیمیاگر یا عطار است که با شناخت مواد، کنترل فرایند و مشاهده‌ی واکنش‌ها، منطق معجون را خودش کشف می‌کند.

تجربه نباید به انتخاب یک Recipe و تماشای اجرای خودکار آن تقلیل پیدا کند.

احساس هدف:

> «من با فهمیدن رفتار مواد و کنترل فرایند، این معجون را ساختم.»

لحظه‌ی مطلوب کشف:

> «خودم فهمیدم چرا این ترکیب جواب داد.»

## 2.2 Emotional Goals

**Confirmed:** سه حس اصلی عبارت‌اند از:

1. حس خوب
2. کنجکاوی
3. کشف

Alchemy باید:

- آرام و بدون فشار زمانی آزاردهنده باشد؛
- لمس‌پذیر و زنده احساس شود؛
- بازیکن را به آزمایش بعدی علاقه‌مند کند؛
- شکست را به منبع یادگیری تبدیل کند؛
- حس توانمندشدن از طریق فهم را ایجاد کند.

## 2.3 Experience Balance

**Confirmed:** تعادل هدف تجربه:

- 50% حل مسئله و فهم سیستم
- 30% تجربه‌ی لمسی، صوتی و واکنشی
- 20% داستان

در این Milestone تمرکز اصلی روی 50% حل مسئله و الزامات 30% تجربه‌ی لمسی است. داستان فقط Context لازم را فراهم می‌کند.

## 2.4 Cognitive Goal

بازیکن باید بتواند یک مدل ذهنی تدریجی بسازد:

1. هر Ingredient شخصیت و رفتار خودش را دارد.
2. Quantity همیشه به معنی «هرچه بیشتر بهتر» نیست.
3. Grinding می‌تواند نوع استخراج را تغییر دهد.
4. Heat روی مواد مختلف اثر یکسان ندارد.
5. Order از طریق زمان ورود، Heat-at-entry و Exposure اهمیت پیدا می‌کند.
6. نیروهای متضاد ممکن است خروجی را خنثی کنند، اما Tension باقی بماند.
7. Counterbalance مفید است، اما رایگان نیست.
8. Stir می‌تواند Mix Completion و بعداً Stability را اصلاح کند.
9. Bottle زمان پایان فرایند را تعیین می‌کند.
10. Potion خوب دقیق‌ترین پاسخ است، نه قوی‌ترین پاسخ.

## 2.5 Core Mental Loop

**Confirmed:**

> نمی‌دانم → حدس می‌زنم → آزمایش می‌کنم → واکنش می‌بینم → یاد می‌گیرم → کشف می‌کنم

UX باید این چرخه را کوتاه، خوانا و تکرارپذیر نگه دارد.

## 2.6 Core UX Principles

### Principle 1 — Direct Before Abstract

بازیکن تا جای ممکن باید با Ingredient، Mortar، Cauldron، Heat و Bottle مستقیماً تعامل کند. منو و متن نباید جای عمل کیمیاگری را بگیرند.

### Principle 2 — Simple Interface, Deep Engine

Engine می‌تواند عمیق باشد، اما UI فقط اطلاعات لازم برای تصمیم فعلی را آشکار می‌کند.

### Principle 3 — Cause Before Score

بازیکن باید بفهمد چه اتفاقی افتاد و چرا؛ نمایش Score خام اولویت ندارد.

### Principle 4 — Qualitative Before Numeric

Player-facing language عمدتاً کیفی است: کم، متوسط، زیاد، بسیار زیاد. اعداد خام برای Designer، Debug View و دانش پیشرفته محفوظ می‌مانند.

### Principle 5 — Discovery Without Interruption

Discovery باید باارزش احساس شود، اما Flow را با صفحه‌های طولانی و توقف‌های مکرر قطع نکند.

### Principle 6 — Failure Teaches

شکست باید حداقل یک سرنخ عملی برای آزمایش بعدی بدهد.

### Principle 7 — Understanding Over Reflex

Mastery از تصمیم و فهم می‌آید، نه از سرعت واکنش یا پنجره‌های زمانی سخت.

### Principle 8 — Precision Over Power

UX نباید بازیکن را به بیشینه‌کردن یک نوار واحد هدایت کند. تطبیق دقیق با نیاز مهم‌تر است.

### Principle 9 — Progressive Disclosure

مکانیک‌ها می‌توانند از ابتدا Simulated باشند، سپس Observable و در نهایت Controllable شوند.

### Principle 10 — Touch-first, Mobile Landscape

تعامل باید برای گوشی Landscape، لمس مستقیم، انگشت و جلسات 10 تا 20 دقیقه‌ای مناسب باشد.

## 2.7 UX Anti-Principles

Alchemy UX نباید به این موارد تبدیل شود:

- فرم چندمرحله‌ای خشک؛
- Spreadsheet یا Debugger عددی برای بازیکن عادی؛
- منوی شلوغ با نمایش هم‌زمان تمام Properties؛
- Reflex Challenge؛
- Recipe Selector خودکار که Core Play را حذف کند؛
- مجموعه‌ای از Confirmation Dialogهای مکرر؛
- آموزش متنی طولانی؛
- Hidden Randomness غیرقابل توضیح؛
- UI تزئینی ولی ناخوانا؛
- شبیه‌سازی بیش از حد پیچیده؛
- Punishment شدید برای آزمایش.

## 2.8 UX Success Criteria

UX زمانی موفق است که یک تستر جدید بتواند:

- هدف ساده‌ی مشتری را بفهمد؛
- Ingredient مرتبط را انتخاب کند؛
- Quantity و Grinding را آگاهانه تغییر دهد؛
- Ingredient را به Brew اضافه کند؛
- Heat را کنترل کند؛
- تغییر Processing را تشخیص دهد؛
- Stir و Bottle را بفهمد؛
- از نتیجه تشخیص دهد چه چیزی درست و چه چیزی نامناسب بوده است؛
- راه‌حل دوم را تصور کند؛
- و میل داشته باشد آزمایش دیگری انجام دهد.

---

# 3. Alchemy Use Cases

## 3.1 Customer-Driven Brewing

**Confirmed:** حالت اصلی Core Loop.

بازیکن با یک نیاز انسانی وارد Alchemy می‌شود و باید آن را به تصمیم‌های کیمیاگری تبدیل کند.

Context لازم:

- متن یا خلاصه‌ی درخواست؛
- Must Haveهای قابل‌استنباط؛
- Avoidها و محدودیت‌های گفته‌شده؛
- Preferred یا Target Range در مراحل پیشرفته؛
- امکان مراجعه‌ی دوباره به درخواست در طول Brew.

پایان:

- Bottle؛
- مشاهده‌ی Potion Result؛
- تحویل به مشتری؛
- دریافت واکنش فوری یا گزارش بعدی، بسته به Customer Flow آینده.

## 3.2 Free Experiment

**Confirmed:** بازیکن می‌تواند خارج از سفارش مشتری آزمایش کند.

هدف:

- کشف رفتار Ingredientها؛
- آزمودن Synergy یا Hidden Property؛
- ساخت Recipe شخصی؛
- پاسخ به کنجکاوی باقی‌مانده از Session قبلی.

تفاوت با Customer-Driven Brewing:

- Requirement Set مشتری وجود ندارد؛
- موفقیت/شکست قراردادی ندارد؛
- Quality Score کلی وجود ندارد؛
- Result چندلایه است: Effect Profile محور اصلی، سپس Side Effect، Stability، Discovery و Process Summary؛
- Result باید بگوید «چه ساخته شده»، نه اینکه Potion را خارج از Context مطلقاً خوب یا بد اعلام کند.

## 3.3 Known Recipe Recreation

**Confirmed:** حالت پایه برای Recipe شناخته‌شده **Guided Recreation** است.

- Recipe مراحل و پارامترهای شناخته‌شده را به‌صورت Contextual راهنمایی می‌کند؛
- بازیکن همچنان Ingredientها را انتخاب، آماده و به Brew اضافه می‌کند؛
- Recipe نباید Core Play را با اجرای خودکار جایگزین کند؛
- Reference کامل Process History باید قابل مراجعه باشد؛
- Quick Brew فقط در صورت مشاهده‌ی Grind واقعی در Playtest و در Progression مناسب بررسی می‌شود.

این تصمیم میان حفظ مهارت کیمیاگری و جلوگیری از تکرار بی‌معنا تعادل ایجاد می‌کند.

## 3.4 Repeat Last Brew

**Confirmed for Prototype:** بازیکن یا Developer باید بتواند آخرین Brew را تکرار کند.

UX بازیکن و Developer Control باید از هم جدا باشند:

- Player Repeat برای یادگیری، اصلاح و مقایسه؛
- Debug Repeat برای بازتولید دقیق شرایط و تحلیل فرمول.

## 3.5 Interrupted Brew

**Confirmed:** در نسخه‌ی نهایی، خروج موقت، Background شدن یا بسته‌شدن برنامه باید Brew را Pause و State آن را حفظ کند. بازگشت بازیکن از همان State امن ادامه پیدا می‌کند و Processing آفلاین ادامه نمی‌یابد.

برای Prototype، Pause و Reset کافی است و Full Save / Resume خارج از Scope باقی می‌ماند.

---

# 4. Interaction Model

## 4.1 Confirmed Workspace Model

**Confirmed:** مدل رسمی تجربه یک **Persistent Contextual Workspace** است.

ویژگی‌های مدل:

- کارگاه کیمیاگری در طول Brew پیوستگی فضایی دارد؛
- Cauldron مرکز ادراکی تجربه است؛
- Ingredient و ابزارها تا حد ممکن اشیای قابل تعامل‌اند؛
- اطلاعات جزئی فقط در Context مرتبط باز می‌شوند؛
- پنل‌های موقت نباید حس خروج از کارگاه ایجاد کنند؛
- درخواست مشتری و وضعیت کلی Brew قابل مراجعه‌اند؛
- بازیکن می‌تواند تصمیم‌ها را مرحله‌ای بگیرد و مجبور نیست کل Recipe را از ابتدا برنامه‌ریزی کند.

این مدل میان سه نیاز تعادل ایجاد می‌کند:

1. حس فیزیکی و لمسی کارگاه؛
2. خوانایی روی Mobile Landscape؛
3. جلوگیری از شلوغی دائمی UI.

## 4.2 Interaction Vocabulary

**Confirmed at vision level:** تعامل‌های اصلی Tap، Drag و Swipe هستند و Drag/Touch غالب است.

### Tap

کاربرد پیشنهادی:

- Inspect؛
- Select؛
- بازکردن اطلاعات Contextual؛
- انتخاب State گسسته مانند Low / Medium / High؛
- تأیید عمل صریح مانند Bottle، در صورتی که خود Bottle با Drag اجرا نشود.

### Drag

کاربرد پیشنهادی:

- انتقال Ingredient به Mortar؛
- انتقال Ingredient آماده‌شده به Cauldron؛
- اجرای حرکت‌های لمسی معنادار؛
- تعامل مستقیم با ابزار در صورت خوانایی و راحتی.

### Swipe

کاربرد پیشنهادی:

- مرور Ingredient Collection؛
- ورق‌زدن Notebook یا Process History؛
- تغییر Contextهای ثانویه، بدون وابستگی مکانیکی حساس.

### Hold

**Constraint:** Hold فقط می‌تواند راه میان‌بُر Inspect یا نمایش اطلاعات تکمیلی باشد. عمل حیاتی نباید صرفاً با Hold پنهان شود.

## 4.3 Direct Manipulation Rule

هرجا عمل فیزیکی بخشی از Fantasy و Feedback است، Direct Manipulation اولویت دارد؛ اما حرکت واقعی نباید به Gesture دشوار و خسته‌کننده تبدیل شود.

مثال:

- کشیدن Ingredient به Mortar معنادار است؛
- آسیاب‌کردن باید لمس‌پذیر باشد؛
- تنظیم دقیق یک عدد با حرکت پیچیده ضرورت ندارد؛
- Heat می‌تواند کنترل ساده و گسسته داشته باشد؛
- Bottle باید تصمیمی صریح و قابل‌تشخیص باشد.

## 4.4 No Gesture Guessing

بازیکن نباید برای فهمیدن Gesture لازم حدس بزند. Affordance، Animation Preview، Highlight مقصد و آموزش کوتاه باید تعامل ممکن را نشان دهند.

## 4.5 Temporal Behavior

**Confirmed:** بازکردن Ingredient Detail، Notebook یا Overlayهای تصمیم‌گیری، Processing را در یک **Pause / Safe State** قرار می‌دهد.

- Reflex و عجله وارد مطالعه و تصمیم‌گیری نمی‌شود؛
- زمان فقط هنگامی پیش می‌رود که بازیکن در Workspace فعال است و می‌تواند Cauldron را مشاهده کند؛
- Transition ورود و خروج از Safe State باید روشن باشد؛
- Ready Window در Early Game بزرگ و بخشنده باقی می‌ماند؛
- حس طبیعی Pause و بازگشت به Processing در Graybox Prototype اعتبارسنجی می‌شود.

---

# 5. Semantic Brewing States

این بخش Stateهای معنایی را تعریف می‌کند، نه Flowchart یا Layout نهایی را.

## 5.1 Pre-Brew

بازیکن هنوز Ingredientی وارد Cauldron نکرده است.

باید بتواند:

- هدف را مرور کند؛
- Ingredientها را بررسی کند؛
- اولین Ingredient را انتخاب و آماده کند؛
- بدون فشار زمانی تصمیم بگیرد.

## 5.2 Ingredient Selected

یک Ingredient برای Inspect یا Preparation انتخاب شده است.

اطلاعات لازم:

- نام؛
- ظاهر و هویت؛
- مقدار موجود، در نسخه‌ی دارای Economy؛
- Knowledge State؛
- Properties شناخته‌شده؛
- Heat / Grinding Clueهای کشف‌شده؛
- وضعیت ناشناخته، بدون افشای World Truth.

## 5.3 Preparation

بازیکن Quantity و Grinding State یک Brew Entry را تعیین می‌کند.

اصل:

- هر بار افزودن یک Ingredient یک Entry مستقل است؛
- یک Ingredient می‌تواند چند بار با Quantity یا Grinding متفاوت وارد شود؛
- انتخاب‌ها باید پیش از Add قابل بازبینی باشند.

## 5.4 Active Brew

حداقل یک Ingredient وارد Cauldron شده است.

بازیکن می‌تواند:

- Processing را مشاهده کند؛
- Heat را تغییر دهد؛
- Ingredient بعدی را آماده کند؛
- Stir کند؛
- Bottle کند؛
- به هدف و دانش موجود مراجعه کند.

## 5.5 Processing

Ingredient Entryها در یکی از Stageهای زیر قرار دارند:

- Fresh
- Extracting
- Ready
- Overprocessed

UX باید Stage را به‌صورت قابل مشاهده و عمدتاً کیفی انتقال دهد.

## 5.6 Reaction / Discovery Moment

یک Synergy، Hidden Property یا Discovery Event رخ داده است.

Flow نباید برای توضیح طولانی متوقف شود. Feedback کوتاه داده می‌شود و جزئیات می‌تواند بعداً بررسی شود.

## 5.7 Bottled

Bottle تصمیم صریح پایان Brew است. پس از آن PotionResult Immutable تولید می‌شود و تغییر Brew متوقف می‌گردد.

## 5.8 Result Review

بازیکن نتیجه‌ی کیفی، Discoveryها، Side Effectها و میزان ارتباط نتیجه با هدف را مرور می‌کند.

## 5.9 Post-Result Decision

گزینه‌های Contextual ممکن:

- تحویل به مشتری؛
- نگهداری؛
- نام‌گذاری؛
- ثبت Recipe؛
- Repeat؛
- Retry with Changes؛
- بازگشت به Workspace.

نمایش دقیق گزینه‌ها وابسته به Use Case و مرحله‌ی Progression است.

---

# 6. Brewing Action Contracts

## 6.1 Review Goal

### Player Intent

فهمیدن اینکه قرار است چه نوع نتیجه‌ای ساخته شود.

### Required Information

- نیاز اصلی؛
- چیزهایی که باید پرهیز شوند؛
- ترجیح‌ها یا Target Rangeهای شناخته‌شده؛
- زبان انسانی مشتری؛
- در مراحل ابتدایی، Highlight آموزشی محدود در صورت نیاز.

### UX Requirement

**Confirmed:** یک خلاصه‌ی فشرده از Goal در طول Brew دائماً دیده می‌شود و متن کامل با یک Action سریع قابل گسترش است.

- خلاصه شامل نیاز اصلی و مهم‌ترین Avoid یا محدودیت است؛
- در مراحل پیشرفته، Target یا Preferred مهم می‌تواند در خلاصه منعکس شود؛
- متن کامل زبان انسانی مشتری را حفظ می‌کند؛
- هیچ‌کدام به Requirement Table عددی تبدیل نمی‌شوند؛
- خلاصه نباید فضای اصلی Workspace را اشغال کند.

### Feedback

بازکردن دوباره‌ی درخواست باید سریع باشد و وضعیت Brew را از دست ندهد.

## 6.2 Browse and Inspect Ingredient

### Player Intent

پیداکردن ماده‌ای که احتمالاً به هدف کمک می‌کند.

### Required Information

- هویت Ingredient؛
- Properties کشف‌شده؛
- شدت کیفی Properties؛
- Clueهای Processing؛
- Unknown / Observed / Confirmed State؛
- Quantity موجود در Context مناسب.

### UX Requirement

World Truth افشا نمی‌شود. بازیکن فقط دانشی را می‌بیند که به‌دست آورده است.

### Potential Confusion

- تفاوت Unknown با «این ماده آن Property را ندارد»؛
- تفاوت Base Property با نتیجه‌ی Process؛
- شلوغی زیاد برای Ingredientهای پیشرفته.

### Required Response

- Unknown باید نشانه‌ای متفاوت از مقدار صفر داشته باشد؛
- اطلاعات براساس Knowledge State لایه‌بندی شوند؛
- Detail کامل On-demand باشد.

## 6.3 Choose Quantity

### Player Intent

تنظیم سهم Ingredient در Brew.

### Mechanical Truth

Quantity اثر معنادار ولی Diminishing دارد و برخی مواد Quantity-sensitive هستند.

### Required Information

- گزینه‌های مجاز Prototype: 0.5 / 1 / 1.5 / 2؛
- مقدار انتخاب‌شده؛
- هشدار یا Clue برای Quantity Sensitivity فقط در صورت کشف؛
- هزینه یا موجودی، در نسخه‌ی کامل.

### Feedback

- تغییر واضح مقدار فیزیکی ماده؛
- تغییر Label کیفی یا Portion؛
- Preview نباید فرمول دقیق آینده را بدون Knowledge کافی لو بدهد.

### Recovery

پیش از Add قابل تغییر است. پس از Add تابع قانون Irreversibility خواهد بود.

## 6.4 Choose Grinding State

### Player Intent

انتخاب نوع Extraction، نه صرفاً افزایش قدرت.

### Mechanical Truth

- Coarse
- Crushed
- Fine

Propertyهای مختلف می‌توانند با Grinding Stateهای مختلف به نسبت متفاوت استخراج شوند.

### UX Requirement

UI نباید Fine را به‌صورت بصری «بهترین سطح» معرفی کند.

### Feedback

- تفاوت شکل و بافت Ingredient؛
- Feedback لمسی و صوتی آسیاب؛
- State Label واضح؛
- Clue درباره‌ی Extraction در صورت مشاهده یا کشف قبلی.

### Potential Confusion

بازیکن ممکن است Grinding را Linear Upgrade فرض کند.

### Required Teaching

اولین Ingredient حساس به Grinding باید تفاوت قابل مشاهده و نتیجه‌ی قابل توضیح داشته باشد؛ خشخاش کاندید Prototype است.

## 6.5 Execute Grinding

### Player Intent

آماده‌سازی فیزیکی ماده و رسیدن به State انتخابی.

### Selected Interaction Direction

Grinding باید یک عمل لمسی کوتاه و رضایت‌بخش باشد، نه مینی‌گیم طولانی یا Reflex Test. طول، حساسیت و Alternate Input آن در Interaction Design و Graybox Prototype تنظیم می‌شوند.

### Feedback

- تغییر تدریجی ظاهر ماده؛
- صدای هاون؛
- Haptic محدود و معنی‌دار؛
- Snap یا Confirmation هنگام رسیدن به State گسسته.

### Accessibility Requirement

بازیکن نباید مجبور به حرکت سریع، شدید یا طولانی شود. Alternate Input ساده باید در Interaction Design بررسی شود.

## 6.6 Add Ingredient

### Player Intent

ثبت یک تصمیم و واردکردن Ingredient آماده‌شده به Brew.

### Mechanical Truth

هنگام Add، Entry Order، Heat-at-entry و از آن پس Exposure اهمیت پیدا می‌کنند.

### Feedback

- Highlight واضح Drop Target؛
- حرکت Ingredient به Cauldron؛
- واکنش فوری مایع، صدا یا تغییر جزئی؛
- ثبت Entry در Process History؛
- آغاز Processing آن Entry.

### Irreversibility

**Confirmed:** Add پس از Drop یک تصمیم قطعی و غیرقابل Undo است.

- تا پیش از Drop، Quantity و Grinding کاملاً قابل تغییرند؛
- Drop Target باید امن، بزرگ و واضح باشد؛
- پس از ورود به Cauldron، Ingredient به‌صورت عادی قابل خارج‌کردن نیست؛
- Confirmation Dialog استفاده نمی‌شود؛
- Prototype دارای Reset است؛
- اشتباه بخشی از یادگیری است، ولی Accidental Drop باید با طراحی مناسب کاهش یابد.

## 6.7 Control Heat

### Player Intent

تغییر شرایط Extraction و Processing.

### Mechanical Truth

- Low
- Medium
- High

High همیشه بهتر نیست. Ingredientها Heat Profile متفاوت دارند.

### Required Information

- Heat State فعلی؛
- تغییر State؛
- بازخورد واکنش Ingredientها؛
- Clueهای کشف‌شده درباره‌ی Heat Sensitivity.

### Feedback

- تغییر شعله یا منبع حرارت؛
- تغییر رفتار مایع، بخار، حباب یا صدا؛
- تفاوت واضح ولی نه لزوماً افشاگرانه بین States؛
- تأیید لمسی کوتاه هنگام تغییر State.

### Early Game

Heat می‌تواند Auto / Medium باشد تا Fantasy پیش از Complexity معرفی شود.

## 6.8 Observe Processing

### Player Intent

فهمیدن زمان مناسب ادامه‌ی فرایند یا Bottle.

### Required Information

- Fresh / Extracting / Ready / Overprocessed؛
- نشانه‌ی تغییر Stage؛
- تفاوت Ingredientهای موجود در صورت لزوم؛
- واکنش کلی Brew.

### UX Requirement

Stage نباید فقط با یک Timer عددی منتقل شود. حالت مایع، Ingredient، بخار، صدا و نشانه‌ی کیفی باید نقش اصلی را داشته باشند.

### Selected Prototype Hypothesis

- وضعیت کلی Cauldron بازخورد اصلی Processing است؛
- Status هر Ingredient Entry هنگام Inspect همان Entry یا بازکردن Process History دیده می‌شود؛
- وضعیت همه‌ی Entryها به‌صورت دائمی روی Workspace نمایش داده نمی‌شود؛
- Prototype باید اعتبارسنجی کند که این مدل برای تصمیم‌گیری دقیق کافی و همچنان خوانا است.

## 6.9 Add Next Ingredient

### Player Intent

اصلاح Profile، افزودن Property جدید، Counterbalance یا ایجاد Synergy.

### UX Requirement

بازیکن نباید مجبور باشد کل Recipe را از ابتدا تعیین کند. Workspace باید تصمیم مرحله‌ای را پشتیبانی کند.

### Required Information

- وضعیت کلی Brew؛
- Goal؛
- Properties شناخته‌شده‌ی Candidate Ingredient؛
- Heat فعلی؛
- Processing Context؛
- History ساده‌ی مواد افزوده‌شده.

## 6.10 Stir

### Player Intent

Early Game: کامل‌کردن حس Mixing.  
Mid Game: اصلاح Stability با Diminishing Returns.

### Mechanical Truth

در v1 شدت و جهت Stir وجود ندارد. هر Stir یک Action ساده است.

### Selected Prototype Hypothesis

- بازیکن حدود یک یا دو دور حرکت دایره‌ای کوتاه انجام می‌دهد؛
- این حرکت یک Stir Action گسسته ثبت می‌کند؛
- سرعت، جهت و شدت حرکت اثر مکانیکی ندارند؛
- بازیکن با الگوی دقیق یا سرعت حرکت امتیاز نمی‌گیرد؛
- طول و Threshold دقیق در Graybox Prototype تنظیم می‌شوند.

### Feedback

- حرکت مایع؛
- صدای مشخص؛
- Haptic کوتاه؛
- بازخورد کاهش‌یابنده برای Stirهای بعدی؛
- پس از Unlock Stability، نشانه‌ی کیفی اثر Stir.

### Guardrail

UI نباید بازیکن را به Spam کردن Stir ترغیب کند.

## 6.11 Bottle

### Player Intent

پایان‌دادن آگاهانه به Brew در زمانی که نتیجه مطلوب به‌نظر می‌رسد.

### Mechanical Truth

- Bottle اجرای Final Pipeline را Trigger می‌کند؛
- زود Bottle کردن می‌تواند Extraction ناقص بدهد؛
- دیر Bottle کردن می‌تواند Overprocessing ایجاد کند؛
- پس از Bottle، PotionResult تغییرناپذیر است.

### UX Requirement

- Bottle باید تصمیمی صریح باشد؛
- با Actionهای معمول اشتباه نشود؛
- نتیجه‌ی پایان‌ناپذیر بودن Brew روشن باشد؛
- Confirmation مکرر ترجیح داده نمی‌شود.

### Selected Prototype Hypothesis

- بازیکن بطری خالی را به نقطه‌ی واضح Bottling کنار Cauldron Drag می‌کند؛
- تا پیش از Drop امکان لغو وجود دارد؛
- Drop صحیح، Auto-fill کوتاه و Final Pipeline را آغاز می‌کند؛
- پس از Drop، Brew نهایی و PotionResult تغییرناپذیر می‌شود؛
- Affordance، اندازه‌ی Drop Target و خوانایی آن در Graybox Prototype اعتبارسنجی می‌شوند.

## 6.12 Review Potion Result

### Player Intent

فهمیدن اینکه چه ساخته شده، چقدر به هدف نزدیک است و چه چیزی باید دفعه‌ی بعد تغییر کند.

### Required Information

- Effect Profile نهایی به زبان کیفی؛
- Side Effectهای آشکار؛
- Stability در سطح Progression مجاز؛
- Quality Tagهای کشف‌شده؛
- Discoveryها؛
- Process Summary؛
- ارتباط با Customer Goal، بدون Score خام.

### UX Requirement

Result باید هم پاداش احساسی باشد و هم ابزار یادگیری.

### Before Customer Delivery

**Confirmed:** بازیکن پیش از تحویل، Result شناخته‌شده‌ی Potion را می‌بیند:

- Effect Profile در محدوده‌ی Knowledge موجود؛
- Side Effectهای قابل‌تشخیص؛
- Stability، در صورت Unlock؛
- Discoveryها و Quality Tagهای شناخته‌شده.

اما تطبیق واقعی با بدن، نیاز و Context مشتری، و پیامدهای هنوز ناشناخته فقط از طریق واکنش یا گزارش مشتری روشن می‌شوند. Result پیش از تحویل نباید Customer Evaluation کامل یا World Truth را افشا کند.

## 6.13 Deliver to Customer

### Player Intent

آزمودن نتیجه در Context واقعی نیاز مشتری.

### Mechanical Truth

Customer Evaluation شامل Must Have، Avoid، Preferred و Target Range است و Smooth Evaluation دارد.

### Feedback

Customer باید مانند Debugger انسانی عمل کند:

> «دردم خیلی بهتر شد، ولی تا شب انگار جان توی تنم نبود.»

این Feedback باید حداقل یک موفقیت و یک مشکل مهم را در زبان طبیعی منتقل کند.

جزئیات Dialogue Flow در Customer / Narrative UX طراحی می‌شود.

## 6.14 Save, Name, Repeat or Retry

### Player Intent

- حفظ دانش؛
- مالکیت بر کشف؛
- آزمایش تغییر کوچک؛
- بازتولید نتیجه‌ی خوب.

### UX Requirement

- Naming باید اختیاری و سریع باشد؛
- Recipe باید Process History را حفظ کند، نه فقط Ingredient List؛
- Repeat و Retry with Changes از هم متمایز باشند؛
- تکرار نباید به Grind تبدیل شود.

---

# 7. Player-Facing Information Model

## 7.1 Visibility Classes

### Persistent

اطلاعاتی که در اکثر لحظات Brew باید قابل مشاهده یا با یک نگاه قابل بازیابی باشند.

### Contextual

فقط هنگام انتخاب Ingredient، ابزار یا State مرتبط ظاهر می‌شوند.

### On-Demand

بازیکن با Inspect یا Notebook آن‌ها را درخواست می‌کند.

### Progressive

با Tier، Knowledge State یا Tutorial آشکار می‌شوند.

### Result-only

پس از Bottle نمایش داده می‌شوند.

### Debug-only

فقط برای Developer و Balance قابل مشاهده‌اند.

## 7.2 Visibility Requirements Table

| Information | Default Visibility | Notes |
|---|---|---|
| Customer Goal | Compact Persistent Summary | متن کامل با یک Action سریع؛ به زبان انسانی، نه Requirement Table خام |
| Current Heat | Persistent during Active Brew | Low / Medium / High |
| Processing Stage | Observable during Active Brew | عمدتاً کیفی و حسی |
| Selected Ingredient | Contextual | هویت و Knowledge State |
| Ingredient Known Properties | Contextual / On-Demand | شدت کیفی |
| Unknown Properties | Contextual | Unknown با Zero متفاوت باشد |
| Quantity | Contextual during Preparation | انتخاب واضح و گسسته در Prototype |
| Grinding State | Contextual during Preparation | Coarse / Crushed / Fine بدون سلسله‌مراتب قدرت |
| Added Ingredient History | Layered / Quickly Retrievable | ترتیب Entryها به‌شکل خلاصه؛ جزئیات هر Entry با Inspect |
| Raw Contributions | Debug-only by default | برای Player عادی نمایش داده نشود |
| Resolved Property Profile | Progressive / Result-only | Player-facing کیفی |
| Axis Tension | Hidden early / Progressive later | ممکن است ابتدا فقط پیامدش دیده شود |
| Stability | Simulated from start; Progressive visibility | پایدار تا بسیار ناپایدار |
| Process Error | Debug-only / Indirect player clue | علت باید قابل استنباط باشد |
| Stir Correction | Progressive | عدد خام نمایش داده نشود |
| Quality Tags | Result / Discovery Context | فقط Tagهای کشف‌شده |
| Hidden Property | Unknown → Observed → Confirmed | World Truth از Player Knowledge جدا |
| Customer Score | Never raw in normal UI | Reaction و Quality Band جایگزین عدد |
| Customer Requirement Match | Result / Natural language | بدون فرمول و Weight خام |
| Exact Formula Factors | Debug-only | Base، Quantity، Grinding، Heat/Exposure |

## 7.3 Process History Visibility

**Confirmed:** Process History ساختاری لایه‌ای دارد.

- ترتیب Ingredient Entryها به‌شکل خلاصه و سریع قابل مشاهده است؛
- هر Entry هویت Ingredient و جایگاهش در Order را نشان می‌دهد؛
- Inspect هر Entry، Quantity، Grinding State و Heat-at-entry را آشکار می‌کند؛
- Exposure یا Processing detail فقط در حدی نشان داده می‌شود که برای تصمیم فعلی یا دانش بازیکن معنادار باشد؛
- History کامل و دقیق‌تر پس از Bottle یا در Recipe Record قابل مراجعه است؛
- Formula Factorهای خام فقط در Debug View باقی می‌مانند.

## 7.4 Live Effect Visibility

**Confirmed:** مشاهده‌ی Effect Profile در طول Brew به‌صورت تدریجی و وابسته به Knowledge و Progression است.

1. در شروع بازی، Cauldron عمدتاً از طریق Sensory Clueها وضعیت خود را نشان می‌دهد.
2. با افزایش دانش، Profile کیفی Properties شناخته‌شده قابل مشاهده می‌شود.
3. UI فقط آن بخشی از Profile را نشان می‌دهد که بازیکن ابزار یا دانش فهم آن را دارد.
4. Hidden Property و World Truth کشف‌نشده در Live Profile افشا نمی‌شوند.
5. Result پس از Bottle جمع‌بندی روشن‌تری ارائه می‌دهد، اما همچنان به Knowledge State وفادار می‌ماند.
6. مقدارهای خام Engine و Contribution Factorها در Debug View باقی می‌مانند.

## 7.5 Knowledge States

**Confirmed:**

- Unknown
- Observed
- Confirmed

### Unknown

بازیکن نمی‌داند چه خاصیت یا واکنشی وجود دارد. UI نباید Property پنهان را نام ببرد.

### Observed

بازیکن یک نشانه دیده است، اما هنوز دانش قطعی ندارد. Notebook می‌تواند Clue یا علامت سؤال ثبت کند.

### Confirmed

Property یا رفتار با تکرار، آموزش یا منبع معتبر تأیید شده است. اطلاعات دقیق‌تر می‌تواند آشکار شود.

## 7.6 Unknown Is Not Zero

از نظر UX باید تفاوت واضحی میان این دو وجود داشته باشد:

- «این Ingredient آن Property را ندارد.»
- «بازیکن هنوز نمی‌داند آیا آن Property وجود دارد یا نه.»

## 7.7 Qualitative Scale

Player-facing scale پایه:

- کم
- متوسط
- زیاد
- بسیار زیاد

Thresholdهای دقیق در Balance Pass تعیین می‌شوند.

در Notebook پس از کشف کامل می‌توان دقت بیشتری ارائه کرد، اما نمایش عدد خام در Workspace پیش‌فرض نیست.

---

# 8. Mechanic Visibility and Progressive Disclosure

## 8.1 Simulated / Observable / Controllable

هر مکانیک ممکن است هم‌زمان در یکی از سه وضعیت باشد:

- **Simulated:** در Engine محاسبه می‌شود.
- **Observable:** بازیکن نشانه‌ی اثرش را می‌بیند.
- **Controllable:** بازیکن مفهوم و ابزار کنترل آن را می‌شناسد.

Unlock به معنی روشن‌شدن ناگهانی قانون جهان نیست؛ به معنی افزایش توان فهم یا کنترل بازیکن است.

## 8.2 Early Visibility Rules

در Early Game:

- Ingredient، Grinding و Customer Need آشکارند؛
- Heat می‌تواند Auto / Medium باشد؛
- Stability محاسبه می‌شود ولی نام آن لزوماً نمایش داده نمی‌شود؛
- Tension ممکن است فقط از طریق نتیجه و بی‌ثباتی احساس شود؛
- Hidden Properties بدون افشای نام می‌توانند فعال باشند؛
- UI باید forgiving و کم‌تصمیم باشد.

## 8.3 Mid-game Visibility Rules

- Heat Controllable می‌شود؛
- Counterbalance با مسئله‌ی واقعی معرفی می‌شود؛
- Stability نام‌گذاری و قابل مشاهده می‌شود؛
- Stir نقش اصلاحی پیدا می‌کند؛
- Synergy و Quality Tag وارد زبان سیستم می‌شوند.

## 8.4 Late-game Visibility Rules

- Hidden Property Stateها اهمیت بیشتری پیدا می‌کنند؛
- Target Range و چند Avoid معرفی می‌شوند؛
- Quality Tag Requirement می‌تواند وارد سفارش شود؛
- Layer D و Transformationها در Scope آینده آشکار می‌شوند؛
- UI نباید با افزودن دائمی Buttonها پیچیده شود؛ عمق باید از فهم بهتر همان اعمال اصلی ایجاد شود.

---

# 9. Cause → Effect Feedback Requirements

## 9.1 Feedback Layers

هر Action مهم می‌تواند از ترکیبی از این لایه‌ها استفاده کند:

- Motion
- Visual State Change
- Sound
- Haptic
- Short Label / Clue
- Notebook Update
- Result Explanation

همه‌ی لایه‌ها نباید برای هر عمل استفاده شوند. Feedback باید معنی‌دار و غیرتکراری باشد.

## 9.2 Feedback Matrix

| Event | Immediate Feedback | Learning Feedback | Notes |
|---|---|---|---|
| Ingredient Selected | Highlight + identity | Known properties | سریع و بدون توقف |
| Quantity Changed | Portion change + state | Quantity sensitivity clue if known | عدد خام فرمول لازم نیست |
| Grinding | Material transformation + sound + haptic | Extraction clue | Fine نباید همیشه بهتر به‌نظر برسد |
| Ingredient Added | Drop response + liquid reaction | History entry | Add باید قطعی احساس شود |
| Heat Changed | Flame/source + liquid behavior | Heat profile clue | تفاوت مواد اهمیت دارد |
| Processing Stage Changed | Liquid/steam/sound cue | Stage understanding | Timer تنها کافی نیست |
| Stir | Liquid motion + sound + haptic | Stability clue after unlock | Spam تشویق نشود |
| Synergy Triggered | کوتاه، متمایز، غیرمسدودکننده | Quality Tag clue | Discovery با Bonus خام یکی نیست |
| Hidden Effect Observed | نشانه‌ی مرموز و ثبت Clue | Unknown → Observed | نام کامل ممکن است پنهان بماند |
| Discovery Confirmed | Sound + animation + haptic | Notebook update | Flow را طولانی قطع نکند |
| Overprocessing | Warning cues from brew itself | Result explanation | فشار Reflex شدید ممنوع |
| Instability | irregular visual/audio behavior | Stability label after unlock | Randomness باید قابل ردیابی باشد |
| Bottle | پایان صریح و satisfying | Process summary | Final Pipeline Trigger |
| Customer Response | human reaction | key success + key problem | Score عددی نمایش داده نشود |

## 9.3 Feedback Priority

اگر اطلاعات زیاد شد، اولویت به‌ترتیب:

1. تغییر مهم برای تصمیم فعلی؛
2. خطر نزدیک یا فرصت Bottle؛
3. Discovery؛
4. جزئیات تکمیلی؛
5. تزئینات.

## 9.4 Haptic Requirements

**Confirmed at vision level:** Haptic محدود و معنی‌دار است.

نقاط اصلی:

1. Grinding
2. Alchemy Reaction
3. Discovery، در صورت نیاز

Haptic باید قابل خاموش‌کردن باشد. تنظیم شدت و الگو در Tactile / Audio / Haptic Pass انجام می‌شود.

---

# 10. Stability, Tension and Failure Communication

## 10.1 Stability

Player-facing labels:

- پایدار
- کمی ناپایدار
- ناپایدار
- بسیار ناپایدار

Stability متوسط نباید Potion خوب را نابود کند. UX نباید بازیکن را از ترکیب‌های خلاقانه بترساند.

## 10.2 Early Stability Communication

پیش از Unlock رسمی:

- Brew ممکن است رفتار نامنظم‌تری نشان دهد؛
- Result می‌تواند از «خوب مخلوط نشدن»، «واکنش ناسازگار» یا Clue مشابه صحبت کند؛
- اصطلاح Stability و Meter رسمی لزوماً نمایش داده نمی‌شود.

## 10.3 Tension

Balance به معنی Absence نیست. دو نیروی متضاد می‌توانند خروجی خنثی و Tension بالا ایجاد کنند.

UX باید در مراحل مناسب کمک کند بازیکن بفهمد:

- Counterbalance Effect Profile را اصلاح کرده است؛
- اما Brew ساده یا رایگان نشده است؛
- تضاد باقی‌مانده می‌تواند Stability را کاهش دهد.

عدد خام Tension در UI عادی نمایش داده نمی‌شود.

## 10.4 Failure Philosophy

شکست باید:

- قابل توضیح باشد؛
- یک علت مهم را برجسته کند؛
- امکان تصور آزمایش بعدی را بدهد؛
- همیشه به معنای نابودی کامل نباشد؛
- در Early Game بخشنده باشد؛
- و Hidden Randomness به‌نظر نرسد.

## 10.5 Failure Categories

- Goal mismatch؛
- Missing Must Have؛
- Violated Avoid؛
- Overshoot / Oversolving؛
- Unwanted Side Effect؛
- Under-extraction؛
- Overprocessing؛
- High Tension؛
- Low Stability؛
- Ingredient pollution / Everything Potion؛
- Unknown Reaction.

هر Failure Result باید حداقل Category اصلی را از طریق زبان قابل‌فهم، واکنش مشتری یا نشانه‌ی Process روشن کند.

---

# 11. Customer Evaluation UX Contract

## 11.1 Human Language First

Customer Request در زبان انسانی، ضمنی و کوتاه ارائه می‌شود. Engine آن را به Requirement Set تبدیل می‌کند، اما UI عادی فرمول داخلی را نمایش نمی‌دهد.

## 11.2 Requirement Types

UX باید بتواند در Progression مناسب این معناها را منتقل کند:

- Must Have
- Avoid
- Preferred
- Target Range

در Early Game درخواست‌ها صریح‌تر و ساده‌ترند. در Mid/Late Game می‌توانند ضمنی‌تر باشند، اما باید منصفانه باقی بمانند.

## 11.3 Smooth Evaluation

نتیجه نباید صرفاً Success/Failure دوحالته باشد. Quality Bands کیفی:

- Excellent
- Good
- Partial
- Failure

Score 0–100 در UI عادی نمایش داده نمی‌شود.

## 11.4 Oversolving Communication

پس از تأمین نیاز، افزایش شدید Property نباید با Feedback «بهتر و بهتر» تشویق شود. Result باید Profile تمیزتر را از Raw Power متمایز کند.

## 11.5 Customer as Human Debugger

واکنش مشتری باید در حد امکان دو جزء داشته باشد:

- چه چیزی مفید بود؛
- چه مشکل یا Side Effect مهمی وجود داشت.

Preferred نباید در Feedback آن‌قدر برجسته شود که Avoid جدی را بپوشاند.

## 11.6 Prototype Boundary

برای Prototype، Customer می‌تواند Functional و کم‌روایت باشد. هدف آزمون فهم سیستم است، نه کیفیت Narrative.

---

# 12. Result, Discovery and Learning Loop

## 12.1 Result Screen Responsibilities

Result باید:

1. پایان Brew را پاداش دهد؛
2. Effect Profile را قابل‌فهم کند؛
3. Discovery را برجسته کند؛
4. مهم‌ترین مشکل را نشان دهد؛
5. اقدام بعدی را روشن کند؛
6. امکان مقایسه با Goal یا Brew قبلی را فراهم کند، در صورت نیاز.

در Customer-Driven Brewing، Result پیش از تحویل فقط Knowledge شناخته‌شده‌ی کیمیاگر را نشان می‌دهد؛ Customer Feedback مرحله‌ی جداگانه‌ی اعتبارسنجی واقعی است.

در Free Experiment، Effect Profile محور Result است و Side Effect، Stability، Discovery و Process Summary لایه‌های بعدی‌اند. Quality Score عمومی نمایش داده نمی‌شود.

## 12.2 Result Information Hierarchy

ترتیب پیشنهادی اهمیت:

1. هویت Potion / Overall Outcome
2. Core Effects
3. Important Side Effects
4. Stability، در صورت Unlock
5. Quality Tags / Discoveries
6. Relation to Customer Goal
7. Process Summary
8. Actions: Deliver / Save / Retry / Repeat

Layout دقیق در Information Architecture تعیین می‌شود.

## 12.3 Discovery Event

Discovery Event باید:

- به‌صورت Micro-feedback حدود یک تا دو ثانیه باشد؛
- در خود Workspace رخ دهد و Modal مسدودکننده نباشد؛
- Sound ویژه داشته باشد؛
- Animation کوتاه داشته باشد؛
- Haptic احتمالی داشته باشد؛
- Notebook را به‌روز کند؛
- یک نشانه‌ی غیرمسدودکننده برای مشاهده‌ی جزئیات بعدی باقی بگذارد؛
- و سپس بازیکن را سریع به Flow بازگرداند.

مدت دقیق و میزان برجستگی در Prototype اعتبارسنجی می‌شوند. Discoveryهای بزرگ داستانی می‌توانند بعداً Contract جدا داشته باشند؛ این قاعده برای Discoveryهای معمول Alchemy است.

## 12.4 Observed vs Confirmed Discovery

اولین مشاهده لزوماً نام و فرمول کامل را آشکار نمی‌کند. بازیکن ممکن است فقط Clue دریافت کند.

تکرار، Recipe موفق، گزارش مشتری یا منبع دانشی می‌تواند Discovery را Confirm کند.

## 12.5 Recipe as Process Knowledge

Recipe باید این موارد را در سطح مناسب حفظ کند:

- Ingredientها؛
- Quantity هر Entry؛
- Grinding State؛
- Entry Order؛
- Heat-at-entry یا Heat changes مهم؛
- Exposure / Processing milestone؛
- Stir؛
- Bottle timing/state؛
- Result profile.

Recipe فقط فهرست مواد نیست.

## 12.6 Session Ending Goal

بهترین پایان Session یک کشف یا سؤال تازه است:

> «دفعه‌ی بعد آن ترکیب را هم امتحان می‌کنم.»

Result UX باید Next Experiment را به ذهن بازیکن بیاورد، بدون استفاده از Grind، FOMO یا اجبار.

---

# 13. Alchemy Progression Requirements

## Tier 0 — First Contact

### Visible / Controllable

- Ingredient
- ساده‌ترین Grinding Interaction
- Customer Need
- Add
- Observe
- Bottle

### Simplified / Hidden

- Heat می‌تواند Auto / Medium باشد؛
- Stability فقط Simulated است؛
- Quantity می‌تواند ثابت یا بسیار محدود باشد؛
- Side Effectها ساده و واضح‌اند.

### Goal

Fantasy پیش از System. بازیکن باید اولین Potion را سریع بسازد.

## Tier 1 — Apprentice

### Unlock

- Quantity؛
- Grinding Choice؛
- Basic Property Comparison؛
- اولین Side Effectهای قابل‌فهم.

### UX Requirement

افزایش Depth بدون افزودن صفحه‌های متعدد.

## Tier 2 — Heat & Extraction

### Unlock

- Low / Medium / High Heat؛
- Heat-sensitive و Heat-loving Behavior؛
- Clueهای Contextual، نه جدول عددی.

## Tier 3 — Counterbalance

### Experience Goal

اولین «آها!»ی جدی: حل Side Effect با Opposite Property، همراه با درک هزینه‌ی Tension.

### UX Requirement

مسئله باید راه‌حل را تحمیل نکند، اما امکان کشف آن را منصفانه فراهم کند.

## Tier 4 — Stability

### Unlock

- نام Stability؛
- Stability UI؛
- نقش اصلاحی Stir؛
- توضیح ساده‌ی Conflict / Complexity.

## Tier 5 — Synergy

### Unlock

- Interaction میان Properties؛
- Quality Tag مانند Restful؛
- Discovery Feedback مشخص.

## Tier 6 — Hidden Properties

### Unlock

- ??? و Clue در Notebook؛
- Unknown → Observed → Confirmed؛
- Process-specific discovery.

## Tier 7 — Advanced Customer Requirements

### Unlock

- Target Range؛
- چند Avoid؛
- Quality Tag Requirement؛
- درخواست‌های ضمنی‌تر ولی منصفانه.

## Tier 8 — Layer D

### Deferred from Prototype

- Rare / Mythical Ingredients؛
- Transformation؛
- سفارش‌های خاص و آزمایش‌محور.

## Tier 9 — Mastery

بازیکن همان اعمال پایه را با فهم عمیق‌تر ترکیب می‌کند. تعداد Buttonها نباید بی‌دلیل افزایش یابد.

---

# 14. Error, Recovery and Edge Cases

| Situation | UX Response | Status |
|---|---|---|
| Ingredient inspected but not used | بازگشت بدون هزینه | Confirmed UX rule |
| Quantity changed before Add | کاملاً قابل ویرایش | Confirmed UX rule |
| Grinding State changed before Add | انتخاب تا پیش از Add قابل ویرایش است؛ رفتار انیمیشن در Interaction Design تعیین می‌شود | Confirmed UX rule |
| Accidental drag near Cauldron | Drop Target امن؛ Add فقط داخل ناحیه‌ی واضح | Confirmed UX rule |
| Ingredient already added | بدون Remove عادی؛ Result از تصمیم یاد می‌دهد | Confirmed |
| Wrong Heat selected | Heat قابل تغییر؛ اثر Exposure گذشته باقی می‌ماند | Confirmed mechanically |
| Bottled too early | Under-extraction clue در Result | Confirmed concept |
| Bottled too late | Overprocessing clue در Result | Confirmed concept |
| Too many opposing ingredients | Tension / instability cues | Confirmed concept |
| Repeated Stir | اثر کاهشی و Feedback ضعیف‌تر | Confirmed concept |
| Everything Potion | Side-effect pollution + low stability + poor precision | Confirmed prototype target |
| Missing inventory | Prevent Add + explain shortage | Deferred economy detail |
| App backgrounded | Pause و حفظ State؛ بدون Processing آفلاین | Confirmed final / Deferred in Prototype |
| Player wants to abandon Brew | هشدار فقط در صورت از دست‌رفتن مواد یا State | Confirmed UX rule / Economy consequence deferred |
| Reset in Prototype | Immediate developer/player control as appropriate | Confirmed |
| Repeat Last Brew | Reproduce process for comparison | Confirmed, interaction open |
| Locked mechanic attempted | Tool/State unavailable with short progression clue | Confirmed UX rule |

## 14.1 Confirmation Dialog Rule

Confirmation Dialog فقط برای عملی استفاده شود که:

- پیامد مهم و غیرقابل بازگشت دارد؛
- احتمال انجام تصادفی آن واقعی است؛
- و طراحی Affordance به‌تنهایی کافی نیست.

اعمال پرتکرار مانند Add نباید هر بار Dialog داشته باشند.

## 14.2 Reset Rule

Prototype باید Reset Brew داشته باشد. در بازی نهایی، هزینه و دسترسی Reset به Economy و Failure Design وابسته است و در این سند Freeze نمی‌شود.

---

# 15. Mobile, Accessibility and Usability Requirements

## 15.1 Device and Orientation

**Confirmed:**

- Android + iOS
- Landscape
- Touch-first

## 15.2 Touch Requirements

- مقصدهای Drag باید بزرگ و واضح باشند؛
- Actionهای اصلی نزدیک لبه‌های نامطمئن سیستم‌عامل قرار نگیرند؛
- اطلاعات حیاتی فقط در Hover وجود نداشته باشد؛
- Gesture پنهان تنها راه انجام عمل ضروری نباشد؛
- لمس تصادفی تا حد ممکن از طریق Affordance و Safe Drop کاهش یابد؛
- UI باید در اندازه‌های مختلف گوشی خوانا باقی بماند.

## 15.3 Motor Accessibility

Grinding و Stir باید رضایت‌بخش باشند، اما به حرکت سریع، دامنه‌ی زیاد یا تکرار طولانی وابسته نباشند.

## 15.4 Sensory Redundancy

اطلاعات مهم نباید فقط با یک کانال منتقل شوند:

- Color همراه با Shape / Motion / Label؛
- Sound همراه با Visual Cue؛
- Haptic مکمل باشد، نه تنها منبع اطلاعات.

## 15.5 Text and Readability

- متن اصلی خوانا و مدرن باقی بماند؛
- خوشنویسی محدود به نقش تزئینی یا تیتر باشد؛
- هویت ایرانی نباید فهم Interaction را کاهش دهد؛
- Paragraphهای طولانی هنگام Brewing ممنوع‌اند؛
- Clueها کوتاه و Contextual باشند.

## 15.6 Cognitive Load

در هر لحظه تعداد تصمیم‌های آشکار محدود باشد. بازیکن باید بتواند بفهمد:

- اکنون چه وضعیتی دارد؛
- چه اعمالی ممکن‌اند؛
- عمل بعدی محتمل چیست؛
- و برای اطلاعات بیشتر به کجا مراجعه کند.

---

# 16. Prototype UX Scope

## 16.1 Prototype Question

> آیا Alchemy بدون Story و Art پیچیده هم لذت‌بخش است؟

## 16.2 Included UX

- 6 Ingredients؛
- 8–12 Test Customers؛
- Quantity: 0.5 / 1 / 1.5 / 2؛
- Grinding: Coarse / Crushed / Fine؛
- Heat: Low / Medium / High؛
- Ingredient Order / Exposure؛
- Processing Stages؛
- Simple Stir؛
- Bottle؛
- Result؛
- Axis Resolution Feedback در سطح Player-facing لازم؛
- Tension و Stability Feedback؛
- Customer Evaluation؛
- Reset Brew؛
- Repeat Last Brew؛
- Debug View جداگانه؛
- Placeholder visual/audio feedback برای فهم Cause → Effect.

## 16.3 Excluded UX

- Story کامل؛
- Bazaar؛
- Garden؛
- Economy کامل؛
- Reputation / Factions؛
- Shop upgrades؛
- Mythical / Rare Content؛
- Full Hidden Property System؛
- Layer D؛
- Monetization؛
- Full Save / Progression؛
- Final Art؛
- Final Animation؛
- Final Sound / Haptic polish.

## 16.4 Prototype Acceptance Criteria

یک تستر Blind باید بتواند:

1. هدف Customer ساده را شناسایی کند؛
2. Ingredient را Inspect و انتخاب کند؛
3. Quantity را تغییر دهد؛
4. Grinding State را انتخاب و اجرا کند؛
5. Ingredient را Add کند؛
6. Heat را تغییر دهد؛
7. Processing را مشاهده کند؛
8. Stir کند؛
9. Bottle کند؛
10. Result را بفهمد؛
11. علت اصلی شکست را حدس بزند؛
12. یک تغییر معنادار برای آزمایش بعدی پیشنهاد کند.

## 16.5 Prototype Observation Questions

- تستر ابتدا کجا را لمس می‌کند؟
- آیا Goal را فراموش می‌کند؟
- آیا Fine را همیشه بهترین Grinding می‌داند؟
- آیا High Heat را همیشه بهتر فرض می‌کند؟
- آیا می‌فهمد چرا Order اهمیت دارد؟
- آیا Stage آماده‌بودن را تشخیص می‌دهد؟
- آیا Stir را Spam می‌کند؟
- آیا Bottle برایش تصمیمی روشن است؟
- آیا Failure را Random می‌داند؟
- آیا راه‌حل جایگزین می‌سازد؟
- آیا «آها!» رخ می‌دهد؟
- آیا داوطلبانه Experiment دیگری انجام می‌دهد؟

## 16.6 Debug View Boundary

Debug View باید از Player UI جدا باشد و نشان دهد:

- Base Contribution؛
- Quantity Factor؛
- Grinding Factor؛
- Heat / Exposure Factor؛
- Final Contribution؛
- Raw vs Resolved Axes؛
- Tension؛
- Complexity؛
- Process Error؛
- Stir Correction؛
- Stability؛
- Requirement Match؛
- Final Evaluation.

Player UI نباید به‌دلیل نیاز Debug شلوغ شود.

---

# 17. Product Decisions and Prototype Hypotheses

## Resolved Foundational Decisions — v0.2

### D-01 — Workspace Model

مدل رسمی **Persistent Contextual Workspace** است.

### D-02 — Time During Overlays

Overlayهای تصمیم‌گیری Processing را در Pause / Safe State قرار می‌دهند.

### D-03 — Known Recipe Automation

حالت پایه **Guided Recreation** است. Quick Brew فقط در صورت اثبات نیاز ضد-Grind در Playtest بررسی می‌شود.

### D-04 — Ingredient Irreversibility

Ingredient پس از Add قابل خارج‌کردن نیست. پیش از Add و محدوده‌ی Drop باید امن و قابل کنترل باشد.

### D-05 — Live Effect Visibility

Effect Profile به‌تدریج از Sensory Clue به Profile کیفی مبتنی بر Knowledge آشکار می‌شود و World Truth را افشا نمی‌کند.

### D-06 — Interrupted Brew

در نسخه‌ی نهایی، Brew هنگام خروج Pause و حفظ می‌شود و Processing آفلاین ادامه پیدا نمی‌کند. Prototype فقط به Pause / Reset نیاز دارد.

## Resolved Pre-IA Information Decisions — v0.3

### D-07 — Goal Persistence

خلاصه‌ی فشرده‌ی Goal همیشه دیده می‌شود و متن کامل با یک Action سریع باز می‌شود.

### D-08 — Process History Depth

Ingredient Order به‌شکل خلاصه قابل مشاهده است و Inspect هر Entry جزئیات Quantity، Grinding و Heat-at-entry را نشان می‌دهد.

### D-09 — Result Before Customer

بازیکن Result شناخته‌شده‌ی Potion را پیش از تحویل می‌بیند؛ Customer Feedback تطبیق واقعی و پیامدهای ناشناخته را آشکار می‌کند.

### D-10 — Free Experiment Result

Effect Profile محور Result است؛ Side Effect، Stability، Discovery و Process Summary لایه‌های بعدی‌اند و Quality Score عمومی وجود ندارد.

## Selected Prototype Hypotheses — v1.0 Candidate

### PH-01 — Processing Feedback Granularity

Feedback کلی Cauldron منبع اصلی است و Status هر Entry فقط با Inspect یا Process History آشکار می‌شود.

### PH-02 — Stir Interaction Length

یک یا دو دور حرکت دایره‌ای کوتاه، یک Stir Action گسسته ثبت می‌کند؛ سرعت، جهت و شدت مکانیک جدا ندارند.

### PH-03 — Bottle Affordance

Drag بطری خالی به Bottling Point و Drop صحیح، Auto-fill و Final Pipeline را آغاز می‌کند.

### PH-04 — Discovery Interruption Budget

Discovery معمولی Micro-feedback غیرمسدودکننده‌ی حدود یک تا دو ثانیه دارد و جزئیات بعداً On-demand قابل مشاهده‌اند.

این چهار مورد برای Graybox Prototype جهت اجرایی دارند، اما Timing، Threshold، خوانایی و حس نهایی آن‌ها Freeze نشده است.

---

# 18. UX Audit Checklist

**Audit Result:** Passed at definition level on 2026-08-22. موارد مربوط به حس، Timing و Affordance همچنان نیازمند Graybox Validation هستند.

## Alignment

- [x] Alchemy از Story مستقل و جذاب باقی مانده است.
- [x] Curiosity بر Grind اولویت دارد.
- [x] System Understanding بر Reflex اولویت دارد.
- [x] Precision بر Raw Power اولویت دارد.
- [x] Core Alchemy Freeze نقض نشده است.

## Clarity

- [x] بازیکن هدف فعلی را می‌فهمد.
- [x] Actionهای ممکن در Contract قابل کشف تعریف شده‌اند؛ اجرای آن در IA/Wireframe تست می‌شود.
- [x] Cause → Effect برای هر Action تعریف شده است.
- [x] Unknown با Zero اشتباه نمی‌شود.
- [x] Failure حداقل یک درس می‌دهد.

## Complexity

- [x] همه‌ی اطلاعات هم‌زمان نمایش داده نمی‌شوند.
- [x] هر Mechanic در زمان مناسب آشکار می‌شود.
- [x] عمق از فهم بهتر اعمال پایه ایجاد می‌شود.
- [x] Button و Mode غیرضروری اضافه نشده است.

## Touch and Feel

- [x] تعامل Touch-first است.
- [x] Drag مقصد واضح و Safe Drop لازم دارد.
- [x] Grinding و Stir کوتاه تعریف شده‌اند؛ رضایت‌بخشی در Prototype سنجیده می‌شود.
- [x] Haptic محدود و معنی‌دار است.
- [x] Gesture دشوار یا پنهان الزامی نیست.

## Learning

- [x] Knowledge State از World Truth جداست.
- [x] Discovery Flow را طولانی قطع نمی‌کند.
- [x] Result اقدام بعدی یا سؤال بعدی می‌سازد.
- [x] Customer Feedback موفقیت و مشکل را منتقل می‌کند.

## Prototype

- [x] Scope به 6 Ingredient و 8–12 Customer محدود است.
- [x] Debug View از Player UI جداست.
- [x] Reset و Repeat تعریف شده‌اند.
- [x] Acceptance Criteria قابل مشاهده و تست‌پذیرند.

---

# 19. Inputs for the Next Milestone

با تکمیل Audit و Freeze شدن این سند به‌عنوان v1.0 Candidate، مرحله‌ی Information Architecture باید تعیین کند:

- چه Information Objectهایی وجود دارند؛
- هر Object در کدام Context قابل دسترسی است؛
- چه چیزهایی Persistent، Contextual، Overlay یا Result-only هستند؛
- رابطه‌ی Workspace، Ingredient Browser، Goal، Notebook، Process History و Result چیست؛
- اولویت اطلاعات روی Mobile Landscape چگونه است.

Information Architecture نباید تصمیم‌های این سند را دوباره باز کند؛ باید آن‌ها را سازمان‌دهی کند.

---

# 20. Decision Log

## Confirmed Before v0.1

- Core Alchemy v1.0 Candidate ساختاری Freeze است.
- پلتفرم Mobile Android/iOS و Orientation افقی است.
- Touch و Drag تعامل‌های غالب‌اند.
- Player-facing Brewing Loop شامل Select → Quantity → Grind → Add → Heat → Observe → Add Next → Stir → Bottle → Result است.
- تصمیم‌ها می‌توانند مرحله‌ای باشند.
- Property language عمدتاً کیفی است.
- Stability از ابتدا Simulated ولی به‌تدریج Observable و Controllable می‌شود.
- Hidden Complexity نباید Hidden Randomness باشد.
- Discovery State شامل Unknown → Observed → Confirmed است.
- Customer Score خام نمایش داده نمی‌شود.
- Customer Reaction باید نقش Human Debugger داشته باشد.
- Prototype شامل Reset، Repeat و Debug View است.
- Visual Design و Asset Production در این مرحله انجام نمی‌شود.

## Confirmed in v0.2

- Persistent Contextual Workspace به‌عنوان مدل رسمی؛
- Pause / Safe State هنگام Overlayهای تصمیم‌گیری؛
- Add Ingredient به‌عنوان تصمیم غیرقابل Undo پس از Drop؛
- Guided Recreation برای Recipe شناخته‌شده؛
- Live Effect Visibility به‌صورت تدریجی و وابسته به Knowledge؛
- Pause و حفظ Interrupted Brew در نسخه‌ی نهایی، بدون Processing آفلاین.

## Confirmed in v0.3

- Goal Summary فشرده و دائمی، همراه با دسترسی سریع به متن کامل؛
- Process History لایه‌ای با Order خلاصه و Detail هر Entry؛
- Known Potion Result پیش از تحویل و Customer Feedback به‌عنوان آزمون واقعی؛
- Free Experiment Result چندلایه و بدون Quality Score عمومی.

## Selected for Prototype in v1.0 Candidate

- Feedback کلی Cauldron همراه با Entry Detail در Inspect / Process History؛
- Stir کوتاه یک یا دو دوری به‌عنوان Action گسسته؛
- Drag Bottle به Bottling Point و Auto-fill؛
- Discovery Micro-feedback غیرمسدودکننده‌ی یک تا دو ثانیه‌ای.

## Confirmed UX Requirements

- Feedback چندکاناله و غیرعددی؛
- Sensory Redundancy؛
- Accessibility پایه برای Touch و حرکت؛
- Hold فقط به‌عنوان میان‌بُر غیرحیاتی؛
- Safe Drop و نبود Confirmation Dialog پرتکرار.

## Deferred

- Layout و Navigation دقیق؛
- User Flow diagrams؛
- Wireframes؛
- Interaction timing و gesture tuning؛
- Visual style application؛
- Final tactile/audio/haptic design؛
- Programmer Handoff؛
- Economy cost of failure/reset؛
- Full Customer and Notebook UX.

---

# 21. Definition of Done for This Document

این سند زمانی از Draft به **Core Alchemy UX Definition v1.0 Candidate** تبدیل می‌شود که:

1. همه‌ی Foundational Decisionها پاسخ داده شده باشند؛ **Completed in v0.2**
2. Priority Bها برای Information Architecture تصمیم اولیه داشته باشند؛ **Completed in v0.3**
3. Action Contractهای Core Loop تأیید شده باشند؛
4. Visibility Rules با Alchemy Progression سازگار باشند؛
5. Failure و Discovery Contract روشن باشند؛
6. Prototype Acceptance Criteria نهایی شده باشند؛
7. UX Audit انجام شده باشد؛
8. موارد نیازمند Prototype Validation جدا ثبت شده باشند؛
9. هیچ تصمیمی خارج از Scope بی‌صدا وارد Core نشده باشد؛
10. Next Milestone رسماً Information Architecture ثبت شود.

**Status:** Items 1–10 completed at definition level on 2026-08-22. چهار Prototype Hypothesis و تمام موارد حسی/زمانی تا زمان Graybox Validation مشروط باقی می‌مانند.

## 21.1 Freeze Policy

- این سند از این نقطه **v1.0 Candidate** و Source of Truth برای مراحل بعدی Alchemy UX است؛
- IA، User Flow، Wireframe و Interaction Design باید از این Contract پیروی کنند؛
- تغییر Structural UX فقط با مسئله‌ی روشن در مراحل پایین‌دستی یا شواهد Prototype / Playtest انجام می‌شود؛
- Timing، Threshold، Layout و Visual Treatment هنوز Freeze نیستند؛
- ایده‌های تازه‌ی خارج از Scope ابتدا به UX Backlog یا Change Proposal می‌روند.
