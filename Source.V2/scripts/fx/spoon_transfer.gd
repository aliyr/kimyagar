class_name SpoonTransfer
extends RefCounted
## Flying goat-head spoon from Web/src/scene/SpoonTransfer.tsx.

const T_IN := 0.32
const T_STIR := 1.6
const T_SCOOP := 1.92
const T_CARRY := 0.7
const T_DROP := 0.88
const T_EXIT := 0.35
const TOTAL := 3.85
const DROP_AT := 0.46
const SPOON_BOX := 250.0
const MORTAR_LIFT := 28.0

var t := -1.0
var chips: Array = []
var falling: Array = []
var _swept := false
var _released := false
var _landed := false
var _trail := 0.0
var mouth := Vector2.ZERO
var mouth_r := Vector2.ZERO
var start := Vector2.ZERO
var end := Vector2.ZERO
var land := Vector2.ZERO
var control := Vector2.ZERO
var orbit := Vector2.ZERO


func begin(mouth_center: Vector2, radii: Vector2) -> void:
	t = 0.0
	chips = []
	falling = []
	_swept = false
	_released = false
	_landed = false
	_trail = 0.0
	mouth = mouth_center
	mouth_r = radii
	var bowl_cx := MortarPile.BOWL_LEFT + MortarPile.BOWL_W * 0.5
	var bowl_cy := MortarPile.BOWL_TOP + MortarPile.BOWL_H * 0.68
	start = Vector2(
		MortarPile.ZONE_X + (bowl_cx / 100.0) * MortarPile.ZONE_W,
		MortarPile.ZONE_Y + (bowl_cy / 100.0) * MortarPile.ZONE_H - MORTAR_LIFT
	)
	orbit = Vector2(
		MortarPile.ZONE_W * (MortarPile.BOWL_W / 100.0) * 0.3,
		MortarPile.ZONE_H * (MortarPile.BOWL_H / 100.0) * 0.28
	)
	end = Vector2(mouth.x - mouth_r.x * 0.35, mouth.y - 68.0)
	land = Vector2(mouth.x, mouth.y + mouth_r.y * 0.22)
	control = Vector2((start.x + end.x) * 0.5, minf(start.y, end.y) - 230.0)


func active() -> bool:
	return t >= 0.0


func update(dt: float, pile: MortarPile) -> Dictionary:
	var landed_now := false
	if t < 0.0:
		return {"alive": false, "landed": false}
	var prev := t
	t += dt
	var pos := start
	var rot := 0.0
	var opacity := 1.0
	var blob := 0.0
	if t < T_IN:
		var k := _ease_out(t / T_IN)
		pos = Vector2(start.x, start.y - 210.0 * (1.0 - k))
		rot = -22.0 * (1.0 - k)
	elif t < T_SCOOP:
		var k2 := (t - T_IN) / T_STIR
		var ang := k2 * TAU
		pos = Vector2(start.x + cos(ang) * orbit.x, start.y + sin(ang) * orbit.y)
		rot = 18.0 * sin(ang)
		if pile != null:
			_take(pile.scoop_under(pos.x, pos.y))
			if k2 > 0.86 and not _swept:
				_swept = true
				_take(pile.scoop_rest())
		blob = 0.0 if chips.is_empty() else minf(1.0, 0.45 + float(chips.size()) / 10.0)
	elif t < T_SCOOP + T_CARRY:
		var k3 := _ease_in_out((t - T_SCOOP) / T_CARRY)
		pos = _bezier(k3)
		rot = 8.0 * sin(k3 * PI)
		blob = 1.0
		var fine := 0
		for chip in chips:
			if str(chip.get("kind", "")) == "dust":
				fine += 1
		_trail += dt * (6.0 + minf(18.0, float(fine) * 1.5))
	elif t < T_SCOOP + T_CARRY + T_DROP:
		var k4 := (t - T_SCOOP - T_CARRY) / T_DROP
		var tilt_k := _ease_out(minf(1.0, k4 / DROP_AT))
		pos = Vector2(end.x + 10.0 * tilt_k, end.y)
		rot = 75.0 * _ease_in_out(clampf(k4 / DROP_AT, 0.0, 1.0))
		if k4 >= DROP_AT and not _released:
			_released = true
			_release()
		if _released and not _landed:
			var pour := clampf((k4 - DROP_AT) / (1.0 - DROP_AT), 0.0, 1.0)
			var eased := pour * pour
			_place_fall(eased, pour)
			if pour >= 0.92:
				_landed = true
				landed_now = true
		blob = 0.0 if _released else 1.0
	elif t < TOTAL:
		if _released and not _landed:
			_landed = true
			landed_now = true
		var k5 := _ease_in((t - T_SCOOP - T_CARRY - T_DROP) / T_EXIT)
		pos = Vector2(end.x + 10.0, end.y - 160.0 * k5)
		rot = 75.0 - 60.0 * k5
		opacity = 1.0 - k5
		blob = 0.0
	else:
		if not _landed:
			_landed = true
			landed_now = true
		t = -1.0
		return {"alive": false, "landed": landed_now, "x": pos.x, "y": pos.y}
	var trail_n := 0
	if t >= T_SCOOP and t < T_SCOOP + T_CARRY:
		trail_n = int(floor(_trail))
		_trail -= float(trail_n)
	return {
		"alive": true,
		"landed": landed_now,
		"x": pos.x,
		"y": pos.y,
		"rot": rot,
		"opacity": opacity,
		"blob": blob,
		"chips": _shown(chips, 16),
		"falling": falling,
		"trail": trail_n,
		"color": _chip_color(),
		"prev": prev,
	}


