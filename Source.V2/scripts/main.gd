extends Control
## Gate in front of the classic workshop. Logical stage is 1920×1080.

var phase := "gate"
var tilt: TiltDriver
var workshop: WorkshopView
var gate: GateView
var overlays: OverlayView
var debug: DebugPanel
var _workshop_vp: SubViewport
var _plate: SubViewportContainer
var _chrome: CanvasLayer
var _gate_layer: CanvasLayer
var _letterbox: TextureRect
var _stage_origin := Vector2.ZERO
var _plate_frames := 0
var _gear: BaseButton
var _back: Button
var _v2: Button
var _shot := ""
var _shot_out := ""
var _tilt_pose: Variant = null
var _start_workshop := false
var _shot_frames := 0
var _shot_done := false
const _FilmHarness := preload("res://tools/film_harness.gd")
var _harness = null
var _keys := ""
var _booted := false
var _probe_t := 0.0
var _probed := false
var _profile := false
var _frametime := false
var _ft_acc := 0.0
var _ft_frames := 0
var _ft_print := 0.0
var _ft_label: Label
var _prof_stage := 0
var _prof_left := 45
var _prof_name := "warmup"
var _prof_n := 0
var _prof_frame_ms := 0.0
var _prof_process_ms := 0.0
var _prof_physics_ms := 0.0
var _prof_draws := 0.0
var _prof_objects := 0.0
var _prof_fps := 0.0
var _prof_audio_us := 0.0
var _prof_audio_frames := 0.0
var _prof_worst_ms := 0.0
var _prof_tex := 0.0


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	clip_contents = true
	UiKit.ensure()
	_parse_args()
	Sfx.set_enabled(Settings.sfx_enabled)
	tilt = TiltDriver.new()
	tilt.name = "Tilt"
	add_child(tilt)
	if _tilt_pose is Vector2:
		var forced: Vector2 = _tilt_pose
		tilt.force_pose(forced.x, forced.y)
	# .stage-letterbox — radial-gradient(120% 120% at 50% 50%, #120c08, #060403).
	# expand makes the viewport the whole window, so this can fill the margins
	# around the centered 1920×1080 stage. On 16:9 the stage covers it.
	_letterbox = TextureRect.new()
	_letterbox.name = "Letterbox"
	_letterbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_letterbox.texture = _letterbox_texture()
	_letterbox.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_letterbox.stretch_mode = TextureRect.STRETCH_SCALE
	_letterbox.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	_letterbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_letterbox)
	# The workshop is a picture under the gate. Its sprites live in their own
	# viewport, so a child z_index cannot paint over the facade.
	_plate = SubViewportContainer.new()
	_plate.name = "WorkshopPlate"
	_plate.stretch = true
	_plate.mouse_filter = Control.MOUSE_FILTER_IGNORE
	UiKit.fill(_plate)
	_plate.size = Vector2(1920, 1080)
	_workshop_vp = SubViewport.new()
	_workshop_vp.name = "WorkshopViewport"
	_workshop_vp.disable_3d = true
	_workshop_vp.transparent_bg = false
	_workshop_vp.size = Vector2i(1920, 1080)
	_workshop_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_workshop_vp.canvas_item_default_texture_filter = Viewport.DEFAULT_CANVAS_ITEM_TEXTURE_FILTER_LINEAR
	_plate.add_child(_workshop_vp)
	add_child(_plate)
	workshop = WorkshopView.new()
	workshop.name = "Workshop"
	workshop.open_overlay.connect(func(id: String) -> void: Game.open_overlay_action(id))
	_workshop_vp.add_child(workshop)
	_gate_layer = CanvasLayer.new()
	_gate_layer.name = "GateLayer"
	_gate_layer.layer = 1
	add_child(_gate_layer)
	gate = GateView.new()
	gate.name = "Gate"
	gate.entered.connect(_on_entered)
	gate.open_settings.connect(func() -> void: Game.open_overlay_action("settings"))
	_gate_layer.add_child(gate)
	_chrome = CanvasLayer.new()
	_chrome.name = "ChromeLayer"
	_chrome.layer = 2
	add_child(_chrome)
	_build_chrome()
	overlays = OverlayView.new()
	workshop.overlay = overlays
	overlays.name = "Overlays"
	_chrome.add_child(overlays)
	debug = DebugPanel.new()
	debug.name = "Debug"
	_chrome.add_child(debug)
	if _frametime:
		_ft_label = UiKit.label("frame", Rect2(760, 8, 400, 28), 18, Color("f4e2b4"))
		_ft_label.clip_text = false
		_chrome.add_child(_ft_label)
	if _shot != "":
		_prepare_shot()
	else:
		Sfx.start_ambience()
		if _start_workshop:
			_open_workshop_now()
	_booted = true
	resized.connect(_layout_stage)
	call_deferred("_layout_stage")
	print("viewport ", get_viewport().get_visible_rect().size, " window ", DisplayServer.window_get_size())


