/**
 * قرارداد مشترک دامنه‌ی موتور کیمیاگری — Kimyagar Core Alchemy.
 *
 * این فایل توسط Agent اصلی (Phase 0) نوشته شده و «قرارداد» بین
 * Workstream ها است. تغییر امضاهای عمومی فقط با هماهنگی Agent اصلی مجاز است.
 *
 * مرجع: Documents/Kimyagar_Core_Alchemy_v1_Candidate/07_Alchemy_Technical_Spec.md
 */

// ---------------------------------------------------------------------------
// شناسه‌ها و مقادیر گسسته
// ---------------------------------------------------------------------------

export type PropertyId =
  | 'calm'
  | 'excitement'
  | 'sleep'
  | 'wake'
  | 'warm'
  | 'cold'
  | 'strength'
  | 'weakness'
  | 'focus'
  | 'distract'
  | 'pain_relief'
  | 'joy';

export type AxisId = string;
export type IngredientId = string;
export type CustomerId = string;
export type QualityTagId = string;

export type GrindState = 'coarse' | 'crushed' | 'fine';
export type HeatLevel = 'low' | 'medium' | 'high';
/** مقادیر مجاز Prototype */
export type Quantity = 0.5 | 1 | 1.5 | 2;

export type ProcessStage = 'fresh' | 'extracting' | 'ready' | 'overprocessed';

export type QualityBand = 'excellent' | 'good' | 'partial' | 'failure';

export type StabilityLabel =
  | 'stable' // پایدار
  | 'slightly_unstable' // کمی ناپایدار
  | 'unstable' // ناپایدار
  | 'very_unstable'; // بسیار ناپایدار

/** برچسب کیفی Player-facing — عدد خام به بازیکن نمایش داده نمی‌شود */
export type QualitativeLevel = 'none' | 'low' | 'medium' | 'high' | 'very_high';

// ---------------------------------------------------------------------------
// Definition ها (Data-driven، بدون State زمان اجرا)
// ---------------------------------------------------------------------------

export interface PropertyDefinition {
  id: PropertyId;
  nameFa: string;
  type: 'axis_side' | 'independent';
  axisId?: AxisId;
  oppositePropertyId?: PropertyId;
  /** آستانه‌های برچسب کیفی: مقدار >= هر آستانه آن سطح را می‌دهد */
  thresholds: { low: number; medium: number; high: number; veryHigh: number };
}

export interface AxisDefinition {
  id: AxisId;
  nameFa: string;
  positiveProperty: PropertyId;
  negativeProperty: PropertyId;
}

/** ضریب هر Property؛ property هایی که نیستند ضریب ۱ دارند */
export type PropertyMultipliers = Partial<Record<PropertyId, number>>;

export interface IngredientDefinition {
  id: IngredientId;
  nameFa: string;
  nameEn: string;
  /** توضیح کوتاه برای Inspect (بدون افشای World Truth) */
  flavorFa: string;
  /** رنگ پایه برای مایع پاتیل و placeholder ها */
  color: string;
  complexity: number;
  baseProperties: PropertyMultipliers;
  /** Selective Extraction: ضرایب هر Grind State (پیش‌فرض ۱) */
  grindingModifiers: Partial<Record<GrindState, PropertyMultipliers>>;
  /** ضرایب حرارت (پیش‌فرض ۱) — مثال: زنجبیل high → excitement ×2.2 */
  heatModifiers: Partial<Record<HeatLevel, PropertyMultipliers>>;
  quantitySensitive?: boolean;
  /** Clue های کیفی که با کشف در Notebook دیده می‌شوند */
  cluesFa?: string[];
}

export interface QuantityCurvePoint {
  quantity: number;
  factor: number;
}

export interface QualityTagRule {
  id: QualityTagId;
  nameFa: string;
  /** همه‌ی شرط‌ها باید روی Effect Profile نهایی برقرار باشند */
  conditions: { propertyId: PropertyId; atLeast: number }[];
  /** متن Micro-feedback کشف (۱-۲ ثانیه) */
  discoveryFa: string;
}

// ---------------------------------------------------------------------------
// مشتری و ارزیابی
// ---------------------------------------------------------------------------

export type RequirementKind = 'must_have' | 'avoid' | 'preferred';

