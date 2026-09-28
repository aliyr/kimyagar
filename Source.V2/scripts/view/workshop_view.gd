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
var _bg: TextureRect
var _bg_mat: ShaderMaterial
var _near: Control
var _work: Control
var _cabinet_strip: Control
var _scroll := 0.0
var _gesture := {}
var _last_customer := ""
var _clock := 0.0
var _fine_played := false
var _pile: MortarPile
var _mortar_parts: MortarParticles
var _mortar_over: Control
var _mortar_front: TextureRect
var _held_chips: Array = []
var _pending_lands: Array = []
var _brush_t := -1.0
var _shake_t := -1.0
var _brush: Control
var _brew: ClassicBrewSim
var _brew_painter: ClassicBrewPainter
var _fx: Control
var _known := {}
var _brew_acc := 0.0
var _stir_delay := -1.0
var _sparkled := false
var _shadows: Control
var _smoke: Control
var _haze := 0.0
var _flights: Array = []
const _PUFFS: Array = [
	{"dx": -60.0, "delay": 0.0, "dur": 6.2, "size": 260.0, "drift": -140.0},
	{"dx": 40.0, "delay": 0.9, "dur": 6.8, "size": 300.0, "drift": 120.0},
	{"dx": -20.0, "delay": 1.9, "dur": 5.9, "size": 240.0, "drift": -60.0},
	{"dx": 90.0, "delay": 2.6, "dur": 7.1, "size": 320.0, "drift": 190.0},
	{"dx": -110.0, "delay": 3.4, "dur": 6.4, "size": 280.0, "drift": -220.0},
	{"dx": 15.0, "delay": 4.3, "dur": 6.9, "size": 340.0, "drift": 40.0},
	{"dx": 65.0, "delay": 5.1, "dur": 6.1, "size": 250.0, "drift": 150.0},
]


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	set_anchors_preset(PRESET_FULL_RECT)
	UiKit.ensure()
	_layout_geometry()
	_fire = FireField.new()
	_brew = ClassicBrewSim.new(7)
	_brew_painter = ClassicBrewPainter.new()
	_pile = MortarPile.new()
	_pile.struck.connect(_on_mortar_strike)
	_mortar_parts = _pile.make_particles()
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
		var px := 0.0
		var py := 0.0
		var use := live and tilt != null and tilt.mode != "off"
		if use:
			px = tilt.px
			py = tilt.py
		if _work:
			_work.position = Vector2(px, py) * 2.0
		if _near:
			_near.position = Vector2(px, py) * 12.0
		if _bg_mat:
			var dimensional := use and tilt.mode != "flat"
			_bg_mat.set_shader_parameter("ax", deg_to_rad(-py * 2.0) if dimensional else 0.0)
			_bg_mat.set_shader_parameter("ay", deg_to_rad(px * 2.2) if dimensional else 0.0)
			_bg_mat.set_shader_parameter("rig_scale", tilt.rig_scale() if use else 1.0)
			_bg_mat.set_shader_parameter("depth_offset", Vector2(px, py) * 18.0)
	if not live:
		if _dusk:
			_dusk.visible = true
		return
	if _dusk:
		_dusk.visible = false
	_tick_fire(dt)
	_tick_mortar(dt)
	_sync_brew(dt)
	_tick_transfer(dt)
	_tick_pour(dt)
	_tick_discard(dt)
	_tick_long_press()
	_sync_customer()
	_sync_note()
	_sync_hint()
	_sync_liquid()
	if _vignette:
		_vignette.visible = Game.is_paused()
	var burnt: bool = Game.overprocessed() and not bool(Game.brew["bottled"]) and discard_t < 0.0
	var haze_target := 1.0 if burnt else 0.0
	_haze = move_toward(_haze, haze_target, dt / 4.0)
	_tick_flights(dt)
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
	_bg = UiKit.sprite("background/shop_background.png", Rect2(0, 0, 1920, 1080), "fill")
	_bg_mat = ShaderMaterial.new()
	_bg_mat.shader = load("res://shaders/rig_perspective.gdshader")
	_bg.material = _bg_mat
	_bg_rig.add_child(_bg)

	_work = Control.new()
	_work.mouse_filter = MOUSE_FILTER_IGNORE
	_work.set_anchors_preset(PRESET_FULL_RECT)
	add_child(_work)
	_work.add_child(UiKit.sprite("table/work_table.png", ZONE_TABLE, "contain"))
	_shadows = _painter(_draw_shadows)
	_shadows.set_anchors_preset(PRESET_FULL_RECT)
	_work.add_child(_shadows)

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

	_fx = _painter(_draw_brew)
	_fx.set_anchors_preset(PRESET_FULL_RECT)
	_work.add_child(_fx)

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

	_near = Control.new()
	_near.mouse_filter = MOUSE_FILTER_IGNORE
	_near.set_anchors_preset(PRESET_FULL_RECT)
	add_child(_near)
	var near := _near
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

	_smoke = _painter(_draw_smoke)
	_smoke.set_anchors_preset(PRESET_FULL_RECT)
	_smoke.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(_smoke)

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
	var back := UiKit.sprite("mortar/v3/mortar_back.png", ZONE_MORTAR, "contain")
	back.z_index = 0
	_work.add_child(back)
	_mortar_fx = _painter(_draw_pieces)
	_mortar_fx.position = ZONE_MORTAR.position
	_mortar_fx.size = ZONE_MORTAR.size
	_mortar_fx.z_index = 3
	_work.add_child(_mortar_fx)
	_mortar_front = UiKit.sprite("mortar/v3/mortar_front.png", ZONE_MORTAR, "contain")
	_mortar_front.z_index = 5
	_work.add_child(_mortar_front)
	_pestle = UiKit.sprite("mortar/v3/pestle_1.png", Rect2(), "contain")
	_pestle.visible = true
	_pestle.z_index = 2
	_work.add_child(_pestle)
	_mortar_over = _painter(_draw_mortar_fx)
	_mortar_over.set_anchors_preset(PRESET_FULL_RECT)
	_mortar_over.z_index = 6
	_work.add_child(_mortar_over)
	_build_brush()
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
	if _shake_t > 0.0:
		_hint.text = "جا ندارد!"
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
	if _mortar_over:
		_mortar_over.queue_redraw()
	if _shadows:
		_shadows.queue_redraw()
	if _smoke:
		_smoke.queue_redraw()
	_place_pestle()
	if _bottle:
		_bottle.visible = pour == "" and discard_t < 0.0


