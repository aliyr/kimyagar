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
const EDGE_PAD := 10.0
const JAR_W := 128.0
const JAR_H := 136.0
const BOARD_H := 30.0
const JAR_LEFT := (214.0 - JAR_W) * 0.5
const JAR_TOP := -4.0
const HEAT_NOTCHES: Array = [Vector2(968, 1014), Vector2(968, 952), Vector2(968, 890)]
const HEATS: Array = ["low", "medium", "high"]

var behind_gate := true
var pour := ""
var pour_t := 0.0
## When set, the bottle stays where jump_pour left it (reaction shots).
var hold_pour := false
var transfer_t := -1.0
var _transfer_dropped := false
var discard_t := -1.0
var _stain := false
var _stirring := false
var _heat_drawn := ""
var _spoon_angle := -0.4
var _grind_sfx := 0.0
var _bubble_t := 0.0
var _cauldron_angle := 0.0
var _mouth := Vector2.ZERO
var _mouth_r := Vector2.ZERO
var _pot_base := Vector2.ZERO
var _furnace := Rect2()
var _fire: FireField
var _furnace_fx: Control
var _stove_back: Control
var _stove_front: Control
var hold_camera := false
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
var _noroom: Label
var _dusk: ColorRect
var _vignette: ColorRect
var _vignette_mat: ShaderMaterial
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
var _flight_key := 1
var _camera: Control
var _pin: Control
var _fx_back: Control
var _transfer: SpoonTransfer
var _transfer_last: Dictionary = {}
var _transfer_draw: Control
var _spoon_art: ClassicSpoon
var _discard_scene: Dictionary = {}
var _discard_tone: Dictionary = {}
var _discard_color := Color("#3f6f8f")
var _discard_burnt := false
var _wall: Control
var _discard_fx: Control
var _splat_fired := false
var _clang_fired := false
var _thud_fired := false
var _respawned := false
var _cam_zoom := 1.0
var _cam_from := 1.0
var _cam_to := 1.0
var _cam_focus := Vector2(960.0, 540.0)
var _cam_focus_from := Vector2(960.0, 540.0)
var _cam_focus_to := Vector2(960.0, 540.0)
var _cam_t := 1.0
var _cam_dur := 0.001
var _cam_owner := ""
var _mortar_shot := false
var _cam_return := -1.0
var _bar := 0.0
var _bar_target := 0.0
var _bars_top: ColorRect
var _bars_bot: ColorRect
var _hole_back: Control
var _hole_lip: Control
var _stove := Vector4.ZERO
var _shadow_sprites: Array = []
var _customer_armed := false
var _notches: Array = []
var _fire_glow: TextureRect
var _pour_seen := ""
var _tilt_mode := "lite"
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
	UiKit.fill(self)
	UiKit.ensure()
	_layout_geometry()
	_fire = FireField.new()
	_brew = ClassicBrewSim.new(7)
	_brew_painter = ClassicBrewPainter.new()
	_transfer = SpoonTransfer.new()
	_spoon_art = ClassicSpoon.new()
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
	_stove = Vector4(_pot_base.x, _pot_base.y - 25.0, roundf((743.0 / 2.0) * ps) + 14.0, 42.0)


