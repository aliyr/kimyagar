# 08 --- Prototype Scope & Balance

## 1. Prototype Question

> آیا Alchemy بدون Story و Art پیچیده هم لذت‌بخش است؟

Prototype نسخه‌ی کوچک بازی نهایی نیست؛ آزمایشگاه Core Design است.

## 2. Questions to Validate

1.  آیا ترکیب مواد نیاز به فکر دارد؟
2.  آیا Experiment لذت‌بخش است؟
3.  آیا شکست قابل‌فهم است؟
4.  آیا Grinding/Heat/Quantity واقعاً تصمیم ایجاد می‌کنند؟
5.  آیا چند Solution معتبر وجود دارد؟
6.  آیا بازیکن حس می‌کند خودش چیزی کشف کرده؟
7.  آیا بعد از حل مسئله میل دارد آزمایش دیگری انجام دهد؟

## 3. Scope

### Include

-   6 Ingredients
-   حدود 11 Property مورد نیاز
-   Quantity: 0.5 / 1 / 1.5 / 2
-   Grinding: Coarse / Crushed / Fine
-   Heat: Low / Medium / High
-   Ingredient order/exposure
-   Simple Stir
-   Bottle
-   Axis resolution
-   Internal tension
-   Stability
-   Customer evaluation
-   8 functional customers + تا 4 stress-test customer
-   Data-driven definitions
-   Debug View
-   Reset/Repeat

### Exclude

-   Full Story
-   Bazaar واقعی
-   Garden
-   Economy کامل
-   Reputation/Factions
-   Shop upgrades
-   Mythical/Rare content
-   Full Hidden Property system
-   Layer D
-   Monetization
-   Full progression/save
-   polished final art

## 4. Prototype Ingredient Numbers

### Chamomile

Calm 3.0 / Sleep 2.0 / Warm 0.6\
Complexity 0.03\
Forgiving heat profile.

### Borage (گل گاوزبان)

Calm 2.4 / Joy 0.8 / Sleep 0.7 / Warm 0.5\
Complexity 0.04\
Cleaner but intended to be more costly/less available than chamomile.

### Mint

Wake 2.4 / Cold 2.2 / Focus 1.0 / Pain 0.6\
Complexity 0.06\
Heat-sensitive.

### Saffron

Joy 3.0 / Focus 2.1 / Warm 1.5 / Excitement 0.6\
Complexity 0.08\
Quantity-sensitive.

### Poppy

Pain 3.3 / Sleep 3.0 / Weakness 2.0 / Calm 0.7\
Complexity 0.10\
Grinding-sensitive. Crushed approximately: Pain ×0.95, Sleep ×0.60,
Weakness ×0.50.

### Ginger

Warm 3.0 / Strength 2.2 / Wake 0.6 / Excitement 0.5\
Complexity 0.06\
Heat-loving; High Heat Excitement target \~×2.2.

## 5. Quantity Curve

    Qty   Factor
  ----- --------
    0.5     0.60
    1.0     1.00
    1.5     1.40
    2.0     1.70
    3.0     2.15
    4.0     2.40

Prototype UI initially needs only up to 2.0.

## 6. Balance Findings

### Chamomile vs Borage

Mechanical overlap acceptable only if Economy/Availability creates a
meaningful choice.

### Poppy

Selective Grinding currently behaves as desired: raw Fine is powerful
but dirty; Crushed preserves Pain while reducing Sleep/Weakness.

### Mint Counterbalance

Do not nerf solely because Wake counters Sleep strongly. Tension and
Stability are part of the cost. Watch for universal-correction behavior
in playtest.

### Saffron

Quantity sensitivity behaves as desired: extra quantity can increase
Focus but push Excitement outside target.

### Ginger

Initial High Heat downside was too weak; Excitement high-heat modifier
should be stronger (\~×2.2 starting point).

### Everything Potion

Must fail to dominate due to: - complexity - multiple axis tensions -
side-effect pollution - low stability

If it remains Good/Excellent for many customers, the system requires
adjustment.

## 7. Playtest Method

اولین UX tester نباید طراحی و فرمول‌ها را بداند. مسئله را بدهید و مشاهده
کنید: - چه چیزی را انتخاب می‌کند؟ - علت شکست را می‌فهمد؟ - آیا راه‌حل
جایگزین می‌سازد؟ - آیا «آها!» رخ می‌دهد؟ - آیا خودش آزمایش اضافه انجام
می‌دهد؟

## 8. Success Criteria

-   Understandability
-   Agency
-   Discovery
-   Desire to Experiment

## 9. Definition of Done

Player can: Customer → Ingredient → Quantity → Grind → Add → Heat → Stir
→ Bottle → Result

Engine can: Contribution → Axis → Tension → Stability → Customer
Evaluation

Debug View can explain **why**.
