/**
 * قرارداد چیدمان صحنه — مختصات در فضای منطقی 1920×1080 (Landscape).
 *
 * Workstream B صحنه را با همین Zone ها می‌سازد (اول placeholder).
 * Workstream D (Agent اصلی) تصاویر لایه‌ها را با همین چیدمان تولید و در
 * Web/public/art/ قرار می‌دهد؛ ساختار مرجع در Art/UI Layers/scene_manifest.json.
 *
 * قاعده‌ی fallback: اگر تصویری موجود نبود، placeholder رنگی رندر شود
 * (onError یا بررسی manifest) تا صحنه هرگز نشکند.
 */

export const SCENE_WIDTH = 1920;
export const SCENE_HEIGHT = 1080;

/** مسیر پایه‌ی asset های هنری در public */
export const ART_BASE = '/art';

export interface SceneZone {
  id: string;
  /** مستطیل در مختصات صحنه */
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  /** مسیر تصویر (نسبت به ART_BASE) — ممکن است هنوز تولید نشده باشد */
  img?: string;
  /** تصاویر حالت‌های مختلف */
  states?: Record<string, string>;
}

/**
 * چیدمان اصلی کارگاه — طبق پرامپت هنری:
 * چپ: کابینت کشویی مواد | مرکز: میز کار، پاتیل، هاون، اجاق، بطری‌ها |
 * راست: پیشخوان جدای مشتری | بالا-راست: کاغذ خلاصه سفارش
 */
