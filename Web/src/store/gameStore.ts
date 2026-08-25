/**
 * Store مشترک بازی (zustand) — قرارداد بین صحنه (Workstream B)،
 * Overlay ها (Workstream C) و موتور (Workstream A).
 *
 * قواعد کلیدی UX (از Core_Alchemy_UX_Definition):
 * - باز بودن هر Overlay ⇒ Pause / Safe State (زمان Brew جلو نمی‌رود).
 * - Add پس از Drop غیرقابل Undo است؛ قبل از آن Quantity/Grind قابل تغییر.
 * - Bottle تصمیم صریح پایان است؛ PotionResult تغییرناپذیر.
 */

import { create } from 'zustand';
import * as engine from '../engine';
import type {
  AlchemyDefinitions,
  BrewState,
  CustomerDefinition,
  CustomerEvaluation,
  DiscoveryEvent,
  GrindState,
  HeatLevel,
  IngredientDefinition,
  IngredientId,
  PotionResult,
  Quantity,
} from '../engine/types';
import { loadDefinitions } from '../data';

export type OverlayId =
  | 'ingredient_detail'
  | 'notebook'
  | 'process_history'
  | 'customer_request'
  | 'result';

export interface MortarState {
  ingredientId: IngredientId;
  quantity: Quantity;
  /** null یعنی هنوز کوبیده نشده (قابل افزودن به پاتیل نیست) */
  grindState: GrindState | null;
  /** کار انباشته‌ی کوبش؛ آستانه‌ها در GRIND_THRESHOLDS */
  grindWork: number;
}

export interface RecordedRecipe {
  entries: { ingredientId: IngredientId; quantity: Quantity; grindState: GrindState }[];
  finalHeat: HeatLevel;
}

/** سقف واحدهای هاون (هر درگ-اند-دراپ شیشه = ۱ واحد) — کلاسیک و v2 */
export const MAX_MORTAR_UNITS = 3;

/** آستانه‌های کار کوبش برای رسیدن به هر Grind State */
export const GRIND_THRESHOLDS: { state: GrindState; work: number }[] = [
  { state: 'coarse', work: 1 },
  { state: 'crushed', work: 2.2 },
  { state: 'fine', work: 3.6 },
];

export function grindStateForWork(work: number): GrindState | null {
  let result: GrindState | null = null;
  for (const t of GRIND_THRESHOLDS) {
    if (work >= t.work) result = t.state;
  }
  return result;
}

export interface GameState {
  defs: AlchemyDefinitions;
  brew: BrewState;
  /** ایندکس مشتری فعلی در defs.customers */
  customerIndex: number;
  cabinetOpen: boolean;
  mortar: MortarState | null;
  /** Overlay باز فعلی — باز بودن یعنی Pause / Safe State */
  openOverlay: OverlayId | null;
  /** ماده‌ی انتخاب‌شده برای Inspect در Overlay جزئیات */
  inspectedIngredientId: IngredientId | null;
  result: PotionResult | null;
  evaluation: CustomerEvaluation | null;
  /** صف Micro-feedback کشف (۱-۲ ثانیه، غیرمسدودکننده) */
  discoveryQueue: DiscoveryEvent[];
  /** Tag ها و Clue هایی که تا حالا کشف شده‌اند (برای Notebook) */
  discoveredTagIds: string[];
  usedIngredientIds: IngredientId[];
  lastRecipe: RecordedRecipe | null;
  debugOpen: boolean;

  // --- Derived helpers ---
  currentCustomer: () => CustomerDefinition;
  ingredientById: (id: IngredientId) => IngredientDefinition | undefined;
  isPaused: () => boolean;

