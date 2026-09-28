class_name MortarPile
extends RefCounted
## Mortar constraint pile from Web/src/scene/mortarPile.ts.
## Chips live in bowl percents. Pestle aim is zone percents (0..100).
## The hash rand() is the web Math.sin mixer, not KimRng — splits must stay deterministic.

signal struck(info: Dictionary)

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

const PESTLE_SCALE := HEAD_DIAM_W / 230.0
const PESTLE_W := 1360.0 * PESTLE_SCALE
const PESTLE_H := (1088.0 * PESTLE_SCALE) * MORTAR_ASPECT
const PESTLE_HEAD_X := 0.42
const PESTLE_HEAD_Y := 0.74

const BOWL_RX := FLOOR_RX * 1.12
const BOWL_RY := FLOOR_RY * 1.9
const BOWL_W := BOWL_RX / 0.42
const BOWL_H := BOWL_RY / 0.32
const BOWL_LEFT := FLOOR_CX - BOWL_W / 2.0
const BOWL_TOP := FLOOR_CY - 0.76 * BOWL_H

const BOWL_PX_W := (ZONE_W * BOWL_W) / 100.0
const BOWL_PX_H := (ZONE_H * BOWL_H) / 100.0
const HEAD_R_PX := (HEAD_R_X / 100.0) * ZONE_W

const WORK_COARSE := 1.0
const WORK_CRUSHED := 2.2
const WORK_FINE := 3.6
const BEAT_HZ := 1.9
const PH_LIFT_END := 0.42
const PH_FALL_END := 0.56
const PH_PRESS_END := 0.78
const LIFT_H := 15.0
const ORBIT_SPEED := 3.8
const ORBIT_K := 0.55
const DUST_DRAW := 0.42

const FRAME_AXES: Array[float] = [-78.0, -62.0, -84.0, -48.0, -132.0, -22.0]
const GRIND_FRAMES: Array[int] = [1, 2, 3, 4, 5]
const KNOBS: Array[Vector2] = [
	Vector2(0.5163, 0.1713),
	Vector2(0.6346, 0.2326),
	Vector2(0.4683, 0.1618),
	Vector2(0.7266, 0.3134),
	Vector2(0.113, 0.3129),
	Vector2(0.8488, 0.5226),
]

const ASPECTS := {
	"flower": [1.038, 1.181, 1.274, 1.414, 1.61, 1.43, 1.149],
	"thread": [0.691, 1.046, 0.793, 0.996, 0.355, 0.844, 4.339],
	"leaf": [0.813, 1.249, 1.255, 1.347, 1.22, 1.098, 1.077],
	"root": [1.438, 1.202, 0.91, 1.707, 1.128, 1.094, 1.158],
	"seed": [0.777, 0.691, 0.836, 0.955, 0.645, 0.766, 0.898],
	"star": [1.08, 1.103, 1.103, 1.071, 1.062, 1.012, 1.076],
	"petal": [0.707, 1.91, 0.703, 1.12, 1.422, 0.97, 2.081],
}

const NATURAL := {
	"flower": 44.0,
	"thread": 54.0,
	"leaf": 48.0,
	"root": 44.0,
	"seed": 40.0,
	"star": 48.0,
	"petal": 42.0,
	"dust": 10.0,
}

static var _color_cache: Dictionary = {}

var _seed: int = 1
var _seq: int = 1
var _chips: Array[Dictionary] = []
var _mix_groups: Array[Dictionary] = []
var _snapshot_key: String = ""
var _mix_key: String = ""
var _applied_work: float = 0.0
var _pile_crush: float = 0.0
var _pile_work: float = 0.0
var _pile_area: float = 0.0
var _fresh: float = 1.0
var _pile_units: int = 1
var _mode: String = "lean"
var _orbit: float = -PI / 2.0
var _beat: float = 0.0
var _last_frame: int = 2
var _aim: Dictionary = {}
var _last_strike: Dictionary = {}
var _residue_hex: String = ""
var _residue_amount: float = 0.0
var _has_mortar: bool = false
var _strike_hits: int = 0
var _strike_colors: Array[Color] = []


func _init() -> void:
	_aim = _lean_aim()


func setup(state: Dictionary, seed: int = 1) -> void:
	_seed = seed & 0xFFFFFFFF
	if _seed == 0:
		_seed = 1
	_seq = 1
	_chips = []
	_mix_groups = []
	_snapshot_key = ""
	_mix_key = ""
	_applied_work = 0.0
	_pile_crush = 0.0
	_pile_work = 0.0
	_pile_area = 0.0
	_fresh = 1.0
	_pile_units = 1
	_mode = "lean"
	_orbit = -PI / 2.0
	_beat = 0.0
	_last_frame = 2
	_residue_hex = ""
	_residue_amount = 0.0
	_last_strike = {}
	_has_mortar = false
	_aim = _lean_aim()
	sync(state)


func sync(state: Dictionary) -> void:
	if state.is_empty() or str(state.get("ingredientId", "")) == "":
		_has_mortar = false
		_sync_clear()
		return
	var portions_v: Variant = state.get("portions", null)
	if portions_v is Array:
		var raw: Array = portions_v
		if raw.is_empty():
			_has_mortar = false
			_sync_clear()
			return
		var portions: Array[Dictionary] = []
		for item_v in raw:
			if not (item_v is Dictionary):
				continue
			var item: Dictionary = item_v
			var id: String = str(item.get("ingredientId", ""))
			if id == "":
				continue
			var qty: float = float(item.get("quantity", 0.0))
			var work: float = float(item.get("grindWork", 0.0))
			var col: String = _portion_hex(item, id)
			portions.append({
				"ingredientId": id,
				"quantity": qty,
				"grindWork": work,
				"color": col,
			})
		if portions.is_empty():
			_has_mortar = false
			_sync_clear()
			return
		_has_mortar = true
		_sync_mix(_mix_key_for(portions), portions)
		_adopt_mode(bool(state.get("grinding", false)))
		return
	_has_mortar = true
	var id2: String = str(state.get("ingredientId", ""))
	var qty2: float = float(state.get("quantity", 1.0))
	var work2: float = float(state.get("grindWork", 0.0))
	var units: int = clampi(_js_round(qty2), 1, 3)
	_sync_pile("%s:%s" % [id2, _qty_key(qty2)], units, work2, id2)
	_adopt_mode(bool(state.get("grinding", false)))