func _layout_stage() -> void:
	# The container owns the viewport size while stretch is on.
	var vp := get_viewport().get_visible_rect().size
	var safe := _safe_insets()
	var fit: Script = load("res://scripts/engine/stage_fit.gd")
	_stage_origin = fit.origin(vp, safe)
	if _plate:
		_plate.position = _stage_origin
		_plate.size = Vector2(1920, 1080)
	if _gate_layer:
		_gate_layer.offset = _stage_origin
	if overlays:
		overlays.position = _stage_origin
	if debug:
		debug.position = _stage_origin
	if _gear:
		_gear.position = fit.gear_position(safe)
	var py: float = fit.pill_y(vp.y)
	if _v2:
		_v2.position = Vector2(14, py)
	if _back:
		_back.position = Vector2(130, py)
	print("stage origin ", _stage_origin, " viewport ", vp, " safe ", safe)


func _safe_insets() -> Vector4:
	var win := DisplayServer.window_get_size()
	var safe := DisplayServer.get_display_safe_area()
	if win.x <= 0 or win.y <= 0 or safe.size.x <= 0 or safe.size.y <= 0:
		return Vector4.ZERO
	var vp := get_viewport().get_visible_rect().size
	var sx := vp.x / float(win.x)
	var sy := vp.y / float(win.y)
	var at := DisplayServer.window_get_position()
	var left := float(safe.position.x - at.x) * sx
	var top := float(safe.position.y - at.y) * sy
	var right := float(at.x + win.x - safe.end.x) * sx
	var bottom := float(at.y + win.y - safe.end.y) * sy
	return Vector4(maxf(0.0, left), maxf(0.0, top), maxf(0.0, right), maxf(0.0, bottom))


func _letterbox_texture() -> Texture2D:
	# Ellipse radii are 120% of the box, matching the CSS gradient size.
	var n := 128
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	var inner := Color.html("#120c08")
	var outer := Color.html("#060403")
	for y in n:
		for x in n:
			var u := (float(x) + 0.5) / float(n) - 0.5
			var v := (float(y) + 0.5) / float(n) - 0.5
			var t := clampf(sqrt((u / 1.2) * (u / 1.2) + (v / 1.2) * (v / 1.2)), 0.0, 1.0)
			img.set_pixel(x, y, inner.lerp(outer, t))
	return ImageTexture.create_from_image(img)


func _exit_tree() -> void:
	UiKit.shutdown()


func _parse_args() -> void:
	# Engine args first, then user args after `--`, so `-- --hour=N` wins.
	_scan_args(OS.get_cmdline_args())
	_scan_args(OS.get_cmdline_user_args())
	if _shot.begins_with("spoon-film") or _shot.begins_with("stir-film") or _shot.begins_with("grind-film") or _shot.begins_with("grind-live"):
		_harness = _FilmHarness.new()
		_harness.setup(_shot)


func _scan_args(args: PackedStringArray) -> void:
	for arg in args:
		if arg.begins_with("--shot="):
			_shot = arg.substr("--shot=".length())
		elif arg.begins_with("--out="):
			_shot_out = arg.substr("--out=".length())
		elif arg.begins_with("--hour="):
			var h = Content.hour_from_flag(arg)
			if h != null:
				Settings.hour_override = h
		elif arg.begins_with("--tilt="):
			var parsed: Variant = TiltMath.pose_from_flag(arg)
			if parsed is Vector2:
				_tilt_pose = parsed
		elif arg == "--workshop":
			_start_workshop = true
		elif arg == "--profile":
			_profile = true
		elif arg == "--frametime":
			_frametime = true
		elif arg.begins_with("--effects="):
			Settings.effects_enabled = arg.substr("--effects=".length()) != "0"


func _build_chrome() -> void:
	# settings-button.css — 40×40 circle at (12, 10). The node is larger so the
	# drop shadow is not clipped; the disc itself stays on that rect.
	_gear = TextureButton.new()
	_gear.texture_normal = _settings_gear_texture()
	_gear.ignore_texture_size = true
	_gear.stretch_mode = TextureButton.STRETCH_SCALE
	_gear.position = Vector2(4, 2)
	_gear.custom_minimum_size = Vector2.ZERO
	_gear.size = Vector2(56, 56)
	_gear.focus_mode = Control.FOCUS_NONE
	_gear.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	_gear.pressed.connect(func() -> void:
		Sfx.unlock()
		Game.open_overlay_action("settings")
	)
	_chrome.add_child(_gear)
	# scene.css .classic-corner-links — RTL flex at inline-end 14, bottom 12.
	# First child is «سردر», then «نسخه ۲», so the version chip sits on the left.
	_v2 = _corner_pill("نسخه ۲", Rect2(14, 1038, 108, 30))
	_back = _corner_pill(Content.UI["gateReturn"], Rect2(130, 1038, 84, 30))
	_back.pressed.connect(_go_gate)
	_chrome.add_child(_v2)
	_chrome.add_child(_back)