func _exit_tree() -> void:
	_shadow_sprites.clear()
	if _fire:
		_fire.texture = null
		_fire._img = null
	if _bg:
		_bg.material = null


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
		_tilt_mode = "off" if tilt == null else tilt.mode
		_tick_camera(dt)
		if _bg and _bg_mat:
			var dimensional := use and tilt.mode != "flat" and (absf(px) > 0.02 or absf(py) > 0.02)
			if dimensional:
				_bg.stretch_mode = TextureRect.STRETCH_SCALE
				_bg.material = _bg_mat
				_bg_rig.scale = Vector2.ONE
				_bg_mat.set_shader_parameter("ax", deg_to_rad(-py * 2.0))
				_bg_mat.set_shader_parameter("ay", deg_to_rad(px * 2.2))
				_bg_mat.set_shader_parameter("rig_scale", tilt.rig_scale())
				_bg_mat.set_shader_parameter("depth_offset", Vector2(px, py) * 18.0)
			else:
				_bg.material = null
				_bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
				var sc := 1.0
				if use:
					sc = tilt.rig_scale()
				elif tilt != null and tilt.mode == "off":
					sc = 1.0
				else:
					sc = 1.06 if live else 1.0
				_bg_rig.scale = Vector2(sc, sc)
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
		_vignette.visible = true
		if _vignette_mat:
			_vignette_mat.set_shader_parameter("pause", 1.0 if Game.is_paused() else 0.0)
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
	_camera = Control.new()
	UiKit.fill(_camera)
	_camera.mouse_filter = MOUSE_FILTER_IGNORE
	_camera.clip_contents = true
	add_child(_camera)
	_pin = Control.new()
	UiKit.fill(_pin)
	_pin.mouse_filter = MOUSE_FILTER_IGNORE
	_bg_rig = Control.new()
	UiKit.fill(_bg_rig)
	_bg_rig.pivot_offset = Vector2(960, 540)
	_bg_rig.mouse_filter = MOUSE_FILTER_IGNORE
	_camera.add_child(_bg_rig)
	# Cover, like the web ArtLayer. The perspective shader is only attached while
	# the rig is actually rotating: sampling this PNG in a canvas shader on the
	# compatibility renderer writes linear values and the wall drops to a third
	# of the web brightness.
	_bg = UiKit.sprite("background/shop_background.png", Rect2(0, 0, 1920, 1080), "cover")
	_bg_mat = ShaderMaterial.new()
	_bg_mat.shader = load("res://shaders/rig_perspective.gdshader")
	_bg_rig.scale = Vector2.ONE
	_bg_rig.add_child(_bg)

	_work = Control.new()
	_work.mouse_filter = MOUSE_FILTER_IGNORE
	UiKit.fill(_work)
	_camera.add_child(_work)
	_wall = _painter(_draw_wall)
	UiKit.fill(_wall)
	_work.add_child(_wall)
	_work.add_child(UiKit.sprite("table/work_table.png", ZONE_TABLE, "contain"))
	_shadows = _painter(_draw_shadows)
	UiKit.fill(_shadows)
	_work.add_child(_shadows)

	_hole_back = _painter(_draw_hole_back)
	UiKit.fill(_hole_back)
	_work.add_child(_hole_back)
	_stove_back = _make_stove_flames(false)
	_work.add_child(_stove_back)
	_furnace_fx = preload("res://scripts/fx/furnace_canvas.gd").new()
	_furnace_fx.setup(_fire)
	UiKit.place(_furnace_fx, _furnace)
	_furnace_fx.size = _furnace.size
	_work.add_child(_furnace_fx)

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

	_fx_back = _painter(_draw_brew_back)
	UiKit.fill(_fx_back)
	_fx_back.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	_work.add_child(_fx_back)
	_brew_painter.disc_interior = _radial_disc()
	_brew_painter.disc_liquid = _radial_disc()
	_brew_painter.disc_highlight = _radial_disc()
	_brew_painter.disc_glow = _radial_disc()
	_work.add_child(_brew_painter.disc_interior)
	_work.add_child(_brew_painter.disc_liquid)
	_work.add_child(_brew_painter.disc_highlight)
	_work.add_child(_brew_painter.disc_glow)
	_fx = _painter(_draw_brew_front)
	UiKit.fill(_fx)
	_fx.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	_work.add_child(_fx)
	_hole_lip = _painter(_draw_hole_lip)
	UiKit.fill(_hole_lip)
	_hole_lip.z_index = 4
	_work.add_child(_hole_lip)
	_stove_front = _make_stove_flames(true)
	_stove_front.z_index = 5
	_work.add_child(_stove_front)

	var pot_hit := UiKit.hit(ZONE_CAULDRON)
	pot_hit.gui_input.connect(_cauldron_input)
	_work.add_child(pot_hit)

	_bottle = UiKit.sprite("bottles/bottle_empty.png", ZONE_BOTTLE, "contain")
	_work.add_child(_bottle)
	_pour_bottle = UiKit.sprite("bottles/bottle_open.png", ZONE_BOTTLE, "contain")
	_pour_bottle.visible = false
	_work.add_child(_pour_bottle)
	_stream = _painter(_draw_stream)
	UiKit.fill(_stream)
	_work.add_child(_stream)

	_build_mortar()
	_build_cabinet()
	_transfer_draw = _painter(_draw_transfer)
	UiKit.fill(_transfer_draw)
	_transfer_draw.z_index = 40
	_work.add_child(_transfer_draw)
	_discard_fx = _painter(_draw_discard_flight)
	UiKit.fill(_discard_fx)
	_discard_fx.z_index = 35
	_work.add_child(_discard_fx)

	# Pad so the rotated sheets and the soft shadow are not clipped into a cut corner.
	var ledger_pad := 28.0
	var papers := Control.new()
	papers.position = Vector2(1296.0 - ledger_pad, 712.0 - ledger_pad)
	papers.size = Vector2(136.0 + ledger_pad * 2.0, 76.0 + ledger_pad * 2.0)
	papers.mouse_filter = MOUSE_FILTER_IGNORE
	papers.clip_contents = false
	# Web ledger is z 45, above the counter (z 20). Otherwise the counter
	# cuts the near corner of the sheets.
	papers.z_index = 48
	papers.draw.connect(_draw_ledger_sheets.bind(papers))
	_work.add_child(papers)
	papers.queue_redraw()
	var paper_hit := UiKit.hit(Rect2(1296, 712, 136, 76))
	paper_hit.pressed.connect(func() -> void: open_overlay.emit("process_history"))
	_work.add_child(paper_hit)

	_near = Control.new()
	_near.mouse_filter = MOUSE_FILTER_IGNORE
	UiKit.fill(_near)
	_camera.add_child(_near)
	_camera.add_child(_pin)
	var bucket_art := UiKit.sprite("table/bucket.png", Rect2(590, 958, 96, 112), "contain")
	_pin.add_child(bucket_art)
	var bucket := UiKit.hit(Rect2(590, 958, 96, 112))
	bucket.pressed.connect(_on_bucket)
	_pin.add_child(bucket)
	var near := _near
	_customer = UiKit.sprite("customer/customer_woman_elder.png", ZONE_CUSTOMER, "contain")
	near.add_child(_customer)
	near.add_child(UiKit.sprite("customer/counter.png", ZONE_COUNTER, "contain"))
	# goal/goal_note.png is the aged card. The pin is a child of the card so it
	# cannot drift onto the customer when the near layer parallaxes.
	var note := Control.new()
	note.position = ZONE_NOTE.position
	note.size = ZONE_NOTE.size
	note.mouse_filter = MOUSE_FILTER_IGNORE
	note.clip_contents = false
	# drop-shadow(0 10px 18px rgba(0,0,0,0.6))
	for shade_i in 3:
		var dy := 6.0 + float(shade_i) * 6.0
		var note_shade := UiKit.sprite("goal/goal_note.png", Rect2(0, dy, ZONE_NOTE.size.x, ZONE_NOTE.size.y), "cover")
		note_shade.modulate = Color(0, 0, 0, 0.22 - float(shade_i) * 0.04)
		note.add_child(note_shade)
	note.add_child(UiKit.sprite("goal/goal_note.png", Rect2(Vector2.ZERO, ZONE_NOTE.size), "cover"))
	# .note__content inset 16px 42px 14px. who is 20px, summary is 25px bold.
	_note_who = UiKit.label("", Rect2(42, 16, 346, 28), 20, Color(0.231, 0.173, 0.075, 0.7), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT)
	_note_sum = UiKit.label("", Rect2(42, 46, 346, 78), 25, Color("3b2c13"), UiKit.bold, HORIZONTAL_ALIGNMENT_RIGHT)
	_note_who.clip_text = false
	_note_sum.clip_text = false
	note.add_child(_note_who)
	note.add_child(_note_sum)
	var pin := _note_pin()
	pin.position = Vector2(ZONE_NOTE.size.x - 42.0 - 26.0, -8.0)
	pin.size = Vector2(26, 26)
	note.add_child(pin)
	near.add_child(note)
	var note_hit := UiKit.hit(ZONE_NOTE)
	note_hit.pressed.connect(func() -> void:
		Sfx.paper()
		open_overlay.emit("customer_request")
	)
	near.add_child(note_hit)

	_build_notebook()
	_build_heat()
	# layout.ts stirHint. Classic only shows this for stir, bottle, and burnt.
	_hint = UiKit.label("", Rect2(655, 396, 440, 48), 24, Color(233.0 / 255.0, 217.0 / 255.0, 180.0 / 255.0, 0.7))
	_hint.clip_text = false
	_hint.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
	_hint.add_theme_constant_override("shadow_offset_y", 2)
	_pin.add_child(_hint)

	_ghost = UiKit.sprite("cauldron/cauldron_body.png", ZONE_CAULDRON, "contain")
	_ghost.visible = false
	_ghost.z_index = 8
	_ghost.visible = false
	_camera.add_child(_ghost)

	_smoke = _painter(_draw_smoke)
	UiKit.fill(_smoke)
	_smoke.mouse_filter = MOUSE_FILTER_IGNORE
	_camera.add_child(_smoke)

	_dusk = ColorRect.new()
	_dusk.color = Color(8.0 / 255.0, 5.0 / 255.0, 3.0 / 255.0, 0.86)
	UiKit.fill(_dusk)
	_dusk.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(_dusk)

	_vignette = ColorRect.new()
	UiKit.fill(_vignette)
	_vignette.mouse_filter = MOUSE_FILTER_IGNORE
	_vignette_mat = ShaderMaterial.new()
	_vignette_mat.shader = load("res://shaders/vignette.gdshader")
	_vignette_mat.set_shader_parameter("pause", 0.0)
	_vignette.material = _vignette_mat
	_vignette.visible = true
	_build_ambience()
	add_child(_vignette)
	_bars_top = ColorRect.new()
	_bars_top.color = Color("050302")
	_bars_top.mouse_filter = MOUSE_FILTER_IGNORE
	_bars_top.size = Vector2(1920, 0)
	add_child(_bars_top)
	_bars_bot = ColorRect.new()
	_bars_bot.color = Color("050302")
	_bars_bot.mouse_filter = MOUSE_FILTER_IGNORE
	_bars_bot.size = Vector2(1920, 0)
	add_child(_bars_bot)
	_bake_shadows()


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
	_mortar_front.name = "MortarFront"
	_mortar_front.z_index = 5
	_work.add_child(_mortar_front)
	_pestle = UiKit.sprite("mortar/v3/pestle_1.png", Rect2(), "contain")
	_pestle.visible = true
	_pestle.z_index = 2
	_work.add_child(_pestle)
	_mortar_over = _painter(_draw_mortar_fx)
	UiKit.fill(_mortar_over)
	_mortar_over.z_index = 6
	_work.add_child(_mortar_over)
	_build_brush()
	# layout.ts mortarLabel, under the bowl. Grind copy lives here, not on the pot hint.
	_grind_label = UiKit.label("", Rect2(252, 787, 326, 46), 22, Color(233.0 / 255.0, 217.0 / 255.0, 180.0 / 255.0, 0.62), UiKit.bold)
	_grind_label.clip_text = false
	_work.add_child(_grind_label)
	_noroom = UiKit.label("جا ندارد!", Rect2(ZONE_MORTAR.position.x, ZONE_MORTAR.position.y - 36, ZONE_MORTAR.size.x, 32), 22, Color("ffe3c4"), UiKit.bold)
	_noroom.visible = false
	_work.add_child(_noroom)
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
	var empty_y := EDGE_PAD + SLOT_H * ings.size()
	var dust := ColorRect.new()
	dust.position = Vector2(40, empty_y + 90)
	dust.size = Vector2(130, 18)
	dust.color = Color(0.4, 0.32, 0.22, 0.35)
	_cabinet_strip.add_child(dust)