export const SCENE_ZONES = {
  background: {
    id: 'background',
    x: 0, y: 0, width: 1920, height: 1080, z: 0,
    img: 'background/shop_background.png',
  },
  /**
   * میز کار با کوره‌ی توکار: طاقچه‌ی آجری وسط دامنِ میز است؛ Zone کمی به راست
   * رفته تا دهانه‌ی کوره زیر پاتیل بیفتد (هندسه‌ی دقیق در scene/furnaceGeometry).
   */
  workTable: {
    id: 'work_table',
    x: 140, y: 600, width: 1420, height: 480, z: 10,
    img: 'table/work_table.png',
  },
  /**
   * قفسه‌ی دیواری مواد — پشت میز، همیشه دیده می‌شود، اسکرول افقی.
   * جایگزین کابینت کشویی در صحنه‌ی کلاسیک؛ شیشه‌ها روی تخته می‌نشینند و
   * z آن زیر میز/پاتیل است (قفسه روی دیوار عقب است).
   */
  wallShelf: {
    id: 'wall_shelf',
    x: 150, y: 310, width: 1260, height: 220, z: 6,
    img: 'shelf/shelf_board.png',
  },
  /**
   * بدنه‌ی PNG پاتیل؛ افکت‌های داخل دهانه روی Canvas (scene/classicCauldronGeometry).
   * Zone دقیقاً نسبت تصویر (1071×750) است تا پایه‌ی PNG = لبه‌ی پایین Zone باشد؛
   * پایه (y=770) داخل سوراخ اجاق روی سطح میز (StoveHole) می‌نشیند، هم‌مرکز با کوره.
   */
  cauldron: {
    id: 'cauldron',
    x: 647, y: 490, width: 400, height: 280, z: 30,
    img: 'cauldron/cauldron_body.png',
  },
  /**
   * سطح مایع داخل پاتیل — در کلاسیک هیبرید دیگر رندر نمی‌شود (مایع از کیت فلت
   * روی Canvas می‌آید)؛ برای v2 و ابزارهای هنری نگه داشته شده است.
   */
  cauldronLiquid: {
    id: 'cauldron_liquid',
    x: 680, y: 520, width: 350, height: 120, z: 31,
    img: 'cauldron/cauldron_liquid.png',
  },
  /**
   * دهانه‌ی کوره‌ی توکار میز (هیت‌باکس Tap برای چرخاندن درجه). آتش روی Canvas
   * داخل طاقچه رندر می‌شود (FurnaceFire)؛ تصاویر states فقط fallback/v2 هستند.
   */
  heatSource: {
    id: 'heat_source',
    x: 735, y: 868, width: 225, height: 192, z: 12,
    states: {
      low: 'heat/fire_low.png',
      medium: 'heat/fire_medium.png',
      high: 'heat/fire_high.png',
    },
  },
  /**
   * هاون روی سطح میز؛ نسبت Zone برابر بوم `mortarGeometry.ts` (919×1003) است تا
   * object-fit: contain کل Zone را پر کند و پایه‌ی کاسه (base.y≈0.985) روی y≈775
   * بنشیند. بقیه‌ی هندسه از `mortarLayout.ts` مشتق می‌شود.
   */
  mortar: {
    id: 'mortar',
    x: 290, y: 506, width: 250, height: 273, z: 35,
    img: 'mortar/mortar_body.png',
  },
  /**
   * شیشه‌ی خالی روی میز، کنار پاتیل (نسبت دقیق تصویر 642×1126). هنگام ریختن،
   * BottlingSequence همین شیشه را «برمی‌دارد» و این Zone خالی می‌شود.
   */
  bottleShelf: {
    id: 'bottle_shelf',
    x: 1150, y: 560, width: 125, height: 220, z: 30,
    img: 'bottles/bottle_empty.png',
  },
  /** نقطه‌ی Bottling کنار پاتیل — Drop Target واضح و بزرگ */
  bottlingPoint: {
    id: 'bottling_point',
    x: 1080, y: 560, width: 200, height: 240, z: 32,
  },
  /**
   * پیشخوان: جای مشتری ثابت است. پایینِ پیکسل‌های دیده‌شونده‌ی تصویر روی
   * y=1085 می‌نشیند؛ یعنی فقط ۵px از خودِ پیشخوان زیر لبه‌ی صحنه (۱۰۸۰) است
   * و بریده می‌شود، نه اینکه کل پیشخوان ۵px پایین بیاید.
   * مشتری (z=15) پشت آن می‌ایستد و از کمر به پایین پنهان می‌شود.
   */
  customerCounter: {
    id: 'customer_counter',
    x: 1430, y: 603, width: 510, height: 485, z: 20,
    img: 'customer/counter.png',
  },
  customer: {
    id: 'customer',
    /* پایین تصویر ≈ سطح پیشخوان تا کمر پشت پیشخوان بنشیند، نه در هوا */
    x: 1510, y: 248, width: 350, height: 512, z: 15,
    states: {
      woman_elder: 'customer/customer_woman_elder.png',
      man_worker: 'customer/customer_man_worker.png',
      woman_young: 'customer/customer_woman_young.png',
      man_elder: 'customer/customer_man_elder.png',
      // شش ظاهر جدید (tools/build_customers.mjs) — هر یک با _happy / _sad
      woman_merchant: 'customer/customer_woman_merchant.png',
      woman_scribe: 'customer/customer_woman_scribe.png',
      woman_weaver: 'customer/customer_woman_weaver.png',
      woman_healer: 'customer/customer_woman_healer.png',
      man_scholar: 'customer/customer_man_scholar.png',
      man_musician: 'customer/customer_man_musician.png',
      // سری سوم (جوان، بیشتر دختر؛ چهره‌های متفاوت)
      woman_student: 'customer/customer_woman_student.png',
      woman_florist: 'customer/customer_woman_florist.png',
      woman_noble: 'customer/customer_woman_noble.png',
      woman_traveler: 'customer/customer_woman_traveler.png',
      woman_baker: 'customer/customer_woman_baker.png',
      man_apprentice: 'customer/customer_man_apprentice.png',
      // سری چهارم — دخترهای ۱۹ تا ۳۵، چهره‌های جدا، روسریِ شُل
      woman_potter: 'customer/customer_woman_potter.png',
      woman_painter: 'customer/customer_woman_painter.png',
      woman_singer: 'customer/customer_woman_singer.png',
      woman_rider: 'customer/customer_woman_rider.png',
      woman_bride: 'customer/customer_woman_bride.png',
      woman_perfumer: 'customer/customer_woman_perfumer.png',
      woman_jeweler: 'customer/customer_woman_jeweler.png',
      woman_dancer: 'customer/customer_woman_dancer.png',
      woman_astronomer: 'customer/customer_woman_astronomer.png',
      // سری پنجم — روسریِ شُل، چهره‌های جدا
      woman_falconer: 'customer/customer_woman_falconer.png',
      woman_poet: 'customer/customer_woman_poet.png',
      woman_dyer: 'customer/customer_woman_dyer.png',
      woman_glass: 'customer/customer_woman_glass.png',
      woman_spice: 'customer/customer_woman_spice.png',
      woman_chess: 'customer/customer_woman_chess.png',
    },
  },
  /** کاغذ خلاصه‌ی سفارش — دائمی، بالا-راست، فشرده */
  goalNote: {
    id: 'goal_note',
    x: 1460, y: 24, width: 430, height: 150, z: 50,
    img: 'goal/goal_note.png',
  },
} as const satisfies Record<string, SceneZone>;

export type SceneZoneId = keyof typeof SCENE_ZONES;

export function artUrl(relPath: string): string {
  return `${ART_BASE}/${relPath}`;
}

