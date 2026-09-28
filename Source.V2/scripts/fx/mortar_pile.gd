class_name MortarPile
extends RefCounted
## Chip x/y/w/h are percents of the bowl box (Web `.cst-bowl` / BOWL_MORTAR), not zone percent; rot is degrees; sprite is the 1-based `pieces/{kind}_{sprite}.png` index (dust is 0).

const WORK_COARSE := 1.0
const WORK_CRUSHED := 2.2
const WORK_FINE := 3.6
const DUST_DRAW := 0.42

const BEAT_HZ := 1.9
const PH_LIFT_END := 0.42
const PH_FALL_END := 0.56
const PH_PRESS_END := 0.78
const LIFT_H := 15.0
const ORBIT_SPEED := 3.8
const ORBIT_K := 0.55

static var FRAME_AXES: PackedFloat32Array = PackedFloat32Array([-78.0, -62.0, -84.0, -48.0, -132.0, -22.0])
const GRIND_FRAMES: Array[int] = [1, 2, 3, 4, 5]
const HEAD_ANCHOR := Vector2(0.42, 0.74)
const KNOBS: Array[Vector2] = [
	Vector2(0.5163, 0.1713),
	Vector2(0.6346, 0.2326),
	Vector2(0.4683, 0.1618),
	Vector2(0.7266, 0.3134),
	Vector2(0.113, 0.3129),
	Vector2(0.8488, 0.5226),
]
const NATURAL: Dictionary = {
	"flower": 44.0,
	"thread": 54.0,
	"leaf": 48.0,
	"root": 44.0,
	"seed": 40.0,
	"star": 48.0,
	"petal": 42.0,
	"dust": 10.0,
}

static var _geom_ok: bool = false
static var zone_pos: Vector2 = Vector2(290, 506)
static var zone_size: Vector2 = Vector2(250, 273)
static var aspect: float = 250.0 / 273.0
static var floor_c: Vector2 = Vector2.ZERO
static var floor_r: Vector2 = Vector2.ZERO
static var mouth_c: Vector2 = Vector2.ZERO
static var mouth_r: Vector2 = Vector2.ZERO
static var bowl_left: float = 0.0
static var bowl_top: float = 0.0
static var bowl_w: float = 1.0
static var bowl_h: float = 1.0
static var bowl_px: Vector2 = Vector2.ONE
static var head_r: Vector2 = Vector2.ONE
static var head_r_px: float = 1.0
static var pestle_box: Vector2 = Vector2.ONE

var rng: KimRng
var _seed: int = 1
var _chips: Array[Dictionary] = []
var _groups: Array[Dictionary] = []
var _mix_key: String = ""
var _seq: int = 1
var _pile_units: int = 1
var _pile_crush: float = 0.0
var _pile_work: float = 0.0
var _pile_area: float = 0.0
var _fresh: float = 1.0
var _mode: String = "lean"
var _orbit: float = -PI / 2.0
var _beat: float = 0.0
var _last_frame: int = 2
var _aim: Dictionary = {}
var _residue: Dictionary = {}
var _state_grinding: bool = false
var _last_strike: Dictionary = {}

signal struck(info: Dictionary)


static func ensure_geom() -> void:
	if _geom_ok:
		return
	zone_pos = Vector2(290, 506)
	zone_size = Vector2(250, 273)
	aspect = zone_size.x / zone_size.y
	floor_c = Vector2(0.5016, 0.3609) * 100.0
	floor_r = Vector2(0.272, 0.0518) * 100.0
	mouth_c = Vector2(0.5038, 0.2313) * 100.0
	mouth_r = Vector2(0.4157, 0.1854) * 100.0
	var rx := floor_r.x * 1.12
	var ry := floor_r.y * 1.9
	bowl_w = rx / 0.42
	bowl_h = ry / 0.32
	bowl_left = floor_c.x - bowl_w * 0.5
	bowl_top = floor_c.y - 0.76 * bowl_h
	bowl_px = Vector2(zone_size.x * bowl_w / 100.0, zone_size.y * bowl_h / 100.0)
	var head_diam := mouth_r.x * 2.0 * 0.28
	head_r = Vector2(head_diam * 0.5, head_diam * 0.5 * aspect)
	head_r_px = (head_r.x / 100.0) * zone_size.x
	var pestle_scale := head_diam / 230.0
	pestle_box = Vector2(1360.0 * pestle_scale, 1088.0 * pestle_scale * aspect)
	_geom_ok = true


func _init() -> void:
	ensure_geom()
	rng = KimRng.new(1)
	_aim = _lean_aim()


## `state` matches Game.mortar: ingredientId, quantity, grindWork (normalized when portions is absent), portions[{ingredientId, quantity, grindWork absolute}], grinding. `seed` builds the KimRng exposed as `rng`.
func setup(state: Dictionary, seed: int = 1) -> void:
	_seed = seed if seed != 0 else 1
	rng = KimRng.new(_seed)
	sync(state)


