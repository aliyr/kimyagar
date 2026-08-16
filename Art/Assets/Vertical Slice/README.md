# Vertical Slice — Initial Asset Pipeline Test

## Style reference

`../../Concept Art/iranian-alchemist-shop-concept-03-gameplay-zones.png`

## Delivered design masters

- `prop_copper_cauldron_default.png` — دیگ مسی خالی؛ بدنه‌ی پهن، دسته‌های S، خط فیروزه‌ای و گل هشت‌پر.
- `prop_brass_mortar_pestle_default.png` — هاون و دسته‌هاون بدون هم‌پوشانی برای جداسازی بعدی.
- `prop_brass_scale_balanced.png` — ترازوی برنجی در حالت خالی و متعادل.
- `container_potion_bottle_turquoise.png` — شیشه‌ی معجون با شانه‌ی پله‌ای، برچسب بادامی، بند زرشکی و مهر فیروزه‌ای.
- `ingredient_saffron_packet_default.png` — بسته‌ی باز زعفران، بند/مهر و گل زعفران برای تشخیص بدون متن.

## Shared final prompt contract

```text
Use case: stylized-concept
Asset type: final 2D mobile-game prop or ingredient sprite design
Input images: Gameplay Concept 03 is a style and world reference only, not an edit target.
Style: final-game 2D stylized painterly; Persian-inspired Kimiyagar design language; warm upper-left light; slightly flattened front three-quarter camera; broad painted shapes; low micro-detail; soft controlled dark-brown edges; tactile handmade age; restrained identity palette.
Composition: exactly one asset or explicitly separated component pair, fully visible, centered, generous padding, strong silhouette readable at 128px.
Backdrop: perfectly plain uniform warm parchment-cream.
Constraints: no environment, UI, text, letters, logo, watermark, dramatic shadow, multi-view sheet, photorealism, glossy 3D, childish cartoon, Western fantasy, or steampunk.
```

## Asset-specific prompt decisions

### Copper cauldron

Empty broad low-bellied copper vessel; thick rim; two S handles; short base; large simplified hammered facets; restrained patina; thin turquoise inlay below rim; one small antique-gold eight-petal engraving; dark empty interior; no liquid or FX.

### Brass mortar and pestle

Exactly two non-overlapping components; footed mortar with flared lip and small engraved motif; full pestle with enlarged grinding end and subtly lobed grip; no contents or particles.

### Brass scale

Single compact apothecary balance in neutral empty state; stepped base, pointed-arch finial, clear beam, two pans and readable short chains; one small motif on base; no weights or motion.

### Potion bottle

Single turquoise handmade glass bottle; broad base, stepped shoulders, lobed short neck, cork; simplified two-thirds liquid fill; pointed-arch parchment label with nonverbal motif; barberry cord and turquoise seal; no bubbles or glow.

### Saffron

Single grouped pickup: opened folded manuscript-like packet with a bold mass of deep-red saffron threads, restrained spill, barberry cord, turquoise seal, one purple crocus and one bud; no bowl or botanical-chart treatment.

## Production status

این پنج فایل style-final design masters هستند، نه export نهایی موتور بازی. مرحله‌ی بعدی production باید background را حذف، sub-spriteهای لازم را تفکیک، bounds/pivot را ثبت و در اندازه‌ی واقعی موبایل تست کند.
