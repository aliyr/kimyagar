class_name OverlayView
extends Control
## Parchment overlays. RTL labels, same copy as labels.ts.

var _built := ""
var _reveal := 0.0
var force_reveal := false
var _toast_left := 0.0
var _toast: Label
var _toast_bg: Panel
var _was_reacting := false
var _seal_t := 0.0
var _seal_hit := false
var _sheet: Control
var _open_t := 1.0
var _ink_t := 1.0
var _pen_at := 0.0
var _flow_x := 0.0
var _flow_y := 0.0
var _flow_w := 0.0
var _flow_bottom := 0.0
const Sheet = preload("res://scripts/fx/parchment_sheet.gd")
const FS_TITLE := 20
const FS_SECTION := 16
const FS_BODY := 16
const FS_CARD := 15
const FS_BAND := 18
const C_TITLE := Color("4a2218")
const C_SECTION := Color("6e1f2e")
const C_BODY := Color("2b1d12")
const C_MUTED := Color("5c4310")
const PAD_X := 28.0
const PAD_TOP := 26.0
const FLOW_GAP := 8.0


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	UiKit.fill(self)
	UiKit.ensure()
	_toast_bg = Panel.new()
	_toast_bg.name = "ToastBg"
	_toast_bg.mouse_filter = MOUSE_FILTER_IGNORE
	_toast_bg.visible = false
	var pill := StyleBoxFlat.new()
	pill.bg_color = Color("f6e7c4")
	pill.border_color = Color("b8862f")
	pill.set_border_width_all(1)
	pill.set_corner_radius_all(28)
	pill.shadow_color = Color(0, 0, 0, 0.35)
	pill.shadow_size = 10
	pill.shadow_offset = Vector2(0, 6)
	_toast_bg.add_theme_stylebox_override("panel", pill)
	add_child(_toast_bg)
	_toast = UiKit.label("", Rect2(560, 980, 800, 48), 18, Color("2b1d12"), UiKit.medium)
	_toast.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_toast.visible = false
	add_child(_toast)


func prime_toast(elapsed: float) -> void:
	_toast_left = elapsed


func prime_reveal(elapsed: float) -> void:
	_reveal = elapsed


func advance(dt: float) -> void:
	var id := "" if Game.open_overlay == null else str(Game.open_overlay)
	if Game.result != null and id == "result":
		_reveal += dt
	else:
		_reveal = 0.0
	var reacting := _in_reaction()
	if id != _built or reacting != _was_reacting:
		_was_reacting = reacting
		_built = id
		_rebuild(id)
	_sync_toast(dt)
	_tick_open(dt)
	var bubble := get_node_or_null("ReactionBubble")
	if bubble:
		var shown := _reveal >= 0.3
		bubble.visible = shown
		if shown:
			var k := clampf((_reveal - 0.3) / 0.28, 0.0, 1.0)
			var s := lerpf(0.82, 1.0, 1.0 - pow(1.0 - k, 3.0))
			bubble.scale = Vector2(s, s)
			bubble.pivot_offset = Vector2(bubble.size.x * 0.86, bubble.size.y * 0.72)
	_tick_seal(dt)


func _in_reaction() -> bool:
	return str(Game.open_overlay) == "result" and Game.evaluation != null and _reveal < 2.2 and not force_reveal


## .scene.is-paused fades the vignette to 1. The reaction window overrides that to 0.16.
func vignette_pause() -> float:
	if _in_reaction():
		return 0.16
	if Game.is_paused():
		return 1.0
	return 0.0


func _sync_toast(dt: float) -> void:
	if Game.discovery_queue.is_empty():
		_toast.visible = false
		_toast_bg.visible = false
		return
	var first: Dictionary = Game.discovery_queue[0]
	var text := str(first.get("textFa", first.get("nameFa", "")))
	_toast.text = text
	var font: Font = UiKit.medium if UiKit.medium != null else UiKit.regular
	var tw := 640.0
	if font != null:
		tw = font.get_string_size(text, HORIZONTAL_ALIGNMENT_CENTER, -1, 18).x
	var w := clampf(tw + 52.0, 280.0, 880.0)
	var h := 52.0 if tw + 52.0 <= 880.0 else 78.0
	var at := Vector2((1920.0 - w) * 0.5, 1080.0 - 26.0 - h)
	_toast_bg.position = at
	_toast_bg.size = Vector2(w, h)
	_toast.position = at
	_toast.size = Vector2(w, h)
	_toast.visible = true
	_toast_bg.visible = true
	_toast_left += dt
	if _toast_left > 1.8:
		_toast_left = 0.0
		Game.pop_discovery()


