class_name MortarParticles
extends RefCounted
## Bursts live in scene pixels (1920×1080). draw() maps them with origin = the canvas top-left in that space and zone = the mortar zone size in pixels.

const GOLD: Array[Color] = [Color("#fff1c4"), Color("#ffd27a"), Color("#ffb648")]
const DUST_FALLBACK := Color("#c4a15a")

var _rng: KimRng
var _parts: Array[Dictionary] = []
var _scale: float = 1.0
var _reduced: bool = false
var _specular: bool = true
var _live_shadow: bool = true
var _now: float = 0.0
var _sweeps: Array[Dictionary] = []
var _aroma_i: float = 0.0
var _aroma_color: Color = Color("#c4a15a")
var _aroma_acc: float = 0.0
var _flash_t0: float = -1.0
var _flash_color: Color = Color("#ffe3a0")
var _wipe_t0: float = -1.0
var _wipe_dur: float = 0.5
var _floor_c: Vector2 = Vector2.ZERO
var _floor_r: Vector2 = Vector2.ZERO
var _mouth_c: Vector2 = Vector2.ZERO
var _mouth_r: Vector2 = Vector2.ZERO
var _zone_pos: Vector2 = Vector2(290, 506)
var _zone_size: Vector2 = Vector2(250, 273)
var _head_r: Vector2 = Vector2.ONE
var _aspect: float = 250.0 / 273.0
var _geom_ok: bool = false


func _init(seed: int = 7) -> void:
	_rng = KimRng.new(seed if seed != 0 else 1)
	_ensure_geom()


func set_budget(scale: float, reduced_motion: bool = false, specular: bool = true, live_shadow: bool = true) -> void:
	_scale = scale
	_reduced = reduced_motion
	_specular = specular
	_live_shadow = live_shadow


func update(dt: float) -> void:
	_now += dt
	_emit_aroma(dt)
	if _parts.is_empty():
		_trim_sweeps()
		return
	var next: Array[Dictionary] = []
	for item in _parts:
		var p: Dictionary = item
		p["life"] = float(p["life"]) + dt
		if float(p["life"]) >= float(p["ttl"]):
			continue
		p["vy"] = float(p["vy"]) + float(p["gravity"]) * dt
		var drag_k := maxf(0.0, 1.0 - float(p["drag"]) * dt)
		p["vx"] = float(p["vx"]) * drag_k
		p["vy"] = float(p["vy"]) * drag_k
		p["x"] = float(p["x"]) + float(p["vx"]) * dt
		p["y"] = float(p["y"]) + float(p["vy"]) * dt
		p["rot"] = float(p["rot"]) + float(p["spin"]) * dt
		if str(p["kind"]) == "aroma":
			p["x"] = float(p["x"]) + sin(float(p["life"]) * 2.2 + float(p["seed"]) * 12.9) * 16.0 * dt
		if str(p["kind"]) == "spill" and bool(p["has_floor"]) and float(p["y"]) >= float(p["floor_y"]):
			p["y"] = float(p["floor_y"])
			if not bool(p["bounced"]):
				p["bounced"] = true
				p["vy"] = -absf(float(p["vy"])) * 0.28
				p["vx"] = float(p["vx"]) * 0.55
				p["spin"] = float(p["spin"]) * 0.4
			else:
				p["vy"] = 0.0
				p["vx"] = float(p["vx"]) * 0.8
				p["spin"] = 0.0
		next.append(p)
	_parts = next
	_trim_sweeps()


