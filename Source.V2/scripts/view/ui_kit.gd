class_name UiKit
extends RefCounted

static var regular: Font
static var medium: Font
static var bold: Font
static var extrabold: Font
static var _cache := {}


static func fill(node: Control) -> void:
	# Anchors first. Godot keeps the current size by writing offsets, so zero them after.
	node.anchor_left = 0.0
	node.anchor_top = 0.0
	node.anchor_right = 1.0
	node.anchor_bottom = 1.0
	node.offset_left = 0.0
	node.offset_top = 0.0
	node.offset_right = 0.0
	node.offset_bottom = 0.0


static func ensure() -> void:
	if regular != null:
		return
	regular = load("res://assets/fonts/Vazirmatn-Regular.ttf")
	medium = load("res://assets/fonts/Vazirmatn-Medium.ttf")
	bold = load("res://assets/fonts/Vazirmatn-Bold.ttf")
	extrabold = load("res://assets/fonts/Vazirmatn-ExtraBold.ttf")


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
	n.texture = tex(rel)
	n.position = rect.position
	n.size = rect.size
	n.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	n.stretch_mode = TextureRect.STRETCH_SCALE if fit == "fill" else (
		TextureRect.STRETCH_KEEP_ASPECT_COVERED if fit == "cover" else TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	)
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
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
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


static func hit(rect: Rect2) -> Button:
	var b := Button.new()
	b.position = rect.position
	b.size = rect.size
	b.focus_mode = Control.FOCUS_NONE
	b.flat = true
	var empty := StyleBoxEmpty.new()
	for s in ["normal", "hover", "pressed", "focus"]:
		b.add_theme_stylebox_override(s, empty)
	return b


static func parchment_button(text: String, rect: Rect2) -> Button:
	ensure()
	var b := Button.new()
	b.text = text
	b.position = rect.position
	b.size = rect.size
	b.focus_mode = Control.FOCUS_NONE
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
