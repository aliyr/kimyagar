class_name Content
extends RefCounted
## Quotes, time of day, stages, player-facing labels. Web/src/data + intro/timeOfDay.ts

const QUOTES: Array = [
	{"lines": ["آفرین جان‌آفرین پاک را", "آن‌که جان بخشید و ایمان خاک را"], "attribution": "عطار، منطق‌الطیر"},
	{"lines": ["گر مرد رهی میان خون باید رفت", "از پای فتاده سرنگون باید رفت"], "attribution": "عطار، مختارنامه"},
	{"lines": ["تو پای به راه در نه و هیچ مپرس", "خود راه بگویدت که چون باید رفت"], "attribution": "عطار، مختارنامه"},
	{"lines": ["چون نگه کردند آن سی مرغ زود", "بی‌شک این سی مرغ آن سیمرغ بود"], "attribution": "عطار، منطق‌الطیر"},
	{"lines": ["ره میخانه و مسجد کدام است", "که هر دو بر من مسکین حرام است"], "attribution": "عطار، دیوان غزلیات"},
	{"lines": ["ای دل اگر عاشقی در پی دلدار باش", "بر در دل روز و شب منتظر یار باش"], "attribution": "منسوب به عطار"},
	{"lines": ["هفت شهر عشق را عطار گشت", "ما هنوز اندر خم یک کوچه‌ایم"], "attribution": "مولانا، در وصف عطار"},
]

const STAGES: Array = [
	{"id": "shop", "nameFa": "دکان", "hintFa": "دکان پدری؛ نخستین مشتری‌ها", "mapX": 22.8, "mapY": 74.3},
	{"id": "lane", "nameFa": "راسته‌ی عطاران", "hintFa": "همسایه‌ها سراغت را می‌گیرند", "mapX": 32.7, "mapY": 67.4},
	{"id": "caravanserai", "nameFa": "کاروانسرا", "hintFa": "مسافران و دردهای غریب", "mapX": 41.8, "mapY": 55.2},
	{"id": "bathhouse", "nameFa": "گرمابه", "hintFa": "بوی عود و روغن", "mapX": 52.8, "mapY": 47.2},
	{"id": "minaret", "nameFa": "مدرسه", "hintFa": "نسخه‌های کهنه و رازهای تازه", "mapX": 62.3, "mapY": 34.2},
	{"id": "garden", "nameFa": "باغ", "hintFa": "گیاهانی که در دکان نیست", "mapX": 75.8, "mapY": 24.5},
]

const SKY := {
	"night": {
		"skyA": "#070a1c", "skyB": "#111a3f", "skyC": "#26305e",
		"moon": 1.0, "stars": 1.0, "facadeBrightness": 0.7, "facadeSaturate": 0.9,
		"tintFilter": "sepia(0.35) hue-rotate(190deg) saturate(1.3) brightness(0.5)",
		"tintOpacity": 0.3, "lanternStrength": 1.0, "passerOpacity": 0.5, "fireflies": true,
	},
	"dusk": {
		"skyA": "#1f1230", "skyB": "#6e2a3a", "skyC": "#d4823f",
		"moon": 0.38, "stars": 0.15, "facadeBrightness": 0.86, "facadeSaturate": 1.05,
		"tintFilter": "sepia(0.7) hue-rotate(-18deg) saturate(1.8) brightness(0.8)",
		"tintOpacity": 0.32, "lanternStrength": 0.8, "passerOpacity": 0.3, "fireflies": false,
	},
	"dawn": {
		"skyA": "#2c3f7a", "skyB": "#8a7ea8", "skyC": "#e9c0ae",
		"moon": 0.28, "stars": 0.0, "facadeBrightness": 0.96, "facadeSaturate": 0.95,
		"tintFilter": "sepia(0.35) hue-rotate(215deg) saturate(1.2) brightness(0.95)",
		"tintOpacity": 0.26, "lanternStrength": 0.5, "passerOpacity": 0.16, "fireflies": false,
	},
}

