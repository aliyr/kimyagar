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
	var bubble := get_node_or_null("ReactionBubble")
	if bubble:
		bubble.visible = _reveal >= 0.3


func _in_reaction() -> bool:
	return str(Game.open_overlay) == "result" and Game.evaluation != null and _reveal < 2.2 and not force_reveal


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


func _rebuild(id: String) -> void:
	var keep := _toast
	var bg := get_node_or_null("ToastBg")
	for c in get_children():
		if c == keep or c == bg:
			continue
		c.queue_free()
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
	var panel := ColorRect.new()
	panel.color = Color("f4e6c8")
	panel.position = Vector2(650, 160)
	panel.size = Vector2(620, 760)
	panel.mouse_filter = MOUSE_FILTER_STOP
	add_child(panel)
	var edge := ColorRect.new()
	edge.color = Color("b8862f")
	edge.position = panel.position - Vector2(3, 3)
	edge.size = panel.size + Vector2(6, 6)
	edge.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(edge)
	move_child(edge, panel.get_index())
	var close := UiKit.parchment_button("×", Rect2(panel.position.x + 16, panel.position.y + 12, 48, 48))
	close.pressed.connect(func() -> void: Game.close_overlay())
	add_child(close)
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


func _title(panel: ColorRect, text: String) -> void:
	var l := UiKit.label(text, Rect2(panel.position.x + 24, panel.position.y + 20, panel.size.x - 80, 48), 32, Color("4a2218"), UiKit.bold)
	add_child(l)


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


func _toggle(panel: ColorRect, y: float, _id: String, label: String, hint: String, on: bool, cb: Callable) -> void:
	add_child(UiKit.label(label, Rect2(panel.position.x + 36, panel.position.y + y, 360, 36), 24, Color("2b1d12"), UiKit.bold, HORIZONTAL_ALIGNMENT_RIGHT))
	add_child(UiKit.label(hint, Rect2(panel.position.x + 36, panel.position.y + y + 36, 360, 64), 16, Color("5c4310"), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))
	var b := UiKit.parchment_button(Content.UI["on"] if on else Content.UI["off"], Rect2(panel.position.x + 420, panel.position.y + y + 16, 150, 52))
	b.pressed.connect(func() -> void: cb.call(not on))
	add_child(b)


func _request(panel: ColorRect) -> void:
	var c: Dictionary = Game.current_customer()
	_title(panel, Content.UI["customerRequest"])
	add_child(UiKit.label(str(c.get("nameFa", "")), Rect2(panel.position.x + 40, panel.position.y + 90, 540, 40), 26, Color("4a2f16"), UiKit.bold, HORIZONTAL_ALIGNMENT_RIGHT))
	add_child(UiKit.label(str(c.get("requestFa", "")), Rect2(panel.position.x + 40, panel.position.y + 150, 540, 420), 22, Color("2b1d12"), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))


func _notebook(panel: ColorRect) -> void:
	_title(panel, Content.UI["notebook"])
	add_child(UiKit.label(Content.UI["notebookTags"], Rect2(panel.position.x + 36, panel.position.y + 80, 540, 32), 22, Color("4a2218"), UiKit.bold, HORIZONTAL_ALIGNMENT_RIGHT))
	var tags: Array = []
	for t in Game.defs["qualityTags"]:
		if Game.discovered_tag_ids.has(t["id"]):
			tags.append(str(t["nameFa"]))
	var tag_line := "  ".join(tags) if not tags.is_empty() else Content.UI["noDiscoveries"]
	add_child(UiKit.label(tag_line, Rect2(panel.position.x + 36, panel.position.y + 116, 540, 80), 18, Color("2b1d12"), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))
	add_child(UiKit.label(Content.UI["notebookIngredients"], Rect2(panel.position.x + 36, panel.position.y + 210, 540, 32), 22, Color("4a2218"), UiKit.bold, HORIZONTAL_ALIGNMENT_RIGHT))
	var y := panel.position.y + 250
	for ing in Game.defs["ingredients"]:
		var used := Game.used_ingredient_ids.has(ing["id"])
		var line := str(ing["nameFa"])
		if used and ing.get("cluesFa") != null and (ing["cluesFa"] as Array).size() > 0:
			line += " — " + str(ing["cluesFa"][0])
		else:
			line += "  " + Content.UI["unknownMark"]
		add_child(UiKit.label(line, Rect2(panel.position.x + 36, y, 540, 56), 16, Color("2b1d12"), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))
		y += 58