func _painter(fn: Callable) -> Control:
	var n: Control = preload("res://scripts/view/draw_host.gd").new()
	n.mouse_filter = MOUSE_FILTER_IGNORE
	n.paint = fn
	return n


func _draw_shadows(c: Control) -> void:
	_soft_ellipse(c, 415.0, 763.0, 110.0, 22.0, 0.6)
	_soft_ellipse(c, 1212.5, 772.0, 62.5, 12.0, 0.5)
	_soft_ellipse(c, 1364.0, 782.0, 74.8, 12.0, 0.4)
	_soft_ellipse(c, 1664.6, 1076.0, 285.6, 26.0, 0.55)


func _soft_ellipse(c: Control, cx: float, cy: float, rx: float, ry: float, strength: float) -> void:
	var xf := Transform2D(Vector2(rx, 0), Vector2(0, ry), Vector2(cx, cy))
	c.draw_set_transform_matrix(xf)
	for i in 5:
		var t := float(i) / 4.0
		var rad := lerpf(0.42, 1.05, t)
		var a := strength * lerpf(0.55, 0.0, t)
		c.draw_circle(Vector2.ZERO, rad, Color(10.0 / 255.0, 6.0 / 255.0, 2.0 / 255.0, a))
	c.draw_set_transform_matrix(Transform2D.IDENTITY)