func _add(node: Node) -> void:
	if _sheet != null and is_instance_valid(_sheet):
		_sheet.add_child(node)
	else:
		add_child(node)


func _rebuild(id: String) -> void:
	var keep := _toast
	var bg := get_node_or_null("ToastBg")
	_sheet = null
	var drop: Array = []
	for c in get_children():
		if c == keep or c == bg:
			continue
		drop.append(c)
	for c in drop:
		remove_child(c)
		c.free()
	mouse_filter = MOUSE_FILTER_IGNORE
	if id == "":
		return
	if id == "result" and _in_reaction():
		_build_reaction()
		return
	mouse_filter = MOUSE_FILTER_STOP
	var scrim := ColorRect.new()
	scrim.color = Color(18.0 / 255.0, 10.0 / 255.0, 6.0 / 255.0, 0.62)
	UiKit.fill(scrim)
	scrim.gui_input.connect(func(ev: InputEvent) -> void:
		if ev is InputEventMouseButton and ev.pressed and id != "result":
			Game.close_overlay()
	)
	add_child(scrim)
	move_child(scrim, 0)
	var sheet := Control.new()
	sheet.name = "Paper"
	sheet.position = Vector2(647, 157)
	sheet.size = Vector2(626, 766)
	sheet.clip_contents = true
	sheet.mouse_filter = MOUSE_FILTER_STOP
	sheet.pivot_offset = sheet.size * 0.5
	add_child(sheet)
	_sheet = sheet
	var aged := id == "notebook" or id == "result"
	var panel := ColorRect.new()
	panel.color = Color(0, 0, 0, 0) if aged else Color("f4e6c8")
	panel.position = Vector2(3, 3)
	panel.size = Vector2(620, 760)
	panel.mouse_filter = MOUSE_FILTER_STOP
	_add(panel)
	if aged:
		var kind := "book"
		if id == "result" and Game.evaluation != null:
			var band := str(Game.evaluation.get("band", ""))
			kind = "ok" if band == "excellent" or band == "good" else "bad"
		var paper := TextureRect.new()
		paper.texture = Sheet.sheet(kind)
		paper.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		paper.stretch_mode = TextureRect.STRETCH_SCALE
		paper.mouse_filter = MOUSE_FILTER_IGNORE
		paper.position = panel.position
		paper.size = panel.size
		_add(paper)
	else:
		var edge := ColorRect.new()
		edge.color = Color("b8862f")
		edge.position = Vector2.ZERO
		edge.size = sheet.size
		edge.mouse_filter = MOUSE_FILTER_IGNORE
		_add(edge)
		_sheet.move_child(edge, panel.get_index())
	var close := UiKit.parchment_button("×", Rect2(panel.position.x + 16, panel.position.y + 12, 48, 48))
	close.pressed.connect(func() -> void: Game.close_overlay())
	_add(close)
	var animate := Settings.effects_enabled and not force_reveal
	_open_t = 0.0 if animate else 1.0
	_ink_t = 0.0 if id == "notebook" and animate else 1.0
	_pen_at = 0.0
	if id == "notebook" or id == "customer_request" or id == "result":
		Sfx.page_turn()
	match id:
		"settings":
			_settings(panel)
		"customer_request":
			_request(panel)
		"notebook":
			_notebook(panel)
		"process_history":
			_history(panel)
		"ingredient_detail":
			_detail(panel)
		"result":
			_result(panel)
	_tick_open(0.0)


func _begin_flow(panel: ColorRect, bottom_pad: float, left_extra: float) -> void:
	_flow_x = panel.position.x + PAD_X + left_extra
	_flow_w = panel.size.x - PAD_X * 2.0 - left_extra
	_flow_y = panel.position.y + PAD_TOP
	_flow_bottom = panel.position.y + panel.size.y - bottom_pad