func _history(panel: ColorRect) -> void:
	_title(panel, Content.UI["processHistory"])
	var entries: Array = Game.brew["entries"]
	if entries.is_empty():
		add_child(UiKit.label(Content.UI["emptyHistory"], Rect2(panel.position.x + 40, panel.position.y + 140, 540, 80), 22, Color("2b1d12")))
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
		add_child(UiKit.label(line, Rect2(panel.position.x + 36, y, 540, 40), 18, Color("2b1d12"), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))
		y += 44
	add_child(UiKit.label("%s: %s" % [Content.UI["stirCount"], Content.to_fa_digits(float(Game.brew["stirCount"]))], Rect2(panel.position.x + 36, y + 12, 540, 32), 18, Color("4a2f16"), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))


func _detail(panel: ColorRect) -> void:
	var ing = Game.ingredient_by_id(str(Game.inspected_id))
	if ing == null:
		return
	_title(panel, str(ing["nameFa"]))
	add_child(UiKit.label(str(ing.get("nameEn", "")), Rect2(panel.position.x + 40, panel.position.y + 80, 540, 28), 16, Color("5c4310"), UiKit.regular, HORIZONTAL_ALIGNMENT_LEFT))
	add_child(UiKit.label(str(ing.get("flavorFa", "")), Rect2(panel.position.x + 40, panel.position.y + 130, 540, 160), 20, Color("2b1d12"), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))
	var used := Game.used_ingredient_ids.has(ing["id"])
	var y := panel.position.y + 310.0
	if used:
		for clue in ing.get("cluesFa", []):
			add_child(UiKit.label(str(clue), Rect2(panel.position.x + 40, y, 540, 70), 18, Color("4a2f16"), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))
			y += 74
	else:
		add_child(UiKit.label(Content.UI["unknownSecret"], Rect2(panel.position.x + 40, y, 540, 60), 20, Color("5c4310")))


func _build_reaction() -> void:
	# ResultScreen reaction window: speech bubble beside the customer, and a
	# thin caption at the bottom. The parchment panel stays hidden.
	var c: Dictionary = Game.current_customer()
	var name := str(c.get("nameFa", ""))
	var text := str(Game.evaluation.get("reactionFa", ""))
	var band := str(Game.evaluation.get("band", ""))
	var sad := band != "excellent" and band != "good"
	var font: Font = UiKit.regular if UiKit.regular != null else ThemeDB.fallback_font
	var text_h := 80.0
	if font != null:
		text_h = font.get_multiline_string_size(text, HORIZONTAL_ALIGNMENT_RIGHT, 380.0, 26, -1, 3, 3, TextServer.DIRECTION_RTL).y
	var box_h := maxf(140.0, 14.0 + 34.0 + 8.0 + text_h + 22.0)
	var bubble := Control.new()
	bubble.name = "ReactionBubble"
	bubble.mouse_filter = MOUSE_FILTER_IGNORE
	bubble.position = Vector2(1020, 176)
	bubble.size = Vector2(420, box_h)
	bubble.visible = _reveal >= 0.3
	bubble.set_meta("who", name)
	bubble.set_meta("body", text)
	bubble.set_meta("sad", sad)
	bubble.draw.connect(_draw_bubble.bind(bubble))
	add_child(bubble)
	var caption := "واکنش %s…" % name
	var cap_font: Font = UiKit.regular if UiKit.regular != null else font
	var tw := 240.0
	if cap_font != null:
		tw = cap_font.get_string_size(caption, HORIZONTAL_ALIGNMENT_LEFT, -1, 15).x
	var pw := tw + 56.0
	var ph := 36.0
	var pill := Control.new()
	pill.name = "ReactionWait"
	pill.mouse_filter = MOUSE_FILTER_IGNORE
	pill.position = Vector2((1920.0 - pw) * 0.5, 1080.0 - 22.0 - ph)
	pill.size = Vector2(pw, ph)
	pill.set_meta("caption", caption)
	pill.draw.connect(_draw_wait.bind(pill))
	add_child(pill)


func _draw_bubble(bubble: Control) -> void:
	var box := StyleBoxFlat.new()
	box.bg_color = Color("ead9b4")
	box.border_color = Color(184.0 / 255.0, 134.0 / 255.0, 47.0 / 255.0, 0.6)
	box.set_border_width_all(2)
	box.corner_radius_top_left = 20
	box.corner_radius_top_right = 20
	box.corner_radius_bottom_right = 8
	box.corner_radius_bottom_left = 20
	box.shadow_color = Color(0, 0, 0, 0.5)
	box.shadow_size = 16
	box.shadow_offset = Vector2(0, 10)
	box.draw(bubble.get_canvas_item(), Rect2(Vector2.ZERO, bubble.size))
	var y := bubble.size.y - 22.0
	var tail := PackedVector2Array([
		Vector2(bubble.size.x - 4.0, y - 12.0),
		Vector2(bubble.size.x + 18.0, y + 2.0),
		Vector2(bubble.size.x - 4.0, y + 10.0),
	])
	bubble.draw_colored_polygon(tail, Color(184.0 / 255.0, 134.0 / 255.0, 47.0 / 255.0, 0.85))
	var who := str(bubble.get_meta("who", ""))
	var body := str(bubble.get_meta("body", ""))
	var sad := bool(bubble.get_meta("sad", false))
	var name_font: Font = UiKit.bold if UiKit.bold != null else UiKit.regular
	var body_font: Font = UiKit.regular
	if name_font != null and who != "":
		var name_color := Color("4a3a56") if sad else Color("6e1f2e")
		bubble.draw_string(name_font, Vector2(20, 36), who, HORIZONTAL_ALIGNMENT_RIGHT, 380, 22, name_color, 0, TextServer.DIRECTION_RTL)
	if body_font != null and body != "":
		bubble.draw_multiline_string(body_font, Vector2(20, 72), body, HORIZONTAL_ALIGNMENT_RIGHT, 380, 26, -1, Color("2b1d12"), 3, 3, TextServer.DIRECTION_RTL)