func _take(list: Array) -> void:
	for chip in list:
		chips.append(chip)


func _release() -> void:
	var list := _pour_sample(chips, 12)
	falling = []
	var n := maxi(1, list.size())
	for i in list.size():
		var chip: Dictionary = list[i]
		var ang := float(i) * 2.399
		var rad := sqrt((float(i) + 0.5) / float(n))
		falling.append({
			"chip": chip,
			"ox": cos(ang) * rad * 26.0,
			"oy": sin(ang) * rad * 10.0,
			"w": minf(36.0, maxf(18.0, float(chip.get("w", 20.0)) * 0.5)),
			"h": minf(30.0, maxf(14.0, float(chip.get("h", 16.0)) * 0.46)),
			"eased": 0.0,
			"opacity": 1.0,
		})


func _place_fall(eased: float, pour: float) -> void:
	var op := 1.0 if pour < 0.72 else maxf(0.0, 1.0 - (pour - 0.72) / 0.28)
	if pour >= 0.92:
		op = 0.0
	for item in falling:
		item["eased"] = eased
		item["opacity"] = op


func _shown(list: Array, limit: int) -> Array:
	var picked := _pour_sample(list, limit)
	var out: Array = []
	for i in picked.size():
		var chip: Dictionary = picked[i]
		var ang := float(i) * 2.399
		var rad := sqrt((float(i) + 0.5) / 16.0)
		var copy := chip.duplicate()
		copy["sx"] = cos(ang) * rad * 18.0
		copy["sy"] = sin(ang) * rad * 14.0
		copy["dw"] = minf(26.0, maxf(9.0, float(chip.get("w", 18.0)) * 0.4))
		copy["dh"] = minf(30.0, maxf(11.0, float(chip.get("h", 16.0)) * 0.4))
		out.append(copy)
	return out


func _pour_sample(list: Array, limit: int) -> Array:
	var groups := {}
	var order: Array = []
	for chip in list:
		var id := str(chip.get("ingredient_id", chip.get("kind", "")))
		if not groups.has(id):
			groups[id] = []
			order.append(id)
		(groups[id] as Array).append(chip)
	for id in order:
		var group: Array = groups[id]
		group.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
			return float(a.get("w", 1.0)) * float(a.get("h", 1.0)) > float(b.get("w", 1.0)) * float(b.get("h", 1.0))
		)
	var picked: Array = []
	var progressed := true
	while picked.size() < limit and progressed:
		progressed = false
		for id in order:
			if picked.size() >= limit:
				break
			var group: Array = groups[id]
			if group.is_empty():
				continue
			picked.append(group.pop_front())
			progressed = true
	return picked


func _bezier(k: float) -> Vector2:
	var u := 1.0 - k
	return Vector2(
		u * u * start.x + 2.0 * u * k * control.x + k * k * end.x,
		u * u * start.y + 2.0 * u * k * control.y + k * k * end.y
	)


func _chip_color() -> Color:
	if chips.is_empty():
		return Color("#8a7a52")
	var chip: Dictionary = chips[0]
	if chip.get("color") is Color:
		return chip["color"]
	return Color("#8a7a52")


func _ease_out(k: float) -> float:
	return 1.0 - pow(1.0 - clampf(k, 0.0, 1.0), 3.0)


func _ease_in(k: float) -> float:
	var u := clampf(k, 0.0, 1.0)
	return u * u * u


func _ease_in_out(k: float) -> float:
	var u := clampf(k, 0.0, 1.0)
	if u < 0.5:
		return 2.0 * u * u
	return 1.0 - pow(-2.0 * u + 2.0, 2.0) / 2.0