func _line(text: String, size: int, color: Color, font: Font, ink: bool) -> Label:
	var f: Font = font if font != null else UiKit.regular
	var sz := size
	var width := _flow_w
	var room := _flow_bottom - _flow_y
	var h := float(sz) * 1.55
	if f != null and text != "":
		while sz > 11:
			var measured := f.get_multiline_string_size(text, HORIZONTAL_ALIGNMENT_RIGHT, width, sz, -1, 3, 3, TextServer.DIRECTION_RTL)
			h = maxf(measured.y + 2.0, float(sz) * 1.35)
			if h <= room or sz <= 12:
				break
			sz -= 1
	if h > room:
		h = maxf(room, 1.0)
	if _flow_y > _flow_bottom - 1.0:
		_flow_y = _flow_bottom - 1.0
		h = 1.0
	var l := UiKit.label(text, Rect2(_flow_x, _flow_y, width, h), sz, color, f, HORIZONTAL_ALIGNMENT_RIGHT)
	l.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	l.add_theme_constant_override("line_spacing", 4)
	l.clip_text = true
	if ink:
		l.set_meta("ink", true)
		l.visible_ratio = 0.0 if _ink_t < 1.0 else 1.0
	_add(l)
	l.set_anchors_preset(Control.PRESET_TOP_LEFT)
	l.position = Vector2(_flow_x, _flow_y)
	l.size = Vector2(width, h)
	_flow_y += h + FLOW_GAP
	return l


func _tick_open(dt: float) -> void:
	var sheet := get_node_or_null("Paper") as Control
	if sheet == null:
		_tick_ink(dt)
		return
	var animate := Settings.effects_enabled and not force_reveal
	if not animate:
		_open_t = 1.0
		sheet.scale = Vector2.ONE
		sheet.rotation = 0.0
		sheet.modulate.a = 1.0
	else:
		_open_t = minf(_open_t + dt / 0.38, 1.0)
		var e := 1.0 - pow(1.0 - _open_t, 3.0)
		var turn := sin(_open_t * PI) * (1.0 - e)
		sheet.scale = Vector2(lerpf(0.94, 1.0, e), lerpf(0.86, 1.0, e))
		sheet.rotation_degrees = lerpf(8.0, 0.0, e) + turn * 3.0
		sheet.modulate.a = clampf(_open_t * 2.2, 0.0, 1.0)
	_tick_ink(dt)


func _tick_ink(dt: float) -> void:
	var sheet := get_node_or_null("Paper")
	if sheet == null:
		return
	var animate := Settings.effects_enabled and not force_reveal and _ink_labels(sheet).size() > 0
	if not animate:
		_ink_t = 1.0
	else:
		_ink_t = minf(_ink_t + dt / 1.15, 1.0)
		if _ink_t < 1.0 and _ink_t - _pen_at > 0.16:
			_pen_at = _ink_t
			Sfx.pen_scratch()
	var labels := _ink_labels(sheet)
	var n := labels.size()
	for i in n:
		var lab: Label = labels[i]
		if not animate:
			lab.visible_ratio = 1.0
			continue
		var start := float(i) / float(maxi(n, 1))
		lab.visible_ratio = clampf((_ink_t - start * 0.65) / 0.45, 0.0, 1.0)


func _ink_labels(sheet: Node) -> Array:
	var out: Array = []
	_collect_ink(sheet, out)
	return out


func _collect_ink(node: Node, out: Array) -> void:
	if node is Label and bool(node.get_meta("ink", false)):
		out.append(node)
	for child in node.get_children():
		_collect_ink(child, out)


func _title(panel: ColorRect, text: String) -> void:
	var l := UiKit.label(text, Rect2(panel.position.x + 24, panel.position.y + 20, panel.size.x - 80, 36), FS_TITLE, C_TITLE, UiKit.bold, HORIZONTAL_ALIGNMENT_RIGHT)
	l.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	l.clip_text = true
	_add(l)


