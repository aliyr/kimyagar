class_name WorkshopView
extends Control
## Classic workshop. Zones match artManifest.ts and layout.ts.

signal open_overlay(id: String)
signal back_to_gate

const ZONE_TABLE := Rect2(140, 600, 1420, 480)
const ZONE_CABINET := Rect2(10, 100, 270, 950)
const ZONE_CAULDRON := Rect2(647, 490, 400, 280)
const ZONE_MORTAR := Rect2(290, 506, 250, 273)
const ZONE_BOTTLE := Rect2(1150, 560, 125, 220)
const ZONE_COUNTER := Rect2(1430, 603, 510, 485)
const ZONE_CUSTOMER := Rect2(1510, 248, 350, 512)
const ZONE_NOTE := Rect2(1460, 24, 430, 150)
const INNER := Rect2(28, 150, 214, 703)
const SLOT_H := 158.0
const HEAT_NOTCHES: Array = [Vector2(968, 1014), Vector2(968, 952), Vector2(968, 890)]
const HEATS: Array = ["low", "medium", "high"]

var behind_gate := true
var pour := ""
var pour_t := 0.0
var transfer_t := -1.0
var _transfer_dropped := false
var discard_t := -1.0
var _stain := false
var _stirring := false
var _spoon_angle := -0.4
var _grind_sfx := 0.0
var _bubble_t := 0.0
var _cauldron_angle := 0.0
var _mouth := Vector2.ZERO
var _mouth_r := Vector2.ZERO
var _pot_base := Vector2.ZERO
var _furnace := Rect2()
var _fire: FireField
var _fire_rect: TextureRect
var _liquid: Control
var _spoon: Control
var _body: TextureRect
var _pot_pivot: Control
var _bottle: TextureRect
var _pour_bottle: TextureRect
var _stream: Control
var _pestle: TextureRect
var _mortar_fx: Control
var _customer: TextureRect
var _note_who: Label
var _note_sum: Label
var _hint: Label
var _grind_label: Label
var _dusk: ColorRect
var _vignette: ColorRect
var _ghost: TextureRect
var _bg_rig: Control
var _work: Control
var _cabinet_strip: Control
var _scroll := 0.0
var _gesture := {}
var _last_customer := ""
var _clock := 0.0
var _fine_played := false


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	set_anchors_preset(PRESET_FULL_RECT)
	UiKit.ensure()
	_layout_geometry()
	_fire = FireField.new()
	_build()


func _layout_geometry() -> void:
	var table_fit := UiKit.contain_rect(ZONE_TABLE, Vector2(1250, 462))
	var table_scale := table_fit.size.x / 1250.0
	_furnace = Rect2(
		table_fit.position.x + 543.0 * table_scale,
		table_fit.position.y + 284.0 * table_scale,
		159.0 * table_scale,
		132.0 * table_scale
	)
	var pot_fit := UiKit.contain_rect(ZONE_CAULDRON, Vector2(1071, 750))
	var ps := pot_fit.size.x / 1071.0
	_mouth = pot_fit.position + Vector2(538, 130) * ps
	_mouth_r = Vector2(378, 84) * ps
	_pot_base = pot_fit.position + Vector2(1071 * 0.5, 750) * ps


func set_behind(on: bool) -> void:
	behind_gate = on


func advance(dt: float, tilt: TiltDriver, live: bool) -> void:
	_clock += dt
	if _bg_rig:
		var sc := 1.0
		if live and tilt != null:
			sc = tilt.rig_scale()
		_bg_rig.scale = Vector2(sc, sc)
		if live and tilt != null and tilt.mode != "off" and tilt.mode != "flat":
			_bg_rig.rotation_degrees = float(tilt.px) * 2.2
			if _work:
				_work.position = Vector2(tilt.px, tilt.py) * 2.0
		else:
			_bg_rig.rotation_degrees = 0
			if _work:
				_work.position = Vector2.ZERO
	if not live:
		if _dusk:
			_dusk.visible = true
		return
	if _dusk:
		_dusk.visible = false
	_tick_fire(dt)
	_tick_transfer(dt)
	_tick_pour(dt)
	_tick_discard(dt)
	_tick_grind_audio(dt)
	_tick_long_press()
	_sync_customer()
	_sync_note()
	_sync_hint()
	_sync_liquid()
	if _vignette:
		_vignette.visible = Game.is_paused()
	var heat := str(Game.brew["currentHeat"])
	var level: float = float({"low": 0.35, "medium": 0.7, "high": 1.0}.get(heat, 0.7))
	var filled := not (Game.brew["entries"] as Array).is_empty()
	Sfx.set_fire(level if not behind_gate else 0.0)
	Sfx.set_simmer(level if filled and not Game.brew["bottled"] else 0.0)