## kind: strike (at = zone percent), land, fine, spill, brush, aroma, dust, sparks, puff; trail and ripple use scene pixels in `at`.
func burst(kind: String, at: Vector2 = Vector2.ZERO, opts: Dictionary = {}) -> void:
	_ensure_geom()
	match kind:
		"strike":
			_burst_strike(at, opts)
		"land":
			_burst_land(_opt_color(opts, DUST_FALLBACK))
		"fine":
			_burst_fine(_opt_color(opts, DUST_FALLBACK))
		"spill":
			_burst_spill(_color_list(opts))
		"trail":
			_emit_trail(at.x, at.y, _opt_color(opts, DUST_FALLBACK))
		"ripple":
			_burst_ripple(at, _opt_color(opts, DUST_FALLBACK))
		"brush":
			_burst_brush(opts)
		"aroma":
			set_aroma(float(opts.get("intensity", 0.0)), _opt_color(opts, _aroma_color))
		"dust":
			var scene := at
			if bool(opts.get("zone", false)):
				scene = _zone_to_scene(at.x, at.y)
			_emit_dust(scene.x, scene.y, _color_list(opts), float(opts.get("fineness", 0.0)))
		"sparks":
			var scene_s := at
			if bool(opts.get("zone", false)):
				scene_s = _zone_to_scene(at.x, at.y)
			_emit_sparks(scene_s.x, scene_s.y, int(opts.get("n", 4)))
		"puff":
			var scene_p := at
			if bool(opts.get("zone", false)):
				scene_p = _zone_to_scene(at.x, at.y)
			_emit_puff(scene_p.x, scene_p.y, _opt_color(opts, DUST_FALLBACK), float(opts.get("strength", 1.0)))
		_:
			push_error("unknown mortar burst %s" % kind)


func set_aroma(intensity: float, color: Color) -> void:
	_aroma_i = clampf(intensity, 0.0, 1.0)
	_aroma_color = color


func clear() -> void:
	_parts = []
	_sweeps = []
	_flash_t0 = -1.0
	_wipe_t0 = -1.0
	_aroma_acc = 0.0


func count() -> int:
	return _parts.size()


func live() -> Array[Dictionary]:
	return _parts


func active() -> bool:
	return not _parts.is_empty() or not _sweeps.is_empty() or _flash_t0 >= 0.0 or _aroma_i > 0.01 or _wipe_t0 >= 0.0


func draw(c: CanvasItem, origin: Vector2, zone: Vector2) -> void:
	_ensure_geom()
	var scale := _zone_scale(zone)
	for item in _parts:
		var p: Dictionary = item
		var a := particle_alpha(p)
		if a <= 0.002:
			continue
		var sz := particle_size(p) * scale.x
		var local := _local(Vector2(float(p["x"]), float(p["y"])), origin, zone)
		var kind := str(p["kind"])
		var col: Color = p["color"]
		if kind == "ripple":
			_stroke_ellipse(c, local, sz, sz * 0.36, _with_alpha(col, a), 1.6 * scale.x)
		elif kind == "aroma":
			_fill_blob(c, local, sz * 0.55, sz, col, a, sin(float(p["life"]) + float(p["seed"]) * 6.0) * 0.4)
		elif kind == "puff":
			_fill_puff(c, local, sz, col, a)
		elif kind == "spark":
			c.draw_circle(local, sz * 2.2, _with_alpha(col, a * 0.45))
			c.draw_circle(local, sz, _with_alpha(col, a))
		elif kind == "spill":
			_draw_spill(c, local, sz, float(p["rot"]), col, a)
		else:
			c.draw_circle(local, sz, _with_alpha(col, a * 0.85))
	_draw_sweeps(c, origin, zone, scale.x)
	_draw_flash(c, origin, zone)


func draw_below(c: CanvasItem, origin: Vector2, zone: Vector2, chips: Array, aim: Dictionary, residue: Dictionary) -> void:
	_ensure_geom()
	_draw_residue(c, origin, zone, chips, residue)
	_draw_mound(c, origin, zone, chips)
	_draw_shadow(c, origin, zone, chips, aim)


static func particle_alpha(p: Dictionary) -> float:
	var ttl := float(p["ttl"])
	var t := 0.0 if ttl <= 0.0 else float(p["life"]) / ttl
	var kind := str(p["kind"])
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
	var fade_in := minf(1.0, t * 6.0)
	return fade_in * (1.0 - t)


static func particle_size(p: Dictionary) -> float:
	var ttl := float(p["ttl"])
	var t := 0.0 if ttl <= 0.0 else float(p["life"]) / ttl
	var sz := float(p["size"])
	var kind := str(p["kind"])
	if kind == "puff":
		return sz * (1.0 + t * 1.8)
	if kind == "ripple":
		return sz + t * 34.0
	if kind == "aroma":
		return sz * (1.0 + t * 0.9)
	if kind == "dust":
		return sz * (1.0 + t * 0.3)
	return sz