func _settings(panel: ColorRect) -> void:
	_title(panel, Content.UI["settings"])
	_toggle(panel, 120, "sound", Content.UI["settingSound"], Content.UI["settingSoundHint"], Settings.sfx_enabled, func(on: bool) -> void:
		Sfx.set_enabled(on)
		if on:
			Sfx.cork()
	)
	_toggle(panel, 250, "haptics", Content.UI["settingHaptics"], Content.UI["settingHapticsHint"], Settings.haptics_enabled, func(on: bool) -> void:
		Settings.set_haptics(on)
		if on:
			Haptics.pulse("medium")
	)
	_toggle(panel, 380, "effects", Content.UI["settingEffects"], Content.UI["settingEffectsHint"], Settings.effects_enabled, func(on: bool) -> void:
		Settings.set_effects(on)
	)


func _toggle(panel: ColorRect, y: float, _id: String, label: String, hint: String, on: bool, cb: Callable) -> void:
	_add(UiKit.label(label, Rect2(panel.position.x + 36, panel.position.y + y, 360, 32), FS_BODY, C_BODY, UiKit.bold, HORIZONTAL_ALIGNMENT_RIGHT))
	_add(UiKit.label(hint, Rect2(panel.position.x + 36, panel.position.y + y + 32, 360, 56), FS_CARD, C_MUTED, UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))
	var b := UiKit.parchment_button(Content.UI["on"] if on else Content.UI["off"], Rect2(panel.position.x + 420, panel.position.y + y + 16, 150, 52))
	b.pressed.connect(func() -> void: cb.call(not on))
	_add(b)


func _request(panel: ColorRect) -> void:
	var c: Dictionary = Game.current_customer()
	_begin_flow(panel, 28.0, 0.0)
	_line(Content.UI["customerRequest"], FS_TITLE, C_TITLE, UiKit.bold, false)
	_line(str(c.get("nameFa", "")), FS_SECTION, C_SECTION, UiKit.bold, false)
	_line(str(c.get("requestFa", "")), FS_BODY, C_BODY, UiKit.regular, false)


func _notebook(panel: ColorRect) -> void:
	_begin_flow(panel, 36.0, 150.0)
	_line(Content.UI["notebook"], FS_TITLE, C_TITLE, UiKit.bold, true)
	_line(Content.UI["notebookTags"], FS_SECTION, C_SECTION, UiKit.bold, true)
	var tags: Array = []
	for t in Game.defs["qualityTags"]:
		if Game.discovered_tag_ids.has(t["id"]):
			tags.append(str(t["nameFa"]))
	var tag_line := "  ".join(tags) if not tags.is_empty() else Content.UI["noDiscoveries"]
	_line(tag_line, FS_CARD, C_BODY, UiKit.regular, true)
	_line(Content.UI["notebookIngredients"], FS_SECTION, C_SECTION, UiKit.bold, true)
	for ing in Game.defs["ingredients"]:
		var used := Game.used_ingredient_ids.has(ing["id"])
		var line := str(ing["nameFa"])
		if used and ing.get("cluesFa") != null and (ing["cluesFa"] as Array).size() > 0:
			line += " — " + str(ing["cluesFa"][0])
		else:
			line += "  " + Content.UI["unknownMark"]
		_line(line, FS_CARD, C_BODY, UiKit.regular, true)
	_place_seal(panel, true)


func _history(panel: ColorRect) -> void:
	_title(panel, Content.UI["processHistory"])
	var entries: Array = Game.brew["entries"]
	if entries.is_empty():
		_add(UiKit.label(Content.UI["emptyHistory"], Rect2(panel.position.x + 40, panel.position.y + 140, 540, 80), FS_BODY, C_BODY, UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))
		return
	var y := panel.position.y + 100
	for e in entries:
		var ing = Game.ingredient_by_id(str(e["ingredientId"]))
		var name := str(ing["nameFa"]) if ing != null else str(e["ingredientId"])
		var line := "%s  %s  %s  %s" % [
			name,
			Content.format_quantity(float(e["quantity"])),
			Content.GRIND.get(str(e["grindState"]), ""),
			Content.STAGE.get(str(e["stage"]), ""),
		]
		_add(UiKit.label(line, Rect2(panel.position.x + 36, y, 540, 36), FS_CARD, C_BODY, UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))
		y += 40
	_add(UiKit.label("%s: %s" % [Content.UI["stirCount"], Content.to_fa_digits(float(Game.brew["stirCount"]))], Rect2(panel.position.x + 36, y + 12, 540, 32), FS_CARD, C_MUTED, UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))