func sync(state: Dictionary) -> void:
	if state.has("grinding"):
		_state_grinding = bool(state["grinding"])
	var portions := _portions_from(state)
	if portions.is_empty():
		_clear_pile()
		return
	var key := _pile_key(portions)
	var total := _total_qty(portions)
	var scale_mul := pow(maxf(1.0, total), -0.35)
	if key != _mix_key or _grind_dropped(portions) or portions.size() != _groups.size():
		_mix_key = key
		_pile_units = clampi(int(round(total)), 1, 3)
		_groups = []
		for portion in portions:
			_groups.append(_bake(portion, scale_mul))
		_chips = _flatten()
		_pile_work = _focus_norm(portions)
		_refresh_crush()
		_residue = {}
		_update_aim()
		return
	var pending := false
	for portion in portions:
		var group := _find_group(str(portion["ingredientId"]))
		if group.is_empty():
			continue
		group["color"] = str(portion["color"])
		var qty := float(portion["quantity"])
		if qty <= 0.0:
			continue
		var norm := float(portion["grindWork"]) / qty
		if norm - float(group["applied"]) >= 0.05:
			group["target"] = norm
			pending = true
	_pile_work = _focus_norm(portions)
	if not pending:
		_refresh_crush()
		_update_aim()
		return
	var behind := 0.0
	for group in _groups:
		behind = maxf(behind, float(group["target"]) - float(group["applied"]))
	if (_mode == "grind" or _state_grinding) and behind < 0.75:
		_update_aim()
		return
	if _apply_pending(_impact_at(_orbit)):
		_pile_units = clampi(int(round(total)), 1, 3)
		_refresh_crush()
		_update_aim()


## `impact`, when a Vector2, is the strike point in bowl percent (same space as chip x/y). Null uses the pestle orbit. The beat decides when a strike lands.
func update(dt: float, grinding: bool, impact: Variant = null) -> void:
	_last_strike = {}
	_state_grinding = grinding
	var was_grind := _mode == "grind"
	if grinding and not was_grind:
		_orbit = -PI / 2.0
		_beat = 0.18
		_mode = "grind"
	elif was_grind and not grinding:
		if _apply_pending(_resolve_impact(impact)):
			_refresh_crush()
		_mode = "rest" if not _chips.is_empty() else "lean"
	elif not grinding:
		_mode = "rest" if not _chips.is_empty() else "lean"
	if _mode == "grind":
		var before := _beat
		_beat += dt * BEAT_HZ
		_orbit += dt * ORBIT_SPEED * _orbit_weight(before)
		if _orbit > PI * 12.0:
			_orbit -= PI * 12.0
		var crossed: bool = floor(_beat - PH_FALL_END) > floor(before - PH_FALL_END)
		if _beat >= 1.0:
			_beat -= floor(_beat)
		if crossed:
			_strike_now(impact)
	_update_aim()
	_tick(dt)


func chips() -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for chip in _chips:
		out.append(_public_chip(chip))
	return out


func pestle() -> Dictionary:
	return _aim.duplicate()


func last_strike() -> Dictionary:
	return _last_strike.duplicate(true)


func residue() -> Dictionary:
	if _residue.is_empty():
		return {}
	return {
		"color": Color(str(_residue["color"])),
		"amount": float(_residue["amount"]),
		"hex": str(_residue["color"]),
	}


func clear_residue() -> void:
	if _residue.is_empty():
		return
	_residue = {}


func bowl() -> Dictionary:
	ensure_geom()
	return {"left": bowl_left, "top": bowl_top, "width": bowl_w, "height": bowl_h}


func bowl_to_zone(x: float, y: float) -> Vector2:
	ensure_geom()
	return Vector2(bowl_left + (x / 100.0) * bowl_w, bowl_top + (y / 100.0) * bowl_h)


func zone_to_bowl(x: float, y: float) -> Vector2:
	ensure_geom()
	return Vector2((x - bowl_left) / bowl_w * 100.0, (y - bowl_top) / bowl_h * 100.0)


func scene_to_zone(x: float, y: float) -> Vector2:
	ensure_geom()
	return Vector2((x - zone_pos.x) / zone_size.x * 100.0, (y - zone_pos.y) / zone_size.y * 100.0)


func zone_to_scene(x: float, y: float) -> Vector2:
	ensure_geom()
	return Vector2(zone_pos.x + (x / 100.0) * zone_size.x, zone_pos.y + (y / 100.0) * zone_size.y)


func inside(chip: Dictionary) -> bool:
	ensure_geom()
	var pos := _contain_point(float(chip["x"]), float(chip["y"]), float(chip["w"]) * 0.5, float(chip["h"]) * 0.5)
	return absf(pos.x - float(chip["x"])) < 0.08 and absf(pos.y - float(chip["y"])) < 0.08


func scoop_under(scene_x: float, scene_y: float) -> Array[Dictionary]:
	var z := scene_to_zone(scene_x, scene_y)
	var at := zone_to_bowl(z.x, z.y)
	var taken: Array[Dictionary] = []
	var stay: Array[Dictionary] = []
	var ids: Dictionary = {}
	for chip in _chips:
		var dx := (float(chip["x"]) - at.x) / 24.0
		var dy := (float(chip["y"]) - at.y) / 30.0
		if dx * dx + dy * dy <= 1.0:
			taken.append(chip)
			ids[int(chip["id"])] = true
		else:
			stay.append(chip)
	if taken.is_empty():
		return []
	_chips = stay
	_drop_group_ids(ids)
	_add_residue(taken)
	return _public_list(taken)


func scoop_rest() -> Array[Dictionary]:
	if _chips.is_empty():
		return []
	var taken: Array[Dictionary] = _chips.duplicate()
	_chips = []
	for group in _groups:
		group["chips"] = []
	_add_residue(taken)
	return _public_list(taken)


func make_particles() -> MortarParticles:
	return MortarParticles.new(rng.state)


func handle_tip_y(pose: Dictionary = {}) -> float:
	ensure_geom()
	var p: Dictionary = _aim if pose.is_empty() else pose
	var frame := clampi(int(p["frame"]), 1, 6)
	var knob := KNOBS[frame - 1]
	var dx := (knob.x - HEAD_ANCHOR.x) * pestle_box.x
	var dy := (knob.y - HEAD_ANCHOR.y) * pestle_box.y
	var rad := deg_to_rad(float(p["rotate"]))
	return float(p["head_y"]) + dx * sin(rad) + dy * cos(rad)


