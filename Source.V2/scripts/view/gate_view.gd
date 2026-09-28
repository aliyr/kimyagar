class_name GateView
extends Control
## سردر — Web/src/scene/intro. Positions match intro.css on the 1920×1080 stage.

signal entered
signal open_settings

var phase := "idle"
var time_name := "dusk"
var sky: Dictionary = {}
var quote: Dictionary = {}
var speed := 1.0
var doors := 0.0
var door_anim := 0.0
var enter_t := 0.0
var quote_open := false
var cat_awake := 0.0
var panel := ""
var freeze := false
var boot_left := 0.0
var _knocked2 := false
var _belled := false
var _clock := 0.0
var _creak := 0.0

var _rig: Control
var _sky_layer: Control
var _mid_layer: Control
var _front_layer: Control
var _vp: SubViewport
var _plate: TextureRect
var _plate_mat: ShaderMaterial
var _facade: TextureRect
var _facade_mat: ShaderMaterial
var _west: TextureRect
var _east: TextureRect
var _west_mat: ShaderMaterial
var _east_mat: ShaderMaterial
var _glow: ColorRect
var _sign: Control
var _passer: TextureRect
var _cat_sleep: TextureRect
var _cat_awake: TextureRect
var _knocker: TextureRect
var _plaque_label: Label
var _fresh: Button
var _quote_root: Control
var _veil: ColorRect
var _panel_layer: Control
var _dusk_hint := 1.0
var _rig_hits: Array = []
var _hit_px := 0.0
var _hit_py := 0.0
var _hit_mode := "off"
var _sky_fx: Control
var _dust_fx: Control


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_STOP
	UiKit.fill(self)
	UiKit.ensure()
	var hour = Settings.hour_override
	if hour == null:
		hour = Time.get_datetime_dict_from_system()["hour"]
	time_name = Content.time_of_day_for_hour(float(hour))
	sky = Content.SKY[time_name]
	var now: Dictionary = Time.get_datetime_dict_from_system()
	quote = Content.quote_for_date(int(now["year"]), int(now["month"]), int(now["day"]))
	speed = 0.6 if Settings.intro_seen else 1.0
	if not Settings.intro_seen:
		phase = "boot"
		boot_left = 2.6
	_build()
	# Size set on stretched anchors is thrown away after _ready. Relock once
	# that pass has finished so the plate stays the logical stage.
	call_deferred("_relock_stage")


func force_idle() -> void:
	phase = "idle"
	boot_left = 0.0
	if _veil:
		_veil.visible = false
	Settings.mark_intro_seen()
	speed = 0.6


func begin_enter() -> void:
	if phase == "boot" or phase == "opening" or phase == "entering":
		return
	Sfx.unlock()
	panel = ""
	quote_open = false
	_refresh_panel()
	phase = "opening"
	enter_t = 0.0
	_knocked2 = false
	_belled = false
	doors = 0.0
	Sfx.knock()
	Haptics.pulse("light")


func _exit_tree() -> void:
	# ViewportTexture on the plate keeps the SubViewport's canvas item alive
	# past shutdown (one leaked CanvasItem RID plus a few ObjectDB instances).
	if _plate:
		_plate.material = null
		_plate.texture = null
	if _facade:
		_facade.material = null
	if _west:
		_west.material = null
	if _east:
		_east.material = null
	if _vp:
		_vp.render_target_update_mode = SubViewport.UPDATE_DISABLED


func _relock_stage() -> void:
	UiKit.fill(self)
	if _plate:
		_plate.custom_minimum_size = Vector2.ZERO
		UiKit.fill(_plate)