func update(dt: float, grinding: bool, impact: Variant = null) -> void:
	var next: String = _mode_for(grinding)
	if next != _mode:
		_set_mode(next)
	if _mode == "grind":
		var before: float = _beat
		_beat += dt * BEAT_HZ
		_orbit += dt * ORBIT_SPEED * _orbit_weight(before)
		if _orbit > PI * 12.0:
			_orbit -= PI * 12.0
		var crossed: bool = int(floor(_beat - PH_FALL_END)) > int(floor(before - PH_FALL_END))
		if _beat >= 1.0:
			_beat -= floor(_beat)
		if crossed:
			_strike_now(impact)
	_apply_aim()
	_tick_pile(dt)


func chips() -> Array[Dictionary]:
	return _publish_all(_chips)


func pestle() -> Dictionary:
	return _aim.duplicate(true)


func last_strike() -> Dictionary:
	if _last_strike.is_empty():
		return {}
	return _last_strike.duplicate(true)


func residue() -> Dictionary:
	if _residue_hex == "":
		return {}
	return {
		"color": Color(_residue_hex),
		"amount": _residue_amount,
		"hex": _residue_hex,
	}


func seed_residue(hex: String, amount: float) -> void:
	_residue_hex = hex
	_residue_amount = clampf(amount, 0.0, 1.0)


func clear_residue() -> void:
	if _residue_hex == "":
		return
	_residue_hex = ""
	_residue_amount = 0.0


func bowl() -> Dictionary:
	return {
		"left": BOWL_LEFT,
		"top": BOWL_TOP,
		"width": BOWL_W,
		"height": BOWL_H,
	}


func bowl_to_zone(x: float, y: float) -> Vector2:
	return Vector2(
		BOWL_LEFT + (x / 100.0) * BOWL_W,
		BOWL_TOP + (y / 100.0) * BOWL_H
	)


func zone_to_bowl(x: float, y: float) -> Vector2:
	return Vector2(
		((x - BOWL_LEFT) / BOWL_W) * 100.0,
		((y - BOWL_TOP) / BOWL_H) * 100.0
	)


func scene_to_zone(x: float, y: float) -> Vector2:
	return Vector2(
		((x - ZONE_X) / ZONE_W) * 100.0,
		((y - ZONE_Y) / ZONE_H) * 100.0
	)


func zone_to_scene(x: float, y: float) -> Vector2:
	return Vector2(
		ZONE_X + (x / 100.0) * ZONE_W,
		ZONE_Y + (y / 100.0) * ZONE_H
	)


func scoop_under(scene_x: float, scene_y: float) -> Array[Dictionary]:
	var z: Vector2 = scene_to_zone(scene_x, scene_y)
	var at: Vector2 = zone_to_bowl(z.x, z.y)
	var taken: Array[Dictionary] = []
	var stay: Array[Dictionary] = []
	for chip_v in _chips:
		var chip: Dictionary = chip_v
		var dx: float = (float(chip["x"]) - at.x) / 24.0
		var dy: float = (float(chip["y"]) - at.y) / 30.0
		if dx * dx + dy * dy <= 1.0:
			taken.append(chip)
		else:
			stay.append(chip)
	if taken.is_empty():
		return []
	_chips = stay
	_add_residue(taken)
	return _publish_all(taken)


func scoop_rest() -> Array[Dictionary]:
	if _chips.is_empty():
		return []
	var taken: Array[Dictionary] = _chips
	_chips = []
	_add_residue(taken)
	return _publish_all(taken)


func make_particles() -> MortarParticles:
	return MortarParticles.new(_seed)


func pestle_in_front(pose: Dictionary = {}) -> bool:
	var p: Dictionary = _aim if pose.is_empty() else pose
	var mode: String = str(p.get("mode", "lean"))
	if mode == "rest":
		return true
	if mode != "grind":
		return false
	return sin(float(p.get("orbit", 0.0))) >= 0.0


func handle_tip_y(pose: Dictionary = {}) -> float:
	var p: Dictionary = _aim if pose.is_empty() else pose
	var frame: int = int(p.get("frame", 1))
	if frame < 1 or frame > KNOBS.size():
		frame = 1
	var knob: Vector2 = KNOBS[frame - 1]
	var dx: float = (knob.x - PESTLE_HEAD_X) * PESTLE_W
	var dy: float = (knob.y - PESTLE_HEAD_Y) * PESTLE_H
	var rad: float = float(p.get("rotate", 0.0)) * PI / 180.0
	var y: float = dx * sin(rad) + dy * cos(rad)
	return float(p.get("head_y", 0.0)) + y


func bake_chips_for(ingredient_id: String, quantity: float, grind_work: float, color: String) -> Array[Dictionary]:
	var saved_orbit: float = _orbit
	var saved_area: float = _pile_area
	var saved_fresh: float = _fresh
	var scale_mul: float = pow(maxf(1.0, quantity), -0.35)
	var group: Dictionary = _bake_portion(ingredient_id, quantity, grind_work, color, scale_mul)
	_orbit = saved_orbit
	_pile_area = saved_area
	_fresh = saved_fresh
	var baked: Array[Dictionary] = []
	var list_v: Variant = group.get("chips", [])
	if list_v is Array:
		var arr: Array = list_v
		for chip_v in arr:
			if chip_v is Dictionary:
				baked.append(chip_v)
	return _publish_all(baked)


static func kind_for(id: String) -> String:
	if id.contains("chamomile"):
		return "flower"
	if id.contains("saffron"):
		return "thread"
	if id.contains("mint"):
		return "leaf"
	if id.contains("ginger"):
		return "root"
	if id.contains("poppy"):
		return "seed"
	if id.contains("borage"):
		return "star"
	return "petal"


static func sprite_count(kind: String) -> int:
	if kind == "dust":
		return 0
	if not ASPECTS.has(kind):
		return 0
	var aspects: Array = ASPECTS[kind]
	return aspects.size()


