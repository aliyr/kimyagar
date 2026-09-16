/* GENERATED FROM Kimiagar.Works — do not edit.
 * source: src/flat/palette.ts
 * sync:   npm run art:sync-works   (scripts/sync-works-flat.mjs)
 * works-commit: 689a5ea
 */
/**
 * Flat-cartoon palette. Same ancient-Persian materials as the pixel palette
 * (aged copper, gold, turquoise, lapis, ingredient colours) but expressed as
 * cel-shading triples: a flat `base`, one `shade` step and one `light` step.
 *
 * Every flat prop uses `OUTLINE` for its thick cartoon outline.
 */
export interface Tone {
  base: string;
  shade: string;
  light: string;
}

export const OUTLINE = '#2a1810';
export const OUTLINE_SOFT = '#4a2a18';
/** Slim dark-copper outline used by the cauldron (softer than OUTLINE). */
export const POT_LINE = '#5a2e1a';

/** Warm terracotta copper, matched to the Kimiagar workshop cauldron. */
export const COPPER: Tone = { base: '#c67d4c', shade: '#a05a36', light: '#dfa070' };
export const COPPER_HIGHLIGHT = '#f4c98a';
export const GOLD: Tone = { base: '#cf9a35', shade: '#a5741f', light: '#f3dc8e' };
export const TURQUOISE: Tone = { base: '#26a69a', shade: '#1b7f76', light: '#7fe0d4' };
export const LAPIS: Tone = { base: '#24408e', shade: '#182a60', light: '#4a6ad0' };
/** Dark cavity of the pot seen above the liquid. */
export const INTERIOR: Tone = { base: '#3a1d10', shade: '#1b0d06', light: '#5a2e18' };

export const WATER = '#3f6f8f';
export const WATER_LIGHT = '#6fa3c4';
export const STEAM = '#e8e2d6';
/** Grey smoke of a burnt brew (replaces STEAM when the host flags `setBurnt(true)`). */
export const SMOKE = '#6d655c';
export const SPARK_WHITE = '#ffffff';
export const SPARK_GOLD = '#f3dc8e';

export const WOOD: Tone = { base: '#6b4a2e', shade: '#4a3020', light: '#8a6540' };
export const EMBER = '#e8802a';

export const FIRE = {
  deep: '#7a1f14',
  red: '#c0392b',
  orange: '#e8802a',
  yellow: '#f5c542',
  white: '#fff2c0',
} as const;

/* ---- ingredients ---- */
export const SAFFRON_RED: Tone = { base: '#c0392b', shade: '#8e1f1a', light: '#e8802a' };
export const YELLOW: Tone = { base: '#f5c542', shade: '#d9a21b', light: '#fff2c0' };
export const POPPY_SEED = '#1e1b2e';
export const POPPY_POD: Tone = { base: '#8aa67a', shade: '#5f7a52', light: '#b7cba3' };
export const BORAGE: Tone = { base: '#5b4bd6', shade: '#3a2f99', light: '#9d8ff0' };
export const CHAMOMILE_WHITE: Tone = { base: '#fbf7ee', shade: '#e6dcc4', light: '#ffffff' };
export const LEAF: Tone = { base: '#5e8c4a', shade: '#3e6130', light: '#8ab86f' };
export const MINT: Tone = { base: '#4f9a62', shade: '#2f6b40', light: '#93d49c' };
export const GINGER: Tone = { base: '#d9a35a', shade: '#a6712f', light: '#f2d69c' };
export const GINGER_FLESH = '#f7e7b3';

/** Swatches shown in the web preview (label → hex). */
export const FLAT_SWATCHES: readonly { label: string; hex: string }[] = [
  { label: 'خط دور', hex: OUTLINE },
  { label: 'مس', hex: COPPER.base },
  { label: 'مس تیره', hex: COPPER.shade },
  { label: 'مس روشن', hex: COPPER.light },
  { label: 'هایلایت مس', hex: COPPER_HIGHLIGHT },
  { label: 'طلا', hex: GOLD.base },
  { label: 'طلای تیره', hex: GOLD.shade },
  { label: 'طلای روشن', hex: GOLD.light },
  { label: 'فیروزه', hex: TURQUOISE.base },
  { label: 'فیروزهٔ تیره', hex: TURQUOISE.shade },
  { label: 'فیروزهٔ روشن', hex: TURQUOISE.light },
  { label: 'لاجورد', hex: LAPIS.base },
  { label: 'لاجورد روشن', hex: LAPIS.light },
  { label: 'درون دیگ', hex: INTERIOR.base },
  { label: 'آب', hex: WATER },
  { label: 'سرخ زعفران', hex: SAFFRON_RED.base },
  { label: 'نارنجی زعفران', hex: SAFFRON_RED.light },
  { label: 'زرد', hex: YELLOW.base },
  { label: 'دانهٔ خشخاش', hex: POPPY_SEED },
  { label: 'سبز غوزه', hex: POPPY_POD.base },
  { label: 'بنفش گاوزبان', hex: BORAGE.base },
  { label: 'بنفش روشن', hex: BORAGE.light },
  { label: 'سفید بابونه', hex: CHAMOMILE_WHITE.base },
  { label: 'سبز برگ', hex: LEAF.base },
  { label: 'سبز نعناع', hex: MINT.base },
  { label: 'زنجبیل', hex: GINGER.base },
  { label: 'هیزم', hex: WOOD.base },
  { label: 'شعله', hex: FIRE.orange },
  { label: 'بخار', hex: STEAM },
];