func _burst_strike(zone_at: Vector2, opts: Dictionary) -> void:
	var scene := _zone_to_scene(zone_at.x, zone_at.y)
	var colors := _color_list(opts)
	var fineness := float(opts.get("fineness", 0.0))
	var hits := int(opts.get("hits", 0))
	_emit_dust(scene.x, scene.y, colors, fineness)
	var n := 2
	if hits == 0 or fineness > 0.85:
		n = 5
	_emit_sparks(scene.x, scene.y - 4.0, n)
	if _specular:
		_sweeps.append({
			"t0": _now,
			"dur": 0.32,
			"strength": 0.55 + fineness * 0.3,
		})


func _burst_land(color: Color) -> void:
	var scene := _zone_to_scene(_floor_c.x, _floor_c.y - 2.0)
	_emit_puff(scene.x, scene.y, color, 0.8)


func _burst_fine(color: Color) -> void:
	var scene := _zone_to_scene(_floor_c.x, _floor_c.y - 3.0)
	_emit_puff(scene.x, scene.y, color, 1.2)
	_emit_sparks(scene.x, scene.y, 6)
	_flash_t0 = _now
	_flash_color = color


func _burst_spill(colors: Array[Color]) -> void:
	var rim := _zone_to_scene(_mouth_c.x, _mouth_c.y + _mouth_r.y * 0.9)
	var table := _zone_pos.y + _zone_size.y - 6.0
	_emit_spill(rim.x, rim.y, table, colors)


func _burst_ripple(at: Vector2, color: Color) -> void:
	if _reduced:
		return
	_push({
		"kind": "ripple",
		"x": at.x,
		"y": at.y,
		"vx": 0.0,
		"vy": 0.0,
		"ttl": 0.7,
		"size": 6.0,
		"color": color,
		"gravity": 0.0,
		"drag": 0.0,
	})


func _burst_brush(opts: Dictionary) -> void:
	var ms := float(opts.get("ms", 500.0))
	_wipe_t0 = _now
	_wipe_dur = maxf(0.12, ms / 1000.0)
	var scene := _zone_to_scene(_floor_c.x + _floor_r.x * 0.3, _floor_c.y - 2.0)
	_emit_puff(scene.x, scene.y, _opt_color(opts, DUST_FALLBACK), 0.45)


func _emit_dust(x: float, y: float, colors: Array[Color], fineness: float) -> void:
	var n := _count(5.0 + fineness * 9.0)
	for _i in n:
		var ang := _rng.range(-PI * 0.95, -PI * 0.05)
		var speed := _rng.range(30.0, 90.0) * (1.0 - fineness * 0.45)
		_push({
			"kind": "dust",
			"x": x + _rng.range(-6.0, 6.0),
			"y": y + _rng.range(-3.0, 2.0),
			"vx": cos(ang) * speed,
			"vy": sin(ang) * speed - 20.0,
			"ttl": _rng.range(0.45, 0.95) + fineness * 0.4,
			"size": _rng.range(2.2, 5.5) + fineness * 2.0,
			"color": _pick_color(colors, DUST_FALLBACK),
			"gravity": 40.0 * (1.0 - fineness * 0.7),
			"drag": 2.4 + fineness * 1.6,
		})


func _emit_sparks(x: float, y: float, n: int) -> void:
	var amount := _count(float(n))
	for _i in amount:
		var ang := _rng.range(-PI * 0.9, -PI * 0.1)
		var speed := _rng.range(90.0, 210.0)
		_push({
			"kind": "spark",
			"x": x,
			"y": y,
			"vx": cos(ang) * speed,
			"vy": sin(ang) * speed,
			"ttl": _rng.range(0.22, 0.42),
			"size": _rng.range(1.2, 2.4),
			"color": _pick_color(GOLD, GOLD[1]),
			"gravity": 320.0,
			"drag": 0.6,
		})