func set_dusk(opacity: float) -> void:
	if _dusk:
		_dusk.visible = true
		_dusk.color.a = 0.86 * clampf(opacity, 0.0, 1.0)


func _build() -> void:
	_bg_rig = Control.new()
	_bg_rig.set_anchors_preset(PRESET_FULL_RECT)
	_bg_rig.pivot_offset = Vector2(960, 540)
	_bg_rig.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(_bg_rig)
	_bg_rig.add_child(UiKit.sprite("background/shop_background.png", Rect2(0, 0, 1920, 1080), "fill"))

	_work = Control.new()
	_work.mouse_filter = MOUSE_FILTER_IGNORE
	_work.set_anchors_preset(PRESET_FULL_RECT)
	add_child(_work)
	_work.add_child(UiKit.sprite("table/work_table.png", ZONE_TABLE, "contain"))

	_fire_rect = TextureRect.new()
	_fire_rect.texture = _fire.texture
	_fire_rect.position = _furnace.position
	_fire_rect.size = _furnace.size
	_fire_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_fire_rect.stretch_mode = TextureRect.STRETCH_SCALE
	_fire_rect.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	_fire_rect.mouse_filter = MOUSE_FILTER_IGNORE
	_work.add_child(_fire_rect)

	_pot_pivot = Control.new()
	_pot_pivot.position = _pot_base
	_pot_pivot.pivot_offset = Vector2.ZERO
	_pot_pivot.mouse_filter = MOUSE_FILTER_IGNORE
	_work.add_child(_pot_pivot)

	_liquid = _painter(_draw_liquid)
	_liquid.position = _mouth - _pot_base - Vector2(_mouth_r.x, _mouth_r.y)
	_liquid.size = Vector2(_mouth_r.x * 2.0, _mouth_r.y * 2.0)
	_pot_pivot.add_child(_liquid)

	_body = UiKit.sprite("cauldron/cauldron_body.png", Rect2(ZONE_CAULDRON.position - _pot_base, ZONE_CAULDRON.size), "contain")
	_pot_pivot.add_child(_body)

	_spoon = _painter(_draw_spoon)
	_spoon.position = _mouth - _pot_base - Vector2(160, 160)
	_spoon.size = Vector2(320, 320)
	_pot_pivot.add_child(_spoon)

	var pot_hit := UiKit.hit(ZONE_CAULDRON)
	pot_hit.gui_input.connect(_cauldron_input)
	_work.add_child(pot_hit)

	_bottle = UiKit.sprite("bottles/bottle_empty.png", ZONE_BOTTLE, "contain")
	_work.add_child(_bottle)
	_pour_bottle = UiKit.sprite("bottles/bottle_open.png", ZONE_BOTTLE, "contain")
	_pour_bottle.visible = false
	_work.add_child(_pour_bottle)
	_stream = _painter(_draw_stream)
	_stream.set_anchors_preset(PRESET_FULL_RECT)
	_work.add_child(_stream)

	_build_mortar()
	_build_cabinet()
	_work.add_child(UiKit.sprite("table/bucket.png", Rect2(590, 958, 96, 112), "contain"))
	var bucket := UiKit.hit(Rect2(590, 958, 96, 112))
	bucket.pressed.connect(_on_bucket)
	_work.add_child(bucket)

	var papers := ColorRect.new()
	papers.position = Vector2(1296, 712)
	papers.size = Vector2(136, 76)
	papers.color = Color("e9d9b4")
	papers.rotation_degrees = -4
	papers.mouse_filter = MOUSE_FILTER_IGNORE
	_work.add_child(papers)
	var paper_hit := UiKit.hit(Rect2(1296, 712, 136, 76))
	paper_hit.pressed.connect(func() -> void: open_overlay.emit("process_history"))
	_work.add_child(paper_hit)

	var near := Control.new()
	near.mouse_filter = MOUSE_FILTER_IGNORE
	near.set_anchors_preset(PRESET_FULL_RECT)
	add_child(near)
	_customer = UiKit.sprite("customer/customer_woman_elder.png", ZONE_CUSTOMER, "contain")
	near.add_child(_customer)
	near.add_child(UiKit.sprite("customer/counter.png", ZONE_COUNTER, "contain"))
	var note_bg := UiKit.sprite("goal/goal_note.png", ZONE_NOTE, "cover")
	near.add_child(note_bg)
	_note_who = UiKit.label("", Rect2(1490, 48, 370, 36), 22, Color("3a2410"), UiKit.bold, HORIZONTAL_ALIGNMENT_RIGHT)
	_note_sum = UiKit.label("", Rect2(1490, 86, 370, 64), 18, Color("4a2f16"), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT)
	near.add_child(_note_who)
	near.add_child(_note_sum)
	var note_hit := UiKit.hit(ZONE_NOTE)
	note_hit.pressed.connect(func() -> void:
		Sfx.paper()
		open_overlay.emit("customer_request")
	)
	near.add_child(note_hit)

	_build_notebook()
	_build_heat()
	_hint = UiKit.label("", Rect2(300, 790, 520, 40), 18, Color("e9d9b4"))
	add_child(_hint)

	_ghost = UiKit.sprite("cauldron/cauldron_body.png", ZONE_CAULDRON, "contain")
	_ghost.visible = false
	_ghost.z_index = 8
	add_child(_ghost)

	_dusk = ColorRect.new()
	_dusk.color = Color(8.0 / 255.0, 5.0 / 255.0, 3.0 / 255.0, 0.86)
	_dusk.set_anchors_preset(PRESET_FULL_RECT)
	_dusk.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(_dusk)

	_vignette = ColorRect.new()
	_vignette.set_anchors_preset(PRESET_FULL_RECT)
	_vignette.mouse_filter = MOUSE_FILTER_IGNORE
	var shade := ShaderMaterial.new()
	shade.shader = load("res://shaders/vignette.gdshader")
	_vignette.material = shade
	_vignette.visible = false
	add_child(_vignette)


