class_name MortarParticles
extends RefCounted
## Mortar particle sim and MortarFx canvas layers from
## Web/src/scene/mortarParticles.ts and Web/src/scene/MortarFx.tsx.
## Positions are scene pixels (1920×1080). The RNG is the web LCG, not KimRng.

const ZONE_X := 290.0
const ZONE_Y := 506.0
const ZONE_W := 250.0
const ZONE_H := 273.0
const MORTAR_ASPECT := ZONE_W / ZONE_H

const FLOOR_CX := 0.5016 * 100.0
const FLOOR_CY := 0.3609 * 100.0
const FLOOR_RX := 0.272 * 100.0
const FLOOR_RY := 0.0518 * 100.0

const MOUTH_CX := 0.5038 * 100.0
const MOUTH_CY := 0.2313 * 100.0
const MOUTH_RX := 0.4157 * 100.0
const MOUTH_RY := 0.1854 * 100.0

const HEAD_DIAM_W := MOUTH_RX * 2.0 * 0.28
const HEAD_R_X := HEAD_DIAM_W / 2.0
const HEAD_R_Y := HEAD_R_X * MORTAR_ASPECT

const GOLD: Array[String] = ["#fff1c4", "#ffd27a", "#ffb648"]
const FALLBACK := "#c4a15a"

var _s: int = 1
var _particles: Array[Dictionary] = []
var _scale: float = 1.0
var _reduced: bool = false
var _specular: bool = true
var _live_shadow: bool = true
var _shadow_ready := false
var _shadow_alpha := 0.0
var _shadow_rx := 0.0
var _shadow_ry := 0.0
var _shadow_at := Vector2.ZERO
## Leftover heap grows in after the bowl empties. It does not pop on.
var _heap_k := 0.0
var _heap_dt := 0.0
var _sweeps: Array[Dictionary] = []
var _aroma_i: float = 0.0
var _aroma_hex: String = FALLBACK
var _aroma_acc: float = 0.0
var _flash_t0: float = -1.0
var _flash_hex: String = "#ffe3a0"
var _wipe_t0: float = -1.0
var _wipe_dur: float = 500.0
var _residue_hex: String = ""
var _effects := true
var _settled := false


func _init(seed: int = 1) -> void:
	_s = seed & 0xFFFFFFFF
	if _s == 0:
		_s = 1


func set_effects(on: bool) -> void:
	_effects = on


func set_budget(scale: float, reduced_motion: bool = false, specular: bool = true, live_shadow: bool = true) -> void:
	_scale = scale
	_reduced = reduced_motion
	_specular = specular
	_live_shadow = live_shadow


func update(dt: float) -> void:
	_emit_aroma_stream(dt)
	_step(dt)
	_heap_dt += maxf(dt, 0.0)


func busy() -> bool:
	return not _particles.is_empty() or _aroma_i > 0.0 or _flash_t0 >= 0.0 or _wipe_t0 >= 0.0 or not _sweeps.is_empty()


func burst(kind: String, at: Vector2 = Vector2.ZERO, opts: Dictionary = {}) -> void:
	_settled = false
	if _effects_quiet(kind):
		return
	match kind:
		"strike":
			_burst_strike(at, opts)
		"land":
			_burst_land(opts)
		"fine":
			_burst_fine(opts)
		"spill":
			_burst_spill(opts)
		"trail":
			_emit_trail(at.x, at.y, _opt_hex(opts, FALLBACK))
		"ripple":
			if _reduced:
				return
			_emit_ripple(at.x, at.y, _opt_hex(opts, FALLBACK))
		"brush":
			if opts.has("color") or opts.has("hex"):
				_residue_hex = _opt_hex(opts, _residue_hex if _residue_hex != "" else FALLBACK)
			var ms: float = float(opts.get("ms", 500.0))
			brush(ms)
		"aroma":
			var origin: Vector2 = at
			if origin == Vector2.ZERO:
				origin = _zone_to_scene(FLOOR_CX, FLOOR_CY - FLOOR_RY * 0.6)
			var intensity: float = float(opts.get("intensity", _aroma_i if _aroma_i > 0.0 else 0.6))
			_emit_aroma(origin.x, origin.y, _opt_hex(opts, _aroma_hex), intensity)
		"dust":
			var fineness: float = float(opts.get("fineness", 0.0))
			_emit_strike_dust(at.x, at.y, _opt_colors(opts), fineness)
		"sparks":
			var n: int = int(opts.get("n", opts.get("count", 5)))
			_emit_sparks(at.x, at.y, n)
		"puff":
			var strength: float = float(opts.get("strength", 0.8))
			_emit_puff(at.x, at.y, _opt_hex(opts, FALLBACK), strength)
		_:
			pass


func set_aroma(intensity: float, color: Color) -> void:
	_aroma_i = clampf(intensity, 0.0, 1.0)
	_aroma_hex = _color_hex(color)
	if _aroma_i > 0.01:
		_settled = false


## After the bowl is empty, leftovers die inside this many seconds.
func settle(seconds: float = 2.0) -> void:
	if _settled:
		return
	_settled = true
	_aroma_i = 0.0
	_flash_t0 = -1.0
	_sweeps = []
	for particle_v in _particles:
		var p: Dictionary = particle_v
		var remain: float = float(p["ttl"]) - float(p["life"])
		if remain > seconds:
			p["ttl"] = float(p["life"]) + seconds


func brush(ms: float = 500.0) -> void:
	if _residue_hex == "":
		return
	_wipe_t0 = _now_ms()
	_wipe_dur = maxf(120.0, ms)
	var p: Vector2 = _zone_to_scene(FLOOR_CX + FLOOR_RX * 0.3, FLOOR_CY - 2.0)
	_emit_puff(p.x, p.y, _residue_hex, 0.45)


