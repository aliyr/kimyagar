class_name OverlayView
extends Control
## Parchment overlays. RTL labels, same copy as labels.ts.

var _built := ""
var _reveal := 0.0
var force_reveal := false
var _toast_left := 0.0
var _toast: Label


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	UiKit.fill(self)
	UiKit.ensure()
	_toast = UiKit.label("", Rect2(560, 40, 800, 64), 22, Color("3a2410"), UiKit.bold)
	_toast.visible = false
	var bg := ColorRect.new()
	bg.color = Color("e9d9b4")
	bg.position = _toast.position
	bg.size = _toast.size
	bg.mouse_filter = MOUSE_FILTER_IGNORE
	bg.name = "ToastBg"
	add_child(bg)
	add_child(_toast)
	bg.visible = false


func advance(dt: float) -> void:
	var id := "" if Game.open_overlay == null else str(Game.open_overlay)
	if Game.result != null and id == "result":
		_reveal += dt
	else:
		_reveal = 0.0
	if id != _built:
		_built = id
		_rebuild(id)
	_sync_toast(dt)


func _sync_toast(dt: float) -> void:
	var bg := get_node_or_null("ToastBg")
	if Game.discovery_queue.is_empty():
		_toast.visible = false
		if bg:
			bg.visible = false
		return
	var first: Dictionary = Game.discovery_queue[0]
	_toast.text = str(first.get("textFa", first.get("nameFa", "")))
	_toast.visible = true
	if bg:
		bg.visible = true
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


func _result(panel: ColorRect) -> void:
	if Game.evaluation != null and _reveal < 2.2 and not force_reveal:
		var c: Dictionary = Game.current_customer()
		add_child(UiKit.label("واکنش %s…" % str(c.get("nameFa", "")), Rect2(660, 980, 600, 40), 20, Color("e9d9b4")))
		panel.visible = false
		return
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