func _add_jar(ing: Dictionary, index: int) -> void:
	# SideCabinetClassic: row at EDGE_PAD, board fill across the opening, jar seated
	# on the board, plaque overlapping the jar (left/right 8, bottom -4, 28px).
	var row_y := EDGE_PAD + SLOT_H * float(index)
	var board := UiKit.sprite("shelf/shelf_board.png", Rect2(-4, row_y + SLOT_H - BOARD_H, INNER.size.x + 8.0, BOARD_H), "fill")
	_cabinet_strip.add_child(board)
	var jar := UiKit.sprite("cabinet/jar_%s.png" % str(ing["id"]), Rect2(JAR_LEFT, row_y + JAR_TOP, JAR_W, JAR_H), "contain")
	_cabinet_strip.add_child(jar)
	var plaque := Panel.new()
	plaque.position = Vector2(JAR_LEFT + 8.0, row_y + JAR_TOP + JAR_H - 24.0)
	plaque.size = Vector2(JAR_W - 16.0, 28)
	plaque.mouse_filter = MOUSE_FILTER_IGNORE
	var plate := StyleBoxFlat.new()
	plate.bg_color = Color("e4d0a8")
	plate.set_corner_radius_all(5)
	plate.shadow_color = Color(0, 0, 0, 0.55)
	plate.shadow_size = 4
	plate.shadow_offset = Vector2(0, 3)
	plaque.add_theme_stylebox_override("panel", plate)
	_cabinet_strip.add_child(plaque)
	var name := UiKit.label(str(ing["nameFa"]), Rect2(0, 0, JAR_W - 16.0, 28), 17, Color("33240f"))
	plaque.add_child(name)


func _build_notebook() -> void:
	var book := Control.new()
	book.position = Vector2(1740, 900)
	book.size = Vector2(150, 165)
	book.mouse_filter = MOUSE_FILTER_IGNORE
	book.draw.connect(_draw_notebook.bind(book))
	_pin.add_child(book)
	book.queue_redraw()
	var title := UiKit.label(Content.UI["notebook"], Rect2(1752, 968, 120, 36), 22, Color(0.91, 0.85, 0.71, 0.9), UiKit.medium)
	title.rotation_degrees = -3.0
	_pin.add_child(title)
	var hit := UiKit.hit(Rect2(1740, 900, 150, 165))
	hit.pressed.connect(func() -> void:
		Sfx.paper()
		open_overlay.emit("notebook")
	)
	_pin.add_child(hit)


func _build_heat() -> void:
	for i in 3:
		var pos: Vector2 = HEAT_NOTCHES[i]
		var heat_name: String = HEATS[i]
		var notch := Control.new()
		notch.position = pos
		notch.size = Vector2(104, 60)
		notch.mouse_filter = MOUSE_FILTER_STOP
		notch.set_meta("heat", heat_name)
		notch.clip_contents = false
		notch.draw.connect(_draw_notch.bind(notch))
		notch.gui_input.connect(_on_notch_input.bind(heat_name))
		_pin.add_child(notch)
		_notches.append(notch)
		notch.queue_redraw()


func _on_notch_input(ev: InputEvent, heat_name: String) -> void:
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		Game.set_heat(heat_name)
		Sfx.fire_whoosh()
		Haptics.pulse("light")
		_sync_notches()


func _sync_notches() -> void:
	var heat := str(Game.brew.get("currentHeat", "medium"))
	if heat == _heat_drawn:
		return
	_heat_drawn = heat
	for item in _notches:
		var notch := item as Control
		notch.queue_redraw()


func _tick_fire(dt: float) -> void:
	var heat := str(Game.brew.get("currentHeat", "medium"))
	var level: float = float({"low": 0.35, "medium": 0.7, "high": 1.0}.get(heat, 0.7))
	_fire.set_level(level, discard_t < 0.0)
	_fire.update(dt)
	if _furnace_fx and _furnace_fx.has_method("tick"):
		_furnace_fx.tick(dt)
	if _stove_back:
		_stove_back.queue_redraw()
	if _stove_front:
		_stove_front.queue_redraw()
	if _fire_glow:
		var glow := 0.16 if heat == "low" else (0.42 if heat == "high" else 0.28)
		_fire_glow.modulate.a = glow
	_sync_notches()


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
	var changed := _last_customer != ""
	_last_customer = rel
	if _customer:
		_customer.texture = UiKit.tex(rel)
	if changed and _tilt_mode != "off" and pour == "":
		_set_camera(_customer_focus(), 1.16, 1.0, true, "enter")
		_cam_return = 1.7


func _sync_note() -> void:
	var c: Dictionary = Game.current_customer()
	if _note_who:
		_note_who.text = str(c.get("nameFa", ""))
	if _note_sum:
		_note_sum.text = str(c.get("summaryFa", ""))


func _sync_hint() -> void:
	if _noroom:
		_noroom.visible = _shake_t > 0.0
	if _hint == null:
		return
	var entries: Array = Game.brew["entries"]
	var filled := not entries.is_empty()
	var bottled := bool(Game.brew["bottled"])
	var burnt := Game.overprocessed() and not bottled
	var stir_count := int(Game.brew.get("stirCount", 0))
	var discarding := discard_t >= 0.0
	var transferring := transfer_t >= 0.0
	var pouring := pour != ""
	if burnt and not discarding:
		_hint.text = Content.UI["burntHint"]
	elif filled and not bottled and stir_count == 0 and not discarding:
		_hint.text = Content.UI["stirHint"]
	elif Game.all_ready() and not bottled and not pouring and not transferring and not discarding and stir_count > 0:
		_hint.text = Content.UI["tapToBottleHint"]
	else:
		_hint.text = ""
	if _grind_label == null:
		return
	if Game.mortar != null and not transferring:
		var grinding := bool(Game.mortar.get("grinding", false))
		var gstate = Game.mortar.get("grindState")
		if gstate == null:
			_grind_label.text = Content.UI["grindingHint"]
		elif grinding:
			_grind_label.text = str(Content.GRIND.get(gstate, ""))
		else:
			_grind_label.text = "%s — %s" % [str(Content.GRIND.get(gstate, "")), Content.UI["tapMortarHint"]]
	else:
		_grind_label.text = ""


func _sync_liquid() -> void:
	var parts_busy := _mortar_parts != null and _mortar_parts.busy()
	var mortar_on := Game.mortar != null or transfer_t >= 0.0 or not _flights.is_empty() or parts_busy
	if _pile != null and not _pile.residue().is_empty():
		mortar_on = true
	if _mortar_fx and mortar_on:
		_mortar_fx.queue_redraw()
	if _mortar_over and (parts_busy or transfer_t >= 0.0):
		_mortar_over.queue_redraw()
	if _stream and pour != "":
		_stream.queue_redraw()
	if _smoke and _haze > 0.01:
		_smoke.queue_redraw()
	var entries: Array = Game.brew["entries"]
	var brewing := (not entries.is_empty()) or pour != "" or _stirring or discard_t >= 0.0
	if brewing:
		if _fx:
			_fx.queue_redraw()
		if _fx_back:
			_fx_back.queue_redraw()
	_place_pestle()
	if _bottle:
		_bottle.visible = pour == "" and discard_t < 0.0


func _painter(fn: Callable) -> Control:
	var n: Control = preload("res://scripts/view/draw_host.gd").new()
	n.mouse_filter = MOUSE_FILTER_IGNORE
	n.paint = fn
	return n


func _draw_shadows(c: Control) -> void:
	for sprite in _shadow_sprites:
		var tex: Texture2D = sprite["tex"]
		var at: Vector2 = sprite["at"]
		c.draw_texture(tex, at)


func _bake_shadows() -> void:
	_shadow_sprites = [
		_shadow_sprite(415.0, 763.0, 110.0, 22.0, 0.6),
		_shadow_sprite(1212.5, 772.0, 62.5, 12.0, 0.5),
		_shadow_sprite(1364.0, 782.0, 74.8, 12.0, 0.4),
		_shadow_sprite(1664.6, 1076.0, 285.6, 26.0, 0.55),
	]
	if _shadows:
		_shadows.queue_redraw()


