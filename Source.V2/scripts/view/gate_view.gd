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
var _sky: ColorRect
var _facade: TextureRect
var _facade_mat: ShaderMaterial
var _west: TextureRect
var _east: TextureRect
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


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_STOP
	set_anchors_preset(PRESET_FULL_RECT)
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


func _build() -> void:
	_rig = Control.new()
	_rig.mouse_filter = MOUSE_FILTER_IGNORE
	_rig.set_anchors_preset(PRESET_FULL_RECT)
	_rig.pivot_offset = Vector2(960, 540)
	add_child(_rig)

	var sky_layer := Control.new()
	sky_layer.mouse_filter = MOUSE_FILTER_IGNORE
	sky_layer.position = Vector2(-24, -24)
	sky_layer.size = Vector2(1968, 470)
	_rig.add_child(sky_layer)
	_sky = ColorRect.new()
	_sky.mouse_filter = MOUSE_FILTER_IGNORE
	_sky.set_anchors_preset(PRESET_FULL_RECT)
	_sky.size = sky_layer.size
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
	sky_tex.texture = gt
	sky_tex.set_anchors_preset(PRESET_FULL_RECT)
	sky_tex.mouse_filter = MOUSE_FILTER_IGNORE
	sky_tex.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	sky_tex.stretch_mode = TextureRect.STRETCH_SCALE
	sky_layer.add_child(sky_tex)
	var fx := UiKit.sprite("intro/sky_fx.png", Rect2(520, -40, 1300, 731), "contain")
	fx.modulate.a = float(sky["moon"])
	sky_layer.add_child(fx)

	var doors := Control.new()
	doors.position = Vector2(651, 474)
	doors.size = Vector2(608, 543)
	doors.mouse_filter = MOUSE_FILTER_IGNORE
	doors.clip_contents = true
	_rig.add_child(doors)
	_west = UiKit.sprite("gate/door_west.png", Rect2(0, 0, 304, 543), "fill")
	_west.pivot_offset = Vector2(0, 271)
	_east = UiKit.sprite("gate/door_east.png", Rect2(304, 0, 304, 543), "fill")
	_east.pivot_offset = Vector2(304, 271)
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
	_rig.add_child(_facade)

	_add_window_glow(192)
	_add_window_glow(1430)

	var lantern := UiKit.sprite("intro/lantern.png", Rect2(560, 330, 130, 373), "contain")
	_rig.add_child(lantern)
	var halo := ColorRect.new()
	halo.position = Vector2(560 - 160, 330 + 30)
	halo.size = Vector2(450, 450)
	halo.color = Color(1, 0.75, 0.4, 0.18 * float(sky["lanternStrength"]))
	halo.mouse_filter = MOUSE_FILTER_IGNORE
	_rig.add_child(halo)

	_sign = Control.new()
	_sign.position = Vector2(680, -30)
	_sign.size = Vector2(560, 360)
	_sign.pivot_offset = Vector2(280, 0)
	_sign.mouse_filter = MOUSE_FILTER_IGNORE
	_rig.add_child(_sign)
	_sign.add_child(UiKit.sprite("gate/sign.png", Rect2(0, 0, 560, 315), "fill"))
	var logo := UiKit.label(Content.UI["gameTitle"], Rect2(30, 88, 500, 120), 78, Color("e6bd6a"), UiKit.extrabold)
	logo.add_theme_color_override("font_shadow_color", Color(0.2, 0.1, 0.02, 0.9))
	logo.add_theme_constant_override("shadow_offset_y", 3)
	_sign.add_child(logo)
	_sign.add_child(UiKit.label(Content.UI["gateSubtitle"], Rect2(20, 214, 520, 36), 20, Color(0.91, 0.85, 0.71, 0.9)))

	_passer = UiKit.sprite("gate/customer_shadow.png", Rect2(1500, 230, 280, 780), "contain")
	_passer.modulate = Color(0.22, 0.22, 0.22, 0)
	_passer.pivot_offset = Vector2(140, 780)
	_rig.add_child(_passer)

	_cat_sleep = UiKit.sprite("intro/cat_sleep.png", Rect2(700, 922, 200, 110), "contain")
	_cat_awake = UiKit.sprite("intro/cat_awake.png", Rect2(700, 922, 200, 110), "contain")
	_cat_awake.modulate.a = 0
	_rig.add_child(_cat_sleep)
	_rig.add_child(_cat_awake)
	var cat_hit := UiKit.hit(Rect2(700, 922, 200, 110))
	cat_hit.pressed.connect(_poke_cat)
	add_child(cat_hit)

	_knocker = UiKit.sprite("intro/knocker.png", Rect2(908, 640, 94, 131), "contain")
	_knocker.pivot_offset = Vector2(47, 18)
	_rig.add_child(_knocker)
	var knock_hit := UiKit.hit(Rect2(908, 620, 110, 160))
	knock_hit.pressed.connect(begin_enter)
	add_child(knock_hit)

	var settings := UiKit.sprite("intro/lantern.png", Rect2(1764, 328, 80, 208), "contain")
	_rig.add_child(settings)
	add_child(UiKit.label(Content.UI["settings"], Rect2(1724, 530, 160, 28), 17, Color(0.91, 0.85, 0.71, 0.86)))
	var set_hit := UiKit.hit(Rect2(1764, 328, 80, 230))
	set_hit.pressed.connect(func() -> void:
		Sfx.unlock()
		open_settings.emit()
	)
	add_child(set_hit)

	_build_pin()
	_veil = ColorRect.new()
	_veil.color = Color("030204")
	_veil.set_anchors_preset(PRESET_FULL_RECT)
	_veil.mouse_filter = MOUSE_FILTER_IGNORE
	_veil.visible = phase == "boot"
	add_child(_veil)
	_panel_layer = Control.new()
	_panel_layer.set_anchors_preset(PRESET_FULL_RECT)
	_panel_layer.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(_panel_layer)
	_refresh_plaque()