func _settings_gear_texture() -> Texture2D:
	# 56px canvas: 40px disc centered so it lands on screen (12, 10) when the
	# button sits at (4, 2). settings-button.css radial + 20px stroked gear.
	var n := 56
	var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var center := Vector2(28.0, 28.0)
	var radius := 20.0
	var ink := Color(233.0 / 255.0, 217.0 / 255.0, 180.0 / 255.0, 0.82)
	for y in n:
		for x in n:
			var p := Vector2(float(x) + 0.5, float(y) + 0.5)
			var d := p.distance_to(center)
			var col := Color(0, 0, 0, 0)
			var shadow_d := p.distance_to(center + Vector2(0, 2))
			if shadow_d > radius and shadow_d < radius + 7.0:
				var k := 1.0 - (shadow_d - radius) / 7.0
				col = Color(0, 0, 0, 0.40 * k * k)
			if d <= radius:
				var hx := center.x - radius + 0.35 * radius * 2.0
				var hy := center.y - radius + 0.30 * radius * 2.0
				var hd := clampf(p.distance_to(Vector2(hx, hy)) / (radius * 1.55), 0.0, 1.0)
				var inner := Color(80.0 / 255.0, 52.0 / 255.0, 24.0 / 255.0, 1.0)
				var outer := Color(16.0 / 255.0, 10.0 / 255.0, 6.0 / 255.0, 1.0)
				col = inner.lerp(outer, hd)
				if d > radius - 1.15:
					var edge := clampf((d - (radius - 1.15)) / 1.15, 0.0, 1.0)
					col = col.lerp(Color(233.0 / 255.0, 217.0 / 255.0, 180.0 / 255.0, 1.0), edge * 0.35)
				col.a = 0.8
				if _gear_ink(p - center):
					col = Color(ink.r, ink.g, ink.b, 0.82 * 0.8)
			if col.a > 0.004:
				img.set_pixel(x, y, col)
	return ImageTexture.create_from_image(img)


func _gear_ink(local: Vector2) -> bool:
	# ViewBox 24 mapped onto a 20px icon. Stroke ~1.6.
	var u := local * (24.0 / 20.0)
	var r := u.length()
	if r < 0.4:
		return false
	var tooth := cos(atan2(u.y, u.x) * 8.0)
	var edge := 7.55 + 2.55 * clampf((tooth + 0.15) / 1.15, 0.0, 1.0)
	var stroke := 1.25
	var hole := 3.35
	if absf(r - hole) <= stroke * 0.55:
		return true
	if r > hole + stroke and absf(r - edge) <= stroke * 0.55:
		return true
	# Sides of each tooth, between the valley and the tip.
	if r > 7.3 and r < edge - 0.2 and absf(tooth) < 0.22:
		return true
	return false


func _corner_pill(text: String, rect: Rect2) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.clip_text = false
	UiKit.ensure()
	b.add_theme_font_override("font", UiKit.regular)
	b.add_theme_font_size_override("font_size", 14)
	b.add_theme_color_override("font_color", Color(0.914, 0.851, 0.706, 0.6))
	b.add_theme_color_override("font_hover_color", Color(0.914, 0.851, 0.706, 0.95))
	b.text_direction = Control.TEXT_DIRECTION_RTL
	var pill := StyleBoxFlat.new()
	pill.bg_color = Color(16.0 / 255.0, 10.0 / 255.0, 6.0 / 255.0, 0.55)
	pill.border_color = Color(0.914, 0.851, 0.706, 0.22)
	pill.set_border_width_all(1)
	pill.set_corner_radius_all(14)
	pill.content_margin_left = 16
	pill.content_margin_right = 16
	pill.content_margin_top = 5
	pill.content_margin_bottom = 5
	b.add_theme_stylebox_override("normal", pill)
	b.add_theme_stylebox_override("hover", pill)
	b.add_theme_stylebox_override("pressed", pill)
	b.add_theme_stylebox_override("focus", pill)
	b.modulate.a = 0.55
	b.mouse_entered.connect(func() -> void: b.modulate.a = 1.0)
	b.mouse_exited.connect(func() -> void: b.modulate.a = 0.55)
	UiKit.place(b, rect)
	b.size = rect.size
	return b