func _build() -> void:
	_rig = Control.new()
	_rig.mouse_filter = MOUSE_FILTER_IGNORE
	UiKit.fill(_rig)
	_rig.pivot_offset = Vector2(960, 540)
	add_child(_rig)
	_sky_layer = _depth_host()
	_mid_layer = _depth_host()
	_front_layer = _depth_host()

	var sky_layer := Control.new()
	sky_layer.mouse_filter = MOUSE_FILTER_IGNORE
	sky_layer.position = Vector2(-24, -24)
	sky_layer.size = Vector2(1968, 470)
	_sky_layer.add_child(sky_layer)
	_sky_fx = _fx_host(_draw_fireflies)
	_sky_layer.add_child(_sky_fx)
	var grad := Gradient.new()
	grad.set_color(0, Color(sky["skyA"]))
	grad.set_color(1, Color(sky["skyC"]))
	grad.add_point(240.0 / 470.0, Color(sky["skyB"]))
	var gt := GradientTexture2D.new()
	gt.gradient = grad
	gt.width = 4
	gt.height = 470
	gt.fill_from = Vector2(0.5, 0)
	gt.fill_to = Vector2(0.5, 1)
	var sky_tex := TextureRect.new()
	sky_tex.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	sky_tex.stretch_mode = TextureRect.STRETCH_SCALE
	sky_tex.texture = gt
	sky_tex.mouse_filter = MOUSE_FILTER_IGNORE
	UiKit.place(sky_tex, Rect2(Vector2.ZERO, sky_layer.size))
	sky_layer.add_child(sky_tex)
	var fx := UiKit.sprite("intro/sky_fx.png", Rect2(520, -40, 1300, 731), "contain")
	fx.modulate.a = float(sky["moon"])
	sky_layer.add_child(fx)

	var doors := Control.new()
	doors.position = Vector2(651, 474)
	doors.size = Vector2(608, 543)
	doors.mouse_filter = MOUSE_FILTER_IGNORE
	doors.clip_contents = true
	_mid_layer.add_child(doors)
	_west = UiKit.sprite("gate/door_west.png", Rect2(0, 0, 304, 543), "fill")
	_west_mat = _door_mat(0.0, Vector2(0, 0))
	_west.material = _west_mat
	_east = UiKit.sprite("gate/door_east.png", Rect2(304, 0, 304, 543), "fill")
	_east_mat = _door_mat(1.0, Vector2(304, 0))
	_east.material = _east_mat
	doors.add_child(_west)
	doors.add_child(_east)
	_glow = ColorRect.new()
	_glow.position = Vector2(140, 0)
	_glow.size = Vector2(328, 543)
	_glow.color = Color(1, 0.7, 0.4, 0)
	_glow.mouse_filter = MOUSE_FILTER_IGNORE
	doors.add_child(_glow)

	_facade = UiKit.sprite("intro/facade.png", Rect2(0, 60, 1920, 1080), "fill")
	_facade_mat = ShaderMaterial.new()
	_facade_mat.shader = load("res://shaders/facade_grade.gdshader")
	_apply_sky_shader()
	_facade.material = _facade_mat
	_mid_layer.add_child(_facade)

	_add_window_glow(192)
	_add_window_glow(1430)

	var lantern := UiKit.sprite("intro/lantern.png", Rect2(560, 330, 130, 373), "contain")
	_front_layer.add_child(lantern)
	var halo := ColorRect.new()
	halo.position = Vector2(560 - 160, 330 + 30)
	halo.size = Vector2(450, 450)
	halo.color = Color(1, 0.75, 0.4, 0.18 * float(sky["lanternStrength"]))
	halo.mouse_filter = MOUSE_FILTER_IGNORE
	_front_layer.add_child(halo)

	_sign = Control.new()
	_sign.position = Vector2(680, -30)
	# Board is 560×315. The subtitle sits at top 322, outside that box.
	_sign.size = Vector2(560, 380)
	_sign.pivot_offset = Vector2(280, 0)
	_sign.mouse_filter = MOUSE_FILTER_IGNORE
	_front_layer.add_child(_sign)
	_sign.add_child(UiKit.sprite("gate/sign.png", Rect2(0, 0, 560, 315), "fill"))
	# intro.css .intro__logo: 128px ExtraBold, line box 1.5, left/right 40, top 96.
	var logo := UiKit.label(Content.UI["gameTitle"], Rect2(40, 96, 480, 192), 128, Color("f1cd7a"), UiKit.extrabold)
	logo.clip_text = false
	logo.add_theme_color_override("font_outline_color", Color(0.235, 0.118, 0.02, 0.9))
	logo.add_theme_constant_override("outline_size", 2)
	logo.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.55))
	logo.add_theme_constant_override("shadow_offset_y", 5)
	_sign.add_child(logo)
	var subtitle := UiKit.label(Content.UI["gateSubtitle"], Rect2(0, 322, 560, 36), 22, Color(0.914, 0.851, 0.706, 0.82))
	subtitle.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	subtitle.add_theme_constant_override("shadow_offset_y", 2)
	_sign.add_child(subtitle)
	_dust_fx = _fx_host(_draw_dust)
	_front_layer.add_child(_dust_fx)

	_passer = UiKit.sprite("gate/customer_shadow.png", Rect2(1500, 230, 280, 780), "contain")
	_passer.modulate = Color(0.22, 0.22, 0.22, 0)
	_passer.pivot_offset = Vector2(140, 780)
	_front_layer.add_child(_passer)

	_cat_sleep = UiKit.sprite("intro/cat_sleep.png", Rect2(700, 922, 200, 110), "contain")
	_cat_awake = UiKit.sprite("intro/cat_awake.png", Rect2(700, 922, 200, 110), "contain")
	_cat_awake.modulate.a = 0
	_mid_layer.add_child(_cat_sleep)
	_mid_layer.add_child(_cat_awake)
	var cat_hit := UiKit.hit(Rect2(700, 922, 200, 110))
	cat_hit.mouse_filter = MOUSE_FILTER_IGNORE
	_rig_hits.append({"rect": Rect2(700, 922, 200, 110), "depth": 36.0, "cb": _poke_cat})

	_knocker = UiKit.sprite("intro/knocker.png", Rect2(908, 640, 94, 131), "contain")
	_knocker.pivot_offset = Vector2(47, 18)
	_mid_layer.add_child(_knocker)
	_rig_hits.append({"rect": Rect2(908, 620, 110, 160), "depth": 36.0, "cb": begin_enter})

	var settings := UiKit.sprite("intro/lantern.png", Rect2(1764, 328, 80, 208), "contain")
	settings.modulate.a = 0.92
	_mid_layer.add_child(settings)
	# .intro__tag bottom is 32px below the 230px-tall settings hit.
	_mid_layer.add_child(_tag(Content.UI["settings"], Rect2(1724, 564, 160, 26), 17))
	_rig_hits.append({"rect": Rect2(1764, 328, 80, 230), "depth": 36.0, "cb": _open_settings})

	_wrap_rig()
	_build_pin()
	_veil = ColorRect.new()
	_veil.color = Color("030204")
	UiKit.fill(_veil)
	_veil.mouse_filter = MOUSE_FILTER_IGNORE
	_veil.visible = phase == "boot"
	add_child(_veil)
	_panel_layer = Control.new()
	UiKit.fill(_panel_layer)
	_panel_layer.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(_panel_layer)
	_refresh_plaque()


