# 07 --- Alchemy Technical Specification

## 1. Goal

این سند Domain Model و Calculation Contract را تعریف می‌کند؛
Implementation نهایی Godot باید این مرزبندی را حفظ کند، اما لازم نیست
نام کلاس‌ها دقیقاً همین باشد.

## 2. Core Entities

### PropertyDefinition

تعریف Property؛ مقدار Runtime ندارد. Fields: - id - display_name - type:
axis_side \| independent - axis_id? - opposite_property_id? - display
thresholds

### AxisDefinition

-   id
-   positive_property
-   negative_property

### IngredientDefinition

-   id/name
-   rarity/cost
-   handling_complexity
-   base property values
-   grinding modifiers
-   heat modifiers
-   hidden property hooks
-   tags

### IngredientInstance

-   definition_id
-   quality
-   inventory quantity
-   source

### BrewIngredientEntry

-   ingredient reference
-   quantity
-   grind_state
-   entry_order
-   heat_at_entry
-   exposure
-   extracted contributions

### BrewState

Runtime mutable state: - entries - current_heat - process_stage -
process_history - raw contributions - resolved axes - tension -
instability/stability - activated rules - discovery events

### ProcessEvent

-   type
-   step/time marker
-   relevant payload

### PotionResult

Immutable final result: - ingredients - process_history - raw/effective
properties - resolved axes - quality tags - hidden properties -
triggered reactions - tension - stability - final effect profile -
optional recipe reference

## 3. Supporting Entities

### ReactionRule

Conditions + Results + Discovery behavior.

### CustomerRequirementSet

MustHave / Avoid / Preferred / TargetRange + critical flags.

### KnowledgeState

Player knowledge، جدا از World Truth.

### RecipeDefinition

Process History موفق + ingredient/process parameters + player-given
name.

## 4. Critical Separations

-   Definition ≠ Runtime State
-   World Truth ≠ Player Knowledge
-   BrewState ≠ PotionResult
-   Mechanical State ≠ UI Visibility

## 5. Calculation Pipeline

1.  Read Brew Entries
2.  Calculate per-property extraction
3.  Aggregate raw contributions
4.  Resolve axes
5.  Activate hidden properties
6.  Evaluate synergy
7.  Evaluate Layer D
8.  Recalculate affected axes
9.  Calculate tension
10. Calculate stability
11. Produce PotionResult
12. Evaluate against CustomerRequirementSet

## 6. Formula Contract

Per contribution conceptually:
`Contribution = Base × QuantityFactor × GrindingFactor × Heat/ExposureFactor × QualityFactor`

Axis: `Resolved = SideA - SideB`

Tension: `AxisTension = min(SideA, SideB)`

Stability starting model:
`Instability = Complexity + TensionCost + ProcessError - StirCorrection`

## 7. Data-driven Boundary

Balance/content values باید خارج از hard-coded gameplay logic باشند.
تغییر Base Property یا Heat Modifier نباید نیازمند تغییر کد Engine باشد.

در عین حال Prototype نباید با Universal Framework بیش از نیاز
Overengineer شود.

## 8. Debug Requirement

Alchemy Debug View برای Prototype Mandatory است و باید نشان دهد: -
Base - Quantity factor - Grinding factor - Heat/exposure factor - final
contribution - raw vs resolved axes - tension - complexity - process
error - stir correction - stability - customer requirement match - final
evaluation

Developer controls: - Reset Brew - Repeat Last Brew

## 9. Godot Handoff Note

پیشنهاد معماری: Definitionها به‌صورت data/resource assets و Runtime
Stateها جدا باشند. تصمیم دقیق implementation پس از شروع Prototype با
برنامه‌نویس گرفته شود.