func _draw_smoke(c: Control) -> void:
	if _haze > 0.01:
		c.draw_rect(Rect2(0, 0, 1920, 420), Color(64.0 / 255.0, 58.0 / 255.0, 56.0 / 255.0, 0.55 * _haze))
		c.draw_circle(Vector2(860, 40), 520, Color(70.0 / 255.0, 64.0 / 255.0, 62.0 / 255.0, 0.28 * _haze))
	if _haze < 0.05:
		return
	for puff in _PUFFS:
		var dur := float(puff["dur"])
		var local := fposmod(_clock - float(puff["delay"]), dur)
		var u := local / dur
		var alpha := 0.0
		if u < 0.12:
			alpha = lerpf(0.0, 0.85, u / 0.12)
		elif u < 0.55:
			alpha = lerpf(0.85, 0.6, (u - 0.12) / 0.43)
		else:
			alpha = lerpf(0.6, 0.0, (u - 0.55) / 0.45)
		var scale := lerpf(0.25, 3.1, u * u)
		var drift := float(puff["drift"]) * u
		var rise := -760.0 * u
		var sz := float(puff["size"]) * 0.22 * scale
		var at := _mouth + Vector2(float(puff["dx"]) + drift, rise)
		c.draw_circle(at, sz, Color(90.0 / 255.0, 84.0 / 255.0, 82.0 / 255.0, alpha * _haze))


func _tick_flights(dt: float) -> void:
	if not _flights.is_empty():
		var keep: Array = []
		for flight in _flights:
			flight["t"] = float(flight["t"]) + dt
			if float(flight["t"]) < 0.34:
				keep.append(flight)
		_flights = keep
	if _pending_lands.is_empty():
		return
	var waiting: Array = []
	for land in _pending_lands:
		land["left"] = float(land["left"]) - dt
		if float(land["left"]) > 0.0:
			waiting.append(land)
			continue
		if Game.open_overlay != null or Game.result != null:
			continue
		var landed_id := str(land["id"])
		Game.add_classic_unit(landed_id)
		Game.start_grinding()
		Sfx.jar_drop()
		if _mortar_parts:
			_mortar_parts.burst("land", Vector2.ZERO, {"color": str(land["color"])})
	_pending_lands = waiting


func _spawn_flight(ingredient_id: String, from: Vector2) -> void:
	var kind := MortarPile.kind_for(ingredient_id)
	var count := MortarPile.sprite_count(kind)
	var target := ZONE_MORTAR.position + Vector2(0.5016, 0.3359) * ZONE_MORTAR.size
	for i in 5:
		_flights.append({
			"t": -0.12 - float(i) * 0.022,
			"from": from,
			"to": target,
			"kind": kind,
			"sprite": 1 + (i % maxi(1, count)),
			"sx": randf_range(-18.0, 36.0),
			"sy": randf_range(-10.0, 14.0),
			"spin": randf_range(-2.4, 2.4),
		})


func _draw_liquid(_c: Control) -> void:
	pass


func _draw_spoon(_c: Control) -> void:
	pass


func _draw_brew(c: Control) -> void:
	if _brew == null or _brew_painter == null:
		return
	if not _brew.pot_visible():
		return
	if discard_t >= 0.0:
		return
	if bool(Game.brew["bottled"]) and pour == "":
		return
	_brew_painter.draw(c, _brew, _mouth, _mouth_r.x, _mouth_r.y)