export interface CustomerRequirement {
  kind: RequirementKind;
  propertyId: PropertyId;
  /** must_have/preferred: حداقل لازم — avoid: حداکثر مجاز */
  threshold: number;
  direction: 'at_least' | 'at_most';
  critical?: boolean;
  /** بازخورد انسانی وقتی برآورده شد / نشد */
  metFeedbackFa: string;
  unmetFeedbackFa: string;
}

export interface CustomerDefinition {
  id: CustomerId;
  nameFa: string;
  /** متن کامل درخواست به زبان انسانی */
  requestFa: string;
  /** خلاصه‌ی فشرده برای نمایش دائمی بالا-راست */
  summaryFa: string;
  requirements: CustomerRequirement[];
  /** Tag هایی که برای این مشتری Bonus دارند (مثل restful برای مشتری خواب) */
  preferredTags?: QualityTagId[];
  /** شکل ظاهری مشتری (کلید لایه‌ی هنری) */
  appearance: string;
}

export interface RequirementOutcome {
  requirement: CustomerRequirement;
  /** مقدار مؤثر در Potion */
  actualValue: number;
  satisfaction: number; // 0..1 (Smooth Evaluation)
  satisfied: boolean;
}

export interface CustomerEvaluation {
  customerId: CustomerId;
  /** Debug-only — هرگز در UI عادی نمایش داده نمی‌شود */
  score: number;
  band: QualityBand;
  perRequirement: RequirementOutcome[];
  sideEffectPenalty: number;
  stabilityModifier: number;
  tagBonus: number;
  /** واکنش انسانی: حداقل یک موفقیت + یک مشکل مهم */
  reactionFa: string;
  keySuccessFa: string | null;
  keyProblemFa: string | null;
}

// ---------------------------------------------------------------------------
// Runtime State (BrewState) — از Definition جدا
// ---------------------------------------------------------------------------

export interface BrewEntry {
  id: string;
  ingredientId: IngredientId;
  quantity: Quantity;
  grindState: GrindState;
  entryOrder: number;
  heatAtEntry: HeatLevel;
  /** واحد Exposure انباشته (وابسته به زمان × نرخ حرارت) */
  exposure: number;
  stage: ProcessStage;
  /** Contribution فعلی استخراج‌شده به ازای هر Property */
  contributions: Partial<Record<PropertyId, number>>;
}

export type ProcessEventType =
  | 'ingredient_added'
  | 'heat_changed'
  | 'stirred'
  | 'bottled'
  | 'brew_reset';

export interface ProcessEvent {
  type: ProcessEventType;
  atTime: number;
  payload?: Record<string, unknown>;
}

export interface BrewState {
  entries: BrewEntry[];
  currentHeat: HeatLevel;
  /** ثانیه‌های فعال Brew (در Pause / Safe State جلو نمی‌رود) */
  elapsedTime: number;
  stirCount: number;
  stirCorrection: number;
  history: ProcessEvent[];
  bottled: boolean;
}

// ---------------------------------------------------------------------------
// نتیجه‌ی نهایی (Immutable)
// ---------------------------------------------------------------------------

export interface ResolvedAxis {
  axisId: AxisId;
  sideAProperty: PropertyId;
  sideBProperty: PropertyId;
  sideA: number;
  sideB: number;
  /** Resolved = SideA − SideB */
  resolved: number;
  dominantProperty: PropertyId | null;
  /** Tension = min(SideA, SideB) */
  tension: number;
}

export interface DebugContribution {
  entryId: string;
  ingredientId: IngredientId;
  propertyId: PropertyId;
  base: number;
  quantityFactor: number;
  grindingFactor: number;
  heatExposureFactor: number;
  final: number;
}

export interface DebugBreakdown {
  contributions: DebugContribution[];
  rawAxes: ResolvedAxis[];
  totalTension: number;
  complexity: number;
  tensionCost: number;
  processError: number;
  stirCorrection: number;
  baseInstability: number;
  finalInstability: number;
  stability: number;
}

export interface DiscoveryEvent {
  id: string;
  kind: 'quality_tag' | 'ingredient_clue';
  textFa: string;
}