func _shadow_sprite(cx: float, cy: float, rx: float, ry: float, strength: float) -> Dictionary:
	var pad := 18
	var w := int(ceil(rx * 2.0 + float(pad) * 2.0))
	var h := int(ceil(ry * 2.0 + float(pad) * 2.0))
	var img := Image.create(maxi(1, w), maxi(1, h), false, Image.FORMAT_RGBA8)
	var ocx := float(w) * 0.5
	var ocy := float(h) * 0.5
	for y in h:
		for x in w:
			var nx := (float(x) + 0.5 - ocx) / maxf(rx, 1.0)
			var ny := (float(y) + 0.5 - ocy) / maxf(ry, 1.0)
			var d := sqrt(nx * nx + ny * ny)
			var a := 0.0
			if d < 0.45:
				a = 0.85
			elif d < 0.78:
				a = lerpf(0.85, 0.45, (d - 0.45) / 0.33)
			elif d < 1.15:
				a = lerpf(0.45, 0.0, (d - 0.78) / 0.37)
			img.set_pixel(x, y, Color(10.0 / 255.0, 6.0 / 255.0, 2.0 / 255.0, a * strength))
	_blur_image(img, 1)
	_blur_image(img, 1)
	_blur_image(img, 1)
	var tex := ImageTexture.create_from_image(img)
	return {"tex": tex, "at": Vector2(cx - ocx, cy - ocy)}


func _blur_image(img: Image, radius: int) -> void:
	var w := img.get_width()
	var h := img.get_height()
	var copy := img.duplicate()
	for y in h:
		for x in w:
			var acc := Color(0, 0, 0, 0)
			var n := 0
			for dy in range(-radius, radius + 1):
				var yy := clampi(y + dy, 0, h - 1)
				for dx in range(-radius, radius + 1):
					var xx := clampi(x + dx, 0, w - 1)
					acc += copy.get_pixel(xx, yy)
					n += 1
			img.set_pixel(x, y, acc / float(n))


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
		var box := Vector2(float(puff["size"]) * 0.45, float(puff["size"]))
		var origin := Vector2(_mouth.x + float(puff["dx"]) - float(puff["size"]) * 0.22, _mouth.y - float(puff["size"]) * 0.85)
		var pivot := origin + Vector2(box.x * 0.5, box.y * 0.6)
		var shift := Vector2(drift, rise)
		var col := Color(90.0 / 255.0, 84.0 / 255.0, 82.0 / 255.0, alpha * _haze)
		var blob := PackedVector2Array([
			Vector2(0.46, 0.0), Vector2(0.62, 0.18), Vector2(0.78, 0.08), Vector2(0.70, 0.36),
			Vector2(0.92, 0.48), Vector2(0.68, 0.58), Vector2(0.80, 0.88), Vector2(0.50, 0.72),
			Vector2(0.22, 0.96), Vector2(0.34, 0.60), Vector2(0.08, 0.42), Vector2(0.32, 0.28), Vector2(0.18, 0.12),
		])
		for pass_i in 4:
			var spread := float(pass_i) * 3.0
			var pts := PackedVector2Array()
			for p in blob:
				var pt := origin + Vector2(p.x * box.x, p.y * box.y)
				pts.append(pivot + (pt - pivot) * scale + shift + Vector2(spread, spread * 0.4))
			var fade := col
			fade.a *= 0.45 if pass_i > 0 else 1.0
			c.draw_colored_polygon(pts, fade)


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


func _flight_rand(seed: float) -> float:
	var x := sin(seed * 127.1) * 43758.5453
	return x - floor(x)


func _spawn_flight(ingredient_id: String, from: Vector2) -> void:
	var kind := MortarPile.kind_for(ingredient_id)
	var sprites := maxi(1, MortarPile.sprite_count(kind))
	var key := _flight_key
	_flight_key += 1
	var count := 4 + int(floor(_flight_rand(float(key + 1)) * 4.0))
	var target := Vector2(
		MortarPile.ZONE_X + (MortarPile.FLOOR_CX / 100.0) * MortarPile.ZONE_W,
		MortarPile.ZONE_Y + ((MortarPile.FLOOR_CY - 2.5) / 100.0) * MortarPile.ZONE_H
	)
	var dist := from.distance_to(target)
	var control := Vector2(
		from.x + (target.x - from.x) * 0.3,
		minf(from.y, target.y) - clampf(0.28 * dist, 70.0, 150.0)
	)
	for i in count:
		var fi := float(i)
		var fk := float(key)
		_flights.append({
			"t": -0.12 - fi * 0.022,
			"from": from,
			"to": target,
			"control": control,
			"kind": kind,
			"sprite": 1 + int(floor(_flight_rand(fk * 23.0 + fi) * float(sprites))) % sprites,
			"sx": _flight_rand(fk * 29.0 + fi) * 14.0,
			"sy": (_flight_rand(fk * 31.0 + fi) - 0.5) * 8.0,
			"dx": (_flight_rand(fk * 7.0 + fi) - 0.5) * 34.0,
			"dy": (_flight_rand(fk * 11.0 + fi) - 0.5) * 10.0,
			"rot0": _flight_rand(fk * 13.0 + fi) * TAU,
			"spin": (_flight_rand(fk * 17.0 + fi) - 0.5) * deg_to_rad(520.0),
			"size": 40.0 * (0.75 + _flight_rand(fk * 19.0 + fi) * 0.5),
		})
	_pending_lands.append({
		"id": ingredient_id,
		"color": "",
		"left": 0.12 + 0.3 + float(count - 1) * 0.022,
		"count": count,
	})


func _draw_liquid(_c: Control) -> void:
	pass


func _draw_spoon(_c: Control) -> void:
	pass


func _brew_drawable() -> bool:
	if _brew == null or _brew_painter == null:
		return false
	if not _brew.pot_visible():
		return false
	if discard_t >= 0.0:
		return false
	if bool(Game.brew["bottled"]) and pour == "":
		return false
	return true


func _draw_brew_back(c: Control) -> void:
	if not _brew_drawable():
		if _brew_painter:
			_brew_painter.hide_discs()
		return
	_brew_painter.draw_back(c, _brew, _mouth, _mouth_r.x, _mouth_r.y)


func _draw_brew_front(c: Control) -> void:
	if not _brew_drawable():
		return
	_brew_painter.draw_front(c, _brew, _mouth, _mouth_r.x, _mouth_r.y)


func _draw_brew(c: Control) -> void:
	_draw_brew_back(c)
	_draw_brew_front(c)


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
		var k := clampf(ft / 0.3, 0.0, 1.0)
		var e := _ease_in_out(k)
		var u := 1.0 - e
		var from: Vector2 = flight["from"]
		var to: Vector2 = flight["to"]
		var control: Vector2 = flight["control"]
		var at := u * u * (from + Vector2(float(flight["sx"]), float(flight["sy"]))) + 2.0 * u * e * control + e * e * (to + Vector2(float(flight["dx"]), float(flight["dy"])))
		var tex := UiKit.tex("mortar/v3/pieces/%s_%d.png" % [str(flight["kind"]), int(flight["sprite"])])
		if tex == null:
			continue
		var px := float(flight["size"]) * (1.0 - 0.4 * e)
		var alpha := 0.0 if k >= 1.0 else (1.0 if k <= 0.88 else (1.0 - k) / 0.12)
		c.draw_set_transform(at, float(flight["rot0"]) + float(flight["spin"]) * e, Vector2.ONE)
		c.draw_texture_rect(tex, Rect2(-px * 0.5, -px * 0.5, px, px), false, Color(1, 1, 1, alpha))
		c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	if pour != "stream":
		return
	var col := LiquidColor.mix(Game.brew["entries"], str(Game.brew["currentHeat"]), _clock)
	var rim := _tilted_rim()
	var mouth := _pour_bottle.position + Vector2(_pour_bottle.size.x * 0.5, 10.0)
	var mid := (rim + mouth) * 0.5
	var c1 := Vector2(rim.x + 22.0, rim.y + 4.0)
	var c2 := mid * 2.0 - c1
	var pts := PackedVector2Array()
	for i in 25:
		var t := float(i) / 24.0
		pts.append(_stream_point(rim, c1, mid, c2, mouth, t))
	# classic-stations.css: glow 26px, core 14px, sheen 3px.
	var glow := Color(col.r, col.g, col.b, 0.35)
	var sheen := Color(1.0, 1.0, 1.0, 0.55)
	if pts.size() >= 2:
		c.draw_polyline(pts, glow, 26.0, true)
		c.draw_polyline(pts, col, 14.0, true)
		c.draw_polyline(pts, sheen, 3.0, true)


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
		var rot := deg_to_rad(float(chip["rot"]))
		var nick := int(chip.get("nick", 0))
		var cracked := bool(chip.get("cracked", false)) or int(chip.get("generation", 0)) > 0
		if cracked:
			var clip := MortarPile.clip_polygon(nick)
			var poly := PackedVector2Array()
			var uvs := PackedVector2Array()
			for p in clip:
				uvs.append(p)
				var local := Vector2((p.x - 0.5) * w, (p.y - 0.5) * h) * sc
				poly.append(center + Vector2(cos(rot) * local.x - sin(rot) * local.y, sin(rot) * local.x + cos(rot) * local.y))
			var cols := PackedColorArray()
			cols.resize(poly.size())
			cols.fill(Color.WHITE)
			c.draw_polygon(poly, cols, uvs, tex)
			var tinted := PackedColorArray()
			tinted.resize(poly.size())
			var tint: Color = chip["color"]
			tinted.fill(Color(tint.r, tint.g, tint.b, 0.22))
			c.draw_polygon(poly, tinted)
		else:
			c.draw_set_transform(center, rot, Vector2(sc, sc))
			c.draw_texture_rect(tex, Rect2(-w * 0.5, -h * 0.5, w, h), false)
			var tint2: Color = chip["color"]
			c.draw_rect(Rect2(-w * 0.5, -h * 0.5, w, h), Color(tint2.r, tint2.g, tint2.b, 0.22), true)
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
	_pestle.custom_minimum_size = Vector2.ZERO
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
	var index := int(floor((local.y - _scroll - EDGE_PAD) / SLOT_H))
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
	if hold_pour:
		_place_pour_bottle()
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
	_sync_pour_camera()


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
	_transfer.begin(_mouth, _mouth_r)
	if _cam_owner == "mortar":
		_mortar_shot = false
		_set_camera(Vector2(960, 540), 1.0, 0.45, false, "")
	Sfx.scoop()
	Haptics.pulse("light")