func _depth_host() -> Control:
	var n := Control.new()
	n.mouse_filter = MOUSE_FILTER_IGNORE
	UiKit.fill(n)
	_rig.add_child(n)
	return n


func _door_mat(hinge: float, origin: Vector2) -> ShaderMaterial:
	var mat := ShaderMaterial.new()
	mat.shader = load("res://shaders/door_leaf.gdshader")
	mat.set_shader_parameter("hinge", hinge)
	mat.set_shader_parameter("leaf_origin", origin)
	mat.set_shader_parameter("angle_deg", 0.0)
	return mat


func _wrap_rig() -> void:
	remove_child(_rig)
	_vp = SubViewport.new()
	_vp.size = Vector2i(1920, 1080)
	_vp.transparent_bg = true
	_vp.disable_3d = true
	_vp.handle_input_locally = false
	_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(_vp)
	_vp.add_child(_rig)
	_plate = TextureRect.new()
	_plate.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_plate.stretch_mode = TextureRect.STRETCH_SCALE
	_plate.mouse_filter = MOUSE_FILTER_IGNORE
	_plate.texture = _vp.get_texture()
	_plate.custom_minimum_size = Vector2.ZERO
	UiKit.fill(_plate)
	_plate_mat = ShaderMaterial.new()
	_plate_mat.shader = load("res://shaders/rig_perspective.gdshader")
	_plate.material = _plate_mat
	add_child(_plate)


func _add_window_glow(x: float) -> void:
	var g := ColorRect.new()
	g.position = Vector2(x, 390)
	g.size = Vector2(300, 400)
	g.color = Color(1, 0.69, 0.34, 0.16 * float(sky["lanternStrength"]))
	g.mouse_filter = MOUSE_FILTER_IGNORE
	_mid_layer.add_child(g)


func _apply_sky_shader() -> void:
	if _facade_mat == null:
		return
	_facade_mat.set_shader_parameter("brightness", float(sky["facadeBrightness"]))
	_facade_mat.set_shader_parameter("saturate_amt", float(sky["facadeSaturate"]))
	var filt := str(sky["tintFilter"])
	_facade_mat.set_shader_parameter("sepia_amt", _filter_num(filt, "sepia"))
	_facade_mat.set_shader_parameter("hue_deg", _filter_num(filt, "hue-rotate"))
	_facade_mat.set_shader_parameter("tint_sat", _filter_num(filt, "saturate"))
	_facade_mat.set_shader_parameter("tint_brightness", _filter_num(filt, "brightness"))
	_facade_mat.set_shader_parameter("tint_opacity", float(sky["tintOpacity"]))