func _build_mortar() -> void:
	_work.add_child(UiKit.sprite("mortar/v3/mortar_back.png", ZONE_MORTAR, "contain"))
	_mortar_fx = _painter(_draw_pieces)
	_mortar_fx.position = ZONE_MORTAR.position
	_mortar_fx.size = ZONE_MORTAR.size
	_work.add_child(_mortar_fx)
	_work.add_child(UiKit.sprite("mortar/v3/mortar_front.png", ZONE_MORTAR, "contain"))
	_pestle = UiKit.sprite("mortar/v3/pestle_1.png", Rect2(), "contain")
	_pestle.visible = false
	_pestle.z_index = 2
	_work.add_child(_pestle)
	_grind_label = UiKit.label("", Rect2(ZONE_MORTAR.position.x - 30, ZONE_MORTAR.position.y + ZONE_MORTAR.size.y + 4, ZONE_MORTAR.size.x + 60, 36), 22, Color("f3e6c4"), UiKit.bold)
	_work.add_child(_grind_label)
	var hit := UiKit.hit(ZONE_MORTAR.grow(20))
	hit.pressed.connect(_on_mortar_tap)
	_work.add_child(hit)


func _build_cabinet() -> void:
	_work.add_child(UiKit.sprite("shelf/side_cabinet.png", ZONE_CABINET, "contain"))
	var clip := Control.new()
	clip.position = ZONE_CABINET.position + INNER.position
	clip.size = INNER.size
	clip.clip_contents = true
	clip.mouse_filter = MOUSE_FILTER_STOP
	clip.gui_input.connect(_cabinet_input)
	_work.add_child(clip)
	_cabinet_strip = Control.new()
	_cabinet_strip.mouse_filter = MOUSE_FILTER_IGNORE
	clip.add_child(_cabinet_strip)
	var ings: Array = Game.defs["ingredients"]
	for i in ings.size():
		_add_jar(ings[i], i)
	var empty_y := SLOT_H * ings.size()
	var dust := ColorRect.new()
	dust.position = Vector2(40, empty_y + 90)
	dust.size = Vector2(130, 18)
	dust.color = Color(0.4, 0.32, 0.22, 0.35)
	_cabinet_strip.add_child(dust)