func _tick_transfer(dt: float) -> void:
	if transfer_t < 0.0 or _transfer == null or not _transfer.active():
		transfer_t = -1.0
		return
	var pose: Dictionary = _transfer.update(dt, _pile)
	_transfer_last = pose
	transfer_t = _transfer.t
	var trails := int(pose.get("trail", 0))
	if trails > 0 and _mortar_parts:
		var col: Color = pose.get("color", Color("#8a7a52"))
		for _i in trails:
			_mortar_parts.burst("trail", Vector2(float(pose["x"]), float(pose["y"]) + 10.0), {"color": "#" + col.to_html(false)})
	if bool(pose.get("landed", false)) and not _transfer_dropped:
		_transfer_dropped = true
		_held_chips = _transfer.chips.duplicate()
		Game.add_mortar_to_cauldron()
		Sfx.splash()
		Haptics.pulse("medium")
		if _mortar_parts:
			var col2: Color = pose.get("color", Color("#8a7a52"))
			for i in 3:
				_mortar_parts.burst("ripple", Vector2(_transfer.land.x + float(i - 1) * 16.0, _transfer.land.y), {"color": "#" + col2.to_html(false)})
	if not bool(pose.get("alive", false)):
		transfer_t = -1.0
	if _transfer_draw:
		_transfer_draw.queue_redraw()


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
	_tick_grind_camera(grinding, dt)
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
	return maxf(0.0, EDGE_PAD * 2.0 + SLOT_H * float(n) - INNER.size.y)


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
	var index := int(floor((y - EDGE_PAD) / SLOT_H))
	var ings: Array = Game.defs["ingredients"]
	if index < 0 or index >= ings.size():
		return
	if Time.get_ticks_msec() - int(_gesture.get("t", 0)) >= 450 and not bool(_gesture.get("scroll", false)):
		Game.open_overlay_action("ingredient_detail", ings[index]["id"])
		return
	var id := str(ings[index]["id"])
	var row_y := EDGE_PAD + float(index) * SLOT_H
	var from := ZONE_CABINET.position + INNER.position + Vector2(JAR_LEFT + JAR_W * 0.78, _scroll + row_y + JAR_TOP + JAR_H * 0.2)
	_spawn_flight(id, from)
	if not _pending_lands.is_empty():
		_pending_lands[_pending_lands.size() - 1]["color"] = str(ings[index]["color"])
	Haptics.pulse("light")


func _on_bucket() -> void:
	if discard_t >= 0.0:
		return
	if (Game.brew["entries"] as Array).is_empty() and Game.mortar == null and Game.result == null:
		return
	begin_discard()


func begin_discard() -> void:
	_discard_color = LiquidColor.mix(Game.brew["entries"], str(Game.brew["currentHeat"]), _clock)
	_discard_burnt = Game.overprocessed()
	Sfx.cauldron_throw()
	Haptics.pulse("heavy")
	Game.reset_brew()
	if _brew:
		_brew.hide_pot()
		_brew.reset()
	pour = ""
	transfer_t = -1.0
	discard_t = 0.0
	_stain = false
	_splat_fired = false
	_clang_fired = false
	_thud_fired = false
	_respawned = false
	_discard_scene = DiscardMotion.build_scene(int(_clock * 1000.0) + 17)
	_discard_tone = DiscardMotion.tones_for(_discard_color, _discard_burnt)
	if _ghost:
		_ghost.visible = false
	if _brew_painter:
		_brew_painter.hide_discs()


func _tick_discard(dt: float) -> void:
	if discard_t < 0.0:
		return
	discard_t += dt
	if not _splat_fired and discard_t >= DiscardMotion.GOBS_HIT:
		_splat_fired = true
		_stain = true
		Sfx.cauldron_splat()
	if not _clang_fired and discard_t >= DiscardMotion.POT_HIT:
		_clang_fired = true
		Sfx.cauldron_clang()
		_shake_t = 0.18
	if not _thud_fired and discard_t >= DiscardMotion.THUD_AT:
		_thud_fired = true
		Sfx.cauldron_land(0.55)
	if not _respawned and discard_t >= DiscardMotion.RESPAWN_AT:
		_respawned = true
		if _brew:
			_brew.respawn(0.0)
	if discard_t >= DiscardMotion.END_AT:
		discard_t = -1.0
		_stain = false


func jump_pour(phase_name: String, t: float) -> void:
	pour = phase_name
	pour_t = t
	_place_pour_bottle()
	_sync_pour_camera()
	if _pot_pivot:
		_cauldron_angle = deg_to_rad(11.0 if phase_name != "deliver" else 4.0)
		_pot_pivot.rotation = _cauldron_angle


func jump_pot_closeup() -> void:
	_set_camera(Vector2(_mouth.x, _mouth.y + 20.0), 1.45, 0.01, false, "pot")
	_cam_zoom = _cam_to
	_cam_focus = _cam_focus_to
	_cam_t = _cam_dur
	_apply_camera()


func _radial_disc() -> ColorRect:
	var node := ColorRect.new()
	node.mouse_filter = MOUSE_FILTER_IGNORE
	node.visible = false
	var mat := ShaderMaterial.new()
	mat.shader = load("res://shaders/radial_disc.gdshader")
	node.material = mat
	return node


func _ease_in_out(u: float) -> float:
	var t := clampf(u, 0.0, 1.0)
	if t < 0.5:
		return 2.0 * t * t
	return 1.0 - pow(-2.0 * t + 2.0, 2.0) / 2.0


func _stream_point(a: Vector2, c1: Vector2, mid: Vector2, c2: Vector2, b: Vector2, t: float) -> Vector2:
	if t <= 0.5:
		var u := t * 2.0
		var k := 1.0 - u
		return a * (k * k) + c1 * (2.0 * k * u) + mid * (u * u)
	var u2 := (t - 0.5) * 2.0
	var k2 := 1.0 - u2
	return mid * (k2 * k2) + c2 * (2.0 * k2 * u2) + b * (u2 * u2)


func _customer_focus() -> Vector2:
	return Vector2(ZONE_CUSTOMER.position.x + ZONE_CUSTOMER.size.x * 0.42, ZONE_CUSTOMER.position.y + ZONE_CUSTOMER.size.y * 0.55)


func _pour_focus() -> Vector2:
	return Vector2(_mouth.x + 90.0, _mouth.y + 70.0)