func active() -> bool:
	if not _particles.is_empty():
		return true
	if _aroma_i > 0.01 and not _reduced:
		return true
	var now: float = _now_ms()
	if _flash_t0 >= 0.0 and now - _flash_t0 < 520.0:
		return true
	if _wipe_t0 >= 0.0 and now - _wipe_t0 < _wipe_dur:
		return true
	for sweep_v in _sweeps:
		var sweep: Dictionary = sweep_v
		if now - float(sweep["t0"]) < float(sweep["dur"]):
			return true
	return false


func draw(c: CanvasItem, origin: Vector2, zone: Vector2) -> void:
	var scale := Vector2(zone.x / ZONE_W, zone.y / ZONE_H)
	var now: float = _now_ms()
	for particle_v in _particles:
		var p: Dictionary = particle_v
		var alpha: float = particle_alpha(p)
		if alpha <= 0.002:
			continue
		var size: float = particle_size(p)
		var local: Vector2 = _map(Vector2(float(p["x"]), float(p["y"])), origin, scale)
		var col: Color = _parse_hex(str(p["color"]))
		var kind: String = str(p["kind"])
		if kind != "ripple" and not _particle_visible(local, p, alpha, origin, scale):
			continue
		if kind == "ripple":
			col.a = alpha
			c.draw_ellipse(local, maxf(0.4, size * scale.x), maxf(0.4, size * 0.36 * scale.y), col, false, 1.6 * scale.x, false)
		elif kind == "aroma":
			_draw_aroma(c, local, size, scale, col, alpha, p)
		elif kind == "puff":
			_draw_puff(c, local, size * scale.x, col, alpha)
		elif kind == "spark":
			_draw_spark(c, local, size * scale.x, col, alpha)
		elif kind == "spill":
			_draw_spill(c, local, size, scale, col, alpha, float(p["rot"]))
		else:
			col.a = alpha * 0.85
			c.draw_circle(local, maxf(0.4, size * scale.x), col)
	_draw_sweeps(c, origin, scale, now)
	_draw_flash(c, origin, scale, now)


func draw_below(c: CanvasItem, origin: Vector2, zone: Vector2, chips: Array, aim: Dictionary, residue: Dictionary, skip_mound: bool = false) -> void:
	_remember_residue(residue)
	var scale := Vector2(zone.x / ZONE_W, zone.y / ZONE_H)
	var wipe_u: float = _wipe_u()
	var heap_want := 0.0
	if not residue.is_empty() and chips.is_empty() and wipe_u < 1.0:
		heap_want = 1.0
	var heap_k := _advance_heap(heap_want)
	if heap_k > 0.004 and not residue.is_empty() and wipe_u < 1.0:
		_draw_residue(c, origin, scale, residue, wipe_u, heap_k)
	# While the spoon transfer owns the pile, the bed ellipse is the surface.
	# The dust mound is dozens of ellipses and would paint over that bed.
	if not skip_mound and not chips.is_empty():
		_draw_mound(c, origin, scale, chips)
	_draw_pestle_shadow(c, origin, scale, chips, aim)


static func particle_alpha(p: Dictionary) -> float:
	var ttl: float = float(p["ttl"])
	if ttl <= 0.0:
		return 0.0
	var t: float = float(p["life"]) / ttl
	var kind: String = str(p["kind"])
	if kind == "spark":
		return 1.0 - t * t
	if kind == "ripple":
		return (1.0 - t) * 0.55
	if kind == "aroma":
		return sin(minf(1.0, t) * PI) * 0.34
	if kind == "puff":
		return (1.0 - t) * 0.5
	if kind == "spill":
		if t < 0.6:
			return 1.0
		return 1.0 - (t - 0.6) / 0.4
	# Dust eases in. A steep fade rewrites the whole disc between frames.
	var u := clampf(t / 0.55, 0.0, 1.0)
	var fade_in := u * u * (3.0 - 2.0 * u)
	return fade_in * (1.0 - t)


static func particle_size(p: Dictionary) -> float:
	var ttl: float = float(p["ttl"])
	var t: float = 0.0 if ttl <= 0.0 else float(p["life"]) / ttl
	var kind: String = str(p["kind"])
	var size: float = float(p["size"])
	if kind == "puff":
		return size * (1.0 + t * 1.8)
	if kind == "ripple":
		return size + t * 34.0
	if kind == "aroma":
		return size * (1.0 + t * 0.9)
	if kind == "dust":
		return size * (1.0 + t * 0.3)
	return size


func _effects_quiet(kind: String) -> bool:
	if _effects:
		return false
	return kind == "strike" or kind == "dust" or kind == "puff" or kind == "sparks" or kind == "fine"


func _budget() -> float:
	if _reduced:
		return minf(0.25, _scale)
	return _scale


func _burst_strike(at: Vector2, opts: Dictionary) -> void:
	var fineness: float = float(opts.get("fineness", 0.0))
	var hits: int = int(opts.get("hits", 0))
	var scene: Vector2 = _zone_to_scene(at.x, at.y)
	var colors: Array[String] = _opt_colors(opts)
	_emit_strike_dust(scene.x, scene.y, colors, fineness)
	var sparks: int = 5 if hits == 0 or fineness > 0.85 else 2
	_emit_sparks(scene.x, scene.y - 4.0, sparks)
	if _specular:
		_sweeps.append({
			"t0": _now_ms(),
			"dur": 320.0,
			"strength": 0.55 + fineness * 0.3,
		})


func _burst_land(_opts: Dictionary) -> void:
	# A drop used to puff yellow dust across the empty bowl. Strikes make the dust.
	return