func _process(dt: float) -> void:
	if not _booted:
		return
	var at_gate := phase != "workshop"
	if _harness != null:
		dt = _harness.adjust_dt(dt, _shot_frames)
	if not at_gate and not Game.is_paused():
		Game.tick(dt)
	if at_gate:
		tilt.set_enabled(gate.phase == "idle")
	else:
		tilt.set_enabled(not Game.is_paused())
	_sync_plate(at_gate)
	var frozen := _workshop_vp != null and _workshop_vp.render_target_update_mode == SubViewport.UPDATE_DISABLED
	if not frozen:
		workshop.advance(dt, tilt, phase == "workshop")
	if at_gate:
		workshop.set_dusk(gate.dusk_opacity() if gate.phase == "entering" else 1.0)
		gate.visible = true
		gate.advance(dt, tilt)
	else:
		gate.visible = false
		workshop.set_behind(false)
	_gear.visible = phase == "workshop"
	_back.visible = phase == "workshop"
	if _v2:
		_v2.visible = phase == "workshop"
	overlays.advance(dt)
	debug.refresh("phase %s tilt %s" % [phase, tilt.describe()])
	_probe_t += dt
	if not _profile and not _probed and _probe_t >= 3.2:
		_probed = true
		_print_grade_probe()
	if _frametime:
		_tick_frametime(dt)
	_capture_shot()
	if _profile:
		_profile_tick(dt)


func _sync_plate(at_gate: bool) -> void:
	if _workshop_vp == null:
		return
	_plate_frames += 1
	var covered := at_gate and gate.doors < 0.02 and gate.phase != "opening" and gate.phase != "entering"
	if covered and _plate_frames >= 2:
		_workshop_vp.render_target_update_mode = SubViewport.UPDATE_DISABLED
	else:
		_workshop_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	if _plate:
		_plate.mouse_filter = Control.MOUSE_FILTER_IGNORE if at_gate else Control.MOUSE_FILTER_STOP


func _open_workshop_now() -> void:
	Settings.mark_intro_seen()
	phase = "workshop"
	gate.visible = false
	workshop.set_behind(false)
	Sfx.stop_ambience()
	Sfx.set_fire(0.7)


func _on_entered() -> void:
	phase = "workshop"
	Sfx.stop_ambience()
	workshop.set_behind(false)
	var heat: float = float({"low": 0.35, "medium": 0.7, "high": 1.0}.get(str(Game.brew["currentHeat"]), 0.7))
	Sfx.set_fire(heat)


func _go_gate() -> void:
	phase = "gate"
	gate.visible = true
	gate.phase = "idle"
	gate.doors = 0.0
	gate.enter_t = 0.0
	gate.modulate.a = 1.0
	gate.scale = Vector2.ONE
	workshop.set_behind(true)
	Sfx.start_ambience()
	Sfx.set_fire(0.0)
	Sfx.set_simmer(0.0)


func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventKey and ev.pressed and not ev.echo:
		if ev.keycode == KEY_D and ev.shift_pressed:
			Game.toggle_debug()
		var ch := char(ev.unicode).to_lower()
		if ch >= "a" and ch <= "z":
			_keys = (_keys + ch).substr(maxi(0, _keys.length() + 1 - 3))
			if _keys.ends_with("dbg"):
				Game.toggle_debug()
	if ev is InputEventMouseButton and ev.pressed:
		Sfx.unlock()