static func clip_polygon(nick: int) -> PackedVector2Array:
	match nick:
		0:
			return PackedVector2Array([
				Vector2(0.34, 0.06), Vector2(1.0, 0.0), Vector2(0.96, 1.0), Vector2(0.0, 0.92), Vector2(0.0, 0.38),
			])
		1:
			return PackedVector2Array([
				Vector2(0.0, 0.0), Vector2(0.68, 0.04), Vector2(1.0, 0.36), Vector2(1.0, 1.0), Vector2(0.06, 0.96),
			])
		2:
			return PackedVector2Array([
				Vector2(0.04, 0.0), Vector2(1.0, 0.08), Vector2(1.0, 0.64), Vector2(0.70, 1.0), Vector2(0.0, 1.0),
			])
		3:
			return PackedVector2Array([
				Vector2(0.0, 0.0), Vector2(1.0, 0.0), Vector2(0.96, 1.0), Vector2(0.36, 1.0), Vector2(0.0, 0.62),
			])
		_:
			return PackedVector2Array([
				Vector2(0.14, 0.0), Vector2(0.86, 0.04), Vector2(1.0, 0.22), Vector2(0.92, 1.0), Vector2(0.08, 0.94), Vector2(0.0, 0.28),
			])


func _adopt_mode(grinding: bool) -> void:
	var want: String = _mode_for(grinding)
	if want != _mode:
		_set_mode(want)


func _mode_for(grinding: bool) -> String:
	if not _has_mortar:
		return "lean"
	if grinding:
		return "grind"
	return "rest"


func _set_mode(next: String) -> void:
	if _mode == next and next != "grind":
		_apply_aim()
		return
	if next == "grind" and _mode != "grind":
		_orbit = -PI / 2.0
		_beat = 0.18
	if _mode == "grind" and next != "grind":
		if _apply_pending(_impact_at(_orbit)):
			_refresh_crush()
	_mode = next
	_apply_aim()


func _sync_clear() -> void:
	_mix_key = ""
	_mix_groups = []
	if _snapshot_key == "" and _chips.is_empty() and _mode == "lean":
		return
	_snapshot_key = ""
	_chips = []
	_applied_work = 0.0
	_pile_crush = 0.0
	_pile_work = 0.0
	_pile_area = 0.0
	_fresh = 1.0
	_pile_units = 1
	_mode = "lean"
	_orbit = -PI / 2.0
	_aim = _lean_aim()


func _sync_pile(key: String, units: int, grind_work: float, ingredient_id: String) -> void:
	# Legacy path has no mix groups. Drop stale groups so a later beat cannot replace chips.
	_mix_key = ""
	_mix_groups = []
	var kind: String = kind_for(ingredient_id)
	if key != _snapshot_key:
		_snapshot_key = key
		_pile_units = units
		_orbit = -PI / 2.0
		var next: Array[Dictionary] = _spawn(float(units), kind, 1.0, ingredient_id)
		var rehearsal: int = mini(64, maxi(8, int(ceil(grind_work / 0.05))))
		for i in rehearsal:
			var work: float = (float(i + 1) / float(rehearsal)) * grind_work
			_orbit += 0.85
			var at: Vector2 = _impact_at(_orbit)
			next = _hold_volume(_strike_at(next, at.x, at.y, false, work), work)
		_chips = _hold_volume(_finish_dust(next, grind_work), grind_work)
		_pile_work = grind_work
		_refresh_crush()
		_applied_work = grind_work
		_apply_aim()
		return
	_pile_units = units
	_pile_work = grind_work
	var gain: float = grind_work - _applied_work
	if gain < 0.05:
		_refresh_crush()
		_apply_aim()
		return
	var blows: int = mini(2, maxi(1, _js_round(gain / 0.08)))
	var stepped: Array[Dictionary] = _chips
	for i in blows:
		if i > 0:
			_orbit += 0.55
		var at2: Vector2 = _impact_at(_orbit)
		stepped = _strike_at(stepped, at2.x, at2.y, true, grind_work)
	_chips = _hold_volume(_finish_dust(stepped, grind_work), grind_work)
	_refresh_crush()
	_applied_work = grind_work
	_apply_aim()


func _sync_mix(key: String, portions: Array[Dictionary]) -> void:
	var total := 0.0
	for portion_v in portions:
		var portion: Dictionary = portion_v
		total += float(portion["quantity"])
	var rebuild: bool = key != _mix_key or portions.size() != _mix_groups.size() or _grind_dropped(portions)
	if rebuild:
		_mix_key = key
		_snapshot_key = key
		_pile_units = clampi(_js_round(total), 1, 3)
		var scale_mul: float = pow(maxf(1.0, total), -0.35)
		var groups: Array[Dictionary] = []
		for portion_v in portions:
			var portion: Dictionary = portion_v
			groups.append(_bake_portion(
				str(portion["ingredientId"]),
				float(portion["quantity"]),
				float(portion["grindWork"]),
				str(portion["color"]),
				scale_mul
			))
		_mix_groups = groups
		_chips = _flatten_groups()
		_pile_work = _focus_norm(portions)
		_refresh_crush()
		clear_residue()
		_apply_aim()
		return
	var pending := false
	for portion_v in portions:
		var portion: Dictionary = portion_v
		var group: Dictionary = _find_group(str(portion["ingredientId"]))
		if group.is_empty():
			continue
		group["color"] = str(portion["color"])
		var qty: float = float(portion["quantity"])
		var norm: float = 0.0 if qty == 0.0 else float(portion["grindWork"]) / qty
		if norm - float(group["applied"]) >= 0.05:
			group["target"] = norm
			pending = true
	_pile_work = _focus_norm(portions)
	if not pending:
		_refresh_crush()
		_apply_aim()
		return
	var behind := 0.0
	for group_v in _mix_groups:
		var gap_group: Dictionary = group_v
		var gap: float = float(gap_group["target"]) - float(gap_group["applied"])
		if gap > behind:
			behind = gap
	if _mode == "grind" and behind < 0.75:
		_apply_aim()
		return
	if _apply_pending(_impact_at(_orbit)):
		_pile_units = clampi(_js_round(total), 1, 3)
		_refresh_crush()
		_apply_aim()


func _grind_dropped(portions: Array[Dictionary]) -> bool:
	for portion_v in portions:
		var portion: Dictionary = portion_v
		var group: Dictionary = _find_group(str(portion["ingredientId"]))
		if group.is_empty():
			continue
		var qty: float = float(portion["quantity"])
		if qty == 0.0:
			continue
		var norm: float = float(portion["grindWork"]) / qty
		if norm < float(group["applied"]) - 0.05:
			return true
	return false


func _find_group(id: String) -> Dictionary:
	for group_v in _mix_groups:
		var group: Dictionary = group_v
		if str(group["id"]) == id:
			return group
	return {}