func _burst_fine(opts: Dictionary) -> void:
	var p: Vector2 = _zone_to_scene(FLOOR_CX, FLOOR_CY - 3.0)
	var color: String = _opt_hex(opts, FALLBACK)
	_emit_puff(p.x, p.y, color, 1.2)
	_emit_sparks(p.x, p.y, 6)
	# The full-mouth flash washed thousands of pixels the moment the spoon scooped.


func _burst_spill(opts: Dictionary) -> void:
	var rim: Vector2 = _zone_to_scene(MOUTH_CX, MOUTH_CY + MOUTH_RY * 0.9)
	var table: float = ZONE_Y + ZONE_H - 6.0
	_emit_spill(rim.x, rim.y, table, _opt_colors(opts))


func _emit_strike_dust(x: float, y: float, colors: Array[String], fineness: float) -> void:
	var n: int = _count(5.0 + fineness * 9.0)
	var drag: float = 2.4 + fineness * 1.6
	var gravity: float = 40.0 * (1.0 - fineness * 0.7)
	for _i in n:
		var ang: float = _range(-PI * 0.95, -PI * 0.05)
		var speed: float = _range(30.0, 90.0) * (1.0 - fineness * 0.45)
		var px: float = x + _range(-6.0, 6.0)
		var py: float = y + _range(-3.0, 2.0)
		var ttl: float = _range(0.45, 0.95) + fineness * 0.4
		var size: float = _range(2.2, 5.5) + fineness * 2.0
		var color: String = _pick(colors, FALLBACK)
		_push({
			"kind": "dust",
			"x": px,
			"y": py,
			"vx": cos(ang) * speed,
			"vy": sin(ang) * speed - 20.0,
			"ttl": ttl,
			"size": size,
			"color": color,
			"gravity": gravity,
			"drag": drag,
		})


func _emit_sparks(x: float, y: float, n: int) -> void:
	var count: int = _count(float(n))
	for _i in count:
		var ang: float = _range(-PI * 0.9, -PI * 0.1)
		var speed: float = _range(90.0, 210.0)
		var ttl: float = _range(0.22, 0.42)
		var size: float = _range(1.2, 2.4)
		var color: String = _pick(GOLD, GOLD[1])
		_push({
			"kind": "spark",
			"x": x,
			"y": y,
			"vx": cos(ang) * speed,
			"vy": sin(ang) * speed,
			"ttl": ttl,
			"size": size,
			"color": color,
			"gravity": 320.0,
			"drag": 0.6,
		})


func _emit_puff(x: float, y: float, color: String, strength: float) -> void:
	var n: int = _count(3.0 + strength * 4.0)
	for _i in n:
		var ang: float = _range(0.0, PI * 2.0)
		var spread: float = _range(0.0, 10.0)
		var spread_y: float = _range(0.0, 4.0)
		var vx: float = cos(ang) * _range(8.0, 26.0)
		var vy: float = -_range(12.0, 30.0) * strength
		var ttl: float = _range(0.5, 0.9)
		var size: float = _range(8.0, 16.0) * (0.6 + strength * 0.6)
		_push({
			"kind": "puff",
			"x": x + cos(ang) * spread,
			"y": y + sin(ang) * spread_y,
			"vx": vx,
			"vy": vy,
			"ttl": ttl,
			"size": size,
			"color": color,
			"gravity": -6.0,
			"drag": 1.6,
		})


func _emit_spill(x: float, y: float, floor_y: float, colors: Array[String]) -> void:
	var n: int = _count(4.0)
	for _i in n:
		var dir: float = -1.0 if _rand() < 0.5 else 1.0
		var edge: float = _range(20.0, 60.0)
		var py: float = y + _range(-6.0, 4.0)
		var vx: float = dir * _range(40.0, 120.0)
		var vy: float = -_range(40.0, 110.0)
		var ttl: float = _range(1.1, 1.5)
		var size: float = _range(4.0, 8.0)
		var color: String = _pick(colors, FALLBACK)
		var rot: float = _range(0.0, PI * 2.0)
		var spin: float = _range(-6.0, 6.0)
		_push({
			"kind": "spill",
			"x": x + dir * edge,
			"y": py,
			"vx": vx,
			"vy": vy,
			"ttl": ttl,
			"size": size,
			"color": color,
			"gravity": 900.0,
			"drag": 0.3,
			"rot": rot,
			"spin": spin,
			"floor_y": floor_y,
		})


func _emit_trail(x: float, y: float, color: String) -> void:
	if _count(1.0) < 1 and _rand() > _budget():
		return
	var px: float = x + _range(-5.0, 5.0)
	var vx: float = _range(-12.0, 12.0)
	var vy: float = _range(0.0, 30.0)
	var ttl: float = _range(0.45, 0.7)
	var size: float = _range(1.6, 3.2)
	_push({
		"kind": "trail",
		"x": px,
		"y": y,
		"vx": vx,
		"vy": vy,
		"ttl": ttl,
		"size": size,
		"color": color,
		"gravity": 700.0,
		"drag": 0.5,
	})


func _emit_ripple(x: float, y: float, color: String) -> void:
	_push({
		"kind": "ripple",
		"x": x,
		"y": y,
		"vx": 0.0,
		"vy": 0.0,
		"ttl": 0.7,
		"size": 6.0,
		"color": color,
		"gravity": 0.0,
		"drag": 0.0,
	})


func _emit_aroma(x: float, y: float, color: String, intensity: float) -> void:
	var px: float = x + _range(-18.0, 18.0)
	var vx: float = _range(-6.0, 6.0)
	var vy: float = -_range(22.0, 40.0) * (0.7 + intensity * 0.5)
	var ttl: float = _range(1.6, 2.6)
	var size: float = _range(6.0, 12.0) * (0.7 + intensity * 0.6)
	_push({
		"kind": "aroma",
		"x": px,
		"y": y,
		"vx": vx,
		"vy": vy,
		"ttl": ttl,
		"size": size,
		"color": color,
		"gravity": -4.0,
		"drag": 0.2,
	})