func _deliver_focus() -> Vector2:
	return Vector2(ZONE_COUNTER.position.x + ZONE_COUNTER.size.x * 0.28, ZONE_COUNTER.position.y + 40.0)


func _mortar_focus() -> Vector2:
	return Vector2(ZONE_MORTAR.position.x + ZONE_MORTAR.size.x * 0.5, ZONE_MORTAR.position.y + ZONE_MORTAR.size.y * 0.45)


func _set_camera(focus: Vector2, zoom: float, ms: float, letterbox: bool, owner: String) -> void:
	if hold_camera:
		return
	if _tilt_mode == "off" and owner != "pot":
		return
	_cam_owner = owner
	_cam_from = _cam_zoom
	_cam_to = zoom
	_cam_focus_from = _cam_focus
	_cam_focus_to = focus
	_cam_dur = maxf(ms, 0.001)
	_cam_t = 0.0
	_bar_target = 1.0 if letterbox else 0.0
	_cam_return = -1.0


func _apply_camera() -> void:
	if _camera == null:
		return
	_camera.pivot_offset = _cam_focus
	_camera.scale = Vector2(_cam_zoom, _cam_zoom)
	var h := 72.0 * _bar
	if _bars_top:
		_bars_top.size = Vector2(1920, h)
		_bars_top.position = Vector2.ZERO
	if _bars_bot:
		_bars_bot.size = Vector2(1920, h)
		_bars_bot.position = Vector2(0, 1080.0 - h)


func _tick_camera(dt: float) -> void:
	if _cam_return > 0.0 and _cam_owner == "enter":
		_cam_return -= dt
		if _cam_return <= 0.0 and pour == "":
			_set_camera(Vector2(960, 540), 1.0, 0.9, false, "")
	if _cam_t < _cam_dur:
		_cam_t += dt
		var u := _ease_in_out(clampf(_cam_t / _cam_dur, 0.0, 1.0))
		_cam_zoom = lerpf(_cam_from, _cam_to, u)
		_cam_focus = _cam_focus_from.lerp(_cam_focus_to, u)
	_bar = move_toward(_bar, _bar_target, dt / 0.55)
	_apply_camera()


func _tick_grind_camera(grinding: bool, dt: float) -> void:
	if _tilt_mode == "off":
		return
	if grinding:
		_cam_return = -1.0
		if _cam_owner == "" or _cam_owner == "mortar":
			if not _mortar_shot:
				_mortar_shot = true
				_set_camera(_mortar_focus(), 1.3, 0.65, false, "mortar")
		return
	if not _mortar_shot:
		return
	if transfer_t >= 0.0:
		_mortar_shot = false
		_set_camera(Vector2(960, 540), 1.0, 0.45, false, "")
		return
	if _cam_return < 0.0:
		_cam_return = 0.5
		return
	_cam_return -= dt
	if _cam_return <= 0.0:
		_mortar_shot = false
		_set_camera(Vector2(960, 540), 1.0, 0.65, false, "")


func _sync_pour_camera() -> void:
	if pour == _pour_seen:
		return
	_pour_seen = pour
	if _tilt_mode == "off":
		return
	if pour == "tilt" or pour == "stream":
		_mortar_shot = false
		_set_camera(_pour_focus(), 1.22, 0.48, true, "pour")
	elif pour == "deliver":
		_set_camera(_deliver_focus(), 1.14, 0.68, true, "deliver")
	elif pour == "" and (_cam_owner == "pour" or _cam_owner == "deliver"):
		_set_camera(Vector2(960, 540), 1.0, 0.7, false, "")


func _draw_transfer(c: Control) -> void:
	if _transfer == null or not _transfer.active() or _spoon_art == null:
		return
	var pose := _transfer_pose()
	if pose.is_empty():
		return
	_spoon_art.draw_free(c, Vector2(float(pose["x"]), float(pose["y"])), deg_to_rad(float(pose["rot"])), 250.0, float(pose["opacity"]))
	if float(pose["blob"]) > 0.05:
		for chip in pose.get("chips", []):
			_draw_mini_chip(c, chip, Vector2(float(pose["x"]) + float(chip.get("sx", 0.0)), float(pose["y"]) + float(chip.get("sy", 0.0)) - 8.0), float(chip.get("dw", 16.0)), float(chip.get("dh", 16.0)), 1.0)
	for item in pose.get("falling", []):
		var eased := float(item.get("eased", 0.0))
		var at := Vector2(_transfer.end.x + float(item["ox"]), _transfer.end.y + float(item["oy"])).lerp(Vector2(_transfer.land.x + float(item["ox"]) * 0.3, _transfer.land.y), eased)
		_draw_mini_chip(c, item["chip"], at, float(item["w"]), float(item["h"]), float(item.get("opacity", 1.0)))


func _transfer_pose() -> Dictionary:
	return {
		"x": _transfer_last.get("x", _transfer.start.x),
		"y": _transfer_last.get("y", _transfer.start.y),
		"rot": _transfer_last.get("rot", 0.0),
		"opacity": _transfer_last.get("opacity", 1.0),
		"blob": _transfer_last.get("blob", 0.0),
		"chips": _transfer_last.get("chips", []),
		"falling": _transfer_last.get("falling", []),
	}


func _draw_mini_chip(c: Control, chip: Dictionary, at: Vector2, w: float, h: float, alpha: float) -> void:
	if alpha <= 0.02:
		return
	if str(chip.get("kind", "")) == "dust":
		var col: Color = chip.get("color", Color("#8a7a52"))
		c.draw_circle(at, maxf(w, h) * 0.35, Color(col.r, col.g, col.b, 0.9 * alpha))
		return
	var tex := UiKit.tex("mortar/v3/pieces/%s_%d.png" % [str(chip.get("kind", "petal")), int(chip.get("sprite", 1))])
	if tex == null:
		return
	c.draw_set_transform(at, deg_to_rad(float(chip.get("rot", 0.0))), Vector2.ONE)
	c.draw_texture_rect(tex, Rect2(-w * 0.5, -h * 0.5, w, h), false, Color(1, 1, 1, alpha))
	c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _draw_wall(c: Control) -> void:
	if discard_t < 0.0 or _discard_scene.is_empty():
		return
	DiscardMotion.draw_wall(c, discard_t, _discard_scene, _discard_tone)


func _draw_discard_flight(c: Control) -> void:
	if discard_t < 0.0 or _body == null:
		return
	DiscardMotion.draw_flight(c, _body.texture, discard_t, _discard_color, _discard_scene)


func _draw_hole_back(c: Control) -> void:
	_draw_stove(c, false)


func _draw_hole_lip(c: Control) -> void:
	_draw_stove(c, true)


func _radial_dot(rect: Rect2, tint: Color) -> TextureRect:
	var g := TextureRect.new()
	g.texture = UiKit.radial_texture()
	g.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	g.stretch_mode = TextureRect.STRETCH_SCALE
	g.modulate = tint
	g.mouse_filter = MOUSE_FILTER_IGNORE
	UiKit.place(g, rect)
	g.size = rect.size
	return g


func _build_ambience() -> void:
	# .amb-fire — screen-like warm pool over the stove. Additive on a dark room.
	_fire_glow = _radial_dot(Rect2(500, 560, 780, 740), Color(1.0, 0.55, 0.18, 0.28))
	var add := CanvasItemMaterial.new()
	add.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	_fire_glow.material = add
	_fire_glow.z_index = 2
	_camera.add_child(_fire_glow)
	# .amb-rays sit under the cabinet and mortar. A solid additive shaft on
	# top of _work washed the jars; the web shafts are a soft edge-fade and
	# the furniture covers them.
	var rays := Control.new()
	rays.mouse_filter = MOUSE_FILTER_IGNORE
	# Same z as the background rig, which is already behind _work. A positive
	# z_index here sorts the shafts above the cabinet and mortar.
	rays.z_index = 0
	UiKit.fill(rays)
	_bg_rig.add_child(rays)
	var shaft_tex := _shaft_texture()
	var shafts := [
		{"x": -60.0, "w": 300.0, "rot": 19.0, "a": 0.9},
		{"x": 210.0, "w": 190.0, "rot": 21.0, "a": 0.6},
		{"x": 470.0, "w": 240.0, "rot": 17.0, "a": 0.45},
	]
	for shaft in shafts:
		var s := TextureRect.new()
		s.texture = shaft_tex
		s.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		s.stretch_mode = TextureRect.STRETCH_SCALE
		s.mouse_filter = MOUSE_FILTER_IGNORE
		s.position = Vector2(float(shaft["x"]), -200)
		s.size = Vector2(float(shaft["w"]), 1600)
		s.pivot_offset = Vector2(float(shaft["w"]) * 0.5, 0)
		s.rotation_degrees = float(shaft["rot"])
		s.modulate = Color(1, 1, 1, float(shaft["a"]))
		rays.add_child(s)