func pestle_in_front(pose: Dictionary = {}) -> bool:
	var p: Dictionary = _aim if pose.is_empty() else pose
	var mode := str(p.get("mode", "lean"))
	if mode == "rest":
		return true
	if mode != "grind":
		return false
	return sin(float(p["orbit"])) >= 0.0


static func kind_for(id: String) -> String:
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


static func sprite_count(kind: String) -> int:
	if kind == "dust":
		return 0
	return 7


static func generation_cap(work: float) -> int:
	if work < WORK_COARSE:
		return 0
	if work < WORK_CRUSHED:
		return 1
	if work < WORK_FINE:
		return 2
	return 3


static func strike_profile(phase: float) -> Dictionary:
	var t := fmod(phase, 1.0)
	if t < 0.0:
		t += 1.0
	if t < PH_LIFT_END:
		var u := t / PH_LIFT_END
		return {"lift": _ease_out(u), "impact": 0.0, "twist": 0.0}
	if t < PH_FALL_END:
		var u2 := (t - PH_LIFT_END) / (PH_FALL_END - PH_LIFT_END)
		var impact := 0.0
		if u2 > 0.85:
			impact = (u2 - 0.85) / 0.15
		return {"lift": 1.0 - _ease_in(u2), "impact": impact, "twist": 0.0}
	if t < PH_PRESS_END:
		var u3 := (t - PH_FALL_END) / (PH_PRESS_END - PH_FALL_END)
		return {"lift": 0.0, "impact": 1.0 - 0.25 * u3, "twist": sin(u3 * PI * 2.0) * 6.0}
	var u4 := (t - PH_PRESS_END) / (1.0 - PH_PRESS_END)
	return {"lift": 0.0, "impact": (1.0 - _ease_in_out(u4)) * 0.75, "twist": 0.0}


static func clip_polygon(nick: int) -> PackedVector2Array:
	match nick:
		0:
			return PackedVector2Array([Vector2(0.34, 0.06), Vector2(1, 0), Vector2(0.96, 1), Vector2(0, 0.92), Vector2(0, 0.38)])
		1:
			return PackedVector2Array([Vector2(0, 0), Vector2(0.68, 0.04), Vector2(1, 0.36), Vector2(1, 1), Vector2(0.06, 0.96)])
		2:
			return PackedVector2Array([Vector2(0.04, 0), Vector2(1, 0.08), Vector2(1, 0.64), Vector2(0.70, 1), Vector2(0, 1)])
		3:
			return PackedVector2Array([Vector2(0, 0), Vector2(1, 0), Vector2(0.96, 1), Vector2(0.36, 1), Vector2(0, 0.62)])
		_:
			return PackedVector2Array([Vector2(0.14, 0), Vector2(0.86, 0.04), Vector2(1, 0.22), Vector2(0.92, 1), Vector2(0.08, 0.94), Vector2(0, 0.28)])


static func mix_hex(colors: PackedStringArray) -> String:
	if colors.is_empty():
		return "#8a7a52"
	var r_sum := 0
	var g_sum := 0
	var b_sum := 0
	var n := 0
	for raw in colors:
		var s := raw.strip_edges()
		if s.length() != 7 or not s.begins_with("#"):
			continue
		var col := Color(s)
		r_sum += col.r8
		g_sum += col.g8
		b_sum += col.b8
		n += 1
	if n == 0:
		return colors[0]
	return "#%02x%02x%02x" % [
		int(round(float(r_sum) / float(n))),
		int(round(float(g_sum) / float(n))),
		int(round(float(b_sum) / float(n))),
	]


func _clear_pile() -> void:
	_mix_key = ""
	_groups = []
	_chips = []
	_pile_crush = 0.0
	_pile_work = 0.0
	_pile_area = 0.0
	_fresh = 1.0
	_pile_units = 1
	_mode = "lean"
	_orbit = -PI / 2.0
	_beat = 0.0
	_update_aim()


func _portions_from(state: Dictionary) -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	var raw: Variant = state.get("portions", null)
	if raw is Array and not (raw as Array).is_empty():
		for item in raw:
			var d: Dictionary = item
			var id := str(d.get("ingredientId", ""))
			if id == "":
				continue
			var col := _color_of(id)
			if d.has("color") and str(d["color"]) != "":
				col = str(d["color"])
			out.append({
				"ingredientId": id,
				"quantity": float(d.get("quantity", 0.0)),
				"grindWork": float(d.get("grindWork", 0.0)),
				"color": col,
			})
		return out
	var id2 := str(state.get("ingredientId", ""))
	if id2 == "":
		return out
	var qty := float(state.get("quantity", 0.0))
	out.append({
		"ingredientId": id2,
		"quantity": qty,
		"grindWork": float(state.get("grindWork", 0.0)) * qty,
		"color": _color_of(id2),
	})
	return out


func _color_of(id: String) -> String:
	var defs: Dictionary = Catalog.load_defs()
	var ings: Array = defs.get("ingredients", [])
	for ing in ings:
		var d: Dictionary = ing
		if str(d.get("id", "")) == id:
			return str(d.get("color", "#8a7a52"))
	return "#8a7a52"


func _pile_key(portions: Array[Dictionary]) -> String:
	var parts: PackedStringArray = PackedStringArray()
	for portion in portions:
		parts.append("%s:%s" % [str(portion["ingredientId"]), str(portion["quantity"])])
	return "|".join(parts)


