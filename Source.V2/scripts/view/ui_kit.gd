class_name UiKit
extends RefCounted

static var regular: Font
static var medium: Font
static var bold: Font
static var extrabold: Font
static var hand: Font
static var _cache := {}
static var _radial: Texture2D

const STAGE := Vector2(1920.0, 1080.0)


static func fill(node: Control) -> void:
	# Logical stage, top-left anchors. Stretched anchors (left != right) make
	# Godot throw away a size set in _ready, which is the "non-equal opposite
	# anchors" warning and the reason a full-screen layer can collapse.
	node.set_anchors_preset(Control.PRESET_TOP_LEFT)
	node.position = Vector2.ZERO
	node.size = STAGE


static func place(node: Control, rect: Rect2) -> void:
	node.set_anchors_preset(Control.PRESET_TOP_LEFT)
	node.position = rect.position
	node.size = rect.size


static func shutdown() -> void:
	regular = null
	medium = null
	bold = null
	extrabold = null
	hand = null
	_cache.clear()


static func ensure() -> void:
	if regular != null:
		return
	regular = load("res://assets/fonts/Vazirmatn-Regular.ttf")
	medium = load("res://assets/fonts/Vazirmatn-Medium.ttf")
	bold = load("res://assets/fonts/Vazirmatn-Bold.ttf")
	extrabold = load("res://assets/fonts/Vazirmatn-ExtraBold.ttf")
	# Aref Ruqaa, OFL. Arabic/Persian ruqaa hand. Vazirmatn if the file is missing.
	hand = load("res://assets/fonts/ArefRuqaa-Regular.ttf")
	if hand == null:
		hand = regular


static func radial_texture() -> Texture2D:
	if _radial != null:
		return _radial
	var n := 128
	var bytes := PackedByteArray()
	bytes.resize(n * n * 4)
	var cx := float(n - 1) * 0.5
	for y in n:
		for x in n:
			var d := Vector2(float(x) - cx, float(y) - cx).length() / cx
			var a := clampf(1.0 - smoothstep(0.05, 1.0, d), 0.0, 1.0)
			var i := (y * n + x) * 4
			var b := int(a * 255.0 + 0.5)
			bytes[i] = 255
			bytes[i + 1] = 255
			bytes[i + 2] = 255
			bytes[i + 3] = b
	var img := Image.create_from_data(n, n, false, Image.FORMAT_RGBA8, bytes)
	_radial = ImageTexture.create_from_image(img)
	return _radial


static func tex(rel: String) -> Texture2D:
	if _cache.has(rel):
		return _cache[rel]
	var path := "res://assets/art/" + rel
	if not ResourceLoader.exists(path):
		return null
	var loaded: Texture2D = load(path) as Texture2D
	if loaded == null:
		return null
	_cache[rel] = loaded
	return loaded


static func sprite(rel: String, rect: Rect2, fit: String = "contain") -> TextureRect:
	var n := TextureRect.new()
	# IGNORE_SIZE before the texture. Otherwise the PNG's pixel size is the
	# minimum size, and assigning a smaller layout rect is clamped back up to it.
	n.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	n.stretch_mode = TextureRect.STRETCH_SCALE if fit == "fill" else (
		TextureRect.STRETCH_KEEP_ASPECT_COVERED if fit == "cover" else TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	)
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	n.custom_minimum_size = Vector2.ZERO
	n.texture = tex(rel)
	place(n, rect)
	# Size again after the texture. A KEEP_SIZE minimum would have clamped it.
	n.custom_minimum_size = Vector2.ZERO
	n.size = rect.size
	return n


static func label(text: String, rect: Rect2, size: int, color: Color, font: Font = null, align: int = HORIZONTAL_ALIGNMENT_CENTER) -> Label:
	ensure()
	var l := Label.new()
	l.text = text
	l.position = rect.position
	l.size = rect.size
	l.add_theme_font_override("font", font if font != null else regular)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.horizontal_alignment = align
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.text_direction = Control.TEXT_DIRECTION_RTL
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.clip_text = true
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	place(l, rect)
	return l


static func hit(rect: Rect2) -> Button:
	var b := Button.new()
	b.position = rect.position
	b.size = rect.size
	b.focus_mode = Control.FOCUS_NONE
	b.flat = true
	b.clip_text = true
	var empty := StyleBoxEmpty.new()
	for s in ["normal", "hover", "pressed", "focus"]:
		b.add_theme_stylebox_override(s, empty)
	place(b, rect)
	return b


static func parchment_button(text: String, rect: Rect2) -> Button:
	ensure()
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.clip_text = true
	b.add_theme_font_override("font", medium)
	b.add_theme_font_size_override("font_size", 22)
	b.add_theme_color_override("font_color", Color("6e1f2e"))
	b.add_theme_color_override("font_hover_color", Color("4a2218"))
	b.text_direction = Control.TEXT_DIRECTION_RTL
	var box := StyleBoxFlat.new()
	box.bg_color = Color("e6d2a8")
	box.border_color = Color("b8862f")
	box.set_border_width_all(2)
	box.set_corner_radius_all(8)
	box.content_margin_left = 10
	box.content_margin_right = 10
	b.add_theme_stylebox_override("normal", box)
	b.add_theme_stylebox_override("hover", box)
	b.add_theme_stylebox_override("pressed", box)
	place(b, rect)
	b.size = rect.size
	return b