const QUALITATIVE := {"none": "—", "low": "کم", "medium": "متوسط", "high": "زیاد", "very_high": "بسیار زیاد"}
const STABILITY := {"stable": "پایدار", "slightly_unstable": "کمی ناپایدار", "unstable": "ناپایدار", "very_unstable": "بسیار ناپایدار"}
const BAND := {"excellent": "عالی", "good": "خوب", "partial": "نیمه‌کاره", "failure": "ناموفق"}
const GRIND := {"coarse": "درشت", "crushed": "نیم‌کوب", "fine": "نرم"}
const HEAT := {"low": "ملایم", "medium": "متوسط", "high": "تند"}
const STAGE := {"fresh": "تازه", "extracting": "در حال جوشش", "ready": "رسیده", "overprocessed": "جوشیده و سوخته"}
const QUANTITY_KEYS: Array = [0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0]
const QUANTITY_VALS: Array = ["۰٫۵", "۱", "۱٫۵", "۲", "سه واحد", "چهار واحد", "پنج واحد", "شش واحد"]
const PROCESS := {
	"ingredient_added": "افزودن ماده",
	"heat_changed": "تغییر حرارت",
	"stirred": "هم‌زدن",
	"bottled": "بطری کردن",
	"brew_reset": "خالی کردن پاتیل",
}
const UI := {
	"gameTitle": "کیمیاگر",
	"gateSubtitle": "دکان عطاری در راسته‌ی بازار",
	"gateStart": "شروع بازی",
	"gateContinue": "ادامه",
	"gateFresh": "دکان تازه",
	"gateFreshConfirm": "همه‌ی حساب‌ها و کشف‌ها پاک می‌شود. دکان از نو باز شود؟",
	"gateFreshYes": "آری، از نو",
	"gateFreshNo": "نه، ادامه می‌دهم",
	"gateStages": "مراحل",
	"gateScores": "امتیازها",
	"gateMapTitle": "نقشه‌ی بازار",
	"gateLocked": "هنوز مُهر نشده",
	"gateLedgerTitle": "دفتر حساب",
	"gateLedgerEmpty": "هنوز حسابی نوشته نشده",
	"gateLedgerEmptyHint": "اولین معجون را که تحویل بدهی، این‌جا ثبت می‌شود.",
	"gateLedgerBest": "بهترین دم",
	"gateLedgerCustomer": "مشتری",
	"gateLedgerResult": "نتیجه",
	"gateCat": "گربه‌ی دکان",
	"gateReturn": "سردر",
	"bottleAction": "بطری کردن",
	"stirHint": "برای هم‌زدن، انگشتت را دور پاتیل بچرخان",
	"grindHint": "برای کوبیدن، دسته‌هاون را بچرخان",
	"grindingHint": "دارد کوبیده می‌شود… هر وقت خواستی هاون را لمس کن",
	"tapMortarHint": "برای ریختن در پاتیل، هاون را لمس کن",
	"tapToBottleHint": "برای ریختن در شیشه، پاتیل را لمس کن",
	"burntHint": "سوخت! تحویل‌شدنی نیست؛ در سطل خالی‌اش کن",
	"discardBurnt": "دور ریختن",
	"jarTapHint": "یک شیشه را لمس کن تا در هاون بریزد",
	"soundOn": "صدا روشن",
	"soundOff": "صدا خاموش",
	"settings": "تنظیمات",
	"settingSound": "صدای کارگاه",
	"settingSoundHint": "قُل‌قُل پاتیل، ترق آتش و کوبش هاون",
	"settingHaptics": "لرزش",
	"settingHapticsHint": "بازخورد لمسی در گوشی (کوبش، ریختن، تحویل)",
	"on": "روشن",
	"off": "خاموش",
	"deliver": "تحویل به مشتری",
	"keep": "نگه داشتن",
	"retry": "آزمایش دوباره",
	"repeatLast": "تکرار آخرین دم",
	"resetBrew": "خالی کردن پاتیل",
	"notebook": "دفترچه",
	"processHistory": "آنچه تا حالا ریخته‌ای",
	"customerRequest": "سفارش مشتری",
	"quantity": "مقدار",
	"addToCauldron": "به پاتیل بریز",
	"nextCustomer": "مشتری بعدی",
	"debugView": "نمای اشکال‌زدایی",
	"potionReady": "معجون آماده شد",
	"unknownSecret": "هنوز رازش را نمی‌دانی...",
	"unknownMark": "؟؟؟",
	"emptyHistory": "هنوز چیزی در پاتیل نریخته‌ای.",
	"effectProfile": "اثر معجون",
	"processSummary": "خلاصه‌ی کار",
	"qualityTagsHeading": "نشان‌های کیفیت",
	"notebookTags": "نشان‌های کشف‌شده",
	"notebookIngredients": "مواد آزموده",
	"stirCount": "هم‌زدن",
	"heatChanges": "تغییرهای حرارت",
	"noDiscoveries": "هنوز نشانی کشف نکرده‌ای.",
	"closeOverlay": "بستن",
	"heatAtEntry": "حرارتِ ورود",
	"grindState": "کوبش",
}


static func day_of_year_ymd(year: int, month: int, day: int) -> int:
	var mdays: Array = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
	if (year % 4 == 0 and year % 100 != 0) or year % 400 == 0:
		mdays[1] = 29
	var n := day - 1
	for i in range(month - 1):
		n += int(mdays[i])
	return n


static func quote_for_date(year: int, month: int, day: int) -> Dictionary:
	var idx := (day_of_year_ymd(year, month, day) + year) % QUOTES.size()
	return QUOTES[idx]


static func time_of_day_for_hour(hour: float) -> String:
	var h := int(floor(hour)) % 24
	if h < 0:
		h += 24
	if h >= 4 and h < 11:
		return "dawn"
	if h >= 11 and h < 19:
		return "dusk"
	return "night"


static func hour_override(search: String) -> Variant:
	var re := RegEx.new()
	re.compile("[?&]hour=(\\d{1,2})")
	var m := re.search(search)
	if m == null:
		return null
	var h := int(m.get_string(1))
	if h >= 0 and h < 24:
		return h
	return null


static func stage_unlocked(index: int) -> bool:
	return index == 0


static func to_fa_digits(value: float) -> String:
	var s := str(snapped(value, 0.01))
	if s.ends_with(".0"):
		s = s.substr(0, s.length() - 2)
	s = s.replace(".", "٫")
	var out := ""
	const MAP := {"0": "۰", "1": "۱", "2": "۲", "3": "۳", "4": "۴", "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹", "-": "-"}
	for i in s.length():
		var c := s.substr(i, 1)
		out += MAP.get(c, c)
	return out


static func format_quantity(q: float) -> String:
	for i in QUANTITY_KEYS.size():
		if is_equal_approx(float(QUANTITY_KEYS[i]), q):
			return QUANTITY_VALS[i]
	return "%s واحد" % to_fa_digits(q)


static func heat_from_payload(payload) -> Variant:
	if typeof(payload) != TYPE_DICTIONARY:
		return null
	var v = payload.get("heat", payload.get("to", payload.get("newHeat", payload.get("level", null))))
	if v == "low" or v == "medium" or v == "high":
		return v
	return null