func _emit_aroma_stream(dt: float) -> void:
	if _aroma_i <= 0.01 or _reduced:
		return
	_aroma_acc += dt * (0.8 + _aroma_i * 3.2) * _scale
	while _aroma_acc >= 1.0:
		_aroma_acc -= 1.0
		var p: Vector2 = _zone_to_scene(FLOOR_CX, FLOOR_CY - FLOOR_RY * 0.6)
		_emit_aroma(p.x, p.y, _aroma_hex, _aroma_i)


func _push(p: Dictionary) -> void:
	var seed_v: float = _rand()
	var rot: float = float(p["rot"]) if p.has("rot") else 0.0
	var spin: float = float(p["spin"]) if p.has("spin") else 0.0
	p["life"] = 0.0
	p["seed"] = seed_v
	p["rot"] = rot
	p["spin"] = spin
	_particles.append(p)


func _step(dt: float) -> void:
	if _particles.is_empty():
		return
	var next: Array[Dictionary] = []
	for particle_v in _particles:
		var p: Dictionary = particle_v
		p["life"] = float(p["life"]) + dt
		if float(p["life"]) >= float(p["ttl"]):
			continue
		p["vy"] = float(p["vy"]) + float(p["gravity"]) * dt
		var drag: float = maxf(0.0, 1.0 - float(p["drag"]) * dt)
		p["vx"] = float(p["vx"]) * drag
		p["vy"] = float(p["vy"]) * drag
		p["x"] = float(p["x"]) + float(p["vx"]) * dt
		p["y"] = float(p["y"]) + float(p["vy"]) * dt
		p["rot"] = float(p["rot"]) + float(p["spin"]) * dt
		if str(p["kind"]) == "aroma":
			p["x"] = float(p["x"]) + sin(float(p["life"]) * 2.2 + float(p["seed"]) * 12.9) * 16.0 * dt
		if str(p["kind"]) == "spill" and p.has("floor_y") and float(p["y"]) >= float(p["floor_y"]):
			p["y"] = float(p["floor_y"])
			if not bool(p.get("bounced", false)):
				p["bounced"] = true
				p["vy"] = -absf(float(p["vy"])) * 0.28
				p["vx"] = float(p["vx"]) * 0.55
				p["spin"] = float(p["spin"]) * 0.4
			else:
				p["vy"] = 0.0
				p["vx"] = float(p["vx"]) * 0.8
				p["spin"] = 0.0
		next.append(p)
	_particles = next


func _count(n: float) -> int:
	return maxi(0, _js_round(n * _budget()))


func _rand() -> float:
	_s = (_s * 1664525 + 1013904223) & 0xFFFFFFFF
	return float(_s) / 4294967296.0


func _range(lo: float, hi: float) -> float:
	return lo + (hi - lo) * _rand()


func _pick(list: Array, fallback: String) -> String:
	if list.is_empty():
		return fallback
	var index: int = int(floor(_rand() * float(list.size())))
	if index < 0 or index >= list.size():
		return fallback
	return str(list[index])


func _draw_sweeps(c: CanvasItem, origin: Vector2, scale: Vector2, now: float) -> void:
	var alive: Array[Dictionary] = []
	for sweep_v in _sweeps:
		var sweep: Dictionary = sweep_v
		var t: float = (now - float(sweep["t0"])) / float(sweep["dur"])
		if t >= 1.0:
			continue
		alive.append(sweep)
		var center: Vector2 = _map(_zone_to_scene(MOUTH_CX, MOUTH_CY), origin, scale)
		var rx: float = (MOUTH_RX / 100.0) * ZONE_W * scale.x
		var ry: float = (MOUTH_RY / 100.0) * ZONE_H * scale.y
		var ang: float = PI * (0.06 + 0.88 * t)
		var fade: float = sin(t * PI)
		var strength: float = float(sweep["strength"])
		for i in 9:
			var a: float = ang - float(i) * 0.055
			var px: float = center.x + cos(a) * rx
			var py: float = center.y + sin(a) * ry
			var k: float = (1.0 - float(i) / 9.0) * fade * strength
			var col := Color(1.0, 244.0 / 255.0, 214.0 / 255.0, k * 0.85)
			var rad: float = (2.2 + (1.0 - float(i) / 9.0) * 2.4) * scale.x
			var at := Vector2(px, py)
			var zone_r := rad / (scale.x if absf(scale.x) > 0.0001 else 1.0)
			if not MortarPile.circle_inside(_zone_of(at, origin, scale), zone_r):
				continue
			c.draw_circle(at, maxf(0.4, rad), col)
	_sweeps = alive


func _draw_flash(_c: CanvasItem, _origin: Vector2, _scale: Vector2, now: float) -> void:
	# The full-mouth flash is not drawn. The timer still expires so busy() clears.
	if _flash_t0 < 0.0:
		return
	if (now - _flash_t0) / 520.0 >= 1.0:
		_flash_t0 = -1.0


func _advance_heap(want: float) -> float:
	# Sim time, not the wall clock. A slow frame must not dump the whole heap.
	var dt := minf(_heap_dt, 0.05)
	_heap_dt = 0.0
	var step := dt / 0.50
	if want >= _heap_k:
		_heap_k = minf(want, _heap_k + step)
	else:
		_heap_k = maxf(want, _heap_k - step)
	return _heap_k