func _bake_portion(ingredient_id: String, quantity: float, grind_work: float, color: String, scale_mul: float) -> Dictionary:
	var kind: String = kind_for(ingredient_id)
	var norm: float = 0.0 if quantity <= 0.0 else grind_work / quantity
	var next: Array[Dictionary] = _spawn(quantity, kind, scale_mul, ingredient_id)
	var area: float = _pile_area
	var rehearsal: int = mini(64, maxi(8, int(ceil(norm / 0.05))))
	for i in rehearsal:
		var work: float = (float(i + 1) / float(rehearsal)) * norm
		_orbit += 0.85
		var at: Vector2 = _impact_at(_orbit)
		next = _hold_volume(_strike_at(next, at.x, at.y, false, work), work)
	var baked: Array[Dictionary] = _hold_volume(_finish_dust(next, norm), norm)
	var colored: Array[Dictionary] = []
	for chip_v in baked:
		var chip: Dictionary = chip_v
		var copy: Dictionary = chip.duplicate(false)
		copy["color"] = color
		copy["ingredient_id"] = ingredient_id
		colored.append(copy)
	return {
		"id": ingredient_id,
		"applied": norm,
		"target": norm,
		"color": color,
		"chips": colored,
		"area": area,
	}


func _focus_norm(portions: Array[Dictionary]) -> float:
	var pending: Array[Dictionary] = []
	for portion_v in portions:
		var portion: Dictionary = portion_v
		var qty: float = float(portion["quantity"])
		var work: float = float(portion["grindWork"])
		if work < WORK_FINE * qty - 0.02:
			pending.append(portion)
	var list: Array[Dictionary] = pending if not pending.is_empty() else portions
	var best := INF
	for portion_v in list:
		var portion: Dictionary = portion_v
		var qty: float = float(portion["quantity"])
		var norm: float = float(portion["grindWork"]) / maxf(1.0, qty)
		if norm < best:
			best = norm
	return best


func _flatten_groups() -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for group_v in _mix_groups:
		var group: Dictionary = group_v
		var list_v: Variant = group.get("chips", [])
		if list_v is Array:
			var arr: Array = list_v
			for chip_v in arr:
				if chip_v is Dictionary:
					out.append(chip_v)
	return out


func _spawn(units: float, kind: String, scale_mul: float, ingredient_id: String) -> Array[Dictionary]:
	var count_seed: float = units * 17.0 + float(kind.length())
	var extra: int = _js_round(_hash_rand(count_seed) * units)
	var count: int = int(floor(3.0 * units + float(extra) + 1e-9))
	if count < 0:
		count = 0
	var next: Array[Dictionary] = []
	for i in count:
		var angle: float = (float(i) / float(count)) * PI * 2.0 + _hash_rand(float(i + 3)) * 0.4
		var spread: float = 0.35 + _hash_rand(float(i + 11)) * 0.55
		var size: Dictionary = _coarse_size(kind, float(i + 5), scale_mul)
		var raw_x: float = 50.0 + cos(angle) * (10.0 + 16.0 * spread)
		var raw_y: float = 74.0 + sin(angle) * (5.0 + 7.0 * spread)
		var pos: Vector2 = _contain_point(raw_x, raw_y, float(size["w"]) * 0.5, float(size["h"]) * 0.5)
		var rot: float = _hash_rand(float(i + 2)) * 140.0 - 70.0 if kind == "thread" else _hash_rand(float(i + 2)) * 50.0 - 25.0
		var id: int = _seq
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
			"ingredient_id": ingredient_id,
		})
	_pile_area = _chip_area(next)
	_fresh = 1.0
	return next


func _coarse_size(kind: String, seed: float, scale_mul: float) -> Dictionary:
	var count: int = maxi(1, sprite_count(kind))
	var sprite: int = int(floor(_hash_rand(seed + 9.0) * float(count))) % count
	var aspect: float = _sprite_aspect(kind, sprite)
	var longest: float = float(NATURAL.get(kind, 42.0)) * (0.88 + _hash_rand(seed) * 0.24) * scale_mul
	var wpx: float = longest if aspect >= 1.0 else longest * aspect
	var hpx: float = longest / aspect if aspect >= 1.0 else longest
	return {
		"w": (wpx / BOWL_PX_W) * 100.0,
		"h": (hpx / BOWL_PX_H) * 100.0,
		"sprite": sprite,
	}


func _sprite_aspect(kind: String, sprite: int) -> float:
	if kind == "dust" or not ASPECTS.has(kind):
		return 1.0
	var aspects: Array = ASPECTS[kind]
	if sprite < 0 or sprite >= aspects.size():
		return 1.0
	return float(aspects[sprite])


func _hold_volume(list: Array[Dictionary], work: float) -> Array[Dictionary]:
	if _pile_area <= 0.0 or list.is_empty():
		return list
	_fresh += (1.0 - _fresh) * 0.4
	var area: float = _chip_area(list)
	if area <= 0.0:
		return list
	var powder: bool = work >= WORK_FINE - 0.02
	var cover: float = maxf(900.0, float(list.size()) * 140.0)
	var target: float = (minf(_pile_area, cover) if powder else _pile_area) * _fresh
	var k: float = sqrt(target / area)
	var scaled: Array[Dictionary] = []
	for chip_v in list:
		var chip: Dictionary = chip_v
		var w: float = float(chip["w"]) * k
		var h: float = float(chip["h"]) * k
		if powder:
			w = maxf(8.0, w)
			h = maxf(12.0, h)
		var pos: Vector2 = _contain_point(float(chip["x"]), float(chip["y"]), w * 0.5, h * 0.5)
		var copy: Dictionary = chip.duplicate(false)
		copy["w"] = w
		copy["h"] = h
		copy["x"] = pos.x
		copy["y"] = pos.y
		scaled.append(copy)
	return _spread_mound(scaled)