func _sync_brew(dt: float) -> void:
	if _brew == null or not live_brew():
		return
	var bottled: bool = bool(Game.brew["bottled"])
	var heat_name := str(Game.brew.get("currentHeat", "medium"))
	var level := 0.0 if bottled else float({"low": 0.4, "medium": 0.75, "high": 1.0}.get(heat_name, 0.75))
	_brew.set_heat_level(level)
	_brew.set_burnt(Game.overprocessed() and not bottled)
	var ready: bool = Game.all_ready()
	if ready and not _sparkled and not bottled:
		_sparkled = true
		Sfx.sparkle()
	if not ready:
		_sparkled = false
	_brew.set_done(ready and not bottled)
	var tuning: Dictionary = Game.defs["tuning"]
	var ready_at := float(tuning.get("ready", 1.0))
	var entries: Array = Game.brew["entries"]
	var per := {}
	for entry in entries:
		var p := clampf(float(entry["exposure"]) / maxf(0.001, ready_at), 0.0, 1.0)
		var id := str(entry["ingredientId"])
		if per.has(id):
			per[id] = minf(float(per[id]), p)
		else:
			per[id] = p
	for id in per.keys():
		_brew.set_ingredient_progress(str(id), float(per[id]))
	_brew.set_pour_tilt(11.0 if pour == "tilt" or pour == "stream" else 0.0)
	if entries.is_empty():
		if not _known.is_empty():
			_brew.reset()
			_brew.set_heat_level(level)
			_known = {}
	else:
		var fresh: Array = []
		for entry in entries:
			var eid := str(entry["id"])
			if not _known.has(eid):
				fresh.append(entry)
				_known[eid] = true
		for entry in fresh:
			var ing_id := str(entry["ingredientId"])
			var tint := _ingredient_color(ing_id)
			var poured: Array = _take_poured(ing_id)
			if poured.is_empty() and _pile != null:
				poured = _pile.bake_chips_for(ing_id, float(entry["quantity"]), _entry_work(entry), "#" + tint.to_html(false))
			if poured.is_empty():
				poured = _fallback_chips(ing_id, float(entry["quantity"]), _entry_work(entry), tint)
			_brew.drop_chips({
				"id": ing_id,
				"tint": tint,
				"strength": ClassicBrewSim.strength_for(ing_id),
				"quantity": float(entry["quantity"]),
			}, poured)
		if not fresh.is_empty():
			_stir_delay = 0.9 + float(fresh.size() - 1) * 0.35
	if _stir_delay >= 0.0:
		_stir_delay -= dt
		if _stir_delay < 0.0:
			_brew.stir()
			Game.stir()
	if _stirring:
		_brew.set_spoon_follow(_spoon_angle)
	elif not _gesture.is_empty() and not bool(_gesture.get("moved", false)):
		pass
	else:
		_brew.set_spoon_follow(null)
	_brew.set_fire_glow(_fire.intensity if _fire != null else 0.0)
	_brew_acc += dt
	var steps := 0
	while _brew_acc >= 1.0 / 60.0 and steps < 5:
		_brew.update(1.0 / 60.0)
		_brew_acc -= 1.0 / 60.0
		steps += 1
		var impact: float = _brew.take_landing()
		if impact > 0.0:
			Sfx.cauldron_land(clampf(impact / 2200.0, 0.15, 1.0))
		if _brew.take_fill_start():
			Sfx.water_fill(0.95)
	if pour == "" and _pot_pivot and discard_t < 0.0:
		var sq: Vector2 = _brew.squash()
		_pot_pivot.position = _pot_base + Vector2(0, _brew.spawn_y)
		_pot_pivot.rotation_degrees = _brew.tilt + _brew.rock
		_pot_pivot.scale = sq
	if _body:
		_body.modulate = Color(1, 1, 1, 1).lerp(Color(0.35, 0.3, 0.28), _brew.soot)
		_body.visible = _brew.pot_visible()


func live_brew() -> bool:
	return true


func _ingredient_color(id: String) -> Color:
	for ing in Game.defs["ingredients"]:
		if str(ing["id"]) == id:
			return Color(str(ing["color"]))
	return Color(ClassicBrewSim.flat_tint(id))


func _entry_work(entry: Dictionary) -> float:
	var state := str(entry.get("grindState", "whole"))
	var unit := float({"whole": 0.0, "coarse": 1.0, "crushed": 2.2, "fine": 3.6}.get(state, 0.0))
	return unit * float(entry["quantity"])