func _add_jar(ing: Dictionary, index: int) -> void:
	var y := SLOT_H * index
	var board := UiKit.sprite("shelf/shelf_board.png", Rect2(20, y + SLOT_H - 36, 174, 30), "contain")
	_cabinet_strip.add_child(board)
	var jar := UiKit.sprite("cabinet/jar_%s.png" % str(ing["id"]), Rect2(43, y + 8, 128, 136), "contain")
	_cabinet_strip.add_child(jar)
	var name := UiKit.label(str(ing["nameFa"]), Rect2(10, y + SLOT_H - 28, 194, 22), 14, Color("e9d9b4"))
	_cabinet_strip.add_child(name)


func _build_notebook() -> void:
	var book := ColorRect.new()
	book.position = Vector2(1740, 900)
	book.size = Vector2(150, 165)
	book.color = Color("6e1f2e")
	book.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(book)
	var page := ColorRect.new()
	page.position = Vector2(1752, 912)
	page.size = Vector2(126, 140)
	page.color = Color("e9d9b4")
	page.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(page)
	add_child(UiKit.label(Content.UI["notebook"], Rect2(1752, 960, 126, 40), 16, Color("4a2f16"), UiKit.bold))
	var hit := UiKit.hit(Rect2(1740, 900, 150, 165))
	hit.pressed.connect(func() -> void:
		Sfx.paper()
		open_overlay.emit("notebook")
	)
	add_child(hit)


func _build_heat() -> void:
	for i in 3:
		var pos: Vector2 = HEAT_NOTCHES[i]
		var b := UiKit.parchment_button(Content.HEAT[HEATS[i]], Rect2(pos.x, pos.y, 104, 52))
		var heat_name: String = HEATS[i]
		b.pressed.connect(func() -> void:
			Game.set_heat(heat_name)
			Sfx.fire_whoosh()
			Haptics.pulse("light")
		)
		add_child(b)


func _tick_fire(dt: float) -> void:
	var heat := str(Game.brew.get("currentHeat", "medium"))
	var level: float = float({"low": 0.35, "medium": 0.7, "high": 1.0}.get(heat, 0.7))
	_fire.set_level(level, discard_t < 0.0)
	_fire.update(dt)
	if _fire_rect:
		_fire_rect.texture = _fire.texture


func _sync_customer() -> void:
	var c: Dictionary = Game.current_customer()
	var look := str(c.get("appearance", "woman_elder"))
	var emo := ""
	if Game.evaluation != null:
		var band := str(Game.evaluation["band"])
		emo = "_happy" if band == "excellent" or band == "good" else "_sad"
	var rel := "customer/customer_%s%s.png" % [look, emo]
	if rel == _last_customer:
		return
	_last_customer = rel
	if _customer:
		_customer.texture = UiKit.tex(rel)


func _sync_note() -> void:
	var c: Dictionary = Game.current_customer()
	if _note_who:
		_note_who.text = str(c.get("nameFa", ""))
	if _note_sum:
		_note_sum.text = str(c.get("summaryFa", ""))


func _sync_hint() -> void:
	if _hint == null:
		return
	if Game.overprocessed() and not Game.brew["bottled"]:
		_hint.text = Content.UI["burntHint"]
	if _grind_label:
		var gstate = null if Game.mortar == null else Game.mortar.get("grindState")
		_grind_label.text = "" if gstate == null else str(Content.GRIND.get(gstate, ""))
	if Game.mortar != null and bool(Game.mortar.get("grinding", false)):
		_hint.text = Content.UI["grindingHint"]
	elif Game.mortar != null:
		_hint.text = Content.UI["tapMortarHint"]
	elif (Game.brew["entries"] as Array).is_empty():
		_hint.text = Content.UI["jarTapHint"]
	elif Game.all_ready():
		_hint.text = Content.UI["tapToBottleHint"]
	else:
		_hint.text = Content.UI["stirHint"]