func _add_window_glow(x: float) -> void:
	var g := ColorRect.new()
	g.position = Vector2(x, 390)
	g.size = Vector2(300, 400)
	g.color = Color(1, 0.69, 0.34, 0.16 * float(sky["lanternStrength"]))
	g.mouse_filter = MOUSE_FILTER_IGNORE
	_rig.add_child(g)


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
	add_child(UiKit.label(Content.UI["gateScores"], Rect2(-16, 1030, 280, 28), 20, Color(0.91, 0.85, 0.71, 0.86)))
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
	_quote_root.add_child(UiKit.label(qtext, Rect2(18, 16, 270, 110), 16, Color("4a2f16")))
	_quote_root.add_child(UiKit.label(str(quote["attribution"]), Rect2(16, 132, 200, 28), 13, Color(0.29, 0.18, 0.09, 0.7), UiKit.regular, HORIZONTAL_ALIGNMENT_LEFT))
	var qhit := UiKit.hit(Rect2(0, 0, 306, 173))
	qhit.pressed.connect(_toggle_quote)
	_quote_root.add_child(qhit)

	var plaque := UiKit.sprite("intro/plaque.png", Rect2(850, 805, 210, 97), "contain")
	add_child(plaque)
	_plaque_label = UiKit.label("", Rect2(850, 805, 210, 97), 30, Color("3a2410"), UiKit.bold)
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
	add_child(UiKit.label(Content.UI["gateStages"], Rect2(1708, 1052, 192, 26), 18, Color(0.91, 0.85, 0.71, 0.86)))
	var map_hit := UiKit.hit(Rect2(1748, 746, 112, 307))
	map_hit.pressed.connect(func() -> void: _toggle_panel("stages"))
	add_child(map_hit)

	_fresh = UiKit.parchment_button(Content.UI["gateFresh"], Rect2(900, 1002, 150, 40))
	_fresh.pressed.connect(func() -> void: _toggle_panel("confirmFresh"))
	add_child(_fresh)
	_fresh.visible = ProgressLogic.has_progress(Progress.data)


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
	scrim.set_anchors_preset(PRESET_FULL_RECT)
	scrim.gui_input.connect(func(ev: InputEvent) -> void:
		if ev is InputEventMouseButton and ev.pressed:
			panel = ""
			_refresh_panel()
	)
	_panel_layer.add_child(scrim)
	var art := "intro/map_open.png" if panel == "stages" else "intro/ledger_open.png"
	if panel == "confirmFresh":
		art = "gate/parchment.png"
	var frame := UiKit.sprite(art, Rect2(260, 146, 1400, 788), "contain")
	_panel_layer.add_child(frame)
	var title := ""
	if panel == "stages":
		title = Content.UI["gateMapTitle"]
	elif panel == "scores":
		title = Content.UI["gateLedgerTitle"]
	_panel_layer.add_child(UiKit.label(title, Rect2(260, 210, 1400, 48), 34, Color("4a2f16"), UiKit.bold))
	if panel == "stages":
		_fill_stages()
	elif panel == "scores":
		_fill_scores()
	elif panel == "confirmFresh":
		_fill_confirm()
	var close := UiKit.parchment_button("×", Rect2(280, 164, 56, 56))
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
		var name := str(st["nameFa"]) if unlocked else Content.UI["gateLocked"]
		_panel_layer.add_child(UiKit.label(name, Rect2(x - 90, y - 20, 180, 36), 20, Color("4a2f16"), UiKit.bold))
		i += 1