func _fallback_chips(id: String, qty: float, work: float, color: Color) -> Array:
	var kind := _kind(id)
	var norm := work / maxf(qty, 0.001)
	var t := clampf(norm / 3.6, 0.0, 1.0)
	var n := clampi(int(round(qty * lerpf(4.0, 7.0, t))), 1, 10)
	var rng := KimRng.new(KimRng.seed_for_customer(id, int(qty)))
	var out: Array = []
	for i in n:
		var w := lerpf(18.0, 7.0, t) * rng.range(0.8, 1.2)
		var h := w * rng.range(0.55, 1.35)
		out.append({
			"w": w, "h": h, "kind": kind,
			"sprite": 1 + int(rng.next() * 7.0) % 7,
			"color": color, "crush": t,
			"generation": 0 if t < 0.75 else 1,
			"nick": rng.next(), "rot": rng.range(0.0, 360.0),
			"ingredient_id": id,
		})
	return out


func _draw_stream(c: Control) -> void:
	for flight in _flights:
		var ft := float(flight["t"])
		if ft < 0.0:
			continue
		var u := clampf(ft / 0.3, 0.0, 1.0)
		var from: Vector2 = flight["from"]
		var to: Vector2 = flight["to"]
		var spread := Vector2(float(flight["sx"]), float(flight["sy"])) * (1.0 - u)
		var arc := Vector2(0, -70.0 * sin(u * PI))
		var at := from.lerp(to, u * u * (3.0 - 2.0 * u)) + spread + arc
		var tex := UiKit.tex("mortar/v3/pieces/%s_%d.png" % [str(flight["kind"]), int(flight["sprite"])])
		if tex == null:
			continue
		var px := lerpf(40.0, 28.0, u)
		c.draw_set_transform(at, float(flight["spin"]) * ft, Vector2.ONE)
		c.draw_texture_rect(tex, Rect2(-px * 0.5, -px * 0.5, px, px), false)
		c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	if pour != "stream":
		return
	var col := LiquidColor.mix(Game.brew["entries"], str(Game.brew["currentHeat"]), _clock)
	var rim := _tilted_rim()
	var mouth := _pour_bottle.position + Vector2(_pour_bottle.size.x * 0.5, 18)
	c.draw_line(rim, mouth, col, 8.0)


func _draw_pieces(c: Control) -> void:
	if _pile == null:
		return
	var aim: Dictionary = _pile.pestle()
	var shown: Array = _pile.chips()
	if _mortar_parts:
		_mortar_parts.draw_below(c, ZONE_MORTAR.position, ZONE_MORTAR.size, shown, aim, _pile.residue())
	var box: Dictionary = _pile.bowl()
	var origin := Vector2(float(box["left"]), float(box["top"])) / 100.0 * ZONE_MORTAR.size
	var bw := float(box["width"]) / 100.0 * ZONE_MORTAR.size.x
	var bh := float(box["height"]) / 100.0 * ZONE_MORTAR.size.y
	for chip in shown:
		var k := float(chip["draw_k"])
		var w := float(chip["w"]) / 100.0 * bw * k
		var h := float(chip["h"]) / 100.0 * bh * k
		var hop := float(chip["hop"])
		var center := origin + Vector2(float(chip["x"]) / 100.0 * bw, float(chip["y"]) / 100.0 * bh)
		center.y -= hop * 9.0
		var sc := 1.0 + hop * 0.08
		if str(chip["kind"]) == "dust":
			var col: Color = chip["color"]
			c.draw_circle(center, maxf(w, h) * 0.5 * sc, Color(col.r, col.g, col.b, 0.9))
			continue
		var tex := UiKit.tex("mortar/v3/pieces/%s_%d.png" % [str(chip["kind"]), int(chip["sprite"])])
		if tex == null:
			continue
		c.draw_set_transform(center, deg_to_rad(float(chip["rot"])), Vector2(sc, sc))
		c.draw_texture_rect(tex, Rect2(-w * 0.5, -h * 0.5, w, h), false)
		var tint: Color = chip["color"]
		c.draw_rect(Rect2(-w * 0.5, -h * 0.5, w, h), Color(tint.r, tint.g, tint.b, 0.22), true)
		c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _draw_mortar_fx(c: Control) -> void:
	if _mortar_parts == null:
		return
	_mortar_parts.draw(c, Vector2.ZERO, ZONE_MORTAR.size)


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
	if _pestle == null or _pile == null:
		return
	var aim: Dictionary = _pile.pestle()
	var box := Vector2(MortarPile.PESTLE_W, MortarPile.PESTLE_H) / 100.0 * ZONE_MORTAR.size
	var anchor := Vector2(MortarPile.PESTLE_HEAD_X, MortarPile.PESTLE_HEAD_Y)
	var head := ZONE_MORTAR.position + Vector2(float(aim["head_x"]), float(aim["head_y"])) / 100.0 * ZONE_MORTAR.size
	_pestle.visible = transfer_t < 0.0
	_pestle.texture = UiKit.tex("mortar/v3/pestle_%d.png" % int(aim["frame"]))
	_pestle.size = box
	_pestle.pivot_offset = anchor * box
	_pestle.position = head - anchor * box
	_pestle.rotation_degrees = float(aim["rotate"])
	_pestle.z_index = 4 if _pile.pestle_in_front(aim) else 2
	if _brush:
		var show := (Game.mortar != null or not _pile.residue().is_empty()) and transfer_t < 0.0
		_brush.visible = show


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
	if _brew:
		_brew.dismiss_spoon()
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
		if _pile:
			_held_chips = _pile.scoop_rest()
		Game.add_mortar_to_cauldron()
		Sfx.splash()
		Haptics.pulse("medium")
	if transfer_t >= 0.32 + 1.6 + 0.7 + 0.88 + 0.35:
		transfer_t = -1.0