func _draw_wait(pill: Control) -> void:
	var box := StyleBoxFlat.new()
	box.bg_color = Color(18.0 / 255.0, 11.0 / 255.0, 6.0 / 255.0, 0.6)
	box.border_color = Color(184.0 / 255.0, 134.0 / 255.0, 47.0 / 255.0, 0.45)
	box.set_border_width_all(1)
	box.set_corner_radius_all(18)
	box.draw(pill.get_canvas_item(), Rect2(Vector2.ZERO, pill.size))
	# RTL flex puts the gold dot at the start, on the right.
	var dot := Vector2(pill.size.x - 18.0, pill.size.y * 0.5)
	pill.draw_circle(dot, 4.0, Color("d8b45a"))
	var caption := str(pill.get_meta("caption", ""))
	var font: Font = UiKit.regular
	if font != null and caption != "":
		pill.draw_string(font, Vector2(10, 24), caption, HORIZONTAL_ALIGNMENT_RIGHT, pill.size.x - 36.0, 15, Color("f4e2b4"), 0, TextServer.DIRECTION_RTL)


func _result(panel: ColorRect) -> void:
	if Game.evaluation != null:
		var c2: Dictionary = Game.current_customer()
		add_child(UiKit.label(str(c2.get("nameFa", "")), Rect2(panel.position.x + 36, panel.position.y + 24, 540, 36), 26, Color("4a2f16"), UiKit.bold, HORIZONTAL_ALIGNMENT_RIGHT))
		add_child(UiKit.label(str(Game.evaluation.get("reactionFa", "")), Rect2(panel.position.x + 36, panel.position.y + 70, 540, 160), 20, Color("2b1d12"), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))
		add_child(UiKit.label(Content.BAND.get(str(Game.evaluation.get("band", "")), ""), Rect2(panel.position.x + 36, panel.position.y + 240, 540, 40), 28, Color("6e1f2e"), UiKit.bold))
		_effects(panel, 300)
		_action(panel, 620, Content.UI["nextCustomer"], func() -> void: Game.next_customer())
		_action(panel, 680, Content.UI["retry"], func() -> void:
			Game.close_overlay()
			var shop := get_tree().root.find_child("Workshop", true, false)
			if shop and shop.has_method("begin_discard"):
				shop.begin_discard()
			else:
				Game.reset_brew()
		)
		return
	_title(panel, Content.UI["potionReady"])
	_effects(panel, 100)
	if Game.result != null:
		add_child(UiKit.label(Content.STABILITY.get(str(Game.result.get("stabilityLabel", "")), ""), Rect2(panel.position.x + 36, panel.position.y + 280, 540, 36), 22, Color("4a2f16"), UiKit.bold))
	_action(panel, 560, Content.UI["deliver"], func() -> void: Game.deliver())
	_action(panel, 620, Content.UI["retry"], func() -> void: Game.reset_brew())
	_action(panel, 680, Content.UI["keep"], func() -> void: Game.close_overlay())


func _effects(panel: ColorRect, y: float) -> void:
	if Game.result == null:
		return
	add_child(UiKit.label(Content.UI["effectProfile"], Rect2(panel.position.x + 36, panel.position.y + y, 540, 28), 18, Color("4a2218"), UiKit.bold, HORIZONTAL_ALIGNMENT_RIGHT))
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
	add_child(UiKit.label("   ".join(bits), Rect2(panel.position.x + 36, panel.position.y + y + 32, 540, 80), 16, Color("2b1d12"), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))


func _action(panel: ColorRect, y: float, text: String, cb: Callable) -> void:
	var b := UiKit.parchment_button(text, Rect2(panel.position.x + 80, panel.position.y + y, 460, 48))
	b.pressed.connect(cb)
	add_child(b)