func _filter_num(filt: String, key: String) -> float:
	var i := filt.find(key + "(")
	if i < 0:
		return 0.0
	var rest := filt.substr(i + key.length() + 1)
	var end := rest.find(")")
	var num := rest.substr(0, end).replace("deg", "")
	return float(num)


func _build_pin() -> void:
	var ledger := UiKit.sprite("intro/ledger_closed.png", Rect2(24, 848, 200, 185), "contain")
	add_child(ledger)
	add_child(_tag(Content.UI["gateScores"], Rect2(-16, 1037, 280, 28), 20))
	var led_hit := UiKit.hit(Rect2(24, 848, 200, 185))
	led_hit.pressed.connect(func() -> void: _toggle_panel("scores"))
	add_child(led_hit)

	_quote_root = Control.new()
	_quote_root.position = Vector2(1406, 868)
	_quote_root.size = Vector2(306, 173)
	_quote_root.pivot_offset = Vector2(153, 86)
	_quote_root.rotation_degrees = -1.5
	add_child(_quote_root)
	_quote_root.add_child(UiKit.sprite("gate/parchment.png", Rect2(0, 0, 306, 173), "fill"))
	var qtext := str(quote["lines"][0]) + "\n" + str(quote["lines"][1])
	# .intro__quote-text inset 22px 20px 40px, 17px.
	_quote_root.add_child(UiKit.label(qtext, Rect2(20, 22, 266, 111), 17, Color("4a2f16")))
	_quote_root.add_child(UiKit.label(str(quote["attribution"]), Rect2(34, 129, 200, 28), 13, Color(0.29, 0.18, 0.09, 0.7), UiKit.regular, HORIZONTAL_ALIGNMENT_LEFT))
	var qhit := UiKit.hit(Rect2(0, 0, 306, 173))
	qhit.pressed.connect(_toggle_quote)
	_quote_root.add_child(qhit)

	var plaque := UiKit.sprite("intro/plaque.png", Rect2(850, 805, 210, 97), "contain")
	add_child(plaque)
	_plaque_label = UiKit.label("", Rect2(850, 805, 210, 97), 30, Color("3a2410"), UiKit.bold)
	_plaque_label.add_theme_color_override("font_shadow_color", Color(1.0, 0.91, 0.686, 0.55))
	_plaque_label.add_theme_constant_override("shadow_offset_y", 1)
	_plaque_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.35))
	_plaque_label.add_theme_constant_override("outline_size", 1)
	add_child(_plaque_label)
	var start := UiKit.hit(Rect2(850, 805, 210, 97))
	start.pressed.connect(begin_enter)
	add_child(start)

	var map_tex := UiKit.tex("intro/map_rolled.png")
	var map_node := TextureRect.new()
	map_node.position = Vector2(1748, 746)
	map_node.size = Vector2(112, 307)
	map_node.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	map_node.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	map_node.mouse_filter = MOUSE_FILTER_IGNORE
	if map_tex != null:
		var atlas := AtlasTexture.new()
		atlas.atlas = map_tex
		var h := map_tex.get_height()
		atlas.region = Rect2(0, h * 0.176, map_tex.get_width(), h * 0.824)
		map_node.texture = atlas
	map_node.pivot_offset = Vector2(56, 12)
	add_child(map_node)
	add_child(_tag(Content.UI["gateStages"], Rect2(1708, 1059, 192, 26), 20))
	var map_hit := UiKit.hit(Rect2(1748, 746, 112, 307))
	map_hit.pressed.connect(func() -> void: _toggle_panel("stages"))
	add_child(map_hit)

	_fresh = UiKit.fresh_button(Content.UI["gateFresh"], Rect2(900, 1002, 168, 36))
	_fresh.pivot_offset = Vector2(75, 20)
	_fresh.rotation_degrees = 1.0
	_fresh.pressed.connect(func() -> void: _toggle_panel("confirmFresh"))
	add_child(_fresh)
	_fresh.visible = ProgressLogic.has_progress(Progress.data)


func _tag(text: String, rect: Rect2, size: int) -> Label:
	var l := UiKit.label(text, rect, size, Color(0.91, 0.85, 0.71, 0.86))
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.85))
	l.add_theme_constant_override("shadow_offset_y", 2)
	return l