func _draw_residue(c: CanvasItem, origin: Vector2, scale: Vector2, residue: Dictionary, wipe_u: float, heap_k: float = 1.0) -> void:
	var grow := heap_k * heap_k * (3.0 - 2.0 * heap_k)
	var amount: float = float(residue.get("amount", 0.0)) * grow
	var hex: String = _residue_color_hex(residue)
	var scene: Vector2 = _zone_to_scene(FLOOR_CX, FLOOR_CY)
	var span := lerpf(0.42, 1.0, grow)
	var rx: float = (FLOOR_RX / 100.0) * ZONE_W * 0.92 * span
	var ry: float = (FLOOR_RY / 100.0) * ZONE_H * 1.5 * span
	var eased := 0.0
	var use_clip := false
	if wipe_u > 0.0:
		use_clip = true
		eased = 1.0 - (1.0 - wipe_u) * (1.0 - wipe_u)
	var fade: float = 1.0 - eased * 0.4
	var col: Color = _parse_hex(hex)
	var stops_t := PackedFloat32Array([0.0, 0.7, 1.0])
	var stops_c: Array[Color] = [
		Color(col.r, col.g, col.b, 0.58 * amount * fade),
		Color(col.r, col.g, col.b, 0.3 * amount * fade),
		Color(col.r, col.g, col.b, 0.0),
	]
	var center: Vector2 = _map(scene, origin, scale)
	var clip := Rect2()
	if use_clip:
		var left: float = scene.x - rx * 1.05
		var keep_w: float = rx * 2.1 * (1.0 - eased)
		var top: float = scene.y - ry * 3.0
		clip = _map_rect(Rect2(left, top, keep_w, ry * 6.0), origin, scale)
	_paint_radial(c, center, rx * scale.x, ry * scale.y, stops_t, stops_c, use_clip, clip, true)
	var speck: Color = Color(col.r, col.g, col.b, 0.55 * amount * fade)
	for i in 14:
		var a: float = (float(i) / 14.0) * PI * 2.0 + 0.4
		var rad: float = 0.55 + float((i * 37) % 11) / 22.0
		var at: Vector2 = Vector2(scene.x + cos(a) * rx * rad, scene.y + sin(a) * ry * rad)
		if use_clip:
			var keep := Rect2(scene.x - rx * 1.05, scene.y - ry * 3.0, rx * 2.1 * (1.0 - eased), ry * 6.0)
			if not keep.has_point(at):
				continue
		var local: Vector2 = _map(at, origin, scale)
		var speck_r: float = (1.1 + float((i * 13) % 5) * 0.3) * scale.x
		if not MortarPile.circle_inside(local, speck_r):
			continue
		c.draw_circle(local, maxf(0.3, speck_r), speck)


func _draw_mound(c: CanvasItem, origin: Vector2, scale: Vector2, chips: Array) -> void:
	var total := 0.0
	var dust_area := 0.0
	var dust_colors: Array = []
	for chip_v in chips:
		if not (chip_v is Dictionary):
			continue
		var chip: Dictionary = chip_v
		var area: float = float(chip.get("w", 0.0)) * float(chip.get("h", 0.0))
		total += area
		if str(chip.get("kind", "")) != "dust":
			continue
		dust_area += area
		if chip.has("color") and chip.get("color", null) != null:
			dust_colors.append(_any_hex(chip.get("color", FALLBACK)))
	var frac: float = 0.0 if total <= 0.0 else dust_area / total
	if frac <= 0.05:
		return
	var hex: String = _mix_hex(dust_colors)
	var scene: Vector2 = _zone_to_scene(FLOOR_CX, FLOOR_CY - 1.5)
	var rx: float = (FLOOR_RX / 100.0) * ZONE_W * (0.55 + 0.45 * frac)
	var ry: float = (FLOOR_RY / 100.0) * ZONE_H * (1.4 + 0.8 * frac)
	var center: Vector2 = _map(scene, origin, scale)
	var lrx: float = rx * scale.x
	var lry: float = ry * scale.y
	var shadow_at := Vector2(center.x, center.y + lry * 0.35)
	var shade := Color(28.0 / 255.0, 14.0 / 255.0, 4.0 / 255.0, 1.0)
	_paint_radial(c, shadow_at, lrx * 1.05, lry * 0.9, PackedFloat32Array([0.0, 1.0]), [
		Color(shade.r, shade.g, shade.b, 0.38 * frac),
		Color(shade.r, shade.g, shade.b, 0.0),
	], false, Rect2(), true)
	var body: Color = _parse_hex(hex)
	# Offset radial (highlight up-left of the mound) approximated with stacked ellipses.
	# Web radial is centered up-left of the ellipse. Stack a centered body, then that offset highlight.
	_paint_radial(c, center, lrx, lry, PackedFloat32Array([0.0, 0.5, 0.86, 1.0]), [
		Color(body.r, body.g, body.b, 0.9 * frac),
		Color(body.r, body.g, body.b, 0.9 * frac),
		Color(body.r, body.g, body.b, 0.55 * frac),
		Color(body.r, body.g, body.b, 0.0),
	], false, Rect2(), true)
	var hi := Vector2(center.x - lrx * 0.18, center.y - lry * 0.55)
	_paint_radial(c, hi, maxf(0.4, lrx * 0.42), maxf(0.4, lry * 0.42), PackedFloat32Array([0.0, 1.0]), [
		Color(body.r, body.g, body.b, 0.98 * frac),
		Color(body.r, body.g, body.b, 0.0),
	], false, Rect2(), true)
	var foot := Color(30.0 / 255.0, 14.0 / 255.0, 4.0 / 255.0, 0.32 * frac)
	_fill_ellipse(c, Vector2(center.x, center.y + lry * 0.42), maxf(0.4, lrx * 0.72), maxf(0.4, lry * 0.38), foot, true)
	for i in 46:
		var a: float = float(i) * 2.399963
		var rad: float = sqrt((float(i) + 0.5) / 46.0)
		var px: float = center.x + cos(a) * rad * lrx * 0.88
		var py: float = center.y + sin(a) * rad * lry * 0.82
		var speck_at := Vector2(px, py)
		var speck_r: float = (0.7 + float((i * 7) % 4) * 0.25) * scale.x
		if not MortarPile.circle_inside(speck_at, speck_r):
			continue
		var speck: Color = Color(40.0 / 255.0, 20.0 / 255.0, 6.0 / 255.0, 0.28 * frac) if i % 3 == 0 else Color(1.0, 248.0 / 255.0, 230.0 / 255.0, 0.22 * frac)
		c.draw_circle(speck_at, maxf(0.25, speck_r), speck)


