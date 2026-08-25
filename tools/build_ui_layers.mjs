/**
 * Kimyagar — UI Layers asset pipeline.
 *
 * ورودی: تصاویر master تولیدشده با AI (پس‌زمینه‌ی روشن یکدست یا مشکی خالص)
 * خروجی: PNG های شفاف در «Art/UI Layers/<folder>/» و کپی در «Web/public/art/<key>/».
 *
 * سه نوع پردازش:
 *  - light-bg : حذف پس‌زمینه‌ی روشن یکدست (نمونه‌گیری حاشیه + فاصله‌ی رنگی + unmix لبه)
 *  - black-bg : تبدیل محتوای روی مشکی خالص (آتش/بخار) به آلفا (max-channel unpremultiply)
 *  - opaque   : کپی بدون تغییر (پس‌زمینه‌ی صحنه)
 *
 * Usage:  node tools/build_ui_layers.mjs
 */

import sharp from 'sharp';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blackToAlpha, ensureDirs, makeGlow, removeLightBackground } from './image_utils.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MASTERS = 'C:/Users/mkfar/.cursor/projects/d-Source-Kimiagar/assets';
const UI_LAYERS = join(ROOT, 'Art', 'UI Layers');
const WEB_ART = join(ROOT, 'Web', 'public', 'art');

/** @type {{master:string, mode:'light-bg'|'black-bg'|'opaque', layer:string, web:string, trim?:boolean}[]} */
const JOBS = [
  { master: 'kimyagar_shop_background.png', mode: 'opaque', layer: '00_Background/shop_background.png', web: 'background/shop_background.png' },
  { master: 'kimyagar_cabinet_closed.png', mode: 'light-bg', layer: '10_Ingredient_Cabinet/cabinet_closed.png', web: 'cabinet/cabinet_closed.png', trim: true },
  { master: 'kimyagar_cabinet_open.png', mode: 'light-bg', layer: '10_Ingredient_Cabinet/cabinet_open.png', web: 'cabinet/cabinet_open.png', trim: true },
  { master: 'kimyagar_jar_chamomile.png', mode: 'light-bg', layer: '10_Ingredient_Cabinet/jar_chamomile.png', web: 'cabinet/jar_chamomile.png', trim: true },
  { master: 'kimyagar_jar_borage.png', mode: 'light-bg', layer: '10_Ingredient_Cabinet/jar_borage.png', web: 'cabinet/jar_borage.png', trim: true },
  { master: 'kimyagar_jar_mint.png', mode: 'light-bg', layer: '10_Ingredient_Cabinet/jar_mint.png', web: 'cabinet/jar_mint.png', trim: true },
  { master: 'kimyagar_jar_saffron.png', mode: 'light-bg', layer: '10_Ingredient_Cabinet/jar_saffron.png', web: 'cabinet/jar_saffron.png', trim: true },
  { master: 'kimyagar_jar_poppy.png', mode: 'light-bg', layer: '10_Ingredient_Cabinet/jar_poppy.png', web: 'cabinet/jar_poppy.png', trim: true },
  { master: 'kimyagar_jar_ginger.png', mode: 'light-bg', layer: '10_Ingredient_Cabinet/jar_ginger.png', web: 'cabinet/jar_ginger.png', trim: true },
  { master: 'kimyagar_work_table.png', mode: 'light-bg', layer: '20_Work_Table/work_table.png', web: 'table/work_table.png', trim: true },
  { master: 'kimyagar_cauldron_liquid.png', mode: 'light-bg', layer: '30_Cauldron/cauldron_liquid.png', web: 'cauldron/cauldron_liquid.png', trim: true },
  { master: 'kimyagar_steam.png', mode: 'black-bg', layer: '30_Cauldron/steam_01.png', web: 'cauldron/steam_01.png', trim: true },
  { master: 'kimyagar_fire_low.png', mode: 'black-bg', layer: '50_Heat_Source/fire_low.png', web: 'heat/fire_low.png', trim: true },
  { master: 'kimyagar_fire_medium.png', mode: 'black-bg', layer: '50_Heat_Source/fire_medium.png', web: 'heat/fire_medium.png', trim: true },
  { master: 'kimyagar_fire_high.png', mode: 'black-bg', layer: '50_Heat_Source/fire_high.png', web: 'heat/fire_high.png', trim: true },
  { master: 'kimyagar_bottle_full.png', mode: 'light-bg', layer: '60_Bottles/bottle_full.png', web: 'bottles/bottle_full.png', trim: true },
  { master: 'kimyagar_customer_counter.png', mode: 'light-bg', layer: '70_Customer_Counter/counter.png', web: 'customer/counter.png', trim: true },
  { master: 'kimyagar_customer_woman_elder.png', mode: 'light-bg', layer: '70_Customer_Counter/customer_woman_elder.png', web: 'customer/customer_woman_elder.png', trim: true },
  { master: 'kimyagar_customer_man_worker.png', mode: 'light-bg', layer: '70_Customer_Counter/customer_man_worker.png', web: 'customer/customer_man_worker.png', trim: true },
  { master: 'kimyagar_customer_woman_young.png', mode: 'light-bg', layer: '70_Customer_Counter/customer_woman_young.png', web: 'customer/customer_woman_young.png', trim: true },
  { master: 'kimyagar_customer_man_elder.png', mode: 'light-bg', layer: '70_Customer_Counter/customer_man_elder.png', web: 'customer/customer_man_elder.png', trim: true },
  { master: 'kimyagar_goal_note.png', mode: 'light-bg', layer: '80_Goal_Note/goal_note.png', web: 'goal/goal_note.png', trim: true },
];