func _sync_liquid() -> void:
	if _liquid:
		_liquid.queue_redraw()
	if _spoon:
		_spoon.queue_redraw()
	if _stream:
		_stream.queue_redraw()
	if _mortar_fx:
		_mortar_fx.queue_redraw()
	_place_pestle()
	if _bottle:
		_bottle.visible = pour == "" and discard_t < 0.0


func _painter(fn: Callable) -> Control:
	var n: Control = preload("res://scripts/view/draw_host.gd").new()
	n.mouse_filter = MOUSE_FILTER_IGNORE
	n.paint = fn
	return n


func _draw_liquid(c: Control) -> void:
	var entries: Array = Game.brew["entries"]
	if entries.is_empty() or Game.brew["bottled"] or discard_t >= 0.0:
		return
	var col := LiquidColor.mix(entries, str(Game.brew["currentHeat"]), _clock)
	var pts := PackedVector2Array()
	var center := _liquid.size * 0.5
	for i in 40:
		var a := TAU * float(i) / 40.0
		pts.append(center + Vector2(cos(a), sin(a)) * center)
	c.draw_colored_polygon(pts, col)
	var boil: int = int({"low": 1, "medium": 3, "high": 6}.get(str(Game.brew["currentHeat"]), 2))
	for i in boil:
		var p := center + Vector2(sin(_clock * 3.0 + float(i)) * center.x * 0.45, cos(_clock * 4.0 + float(i) * 1.7) * center.y * 0.35)
		c.draw_circle(p, 3.0 + float(i % 2), Color(1, 1, 1, 0.35))


func _draw_spoon(c: Control) -> void:
	var entries: Array = Game.brew["entries"]
	var show: bool = (not entries.is_empty() and not Game.brew["bottled"] and pour == "") or transfer_t >= 0.0
	if transfer_t >= 0.0:
		return
	if not show:
		return
	var ang := _spoon_angle
	if not _stirring:
		ang = -0.6 + sin(_clock * 0.7) * 0.08
	var origin := _spoon.size * 0.5
	var bowl := origin + Vector2(cos(ang), sin(ang)) * _mouth_r.x * 0.55
	var handle := bowl + Vector2(cos(ang - 1.2), sin(ang - 1.2)) * 90.0
	c.draw_line(bowl, handle, Color("b8862f"), 8.0)
	c.draw_circle(bowl, 16.0, Color("d4a24a"))
	c.draw_circle(bowl, 9.0, Color("8a5a1e"))


func _draw_stream(c: Control) -> void:
	if pour != "stream":
		return
	var col := LiquidColor.mix(Game.brew["entries"], str(Game.brew["currentHeat"]), _clock)
	var rim := _tilted_rim()
	var mouth := _pour_bottle.position + Vector2(_pour_bottle.size.x * 0.5, 18)
	c.draw_line(rim, mouth, col, 8.0)


func _draw_pieces(c: Control) -> void:
	var mortar = Game.mortar
	if mortar == null:
		return
	var portions: Array = mortar["portions"] if mortar.get("portions") != null else [{
		"ingredientId": mortar["ingredientId"],
		"quantity": mortar["quantity"],
		"grindWork": float(mortar["grindWork"]) * float(mortar["quantity"]),
	}]
	var zone := ZONE_MORTAR.size
	var floor := Vector2(0.5016, 0.3609) * zone
	var rng := KimRng.new(KimRng.seed_for_customer(str(portions[0]["ingredientId"]), int(portions.size())))
	var n := 0
	for portion in portions:
		var kind := _kind(str(portion["ingredientId"]))
		var work := float(portion["grindWork"]) / maxf(0.001, float(portion["quantity"]))
		var t := clampf(work / 3.6, 0.0, 1.0)
		var count := int(round(float(portion["quantity"]) * lerpf(3.0, 7.0, t)))
		var size_px := lerpf(36.0, 14.0, t)
		for i in count:
			var ang := rng.next() * TAU
			var rad := sqrt(rng.next()) * zone.x * 0.22
			var at := floor + Vector2(cos(ang) * rad, sin(ang) * rad * 0.35)
			var frame := 1 + int(rng.next() * 7.0) % 7
			var tex := UiKit.tex("mortar/v3/pieces/%s_%d.png" % [kind, frame])
			if tex == null:
				continue
			var r := Rect2(at - Vector2(size_px, size_px) * 0.5, Vector2(size_px, size_px))
			c.draw_texture_rect(tex, r, false)
			n += 1