  // --- Actions ---
  toggleCabinet: (open?: boolean) => void;
  /** برداشتن ماده از قفسه و گذاشتن در هاون (جایگزین محتوای قبلی هاون) */
  pickIngredient: (id: IngredientId) => void;
  /**
   * افزودن ۱ واحد با هر درگ-اند-دراپ (کلاسیک و v2).
   * همان ماده ⇒ ۱+ واحد تا سقف MAX_MORTAR_UNITS (بیشتر: بی‌اثر، UI لرزش می‌دهد).
   * ماده‌ی متفاوت ⇒ جایگزینی کامل با ۱ واحد. افزودن واحد جدید کوبش را ریست می‌کند.
   */
  addUnitToMortar: (id: IngredientId) => void;
  setQuantity: (q: Quantity) => void;
  /** اعمال کار کوبش (از Gesture هاون) */
  applyGrindWork: (amount: number) => void;
  /** خالی کردن هاون قبل از Add (بدون هزینه) */
  clearMortar: () => void;
  /** Drop محتوای هاون در پاتیل — غیرقابل Undo */
  addMortarToCauldron: () => void;
  setHeat: (h: HeatLevel) => void;
  /** ثبت یک Stir Action گسسته (از Gesture دایره‌ای) */
  stir: () => void;
  /** پایان صریح Brew — درگ بطری به Bottling Point */
  bottleBrew: () => void;
  /** تحویل به مشتری فعلی و دریافت ارزیابی */
  deliver: () => void;
  /** بستن Result و رفتن به مشتری بعدی */
  nextCustomer: () => void;
  resetBrew: () => void;
  repeatLastBrew: () => void;
  openOverlayAction: (id: OverlayId, inspectedId?: IngredientId) => void;
  closeOverlay: () => void;
  popDiscovery: () => void;
  toggleDebug: () => void;
  /** پیشروی زمان — فقط وقتی Pause نیست اثر دارد. B در حلقه‌ی rAF صدا می‌زند */
  tick: (dtSeconds: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  defs: loadDefinitions(),
  brew: engine.createBrew(),
  customerIndex: 0,
  cabinetOpen: false,
  mortar: null,
  openOverlay: null,
  inspectedIngredientId: null,
  result: null,
  evaluation: null,
  discoveryQueue: [],
  discoveredTagIds: [],
  usedIngredientIds: [],
  lastRecipe: null,
  debugOpen: false,

  currentCustomer: () => {
    const { defs, customerIndex } = get();
    return defs.customers[customerIndex % defs.customers.length];
  },
  ingredientById: (id) => get().defs.ingredients.find((i) => i.id === id),
  isPaused: () => get().openOverlay !== null || get().result !== null,

  toggleCabinet: (open) =>
    set((s) => ({ cabinetOpen: open === undefined ? !s.cabinetOpen : open })),

  pickIngredient: (id) =>
    set(() => ({
      mortar: { ingredientId: id, quantity: 1, grindState: null, grindWork: 0 },
      cabinetOpen: false,
    })),

  addUnitToMortar: (id) =>
    set((s) => {
      if (!s.mortar || s.mortar.ingredientId !== id) {
        return { mortar: { ingredientId: id, quantity: 1, grindState: null, grindWork: 0 } };
      }
      if (s.mortar.quantity >= MAX_MORTAR_UNITS) return {};
      const quantity = Math.min(s.mortar.quantity + 1, MAX_MORTAR_UNITS) as Quantity;
      // واحد تازه خام است ⇒ کوبش قبلی از بین می‌رود و باید دوباره کوبیده شود
      return { mortar: { ingredientId: id, quantity, grindState: null, grindWork: 0 } };
    }),

  setQuantity: (q) =>
    set((s) => (s.mortar ? { mortar: { ...s.mortar, quantity: q } } : {})),

  applyGrindWork: (amount) =>
    set((s) => {
      if (!s.mortar) return {};
      const maxWork = GRIND_THRESHOLDS[GRIND_THRESHOLDS.length - 1].work;
      const grindWork = Math.min(s.mortar.grindWork + amount, maxWork);
      return { mortar: { ...s.mortar, grindWork, grindState: grindStateForWork(grindWork) } };
    }),

  clearMortar: () => set({ mortar: null }),

  addMortarToCauldron: () => {
    const s = get();
    if (!s.mortar || !s.mortar.grindState || s.brew.bottled) return;
    const brew = engine.addIngredient(
      s.brew,
      s.mortar.ingredientId,
      s.mortar.quantity,
      s.mortar.grindState,
      s.defs,
    );
    set({
      brew,
      mortar: null,
      usedIngredientIds: s.usedIngredientIds.includes(s.mortar.ingredientId)
        ? s.usedIngredientIds
        : [...s.usedIngredientIds, s.mortar.ingredientId],
    });
  },

  setHeat: (h) => set((s) => ({ brew: engine.setHeat(s.brew, h, s.defs) })),

  stir: () =>
    set((s) => (s.brew.entries.length > 0 && !s.brew.bottled ? { brew: engine.stir(s.brew, s.defs) } : {})),

  bottleBrew: () => {
    const s = get();
    if (s.brew.entries.length === 0 || s.brew.bottled) return;
    const result = engine.bottle(s.brew, s.defs);
    const newDiscoveries = result.discoveries.filter(
      (d) => !s.discoveredTagIds.includes(d.id),
    );
    set({
      brew: { ...s.brew, bottled: true },
      result,
      evaluation: null,
      discoveryQueue: [...s.discoveryQueue, ...newDiscoveries],
      discoveredTagIds: [
        ...s.discoveredTagIds,
        ...newDiscoveries.filter((d) => d.kind === 'quality_tag').map((d) => d.id),
      ],
      lastRecipe: {
        entries: s.brew.entries.map((e) => ({
          ingredientId: e.ingredientId,
          quantity: e.quantity,
          grindState: e.grindState,
        })),
        finalHeat: s.brew.currentHeat,
      },
      // Overlay اینجا باز نمی‌شود؛ اول انیمیشن ریختن در بطری پخش می‌شود
      // و بعد صحنه، نتیجه و پاسخ مشتری را نشان می‌دهد (BottleStation).
    });
  },

  deliver: () => {
    const s = get();
    if (!s.result) return;
    const evaluation = engine.evaluate(s.result, s.currentCustomer(), s.defs);
    set({ evaluation });
  },

  nextCustomer: () =>
    set((s) => ({
      customerIndex: s.customerIndex + 1,
      brew: engine.createBrew(),
      result: null,
      evaluation: null,
      mortar: null,
      openOverlay: null,
    })),

  resetBrew: () =>
    set(() => ({
      brew: engine.createBrew(),
      result: null,
      evaluation: null,
      mortar: null,
      openOverlay: null,
    })),

  repeatLastBrew: () => {
    const s = get();
    if (!s.lastRecipe) return;
    let brew = engine.createBrew();
    brew = engine.setHeat(brew, s.lastRecipe.finalHeat, s.defs);
    for (const e of s.lastRecipe.entries) {
      brew = engine.addIngredient(brew, e.ingredientId, e.quantity, e.grindState, s.defs);
    }
    set({ brew, result: null, evaluation: null, mortar: null, openOverlay: null });
  },

  openOverlayAction: (id, inspectedId) =>
    set({ openOverlay: id, inspectedIngredientId: inspectedId ?? get().inspectedIngredientId }),

  closeOverlay: () =>
    set((s) => ({
      // بستن Result بدون تحویل ⇒ بازگشت به Workspace با همان Brew بطری‌شده
      openOverlay: null,
      inspectedIngredientId: s.openOverlay === 'ingredient_detail' ? null : s.inspectedIngredientId,
    })),

  popDiscovery: () => set((s) => ({ discoveryQueue: s.discoveryQueue.slice(1) })),

  toggleDebug: () => set((s) => ({ debugOpen: !s.debugOpen })),

  tick: (dtSeconds) => {
    const s = get();
    if (s.isPaused() || s.brew.bottled || s.brew.entries.length === 0) return;
    set({ brew: engine.advanceTime(s.brew, dtSeconds, s.defs) });
  },
}));

// Hook تشخیصی برای e2e و دیباگ دستی — در UI استفاده نمی‌شود
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kimyagarStore = useGameStore;
}