func _emit_puff(x: float, y: float, color: Color, strength: float) -> void:
	var n := _count(3.0 + strength * 4.0)
	for _i in n:
		var ang := _rng.range(0.0, PI * 2.0)
		_push({
			"kind": "puff",
			"x": x + cos(ang) * _rng.range(0.0, 10.0),
			"y": y + sin(ang) * _rng.range(0.0, 4.0),
			"vx": cos(ang) * _rng.range(8.0, 26.0),
			"vy": -_rng.range(12.0, 30.0) * strength,
			"ttl": _rng.range(0.5, 0.9),
			"size": _rng.range(8.0, 16.0) * (0.6 + strength * 0.6),
			"color": color,
			"gravity": -6.0,
			"drag": 1.6,
		})


func _emit_spill(x: float, y: float, floor_y: float, colors: Array[Color]) -> void:
	var n := _count(4.0)
	for _i in n:
		var dir := -1.0 if _rng.chance(0.5) else 1.0
		_push({
			"kind": "spill",
			"x": x + dir * _rng.range(20.0, 60.0),
			"y": y + _rng.range(-6.0, 4.0),
			"vx": dir * _rng.range(40.0, 120.0),
			"vy": -_rng.range(40.0, 110.0),
			"ttl": _rng.range(1.1, 1.5),
			"size": _rng.range(4.0, 8.0),
			"color": _pick_color(colors, DUST_FALLBACK),
			"gravity": 900.0,
			"drag": 0.3,
			"rot": _rng.range(0.0, PI * 2.0),
			"spin": _rng.range(-6.0, 6.0),
			"floor_y": floor_y,
			"has_floor": true,
		})


func _emit_trail(x: float, y: float, color: Color) -> void:
	if _count(1.0) < 1 and _rng.next() > _budget_scale():
		return
	_push({
		"kind": "trail",
		"x": x + _rng.range(-5.0, 5.0),
		"y": y,
		"vx": _rng.range(-12.0, 12.0),
		"vy": _rng.range(0.0, 30.0),
		"ttl": _rng.range(0.45, 0.7),
		"size": _rng.range(1.6, 3.2),
		"color": color,
		"gravity": 700.0,
		"drag": 0.5,
	})


func _emit_aroma(dt: float) -> void:
	if _aroma_i <= 0.01 or _reduced:
		return
	_aroma_acc += dt * (0.8 + _aroma_i * 3.2) * _scale
	while _aroma_acc >= 1.0:
		_aroma_acc -= 1.0
		var scene := _zone_to_scene(_floor_c.x, _floor_c.y - _floor_r.y * 0.6)
		_push({
			"kind": "aroma",
			"x": scene.x + _rng.range(-18.0, 18.0),
			"y": scene.y,
			"vx": _rng.range(-6.0, 6.0),
			"vy": -_rng.range(22.0, 40.0) * (0.7 + _aroma_i * 0.5),
			"ttl": _rng.range(1.6, 2.6),
			"size": _rng.range(6.0, 12.0) * (0.7 + _aroma_i * 0.6),
			"color": _aroma_color,
			"gravity": -4.0,
			"drag": 0.2,
		})


func _push(p: Dictionary) -> void:
	p["life"] = 0.0
	p["seed"] = _rng.next()
	if not p.has("rot"):
		p["rot"] = 0.0
	if not p.has("spin"):
		p["spin"] = 0.0
	if not p.has("bounced"):
		p["bounced"] = false
	if not p.has("has_floor"):
		p["has_floor"] = false
		p["floor_y"] = 0.0
	_parts.append(p)


func _count(n: float) -> int:
	return maxi(0, roundi(n * _budget_scale()))


func _budget_scale() -> float:
	if _reduced:
		return minf(0.25, _scale)
	return _scale


func _pick_color(colors: Array[Color], fallback: Color) -> Color:
	if colors.is_empty():
		return fallback
	var bag: Array = []
	for col in colors:
		bag.append(col)
	var picked: Variant = _rng.pick(bag)
	if picked == null:
		return fallback
	return picked


func _color_list(opts: Dictionary) -> Array[Color]:
	var out: Array[Color] = []
	if opts.has("colors"):
		var raw: Array = opts["colors"]
		for item in raw:
			out.append(_as_color(item))
	elif opts.has("color"):
		out.append(_as_color(opts["color"]))
	return out


func _opt_color(opts: Dictionary, fallback: Color) -> Color:
	if opts.has("color"):
		return _as_color(opts["color"])
	return fallback