func _kind(id: String) -> String:
	if "chamomile" in id:
		return "flower"
	if "saffron" in id:
		return "thread"
	if "mint" in id:
		return "leaf"
	if "ginger" in id:
		return "root"
	if "poppy" in id:
		return "seed"
	if "borage" in id:
		return "star"
	return "petal"


func _place_pestle() -> void:
	if _pestle == null:
		return
	var grinding := Game.mortar != null and bool(Game.mortar.get("grinding", false)) and transfer_t < 0.0
	_pestle.visible = grinding or (Game.mortar != null and transfer_t < 0.0)
	if not _pestle.visible:
		return
	var frame := 1
	if grinding:
		frame = 1 + int(_clock * 8.0) % 6
	_pestle.texture = UiKit.tex("mortar/v3/pestle_%d.png" % frame)
	var pw := ZONE_MORTAR.size.x * 1.25
	var ph := pw * (1088.0 / 1360.0)
	var head := ZONE_MORTAR.position + Vector2(0.5016, 0.34) * ZONE_MORTAR.size
	if grinding:
		head += Vector2(cos(_clock * 9.0), sin(_clock * 9.0) * 0.35) * 10.0
	_pestle.position = head - Vector2(0.42 * pw, 0.74 * ph)
	_pestle.size = Vector2(pw, ph)


func _tick_long_press() -> void:
	if _gesture.is_empty() or not _gesture.has("t") or bool(_gesture.get("scroll", false)) or bool(_gesture.get("held", false)):
		return
	if Time.get_ticks_msec() - int(_gesture["t"]) < 450:
		return
	_gesture["held"] = true
	var local: Vector2 = _gesture["at"]
	var index := int(floor((local.y - _scroll) / SLOT_H))
	var ings: Array = Game.defs["ingredients"]
	if index < 0 or index >= ings.size():
		return
	Game.open_overlay_action("ingredient_detail", ings[index]["id"])
	Sfx.paper()


func _cauldron_input(ev: InputEvent) -> void:
	if Game.brew["bottled"] or pour != "" or discard_t >= 0.0:
		return
	if ev is InputEventMouseButton and ev.button_index == MOUSE_BUTTON_LEFT:
		if ev.pressed:
			_gesture = {"from": ev.position, "path": 0.0, "turns": 0.0, "ang": _pointer_angle(ev.position), "moved": false, "last": ev.position}
			_stirring = false
		else:
			if not bool(_gesture.get("moved", false)):
				_try_bottle()
			_stirring = false
			_gesture = {}
	elif ev is InputEventMouseMotion and not _gesture.is_empty():
		var step: Vector2 = ev.position - _gesture["last"]
		if step.length() < 6.0:
			return
		_gesture["last"] = ev.position
		_gesture["path"] = float(_gesture["path"]) + step.length()
		if float(_gesture["path"]) > 14.0:
			_gesture["moved"] = true
			_stirring = true
		var ang := _pointer_angle(ev.position)
		var d := wrapf(ang - float(_gesture["ang"]), -PI, PI)
		d = clampf(d, -0.55 * PI, 0.55 * PI)
		_gesture["ang"] = ang
		_gesture["turns"] = float(_gesture["turns"]) + absf(d) / TAU
		_spoon_angle = ang
		if float(_gesture["turns"]) >= 0.8 and float(_gesture["path"]) >= 220.0:
			Game.stir()
			Sfx.stir_sfx()
			Haptics.pulse("light")
			_gesture["turns"] = 0.0
			_gesture["path"] = 0.0


func _pointer_angle(p: Vector2) -> float:
	var scene := ZONE_CAULDRON.position + p
	return atan2(scene.y - _mouth.y, scene.x - _mouth.x)


