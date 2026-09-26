/**
 * State فقط-UI صحنه (Drag در جریان، ضربان انیمیشن‌ها).
 * هیچ حقیقت بازی اینجا نگه‌داری نمی‌شود — آن‌ها در store/gameStore هستند.
 */

import { create } from 'zustand';
import type { IngredientId } from '../engine/types';
import type { DropTargetId } from './layout';

/**
 * نوع Drag. در فلو کلیکی کلاسیک دیگر استفاده نمی‌شود (قفسه فقط اسکرول افقی
 * دارد)؛ برای سازگاری DragGhost و نسخه‌ی v2 نگه داشته شده است.
 */
export type DragKind = 'jar' | 'ground' | 'bottle';

/** فازهای انتقال هاون ⇒ دیگ با قاشق سر بزی (کلاسیک) */
export type TransferPhase = null | 'scoop' | 'carry' | 'drop';
/** فازهای ریختن دیگ ⇒ شیشه ⇒ مشتری (کلاسیک) */
export type PourPhase = null | 'tilt' | 'stream' | 'deliver';

/**
 * نمای دوربین سینمایی (کلاسیک): Stage کل صحنه را حول نقطه‌ی (x,y) با `zoom`
 * بزرگ می‌کند و در `ms` میلی‌ثانیه به آن می‌رسد. null ⇒ نمای عادی.
 */
export interface CameraShot {
  x: number;
  y: number;
  zoom: number;
  ms: number;
}

/**
 * دور ریختن دیگ (کلاسیک): با ضربه به سطل، دیگِ پر به دیوار پشت پرت می‌شود،
 * محتوایش روی دیوار می‌ماند و دیگ نو از بالا می‌افتد. store همان لحظه ریست
 * می‌شود؛ این فقط وضعیت نمایشی است (DiscardFx + ClassicBrewSim).
 */
export interface DiscardState {
  /** شمارنده‌ی یکتا — هر دور ریختن یک key تازه */
  id: number;
  /** رنگ مایع در لحظه‌ی پرت‌شدن (hex) */
  liquid: string;
  /** معجون سوخته بود (لکه‌ی تیره‌تر و دودی) */
  burnt: boolean;
  /** performance.now() لحظه‌ی شروع — مبنای زمان مشترک دیگِ پرنده (لایه‌ی کار) و لکه‌ی دیوار (لایه‌ی پشت) */
  startedAt: number;
  /**
   * دیگ نو نشسته و آب پر شده ⇒ دیگ و سطل دوباره آزادند.
   * لکه‌ی دیوار ممکن است هنوز بماند؛ پایان کامل با endDiscard.
   */
  settled: boolean;
}

export interface DragState {
  kind: DragKind;
  ingredientId?: IngredientId;
  /** موقعیت اشاره‌گر در فضای صحنه */
  x: number;
  y: number;
  /** مقصد زیر اشاره‌گر (برای Highlight) */
  over: DropTargetId | null;
}

export interface UiState {
  drag: DragState | null;
  /** کوبیدن در جریان است (برای لرزش محتوای هاون) */
  grinding: boolean;
  /** هم‌زدن در جریان است */
  stirring: boolean;
  /** انیمیشن ریختن معجون در بطری در جریان است */
  pouring: boolean;
  /** شمارنده‌ها: تغییرشان انیمیشن یک‌بارمصرف را دوباره پخش می‌کند */
  splashPulse: number;
  swirlPulse: number;
  pourPulse: number;
  /** لرزش «جا ندارد» هاون — وقتی Drop شیشه روی هاونِ پر رد می‌شود */
  mortarShakePulse: number;
  /** هر «ضربه»ی کوبش خودکار (~۰٫۳۵ث) — برای صدا/هپتیک و لرزش کوبه */
  grindTickPulse: number;
  /** لرزش کل صحنه (برخورد دیگ به دیوار) — Stage آن را پخش می‌کند */
  shakePulse: number;
  /** انتقال هاون ⇒ دیگ با قاشق (کلاسیک) */
  transfer: TransferPhase;
  /** ریختن دیگ ⇒ شیشه ⇒ مشتری (کلاسیک) */
  pour: PourPhase;
  /** نمای دوربین سینمایی (Stage آن را اعمال می‌کند) */
  camera: CameraShot | null;
  /** نوارهای سینمایی بالا/پایین */
  letterbox: boolean;
  /** لایه‌های ثابت کارگاه (میز، قفسه، دیگ، پیشخوان…) decode شده‌اند */
  sceneArtReady: boolean;
  /**
   * customerIndex همان مشتری‌ای که اسپرایتش decode شده.
   * null یعنی هنوز آماده نیست — دوربین ورود نباید شروع شود.
   */
  customerArtReady: number | null;
  /** دور ریختن دیگ در جریان (null ⇒ هیچ) */
  discard: DiscardState | null;