func _spread_mound(list: Array[Dictionary]) -> Array[Dictionary]:
	var small := 0
	for chip_v in list:
		var chip: Dictionary = chip_v
		if maxf(float(chip["w"]), float(chip["h"])) < 48.0:
			small += 1
	if small < 4:
		return list
	var ranked: Array[Dictionary] = []
	for chip_v in list:
		ranked.append(chip_v)
	ranked.sort_custom(Callable(self, "_chip_id_less"))
	var placed: Dictionary = {}
	var total: float = float(ranked.size())
	for index in ranked.size():
		var chip: Dictionary = ranked[index]
		if maxf(float(chip["w"]), float(chip["h"])) >= 48.0:
			continue
		var angle: float = float(index) * 2.399963
		var rad: float = sqrt((float(index) + 0.5) / total)
		var pos: Vector2 = _contain_point(
			50.0 + cos(angle) * rad * 24.0,
			70.0 + sin(angle) * rad * 11.0,
			float(chip["w"]) * 0.5,
			float(chip["h"]) * 0.5
		)
		placed[int(chip["id"])] = pos
	var out: Array[Dictionary] = []
	for chip_v in list:
		var chip: Dictionary = chip_v
		var id: int = int(chip["id"])
		if placed.has(id):
			var spot: Vector2 = placed[id]
			var copy: Dictionary = chip.duplicate(false)
			copy["x"] = spot.x
			copy["y"] = spot.y
			copy["vx"] = 0.0
			copy["vy"] = 0.0
			out.append(copy)
		else:
			out.append(chip)
	return out


func _chip_id_less(a: Variant, b: Variant) -> bool:
	var da: Dictionary = a
	var db: Dictionary = b
	return int(da["id"]) < int(db["id"])


func _finish_dust(list: Array[Dictionary], work: float) -> Array[Dictionary]:
	if work < WORK_FINE - 0.02:
		return list
	var out: Array[Dictionary] = []
	for chip_v in list:
		var chip: Dictionary = chip_v
		var area: float = maxf(1.0, float(chip["w"]) * float(chip["h"]))
		var h: float = sqrt(area * 2.4)
		var w: float = area / h
		var copy: Dictionary = chip.duplicate(false)
		copy["w"] = w
		copy["h"] = h
		copy["kind"] = "dust"
		copy["rot"] = 0.0
		out.append(copy)
	return out


func _size_limit(work: float) -> float:
	var t: float = clampf(work / WORK_FINE, 0.0, 1.0)
	return 80.0 * pow(16.0 / 80.0, t)


func _contain_point(x: float, y: float, rad_x: float, rad_y: float) -> Vector2:
	var rx: float = maxf(8.0, 42.0 - rad_x)
	var ry: float = maxf(8.0, 32.0 - rad_y)
	var dx: float = (x - 50.0) / rx
	var dy: float = (y - 76.0) / ry
	var d2: float = dx * dx + dy * dy
	if d2 <= 1.0:
		return Vector2(x, y)
	var d: float = sqrt(d2)
	return Vector2(50.0 + (dx / d) * rx * 0.96, 76.0 + (dy / d) * ry * 0.96)


func _strike_at(list: Array[Dictionary], impact_x: float, impact_y: float, live: bool, work: float) -> Array[Dictionary]:
	if list.is_empty():
		return list
	var limit: float = _size_limit(work)
	var hits: Array[int] = []
	for index in list.size():
		var chip: Dictionary = list[index]
		var span: float = maxf(float(chip["w"]), float(chip["h"]))
		if str(chip["kind"]) == "dust" or span <= limit * 1.04:
			continue
		if _under_head(float(chip["x"]), float(chip["y"]), impact_x, impact_y, 1.45):
			hits.append(index)
	if hits.is_empty():
		if not live:
			return list
		return _nudge_near(list, impact_x, impact_y)
	_fresh = minf(1.16, _fresh + 0.05 * float(hits.size()))
	var crowded: bool = list.size() + hits.size() > 48
	var hit_set: Dictionary = {}
	for hit in hits:
		hit_set[hit] = true
	var next: Array[Dictionary] = []
	for index in list.size():
		var chip: Dictionary = list[index]
		if not hit_set.has(index):
			next.append(chip)
			continue
		if crowded:
			var parts: Array[Dictionary] = _split_piece(chip, impact_x, impact_y, false, work)
			var shrunk: Dictionary = parts[0].duplicate(false)
			shrunk["id"] = int(chip["id"])
			shrunk["vx"] = 0.0
			shrunk["vy"] = 0.0
			shrunk["hop"] = 0.5 if live else 0.0
			next.append(shrunk)
		else:
			var pair: Array[Dictionary] = _split_piece(chip, impact_x, impact_y, live, work)
			next.append(pair[0])
			next.append(pair[1])
	return next


func _nudge_near(list: Array[Dictionary], impact_x: float, impact_y: float) -> Array[Dictionary]:
	var best := 0
	var best_dist := INF
	for index in list.size():
		var chip: Dictionary = list[index]
		var dist2: float = (float(chip["x"]) - impact_x) * (float(chip["x"]) - impact_x) + (float(chip["y"]) - impact_y) * (float(chip["y"]) - impact_y)
		if dist2 < best_dist:
			best_dist = dist2
			best = index
	var out: Array[Dictionary] = []
	for index in list.size():
		var chip: Dictionary = list[index]
		if index != best:
			out.append(chip)
			continue
		var away_x: float = float(chip["x"]) - impact_x
		var away_y: float = float(chip["y"]) - impact_y
		var dist: float = maxf(0.001, sqrt(away_x * away_x + away_y * away_y))
		var pos: Vector2 = _contain_point(
			float(chip["x"]) + (away_x / dist) * 1.4,
			float(chip["y"]) + (away_y / dist) * 1.1,
			float(chip["w"]) * 0.5,
			float(chip["h"]) * 0.5
		)
		var copy: Dictionary = chip.duplicate(false)
		copy["x"] = pos.x
		copy["y"] = pos.y
		copy["vx"] = (away_x / dist) * 0.35
		copy["vy"] = (away_y / dist) * 0.25
		copy["hop"] = 0.4
		out.append(copy)
	return out


func _split_piece(src: Dictionary, impact_x: float, impact_y: float, live: bool, work: float) -> Array[Dictionary]:
	var generation: int = int(src["generation"]) + 1
	var span: float = maxf(float(src["w"]), float(src["h"]))
	var powdered: bool = span * 0.74 <= maxf(22.0, _size_limit(work)) and work >= WORK_CRUSHED
	var scale: float = 0.78 if powdered else 0.74
	var kind: String = "dust" if powdered else str(src["kind"])
	var dx: float = float(src["x"]) - impact_x
	var dy: float = float(src["y"]) - impact_y
	var length: float = maxf(0.001, sqrt(dx * dx + dy * dy))
	var nx: float = dx / length
	var ny: float = dy / length
	var min_wh: float = minf(float(src["w"]), float(src["h"]))
	var fly: float = maxf(3.2, min_wh * 0.22) if live else maxf(1.6, min_wh * 0.1)
	var left: Dictionary = _make_half(src, -1, true, nx, ny, fly, scale, powdered, kind, generation, live)
	var right: Dictionary = _make_half(src, 1, false, nx, ny, fly, scale, powdered, kind, generation, live)
	var pair: Array[Dictionary] = []
	pair.append(left)
	pair.append(right)
	return pair