func _prepare_shot() -> void:
	Settings.mark_intro_seen()
	overlays.force_reveal = true
	# Candle flicker is a live sine. Shots stay on the t = 0 pose so hour-17
	# colour samples do not drift.
	workshop.pin_flicker = true
	tilt.lock_pose = true
	gate.freeze = true
	gate.force_idle()
	Game.start_fresh()
	workshop.hold_camera = true
	match _shot:
		"gate":
			phase = "gate"
		"entering":
			phase = "gate"
			gate.speed = 0.6
			gate.phase = "entering"
			gate.enter_t = 0.70 * 0.6 + 0.70
			gate.doors = 1.0
			gate._knocked2 = true
			gate._belled = true
		"idle":
			phase = "workshop"
			gate.visible = false
		"request":
			phase = "workshop"
			gate.visible = false
			Game.open_overlay_action("customer_request")
		"grind":
			phase = "workshop"
			gate.visible = false
			Game.add_classic_unit("chamomile")
			Game.start_grinding()
			# Web grind frame is 60ms after applyGrindWork(2.14), pestle just in the bowl.
			Game.apply_grind_work(2.14)
			# Pestle beat matches the web at 60ms (still on the lift, head in the bowl).
			# The focus overlay on that same frame is already partway through its
			# 0.65s fade — the captured web edge is about 0.14s into the ease.
			_warm_workshop(0.06)
			workshop._focus_t = 0.14
			if workshop._vignette_mat:
				workshop._vignette_mat.set_shader_parameter("grind", workshop._css_ease(0.14 / 0.65))
		"mortar":
			phase = "workshop"
			gate.visible = false
			Game.add_classic_unit("chamomile")
			_warm_workshop(0.75)
		"transfer":
			phase = "workshop"
			gate.visible = false
			Game.add_classic_unit("chamomile")
			Game.start_grinding()
			Game.apply_grind_work(2.0)
			_warm_workshop(0.35)
			workshop.jump_transfer(2.35)
		"scoop", "spoon-pour":
			phase = "workshop"
			gate.visible = false
			Game.add_classic_unit("chamomile")
			Game.start_grinding()
			Game.apply_grind_work(2.0)
			_warm_workshop(0.35)
			workshop.jump_transfer(1.49 if _shot == "scoop" else 3.20)
		"spoon-film", "spoon-film-wide", "stir-film", "stir-film-wide", "grind-film", "grind-film-wide", "grind-live", "grind-live-wide":
			if _harness != null:
				_harness.prepare(self)
		"gate-stages":
			phase = "gate"
			gate.panel = "stages"
			gate._refresh_panel()
		"boil-low":
			_boil_shot("low")
		"boil-medium":
			_boil_shot("medium")
		"boil-high":
			_boil_shot("high")
		"stir":
			phase = "workshop"
			gate.visible = false
			# Ready chamomile, spoon still in the pot: the bottle hint is up,
			# matching a finished stir on the web.
			var brew: Dictionary = Alchemy.create_brew()
			brew = Alchemy.add_ingredient(brew, "chamomile", 1.0, "fine", Game.defs)
			brew = Alchemy.advance_time(brew, 16.0, Game.defs)
			brew = Alchemy.stir(brew, Game.defs)
			Game.brew = brew
			workshop._spoon_angle = -0.2
			workshop._stirring = true
			_seed_brush_residue()
			_warm_workshop(0.35)
		"bottle":
			phase = "workshop"
			gate.visible = false
			# Chamomile, cooked and stirred: yellow-green liquor and the restful toast.
			var b: Dictionary = Alchemy.create_brew()
			b = Alchemy.add_ingredient(b, "chamomile", 1.0, "fine", Game.defs)
			b = Alchemy.advance_time(b, 16.0, Game.defs)
			b = Alchemy.stir(b, Game.defs)
			Game.brew = b
			Game.bottle_brew()
			# Click is immediate; the frame is 1.1s later, mid-stream. Chips sink
			# during that wait, and the 900ms auto-stir has the ladle 0.2s into
			# its entrance. Hold the pour so the extra sim time does not deliver.
			workshop.jump_pour("stream", 1.1)
			workshop.hold_pour = true
			overlays.prime_toast(1.05)
			_seed_brush_residue()
			_warm_workshop(1.1)
		"bottle-low", "bottle-high":
			phase = "workshop"
			gate.visible = false
			var bl: Dictionary = Alchemy.create_brew()
			bl = Alchemy.add_ingredient(bl, "chamomile", 1.0, "fine", Game.defs)
			bl = Alchemy.add_ingredient(bl, "saffron", 1.0, "fine", Game.defs)
			bl = Alchemy.advance_time(bl, 16.0, Game.defs)
			bl = Alchemy.stir(bl, Game.defs)
			Game.brew = bl
			Game.bottle_brew()
			# The pause veil would grey the liquor. These frames are the glass.
			Game.result = null
			workshop.jump_pour("stream", 0.74 if _shot == "bottle-low" else 1.58)
			workshop.hold_pour = true
			overlays.prime_toast(1.05)
			_seed_brush_residue()
			_warm_workshop(1.1)
		"bottle-corked":
			phase = "workshop"
			gate.visible = false
			var bc: Dictionary = Alchemy.create_brew()
			bc = Alchemy.add_ingredient(bc, "chamomile", 1.0, "fine", Game.defs)
			bc = Alchemy.add_ingredient(bc, "saffron", 1.0, "fine", Game.defs)
			bc = Alchemy.advance_time(bc, 16.0, Game.defs)
			bc = Alchemy.stir(bc, Game.defs)
			Game.brew = bc
			Game.bottle_brew()
			Game.result = null
			workshop.pour = ""
			_seed_brush_residue()
			_warm_workshop(0.2)
		"refill":
			phase = "workshop"
			gate.visible = false
			var rf: Dictionary = Alchemy.create_brew()
			rf = Alchemy.add_ingredient(rf, "ginger", 1.0, "crushed", Game.defs)
			Game.brew = rf
			workshop.begin_discard()
			for _i in 260:
				workshop.advance(1.0 / 60.0, tilt, true)
				if str(workshop._brew.spawn_phase) == "settle" and float(workshop._brew.fill) > 0.32 and float(workshop._brew.fill) < 0.72:
					break
			workshop._sync_liquid()
		"bottle-empty":
			phase = "workshop"
			gate.visible = false
			Game.brew = Alchemy.create_brew()
			workshop.pour = ""
			_seed_brush_residue()
			_warm_workshop(0.15)
		"carry", "carry-mint", "carry-borage", "carry-saffron":
			phase = "workshop"
			gate.visible = false
			var id_a := "chamomile"
			var id_b := "saffron"
			if _shot == "carry-mint":
				id_a = "mint"
				id_b = "mint"
			elif _shot == "carry-borage":
				id_a = "borage"
				id_b = "borage"
			elif _shot == "carry-saffron":
				id_a = "saffron"
				id_b = "saffron"
			var cr: Dictionary = Alchemy.create_brew()
			cr = Alchemy.add_ingredient(cr, id_a, 1.0, "fine", Game.defs)
			cr = Alchemy.add_ingredient(cr, id_b, 1.0, "fine", Game.defs)
			cr = Alchemy.advance_time(cr, 16.0, Game.defs)
			cr = Alchemy.stir(cr, Game.defs)
			Game.brew = cr
			Game.bottle_brew()
			Game.result = null
			Game.evaluation = {"band": "good", "reactionFa": "گرفت", "score": 1}
			workshop.pour = ""
			workshop.jump_customer("leave", 0.28)
			workshop._park_bottle()
			workshop._pickup_bottle(1.0)
			workshop._tick_carry(0.0)
			workshop._sync_liquid()
			_seed_brush_residue()
		"bottle-desk":
			phase = "workshop"
			gate.visible = false
			var bd: Dictionary = Alchemy.create_brew()
			bd = Alchemy.add_ingredient(bd, "chamomile", 1.0, "fine", Game.defs)
			bd = Alchemy.add_ingredient(bd, "saffron", 1.0, "fine", Game.defs)
			bd = Alchemy.advance_time(bd, 16.0, Game.defs)
			bd = Alchemy.stir(bd, Game.defs)
			Game.brew = bd
			Game.bottle_brew()
			Game.result = null
			Game.evaluation = null
			workshop.pour = ""
			workshop.jump_customer("idle", 0.4)
			workshop._park_bottle()
			workshop._sync_liquid()
			_seed_brush_residue()
			_warm_workshop(0.15)
		"receive", "receive-reject":
			_receive_shot("chamomile")
		"receive-accept":
			_receive_shot("saffron")
		"result":
			_result_shot("chamomile")
		"result-ok":
			_result_shot("saffron")
		"drop":
			phase = "workshop"
			gate.visible = false
			workshop.jump_drop("chamomile")
		"arrive":
			phase = "workshop"
			gate.visible = false
			workshop.jump_customer("enter", 0.48)
		"depart":
			phase = "workshop"
			gate.visible = false
			workshop.jump_customer("leave", 0.42)
		"notebook":
			phase = "workshop"
			gate.visible = false
			Game.used_ingredient_ids = ["chamomile"]
			Game.open_overlay_action("notebook")
		"settings":
			phase = "workshop"
			gate.visible = false
			Game.open_overlay_action("settings")
		"discard":
			phase = "workshop"
			gate.visible = false
			var d: Dictionary = Alchemy.create_brew()
			d = Alchemy.add_ingredient(d, "ginger", 1.0, "crushed", Game.defs)
			Game.brew = d
			workshop.begin_discard()
			workshop.discard_t = 0.70
			workshop.jump_shake("hit", 0.10)
		"steam":
			phase = "workshop"
			gate.visible = false
			var st: Dictionary = Alchemy.create_brew()
			st = Alchemy.add_ingredient(st, "chamomile", 1.0, "fine", Game.defs)
			st = Alchemy.add_ingredient(st, "saffron", 1.0, "fine", Game.defs)
			st = Alchemy.advance_time(st, 12.0, Game.defs)
			st = Alchemy.stir(st, Game.defs)
			Game.brew = st
			_warm_workshop(2.2)
		"pot":
			phase = "workshop"
			gate.visible = false
			var pot: Dictionary = Alchemy.create_brew()
			pot = Alchemy.add_ingredient(pot, "chamomile", 1.0, "fine", Game.defs)
			pot = Alchemy.advance_time(pot, 12.0, Game.defs)
			pot = Alchemy.stir(pot, Game.defs)
			Game.brew = pot
			workshop._spoon_angle = -0.2
			workshop._stirring = true
			_warm_workshop(1.6)
			workshop.jump_pot_closeup()
		"tilt":
			phase = "gate"
			tilt.hold_pose(0.62, -0.38)
	if phase == "workshop":
		Sfx.stop_ambience()
		# Boil frames already simulated the fire for 0.8s. Snapping it to a fully
		# warmed field makes the high flame brighter than the web at that moment.
		if not _shot.begins_with("boil"):
			var heat_name := str(Game.brew.get("currentHeat", "medium"))
			var fire_level := float({"low": 0.35, "medium": 0.7, "high": 1.0}.get(heat_name, 0.7))
			workshop._fire.set_level(fire_level, true)
			workshop._fire.warm()
	# The screenshot is a few real frames later. On software GL those frames are
	# long enough to carry the spoon, raise the fire, and turn the pestle.
	workshop.hold_sim = true
	if _harness != null:
		_harness.arm(self)