func _total_qty(portions: Array[Dictionary]) -> float:
	var total := 0.0
	for portion in portions:
		total += float(portion["quantity"])
	return total


func _grind_dropped(portions: Array[Dictionary]) -> bool:
	for portion in portions:
		var qty := float(portion["quantity"])
		if qty <= 0.0:
			continue
		var norm := float(portion["grindWork"]) / qty
		for group in _groups:
			if str(group["id"]) != str(portion["ingredientId"]):
				continue
			if norm < float(group["applied"]) - 0.05:
				return true
	return false


func _focus_norm(portions: Array[Dictionary]) -> float:
	var pending: Array[Dictionary] = []
	for portion in portions:
		if float(portion["grindWork"]) < WORK_FINE * float(portion["quantity"]) - 0.02:
			pending.append(portion)
	var list: Array[Dictionary] = pending if not pending.is_empty() else portions
	var best := INF
	for portion in list:
		var qty := maxf(1.0, float(portion["quantity"]))
		best = minf(best, float(portion["grindWork"]) / qty)
	if best == INF:
		return 0.0
	return best


func _find_group(id: String) -> Dictionary:
	for group in _groups:
		if str(group["id"]) == id:
			return group
	return {}


func _flatten() -> Array[Dictionary]:
	var all: Array[Dictionary] = []
	for group in _groups:
		var list: Array = group["chips"]
		for chip in list:
			all.append(chip)
	return all


func _bake(portion: Dictionary, scale_mul: float) -> Dictionary:
	var id := str(portion["ingredientId"])
	var qty := float(portion["quantity"])
	var norm := 0.0
	if qty > 0.0:
		norm = float(portion["grindWork"]) / qty
	var kind := kind_for(id)
	var next: Array = _spawn(qty, kind, scale_mul)
	var area := _pile_area
	var rehearsal := mini(64, maxi(8, int(ceil(norm / 0.05))))
	for i in rehearsal:
		var work := (float(i + 1) / float(rehearsal)) * norm
		_orbit += 0.85
		next = _hold(_strike_at(next, _impact_at(_orbit), false, work), work)
	var baked: Array = _paint(_hold(_finish_dust(next, norm), norm), str(portion["color"]), id)
	return {
		"id": id,
		"applied": norm,
		"target": norm,
		"color": str(portion["color"]),
		"chips": baked,
		"area": area,
	}


func _paint(list: Array, color: String, id: String) -> Array:
	var out: Array = []
	for chip in list:
		var d: Dictionary = chip
		d["color"] = color
		d["ingredient_id"] = id
		out.append(d)
	return out


func _spawn_count(units: float, seed_n: float) -> float:
	var extra := roundi(_rand(seed_n) * units)
	return 3.0 * units + float(extra)


func _spawn(units: float, kind: String, scale_mul: float) -> Array:
	var count := _spawn_count(units, units * 17.0 + float(kind.length()))
	var next: Array = []
	var i := 0
	while float(i) < count:
		var angle := (float(i) / count) * PI * 2.0 + _rand(float(i) + 3.0) * 0.4
		var spread := 0.35 + _rand(float(i) + 11.0) * 0.55
		var size: Dictionary = _coarse_size(kind, float(i) + 5.0, scale_mul)
		var raw_x := 50.0 + cos(angle) * (10.0 + 16.0 * spread)
		var raw_y := 74.0 + sin(angle) * (5.0 + 7.0 * spread)
		var pos := _contain_point(raw_x, raw_y, float(size["w"]) * 0.5, float(size["h"]) * 0.5)
		var rot := _rand(float(i) + 2.0) * 50.0 - 25.0
		if kind == "thread":
			rot = _rand(float(i) + 2.0) * 140.0 - 70.0
		var id := _seq
		_seq += 1
		next.append({
			"id": id,
			"x": pos.x,
			"y": pos.y,
			"w": float(size["w"]),
			"h": float(size["h"]),
			"rot": rot,
			"crush": 0.0,
			"delay": float(i) * 0.03,
			"nick": -1,
			"seed": i + 1,
			"kind": kind,
			"sprite": int(size["sprite"]),
			"generation": 0,
			"vx": 0.0,
			"vy": 0.0,
			"hop": 0.0,
			"color": "",
			"ingredient_id": "",
		})
		i += 1
	_pile_area = _area(next)
	_fresh = 1.0
	return next


func _coarse_size(kind: String, seed_n: float, scale_mul: float) -> Dictionary:
	var count := maxi(1, sprite_count(kind))
	var sprite := int(floor(_rand(seed_n + 9.0) * float(count))) % count
	var aspect_k := _aspect(kind, sprite)
	var natural := float(NATURAL.get(kind, 42.0))
	var longest := natural * (0.88 + _rand(seed_n) * 0.24) * scale_mul
	var wpx := longest if aspect_k >= 1.0 else longest * aspect_k
	var hpx := longest / aspect_k if aspect_k >= 1.0 else longest
	ensure_geom()
	return {
		"w": (wpx / bowl_px.x) * 100.0,
		"h": (hpx / bowl_px.y) * 100.0,
		"sprite": sprite,
	}