/**
 * قرارداد asset های ارتقای کلاسیک (state های لایه‌باز). همه‌ی مسیرها نسبت به
 * ART_BASE هستند.
 *
 * هاون v3: back/front روی بوم مشترک؛ شش فریم pestle با لنگر سر مشترک
 * (0.42, 0.74)؛ اسپرایت تکه‌ها در `mortar/v3/pieces/{kind}_{i}.png` (۷ تا
 * برای هر نوع)؛ هندسه در `mortarGeometry.ts`. فریم‌های آتش بوم مشترک خودشان
 * را دارند (لنگر پایین-وسط تا هیزم‌ها بین فریم‌ها ثابت بمانند).
 */
export const CLASSIC_ART = {
  mortar: {
    /** کل بدنه (پشت محتوا) — بوم مشترک با front */
    back: 'mortar/v3/mortar_back.png',
    /** دیواره‌ی جلو روی همان بوم */
    front: 'mortar/v3/mortar_front.png',
    /** ۶ فریم کوبه؛ لنگر سر در (0.42, 0.74) روی بوم مشترک */
    pestleFrames: [
      'mortar/v3/pestle_1.png',
      'mortar/v3/pestle_2.png',
      'mortar/v3/pestle_3.png',
      'mortar/v3/pestle_4.png',
      'mortar/v3/pestle_5.png',
      'mortar/v3/pestle_6.png',
    ],
  },
  cauldron: {
    /** سطح آرام معجون */
    potionStill: 'cauldron/potion_still.png',
    /** بافت گرداب — هنگام Stir با transform: rotate چرخانده شود */
    potionSwirl: 'cauldron/potion_swirl.png',
    /** ۲ فریم قل‌قل (تعویض متناوب، سرعت وابسته به شدت آتش) */
    potionBoil: ['cauldron/potion_boil_1.png', 'cauldron/potion_boil_2.png'],
  },
  /** ۳ فریم لرزش شعله برای هر شدت */
  fireFrames: {
    low: ['heat/fire_low_1.png', 'heat/fire_low_2.png', 'heat/fire_low_3.png'],
    medium: ['heat/fire_medium_1.png', 'heat/fire_medium_2.png', 'heat/fire_medium_3.png'],
    high: ['heat/fire_high_1.png', 'heat/fire_high_2.png', 'heat/fire_high_3.png'],
  },
  /** سطل چوبی Reset — جایگزین سطل CSS */
  bucket: 'table/bucket.png',
  /** تخته‌ی قفسه‌ی دیواری */
  shelfBoard: 'shelf/shelf_board.png',
  /**
   * حالت احساسی مشتری؛ حالت عادی همان تصویر SCENE_ZONES.customer.states است.
   * band ارزیابی excellent/good ⇒ happy و partial/failure ⇒ sad.
   */
  customerEmotion: (appearance: string, emotion: 'happy' | 'sad') =>
    `customer/customer_${appearance}_${emotion}.png` as const,
} as const;

/**
 * لایه‌های سردر دکان — تولید در tools/build_gate_layers.mjs.
 * متن فارسی روی تابلو، پلاک و پوست در Runtime می‌نشیند؛ پنجره‌ی در شفاف است.
 * فریم‌های شعله بوم مشترک دارند (لنگر پایین-وسط).
 */
export const GATE_ART = {
  doorWest: 'gate/door_west.png',
  doorEast: 'gate/door_east.png',
  lintel: 'gate/lintel.png',
  sill: 'gate/sill.png',
  sign: 'gate/sign.png',
  plaque: 'gate/plaque.png',
  seal: 'gate/seal.png',
  parchment: 'gate/parchment.png',
  drop: 'gate/drop.png',
  customerShadow: 'gate/customer_shadow.png',
  candle: 'gate/candle.png',
  flames: ['gate/flame_1.png', 'gate/flame_2.png', 'gate/flame_3.png'],
} as const;

/**
 * لایه‌های اینترو (نمای بیرونی دکان در بازار) — تولید در tools/build_intro_layers.mjs.
 * facade آسمان و دهانه‌ی در را شفاف دارد؛ لنگه‌های در، تابلو، پوست و سایه‌ی
 * رهگذر از GATE_ART می‌آیند. map_open و ledger_open بدون trim هستند تا مختصات
 * مُهرها و خط‌ها روی قاب ۱۶:۹ ثابت بماند. تیتر «کیمیاگر» تصویر نیست؛ با
 * Vazirmatn روی تابلو حروف‌چینی می‌شود (intro.css: .intro__logo).
 */
export const INTRO_ART = {
  facade: 'intro/facade.png',
  skyFx: 'intro/sky_fx.png',
  lantern: 'intro/lantern.png',
  knocker: 'intro/knocker.png',
  plaque: 'intro/plaque.png',
  mapRolled: 'intro/map_rolled.png',
  mapOpen: 'intro/map_open.png',
  ledgerClosed: 'intro/ledger_closed.png',
  ledgerOpen: 'intro/ledger_open.png',
  catSleep: 'intro/cat_sleep.png',
  catAwake: 'intro/cat_awake.png',
} as const;
