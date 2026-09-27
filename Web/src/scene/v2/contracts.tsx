/**
 * قرارداد مشترک صحنه‌ی نسخه ۲ (v2) — نوشته‌ی Agent اصلی (Phase 0).
 *
 * مالکیت فایل‌ها برای جلوگیری از تداخل Workstream های موازی:
 * - Workstream A: ShelfStation.tsx، MortarStationV2.tsx، shelf-mortar.css
 * - Workstream B: WorkshopSceneV2.tsx، CauldronStationV2.tsx، سایر ایستگاه‌های v2،
 *   روتینگ hash در App.tsx، StyleSwitcher، scene-v2.css
 * - Workstream D (Agent اصلی): تولید فایل‌های تصویر با همین نام‌ها در
 *   Web/public/art/flat/... و Web/public/art/pixel/...
 *
 * تغییر امضاهای عمومی این فایل فقط با هماهنگی Agent اصلی مجاز است.
 *
 * تصمیم‌های طراحی v2:
 * - قفسه‌ی مواد نوار افقیِ روی دیوار پشت میز است (همیشه دیده می‌شود، اسکرول افقی).
 * - هر درگ-اند-دراپ شیشه به هاون = ۱ واحد، تا سقف MAX_MORTAR_UNITS (در store).
 * - وقتی هاون محتوا دارد، لایه‌ی جلویی (mortar_front) با opacity: 0.5 رندر می‌شود
 *   تا داخل هاون دیده شود.
 * - سبک پیکسل باید image-rendering: pixelated بگیرد (کلاس zone-art--pixelated
 *   که ArtLayerV2 خودش اضافه می‌کند؛ CSS آن در scene-v2.css تعریف می‌شود).
 */