func _draw_pestle_shadow(c: CanvasItem, origin: Vector2, scale: Vector2, chips: Array, aim: Dictionary) -> void:
	if not _live_shadow or aim.is_empty():
		return
	var mode: String = str(aim.get("mode", "lean"))
	if mode == "lean":
		return
	if chips.is_empty() and mode != "grind":
		return
	# A fresh drop is raw pieces only. The contact shadow read as haze in the gaps.
	if float(aim.get("progress", 1.0)) < MortarPile.BED_EPS and float(aim.get("impact", 0.0)) < 0.05:
		return
	var lift: float = float(aim.get("lift", 0.0))
	var impact: float = float(aim.get("impact", 0.0))
	var head_x: float = float(aim.get("head_x", FLOOR_CX))
	var head_y: float = float(aim.get("head_y", FLOOR_CY))
	var contact_y: float = head_y + HEAD_R_Y * 0.6 + lift * 15.0 * 0.9
	var scene: Vector2 = _zone_to_scene(head_x, contact_y)
	var rx_zone: float = HEAD_R_X * (1.05 + lift * 0.5)
	var rx: float = (rx_zone / 100.0) * ZONE_W
	var ry: float = ((rx_zone * MORTAR_ASPECT * 0.42) / 100.0) * ZONE_H
	var alpha: float = 0.34 * (1.0 - lift * 0.55) + impact * 0.1
	var center: Vector2 = _map(scene, origin, scale)
	# The contact shadow used to pulse with the beat and rewrite a ring of pixels.
	if not _shadow_ready:
		_shadow_alpha = 0.0
		_shadow_rx = rx
		_shadow_ry = ry
		_shadow_at = center
		_shadow_ready = true
	# A slower follow keeps the contact shadow from rewriting a ring each beat.
	_shadow_alpha = lerpf(_shadow_alpha, alpha, 0.012)
	_shadow_rx = lerpf(_shadow_rx, rx, 0.012)
	_shadow_ry = lerpf(_shadow_ry, ry, 0.012)
	var gap := center - _shadow_at
	if gap.length() > 1.4:
		gap = gap.normalized() * 1.4
	_shadow_at += gap
	alpha = _shadow_alpha
	rx = _shadow_rx
	ry = _shadow_ry
	center = _shadow_at
	var shade := Color(30.0 / 255.0, 14.0 / 255.0, 4.0 / 255.0, 1.0)
	# Dark contact shadow. It stays inside the opening; rising dust is a different layer.
	_paint_radial(c, center, rx * scale.x, ry * scale.y, PackedFloat32Array([0.0, 0.7, 1.0]), [
		Color(shade.r, shade.g, shade.b, alpha),
		Color(shade.r, shade.g, shade.b, alpha * 0.5),
		Color(shade.r, shade.g, shade.b, 0.0),
	], false, Rect2(), true)


func _fill_ellipse(c: CanvasItem, center: Vector2, rx: float, ry: float, col: Color, clip_bowl: bool) -> void:
	if col.a <= 0.001 or rx <= 0.05 or ry <= 0.05:
		return
	var erx := rx
	var ery := ry
	# Stay on draw_ellipse. A polygon here splits the cauldron batches.
	if clip_bowl and not _ellipse_in_bowl(center, erx, ery):
		var scale := 1.0
		for _i in 5:
			scale *= 0.84
			if _ellipse_in_bowl(center, erx * scale, ery * scale):
				break
		erx *= scale
		ery *= scale
		if not _ellipse_in_bowl(center, erx, ery):
			return
	c.draw_ellipse(center, erx, ery, col, true, -1.0, false)


func _ellipse_in_bowl(center: Vector2, rx: float, ry: float) -> bool:
	for i in 8:
		var a := TAU * float(i) / 8.0
		if not MortarPile.within_margin(center + Vector2(cos(a) * rx, sin(a) * ry)):
			return false
	return true


func _zone_of(draw_pt: Vector2, origin: Vector2, scale: Vector2) -> Vector2:
	var zone_pos := Vector2(ZONE_X, ZONE_Y)
	var sx := scale.x if absf(scale.x) > 0.0001 else 1.0
	var sy := scale.y if absf(scale.y) > 0.0001 else 1.0
	return (draw_pt - (zone_pos - origin)) / Vector2(sx, sy)


func quiet_fresh() -> void:
	var keep: Array[Dictionary] = []
	var center := MortarPile.interior_center()
	for particle_v in _particles:
		var p: Dictionary = particle_v
		if str(p.get("kind", "")) == "ripple":
			keep.append(p)
			continue
		var local := Vector2(float(p.get("x", 0.0)), float(p.get("y", 0.0))) - Vector2(ZONE_X, ZONE_Y)
		if local.distance_squared_to(center) > 180.0 * 180.0:
			keep.append(p)
	_particles = keep
	_aroma_i = 0.0
	_sweeps = []
	_flash_t0 = -1.0
	_wipe_t0 = -1.0
	_shadow_ready = false
	_shadow_alpha = 0.0
	_heap_k = 0.0
	_heap_dt = 0.0