func _shaft_texture() -> Texture2D:
	# classic-ambience.css .amb-rays__shaft — horizontal fade, peak alpha 0.13.
	var w := 128
	var img := Image.create(w, 4, false, Image.FORMAT_RGBA8)
	var c0 := Color(1.0, 214.0 / 255.0, 150.0 / 255.0, 0.0)
	var c1 := Color(1.0, 222.0 / 255.0, 166.0 / 255.0, 0.08)
	var c2 := Color(1.0, 234.0 / 255.0, 190.0 / 255.0, 0.13)
	for x in w:
		var t := float(x) / float(w - 1)
		var col := c0
		if t < 0.42:
			col = c0.lerp(c1, t / 0.42)
		elif t < 0.52:
			col = c1.lerp(c2, (t - 0.42) / 0.10)
		else:
			col = c2.lerp(c0, (t - 0.52) / 0.48)
		# Straight alpha on this renderer is composited like a premultiplied
		# source, which turned the pale shaft into a solid wedge. Store rgb*a.
		col = Color(col.r * col.a, col.g * col.a, col.b * col.a, col.a)
		for y in 4:
			img.set_pixel(x, y, col)
	return ImageTexture.create_from_image(img)


func _draw_notch(n: Control) -> void:
	var on := str(Game.brew.get("currentHeat", "medium")) == str(n.get_meta("heat"))
	# .notch::before — brass rail under the lever.
	n.draw_rect(Rect2(14, 26, 76, 10), Color(0.24, 0.16, 0.06, 0.85))
	n.draw_rect(Rect2(16, 26, 72, 5), Color(0.54, 0.38, 0.14, 1.0))
	var ang := 0.0 if on else deg_to_rad(-28.0)
	n.draw_set_transform(Vector2(52, 44), ang, Vector2.ONE)
	if on:
		n.draw_circle(Vector2(0, -22), 20, Color(1.0, 0.75, 0.35, 0.55))
	var lever := _lever_texture(on)
	n.draw_texture_rect(lever, Rect2(-13, -42, 26, 42), false)
	n.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	var text := str(Content.HEAT.get(str(n.get_meta("heat")), ""))
	var font: Font = UiKit.medium if UiKit.medium != null else UiKit.regular
	if font == null or text == "":
		return
	# .notch__label sits at the bottom of the 60px cell, beside the lever.
	var col_text := Color("f7e5b6") if on else Color(233.0 / 255.0, 217.0 / 255.0, 180.0 / 255.0, 0.55)
	var box := 128.0
	var origin := Vector2(-12.0, 56.0)
	n.draw_string(font, origin + Vector2(0, 2), text, HORIZONTAL_ALIGNMENT_CENTER, box, 21, Color(0, 0, 0, 0.75), 0, TextServer.DIRECTION_RTL)
	if on:
		n.draw_string(font, origin + Vector2(0, -1), text, HORIZONTAL_ALIGNMENT_CENTER, box, 21, Color(1.0, 0.67, 0.27, 0.55), 0, TextServer.DIRECTION_RTL)
	n.draw_string(font, origin, text, HORIZONTAL_ALIGNMENT_CENTER, box, 21, col_text, 0, TextServer.DIRECTION_RTL)


func _draw_notebook(n: Control) -> void:
	n.draw_set_transform(Vector2(78, 86), deg_to_rad(-3.0), Vector2.ONE)
	n.draw_rect(Rect2(-58, -68, 112, 140), Color("d7c295"))
	n.draw_rect(Rect2(-64, -74, 122, 148), Color("5c3c22"))
	n.draw_rect(Rect2(44, -74, 16, 148), Color("c39643"))
	n.draw_rect(Rect2(46, -74, 4, 148), Color("5c3d12"))
	n.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


var _lever_on: Texture2D
var _lever_off: Texture2D


func _lever_texture(on: bool) -> Texture2D:
	if on and _lever_on != null:
		return _lever_on
	if not on and _lever_off != null:
		return _lever_off
	var w := 26
	var h := 42
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	var top := Color("fff2c8") if on else Color("b98d3d")
	var mid := Color("dcae52") if on else Color("7a4e1c")
	var bot := Color("8a5f22") if on else Color("4a3011")
	for y in h:
		var t := float(y) / float(h - 1)
		var col := top.lerp(mid, minf(1.0, t / 0.52))
		if t > 0.52:
			col = mid.lerp(bot, (t - 0.52) / 0.48)
		var inset := 0.0
		if y < 8:
			var dy := 8.0 - float(y)
			inset = 8.0 - sqrt(maxf(0.0, 64.0 - dy * dy))
		elif y > h - 5:
			var dy := float(y) - float(h - 5)
			inset = 4.0 - sqrt(maxf(0.0, 16.0 - dy * dy))
		for x in w:
			if float(x) < inset or float(x) > float(w - 1) - inset:
				img.set_pixel(x, y, Color(0, 0, 0, 0))
			else:
				img.set_pixel(x, y, col)
	var tex := ImageTexture.create_from_image(img)
	if on:
		_lever_on = tex
	else:
		_lever_off = tex
	return tex


func _draw_ledger_sheets(n: Control) -> void:
	var pad := 28.0
	var sheets: Array = [
		{"rot": -5.0, "dy": 8.0, "a": 0.6},
		{"rot": 3.0, "dy": 4.0, "a": 0.8},
		{"rot": -1.5, "dy": 0.0, "a": 1.0},
	]
	# box-shadow: 0 6px 12px rgba(0,0,0,0.45), faked with a soft stack.
	for i in 8:
		var spread := 4.0 + float(i) * 2.2
		var a := 0.07 * (1.0 - float(i) / 8.0)
		n.draw_rect(Rect2(pad - spread * 0.2, pad + 6.0 + float(i) * 1.2, 136.0 + spread * 0.4, 76.0), Color(0, 0, 0, a))
	for sheet in sheets:
		var alpha := float(sheet["a"])
		var center := Vector2(pad + 68.0, pad + 38.0 + float(sheet["dy"]))
		n.draw_set_transform(center, deg_to_rad(float(sheet["rot"])), Vector2.ONE)
		n.draw_rect(Rect2(-68, -38, 136, 76), Color(0.937, 0.875, 0.729, alpha))
		if alpha > 0.95:
			var y := -24.0
			while y < 28.0:
				n.draw_line(Vector2(-52, y), Vector2(52, y), Color(90.0 / 255.0, 70.0 / 255.0, 40.0 / 255.0, 0.45), 2.0)
				y += 15.0
		n.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _draw_stove(c: Control, lip: bool) -> void:
	var cx := _stove.x
	var cy := _stove.y
	var rx := _stove.z
	var ry := _stove.w
	if rx < 2.0:
		return
	if not lip:
		c.draw_set_transform(Vector2(cx, cy), 0.0, Vector2(rx, ry))
		c.draw_circle(Vector2.ZERO, 1.0, Color(0.03, 0.012, 0.008, 1.0))
		c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
		_ellipse_ring(c, cx, cy, rx, ry, PI * 1.05, PI * 1.95, Color(0.55, 0.4, 0.28, 0.7), 4.0)
		_ellipse_ring(c, cx, cy, rx, ry, 0.15, PI - 0.15, Color(0.08, 0.04, 0.02, 0.85), 4.0)
	else:
		_ellipse_ring(c, cx, cy, rx, ry, 0.05, PI - 0.05, Color("2a211c"), 7.0)
		_ellipse_ring(c, cx, cy, rx, ry, 0.15, PI - 0.15, Color(0, 0, 0, 0.55), 5.0)