func _tick_mortar(dt: float) -> void:
	if _shake_t > 0.0:
		_shake_t -= dt
	if _brush_t >= 0.0:
		_brush_t += dt
		if _brush_t >= 0.22 and Game.mortar != null:
			Game.clear_mortar()
		if _brush_t >= 0.48:
			if _pile:
				_pile.clear_residue()
			_brush_t = -1.0
	if _pile == null:
		return
	var grinding := Game.mortar != null and bool(Game.mortar.get("grinding", false)) and transfer_t < 0.0 and not Game.is_paused()
	if Game.mortar == null:
		_pile.sync({})
		_fine_played = false
	else:
		var state: Dictionary = Game.mortar
		_pile.sync(state)
	_pile.update(dt, grinding)
	if _mortar_parts:
		var aroma := 0.0
		var aroma_col := Color("#8a7a52")
		if Game.mortar != null and transfer_t < 0.0:
			aroma = _mortar_norm() * (1.0 if grinding else 0.55)
			aroma_col = _mortar_mix_color()
		_mortar_parts.set_aroma(aroma, aroma_col)
		_mortar_parts.update(dt)
	if Game.mortar != null:
		var gstate = Game.mortar.get("grindState")
		if gstate == "fine" and not _fine_played:
			_fine_played = true
			Sfx.grind_fine()
			Haptics.pulse("medium")
			if _mortar_parts:
				_mortar_parts.burst("fine", Vector2.ZERO, {"color": _mortar_mix_color()})
		elif gstate != "fine":
			_fine_played = false


func _on_mortar_strike(info: Dictionary) -> void:
	Sfx.grind_strike(float(info["fineness"]), int(info["hits"]))
	Haptics.pulse("light" if float(info["fineness"]) > 0.66 else "medium")
	if _mortar_parts:
		_mortar_parts.burst("strike", Vector2(float(info["x"]), float(info["y"])), {
			"fineness": float(info["fineness"]),
			"hits": int(info["hits"]),
			"colors": info["colors"],
		})


func _mortar_norm() -> float:
	if Game.mortar == null:
		return 0.0
	var work := 0.0
	if Game.mortar.get("portions") != null:
		for portion in Game.mortar["portions"]:
			work = maxf(work, float(portion["grindWork"]) / maxf(0.001, float(portion["quantity"])))
	else:
		work = float(Game.mortar.get("grindWork", 0.0))
	return clampf(work / 3.6, 0.0, 1.0)