func _refresh_plaque() -> void:
	if _plaque_label == null:
		return
	var cont := ProgressLogic.has_progress(Progress.data)
	_plaque_label.text = Content.UI["gateContinue"] if cont else Content.UI["gateStart"]
	if _fresh:
		_fresh.visible = cont


func _toggle_quote() -> void:
	if phase == "opening" or phase == "entering":
		return
	Sfx.unlock()
	Sfx.paper()
	quote_open = not quote_open


func _poke_cat() -> void:
	if cat_awake > 0.0:
		return
	Sfx.unlock()
	Sfx.meow()
	cat_awake = 4.0


func _toggle_panel(id: String) -> void:
	if phase == "opening" or phase == "entering" or phase == "boot":
		return
	Sfx.unlock()
	Sfx.paper()
	panel = "" if panel == id else id
	_refresh_panel()


func _refresh_panel() -> void:
	if _panel_layer == null:
		return
	for c in _panel_layer.get_children():
		c.queue_free()
	if panel == "":
		_panel_layer.mouse_filter = MOUSE_FILTER_IGNORE
		return
	_panel_layer.mouse_filter = MOUSE_FILTER_STOP
	var scrim := ColorRect.new()
	scrim.color = Color(0.024, 0.012, 0.008, 0.58)
	UiKit.fill(scrim)
	scrim.gui_input.connect(func(ev: InputEvent) -> void:
		if ev is InputEventMouseButton and ev.pressed:
			panel = ""
			_refresh_panel()
	)
	_panel_layer.add_child(scrim)
	var art := "intro/map_open.png" if panel == "stages" else "intro/ledger_open.png"
	var frame_rect := Rect2(260, 146, 1400, 788)
	if panel == "confirmFresh":
		art = "gate/parchment.png"
		# .intro__panel--note
		frame_rect = Rect2(560, 300, 800, 454)
	var frame := UiKit.sprite(art, frame_rect, "fill")
	_panel_layer.add_child(frame)
	if panel == "stages":
		var map_title := UiKit.label(Content.UI["gateMapTitle"], Rect2(260, 224, 1400, 48), 34, Color("4a2f16"), UiKit.bold)
		map_title.add_theme_color_override("font_shadow_color", Color(1, 0.961, 0.863, 0.6))
		map_title.add_theme_constant_override("shadow_offset_y", 1)
		_panel_layer.add_child(map_title)
		_fill_stages()
	elif panel == "scores":
		_fill_scores()
	elif panel == "confirmFresh":
		_fill_confirm()
	var close_rect := Rect2(282, 164, 56, 56)
	if panel == "scores":
		close_rect = Rect2(474, 246, 56, 56)
	elif panel == "confirmFresh":
		close_rect = Rect2(582, 318, 48, 48)
	var close := UiKit.seal_button(close_rect)
	close.pressed.connect(func() -> void:
		panel = ""
		_refresh_panel()
	)
	_panel_layer.add_child(close)


func _fill_stages() -> void:
	var i := 0
	for st in Content.STAGES:
		var unlocked := Content.stage_unlocked(i)
		var x := 260.0 + float(st["mapX"]) / 100.0 * 1400.0
		var y := 146.0 + float(st["mapY"]) / 100.0 * 788.0
		var seal := Panel.new()
		seal.position = Vector2(x - 34, y - 34)
		seal.size = Vector2(68, 68)
		seal.mouse_filter = MOUSE_FILTER_IGNORE
		var disc := StyleBoxFlat.new()
		disc.bg_color = Color("2ba09a") if unlocked else Color("7a726a")
		disc.set_corner_radius_all(34)
		disc.shadow_color = Color(0, 0, 0, 0.4)
		disc.shadow_size = 3
		seal.add_theme_stylebox_override("panel", disc)
		_panel_layer.add_child(seal)
		var name := str(st["nameFa"]) if unlocked else Content.UI["gateLocked"]
		var name_color := Color("3b2a14") if unlocked else Color(0.231, 0.165, 0.078, 0.6)
		var name_l := UiKit.label(name, Rect2(x - 120, y - 68, 240, 30), 22, name_color, UiKit.bold)
		name_l.add_theme_color_override("font_shadow_color", Color(1, 0.961, 0.863, 0.6))
		name_l.add_theme_constant_override("shadow_offset_y", 1)
		_panel_layer.add_child(name_l)
		i += 1