func _ellipse_ring(c: Control, cx: float, cy: float, rx: float, ry: float, a0: float, a1: float, color: Color, width: float) -> void:
	var pts := PackedVector2Array()
	var n := 36
	for i in n + 1:
		var a := lerpf(a0, a1, float(i) / float(n))
		pts.append(Vector2(cx + cos(a) * rx, cy + sin(a) * ry))
	if pts.size() >= 2:
		c.draw_polyline(pts, color, width, true)


func _flame_level() -> float:
	if bool(Game.brew.get("bottled", false)) or discard_t >= 0.0:
		return 0.0
	var heat := str(Game.brew.get("currentHeat", "medium"))
	return float({"low": 0.35, "medium": 0.7, "high": 1.0}.get(heat, 0.7))


func _make_stove_flames(front: bool) -> Control:
	var rx := _stove.z
	var ry := _stove.w
	var c := Control.new()
	c.position = Vector2(_stove.x - rx, _stove.y - ry)
	c.size = Vector2(rx * 2.0, ry * 2.0)
	c.mouse_filter = MOUSE_FILTER_IGNORE
	# Web stove tongues are source-over, clipped to the ellipse. Additive
	# blend turned the crescent into one orange smear.
	c.set_meta("front", front)
	c.draw.connect(_draw_stove_flames.bind(c, front))
	return c


func _draw_stove_flames(c: Control, front: bool) -> void:
	var level := _flame_level()
	if level <= 0.01:
		return
	var w := c.size.x
	var h := c.size.y
	var tongues := 5 if front else 7
	var base_y := h * (0.92 if front else 0.78)
	for i in tongues:
		var t := _clock * (2.2 + float(i) * 0.37) + float(i) * 1.3
		var side := float(i) / float(tongues - 1)
		var x := w * (0.16 + side * 0.68) + sin(t * 1.3) * w * 0.03
		var edge := 0.72 + absf(side - 0.5) * 0.7
		var height := h * (0.55 if front else 0.7) * level * edge * (0.75 + 0.25 * sin(t * 2.1))
		_draw_tongue(c, x, base_y, w * (0.055 + level * 0.02), height, sin(t) * w * 0.04, level, front)


func _draw_tongue(c: Control, cx: float, base_y: float, half: float, height: float, lean: float, level: float, front: bool) -> void:
	if height < 2.0:
		return
	var tip := Vector2(cx + lean, base_y - height)
	var left := Vector2(cx - half, base_y)
	var right := Vector2(cx + half, base_y)
	var pts := PackedVector2Array()
	var cols := PackedColorArray()
	var n := 6
	for i in n + 1:
		var u := float(i) / float(n)
		pts.append(_cubic(left, Vector2(cx - half * 1.1, base_y - height * 0.45), Vector2(cx - half * 0.2, base_y - height * 0.75), tip, u))
		cols.append(_tongue_color(1.0 - u, level))
	for i in range(n, -1, -1):
		var u := float(i) / float(n)
		pts.append(_cubic(right, Vector2(cx + half * 1.05, base_y - height * 0.4), Vector2(cx + half * 0.25, base_y - height * 0.7), tip, u))
		cols.append(_tongue_color(1.0 - u, level))
	# Web clips every tongue to the stove ellipse. The front layer also keeps
	# only the lower crescent, so the bases read as separate coals.
	var clipped: Array = _clip_ellipse(pts, cols, c.size.x * 0.5, c.size.y * 0.5, c.size.x * 0.5, c.size.y * 0.48)
	pts = clipped[0]
	cols = clipped[1]
	if front:
		clipped = _clip_below(pts, cols, c.size.y * 0.48)
		pts = clipped[0]
		cols = clipped[1]
	if pts.size() >= 3:
		c.draw_polygon(pts, cols)


func _clip_below(pts: PackedVector2Array, cols: PackedColorArray, y0: float) -> Array:
	return _clip_plane(pts, cols, 0.0, 1.0, y0, true)


func _clip_ellipse(pts: PackedVector2Array, cols: PackedColorArray, cx: float, cy: float, rx: float, ry: float) -> Array:
	var out_p := pts
	var out_c := cols
	if rx < 1.0 or ry < 1.0:
		return [out_p, out_c]
	var steps := 16
	for i in steps:
		var a := TAU * float(i) / float(steps)
		var bx := cx + cos(a) * rx
		var by := cy + sin(a) * ry
		var nx := cos(a) / rx
		var ny := sin(a) / ry
		var clipped: Array = _clip_plane(out_p, out_c, nx, ny, nx * bx + ny * by, false)
		out_p = clipped[0]
		out_c = clipped[1]
	return [out_p, out_c]


func _clip_plane(pts: PackedVector2Array, cols: PackedColorArray, nx: float, ny: float, limit: float, keep_above: bool) -> Array:
	var out_p := PackedVector2Array()
	var out_c := PackedColorArray()
	var n := pts.size()
	if n < 3:
		return [out_p, out_c]
	for i in n:
		var j := (i + 1) % n
		var a := pts[i]
		var b := pts[j]
		var ca: Color = cols[i]
		var cb: Color = cols[j]
		var da := nx * a.x + ny * a.y - limit
		var db := nx * b.x + ny * b.y - limit
		var ain := da >= 0.0 if keep_above else da <= 0.0
		var bin := db >= 0.0 if keep_above else db <= 0.0
		if ain:
			out_p.append(a)
			out_c.append(ca)
		if ain != bin:
			var denom := da - db
			var t := 0.0 if absf(denom) < 0.0001 else da / denom
			out_p.append(a.lerp(b, t))
			out_c.append(ca.lerp(cb, t))
	return [out_p, out_c]


func _tongue_color(from_tip: float, level: float) -> Color:
	var clear := Color(1.0, 0.94, 0.7, 0.0)
	var gold := Color(1.0, 0.745, 0.275, 0.55 * level)
	var orange := Color(0.941, 0.431, 0.118, 0.7 * level)
	var red := Color(0.784, 0.196, 0.078, 0.35 * level)
	if from_tip < 0.35:
		return clear.lerp(gold, from_tip / 0.35)
	if from_tip < 0.75:
		return gold.lerp(orange, (from_tip - 0.35) / 0.4)
	return orange.lerp(red, (from_tip - 0.75) / 0.25)


func _cubic(p0: Vector2, p1: Vector2, p2: Vector2, p3: Vector2, t: float) -> Vector2:
	var u := 1.0 - t
	return p0 * u * u * u + p1 * 3.0 * u * u * t + p2 * 3.0 * u * t * t + p3 * t * t * t


func _note_pin() -> TextureRect:
	var n := 64
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	var center := Vector2(n * 0.34, n * 0.30)
	var edge := Color("6e1f2e")
	var hot := Color("e0645c")
	for y in n:
		for x in n:
			var p := Vector2(float(x) + 0.5, float(y) + 0.5)
			var d := p.distance_to(Vector2(n * 0.5, n * 0.5)) / (float(n) * 0.5)
			var shade := p.distance_to(center) / (float(n) * 0.72)
			var col := hot.lerp(edge, clampf(shade, 0.0, 1.0))
			var a := clampf(1.0 - smoothstep(0.72, 1.0, d), 0.0, 1.0)
			# Soft contact shadow, offset down.
			var sd := p.distance_to(Vector2(n * 0.5, n * 0.62)) / (float(n) * 0.5)
			var sa := clampf(1.0 - smoothstep(0.55, 1.0, sd), 0.0, 1.0) * 0.55
			if a < sa:
				col = Color(0, 0, 0, 1)
				a = sa
			col.a = a
			img.set_pixel(x, y, col)
	var g := TextureRect.new()
	g.texture = ImageTexture.create_from_image(img)
	g.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	g.stretch_mode = TextureRect.STRETCH_SCALE
	g.mouse_filter = MOUSE_FILTER_IGNORE
	g.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	return g


func jump_transfer(at: float) -> void:
	if not Game.transfer_mortar():
		return
	transfer_t = 0.0
	_transfer_dropped = false
	_transfer.begin(_mouth, _mouth_r)
	var steps := int(maxf(at, 0.0) * 60.0)
	for _i in steps:
		_tick_transfer(1.0 / 60.0)
	if _transfer_draw:
		_transfer_draw.queue_redraw()
	if _mortar_fx:
		_mortar_fx.queue_redraw()