func _as_color(v: Variant) -> Color:
	if v is Color:
		return v
	if v is String and str(v) != "":
		return Color(str(v))
	return DUST_FALLBACK


func _trim_sweeps() -> void:
	var alive: Array[Dictionary] = []
	for sweep in _sweeps:
		var dur := float(sweep["dur"])
		var t := 1.0 if dur <= 0.0 else (_now - float(sweep["t0"])) / dur
		if t < 1.0:
			alive.append(sweep)
	_sweeps = alive
	if _flash_t0 >= 0.0 and (_now - _flash_t0) / 0.52 >= 1.0:
		_flash_t0 = -1.0


func _draw_sweeps(c: CanvasItem, origin: Vector2, zone: Vector2, scale: float) -> void:
	var alive: Array[Dictionary] = []
	for sweep in _sweeps:
		var dur := float(sweep["dur"])
		var t := 1.0 if dur <= 0.0 else (_now - float(sweep["t0"])) / dur
		if t >= 1.0:
			continue
		alive.append(sweep)
		var center := _zone_local(_mouth_c.x, _mouth_c.y, origin, zone)
		var rx := (_mouth_r.x / 100.0) * zone.x
		var ry := (_mouth_r.y / 100.0) * zone.y
		var ang := PI * (0.06 + 0.88 * t)
		var fade := sin(t * PI)
		var strength := float(sweep["strength"])
		for i in 9:
			var a := ang - float(i) * 0.055
			var px := center.x + cos(a) * rx
			var py := center.y + sin(a) * ry
			var k := (1.0 - float(i) / 9.0) * fade * strength
			var rad := (2.2 + (1.0 - float(i) / 9.0) * 2.4) * scale
			c.draw_circle(Vector2(px, py), rad, Color(1.0, 244.0 / 255.0, 214.0 / 255.0, k * 0.85))
	_sweeps = alive


func _draw_flash(c: CanvasItem, origin: Vector2, zone: Vector2) -> void:
	if _flash_t0 < 0.0:
		return
	var t := (_now - _flash_t0) / 0.52
	if t >= 1.0:
		_flash_t0 = -1.0
		return
	var center := _zone_local(_mouth_c.x, _mouth_c.y, origin, zone)
	var rx := (_mouth_r.x / 100.0) * zone.x * (1.0 + t * 0.12)
	var ry := (_mouth_r.y / 100.0) * zone.y * (1.0 + t * 0.12)
	_stroke_ellipse(c, center, rx, ry, _with_alpha(_flash_color, (1.0 - t) * 0.6), 3.0 + (1.0 - t) * 5.0)


func _draw_residue(c: CanvasItem, origin: Vector2, zone: Vector2, chips: Array, residue: Dictionary) -> void:
	if residue.is_empty() or not chips.is_empty():
		return
	var wipe_u := 0.0
	if _wipe_t0 >= 0.0:
		wipe_u = minf(1.0, (_now - _wipe_t0) / maxf(0.001, _wipe_dur))
	if wipe_u >= 1.0:
		return
	var eased := 1.0 - (1.0 - wipe_u) * (1.0 - wipe_u)
	var raw_col: Variant = residue["color"]
	var col := DUST_FALLBACK
	if raw_col is Color:
		col = raw_col as Color
	else:
		col = _as_color(raw_col)
	var amount := float(residue.get("amount", 1.0))
	var center := _zone_local(_floor_c.x, _floor_c.y, origin, zone)
	var rx := (_floor_r.x / 100.0) * zone.x * 0.92
	var ry := (_floor_r.y / 100.0) * zone.y * 1.5
	var keep := maxf(0.02, 1.0 - eased)
	center.x -= rx * eased * 0.5
	rx *= keep
	var fade := 1.0 - eased * 0.4
	_fill_puff(c, center, maxf(rx, ry), col, 0.58 * amount * fade)
	_fill_ellipse(c, center, rx, ry, _with_alpha(col, 0.3 * amount * fade))
	for i in 14:
		var a := (float(i) / 14.0) * PI * 2.0 + 0.4
		var rad := 0.55 + float((i * 37) % 11) / 22.0
		var px := center.x + cos(a) * rx * rad
		var py := center.y + sin(a) * ry * rad
		var dot := 1.1 + float((i * 13) % 5) * 0.3
		c.draw_circle(Vector2(px, py), dot, _with_alpha(col, 0.55 * amount * fade))