func _boil_shot(heat_name: String) -> void:
	phase = "workshop"
	gate.visible = false
	# Stirred, but still extracting, so neither the stir hint nor the bottle
	# hint is up. The pestle stays in its empty-mortar lean beside the bowl.
	var brew: Dictionary = Alchemy.create_brew()
	brew = Alchemy.add_ingredient(brew, "chamomile", 1.0, "fine", Game.defs)
	brew = Alchemy.set_heat(brew, heat_name, Game.defs)
	brew = Alchemy.advance_time(brew, 5.0, Game.defs)
	brew = Alchemy.stir(brew, Game.defs)
	Game.brew = brew
	# The web frame is 800ms after the brew appears. Auto-stir is 900ms, so the
	# ladle is not in the pot yet; steam at high heat has had time to rise.
	workshop.block_auto_stir = true
	_seed_brush_residue()
	_warm_workshop(0.8)


func _result_shot(ingredient_id: String) -> void:
	phase = "workshop"
	gate.visible = false
	var r: Dictionary = Alchemy.create_brew()
	r = Alchemy.add_ingredient(r, ingredient_id, 1.0, "fine", Game.defs)
	r = Alchemy.set_heat(r, "low", Game.defs)
	r = Alchemy.advance_time(r, 20.0, Game.defs)
	Game.brew = r
	Game.bottle_brew()
	Game.open_overlay_action("result")
	Game.deliver()
	overlays.force_reveal = true


