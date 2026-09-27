extends Control
## Gate in front of the classic workshop. Logical stage is 1920×1080.

var phase := "gate"
var tilt: TiltDriver
var workshop: WorkshopView
var gate: GateView
var overlays: OverlayView
var debug: DebugPanel
var _gear: Button
var _back: Button
var _shot := ""
var _shot_out := ""
var _shot_frames := 0
var _shot_done := false
var _keys := ""
var _booted := false


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	clip_contents = true
	UiKit.ensure()
	_parse_args()
	Sfx.set_enabled(Settings.sfx_enabled)
	tilt = TiltDriver.new()
	tilt.name = "Tilt"
	add_child(tilt)
	workshop = WorkshopView.new()
	workshop.name = "Workshop"
	workshop.open_overlay.connect(func(id: String) -> void: Game.open_overlay_action(id))
	add_child(workshop)
	gate = GateView.new()
	gate.name = "Gate"
	gate.entered.connect(_on_entered)
	gate.open_settings.connect(func() -> void: Game.open_overlay_action("settings"))
	add_child(gate)
	_build_chrome()
	overlays = OverlayView.new()
	overlays.name = "Overlays"
	add_child(overlays)
	debug = DebugPanel.new()
	debug.name = "Debug"
	add_child(debug)
	if _shot != "":
		_prepare_shot()
	else:
		Sfx.start_ambience()
	_booted = true


func _parse_args() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--shot="):
			_shot = arg.substr("--shot=".length())
		elif arg.begins_with("--out="):
			_shot_out = arg.substr("--out=".length())
		elif arg.begins_with("--hour="):
			Settings.hour_override = int(arg.substr("--hour=".length()))


func _build_chrome() -> void:
	_gear = Button.new()
	_gear.text = "⚙"
	_gear.position = Vector2(12, 10)
	_gear.size = Vector2(40, 40)
	_gear.focus_mode = Control.FOCUS_NONE
	_gear.pressed.connect(func() -> void:
		Sfx.unlock()
		Game.open_overlay_action("settings")
	)
	add_child(_gear)
	_back = UiKit.parchment_button(Content.UI["gateReturn"], Rect2(14, 1036, 90, 32))
	_back.add_theme_font_size_override("font_size", 14)
	_back.pressed.connect(_go_gate)
	add_child(_back)


func _process(dt: float) -> void:
	if not _booted:
		return
	var at_gate := phase != "workshop"
	if not at_gate and not Game.is_paused():
		Game.tick(dt)
	if at_gate:
		tilt.set_enabled(gate.phase == "idle")
	else:
		tilt.set_enabled(not Game.is_paused())
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
	overlays.advance(dt)
	debug.refresh("phase %s tilt %s" % [phase, tilt.describe()])
	_capture_shot()


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
	tilt.lock_pose = true
	gate.freeze = true
	gate.force_idle()
	Game.start_fresh()
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
			Game.apply_grind_work(1.2)
		"stir":
			phase = "workshop"
			gate.visible = false
			var brew: Dictionary = Alchemy.create_brew()
			brew = Alchemy.add_ingredient(brew, "chamomile", 1.0, "fine", Game.defs)
			brew = Alchemy.advance_time(brew, 12.0, Game.defs)
			brew = Alchemy.stir(brew, Game.defs)
			Game.brew = brew
			workshop._spoon_angle = -0.2
			workshop._stirring = true
		"bottle":
			phase = "workshop"
			gate.visible = false
			var b: Dictionary = Alchemy.create_brew()
			b = Alchemy.add_ingredient(b, "mint", 1.0, "fine", Game.defs)
			b = Alchemy.advance_time(b, 16.0, Game.defs)
			Game.brew = b
			Game.bottle_brew()
			workshop.jump_pour("stream", 1.1)
		"result":
			phase = "workshop"
			gate.visible = false
			var r: Dictionary = Alchemy.create_brew()
			r = Alchemy.add_ingredient(r, "chamomile", 1.0, "fine", Game.defs)
			r = Alchemy.set_heat(r, "low", Game.defs)
			r = Alchemy.advance_time(r, 20.0, Game.defs)
			Game.brew = r
			Game.bottle_brew()
			Game.open_overlay_action("result")
			Game.deliver()
			overlays.force_reveal = true
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
			workshop.discard_t = 0.28
	if phase == "workshop":
		Sfx.stop_ambience()
		workshop._fire.set_level(0.7, true)
		workshop._fire.warm()


func _capture_shot() -> void:
	if _shot == "" or _shot_done:
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
