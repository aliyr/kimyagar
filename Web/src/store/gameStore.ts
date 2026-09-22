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
  | 'result'
  | 'settings';

/** یک ماده‌ی داخل هاون کلاسیک؛ کوبشش مستقل از بقیه است. */
export interface MortarPortion {
  ingredientId: IngredientId;
  quantity: Quantity;
  /** کار مطلق. سقف نرم = ۳٫۶ × تعداد واحد. */
  grindWork: number;
}

export interface MortarState {
  ingredientId: IngredientId;
  quantity: Quantity;
  /** null یعنی هنوز کوبیده نشده (قابل افزودن به پاتیل نیست) */
  grindState: GrindState | null;
  /**
   * v2: کار مطلق تا ۳٫۶.
   * کلاسیک (با portions): کار نرمال‌شده‌ی عقب‌مانده‌ترین ماده، برای حلقه‌ی کوبش.
   */
  grindWork: number;
  /**
   * کوبش خودکار در جریان است (کلاسیک): tick با نرخ GRIND_RATE کار می‌افزاید تا
   * سقف؛ با رسیدن به سقف یا با transferMortar خاموش می‌شود.
   */
  grinding: boolean;
  /** فقط کلاسیک. هر ماده واحد و کوبش خودش را دارد. */
  portions?: MortarPortion[];
}

export interface RecordedRecipe {
  entries: { ingredientId: IngredientId; quantity: Quantity; grindState: GrindState }[];
  finalHeat: HeatLevel;
}

/** سقف واحدهای هاون v2 (هر درگ-اند-دراپ شیشه = ۱ واحد از یک ماده) */
export const MAX_MORTAR_UNITS = 3;
/** سقف مجموع واحدهای هاون کلاسیک؛ یک ماده هم می‌تواند هر ۶ تا را پر کند */
export const CLASSIC_MAX_MORTAR_UNITS = 6;

/** آستانه‌های کار کوبش برای رسیدن به هر Grind State */
export const GRIND_THRESHOLDS: { state: GrindState; work: number }[] = [
  { state: 'coarse', work: 1 },
  { state: 'crushed', work: 2.2 },
  { state: 'fine', work: 3.6 },
];

/** پنجره‌ی کوبش خودکار کلاسیک: در این مدت کار از ۰ به سقف (نرم) می‌رسد */
export const MORTAR_GRIND_SECONDS = 3.5;
/** نرخ کار کوبش خودکار (کار بر ثانیه) ⇒ درشت ≈ ۱ث، نیم‌کوب ≈ ۲٫۱ث، نرم = ۳٫۵ث */
export const GRIND_RATE = GRIND_THRESHOLDS[GRIND_THRESHOLDS.length - 1].work / MORTAR_GRIND_SECONDS;

export function grindStateForWork(work: number): GrindState | null {
  let result: GrindState | null = null;
  for (const t of GRIND_THRESHOLDS) {
    if (work >= t.work) result = t.state;
  }
  return result;
}

const FINE_WORK = GRIND_THRESHOLDS[GRIND_THRESHOLDS.length - 1].work;

function portionFine(quantity: number): number {
  return FINE_WORK * quantity;
}

/** کار به اندازه‌ی خطای اعشار به سقف رسیده؛ باید نرم حساب شود. */
function portionReachedFine(portion: MortarPortion): boolean {
  return portion.grindWork >= portionFine(portion.quantity) - 1e-4;
}

/** درجه‌ی کوبش یک ماده از روی کار مطلق و تعداد واحدش. */
export function portionGrindState(portion: MortarPortion): GrindState | null {
  if (portionReachedFine(portion)) return 'fine';
  return grindStateForWork(portion.grindWork / portion.quantity);
}

function portionNorm(portion: MortarPortion): number {
  if (portionReachedFine(portion)) return FINE_WORK;
  return portion.grindWork / portion.quantity;
}