func _try_bottle() -> void:
	if (Game.brew["entries"] as Array).is_empty() or Game.overprocessed() or Game.brew["bottled"]:
		return
	Game.bottle_brew()
	pour = "tilt"
	pour_t = 0.0
	Haptics.pulse("medium")


func _tick_pour(dt: float) -> void:
	if pour == "":
		_cauldron_angle = 0.0
		if _pour_bottle:
			_pour_bottle.visible = false
		return
	if not Game.brew["bottled"]:
		pour = ""
		return
	pour_t += dt
	var tilt_u := clampf(pour_t / 0.5, 0.0, 1.0) if pour == "tilt" else 1.0
	if pour == "deliver":
		tilt_u = clampf(1.0 - (pour_t - 1.7) / 0.3, 0.0, 1.0)
	_cauldron_angle = deg_to_rad(11.0 * tilt_u)
	if _pot_pivot:
		_pot_pivot.rotation = _cauldron_angle
	if pour == "tilt" and pour_t >= 0.5:
		pour = "stream"
		Sfx.pour(1.2)
	elif pour == "stream" and pour_t >= 1.7:
		pour = "deliver"
		Sfx.cork()
		Haptics.pulse("light")
	elif pour == "deliver" and pour_t >= 2.7:
		pour = ""
		_cauldron_angle = 0.0
		if _pot_pivot:
			_pot_pivot.rotation = 0
		if Game.result != null:
			Sfx.deliver_sfx()
			Haptics.pulse("heavy")
			Game.open_overlay_action("result")
			Game.deliver()
	_place_pour_bottle()


func _tilted_rim() -> Vector2:
	var a := _cauldron_angle
	var rx := _mouth.x + _mouth_r.x * 0.92 - _pot_base.x
	var ry := _mouth.y - _pot_base.y
	return Vector2(_pot_base.x + rx * cos(a) - ry * sin(a), _pot_base.y + rx * sin(a) + ry * cos(a))


func _place_pour_bottle() -> void:
	if _pour_bottle == null:
		return
	_pour_bottle.visible = pour == "tilt" or pour == "stream" or pour == "deliver"
	if _bottle:
		_bottle.visible = not _pour_bottle.visible
	var rim := _tilted_rim()
	var fill_pos := Vector2(rim.x + 28 - ZONE_BOTTLE.size.x * 0.5, rim.y + 30)
	var counter_y := ZONE_COUNTER.position.y + (ZONE_COUNTER.size.y * 72.0 / 620.0)
	var spot := Vector2(1560, counter_y - 196)
	if pour == "tilt":
		var u := clampf(pour_t / 0.5, 0.0, 1.0)
		_pour_bottle.position = ZONE_BOTTLE.position.lerp(fill_pos, u)
		_pour_bottle.texture = UiKit.tex("bottles/bottle_open.png")
	elif pour == "stream":
		_pour_bottle.position = fill_pos
		_pour_bottle.texture = UiKit.tex("bottles/bottle_open.png")
	elif pour == "deliver":
		var u2 := clampf((pour_t - 1.7) / 1.0, 0.0, 1.0)
		_pour_bottle.position = fill_pos.lerp(spot, u2)
		_pour_bottle.texture = UiKit.tex("bottles/bottle_full.png")


func _on_mortar_tap() -> void:
	if Game.mortar == null or Game.brew["bottled"] or transfer_t >= 0.0:
		return
	if not Game.transfer_mortar():
		return
	transfer_t = 0.0
	_transfer_dropped = false
	Sfx.scoop()
	Haptics.pulse("light")


func _tick_transfer(dt: float) -> void:
	if transfer_t < 0.0:
		return
	transfer_t += dt
	var drop_at := 0.32 + 1.6 + 0.7 + 0.88 * 0.46
	if not _transfer_dropped and transfer_t >= drop_at:
		_transfer_dropped = true
		Game.add_mortar_to_cauldron()
		Sfx.splash()
		Haptics.pulse("medium")
	if transfer_t >= 0.32 + 1.6 + 0.7 + 0.88 + 0.35:
		transfer_t = -1.0