## intro.css .intro__fresh — padding 5px 18px 7px, 19px medium, rotate is the caller's.
static func fresh_button(text: String, rect: Rect2) -> Button:
	ensure()
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.clip_text = false
	b.add_theme_font_override("font", medium)
	b.add_theme_font_size_override("font_size", 19)
	b.add_theme_color_override("font_color", Color("6e1f2e"))
	b.add_theme_color_override("font_hover_color", Color("4a2218"))
	b.text_direction = Control.TEXT_DIRECTION_RTL
	var box := StyleBoxFlat.new()
	box.bg_color = Color("e1d0a4")
	box.border_color = Color(110.0 / 255.0, 31.0 / 255.0, 46.0 / 255.0, 0.45)
	box.set_border_width_all(1)
	box.set_corner_radius_all(4)
	box.content_margin_left = 18
	box.content_margin_right = 18
	box.content_margin_top = 5
	box.content_margin_bottom = 7
	box.shadow_color = Color(0, 0, 0, 0.45)
	box.shadow_size = 3
	box.shadow_offset = Vector2(0, 3)
	b.add_theme_stylebox_override("normal", box)
	var hover := box.duplicate() as StyleBoxFlat
	hover.bg_color = Color("ead9b5")
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", box)
	b.add_theme_stylebox_override("focus", box)
	place(b, rect)
	b.size = rect.size
	return b


## intro.css .intro__note-btn — dark wood, parchment type.
static func note_button(text: String, rect: Rect2, danger: bool = false) -> Button:
	ensure()
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.clip_text = false
	b.add_theme_font_override("font", medium)
	b.add_theme_font_size_override("font_size", 22)
	b.add_theme_color_override("font_color", Color("e9d9b4"))
	b.add_theme_color_override("font_hover_color", Color("f4e6c8"))
	b.text_direction = Control.TEXT_DIRECTION_RTL
	var box := StyleBoxFlat.new()
	box.bg_color = Color("8a2a3c") if danger else Color("4a3018")
	box.border_color = Color(140.0 / 255.0, 60.0 / 255.0, 75.0 / 255.0, 0.9) if danger else Color(110.0 / 255.0, 78.0 / 255.0, 48.0 / 255.0, 0.9)
	box.set_border_width_all(2)
	box.set_corner_radius_all(8)
	box.content_margin_left = 18
	box.content_margin_right = 18
	box.shadow_color = Color(0, 0, 0, 0.4)
	box.shadow_size = 4
	box.shadow_offset = Vector2(0, 4)
	b.add_theme_stylebox_override("normal", box)
	var hover := box.duplicate() as StyleBoxFlat
	hover.bg_color = box.bg_color.lightened(0.12)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", box)
	b.add_theme_stylebox_override("focus", box)
	place(b, rect)
	b.size = rect.size
	return b


## intro.css .intro__panel-close — round brass seal.
static func seal_button(rect: Rect2) -> Button:
	ensure()
	var b := Button.new()
	b.text = "×"
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_font_override("font", bold)
	b.add_theme_font_size_override("font_size", 34)
	b.add_theme_color_override("font_color", Color("2b1d12"))
	b.add_theme_color_override("font_hover_color", Color("2b1d12"))
	var box := StyleBoxFlat.new()
	box.bg_color = Color("c4963a")
	box.border_color = Color(58.0 / 255.0, 36.0 / 255.0, 16.0 / 255.0, 0.6)
	box.set_border_width_all(2)
	box.set_corner_radius_all(int(minf(rect.size.x, rect.size.y) * 0.5))
	box.shadow_color = Color(0, 0, 0, 0.5)
	box.shadow_size = 4
	box.shadow_offset = Vector2(0, 4)
	b.add_theme_stylebox_override("normal", box)
	var hover := box.duplicate() as StyleBoxFlat
	hover.bg_color = Color("d9a94a")
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", box)
	b.add_theme_stylebox_override("focus", box)
	place(b, rect)
	b.size = rect.size
	return b


static func bezier_y(x1: float, y1: float, x2: float, y2: float, x: float) -> float:
	var t := clampf(x, 0.0, 1.0)
	for _i in 8:
		var u := 1.0 - t
		var xt := 3.0 * u * u * t * x1 + 3.0 * u * t * t * x2 + t * t * t
		var dx := 3.0 * u * u * x1 + 6.0 * u * t * (x2 - x1) + 3.0 * t * t * (1.0 - x2)
		if absf(dx) < 1e-5:
			break
		t = clampf(t - (xt - x) / dx, 0.0, 1.0)
	var u2 := 1.0 - t
	return 3.0 * u2 * u2 * t * y1 + 3.0 * u2 * t * t * y2 + t * t * t


static func hex_color(s: String) -> Color:
	return Color(s)


static func contain_rect(zone: Rect2, image_size: Vector2) -> Rect2:
	var s := minf(zone.size.x / image_size.x, zone.size.y / image_size.y)
	var fitted := image_size * s
	var pos := zone.position + (zone.size - fitted) * 0.5
	return Rect2(pos, fitted)