func _make_half(src: Dictionary, sign: int, reuse_id: bool, nx: float, ny: float, fly: float, scale: float, powdered: bool, kind: String, generation: int, live: bool) -> Dictionary:
	var wobble: float = 0.82 + _hash_rand(float(_seq + sign + 3)) * 0.22
	var width: float = maxf(8.0, float(src["w"]) * scale * wobble)
	var height: float = maxf(8.0, float(src["h"]) * scale * wobble)
	var raw_x: float = float(src["x"]) + nx * fly * float(sign) + (_hash_rand(float(_seq)) - 0.5) * 2.0
	var raw_y: float = float(src["y"]) + ny * fly * float(sign) * 0.7 + (_hash_rand(float(_seq + 4)) - 0.5) * 1.6
	var pos: Vector2 = _contain_point(raw_x, raw_y, width * 0.5, height * 0.5)
	var speed := 0.0
	if live:
		speed = 1.6 + _hash_rand(float(_seq + 8)) * 0.8
	var id: int = int(src["id"])
	if not reuse_id:
		id = _seq
		_seq += 1
	var rot := 0.0
	if not powdered:
		rot = float(src["rot"]) + float(sign) * (18.0 + _hash_rand(float(_seq + 1)) * 28.0)
	var nick: int = int(floor(_hash_rand(float(_seq + 6)) * 4.0))
	var seed_v: int = int(src["id"]) if reuse_id else _seq
	var chip := {
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
		"vx": nx * speed * float(sign) if live else 0.0,
		"vy": ny * speed * float(sign) * 0.65 if live else 0.0,
		"hop": 0.6 if live else 0.0,
	}
	if src.has("color"):
		chip["color"] = src["color"]
	if src.has("ingredient_id"):
		chip["ingredient_id"] = src["ingredient_id"]
	return chip


func _under_head(chip_x: float, chip_y: float, impact_x: float, impact_y: float, k: float) -> bool:
	var dx: float = ((chip_x - impact_x) / 100.0) * BOWL_PX_W
	var dy: float = ((chip_y - impact_y) / 100.0) * BOWL_PX_H
	var r: float = HEAD_R_PX * k
	return dx * dx + dy * dy <= r * r


func _jolt(list: Array[Dictionary], impact_x: float, impact_y: float) -> Array[Dictionary]:
	_strike_hits = 0
	_strike_colors = []
	var next: Array[Dictionary] = []
	for chip_v in list:
		var chip: Dictionary = chip_v
		if not _under_head(float(chip["x"]), float(chip["y"]), impact_x, impact_y, 1.6):
			next.append(chip)
			continue
		_strike_hits += 1
		if chip.has("color") and str(chip["color"]) != "":
			_strike_colors.append(Color(str(chip["color"])))
		var dx: float = float(chip["x"]) - impact_x
		var dy: float = float(chip["y"]) - impact_y
		var d: float = maxf(0.001, sqrt(dx * dx + dy * dy))
		var push: float = 0.5 if str(chip["kind"]) == "dust" else 0.9
		var copy: Dictionary = chip.duplicate(false)
		copy["vx"] = float(chip["vx"]) + (dx / d) * push
		copy["vy"] = float(chip["vy"]) + (dy / d) * push * 0.6
		var hop_floor: float = 0.35 if str(chip["kind"]) == "dust" else 0.8
		copy["hop"] = maxf(float(chip["hop"]), hop_floor)
		next.append(copy)
	return next


func _apply_pending(impact: Vector2) -> bool:
	var changed := false
	for group_v in _mix_groups:
		var group: Dictionary = group_v
		var gain: float = float(group["target"]) - float(group["applied"])
		if gain < 0.05:
			continue
		changed = true
		_pile_area = float(group["area"])
		var blows: int = mini(2, maxi(1, _js_round(gain / 0.08)))
		var typed: Array[Dictionary] = []
		var list_v: Variant = group.get("chips", [])
		if list_v is Array:
			var arr: Array = list_v
			for chip_v in arr:
				if chip_v is Dictionary:
					typed.append(chip_v)
		var target: float = float(group["target"])
		for i in blows:
			var at: Vector2 = impact if i == 0 else _impact_at(_orbit + 0.55 * float(i))
			typed = _strike_at(typed, at.x, at.y, true, target)
		var held: Array[Dictionary] = _hold_volume(_finish_dust(typed, target), target)
		var colored: Array[Dictionary] = []
		for chip_v in held:
			var chip: Dictionary = chip_v
			var copy: Dictionary = chip.duplicate(false)
			copy["color"] = group["color"]
			copy["ingredient_id"] = group["id"]
			colored.append(copy)
		group["chips"] = colored
		group["applied"] = target
	if changed:
		_chips = _flatten_groups()
	return changed


func _strike_now(impact: Variant) -> void:
	var contact: Vector2 = _contact_on_pile(_orbit)
	var bowl: Vector2 = zone_to_bowl(contact.x, contact.y)
	if impact is Vector2:
		var hit: Vector2 = impact
		bowl = hit
		contact = bowl_to_zone(bowl.x, bowl.y)
	if not _chips.is_empty():
		_apply_pending(bowl)
		_chips = _jolt(_chips, bowl.x, bowl.y)
		_refresh_crush()
	else:
		_strike_hits = 0
		_strike_colors = []
	var info := {
		"x": contact.x,
		"y": contact.y,
		"bowl_x": bowl.x,
		"bowl_y": bowl.y,
		"hits": _strike_hits,
		"fineness": minf(1.0, _pile_work / WORK_FINE),
		"colors": _strike_colors.duplicate(),
	}
	_last_strike = info
	struck.emit(info)