func _aspect(kind: String, sprite: int) -> float:
	var row := PackedFloat32Array()
	match kind:
		"flower":
			row = PackedFloat32Array([1.038, 1.181, 1.274, 1.414, 1.61, 1.43, 1.149])
		"thread":
			row = PackedFloat32Array([0.691, 1.046, 0.793, 0.996, 0.355, 0.844, 4.339])
		"leaf":
			row = PackedFloat32Array([0.813, 1.249, 1.255, 1.347, 1.22, 1.098, 1.077])
		"root":
			row = PackedFloat32Array([1.438, 1.202, 0.91, 1.707, 1.128, 1.094, 1.158])
		"seed":
			row = PackedFloat32Array([0.777, 0.691, 0.836, 0.955, 0.645, 0.766, 0.898])
		"star":
			row = PackedFloat32Array([1.08, 1.103, 1.103, 1.071, 1.062, 1.012, 1.076])
		"petal":
			row = PackedFloat32Array([0.707, 1.91, 0.703, 1.12, 1.422, 0.97, 2.081])
		_:
			return 1.0
	if sprite < 0 or sprite >= row.size():
		return 1.0
	return row[sprite]


func _rand(seed_n: float) -> float:
	var x := sin(seed_n * 127.1) * 43758.5453
	return x - floor(x)


func _size_limit(work: float) -> float:
	var t := clampf(work / WORK_FINE, 0.0, 1.0)
	return 80.0 * pow(16.0 / 80.0, t)


func _area(list: Array) -> float:
	var sum := 0.0
	for chip in list:
		var d: Dictionary = chip
		sum += float(d["w"]) * float(d["h"])
	return sum


func _hold(list: Array, work: float) -> Array:
	if _pile_area <= 0.0 or list.is_empty():
		return list
	_fresh += (1.0 - _fresh) * 0.4
	var area := _area(list)
	if area <= 0.0:
		return list
	var powder := work >= WORK_FINE - 0.02
	var cover := maxf(900.0, float(list.size()) * 140.0)
	var target := (_pile_area if not powder else minf(_pile_area, cover)) * _fresh
	var k := sqrt(target / area)
	var scaled: Array = []
	for chip in list:
		var d: Dictionary = chip.duplicate()
		var w := float(d["w"]) * k
		var h := float(d["h"]) * k
		if powder:
			w = maxf(8.0, w)
			h = maxf(12.0, h)
		var pos := _contain_point(float(d["x"]), float(d["y"]), w * 0.5, h * 0.5)
		d["w"] = w
		d["h"] = h
		d["x"] = pos.x
		d["y"] = pos.y
		scaled.append(d)
	return _spread(scaled)


func _round_grain(chip: Dictionary) -> Dictionary:
	var d := chip.duplicate()
	var area := maxf(1.0, float(d["w"]) * float(d["h"]))
	var h := sqrt(area * 2.4)
	d["h"] = h
	d["w"] = area / h
	return d


func _spread(list: Array) -> Array:
	var small := 0
	for chip in list:
		var d: Dictionary = chip
		if maxf(float(d["w"]), float(d["h"])) < 48.0:
			small += 1
	if small < 4:
		return list
	var ranked: Array = []
	for chip in list:
		ranked.append(chip)
	ranked.sort_custom(_by_id)
	var placed: Dictionary = {}
	for index in ranked.size():
		var chip: Dictionary = ranked[index]
		if maxf(float(chip["w"]), float(chip["h"])) >= 48.0:
			continue
		var angle := float(index) * 2.399963
		var rad := sqrt((float(index) + 0.5) / float(ranked.size()))
		var pos := _contain_point(
			50.0 + cos(angle) * rad * 24.0,
			70.0 + sin(angle) * rad * 11.0,
			float(chip["w"]) * 0.5,
			float(chip["h"]) * 0.5
		)
		placed[int(chip["id"])] = pos
	var out: Array = []
	for chip in list:
		var d: Dictionary = chip
		var id := int(d["id"])
		if not placed.has(id):
			out.append(d)
			continue
		var pos: Vector2 = placed[id]
		var copy := d.duplicate()
		copy["x"] = pos.x
		copy["y"] = pos.y
		copy["vx"] = 0.0
		copy["vy"] = 0.0
		out.append(copy)
	return out


func _by_id(a: Dictionary, b: Dictionary) -> bool:
	return int(a["id"]) < int(b["id"])


func _finish_dust(list: Array, work: float) -> Array:
	if work < WORK_FINE - 0.02:
		return list
	var out: Array = []
	for chip in list:
		var d: Dictionary = _round_grain(chip)
		d["kind"] = "dust"
		d["rot"] = 0.0
		out.append(d)
	return out


func _split(src: Dictionary, impact: Vector2, live: bool, work: float) -> Array:
	var generation := int(src["generation"]) + 1
	var span := maxf(float(src["w"]), float(src["h"]))
	var powdered := span * 0.74 <= maxf(22.0, _size_limit(work)) and work >= WORK_CRUSHED
	var scale := 0.78 if powdered else 0.74
	var kind := "dust" if powdered else str(src["kind"])
	var dx := float(src["x"]) - impact.x
	var dy := float(src["y"]) - impact.y
	var len := maxf(0.001, sqrt(dx * dx + dy * dy))
	var nx := dx / len
	var ny := dy / len
	var fly := maxf(1.6, minf(float(src["w"]), float(src["h"])) * 0.1)
	if live:
		fly = maxf(3.2, minf(float(src["w"]), float(src["h"])) * 0.22)
	var left := _make_half(src, -1.0, int(src["id"]), live, powdered, scale, nx, ny, fly, generation, kind)
	var right := _make_half(src, 1.0, -1, live, powdered, scale, nx, ny, fly, generation, kind)
	return [left, right]