func _draw_mound(c: CanvasItem, origin: Vector2, zone: Vector2, chips: Array) -> void:
	if chips.is_empty():
		return
	var total := 0.0
	var dust_area := 0.0
	var cols: Array[Color] = []
	for chip in chips:
		var d: Dictionary = chip
		var area := float(d["w"]) * float(d["h"])
		total += area
		if str(d["kind"]) == "dust":
			dust_area += area
			if d.has("color"):
				cols.append(_as_color(d["color"]))
	var frac := 0.0 if total <= 0.0 else dust_area / total
	if frac <= 0.05:
		return
	var color := _average(cols, Color("#8a7a52"))
	var center := _zone_local(_floor_c.x, _floor_c.y - 1.5, origin, zone)
	var rx := (_floor_r.x / 100.0) * zone.x * (0.55 + 0.45 * frac)
	var ry := (_floor_r.y / 100.0) * zone.y * (1.4 + 0.8 * frac)
	var foot := center + Vector2(0, ry * 0.35)
	_fill_ellipse(c, foot, rx * 1.05, ry * 0.9, Color(28.0 / 255.0, 14.0 / 255.0, 4.0 / 255.0, 0.38 * frac))
	_fill_ellipse(c, center, rx, ry, _with_alpha(color, 0.9 * frac))
	_fill_ellipse(c, center + Vector2(-rx * 0.18, -ry * 0.55), rx * 0.45, ry * 0.35, _with_alpha(color, 0.98 * frac))
	_fill_ellipse(c, center + Vector2(0, ry * 0.35), rx * 0.98, ry * 0.45, Color(30.0 / 255.0, 14.0 / 255.0, 4.0 / 255.0, 0.32 * frac))
	for i in 46:
		var a := float(i) * 2.399963
		var rad := sqrt((float(i) + 0.5) / 46.0)
		var px := center.x + cos(a) * rad * rx * 0.88
		var py := center.y + sin(a) * rad * ry * 0.82
		var dot := 0.7 + float((i * 7) % 4) * 0.25
		var grain := Color(40.0 / 255.0, 20.0 / 255.0, 6.0 / 255.0, 0.28 * frac)
		if i % 3 != 0:
			grain = Color(1.0, 248.0 / 255.0, 230.0 / 255.0, 0.22 * frac)
		c.draw_circle(Vector2(px, py), dot, grain)


func _draw_shadow(c: CanvasItem, origin: Vector2, zone: Vector2, chips: Array, aim: Dictionary) -> void:
	if not _live_shadow or aim.is_empty():
		return
	var mode := str(aim.get("mode", "lean"))
	if mode == "lean":
		return
	if chips.is_empty() and mode != "grind":
		return
	var lift := float(aim.get("lift", 0.0))
	var impact := float(aim.get("impact", 0.0))
	var head_y := float(aim.get("head_y", _floor_c.y)) + _head_r.y * 0.6 + lift * 15.0 * 0.9
	var head_x := float(aim.get("head_x", _floor_c.x))
	var center := _zone_local(head_x, head_y, origin, zone)
	var rx_zone := _head_r.x * (1.05 + lift * 0.5)
	var rx := (rx_zone / 100.0) * zone.x
	var ry := ((rx_zone * _aspect * 0.42) / 100.0) * zone.y
	var alpha := 0.34 * (1.0 - lift * 0.55) + impact * 0.1
	_fill_ellipse(c, center, rx, ry, Color(30.0 / 255.0, 14.0 / 255.0, 4.0 / 255.0, alpha))
	_fill_ellipse(c, center, rx * 0.7, ry * 0.7, Color(30.0 / 255.0, 14.0 / 255.0, 4.0 / 255.0, alpha * 0.5))


func _fill_puff(c: CanvasItem, center: Vector2, radius: float, col: Color, alpha: float) -> void:
	c.draw_circle(center, radius, _with_alpha(col, 0.0))
	c.draw_circle(center, radius * 0.72, _with_alpha(col, alpha * 0.4))
	c.draw_circle(center, radius * 0.38, _with_alpha(col, alpha * 0.9))