func _tick_frametime(dt: float) -> void:
	_ft_acc += dt
	_ft_frames += 1
	_ft_print += dt
	if _ft_acc < 0.5 or _ft_label == null:
		return
	var fps := float(_ft_frames) / _ft_acc
	var ms := _ft_acc / float(_ft_frames) * 1000.0
	_ft_label.text = "frame %.1f ms   %.0f fps" % [ms, fps]
	_ft_acc = 0.0
	_ft_frames = 0
	if _ft_print >= 2.0:
		_ft_print = 0.0
		print("FRAMETIME fps=%.1f ms=%.2f" % [fps, ms])


func _receive_shot(ingredient_id: String) -> void:
	phase = "workshop"
	gate.visible = false
	var got: Dictionary = Alchemy.create_brew()
	got = Alchemy.add_ingredient(got, ingredient_id, 1.0, "fine", Game.defs)
	got = Alchemy.advance_time(got, 18.0, Game.defs)
	got = Alchemy.stir(got, Game.defs)
	Game.brew = got
	Game.bottle_brew()
	# The web frame is 3.6s after the click. The pour has finished, so the shelf
	# bottle is back and there is no stream; the auto-stir ladle is still in the
	# pot; the reaction has been up for 0.9s with the softened vignette.
	Game.discovery_queue = []
	workshop.pour = "tilt"
	workshop.pour_t = 0.0
	_seed_brush_residue()
	_warm_workshop(3.6)
	overlays.prime_reveal(0.9)


func _seed_brush_residue() -> void:
	# The web brush stays after a scoop because residue lives outside the store.
	# Boil, stir, bottle, and receive are captured after that transfer.
	if workshop._pile:
		workshop._pile.seed_residue("#c6a24e", 0.55)


func _warm_workshop(seconds: float) -> void:
	var steps := int(round(seconds * 60.0))
	for _i in steps:
		if not Game.is_paused():
			Game.tick(1.0 / 60.0)
		workshop.advance(1.0 / 60.0, tilt, true)


func _print_grade_probe() -> void:
	var adapter := RenderingServer.get_video_adapter_name()
	var hour_n := 0
	if Settings.hour_override == null:
		hour_n = int(Time.get_datetime_dict_from_system()["hour"])
	else:
		hour_n = int(Settings.hour_override)
	var img := get_viewport().get_texture().get_image()
	var sky_s := "none"
	var brick_s := "none"
	if img != null:
		# (200, 40) is open sky on the gate. (1400, 450) is facade brick at dusk.
		# On a wide window those sit on the centered stage, not the window corner.
		var ox := int(_stage_origin.x)
		var oy := int(_stage_origin.y)
		var sky_px := img.get_pixel(ox + 200, oy + 40)
		var brick_px := img.get_pixel(ox + 1400, oy + 450)
		sky_s = "%d,%d,%d" % [sky_px.r8, sky_px.g8, sky_px.b8]
		brick_s = "%d,%d,%d" % [brick_px.r8, brick_px.g8, brick_px.b8]
	print("grade adapter=\"%s\" hour=%d time=%s phase=%s path=%s hue=%.1f bright=%.2f tint_op=%.2f sky_px=%s brick_px=%s" % [
		adapter, hour_n, gate.time_name, phase, gate.grade_path, gate.grade_hue, gate.grade_bright, gate.grade_tint_op, sky_s, brick_s
	])