func _detail(panel: ColorRect) -> void:
	var ing = Game.ingredient_by_id(str(Game.inspected_id))
	if ing == null:
		return
	_title(panel, str(ing["nameFa"]))
	_add(UiKit.label(str(ing.get("nameEn", "")), Rect2(panel.position.x + 40, panel.position.y + 72, 540, 28), FS_CARD, C_MUTED, UiKit.regular, HORIZONTAL_ALIGNMENT_LEFT))
	_add(UiKit.label(str(ing.get("flavorFa", "")), Rect2(panel.position.x + 40, panel.position.y + 112, 540, 160), FS_BODY, C_BODY, UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))
	var used := Game.used_ingredient_ids.has(ing["id"])
	var y := panel.position.y + 310.0
	if used:
		for clue in ing.get("cluesFa", []):
			_add(UiKit.label(str(clue), Rect2(panel.position.x + 40, y, 540, 64), FS_CARD, C_MUTED, UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))
			y += 74
	else:
		_add(UiKit.label(Content.UI["unknownSecret"], Rect2(panel.position.x + 40, y, 540, 60), FS_BODY, C_MUTED, UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))


func _build_reaction() -> void:
	# ResultScreen reaction window: speech bubble beside the customer.
	var c: Dictionary = Game.current_customer()
	var name := str(c.get("nameFa", ""))
	var text := str(Game.evaluation.get("reactionFa", ""))
	var band := str(Game.evaluation.get("band", ""))
	var sad := band != "excellent" and band != "good"
	var font: Font = UiKit.regular if UiKit.regular != null else ThemeDB.fallback_font
	var text_h := 72.0
	if font != null and text != "":
		text_h = font.get_multiline_string_size(text, HORIZONTAL_ALIGNMENT_RIGHT, 372.0, FS_BODY, -1, 3, 3, TextServer.DIRECTION_RTL).y
	var box_h := maxf(120.0, 16.0 + 28.0 + 8.0 + text_h + 18.0)
	var bubble := Control.new()
	bubble.name = "ReactionBubble"
	bubble.mouse_filter = MOUSE_FILTER_IGNORE
	bubble.position = Vector2(1020, 176)
	bubble.size = Vector2(420, box_h)
	bubble.visible = _reveal >= 0.3
	bubble.set_meta("sad", sad)
	bubble.draw.connect(_draw_bubble.bind(bubble))
	add_child(bubble)
	var name_color := Color("4a3a56") if sad else C_SECTION
	var who := UiKit.label(name, Rect2(16, 12, 388, 28), FS_SECTION, name_color, UiKit.bold, HORIZONTAL_ALIGNMENT_RIGHT)
	who.clip_text = true
	bubble.add_child(who)
	who.set_anchors_preset(Control.PRESET_TOP_LEFT)
	who.position = Vector2(16, 12)
	who.size = Vector2(388, 28)
	var body_h := maxf(32.0, text_h + 4.0)
	var body := UiKit.label(text, Rect2(16, 44, 388, body_h), FS_BODY, C_BODY, UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT)
	body.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	body.add_theme_constant_override("line_spacing", 4)
	body.clip_text = true
	bubble.add_child(body)
	body.set_anchors_preset(Control.PRESET_TOP_LEFT)
	body.position = Vector2(16, 44)
	body.size = Vector2(388, body_h)
	var caption := "واکنش %s…" % name
	var cap_font: Font = UiKit.regular if UiKit.regular != null else font
	var tw := 240.0
	if cap_font != null:
		tw = cap_font.get_string_size(caption, HORIZONTAL_ALIGNMENT_RIGHT, -1, FS_CARD).x
	var pw := tw + 56.0
	var ph := 36.0
	var pill := Control.new()
	pill.name = "ReactionWait"
	pill.mouse_filter = MOUSE_FILTER_IGNORE
	pill.position = Vector2((1920.0 - pw) * 0.5, 1080.0 - 22.0 - ph)
	pill.size = Vector2(pw, ph)
	pill.draw.connect(_draw_wait.bind(pill))
	add_child(pill)
	var cap := UiKit.label(caption, Rect2(8, 4, pw - 16.0, ph - 8.0), FS_CARD, Color("f4e2b4"), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT)
	cap.clip_text = true
	pill.add_child(cap)
	cap.set_anchors_preset(Control.PRESET_TOP_LEFT)
	cap.position = Vector2(8, 4)
	cap.size = Vector2(pw - 16.0, ph - 8.0)


