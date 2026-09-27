class_name TiltDriver
extends Node
## Runtime tilt: pointer on desktop, gravity on device. Same clamps as tiltMath.

var px := 0.0
var py := 0.0
var mode := "lite"
var tier := "medium"
var reduced := false
var latched_off := false
var _target_px := 0.0
var _target_py := 0.0
var _gyro_live := false
var _base_beta := 0.0
var _base_gamma := 0.0
var _baseline: Array = []
var _smooth := 3.8
var _frame_ms: Array = []
var _last_usec := 0
var _cooldown_until := 0
var _auto_dropped := false
var _enabled := true
var lock_pose := false


func _ready() -> void:
	var cores := OS.get_processor_count()
	tier = QualityProbe.detect_ceiling(cores, 0.0, 1.0, OS.get_name() == "Android")
	if Settings.quality_tier != "":
		tier = Settings.quality_tier
	mode = TiltMath.tilt_mode_for(tier, reduced, latched_off)


func set_enabled(on: bool) -> void:
	_enabled = on
	if not on:
		px = 0.0
		py = 0.0


func _process(dt: float) -> void:
	_probe_frame()
	if not _enabled or mode == "off":
		px = 0.0
		py = 0.0
		return
	_read_target()
	var rate := 2.6 if _gyro_live else 3.8
	var k := 1.0 - exp(-rate * dt)
	px = lerpf(px, _target_px, k)
	py = lerpf(py, _target_py, k)


func pose() -> Dictionary:
	return {"px": px, "py": py}


func rig_scale() -> float:
	if mode == "off" or not _enabled:
		return 1.0
	return 1.06


func _read_target() -> void:
	if lock_pose:
		_target_px = 0.0
		_target_py = 0.0
		return
	var g := Input.get_gravity()
	if g.length() > 2.0:
		_gyro_live = true
		_smooth = 2.6
		var beta := rad_to_deg(atan2(-g.z, Vector2(g.y, g.z).length()))
		var gamma := rad_to_deg(atan2(g.x, -g.y))
		if _baseline.size() < 6:
			if _baseline.is_empty() or absf(beta - float(_baseline[-1]["b"])) < 25.0:
				_baseline.append({"b": beta, "g": gamma})
			if _baseline.size() == 6:
				_base_beta = 0.0
				_base_gamma = 0.0
				for s in _baseline:
					_base_beta += float(s["b"])
					_base_gamma += float(s["g"])
				_base_beta /= 6.0
				_base_gamma /= 6.0
			return
		var orient := 90.0 if DisplayServer.screen_get_orientation() != DisplayServer.SCREEN_PORTRAIT else 0.0
		var t: Dictionary = TiltMath.screen_tilt(beta, gamma, _base_beta, _base_gamma, orient)
		_target_px = float(t["px"])
		_target_py = float(t["py"])
		return
	_gyro_live = false
	var vp := get_viewport().get_visible_rect().size
	var m := get_viewport().get_mouse_position()
	var p: Dictionary = TiltMath.pointer_tilt(m.x, m.y, vp.x, vp.y)
	_target_px = float(p["px"])
	_target_py = float(p["py"])


func _probe_frame() -> void:
	var now := Time.get_ticks_msec()
	if now < _cooldown_until:
		_last_usec = Time.get_ticks_usec()
		return
	var usec := Time.get_ticks_usec()
	if _last_usec > 0:
		_frame_ms.append(float(usec - _last_usec) / 1000.0)
	_last_usec = usec
	if _frame_ms.size() < 90:
		return
	var sum := 0.0
	for v in _frame_ms:
		sum += float(v)
	var mean := sum / float(_frame_ms.size())
	_frame_ms.clear()
	if mean > 20.0 and mode != "off":
		_drop()
		_cooldown_until = now + 1500
	elif mean < 9.0 and _auto_dropped:
		_climb()
		_cooldown_until = now + 1500


func _drop() -> void:
	_auto_dropped = true
	if mode == "full":
		mode = "lite"
	elif mode == "lite":
		mode = "flat"
	elif mode == "flat":
		mode = "off"
		latched_off = true


func _climb() -> void:
	var ceiling := TiltMath.tilt_mode_for(tier, reduced, false)
	var order := ["off", "flat", "lite", "full"]
	var i := order.find(mode)
	var cap := order.find(ceiling)
	if i >= 0 and i < cap:
		mode = order[i + 1]
		if mode == ceiling:
			_auto_dropped = false


func describe() -> String:
	var auto := " (auto)" if _auto_dropped else ""
	return "%s / %s%s" % [tier, mode, auto]
