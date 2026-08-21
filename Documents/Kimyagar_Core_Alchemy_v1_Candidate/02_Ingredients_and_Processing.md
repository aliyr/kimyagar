# 02 --- Ingredients & Processing

## 1. Ingredient Definition

هر Ingredient حداقل شامل: - id / name - rarity - cost - handling
complexity - base properties - grinding profile - heat profile -
optional hidden properties - optional tags / reaction hooks

## 2. Ingredient Instance

Definition از Instance جداست. Instance می‌تواند Quality، Quantity و
Source متفاوت داشته باشد.

Quality روی نتیجه اثر دارد. Spoilage وجود ندارد.

## 3. Quantity

Quantity باید اثر معنادار ولی Diminishing داشته باشد.

Prototype curve: \| Quantity \| Factor \| \|---:\|---:\| \| 0.5 \| 0.60
\| \| 1.0 \| 1.00 \| \| 1.5 \| 1.40 \| \| 2.0 \| 1.70 \| \| 3.0 \| 2.15
\| \| 4.0 \| 2.40 \|

برخی Ingredients می‌توانند Quantity-sensitive باشند و در مقدار بالا Side
Effect سریع‌تری تولید کنند.

## 4. Grinding

Prototype states: - Coarse - Crushed - Fine

Grinding صرفاً «قدرت بیشتر» نیست. مهم‌ترین کاربرد آن **Selective
Extraction** است: Propertyهای مختلف یک ماده می‌توانند در Grind Stateهای
مختلف با نرخ متفاوت آزاد شوند.

مثال کلیدی: خشخاش Crushed می‌تواند Pain Relief زیادی استخراج کند، در حالی
که Sleep و Weakness کمتر از Fine استخراج شوند.

## 5. Heat

Prototype states: - Low - Medium - High

Heat باید Ingredient Personality ایجاد کند: - Mint: Heat Sensitive -
Ginger: Heat Loving - Chamomile: Forgiving

Heat Upgrade خطی نیست؛ High نباید همیشه بهتر باشد.

## 6. Order

Order Bonus مستقل ندارد. اهمیت ترتیب از این‌ها می‌آید: - Exposure
Duration - Heat-at-entry - Processing Context

Early addition معمولاً Processing بیشتری می‌بیند؛ Late addition می‌تواند
Propertyهای ظریف را حفظ کند.

## 7. Processing Stages

Time وجود دارد، ولی Reflex Challenge نیست: - Fresh - Extracting -
Ready - Overprocessed

Early Game باید forgiving باشد و Ready window بزرگ باشد.

## 8. Prototype Ingredient Profiles

### بابونه

Role: Calm/Sleep, forgiving\
Base: Calm 3.0, Sleep 2.0, Warm 0.6\
Complexity: 0.03

### گل گاوزبان

Role: cleaner Calm alternative\
Base: Calm 2.4, Joy 0.8, Sleep 0.7, Warm 0.5\
Complexity: 0.04\
Trade-off با بابونه بیشتر از طریق Economy/Availability ایجاد می‌شود.

### نعناع

Role: Wake/Cold/Focus + correction ingredient\
Base: Wake 2.4, Cold 2.2, Focus 1.0, Pain Relief 0.6\
Heat-sensitive.\
Complexity: 0.06

### زعفران

Role: Joy/Focus/Warm; quantity-sensitive\
Base: Joy 3.0, Focus 2.1, Warm 1.5, Excitement 0.6\
در Quantity بالا Excitement سریع‌تر رشد می‌کند.\
Complexity: 0.08

### خشخاش

Role: Pain/Sleep with trade-offs; grinding-sensitive\
Base: Pain 3.3, Sleep 3.0, Weakness 2.0, Calm 0.7\
Crushed profile approximately: Pain ×0.95, Sleep ×0.60, Weakness ×0.50.\
Complexity: 0.10

### زنجبیل

Role: Warm/Strength; heat-loving\
Base: Warm 3.0, Strength 2.2, Wake 0.6, Excitement 0.5\
High Heat strengthens useful effects but increases Excitement
significantly. Prototype target for Excitement high-heat modifier:
\~×2.2.\
Complexity: 0.06

## 9. Design Rule

Process Mastery باید بتواند Profile یک ماده را تغییر دهد؛ نه اینکه فقط
همه‌ی اعداد را بیشتر کند.