func _tick_pile(dt: float) -> void:
	if _chips.is_empty():
		return
	var moving := false
	var decay: float = maxf(0.0, 1.0 - dt * 9.0)
	var next: Array[Dictionary] = []
	for chip_v in _chips:
		var chip: Dictionary = chip_v
		var prev_hop: float = float(chip["hop"])
		var hop: float = prev_hop * decay if prev_hop > 0.01 else 0.0
		if hop != prev_hop:
			moving = true
		var vx: float = float(chip["vx"])
		var vy: float = float(chip["vy"])
		if absf(vx) < 0.2 and absf(vy) < 0.2:
			if vx == 0.0 and vy == 0.0:
				if hop == prev_hop:
					next.append(chip)
				else:
					var slowed: Dictionary = chip.duplicate(false)
					slowed["hop"] = hop
					next.append(slowed)
				continue
			moving = true
			var stopped: Dictionary = chip.duplicate(false)
			stopped["vx"] = 0.0
			stopped["vy"] = 0.0
			stopped["hop"] = hop
			next.append(stopped)
			continue
		moving = true
		var x: float = float(chip["x"]) + vx * dt * 28.0
		var y: float = float(chip["y"]) + vy * dt * 28.0
		var pos: Vector2 = _contain_point(x, y, float(chip["w"]) * 0.5, float(chip["h"]) * 0.5)
		var nvx: float = vx * 0.62
		var nvy: float = vy * 0.62
		if absf(pos.x - x) > 0.15 or absf(pos.y - y) > 0.15:
			nvx *= -0.25
			nvy *= -0.25
		var moved: Dictionary = chip.duplicate(false)
		moved["x"] = pos.x
		moved["y"] = pos.y
		moved["vx"] = nvx
		moved["vy"] = nvy
		moved["hop"] = hop
		moved["rot"] = 0.0 if str(chip["kind"]) == "dust" else float(chip["rot"]) + vx * 4.0
		next.append(moved)
	if moving:
		_chips = next


func _refresh_crush() -> void:
	if _chips.is_empty():
		_pile_crush = 0.0
		return
	var sum := 0.0
	for chip_v in _chips:
		var chip: Dictionary = chip_v
		sum += float(chip["crush"])
	_pile_crush = sum / float(_chips.size())


func _chip_area(list: Array) -> float:
	var sum := 0.0
	for chip_v in list:
		var chip: Dictionary = chip_v
		sum += float(chip["w"]) * float(chip["h"])
	return sum


func _pile_surface_y() -> float:
	return FLOOR_CY - 1.2 - float(_pile_units - 1) * 0.9 + _pile_crush * 0.6


func _contact_on_pile(angle: float) -> Vector2:
	return Vector2(
		FLOOR_CX + cos(angle) * FLOOR_RX * ORBIT_K,
		_pile_surface_y() + sin(angle) * FLOOR_RY * ORBIT_K
	)


func _impact_at(angle: float) -> Vector2:
	var contact: Vector2 = _contact_on_pile(angle)
	return zone_to_bowl(contact.x, contact.y)


func _ease_out(t: float) -> float:
	return 1.0 - pow(1.0 - t, 3.0)


func _ease_in(t: float) -> float:
	return t * t * t


func _ease_in_out(t: float) -> float:
	if t < 0.5:
		return 2.0 * t * t
	return 1.0 - pow(-2.0 * t + 2.0, 2.0) / 2.0


func _wrap01(phase: float) -> float:
	var t: float = fmod(phase, 1.0)
	if t < 0.0:
		t += 1.0
	return t


func _strike_profile(phase: float) -> Vector3:
	var t: float = _wrap01(phase)
	if t < PH_LIFT_END:
		var u: float = t / PH_LIFT_END
		return Vector3(_ease_out(u), 0.0, 0.0)
	if t < PH_FALL_END:
		var u_fall: float = (t - PH_LIFT_END) / (PH_FALL_END - PH_LIFT_END)
		var impact := 0.0
		if u_fall > 0.85:
			impact = (u_fall - 0.85) / 0.15
		return Vector3(1.0 - _ease_in(u_fall), impact, 0.0)
	if t < PH_PRESS_END:
		var u_press: float = (t - PH_FALL_END) / (PH_PRESS_END - PH_FALL_END)
		return Vector3(0.0, 1.0 - 0.25 * u_press, sin(u_press * PI * 2.0) * 6.0)
	var u_release: float = (t - PH_PRESS_END) / (1.0 - PH_PRESS_END)
	return Vector3(0.0, (1.0 - _ease_in_out(u_release)) * 0.75, 0.0)


func _orbit_weight(phase: float) -> float:
	var t: float = _wrap01(phase)
	if t < PH_FALL_END:
		return 1.5
	if t < PH_PRESS_END:
		return 0.25
	return 0.6


func _pick_frame(theta: float, current: int) -> int:
	var best: int = GRIND_FRAMES[0]
	var best_dist := INF
	for frame in GRIND_FRAMES:
		var dist: float = absf(theta - FRAME_AXES[frame - 1])
		if dist < best_dist:
			best_dist = dist
			best = frame
	var listed := false
	for frame in GRIND_FRAMES:
		if frame == current:
			listed = true
			break
	if listed and current >= 1 and current <= FRAME_AXES.size():
		var cur_dist: float = absf(theta - FRAME_AXES[current - 1])
		if cur_dist - best_dist < 3.0:
			return current
	return best


func _clamp_rot(v: float) -> float:
	return clampf(v, -22.0, 22.0)


func _lean_aim() -> Dictionary:
	var frame := 2
	var theta := -66.0
	return {
		"mode": "lean",
		"orbit": -PI / 2.0,
		"down": false,
		"head_x": FLOOR_CX + 2.0,
		"head_y": FLOOR_CY + FLOOR_RY * 0.25 - HEAD_R_Y * 0.55,
		"rotate": _clamp_rot(theta - FRAME_AXES[frame - 1]),
		"frame": frame,
		"impact": 0.0,
		"lift": 0.0,
	}


func _apply_aim() -> void:
	_aim = _compute_aim()