import { createContext, useContext, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { SceneZone } from '../artManifest';

// ---------------------------------------------------------------------------
// سبک هنری
// ---------------------------------------------------------------------------

export type ArtStyle = 'flat' | 'pixel' | 'engraved';
export const DEFAULT_ART_STYLE: ArtStyle = 'flat';

/** مسیر asset یک سبک: /art/flat/... یا /art/pixel/... یا /art/engraved/... */
export function artUrlV2(style: ArtStyle, relPath: string): string {
  return `/art/${style}/${relPath}`;
}

/**
 * Provider اصلی در App (تا Overlayها هم سبک را ببینند)؛ WorkshopSceneV2 هم
 * برای اطمینان دوباره آن را با سبک روت می‌بندد.
 */
export const StyleContext = createContext<ArtStyle>(DEFAULT_ART_STYLE);

export function useArtStyle(): ArtStyle {
  return useContext(StyleContext);
}

// ---------------------------------------------------------------------------
// چیدمان صحنه‌ی v2 — مختصات منطقی 1920×1080 (همان Stage موجود)
// ---------------------------------------------------------------------------

export const V2_ZONES = {
  background: {
    id: 'v2_background',
    x: 0, y: 0, width: 1920, height: 1080, z: 0,
    img: 'background/shop_background.png',
  },
  /**
   * Viewport قفسه‌ی دیواری پشت میز — محتوای داخل آن (تخته + شیشه‌ها) افقی
   * اسکرول می‌شود. z پایین‌تر از میز تا «پشت میز» دیده شود.
   */
  shelf: {
    id: 'v2_shelf',
    x: 80, y: 240, width: 1300, height: 300, z: 5,
    img: 'shelf/shelf_board.png',
  },
  workTable: {
    id: 'v2_work_table',
    x: 60, y: 600, width: 1420, height: 480, z: 10,
    img: 'table/work_table.png',
  },
  mortar: {
    id: 'v2_mortar',
    x: 260, y: 610, width: 320, height: 300, z: 35,
    img: 'mortar/mortar_back.png',
  },
  cauldron: {
    id: 'v2_cauldron',
    x: 640, y: 470, width: 470, height: 440, z: 30,
    img: 'cauldron/cauldron_empty.png',
  },
  /** لایه‌ی معجون داخل دیگ (بالای بدنه، tint رنگ داینامیک) */
  cauldronPotion: {
    id: 'v2_cauldron_potion',
    x: 700, y: 520, width: 350, height: 120, z: 31,
    states: {
      still: 'cauldron/potion_still.png',
      boil_1: 'cauldron/potion_boil_1.png',
      boil_2: 'cauldron/potion_boil_2.png',
    },
  },
  /**
   * بوم صحنه‌ی پخت برداریِ سبک فلت (FlatCookingScene از Kimiagar.Works):
   * دیگ + اجاق + قاشق + مواد در حال سقوط، همه در یک Canvas. مربع ۵۱۲ واحدیِ
   * صحنه با ضریب ۱٫۹ روی cauldron/heatSource می‌نشیند (لبه‌ی دیگ ≈ y 508،
   * دهانه ≈ y 552، کف بدنه ≈ y 858، هیزم ≈ y 922). بالای صحنه بیرون Stage
   * است تا قاشق جا داشته باشد. هیت‌باکس Drop/هم‌زدن همان `cauldron` می‌ماند.
   */
  flatCookingScene: {
    id: 'v2_flat_cooking_scene',
    x: 388, y: -20, width: 973, height: 973, z: 30,
  },
  heatSource: {
    id: 'v2_heat_source',
    x: 690, y: 880, width: 370, height: 170, z: 25,
    states: {
      low: 'heat/fire_low.png',
      medium: 'heat/fire_medium.png',
      high: 'heat/fire_high.png',
    },
  },
  bottleShelf: {
    id: 'v2_bottle_shelf',
    x: 1190, y: 700, width: 220, height: 260, z: 30,
    img: 'bottles/bottle_empty.png',
  },
  bottlingPoint: {
    id: 'v2_bottling_point',
    x: 1080, y: 560, width: 200, height: 240, z: 32,
  },
  customerCounter: {
    id: 'v2_customer_counter',
    x: 1440, y: 540, width: 480, height: 540, z: 20,
    img: 'customer/counter.png',
  },
  customer: {
    id: 'v2_customer',
    x: 1520, y: 210, width: 340, height: 520, z: 15,
    states: {
      woman_elder: 'customer/customer_woman_elder.png',
      man_worker: 'customer/customer_man_worker.png',
      woman_young: 'customer/customer_woman_young.png',
      man_elder: 'customer/customer_man_elder.png',
      woman_merchant: 'customer/customer_woman_merchant.png',
      woman_scribe: 'customer/customer_woman_scribe.png',
      woman_weaver: 'customer/customer_woman_weaver.png',
      woman_healer: 'customer/customer_woman_healer.png',
      man_scholar: 'customer/customer_man_scholar.png',
      man_musician: 'customer/customer_man_musician.png',
      woman_student: 'customer/customer_woman_student.png',
      woman_florist: 'customer/customer_woman_florist.png',
      woman_noble: 'customer/customer_woman_noble.png',
      woman_traveler: 'customer/customer_woman_traveler.png',
      woman_baker: 'customer/customer_woman_baker.png',
      man_apprentice: 'customer/customer_man_apprentice.png',
      woman_potter: 'customer/customer_woman_potter.png',
      woman_painter: 'customer/customer_woman_painter.png',
      woman_singer: 'customer/customer_woman_singer.png',
      woman_rider: 'customer/customer_woman_rider.png',
      woman_bride: 'customer/customer_woman_bride.png',
      woman_perfumer: 'customer/customer_woman_perfumer.png',
      woman_jeweler: 'customer/customer_woman_jeweler.png',
      woman_dancer: 'customer/customer_woman_dancer.png',
      woman_astronomer: 'customer/customer_woman_astronomer.png',
      woman_falconer: 'customer/customer_woman_falconer.png',
      woman_poet: 'customer/customer_woman_poet.png',
      woman_dyer: 'customer/customer_woman_dyer.png',
      woman_glass: 'customer/customer_woman_glass.png',
      woman_spice: 'customer/customer_woman_spice.png',
      woman_chess: 'customer/customer_woman_chess.png',
      // سری ششم — پیشه‌وران، ورزشکاران، مادربزرگ‌ها و چهره‌های جدا
      woman_calligrapher: 'customer/customer_woman_calligrapher.png',
      woman_tilemaker: 'customer/customer_woman_tilemaker.png',
      woman_carpet: 'customer/customer_woman_carpet.png',
      woman_tea: 'customer/customer_woman_tea.png',
      woman_storyteller: 'customer/customer_woman_storyteller.png',
      woman_silk: 'customer/customer_woman_silk.png',
      woman_bookbinder: 'customer/customer_woman_bookbinder.png',
      woman_pearl: 'customer/customer_woman_pearl.png',
      woman_nomad: 'customer/customer_woman_nomad.png',
      woman_midwife: 'customer/customer_woman_midwife.png',
      woman_courier: 'customer/customer_woman_courier.png',
      woman_santur: 'customer/customer_woman_santur.png',
      woman_saffron: 'customer/customer_woman_saffron.png',
      woman_mapmaker: 'customer/customer_woman_mapmaker.png',
      woman_candle: 'customer/customer_woman_candle.png',
      man_pahlevan: 'customer/customer_man_pahlevan.png',
      man_wrestler: 'customer/customer_man_wrestler.png',
      man_horseman: 'customer/customer_man_horseman.png',
      man_archer: 'customer/customer_man_archer.png',
      man_diver: 'customer/customer_man_diver.png',
      man_mountaineer: 'customer/customer_man_mountaineer.png',
      man_boatman: 'customer/customer_man_boatman.png',
      man_polo: 'customer/customer_man_polo.png',
      man_smith: 'customer/customer_man_smith.png',
      man_runner: 'customer/customer_man_runner.png',
      man_swordsman: 'customer/customer_man_swordsman.png',
      man_hunter: 'customer/customer_man_hunter.png',
      man_caravan: 'customer/customer_man_caravan.png',
      man_lancer: 'customer/customer_man_lancer.png',
      man_rope: 'customer/customer_man_rope.png',
      woman_nana_spinner: 'customer/customer_woman_nana_spinner.png',
      woman_nana_fortune: 'customer/customer_woman_nana_fortune.png',
      woman_nana_baker: 'customer/customer_woman_nana_baker.png',
      woman_nana_herbs: 'customer/customer_woman_nana_herbs.png',
      woman_nana_nomad: 'customer/customer_woman_nana_nomad.png',
      woman_elder_zahra: 'customer/customer_woman_elder_zahra.png',
      woman_cloth: 'customer/customer_woman_cloth.png',
      woman_letters: 'customer/customer_woman_letters.png',
      woman_herbhealer: 'customer/customer_woman_herbhealer.png',
      man_mason: 'customer/customer_man_mason.png',
      man_porter: 'customer/customer_man_porter.png',
      man_khwaja: 'customer/customer_man_khwaja.png',
    },
  },
  goalNote: {
    id: 'v2_goal_note',
    x: 1460, y: 24, width: 430, height: 150, z: 50,
    img: 'goal/goal_note.png',
  },
} as const satisfies Record<string, SceneZone>;

export type V2ZoneId = keyof typeof V2_ZONES;

// ---------------------------------------------------------------------------
// نام‌گذاری asset های state-محور (قرارداد بین صحنه و Workstream D)
// مسیرها نسبت به /art/{style}/ هستند.
// ---------------------------------------------------------------------------

export const V2_ART = {
  /** شیشه‌های قفسه — کلید = IngredientId (مطابق data/ingredients.json) */
  jar: (ingredientId: string) => `shelf/jar_${ingredientId}.png`,
  shelfBoard: 'shelf/shelf_board.png',

  /** هاون لایه‌باز: پشت (داخل کاسه) + جلو (دیواره‌ی بیرونی، جدا برای شفافیت) */
  mortarBack: 'mortar/mortar_back.png',
  mortarFront: 'mortar/mortar_front.png',
  /** محتوای هاون: units ∈ 1..3 — خام یا کوبیده */
  mortarContents: (units: 1 | 2 | 3, ground: boolean) =>
    `mortar/contents_${units}_${ground ? 'ground' : 'raw'}.png`,
  /** ۳ فریم انیمیشن کوبه — چرخه هنگام آسیاب */
  pestleFrame: (frame: 1 | 2 | 3) => `mortar/pestle_${frame}.png`,

  cauldronEmpty: 'cauldron/cauldron_empty.png',
  potionStill: 'cauldron/potion_still.png',
  potionBoil: (frame: 1 | 2) => `cauldron/potion_boil_${frame}.png`,

  bottleEmpty: 'bottles/bottle_empty.png',
  bottleFull: 'bottles/bottle_full.png',
  discoveryGlow: 'fx/discovery_glow.png',
} as const;

/** ترتیب شیشه‌ها روی قفسه (مطابق data/ingredients.json) */
export const SHELF_INGREDIENT_ORDER = [
  'chamomile',
  'borage',
  'mint',
  'saffron',
  'poppy',
  'ginger',
] as const;

// ---------------------------------------------------------------------------
// ابزار رندر لایه‌ی هنری v2 (سبک‌آگاه) — معادل ArtLayer قدیمی
// ---------------------------------------------------------------------------

export type ArtFitV2 = 'contain' | 'cover' | 'fill';

/**
 * تصویر لایه با fallback به placeholder (children) تا وقتی فایل بار نشده.
 * برای سبک pixel کلاس zone-art--pixelated اضافه می‌شود.
 */
export function ArtLayerV2({
  src,
  fit = 'contain',
  className,
  style,
  children,
}: {
  /** مسیر نسبی داخل /art/{style} — ممکن است هنوز تولید نشده باشد */
  src?: string;
  fit?: ArtFitV2;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const artStyle = useArtStyle();
  const [loaded, setLoaded] = useState(false);

  const cls = [
    'zone-art',
    `zone-art--${fit}`,
    artStyle === 'pixel' ? 'zone-art--pixelated' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {src ? (
        <img
          key={`${artStyle}/${src}`}
          className={cls}
          style={style}
          src={artUrlV2(artStyle, src)}
          alt=""
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      ) : null}
      {loaded ? null : children}
    </>
  );
}