func _tick_grind_audio(dt: float) -> void:
	if Game.mortar == null or not bool(Game.mortar.get("grinding", false)) or Game.is_paused():
		_fine_played = false
		return
	_grind_sfx += dt
	if _grind_sfx >= 0.28:
		_grind_sfx = 0.0
		Sfx.grind_tick()
		Haptics.pulse("light")
	var state = Game.mortar.get("grindState")
	if state == "fine" and not _fine_played:
		_fine_played = true
		Sfx.grind_fine()


func _cabinet_input(ev: InputEvent) -> void:
	if ev is InputEventMouseButton and ev.button_index == MOUSE_BUTTON_LEFT:
		if ev.pressed:
			_gesture = {"y": ev.position.y, "scroll": false, "t": Time.get_ticks_msec(), "at": ev.position}
		else:
			if not bool(_gesture.get("scroll", false)) and Time.get_ticks_msec() - int(_gesture.get("t", 0)) < 450:
				_tap_jar(ev.position)
			_gesture = {}
	elif ev is InputEventMouseMotion and not _gesture.is_empty() and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		var dy: float = ev.position.y - float(_gesture["y"])
		if absf(ev.position.y - float(_gesture["at"].y)) > 12.0:
			_gesture["scroll"] = true
		if bool(_gesture.get("scroll", false)):
			_scroll = clampf(_scroll + dy, -_max_scroll(), 0.0)
			_gesture["y"] = ev.position.y
			if _cabinet_strip:
				_cabinet_strip.position.y = _scroll


func _max_scroll() -> float:
	var n: int = (Game.defs["ingredients"] as Array).size() + 1
	return maxf(0.0, SLOT_H * n - INNER.size.y)


func _tap_jar(local: Vector2) -> void:
	if Game.mortar_total_units() >= 6.0:
		Sfx.wood_bump()
		Haptics.pulse("medium")
		return
	var y := local.y - _scroll
	var index := int(floor(y / SLOT_H))
	var ings: Array = Game.defs["ingredients"]
	if index < 0 or index >= ings.size():
		return
	if Time.get_ticks_msec() - int(_gesture.get("t", 0)) >= 450 and not bool(_gesture.get("scroll", false)):
		Game.open_overlay_action("ingredient_detail", ings[index]["id"])
		return
	var id := str(ings[index]["id"])
	Game.add_classic_unit(id)
	Game.start_grinding()
	Sfx.jar_drop()
	Haptics.pulse("light")


func _on_bucket() -> void:
	if discard_t >= 0.0:
		return
	if (Game.brew["entries"] as Array).is_empty() and Game.mortar == null and Game.result == null:
		return
	begin_discard()


func begin_discard() -> void:
	Sfx.cauldron_throw()
	Haptics.pulse("heavy")
	Game.reset_brew()
	pour = ""
	transfer_t = -1.0
	discard_t = 0.0
	if _ghost:
		_ghost.visible = true
		_ghost.position = ZONE_CAULDRON.position
		_ghost.rotation = 0


func _tick_discard(dt: float) -> void:
	if discard_t < 0.0 or _ghost == null:
		return
	discard_t += dt
	var u := clampf(discard_t / 0.7, 0.0, 1.0)
	var start := ZONE_CAULDRON.position
	var end := Vector2(820, 180)
	var mid := (start + end) * 0.5 + Vector2(0, -220)
	var uu := 1.0 - u
	_ghost.position = uu * uu * start + 2.0 * uu * u * mid + u * u * end
	_ghost.rotation_degrees = u * 140.0
	_ghost.scale = Vector2.ONE * lerpf(1.0, 0.55, u)
	if discard_t >= 0.45 and not _stain:
		_stain = true
		Sfx.cauldron_splat()
	if discard_t >= 0.7:
		Sfx.cauldron_clang()
		Sfx.cauldron_land(0.6)
		_ghost.visible = false
		discard_t = -1.0
		_stain = false


func jump_pour(phase_name: String, t: float) -> void:
	pour = phase_name
	pour_t = t
	_place_pour_bottle()
	if _pot_pivot:
		_cauldron_angle = deg_to_rad(11.0 if phase_name != "deliver" else 4.0)
		_pot_pivot.rotation = _cauldron_angle
