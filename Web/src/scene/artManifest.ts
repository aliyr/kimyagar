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
  workTable: {
    id: 'work_table',
    x: 60, y: 600, width: 1420, height: 480, z: 10,
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
  cauldron: {
    id: 'cauldron',
    x: 640, y: 470, width: 470, height: 440, z: 30,
    img: 'cauldron/cauldron_body.png',
  },
  /** سطح مایع داخل پاتیل (رنگ با ترکیب مواد تغییر می‌کند) */
  cauldronLiquid: {
    id: 'cauldron_liquid',
    x: 700, y: 520, width: 350, height: 120, z: 31,
    img: 'cauldron/cauldron_liquid.png',
  },
  heatSource: {
    id: 'heat_source',
    x: 690, y: 880, width: 370, height: 170, z: 25,
    states: {
      low: 'heat/fire_low.png',
      medium: 'heat/fire_medium.png',
      high: 'heat/fire_high.png',
    },
  },
  mortar: {
    id: 'mortar',
    x: 260, y: 600, width: 320, height: 300, z: 35,
    img: 'mortar/mortar_body.png',
  },
  /** قفسه/سبد بطری‌های خالی */
  bottleShelf: {
    id: 'bottle_shelf',
    x: 1190, y: 700, width: 220, height: 260, z: 30,
    img: 'bottles/bottle_empty.png',
  },
  /** نقطه‌ی Bottling کنار پاتیل — Drop Target واضح و بزرگ */
  bottlingPoint: {
    id: 'bottling_point',
    x: 1080, y: 560, width: 200, height: 240, z: 32,
  },
  customerCounter: {
    id: 'customer_counter',
    x: 1440, y: 540, width: 480, height: 540, z: 20,
    img: 'customer/counter.png',
  },
  customer: {
    id: 'customer',
    x: 1520, y: 210, width: 340, height: 520, z: 15,
    states: {
      woman_elder: 'customer/customer_woman_elder.png',
      man_worker: 'customer/customer_man_worker.png',
      woman_young: 'customer/customer_woman_young.png',
      man_elder: 'customer/customer_man_elder.png',
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
 * قرارداد asset های ارتقای کلاسیک (state های لایه‌باز) — تولید در
 * tools/build_classic_upgrade.mjs. همه‌ی مسیرها نسبت به ART_BASE هستند.
 *
 * هم‌ترازی: mortar_back / mortar_front / contents_* روی «بوم مشترک» رندر
 * شده‌اند؛ اگر هر سه با object-fit یکسان در یک Rect رندر شوند، پیکسل‌به‌پیکسل
 * هم‌تراز می‌مانند. فریم‌های pestle و آتش هم هر ست بوم مشترک خودشان را دارند
 * (آتش: لنگر پایین-وسط تا هیزم‌ها بین فریم‌ها ثابت بمانند).
 */
export const CLASSIC_ART = {
  mortar: {
    /** کل بدنه (پشت محتوا) */
    back: 'mortar/mortar_back.png',
    /** دیواره‌ی جلو — وقتی هاون محتوا دارد با opacity ~0.5 رندر شود */
    front: 'mortar/mortar_front.png',
    /** محتوای کف هاون؛ رنگ ماده با blend (مثل luminosity) اعمال می‌شود */
    contents: (units: 1 | 2 | 3, state: 'raw' | 'ground') =>
      `mortar/contents_${units}_${state}.png` as const,
    /** ۳ فریم انیمیشن کوبش (زاویه‌ی پخته‌شده) */
    pestleFrames: [
      'mortar/pestle_1.png',
      'mortar/pestle_2.png',
      'mortar/pestle_3.png',
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