func _particle_visible(local: Vector2, p: Dictionary, alpha: float, origin: Vector2, scale: Vector2) -> bool:
	var z := _zone_of(local, origin, scale)
	var rad := _zone_radius(p, scale)
	var d := z - MortarPile.interior_center()
	if d.length_squared() > 180.0 * 180.0:
		return true
	if MortarPile.circle_inside(z, rad):
		return true
	var kind := str(p.get("kind", ""))
	if kind == "dust" or kind == "puff" or kind == "trail":
		return MortarPile.rising_dust_ok(z, rad, float(p.get("vy", 0.0)), alpha)
	return false


func _zone_radius(p: Dictionary, scale: Vector2) -> float:
	var sx := scale.x if absf(scale.x) > 0.0001 else 1.0
	var size := particle_size(p) * sx
	if str(p.get("kind", "")) == "spark":
		size += 3.0
	return size / sx


func _paint_radial(c: CanvasItem, center: Vector2, rx: float, ry: float, stops_t: PackedFloat32Array, stops_c: Array[Color], use_clip: bool, clip: Rect2, clip_bowl: bool = false) -> void:
	if rx <= 0.05 or ry <= 0.05:
		return
	var rings := 12
	for i in range(rings, 0, -1):
		var t: float = float(i) / float(rings)
		var col: Color = _sample_stop(stops_t, stops_c, t)
		if col.a <= 0.001:
			continue
		var erx: float = maxf(0.4, rx * t)
		var ery: float = maxf(0.4, ry * t)
		if not use_clip:
			_fill_ellipse(c, center, erx, ery, col, clip_bowl)
			continue
		var poly: PackedVector2Array = _ellipse_poly(center, erx, ery, 40)
		poly = _clip_rect(poly, clip)
		if clip_bowl:
			poly = MortarPile.clip_to_interior(poly)
		if poly.size() >= 3:
			c.draw_colored_polygon(poly, col)


func _draw_aroma(c: CanvasItem, local: Vector2, size: float, scale: Vector2, col: Color, alpha: float, p: Dictionary) -> void:
	var spin: float = sin(float(p["life"]) + float(p["seed"]) * 6.0) * 0.4
	c.draw_set_transform(local, spin, Vector2.ONE)
	var rx: float = maxf(0.4, size * 0.55 * scale.x)
	var ry: float = maxf(0.4, size * scale.y)
	_paint_radial(c, Vector2.ZERO, rx, ry, PackedFloat32Array([0.0, 1.0]), [
		Color(col.r, col.g, col.b, alpha),
		Color(col.r, col.g, col.b, 0.0),
	], false, Rect2())
	c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _draw_puff(c: CanvasItem, local: Vector2, radius: float, col: Color, alpha: float) -> void:
	_paint_radial(c, local, maxf(0.4, radius), maxf(0.4, radius), PackedFloat32Array([0.0, 0.6, 1.0]), [
		Color(col.r, col.g, col.b, alpha * 0.9),
		Color(col.r, col.g, col.b, alpha * 0.4),
		Color(col.r, col.g, col.b, 0.0),
	], false, Rect2())


func _draw_spark(c: CanvasItem, local: Vector2, radius: float, col: Color, alpha: float) -> void:
	var glow := Color(col.r, col.g, col.b, alpha * 0.45)
	c.draw_circle(local, maxf(0.4, radius + 3.0), glow)
	var core := Color(col.r, col.g, col.b, alpha)
	c.draw_circle(local, maxf(0.3, radius), core)


func _draw_spill(c: CanvasItem, local: Vector2, size: float, scale: Vector2, col: Color, alpha: float, rot: float) -> void:
	c.draw_set_transform(local, rot, Vector2.ONE)
	var rx: float = maxf(0.4, size * scale.x)
	var ry: float = maxf(0.4, size * 0.62 * scale.y)
	var fill := Color(col.r, col.g, col.b, alpha)
	c.draw_ellipse(Vector2.ZERO, rx, ry, fill, true, -1.0, false)
	var edge := Color(40.0 / 255.0, 20.0 / 255.0, 6.0 / 255.0, alpha * 0.55)
	c.draw_ellipse(Vector2.ZERO, rx, ry, edge, false, maxf(0.6, 0.8 * scale.x), false)
	var shine := Color(1.0, 244.0 / 255.0, 220.0 / 255.0, alpha * 0.35)
	c.draw_ellipse(Vector2(-rx * 0.3, -ry * 0.32), maxf(0.3, size * 0.32 * scale.x), maxf(0.3, size * 0.18 * scale.y), shine, true, -1.0, false)
	c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _remember_residue(residue: Dictionary) -> void:
	if residue.is_empty() or not (residue.has("color") or residue.has("hex")):
		_residue_hex = ""
		return
	_residue_hex = _residue_color_hex(residue)


func _residue_color_hex(residue: Dictionary) -> String:
	if residue.has("hex") and str(residue.get("hex", "")) != "":
		return str(residue.get("hex", FALLBACK))
	return _any_hex(residue.get("color", FALLBACK))


func _wipe_u() -> float:
	if _wipe_t0 < 0.0 or _wipe_dur <= 0.0:
		return 0.0
	return minf(1.0, (_now_ms() - _wipe_t0) / _wipe_dur)


func _sample_stop(stops_t: PackedFloat32Array, stops_c: Array[Color], t: float) -> Color:
	if stops_t.is_empty() or stops_c.is_empty():
		return Color(0, 0, 0, 0)
	if t <= stops_t[0]:
		return stops_c[0]
	var last: int = mini(stops_t.size(), stops_c.size()) - 1
	if t >= stops_t[last]:
		return stops_c[last]
	for i in last:
		if t <= stops_t[i + 1]:
			var span: float = stops_t[i + 1] - stops_t[i]
			var u: float = 0.0 if span <= 0.0 else (t - stops_t[i]) / span
			return stops_c[i].lerp(stops_c[i + 1], u)
	return stops_c[last]