func _fill_scores() -> void:
	# .intro__page--right: 54.5% / 26% of the 1400×788 sheet, top 19%.
	var page := Rect2(260.0 + 0.545 * 1400.0, 146.0 + 0.19 * 788.0, 0.26 * 1400.0, 0.58 * 788.0)
	var title := UiKit.label(Content.UI["gateLedgerTitle"], Rect2(page.position.x, page.position.y, page.size.x, 54), 25, Color("3a2a12"), UiKit.bold)
	_panel_layer.add_child(title)
	var hist: Array = Progress.data["scoreHistory"]
	if hist.is_empty():
		_panel_layer.add_child(UiKit.label(Content.UI["gateLedgerEmpty"], Rect2(page.position.x, page.position.y + 80, page.size.x, 40), 22, Color("3b2a14")))
		_panel_layer.add_child(UiKit.label(Content.UI["gateLedgerEmptyHint"], Rect2(page.position.x, page.position.y + 124, page.size.x, 48), 16, Color(0.231, 0.165, 0.078, 0.7)))
		return
	var best := float(Progress.data.get("bestScore", 0))
	_panel_layer.add_child(UiKit.label("%s  %s" % [Content.UI["gateLedgerBest"], Content.to_fa_digits(best)], Rect2(page.position.x, page.position.y + 58, page.size.x, 32), 18, Color("3b2a14"), UiKit.bold))
	var y := page.position.y + 100.0
	var shown := mini(8, hist.size())
	for n in shown:
		var row: Dictionary = hist[hist.size() - 1 - n]
		var line := "%s   %s   %s" % [str(row.get("customerId", "")), Content.BAND.get(str(row.get("band", "")), ""), Content.to_fa_digits(float(row.get("score", 0)))]
		_panel_layer.add_child(UiKit.label(line, Rect2(page.position.x, y, page.size.x, 46), 20, Color("3b2a14"), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))
		y += 46


func _fill_confirm() -> void:
	# .intro__note-body inset 56px 80px 60px inside the 800×454 sheet.
	_panel_layer.add_child(UiKit.label(Content.UI["gateFreshConfirm"], Rect2(640, 390, 640, 120), 24, Color("3b2a14")))
	var yes := UiKit.note_button(Content.UI["gateFreshYes"], Rect2(980, 540, 220, 56), true)
	yes.pressed.connect(func() -> void:
		Game.start_fresh()
		panel = ""
		_refresh_plaque()
		_refresh_panel()
	)
	var no := UiKit.note_button(Content.UI["gateFreshNo"], Rect2(720, 540, 240, 56))
	no.pressed.connect(func() -> void:
		panel = ""
		_refresh_panel()
	)
	_panel_layer.add_child(yes)
	_panel_layer.add_child(no)


func advance(dt: float, tilt: TiltDriver) -> void:
	_clock += dt
	if phase == "boot":
		boot_left -= dt
		if _veil:
			_veil.modulate.a = clampf(boot_left / 1.3, 0.0, 1.0)
		if boot_left <= 0.0:
			phase = "idle"
			Settings.mark_intro_seen()
			speed = 0.6
			if _veil:
				_veil.visible = false
	if (phase == "opening" or phase == "entering") and not freeze:
		enter_t += dt
		var k := speed
		if not _knocked2 and enter_t >= 0.18 * k:
			_knocked2 = true
			Sfx.knock()
		if not _belled and enter_t >= 0.45 * k:
			_belled = true
			Sfx.shop_bell()
		if enter_t >= 0.50 * k:
			var u := clampf((enter_t - 0.50 * k) / (0.90 * k), 0.0, 1.0)
			doors = UiKit.bezier_y(0.3, 0.6, 0.25, 1.0, u)
		if phase == "opening" and enter_t >= 0.70 * k:
			phase = "entering"
		if phase == "entering" and enter_t >= 2.10 * k:
			phase = "idle"
			visible = false
			entered.emit()
	if cat_awake > 0.0:
		cat_awake = maxf(0.0, cat_awake - dt)
	_apply_visuals(dt, tilt)
	if phase == "idle" and not freeze:
		_creak += dt
		if _creak >= 6.0:
			_creak = 0.0
			if randf() < 0.7:
				Sfx.chain_creak()


func _gui_input(ev: InputEvent) -> void:
	if not (ev is InputEventMouseButton) or not ev.pressed or ev.button_index != MOUSE_BUTTON_LEFT:
		return
	if panel != "":
		return
	var local: Vector2 = ev.position
	var pose := {"px": _hit_px, "py": _hit_py}
	for hit in _rig_hits:
		var p: Vector2 = TiltMath.unproject_layer(pose, local.x, local.y, float(hit["depth"]), _hit_mode)
		var rect: Rect2 = hit["rect"]
		if rect.has_point(p):
			(hit["cb"] as Callable).call()
			accept_event()
			return