export interface PotionResult {
  /** Snapshot ورودی‌ها و تاریخچه در لحظه‌ی Bottle */
  entries: BrewEntry[];
  history: ProcessEvent[];
  /** جمع خام Contribution ها قبل از Axis Resolution */
  rawContributions: Partial<Record<PropertyId, number>>;
  /**
   * Effect Profile نهایی: برای هر Axis فقط سمت غالب با مقدار Resolved،
   * به‌علاوه‌ی Property های Independent.
   */
  effectProfile: Partial<Record<PropertyId, number>>;
  resolvedAxes: ResolvedAxis[];
  totalTension: number;
  stability: number; // 0..1
  stabilityLabel: StabilityLabel;
  qualityTags: QualityTagId[];
  discoveries: DiscoveryEvent[];
  debug: DebugBreakdown;
}

// ---------------------------------------------------------------------------
// Tuning (Balance data — خارج از کد Engine)
// ---------------------------------------------------------------------------

export interface TuningConfig {
  quantityCurve: QuantityCurvePoint[];
  /** نرخ Exposure بر ثانیه به ازای هر Heat */
  heatExposureRate: Record<HeatLevel, number>;
  /** آستانه‌های Exposure برای Stage ها — پنجره‌ی Ready باید بخشنده باشد */
  stageThresholds: { extracting: number; ready: number; overprocessed: number };
  /** کسر استخراج‌شده در ابتدای هر Stage (fresh → ready => 1.0) */
  extractionFraction: { fresh: number; extracting: number; ready: number };
  /** TensionCost = TotalTension × این ضریب (شروع: 0.08) */
  tensionCostFactor: number;
  /** تصحیح Stir با Diminishing Returns (شروع: [0.15, 0.08, 0.03]) */
  stirCorrections: number[];
  /** مقسوم‌علیه normalized() در فرمول Stability */
  instabilityNormalization: number;
  /** منحنی Quality Modifier بر اساس Stability (نقاط، درون‌یابی خطی) */
  stabilityQualityCurve: { stability: number; modifier: number }[];
  /** آستانه‌های Band: >=excellent, >=good, >=partial وگرنه failure */
  bandThresholds: { excellent: number; good: number; partial: number };
  /** جریمه‌ی ProcessError برای Entry های Bottle شده در Stage نامناسب */
  processErrorPenalty: { fresh: number; extracting: number; overprocessed: number };
  /** وزن‌های ارزیابی مشتری */
  evaluationWeights: {
    mustHave: number;
    avoid: number;
    preferredBonus: number;
    tagBonus: number;
    sideEffectPenaltyPerUnit: number;
    /** آستانه‌ای که Side Effect ناخواسته از آن به بعد جریمه می‌گیرد */
    sideEffectFreeThreshold: number;
  };
}

// ---------------------------------------------------------------------------
// بسته‌ی کامل Definition ها
// ---------------------------------------------------------------------------

export interface AlchemyDefinitions {
  properties: PropertyDefinition[];
  axes: AxisDefinition[];
  ingredients: IngredientDefinition[];
  customers: CustomerDefinition[];
  qualityTags: QualityTagRule[];
  tuning: TuningConfig;
}

// ---------------------------------------------------------------------------
// امضای عمومی Engine — پیاده‌سازی در Workstream A (همه Pure Function)
// ---------------------------------------------------------------------------

export interface AlchemyEngineApi {
  createBrew(): BrewState;
  addIngredient(
    state: BrewState,
    ingredientId: IngredientId,
    quantity: Quantity,
    grindState: GrindState,
    defs: AlchemyDefinitions,
  ): BrewState;
  setHeat(state: BrewState, heat: HeatLevel, defs: AlchemyDefinitions): BrewState;
  stir(state: BrewState, defs: AlchemyDefinitions): BrewState;
  /** پیشروی زمان فعال Brew — Exposure، Stage و Contribution ها را به‌روز می‌کند */
  advanceTime(state: BrewState, dtSeconds: number, defs: AlchemyDefinitions): BrewState;
  /** اجرای Final Pipeline و تولید PotionResult تغییرناپذیر */
  bottle(state: BrewState, defs: AlchemyDefinitions): PotionResult;
  evaluate(
    result: PotionResult,
    customer: CustomerDefinition,
    defs: AlchemyDefinitions,
  ): CustomerEvaluation;
  /** برچسب کیفی یک مقدار برای یک Property */
  qualitativeLevel(value: number, property: PropertyDefinition): QualitativeLevel;
  stabilityLabelOf(stability: number): StabilityLabel;
}