func _draw_bubble(bubble: Control) -> void:
	var sad := bool(bubble.get_meta("sad", false))
	var sheet: Texture2D = Sheet.sheet("bad" if sad else "book")
	if sheet:
		bubble.draw_texture_rect(sheet, Rect2(Vector2.ZERO, bubble.size), false)
	else:
		bubble.draw_rect(Rect2(Vector2.ZERO, bubble.size), Color("ead9b4"))
	var y := bubble.size.y - 18.0
	var tail := PackedVector2Array([
		Vector2(bubble.size.x - 8.0, y - 10.0),
		Vector2(bubble.size.x - 2.0, y + 8.0),
		Vector2(bubble.size.x - 28.0, y + 4.0),
	])
	bubble.draw_colored_polygon(tail, Color(184.0 / 255.0, 134.0 / 255.0, 47.0 / 255.0, 0.85))


func _draw_wait(pill: Control) -> void:
	var box := StyleBoxFlat.new()
	box.bg_color = Color(18.0 / 255.0, 11.0 / 255.0, 6.0 / 255.0, 0.6)
	box.border_color = Color(184.0 / 255.0, 134.0 / 255.0, 47.0 / 255.0, 0.45)
	box.set_border_width_all(1)
	box.set_corner_radius_all(18)
	box.draw(pill.get_canvas_item(), Rect2(Vector2.ZERO, pill.size))
	var dot := Vector2(pill.size.x - 18.0, pill.size.y * 0.5)
	pill.draw_circle(dot, 4.0, Color("d8b45a"))


func _result(panel: ColorRect) -> void:
	if Game.evaluation != null:
		var c2: Dictionary = Game.current_customer()
		var band := str(Game.evaluation.get("band", ""))
		var ok := band == "excellent" or band == "good"
		_begin_flow(panel, 196.0, 150.0)
		_line(str(c2.get("nameFa", "")), FS_TITLE, C_TITLE, UiKit.bold, false)
		_line(str(Game.evaluation.get("reactionFa", "")), FS_BODY, C_BODY, UiKit.regular, false)
		_line(Content.BAND.get(band, ""), FS_BAND, C_SECTION if ok else Color("3a1a12"), UiKit.bold, false)
		_effect_lines()
		_place_seal(panel, ok)
		_action(panel, 560, Content.UI["nextCustomer"], func() -> void: Game.next_customer())
		_action(panel, 628, Content.UI["retry"], func() -> void:
			Game.close_overlay()
			var shop := get_tree().root.find_child("Workshop", true, false)
			if shop and shop.has_method("begin_discard"):
				shop.begin_discard()
			else:
				Game.reset_brew()
		)
		return
	_begin_flow(panel, 230.0, 0.0)
	_line(Content.UI["potionReady"], FS_TITLE, C_TITLE, UiKit.bold, false)
	if Game.result != null:
		_line(Content.STABILITY.get(str(Game.result.get("stabilityLabel", "")), ""), FS_SECTION, C_SECTION, UiKit.bold, false)
	_effect_lines()
	_action(panel, 500, Content.UI["deliver"], func() -> void: Game.deliver())
	_action(panel, 568, Content.UI["retry"], func() -> void: Game.reset_brew())
	_action(panel, 636, Content.UI["keep"], func() -> void: Game.close_overlay())


func _effect_lines() -> void:
	if Game.result == null:
		return
	_line(Content.UI["effectProfile"], FS_SECTION, C_SECTION, UiKit.bold, false)
	var bits: Array = []
	var prof: Dictionary = Game.result["effectProfile"]
	for k in prof.keys():
		if float(prof[k]) <= 0.05:
			continue
		var prop_name := str(k)
		for p in Game.defs["properties"]:
			if p["id"] == k:
				prop_name = str(p["nameFa"])
		bits.append("%s %s" % [prop_name, Content.to_fa_digits(float(prof[k]))])
	_line("   ".join(bits), FS_CARD, C_BODY, UiKit.regular, false)