func _open_settings() -> void:
	Sfx.unlock()
	open_settings.emit()


func _fx_host(fn: Callable) -> Control:
	var n: Control = preload("res://scripts/view/draw_host.gd").new()
	n.mouse_filter = MOUSE_FILTER_IGNORE
	UiKit.fill(n)
	n.paint = fn
	return n


func _ease_in_out(u: float) -> float:
	var t := clampf(u, 0.0, 1.0)
	if t < 0.5:
		return 2.0 * t * t
	return 1.0 - pow(-2.0 * t + 2.0, 2.0) / 2.0


func _draw_fireflies(c: Control) -> void:
	if not bool(sky.get("fireflies", false)) or freeze:
		return
	for i in 9:
		var base := Vector2(120.0 + float(i) * 190.0, 560.0 + float(i - 4) * float(i - 4) * 14.0)
		var local := fposmod(_clock + float(i) * 1.7, 7.5) / 7.5
		var pos := Vector2.ZERO
		var op := 0.0
		if local < 0.2:
			op = lerpf(0.0, 0.9, local / 0.2)
		elif local < 0.5:
			var u := (local - 0.2) / 0.3
			pos = Vector2(40, -60) * u
			op = lerpf(0.9, 0.4, u)
		elif local < 0.75:
			pos = Vector2(40, -60)
			op = lerpf(0.4, 0.85, (local - 0.5) / 0.25)
		elif local < 0.9:
			var u2 := (local - 0.75) / 0.15
			pos = Vector2(40, -60).lerp(Vector2(-20, -110), u2)
			op = lerpf(0.85, 0.0, u2)
		else:
			pos = Vector2(-20, -110)
			op = 0.0
		if op <= 0.02:
			continue
		c.draw_circle(base + pos, 8.0, Color(1.0, 0.88, 0.55, 0.28 * op))
		c.draw_circle(base + pos, 3.0, Color(1.0, 0.91, 0.64, op))


func _draw_dust(c: Control) -> void:
	if freeze:
		return
	var spec := [
		{"x": 580.0, "d": -1.2, "dur": 7.0},
		{"x": 660.0, "d": -2.6, "dur": 5.4},
		{"x": 540.0, "d": -3.8, "dur": 8.0},
		{"x": 690.0, "d": -4.7, "dur": 6.6},
		{"x": 620.0, "d": 0.0, "dur": 6.0},
	]
	for item in spec:
		var dur := float(item["dur"])
		var local := fposmod(_clock - float(item["d"]), dur) / dur
		var pos := Vector2(float(item["x"]), 630.0) + Vector2(18.0, -170.0) * local
		var op := 0.0
		if local < 0.2:
			op = lerpf(0.0, 0.9, local / 0.2)
		elif local < 0.8:
			op = lerpf(0.9, 0.6, (local - 0.2) / 0.6)
		else:
			op = lerpf(0.6, 0.0, (local - 0.8) / 0.2)
		if op <= 0.02:
			continue
		c.draw_circle(pos, 5.0, Color(1.0, 0.82, 0.51, 0.35 * op))
		c.draw_circle(pos, 2.0, Color(1.0, 0.9, 0.67, 0.85 * op))


func dusk_opacity() -> float:
	if phase != "entering":
		return 1.0 if visible else 0.0
	var k := speed
	var local := enter_t - 0.70 * k
	return clampf(1.0 - local / 1.0, 0.0, 1.0)