function classicMortar(portions: MortarPortion[], grinding: boolean): MortarState {
  const active = portions.filter((p) => !portionReachedFine(p));
  const focus = active.reduce<MortarPortion | null>((least, portion) => {
    if (!least || portionNorm(portion) < portionNorm(least)) return portion;
    return least;
  }, null) ?? portions[0];
  const total = portions.reduce((sum, portion) => sum + portion.quantity, 0);
  const norm = Math.min(FINE_WORK, portionNorm(focus));
  return {
    ingredientId: focus.ingredientId,
    quantity: total as Quantity,
    grindState: portionGrindState(focus),
    grindWork: norm,
    grinding: grinding && active.length > 0,
    portions,
  };
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
   * افزودن ۱ واحد (v2).
   * همان ماده ⇒ ۱+ واحد تا سقف MAX_MORTAR_UNITS (بیشتر: بی‌اثر، UI لرزش می‌دهد).
   * ماده‌ی متفاوت ⇒ جایگزینی کامل با ۱ واحد. افزودن واحد جدید کوبش را ریست می‌کند.
   */
  addUnitToMortar: (id: IngredientId) => void;
  /**
   * افزودن ۱ واحد به هاون کلاسیک. ماده‌ی دیگر قاطی می‌شود و کوبش خودش را از صفر
   * شروع می‌کند؛ کوبش بقیه‌ی مواد دست نمی‌خورد. مجموع بیش از ۶ تا بی‌اثر است.
   */
  addClassicUnit: (id: IngredientId) => void;
  setQuantity: (q: Quantity) => void;
  /** اعمال کار کوبش (از Gesture هاون یا tick کوبش خودکار) */
  applyGrindWork: (amount: number) => void;
  /** شروع کوبش خودکار (کلاسیک) — بعد از فرود ماده در هاون */
  startGrinding: () => void;
  /**
   * Tap روی هاون در فلو کلاسیک: کوبش می‌ایستد و درجه‌ی فعلی قفل می‌شود؛
   * کلیک زودتر از آستانه‌ی اول ⇒ «درشت». برمی‌گرداند آیا چیزی برای انتقال هست.
   * خودِ افزودن به پاتیل با addMortarToCauldron در لحظه‌ی ریختن قاشق انجام می‌شود.
   */
  transferMortar: () => boolean;
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
      mortar: { ingredientId: id, quantity: 1, grindState: null, grindWork: 0, grinding: false },
      cabinetOpen: false,
    })),

  addUnitToMortar: (id) =>
    set((s) => {
      if (!s.mortar || s.mortar.ingredientId !== id || s.mortar.portions) {
        return {
          mortar: { ingredientId: id, quantity: 1, grindState: null, grindWork: 0, grinding: false },
        };
      }
      if (s.mortar.quantity >= MAX_MORTAR_UNITS) return {};
      const quantity = Math.min(s.mortar.quantity + 1, MAX_MORTAR_UNITS) as Quantity;
      // واحد تازه خام است ⇒ کوبش قبلی از بین می‌رود و باید دوباره کوبیده شود
      // (کوبش خودکار در جریان ادامه می‌یابد؛ فقط از صفر شروع می‌شود)
      return {
        mortar: { ingredientId: id, quantity, grindState: null, grindWork: 0, grinding: s.mortar.grinding },
      };
    }),

  addClassicUnit: (id) =>
    set((s) => {
      const existing = s.mortar?.portions ?? (s.mortar
        ? [{
            ingredientId: s.mortar.ingredientId,
            quantity: s.mortar.quantity,
            grindWork: s.mortar.grindWork * s.mortar.quantity,
          }]
        : []);
      const total = existing.reduce((sum, portion) => sum + portion.quantity, 0);
      if (total >= CLASSIC_MAX_MORTAR_UNITS) return {};
      const portions = existing.map((portion) => ({ ...portion }));
      const found = portions.find((portion) => portion.ingredientId === id);
      if (found) {
        found.quantity = (found.quantity + 1) as Quantity;
        found.grindWork = 0;
      } else {
        portions.push({ ingredientId: id, quantity: 1, grindWork: 0 });
      }
      return { mortar: classicMortar(portions, s.mortar?.grinding ?? false) };
    }),

  setQuantity: (q) =>
    set((s) => (s.mortar ? { mortar: { ...s.mortar, quantity: q } } : {})),

  applyGrindWork: (amount) =>
    set((s) => {
      if (!s.mortar) return {};
      if (s.mortar.portions) {
        const active = s.mortar.portions.filter((portion) => !portionReachedFine(portion));
        if (active.length === 0) return { mortar: classicMortar(s.mortar.portions, false) };
        const activeQty = active.reduce((sum, portion) => sum + portion.quantity, 0);
        const portions = s.mortar.portions.map((portion) => {
          if (portionReachedFine(portion)) return portion;
          const cap = portionFine(portion.quantity);
          const next = portion.grindWork + amount * (portion.quantity / activeQty);
          return {
            ...portion,
            grindWork: next >= cap - 1e-4 ? cap : next,
          };
        });
        return { mortar: classicMortar(portions, s.mortar.grinding) };
      }
      const maxWork = FINE_WORK;
      const grindWork = Math.min(s.mortar.grindWork + amount, maxWork);
      return {
        mortar: {
          ...s.mortar,
          grindWork,
          grindState: grindStateForWork(grindWork),
          grinding: s.mortar.grinding && grindWork < maxWork,
        },
      };
    }),

  startGrinding: () =>
    set((s) => {
      if (!s.mortar) return {};
      if (s.mortar.portions) {
        const pending = s.mortar.portions.some((portion) => !portionReachedFine(portion));
        if (!pending) return { mortar: classicMortar(s.mortar.portions, false) };
        return { mortar: { ...classicMortar(s.mortar.portions, true), grinding: true } };
      }
      if (s.mortar.grindWork >= FINE_WORK) return {};
      return { mortar: { ...s.mortar, grinding: true } };
    }),

  transferMortar: () => {
    const s = get();
    if (!s.mortar || s.brew.bottled) return false;
    if (s.mortar.portions) {
      const coarse = GRIND_THRESHOLDS[0].work;
      const portions = s.mortar.portions.map((portion) => ({
        ...portion,
        grindWork: Math.max(portion.grindWork, coarse * portion.quantity),
      }));
      set({ mortar: classicMortar(portions, false) });
      return true;
    }
    set({
      mortar: {
        ...s.mortar,
        grinding: false,
        // کلیک پیش از آستانه‌ی اول هم درشت حساب می‌شود تا هیچ کلیکی هدر نرود
        grindState: s.mortar.grindState ?? GRIND_THRESHOLDS[0].state,
        grindWork: Math.max(s.mortar.grindWork, GRIND_THRESHOLDS[0].work),
      },
    });
    return true;
  },

  clearMortar: () => set({ mortar: null }),

  addMortarToCauldron: () => {
    const s = get();
    if (!s.mortar || s.brew.bottled) return;
    if (s.mortar.portions) {
      let brew = s.brew;
      const ids = new Set(s.usedIngredientIds);
      for (const portion of s.mortar.portions) {
        const grindState = portionGrindState(portion) ?? GRIND_THRESHOLDS[0].state;
        brew = engine.addIngredient(brew, portion.ingredientId, portion.quantity, grindState, s.defs);
        ids.add(portion.ingredientId);
      }
      set({ brew, mortar: null, usedIngredientIds: [...ids] });
      return;
    }
    if (!s.mortar.grindState) return;
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
      // و بعد صحنه، نتیجه و پاسخ مشتری را نشان می‌دهد (BottlingSequence / BottleStationV2).
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
    if (s.isPaused()) return;
    // کوبش خودکار هاون (کلاسیک) — مستقل از وضعیت پاتیل
    if (s.mortar?.grinding) s.applyGrindWork(dtSeconds * GRIND_RATE);
    if (s.brew.bottled || s.brew.entries.length === 0) return;
    set({ brew: engine.advanceTime(s.brew, dtSeconds, s.defs) });
  },
}));

// Hook تشخیصی برای e2e و دیباگ دستی — در UI استفاده نمی‌شود
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kimyagarStore = useGameStore;
}