func _profile_reset(name: String, frames: int) -> void:
	_prof_name = name
	_prof_left = frames
	_prof_n = 0
	_prof_frame_ms = 0.0
	_prof_process_ms = 0.0
	_prof_physics_ms = 0.0
	_prof_draws = 0.0
	_prof_objects = 0.0
	_prof_fps = 0.0
	_prof_audio_us = 0.0
	_prof_audio_frames = 0.0
	_prof_worst_ms = 0.0
	_prof_tex = 0.0


func _profile_sample(dt: float) -> void:
	var frame_ms := dt * 1000.0
	_prof_n += 1
	_prof_frame_ms += frame_ms
	_prof_process_ms += Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0
	_prof_physics_ms += Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0
	_prof_draws += Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
	_prof_objects += Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME)
	_prof_fps += Performance.get_monitor(Performance.TIME_FPS)
	_prof_tex = Performance.get_monitor(Performance.RENDER_TEXTURE_MEM_USED)
	_prof_audio_us += float(Sfx.prof_mix_us)
	_prof_audio_frames += float(Sfx.prof_mix_frames)
	if frame_ms > _prof_worst_ms:
		_prof_worst_ms = frame_ms


func _profile_emit() -> void:
	var n := maxi(_prof_n, 1)
	print("PROFILE phase=%s n=%d fps=%.1f frame_ms=%.2f process_ms=%.2f physics_ms=%.2f draws=%.1f objects=%.1f tex_mb=%.1f audio_us=%.0f audio_frames=%.0f worst_ms=%.2f" % [
		_prof_name,
		_prof_n,
		_prof_fps / float(n),
		_prof_frame_ms / float(n),
		_prof_process_ms / float(n),
		_prof_physics_ms / float(n),
		_prof_draws / float(n),
		_prof_objects / float(n),
		_prof_tex / (1024.0 * 1024.0),
		_prof_audio_us / float(n),
		_prof_audio_frames / float(n),
		_prof_worst_ms,
	])


func _profile_tick(dt: float) -> void:
	if _prof_stage == 0 and _prof_n == 0 and _prof_left == 45:
		Settings.mark_intro_seen()
		gate.force_idle()
		Sfx.unlock()
		Sfx.start_ambience()
	if _prof_stage > 0:
		_profile_sample(dt)
	if _prof_stage == 2 and phase == "workshop" and _prof_n >= 8:
		_prof_left = 1
	_prof_left -= 1
	if _prof_left > 0:
		return
	if _prof_stage > 0:
		_profile_emit()
	_prof_stage += 1
	match _prof_stage:
		1:
			_profile_reset("gate_idle", 90)
		2:
			gate.begin_enter()
			_profile_reset("transition", 150)
		3:
			if phase != "workshop":
				_open_workshop_now()
			_profile_reset("workshop_idle", 90)
		4:
			Game.add_classic_unit("chamomile")
			Game.start_grinding()
			_profile_reset("grind", 90)
		5:
			Game.apply_grind_work(4.0)
			var brew: Dictionary = Alchemy.create_brew()
			brew = Alchemy.add_ingredient(brew, "chamomile", 1.0, "fine", Game.defs)
			brew = Alchemy.advance_time(brew, 16.0, Game.defs)
			Game.brew = brew
			Game.bottle_brew()
			workshop.jump_pour("tilt", 0.0)
			_profile_reset("pour", 90)
		_:
			print("PROFILE done")
			get_tree().quit(0)


func _capture_shot() -> void:
	if _shot == "" or _shot_done:
		return
	if _harness != null and _harness.capturing():
		_harness.on_frame(self)
		return
	_shot_frames += 1
	if _shot_frames == 4:
		_shot_done = true
		call_deferred("_save_shot")


func _save_shot() -> void:
	await RenderingServer.frame_post_draw
	var path := _shot_out
	if path == "":
		path = "user://shot-%s.png" % _shot
	var img := get_viewport().get_texture().get_image()
	var dir := path.get_base_dir()
	if dir != "" and not DirAccess.dir_exists_absolute(dir):
		DirAccess.make_dir_recursive_absolute(dir)
	var err := img.save_png(path)
	print("SHOT ", path, " ", err, " ", img.get_width(), "x", img.get_height())
	get_tree().quit(0 if err == OK else 1)