func _make_half(src: Dictionary, sign: float, reuse_id: int, live: bool, powdered: bool, scale: float, nx: float, ny: float, fly: float, generation: int, kind: String) -> Dictionary:
	var wobble := 0.82 + _rand(float(_seq) + sign + 3.0) * 0.22
	var width := maxf(8.0, float(src["w"]) * scale * wobble)
	var height := maxf(8.0, float(src["h"]) * scale * wobble)
	var raw_x := float(src["x"]) + nx * fly * sign + (_rand(float(_seq)) - 0.5) * 2.0
	var raw_y := float(src["y"]) + ny * fly * sign * 0.7 + (_rand(float(_seq) + 4.0) - 0.5) * 1.6
	var pos := _contain_point(raw_x, raw_y, width * 0.5, height * 0.5)
	var speed := 0.0
	if live:
		speed = 1.6 + _rand(float(_seq) + 8.0) * 0.8
	var id := reuse_id
	if reuse_id < 0:
		id = _seq
		_seq += 1
	var rot := 0.0
	if not powdered:
		rot = float(src["rot"]) + sign * (18.0 + _rand(float(_seq) + 1.0) * 28.0)
	var nick := int(floor(_rand(float(_seq) + 6.0) * 4.0))
	var seed_v := id
	if reuse_id < 0:
		seed_v = _seq
	return {
		"id": id,
		"x": pos.x,
		"y": pos.y,
		"w": width,
		"h": height,
		"rot": rot,
		"crush": minf(1.0, float(generation) / 3.0),
		"delay": 0.0,
		"nick": nick,
		"seed": seed_v,
		"kind": kind,
		"sprite": int(src["sprite"]),
		"generation": generation,
		"vx": nx * speed * sign if live else 0.0,
		"vy": ny * speed * sign * 0.65 if live else 0.0,
		"hop": 0.6 if live else 0.0,
		"color": str(src.get("color", "")),
		"ingredient_id": str(src.get("ingredient_id", "")),
	}


func _contain_point(x: float, y: float, rad_x: float, rad_y: float) -> Vector2:
	var cx := 50.0
	var cy := 76.0
	var rx := maxf(8.0, 42.0 - rad_x)
	var ry := maxf(8.0, 32.0 - rad_y)
	var dx := (x - cx) / rx
	var dy := (y - cy) / ry
	var d2 := dx * dx + dy * dy
	if d2 <= 1.0:
		return Vector2(x, y)
	var d := sqrt(d2)
	return Vector2(cx + (dx / d) * rx * 0.96, cy + (dy / d) * ry * 0.96)


func _under_head(chip: Dictionary, impact: Vector2, k: float) -> bool:
	ensure_geom()
	var dx := ((float(chip["x"]) - impact.x) / 100.0) * bowl_px.x
	var dy := ((float(chip["y"]) - impact.y) / 100.0) * bowl_px.y
	var r := head_r_px * k
	return dx * dx + dy * dy <= r * r


func _strike_at(list: Array, impact: Vector2, live: bool, work: float) -> Array:
	if list.is_empty():
		return list
	var limit := _size_limit(work)
	var hits: Array[int] = []
	for index in list.size():
		var chip: Dictionary = list[index]
		if str(chip["kind"]) == "dust" or maxf(float(chip["w"]), float(chip["h"])) <= limit * 1.04:
			continue
		if _under_head(chip, impact, 1.45):
			hits.append(index)
	if hits.is_empty():
		if not live:
			return list
		return _nudge(list, impact)
	_fresh = minf(1.16, _fresh + 0.05 * float(hits.size()))
	var hit: Dictionary = {}
	for index in hits:
		hit[index] = true
	var crowded := list.size() + hits.size() > 48
	var next: Array = []
	for index in list.size():
		var chip: Dictionary = list[index]
		if not hit.has(index):
			next.append(chip)
			continue
		if crowded:
			var halves: Array = _split(chip, impact, false, work)
			var shrunk: Dictionary = halves[0]
			shrunk["id"] = int(chip["id"])
			shrunk["vx"] = 0.0
			shrunk["vy"] = 0.0
			shrunk["hop"] = 0.5 if live else 0.0
			next.append(shrunk)
			continue
		var pair: Array = _split(chip, impact, live, work)
		next.append(pair[0])
		next.append(pair[1])
	return next


func _nudge(list: Array, impact: Vector2) -> Array:
	var best := 0
	var best_dist := INF
	for index in list.size():
		var chip: Dictionary = list[index]
		var dist := pow(float(chip["x"]) - impact.x, 2.0) + pow(float(chip["y"]) - impact.y, 2.0)
		if dist < best_dist:
			best_dist = dist
			best = index
	var out: Array = []
	for index in list.size():
		var chip: Dictionary = list[index]
		if index != best:
			out.append(chip)
			continue
		var away_x := float(chip["x"]) - impact.x
		var away_y := float(chip["y"]) - impact.y
		var dist := maxf(0.001, sqrt(away_x * away_x + away_y * away_y))
		var pos := _contain_point(
			float(chip["x"]) + (away_x / dist) * 1.4,
			float(chip["y"]) + (away_y / dist) * 1.1,
			float(chip["w"]) * 0.5,
			float(chip["h"]) * 0.5
		)
		var copy := chip.duplicate()
		copy["x"] = pos.x
		copy["y"] = pos.y
		copy["vx"] = (away_x / dist) * 0.35
		copy["vy"] = (away_y / dist) * 0.25
		copy["hop"] = 0.4
		out.append(copy)
	return out