/** asset های موجود پروژه که مستقیم reuse می‌شوند (آلفا از قبل دارند یا light-bg هستند) */
const REUSE = [
  { src: 'Art/Assets/Vertical Slice/prop_copper_cauldron_default.png', mode: 'light-bg', layer: '30_Cauldron/cauldron_body.png', web: 'cauldron/cauldron_body.png', trim: true },
  { src: 'Art/Assets/Vertical Slice/container_potion_bottle_turquoise.png', mode: 'light-bg', layer: '60_Bottles/bottle_empty.png', web: 'bottles/bottle_empty.png', trim: true },
  { src: 'Art/Assets/Production/Mortar/mortar_body.png', mode: 'copy', layer: '40_Mortar/mortar_body.png', web: 'mortar/mortar_body.png' },
  { src: 'Art/Assets/Production/Mortar/mortar_pestle.png', mode: 'copy', layer: '40_Mortar/mortar_pestle.png', web: 'mortar/mortar_pestle.png' },
  { src: 'Art/Assets/Production/Mortar/mortar_contents_base.png', mode: 'copy', layer: '40_Mortar/mortar_contents_base.png', web: 'mortar/mortar_contents_base.png' },
  { src: 'Art/Assets/Production/Mortar/mortar_contents_crushed.png', mode: 'copy', layer: '40_Mortar/mortar_contents_crushed.png', web: 'mortar/mortar_contents_crushed.png' },
  { src: 'Art/Assets/Production/Mortar/mortar_shadow.png', mode: 'copy', layer: '40_Mortar/mortar_shadow.png', web: 'mortar/mortar_shadow.png' },
];

async function saveBoth(pipeline, layerRel, webRel, trim) {
  const layerPath = join(UI_LAYERS, layerRel);
  const webPath = join(WEB_ART, webRel);
  ensureDirs(layerPath, webPath);
  let img = pipeline.png();
  if (trim) {
    // trim شفاف با حاشیه‌ی امن ۴ پیکسل
    const buf = await img.toBuffer();
    img = sharp(buf).trim({ threshold: 8 }).extend({
      top: 4, bottom: 4, left: 4, right: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }).png();
  }
  const buf = await img.toBuffer();
  await sharp(buf).toFile(layerPath);
  copyFileSync(layerPath, webPath);
  console.log(`ok  ${layerRel}`);
}

async function main() {
  for (const job of JOBS) {
    const input = join(MASTERS, job.master);
    if (!existsSync(input)) { console.warn(`MISSING master: ${job.master}`); continue; }
    if (job.mode === 'opaque') {
      const layerPath = join(UI_LAYERS, job.layer);
      const webPath = join(WEB_ART, job.web);
      ensureDirs(layerPath, webPath);
      await sharp(input).png().toFile(layerPath);
      copyFileSync(layerPath, webPath);
      console.log(`ok  ${job.layer} (opaque)`);
    } else if (job.mode === 'black-bg') {
      await saveBoth(await blackToAlpha(input), job.layer, job.web, job.trim);
    } else {
      await saveBoth(await removeLightBackground(input), job.layer, job.web, job.trim);
    }
  }
  for (const job of REUSE) {
    const input = join(ROOT, job.src);
    if (!existsSync(input)) { console.warn(`MISSING reuse: ${job.src}`); continue; }
    if (job.mode === 'copy') {
      const layerPath = join(UI_LAYERS, job.layer);
      const webPath = join(WEB_ART, job.web);
      ensureDirs(layerPath, webPath);
      copyFileSync(input, layerPath);
      copyFileSync(input, webPath);
      console.log(`ok  ${job.layer} (copied)`);
    } else {
      await saveBoth(await removeLightBackground(input), job.layer, job.web, job.trim);
    }
  }
  await saveBoth(await makeGlow(), '90_FX/discovery_glow.png', 'fx/discovery_glow.png', false);
  console.log('done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