  beginDrag: (d: Omit<DragState, 'over'>) => void;
  updateDrag: (x: number, y: number, over: DropTargetId | null) => void;
  endDrag: () => void;
  setGrinding: (v: boolean) => void;
  setStirring: (v: boolean) => void;
  setPouring: (v: boolean) => void;
  setTransfer: (phase: TransferPhase) => void;
  setPour: (phase: PourPhase) => void;
  setCamera: (shot: CameraShot | null, letterbox?: boolean) => void;
  setSceneArtReady: (ready: boolean) => void;
  setCustomerArtReady: (index: number | null) => void;
  pulse: (key: 'splashPulse' | 'swirlPulse' | 'pourPulse' | 'mortarShakePulse' | 'grindTickPulse' | 'shakePulse') => void;
  /** شروع دور ریختن — اگر یکی در جریان است، نادیده گرفته می‌شود */
  startDiscard: (liquid: string, burnt: boolean) => void;
  /** دیگ نو نشست و پر شد */
  settleDiscard: (id: number) => void;
  /** لکه‌ی دیوار هم رفت — پایان */
  endDiscard: (id: number) => void;
}

let discardSeq = 0;

export const useUiState = create<UiState>((set) => ({
  drag: null,
  grinding: false,
  stirring: false,
  pouring: false,
  splashPulse: 0,
  swirlPulse: 0,
  pourPulse: 0,
  mortarShakePulse: 0,
  grindTickPulse: 0,
  shakePulse: 0,
  transfer: null,
  pour: null,
  camera: null,
  letterbox: false,
  sceneArtReady: false,
  customerArtReady: null,
  discard: null,

  beginDrag: (d) => set({ drag: { ...d, over: null } }),
  updateDrag: (x, y, over) =>
    set((s) => (s.drag ? { drag: { ...s.drag, x, y, over } } : {})),
  endDrag: () => set({ drag: null }),
  setGrinding: (v) => set({ grinding: v }),
  setStirring: (v) => set({ stirring: v }),
  setPouring: (v) => set({ pouring: v }),
  setTransfer: (phase) => set({ transfer: phase }),
  setPour: (phase) => set({ pour: phase, pouring: phase !== null }),
  setCamera: (shot, letterbox) => set((s) => ({ camera: shot, letterbox: letterbox ?? s.letterbox })),
  setSceneArtReady: (ready) => set({ sceneArtReady: ready }),
  setCustomerArtReady: (index) => set({ customerArtReady: index }),
  pulse: (key) => set((s) => ({ [key]: s[key] + 1 }) as Partial<UiState>),
  startDiscard: (liquid, burnt) =>
    set((s) =>
      s.discard && !s.discard.settled
        ? {}
        : { discard: { id: ++discardSeq, liquid, burnt, startedAt: performance.now(), settled: false } },
    ),
  settleDiscard: (id) =>
    set((s) => (s.discard && s.discard.id === id ? { discard: { ...s.discard, settled: true } } : {})),
  endDiscard: (id) => set((s) => (s.discard && s.discard.id === id ? { discard: null } : {})),
}));