func _ellipse_poly(center: Vector2, rx: float, ry: float, segments: int) -> PackedVector2Array:
	var poly := PackedVector2Array()
	for i in segments:
		var a: float = TAU * float(i) / float(segments)
		poly.append(Vector2(center.x + cos(a) * rx, center.y + sin(a) * ry))
	return poly


func _clip_rect(poly: PackedVector2Array, rect: Rect2) -> PackedVector2Array:
	var out: PackedVector2Array = poly
	out = _clip_edge(out, rect.position.x, true, true)
	out = _clip_edge(out, rect.position.x + rect.size.x, true, false)
	out = _clip_edge(out, rect.position.y, false, true)
	out = _clip_edge(out, rect.position.y + rect.size.y, false, false)
	return out


func _clip_edge(poly: PackedVector2Array, limit: float, axis_x: bool, keep_greater: bool) -> PackedVector2Array:
	var out := PackedVector2Array()
	var n: int = poly.size()
	if n == 0:
		return out
	var prev: Vector2 = poly[n - 1]
	for i in n:
		var cur: Vector2 = poly[i]
		var prev_in: bool = _inside(prev, limit, axis_x, keep_greater)
		var cur_in: bool = _inside(cur, limit, axis_x, keep_greater)
		if cur_in:
			if not prev_in:
				out.append(_edge_hit(prev, cur, limit, axis_x))
			out.append(cur)
		elif prev_in:
			out.append(_edge_hit(prev, cur, limit, axis_x))
		prev = cur
	return out


func _inside(p: Vector2, limit: float, axis_x: bool, keep_greater: bool) -> bool:
	var v: float = p.x if axis_x else p.y
	if keep_greater:
		return v >= limit
	return v <= limit


func _edge_hit(a: Vector2, b: Vector2, limit: float, axis_x: bool) -> Vector2:
	var av: float = a.x if axis_x else a.y
	var bv: float = b.x if axis_x else b.y
	var span: float = bv - av
	var u: float = 0.0 if absf(span) < 0.00001 else (limit - av) / span
	return a.lerp(b, clampf(u, 0.0, 1.0))


func _map(scene: Vector2, origin: Vector2, scale: Vector2) -> Vector2:
	var zone_pos := Vector2(ZONE_X, ZONE_Y)
	return (scene - zone_pos) * scale + (zone_pos - origin)


func _map_rect(rect: Rect2, origin: Vector2, scale: Vector2) -> Rect2:
	var a: Vector2 = _map(rect.position, origin, scale)
	var b: Vector2 = _map(rect.position + rect.size, origin, scale)
	return Rect2(a, b - a)


func _zone_to_scene(x: float, y: float) -> Vector2:
	return Vector2(ZONE_X + (x / 100.0) * ZONE_W, ZONE_Y + (y / 100.0) * ZONE_H)


func _opt_hex(opts: Dictionary, fallback: String) -> String:
	if opts.has("hex") and str(opts.get("hex", "")) != "":
		return str(opts.get("hex", fallback))
	if opts.has("color"):
		return _any_hex(opts.get("color", fallback))
	return fallback


func _opt_colors(opts: Dictionary) -> Array[String]:
	var out: Array[String] = []
	if opts.has("colors"):
		var raw: Variant = opts.get("colors", [])
		if raw is Array:
			var arr: Array = raw
			for item_v in arr:
				out.append(_any_hex(item_v))
		elif raw is Color or raw is String:
			out.append(_any_hex(raw))
	elif opts.has("color"):
		out.append(_any_hex(opts.get("color", FALLBACK)))
	return out


func _any_hex(value: Variant) -> String:
	if value is Color:
		return _color_hex(value)
	var text: String = str(value).strip_edges()
	if text.begins_with("#"):
		return text
	return FALLBACK


func _parse_hex(hex: String) -> Color:
	var text: String = hex.strip_edges()
	if text.length() == 4 and text.begins_with("#"):
		text = "#%s%s%s%s%s%s" % [text.substr(1, 1), text.substr(1, 1), text.substr(2, 1), text.substr(2, 1), text.substr(3, 1), text.substr(3, 1)]
	if text.length() == 7 and text.begins_with("#"):
		return Color(text)
	return Color(FALLBACK)


func _mix_hex(colors: Array) -> String:
	if colors.is_empty():
		return "#8a7a52"
	var r := 0
	var g := 0
	var b := 0
	var n := 0
	for color_v in colors:
		var text: String = str(color_v).strip_edges()
		if text.length() == 4 and text.begins_with("#"):
			text = "#%s%s%s%s%s%s" % [text.substr(1, 1), text.substr(1, 1), text.substr(2, 1), text.substr(2, 1), text.substr(3, 1), text.substr(3, 1)]
		if text.length() != 7 or not text.begins_with("#"):
			continue
		var rv: int = _hex_byte(text, 1)
		var gv: int = _hex_byte(text, 3)
		var bv: int = _hex_byte(text, 5)
		if rv < 0:
			continue
		r += rv
		g += gv
		b += bv
		n += 1
	if n == 0:
		return str(colors[0])
	return "#%02x%02x%02x" % [
		_js_round(float(r) / float(n)),
		_js_round(float(g) / float(n)),
		_js_round(float(b) / float(n)),
	]


func _hex_byte(text: String, index: int) -> int:
	var pair: String = text.substr(index, 2)
	if not pair.is_valid_hex_number():
		return -1
	return pair.hex_to_int()


func _color_hex(col: Color) -> String:
	return "#%02x%02x%02x" % [
		_js_round(col.r * 255.0),
		_js_round(col.g * 255.0),
		_js_round(col.b * 255.0),
	]


func _now_ms() -> float:
	return float(Time.get_ticks_msec())


static func _js_round(v: float) -> int:
	return int(floor(v + 0.5))