func _fill_blob(c: CanvasItem, center: Vector2, rx: float, ry: float, col: Color, alpha: float, rot: float) -> void:
	c.draw_set_transform(center, rot, Vector2.ONE)
	_fill_ellipse(c, Vector2.ZERO, rx, ry, _with_alpha(col, alpha))
	_fill_ellipse(c, Vector2.ZERO, rx * 0.45, ry * 0.45, _with_alpha(col, alpha * 0.65))
	c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _draw_spill(c: CanvasItem, center: Vector2, sz: float, rot: float, col: Color, alpha: float) -> void:
	c.draw_set_transform(center, rot, Vector2.ONE)
	_fill_ellipse(c, Vector2.ZERO, sz, sz * 0.62, _with_alpha(col, alpha))
	_stroke_ellipse(c, Vector2.ZERO, sz, sz * 0.62, Color(40.0 / 255.0, 20.0 / 255.0, 6.0 / 255.0, alpha * 0.55), 0.8)
	_fill_ellipse(c, Vector2(-sz * 0.3, -sz * 0.2), sz * 0.32, sz * 0.18, Color(1.0, 244.0 / 255.0, 220.0 / 255.0, alpha * 0.35))
	c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _fill_ellipse(c: CanvasItem, center: Vector2, rx: float, ry: float, col: Color) -> void:
	if rx <= 0.2 or ry <= 0.2 or col.a <= 0.001:
		return
	c.draw_colored_polygon(_ellipse(center, rx, ry, 18, false), col)


func _stroke_ellipse(c: CanvasItem, center: Vector2, rx: float, ry: float, col: Color, width: float) -> void:
	if rx <= 0.2 or ry <= 0.2 or col.a <= 0.001:
		return
	c.draw_polyline(_ellipse(center, rx, ry, 28, true), col, width, true)


func _ellipse(center: Vector2, rx: float, ry: float, n: int, close: bool) -> PackedVector2Array:
	var pts := PackedVector2Array()
	var steps := n
	if close:
		steps = n
	for i in steps:
		var a := TAU * float(i) / float(n)
		pts.append(center + Vector2(cos(a) * rx, sin(a) * ry))
	if close and pts.size() > 0:
		pts.append(pts[0])
	return pts


func _with_alpha(col: Color, alpha: float) -> Color:
	return Color(col.r, col.g, col.b, clampf(alpha, 0.0, 1.0))


func _average(cols: Array[Color], fallback: Color) -> Color:
	if cols.is_empty():
		return fallback
	var acc := Color(0, 0, 0, 1)
	for col in cols:
		acc.r += col.r
		acc.g += col.g
		acc.b += col.b
	var n := float(cols.size())
	return Color(acc.r / n, acc.g / n, acc.b / n, 1.0)


func _zone_to_scene(zx: float, zy: float) -> Vector2:
	return _zone_pos + Vector2(zx / 100.0 * _zone_size.x, zy / 100.0 * _zone_size.y)


func _zone_scale(zone: Vector2) -> Vector2:
	return Vector2(zone.x / _zone_size.x, zone.y / _zone_size.y)


func _local(scene_p: Vector2, origin: Vector2, zone: Vector2) -> Vector2:
	var scale := _zone_scale(zone)
	return (scene_p - _zone_pos) * scale + (_zone_pos - origin)


func _zone_local(zx: float, zy: float, origin: Vector2, zone: Vector2) -> Vector2:
	return _local(_zone_to_scene(zx, zy), origin, zone)


func _ensure_geom() -> void:
	if _geom_ok:
		return
	_zone_pos = Vector2(290, 506)
	_zone_size = Vector2(250, 273)
	_aspect = _zone_size.x / _zone_size.y
	_floor_c = Vector2(0.5016, 0.3609) * 100.0
	_floor_r = Vector2(0.272, 0.0518) * 100.0
	_mouth_c = Vector2(0.5038, 0.2313) * 100.0
	_mouth_r = Vector2(0.4157, 0.1854) * 100.0
	var head_diam := _mouth_r.x * 2.0 * 0.28
	_head_r = Vector2(head_diam * 0.5, head_diam * 0.5 * _aspect)
	_geom_ok = true