func _compute_aim() -> Dictionary:
	if _mode == "lean":
		return _lean_aim()
	if _mode == "rest":
		var rest_frame := 6
		var rest_theta := -24.0
		return {
			"mode": _mode,
			"orbit": _orbit,
			"down": false,
			"head_x": FLOOR_CX - FLOOR_RX * 0.18,
			"head_y": _pile_surface_y() - HEAD_R_Y * 0.7,
			"rotate": _clamp_rot(rest_theta - FRAME_AXES[rest_frame - 1]),
			"frame": rest_frame,
			"impact": 0.0,
			"lift": 0.0,
		}
	var prof: Vector3 = _strike_profile(_beat)
	var contact: Vector2 = _contact_on_pile(_orbit)
	var theta_orbit: float = -84.0 + 30.0 * cos(_orbit)
	var upright: float = prof.y * 0.6
	var c_os: float = cos(_orbit)
	var sgn: float = 1.0 if c_os == 0.0 else signf(c_os)
	var theta: float = theta_orbit * (1.0 - upright) + (-84.0) * upright + prof.x * 4.0 * sgn + prof.z
	var frame: int = _pick_frame(theta, _last_frame)
	_last_frame = frame
	var sink: float = HEAD_R_Y * (0.55 + prof.y * 0.25)
	return {
		"mode": _mode,
		"orbit": _orbit,
		"down": prof.y > 0.5,
		"head_x": contact.x,
		"head_y": contact.y - sink - prof.x * LIFT_H,
		"rotate": _clamp_rot(theta - FRAME_AXES[frame - 1]),
		"frame": frame,
		"impact": prof.y,
		"lift": prof.x,
	}


func _add_residue(list: Array[Dictionary]) -> void:
	var colored: Array = []
	var dust_n := 0
	for chip_v in list:
		var chip: Dictionary = chip_v
		if chip.has("color") and str(chip["color"]) != "":
			colored.append(str(chip["color"]))
		if str(chip["kind"]) == "dust":
			dust_n += 1
	if colored.is_empty():
		return
	var fine: float = float(dust_n) / float(list.size())
	var color: String = _mix_hex(colored)
	var amount: float = minf(1.0, 0.3 + fine * 0.7)
	if _residue_hex != "":
		var pair: Array = [_residue_hex, color]
		color = _mix_hex(pair)
		amount = minf(1.0, maxf(_residue_amount, amount))
	_residue_hex = color
	_residue_amount = amount


func _mix_hex(colors: Array) -> String:
	if colors.is_empty():
		return "#8a7a52"
	var r := 0
	var g := 0
	var b := 0
	var n := 0
	for color_v in colors:
		var text: String = str(color_v).strip_edges()
		if text.length() != 7 or not text.begins_with("#"):
			continue
		var rv: int = _hex_byte(text, 1)
		var gv: int = _hex_byte(text, 3)
		var bv: int = _hex_byte(text, 5)
		if rv < 0 or gv < 0 or bv < 0:
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


func _publish_all(list: Array) -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for chip_v in list:
		var chip: Dictionary = chip_v
		out.append(_publish(chip))
	return out


func _publish(chip: Dictionary) -> Dictionary:
	var kind: String = str(chip["kind"])
	var dust: bool = kind == "dust"
	var generation: int = int(chip["generation"])
	var nick: int = int(chip["nick"])
	var hex: String = ""
	if chip.has("color") and str(chip["color"]) != "":
		hex = str(chip["color"])
	elif chip.has("ingredient_id"):
		hex = _catalog_hex(str(chip["ingredient_id"]))
	else:
		hex = "#8a7a52"
	var sprite: int = 0 if dust else int(chip["sprite"]) + 1
	var ingredient: String = str(chip["ingredient_id"]) if chip.has("ingredient_id") else ""
	return {
		"x": float(chip["x"]),
		"y": float(chip["y"]),
		"w": float(chip["w"]),
		"h": float(chip["h"]),
		"rot": float(chip["rot"]),
		"kind": kind,
		"sprite": sprite,
		"color": _parse_hex(hex),
		"crush": float(chip["crush"]),
		"generation": generation,
		"nick": nick,
		"ingredient_id": ingredient,
		"depth": float(chip["y"]),
		"hop": float(chip["hop"]),
		"id": int(chip["id"]),
		"delay": float(chip["delay"]),
		"vx": float(chip["vx"]),
		"vy": float(chip["vy"]),
		"draw_k": DUST_DRAW if dust else 1.0,
		"cracked": (not dust) and generation > 0 and nick >= 0,
		"crushed": generation >= 2 and (not dust),
	}


func _parse_hex(hex: String) -> Color:
	var text: String = hex.strip_edges()
	if text.length() == 4 and text.begins_with("#"):
		text = "#%s%s%s%s%s%s" % [text.substr(1, 1), text.substr(1, 1), text.substr(2, 1), text.substr(2, 1), text.substr(3, 1), text.substr(3, 1)]
	if text.length() == 7 and text.begins_with("#"):
		return Color(text)
	return Color("#8a7a52")


func _portion_hex(portion: Dictionary, ingredient_id: String) -> String:
	if portion.has("color"):
		var raw: Variant = portion.get("color", "")
		if raw is Color:
			return _color_to_hex(raw)
		var text: String = str(raw).strip_edges()
		if text != "":
			return text
	return _catalog_hex(ingredient_id)


static func _catalog_hex(id: String) -> String:
	if _color_cache.has(id):
		return str(_color_cache[id])
	var defs: Dictionary = Catalog.load_defs()
	var found := "#8a7a52"
	var ings: Variant = defs.get("ingredients", [])
	if ings is Array:
		var arr: Array = ings
		for item_v in arr:
			if not (item_v is Dictionary):
				continue
			var item: Dictionary = item_v
			var ing_id: String = str(item.get("id", ""))
			var col: String = str(item.get("color", "#8a7a52"))
			_color_cache[ing_id] = col
			if ing_id == id:
				found = col
	if not _color_cache.has(id):
		_color_cache[id] = found
	return str(_color_cache[id])


static func _color_to_hex(col: Color) -> String:
	return "#%02x%02x%02x" % [
		_js_round(col.r * 255.0),
		_js_round(col.g * 255.0),
		_js_round(col.b * 255.0),
	]


func _mix_key_for(portions: Array[Dictionary]) -> String:
	var parts: PackedStringArray = []
	for portion_v in portions:
		var portion: Dictionary = portion_v
		parts.append("%s:%s" % [str(portion["ingredientId"]), _qty_key(float(portion["quantity"]))])
	return "|".join(parts)


func _qty_key(qty: float) -> String:
	if absf(qty - round(qty)) < 1e-6:
		return str(int(round(qty)))
	return str(qty)


static func _js_round(v: float) -> int:
	return int(floor(v + 0.5))


static func _hash_rand(seed: float) -> float:
	var x: float = sin(seed * 127.1) * 43758.5453
	return x - floor(x)