func _place_seal(panel: ColorRect, ok: bool) -> void:
	var seal := Control.new()
	seal.name = "WaxSeal"
	seal.mouse_filter = MOUSE_FILTER_IGNORE
	seal.position = panel.position + Vector2(28, 128)
	seal.size = Vector2(100, 100)
	seal.pivot_offset = seal.size * 0.5
	seal.set_meta("ok", ok)
	seal.set_meta("home", seal.position)
	seal.draw.connect(_draw_seal.bind(seal))
	_add(seal)
	var animate := Settings.effects_enabled and not force_reveal
	_seal_t = 0.0 if animate else 1.0
	_seal_hit = not animate
	_tick_seal(0.0)


func _tick_seal(dt: float) -> void:
	var seal := find_child("WaxSeal", true, false) as Control
	if seal == null:
		return
	var home: Vector2 = seal.get_meta("home", seal.position)
	var ok := bool(seal.get_meta("ok", true))
	var animate := Settings.effects_enabled and not force_reveal
	if not animate:
		seal.scale = Vector2.ONE
		seal.rotation_degrees = -6.0 if ok else -3.0
		seal.position = home
		seal.modulate.a = 1.0
		if not _seal_hit:
			_seal_hit = true
			Sfx.wood_bump()
			Haptics.pulse("light")
		return
	_seal_t = minf(_seal_t + dt, 1.4)
	var dur := 0.42 if ok else 0.55
	var u := clampf(_seal_t / dur, 0.0, 1.0)
	var e := 1.0 - pow(1.0 - u, 3.0)
	var slam := lerpf(1.48, 1.0, e)
	var press := 0.0
	if u > 0.55 and u < 1.0:
		press = sin((u - 0.55) / 0.45 * PI)
	seal.scale = Vector2(slam * (1.0 + 0.12 * press), slam * (1.0 - 0.24 * press))
	seal.rotation_degrees = lerpf(-14.0 if ok else 8.0, -6.0 if ok else -3.0, e)
	var shake := 0.0
	if u > 0.6 and u < 0.92:
		shake = sin(u * 80.0) * 2.2 * (1.0 - u)
	seal.position = home + Vector2(shake, press * 4.0)
	seal.modulate.a = clampf(u * 3.0, 0.0, 1.0)
	if u >= 0.7 and not _seal_hit:
		_seal_hit = true
		Sfx.wood_bump()
		Haptics.pulse("light")
	if u < 1.0:
		seal.queue_redraw()


func _draw_seal(seal: Control) -> void:
	var ok := bool(seal.get_meta("ok", true))
	var c := seal.size * 0.5
	var wax := Color("8e1d24") if ok else Color("2a120e")
	var rim := Color("5c1014") if ok else Color("100806")
	seal.draw_circle(c + Vector2(2, 3), 40, Color(0, 0, 0, 0.35))
	seal.draw_circle(c, 38, rim)
	seal.draw_circle(c + Vector2(-2, -3), 33, wax)
	seal.draw_circle(c + Vector2(-8, -10), 11, Color(1, 1, 1, 0.18 if ok else 0.05))
	if ok:
		seal.draw_arc(c, 16, 0, TAU, 24, Color("f0d7a0"), 2.0, true)
	else:
		seal.draw_line(c + Vector2(-22, -6), c + Vector2(20, 14), Color("1a0a06"), 3.0, true)
		seal.draw_line(c + Vector2(-6, -20), c + Vector2(10, 20), Color("1a0a06"), 2.0, true)
		seal.draw_line(c + Vector2(14, -16), c + Vector2(-4, 6), Color("3a1c14"), 2.0, true)


func _action(panel: ColorRect, y: float, text: String, cb: Callable) -> void:
	var b := UiKit.parchment_button(text, Rect2(panel.position.x + 80, panel.position.y + y, 460, 48))
	b.pressed.connect(cb)
	_add(b)