func _fill_scores() -> void:
	var hist: Array = Progress.data["scoreHistory"]
	if hist.is_empty():
		_panel_layer.add_child(UiKit.label(Content.UI["gateLedgerEmpty"], Rect2(360, 360, 1200, 40), 26, Color("4a2f16")))
		_panel_layer.add_child(UiKit.label(Content.UI["gateLedgerEmptyHint"], Rect2(360, 410, 1200, 40), 20, Color("6a4a2a")))
		return
	var best := float(Progress.data.get("bestScore", 0))
	_panel_layer.add_child(UiKit.label("%s  %s" % [Content.UI["gateLedgerBest"], Content.to_fa_digits(best)], Rect2(360, 280, 1200, 36), 24, Color("4a2f16"), UiKit.bold))
	var y := 340.0
	var shown := mini(8, hist.size())
	for n in shown:
		var row: Dictionary = hist[hist.size() - 1 - n]
		var line := "%s   %s   %s" % [str(row.get("customerId", "")), Content.BAND.get(str(row.get("band", "")), ""), Content.to_fa_digits(float(row.get("score", 0)))]
		_panel_layer.add_child(UiKit.label(line, Rect2(400, y, 1120, 32), 20, Color("3a2410"), UiKit.regular, HORIZONTAL_ALIGNMENT_RIGHT))
		y += 36


func _fill_confirm() -> void:
	_panel_layer.add_child(UiKit.label(Content.UI["gateFreshConfirm"], Rect2(400, 400, 1120, 80), 28, Color("4a2f16")))
	var yes := UiKit.parchment_button(Content.UI["gateFreshYes"], Rect2(980, 560, 220, 56))
	yes.pressed.connect(func() -> void:
		Game.start_fresh()
		panel = ""
		_refresh_plaque()
		_refresh_panel()
	)
	var no := UiKit.parchment_button(Content.UI["gateFreshNo"], Rect2(700, 560, 240, 56))
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
	var sc := 1.0 if busy or tilt == null else tilt.rig_scale()
	_rig.scale = Vector2(sc, sc)
	if tilt != null and not busy and tilt.mode != "off" and tilt.mode != "flat":
		_rig.rotation_degrees = tilt.px * 2.2
	else:
		_rig.rotation_degrees = 0.0
	var ang := deg_to_rad(76.0 * doors)
	var sx := cos(ang)
	if _west:
		_west.scale = Vector2(sx, 1)
	if _east:
		_east.scale = Vector2(sx, 1)
	if _glow:
		_glow.color.a = doors * 0.35
	if _sign and not freeze and not busy:
		_sign.rotation_degrees = sin(_clock / 6.0 * TAU) * 1.1
	elif _sign:
		_sign.rotation_degrees = 0.0
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