func _jolt(list: Array, impact: Vector2) -> Dictionary:
	var hits: Array[Dictionary] = []
	var next: Array[Dictionary] = []
	for chip in list:
		var d: Dictionary = chip
		if not _under_head(d, impact, 1.6):
			next.append(d)
			continue
		hits.append(d)
		var dx := float(d["x"]) - impact.x
		var dy := float(d["y"]) - impact.y
		var dist := maxf(0.001, sqrt(dx * dx + dy * dy))
		var push := 0.5 if str(d["kind"]) == "dust" else 0.9
		var copy := d.duplicate()
		copy["vx"] = float(d["vx"]) + (dx / dist) * push
		copy["vy"] = float(d["vy"]) + (dy / dist) * push * 0.6
		copy["hop"] = maxf(float(d["hop"]), 0.35 if str(d["kind"]) == "dust" else 0.8)
		next.append(copy)
	return {"list": next, "hits": hits}


func _apply_pending(impact: Vector2) -> bool:
	var changed := false
	for group in _groups:
		var gain := float(group["target"]) - float(group["applied"])
		if gain < 0.05:
			continue
		changed = true
		_pile_area = float(group["area"])
		var blows := mini(2, maxi(1, roundi(gain / 0.08)))
		var next: Array = group["chips"]
		for i in blows:
			var at := impact if i == 0 else _impact_at(_orbit + 0.55 * float(i))
			next = _strike_at(next, at, true, float(group["target"]))
		group["chips"] = _paint(_hold(_finish_dust(next, float(group["target"])), float(group["target"])), str(group["color"]), str(group["id"]))
		group["applied"] = float(group["target"])
	if changed:
		_chips = _flatten()
	return changed


func _refresh_crush() -> void:
	if _chips.is_empty():
		_pile_crush = 0.0
		return
	var sum := 0.0
	for chip in _chips:
		sum += float(chip["crush"])
	_pile_crush = sum / float(_chips.size())


func _tick(dt: float) -> bool:
	if _chips.is_empty():
		return false
	var moving := false
	var decay := maxf(0.0, 1.0 - dt * 9.0)
	var next: Array[Dictionary] = []
	for chip in _chips:
		var hop := 0.0
		if float(chip["hop"]) > 0.01:
			hop = float(chip["hop"]) * decay
		if hop != float(chip["hop"]):
			moving = true
		if absf(float(chip["vx"])) < 0.2 and absf(float(chip["vy"])) < 0.2:
			if float(chip["vx"]) == 0.0 and float(chip["vy"]) == 0.0:
				if hop == float(chip["hop"]):
					next.append(chip)
				else:
					var stalled := chip.duplicate()
					stalled["hop"] = hop
					next.append(stalled)
				continue
			moving = true
			var stopped := chip.duplicate()
			stopped["vx"] = 0.0
			stopped["vy"] = 0.0
			stopped["hop"] = hop
			next.append(stopped)
			continue
		moving = true
		var x := float(chip["x"]) + float(chip["vx"]) * dt * 28.0
		var y := float(chip["y"]) + float(chip["vy"]) * dt * 28.0
		var pos := _contain_point(x, y, float(chip["w"]) * 0.5, float(chip["h"]) * 0.5)
		var vx := float(chip["vx"]) * 0.62
		var vy := float(chip["vy"]) * 0.62
		if absf(pos.x - x) > 0.15 or absf(pos.y - y) > 0.15:
			vx *= -0.25
			vy *= -0.25
		var copy := chip.duplicate()
		copy["x"] = pos.x
		copy["y"] = pos.y
		copy["vx"] = vx
		copy["vy"] = vy
		copy["hop"] = hop
		copy["rot"] = 0.0 if str(chip["kind"]) == "dust" else float(chip["rot"]) + vx * 4.0
		next.append(copy)
	if not moving:
		return false
	_chips = next
	return true


func _strike_now(impact: Variant) -> void:
	var bowl: Vector2
	var zone: Vector2
	if impact is Vector2:
		bowl = impact
		zone = bowl_to_zone(bowl.x, bowl.y)
	else:
		zone = _contact(_orbit)
		bowl = zone_to_bowl(zone.x, zone.y)
	var hits := 0
	var colors: Array[Color] = []
	if not _chips.is_empty():
		_apply_pending(bowl)
		var jolted := _jolt(_chips, bowl)
		var list: Array = jolted["list"]
		var replaced: Array[Dictionary] = []
		for chip in list:
			replaced.append(chip)
		_chips = replaced
		var hit_list: Array = jolted["hits"]
		hits = hit_list.size()
		for chip in hit_list:
			var d: Dictionary = chip
			var hex := str(d.get("color", ""))
			if hex != "":
				colors.append(Color(hex))
		_refresh_crush()
	_last_strike = {
		"x": zone.x,
		"y": zone.y,
		"bowl_x": bowl.x,
		"bowl_y": bowl.y,
		"hits": hits,
		"fineness": minf(1.0, _pile_work / WORK_FINE),
		"colors": colors,
	}
	struck.emit(_last_strike)


func _resolve_impact(impact: Variant) -> Vector2:
	if impact is Vector2:
		return impact
	return _impact_at(_orbit)


func _pile_surface_y() -> float:
	ensure_geom()
	return floor_c.y - 1.2 - float(_pile_units - 1) * 0.9 + _pile_crush * 0.6


func _contact(angle: float) -> Vector2:
	ensure_geom()
	return Vector2(
		floor_c.x + cos(angle) * floor_r.x * ORBIT_K,
		_pile_surface_y() + sin(angle) * floor_r.y * ORBIT_K
	)


func _impact_at(angle: float) -> Vector2:
	var c := _contact(angle)
	return zone_to_bowl(c.x, c.y)


func _update_aim() -> void:
	_aim = _compute_aim()