func _mortar_mix_color() -> Color:
	if Game.mortar == null:
		return Color("#8a7a52")
	if Game.mortar.get("portions") != null:
		for portion in Game.mortar["portions"]:
			return _ingredient_color(str(portion["ingredientId"]))
	return _ingredient_color(str(Game.mortar.get("ingredientId", "")))


func _take_poured(id: String) -> Array:
	var mine: Array = []
	var rest: Array = []
	for chip in _held_chips:
		if str(chip.get("ingredient_id", "")) == id:
			mine.append(chip)
		else:
			rest.append(chip)
	if mine.is_empty():
		var kept: Array = []
		for chip in rest:
			if str(chip.get("ingredient_id", "")) == "":
				mine.append(chip)
			else:
				kept.append(chip)
		rest = kept
	_held_chips = rest
	return mine


func _build_brush() -> void:
	var rect := Rect2(
		ZONE_MORTAR.position.x + ZONE_MORTAR.size.x * 1.03,
		ZONE_MORTAR.position.y + ZONE_MORTAR.size.y * 0.5,
		ZONE_MORTAR.size.x * 0.19,
		ZONE_MORTAR.size.y * 0.38
	)
	_brush = Control.new()
	_brush.position = rect.position
	_brush.size = rect.size
	_brush.z_index = 7
	_brush.visible = false
	_brush.mouse_filter = MOUSE_FILTER_IGNORE
	_work.add_child(_brush)
	var handle := ColorRect.new()
	handle.position = Vector2(rect.size.x * 0.38, 0)
	handle.size = Vector2(rect.size.x * 0.24, rect.size.y * 0.62)
	handle.color = Color("6b3e22")
	handle.mouse_filter = MOUSE_FILTER_IGNORE
	_brush.add_child(handle)
	var ferrule := ColorRect.new()
	ferrule.position = Vector2(rect.size.x * 0.32, rect.size.y * 0.58)
	ferrule.size = Vector2(rect.size.x * 0.36, rect.size.y * 0.08)
	ferrule.color = Color("c4913b")
	ferrule.mouse_filter = MOUSE_FILTER_IGNORE
	_brush.add_child(ferrule)
	var bristles := ColorRect.new()
	bristles.position = Vector2(rect.size.x * 0.22, rect.size.y * 0.66)
	bristles.size = Vector2(rect.size.x * 0.56, rect.size.y * 0.3)
	bristles.color = Color("d7c39a")
	bristles.mouse_filter = MOUSE_FILTER_IGNORE
	_brush.add_child(bristles)
	var hit := UiKit.hit(Rect2(Vector2.ZERO, rect.size))
	hit.pressed.connect(_on_brush)
	_brush.add_child(hit)


func _on_brush() -> void:
	if _brush_t >= 0.0 or transfer_t >= 0.0:
		return
	if Game.mortar == null and (_pile == null or _pile.residue().is_empty()):
		return
	_brush_t = 0.0
	Sfx.brush_sweep()
	Haptics.pulse("light")
	if _mortar_parts:
		_mortar_parts.brush(460.0)


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
		Sfx.spill()
		Haptics.pulse("medium")
		_shake_t = 0.42
		if _mortar_parts and _pile:
			var colors: Array = []
			for chip in _pile.chips():
				colors.append(chip["color"])
			_mortar_parts.burst("spill", Vector2.ZERO, {"colors": colors})
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
	var from := ZONE_CABINET.position + Vector2(43.0 + 64.0, INNER.position.y + _scroll + float(index) * SLOT_H + 76.0)
	_spawn_flight(id, from)
	_pending_lands.append({
		"id": id,
		"color": str(ings[index]["color"]),
		"left": 0.12 + 0.3 + 4.0 * 0.022,
	})
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
	if _brew:
		_brew.hide_pot()
		_brew.reset()
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
		if _brew:
			_brew.respawn(0.35)


func jump_pour(phase_name: String, t: float) -> void:
	pour = phase_name
	pour_t = t
	_place_pour_bottle()
	if _pot_pivot:
		_cauldron_angle = deg_to_rad(11.0 if phase_name != "deliver" else 4.0)
		_pot_pivot.rotation = _cauldron_angle