func _apply_visuals(dt: float, tilt: TiltDriver) -> void:
	if _rig == null:
		return
	var busy := phase == "opening" or phase == "entering"
	var tilting := tilt != null and not busy and tilt.mode != "off"
	var px := 0.0
	var py := 0.0
	if tilting:
		px = tilt.px
		py = tilt.py
	if _sky_layer:
		_sky_layer.position = Vector2(px, py) * 18.0
	if _mid_layer:
		_mid_layer.position = Vector2(px, py) * 36.0
	if _front_layer:
		_front_layer.position = Vector2(px, py) * 60.0
	if _plate:
		_plate.custom_minimum_size = Vector2.ZERO
		if _plate.size != UiKit.STAGE:
			UiKit.fill(_plate)
	if _plate_mat and _plate:
		var flat := tilt == null or busy or tilt.mode == "off" or tilt.mode == "flat"
		var ax := 0.0 if flat else deg_to_rad(-py * 2.0)
		var ay := 0.0 if flat else deg_to_rad(px * 2.2)
		var sc := 1.0
		if tilt != null and not busy and tilt.mode != "off":
			sc = tilt.rig_scale()
		# Rest pose is a plain scaled texture. The perspective shader only
		# runs once the rig actually rotates, so a shader miss on ANGLE
		# cannot hide the idle facade.
		var resting := absf(ax) < 0.0001 and absf(ay) < 0.0001
		_plate.pivot_offset = Vector2(960, 540)
		if resting:
			_plate.material = null
			_plate.scale = Vector2(sc, sc)
		else:
			_plate.material = _plate_mat
			_plate.scale = Vector2.ONE
			_plate_mat.set_shader_parameter("ax", ax)
			_plate_mat.set_shader_parameter("ay", ay)
			_plate_mat.set_shader_parameter("rig_scale", sc)
	var ang := 76.0 * doors
	# Closed leaves are the texture itself. The hinge shader is the open swing.
	if _west:
		_west.material = null if absf(ang) < 0.05 else _west_mat
	if _east:
		_east.material = null if absf(ang) < 0.05 else _east_mat
	if _west_mat:
		_west_mat.set_shader_parameter("angle_deg", ang)
	if _east_mat:
		_east_mat.set_shader_parameter("angle_deg", -ang)
	if _glow:
		_glow.color.a = doors * 0.35
	if _sign and not freeze and not busy:
		var sway := fposmod(_clock, 12.0) / 6.0
		var leg := sway if sway <= 1.0 else 2.0 - sway
		var e := _ease_in_out(leg)
		_sign.rotation_degrees = lerpf(-1.1, 1.1, e) if sway <= 1.0 else lerpf(1.1, -1.1, e)
	elif _sign:
		_sign.rotation_degrees = 0.0
	_hit_px = px
	_hit_py = py
	if _sky_fx:
		_sky_fx.queue_redraw()
	if _dust_fx:
		_dust_fx.queue_redraw()
	if tilt == null or busy or tilt.mode == "off":
		_hit_mode = "off"
	elif tilt.mode == "flat":
		_hit_mode = "flat"
	else:
		_hit_mode = "full"
	if _knocker and phase == "opening":
		var u := clampf(enter_t / (0.42 * speed), 0.0, 1.0)
		_knocker.rotation_degrees = sin(u * TAU * 2.0) * -14.0
	elif _knocker:
		_knocker.rotation_degrees = 0.0
	if _cat_awake and _cat_sleep:
		var awake := cat_awake > 0.0
		_cat_awake.modulate.a = 1.0 if awake else 0.0
		_cat_sleep.modulate.a = 0.0 if awake else 1.0
	if _quote_root:
		if quote_open:
			_quote_root.position = Vector2(1406 - 599, 868 - 415)
			_quote_root.scale = Vector2(2.4, 2.4)
			_quote_root.rotation_degrees = 0
			_quote_root.z_index = 5
		else:
			_quote_root.position = Vector2(1406, 868)
			_quote_root.scale = Vector2.ONE
			_quote_root.rotation_degrees = -1.5
			_quote_root.z_index = 0
	if phase == "entering":
		var k := speed
		var local := enter_t - 0.70 * k
		var u := clampf(local / (1.40 * k), 0.0, 1.0)
		var zy := UiKit.bezier_y(0.55, 0.0, 0.85, 0.35, u)
		var zoom := lerpf(1.0, 3.3, zy)
		scale = Vector2(zoom, zoom)
		pivot_offset = Vector2(960, 540)
		var fade_start := 0.88 * k
		var fade_u := clampf((local - fade_start) / (0.52 * k), 0.0, 1.0)
		modulate.a = 1.0 - fade_u
	else:
		scale = Vector2.ONE
		modulate.a = 1.0
	if not freeze and _passer and phase == "idle":
		var p := fposmod(_clock, 26.0) / 26.0
		var op := float(sky["passerOpacity"])
		if p < 0.04:
			_passer.modulate.a = 0.0
		elif p < 0.22:
			_passer.modulate.a = op
			_passer.position.x = lerpf(1940, 1540, (p - 0.04) / 0.18)
		elif p < 0.4:
			_passer.modulate.a = op * (1.0 - (p - 0.28) / 0.12)
		else:
			_passer.modulate.a = 0.0
	elif _passer and freeze:
		_passer.modulate.a = 0.0