func _compute_aim() -> Dictionary:
	ensure_geom()
	if _mode == "lean":
		return _lean_aim()
	if _mode == "rest":
		var frame := 6
		var theta := -24.0
		return {
			"mode": _mode,
			"orbit": _orbit,
			"down": false,
			"head_x": floor_c.x - floor_r.x * 0.18,
			"head_y": _pile_surface_y() - head_r.y * 0.7,
			"rotate": _clamp_rot(theta - FRAME_AXES[frame - 1]),
			"frame": frame,
			"impact": 0.0,
			"lift": 0.0,
		}
	var prof := strike_profile(_beat)
	var impact := float(prof["impact"])
	var lift := float(prof["lift"])
	var twist := float(prof["twist"])
	var contact := _contact(_orbit)
	var theta_orbit := -84.0 + 30.0 * cos(_orbit)
	var upright := impact * 0.6
	var c := cos(_orbit)
	var sgn := 1.0 if c == 0.0 else signf(c)
	var theta := theta_orbit * (1.0 - upright) + -84.0 * upright + lift * 4.0 * sgn + twist
	var frame_i := _pick_frame(theta, _last_frame, GRIND_FRAMES)
	_last_frame = frame_i
	var sink := head_r.y * (0.55 + impact * 0.25)
	return {
		"mode": _mode,
		"orbit": _orbit,
		"down": impact > 0.5,
		"head_x": contact.x,
		"head_y": contact.y - sink - lift * LIFT_H,
		"rotate": _clamp_rot(theta - FRAME_AXES[frame_i - 1]),
		"frame": frame_i,
		"impact": impact,
		"lift": lift,
	}


func _lean_aim() -> Dictionary:
	ensure_geom()
	var frame := 2
	var theta := -66.0
	return {
		"mode": "lean",
		"orbit": -PI / 2.0,
		"down": false,
		"head_x": floor_c.x + 2.0,
		"head_y": floor_c.y + floor_r.y * 0.25 - head_r.y * 0.55,
		"rotate": _clamp_rot(theta - FRAME_AXES[frame - 1]),
		"frame": frame,
		"impact": 0.0,
		"lift": 0.0,
	}


func _pick_frame(theta: float, current: int, candidates: Array[int]) -> int:
	var best: int = candidates[0]
	var best_dist := INF
	for f in candidates:
		var d := absf(theta - FRAME_AXES[int(f) - 1])
		if d < best_dist:
			best_dist = d
			best = int(f)
	if candidates.has(current):
		var cur_dist := absf(theta - FRAME_AXES[current - 1])
		if cur_dist - best_dist < 3.0:
			return current
	return best


func _public_list(list: Array) -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for chip in list:
		out.append(_public_chip(chip))
	return out


func _public_chip(chip: Dictionary) -> Dictionary:
	var kind := str(chip["kind"])
	var sprite := 0
	if kind != "dust":
		sprite = int(chip["sprite"]) + 1
	var hex := str(chip.get("color", ""))
	var col := Color("#8a7a52")
	if hex != "":
		col = Color(hex)
	var generation := int(chip["generation"])
	var nick := int(chip["nick"])
	return {
		"x": float(chip["x"]),
		"y": float(chip["y"]),
		"w": float(chip["w"]),
		"h": float(chip["h"]),
		"rot": float(chip["rot"]),
		"kind": kind,
		"sprite": sprite,
		"color": col,
		"crush": float(chip["crush"]),
		"generation": generation,
		"nick": nick,
		"ingredient_id": str(chip.get("ingredient_id", "")),
		"depth": float(chip["y"]),
		"hop": float(chip["hop"]),
		"id": int(chip["id"]),
		"delay": float(chip["delay"]),
		"vx": float(chip["vx"]),
		"vy": float(chip["vy"]),
		"draw_k": DUST_DRAW if kind == "dust" else 1.0,
		"cracked": kind != "dust" and generation > 0 and nick >= 0,
		"crushed": kind != "dust" and generation >= 2,
	}


func _drop_group_ids(ids: Dictionary) -> void:
	for group in _groups:
		var list: Array = group["chips"]
		var kept: Array = []
		for chip in list:
			var d: Dictionary = chip
			if not ids.has(int(d["id"])):
				kept.append(d)
		group["chips"] = kept


func _add_residue(list: Array) -> void:
	var colored: PackedStringArray = PackedStringArray()
	var dust_n := 0
	for chip in list:
		var d: Dictionary = chip
		var hex := str(d.get("color", ""))
		if hex != "":
			colored.append(hex)
		if str(d["kind"]) == "dust":
			dust_n += 1
	if colored.is_empty():
		return
	var fine := float(dust_n) / float(list.size())
	var color := mix_hex(colored)
	var amount := minf(1.0, 0.3 + fine * 0.7)
	if _residue.is_empty():
		_residue = {"color": color, "amount": amount}
		return
	var mixed := mix_hex(PackedStringArray([str(_residue["color"]), color]))
	_residue = {"color": mixed, "amount": minf(1.0, maxf(float(_residue["amount"]), amount))}


static func _ease_out(t: float) -> float:
	return 1.0 - pow(1.0 - t, 3.0)


static func _ease_in(t: float) -> float:
	return t * t * t


static func _ease_in_out(t: float) -> float:
	if t < 0.5:
		return 2.0 * t * t
	return 1.0 - pow(-2.0 * t + 2.0, 2.0) / 2.0


static func _orbit_weight(phase: float) -> float:
	var t := fmod(phase, 1.0)
	if t < 0.0:
		t += 1.0
	if t < PH_FALL_END:
		return 1.5
	if t < PH_PRESS_END:
		return 0.25
	return 0.6


static func _clamp_rot(v: float) -> float:
	return clampf(v, -22.0, 22.0)
