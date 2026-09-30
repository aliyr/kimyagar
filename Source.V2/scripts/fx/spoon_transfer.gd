class_name SpoonTransfer
extends RefCounted
## Wooden spoon carry from Web/src/scene/SpoonTransfer.tsx. Timing matches the web.

const T_IN := 0.32
const T_STIR := 1.6
const T_SCOOP := 1.92
const T_CARRY := 0.7
const T_DROP := 0.88
const T_EXIT := 0.35
const TOTAL := 3.85
const DROP_AT := 0.46
const SPOON_BOX := 300.0
const MORTAR_LIFT := 28.0
## Frames used by the hour-17 shots. Dip is the second scoop's pause.
const SHOW_DIP := 1.49
const SHOW_POUR := 3.20

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
var dip := Vector2.ZERO
var lift := Vector2.ZERO
var hover := Vector2.ZERO


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
	var floor_y := MortarPile.ZONE_Y + ((MortarPile.BOWL_TOP + MortarPile.BOWL_H * 0.90) / 100.0) * MortarPile.ZONE_H
	dip = Vector2(start.x, maxf(start.y + 52.0, floor_y))
	lift = Vector2(start.x, start.y - 16.0)
	hover = Vector2(start.x - 36.0, start.y - 200.0)


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
	var pouring := 0.0
	if t < T_IN:
		# Arc down into the pile, slowing as the bowl enters the material.
		var k := _ease_out(t / T_IN)
		var ctrl := Vector2(start.x + 54.0, (hover.y + dip.y) * 0.45)
		pos = _quad(hover, ctrl, dip, k)
		rot = lerpf(-34.0, 28.0, k)
	elif t < T_SCOOP:
		var k2 := (t - T_IN) / T_STIR
		var depth := _scoop_depth(k2)
		pos = Vector2(start.x + sin(k2 * TAU) * orbit.x * 0.85, lerpf(lift.y, dip.y, depth))
		rot = lerpf(-8.0, 32.0, depth)
		if pile != null:
			_take(pile.scoop_under(pos.x, pos.y))
			if k2 > 0.86 and not _swept:
				_swept = true
				_take(pile.scoop_rest())
		blob = 0.0 if chips.is_empty() else minf(1.0, 0.45 + float(chips.size()) / 10.0)
	elif t < T_SCOOP + T_CARRY:
		var k3 := _dwell((t - T_SCOOP) / T_CARRY)
		pos = _carry(k3)
		var ahead := _carry(minf(1.0, k3 + 0.04))
		var tangent := ahead - pos
		rot = clampf(-tangent.x * 0.045, -18.0, 18.0)
		blob = 1.0
		var fine := 0
		for chip in chips:
			if str(chip.get("kind", "")) == "dust":
				fine += 1
		_trail += dt * (6.0 + minf(18.0, float(fine) * 1.5))
	elif t < T_SCOOP + T_CARRY + T_DROP:
		var k4 := (t - T_SCOOP - T_CARRY) / T_DROP
		var tilt_k := _ease_in_out(clampf(k4 / DROP_AT, 0.0, 1.0))
		# Small arc onto the mouth, then a pause at full tilt while it pours.
		pos = Vector2(end.x + 18.0 * sin(tilt_k * PI * 0.5), end.y - 14.0 * sin(tilt_k * PI))
		rot = 76.0 * tilt_k
		if k4 >= DROP_AT and not _released:
			_released = true
			_release()
		if _released and not _landed:
			var pour := clampf((k4 - DROP_AT) / (1.0 - DROP_AT), 0.0, 1.0)
			_place_fall(pour)
			pouring = 1.0
			if pour >= 0.92:
				_landed = true
				landed_now = true
		blob = 0.0 if _released else 1.0
	elif t < TOTAL:
		if _released and not _landed:
			_landed = true
			landed_now = true
		var k5 := _ease_in((t - T_SCOOP - T_CARRY - T_DROP) / T_EXIT)
		pos = Vector2(end.x + 18.0 - 28.0 * k5, end.y - 170.0 * k5)
		rot = 76.0 * (1.0 - _ease_out(k5))
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
		"lip": lip_offset(rot),
		"pouring": pouring,
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
			"delay": float(i) / float(n) * 0.38,
			"eased": 0.0,
			"opacity": 0.0,
		})


func _place_fall(pour: float) -> void:
	for item in falling:
		var delay := float(item.get("delay", 0.0))
		var span := maxf(0.08, 0.92 - delay)
		var local := clampf((pour - delay) / span, 0.0, 1.0)
		item["eased"] = local * local
		var op := 1.0
		if local <= 0.001:
			op = 0.0
		elif local > 0.82:
			op = maxf(0.0, 1.0 - (local - 0.82) / 0.18)
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


func lip_offset(rot_deg: float) -> Vector2:
	var rad := deg_to_rad(rot_deg)
	var front := Vector2(-sin(rad), cos(rad))
	var dir := front * 0.75 + Vector2(0.0, 1.0) * 0.45
	if dir.length() < 0.001:
		return Vector2(0, 26)
	return dir.normalized() * 30.0


func _scoop_depth(k2: float) -> float:
	# Two scoops. Each one eases down, holds in the material, then lifts.
	var cycle := clampf(k2, 0.0, 0.999) * 2.0
	var local: float = cycle - floorf(cycle)
	if local < 0.38:
		return _ease_in(local / 0.38)
	if local < 0.55:
		return 1.0
	return 1.0 - _ease_out((local - 0.55) / 0.45)


func _carry(k: float) -> Vector2:
	var u := clampf(k, 0.0, 1.0)
	var c1 := Vector2(lift.x + 90.0, minf(lift.y, end.y) - 70.0)
	var c2 := Vector2(end.x - 140.0, minf(lift.y, end.y) - 220.0)
	var o := 1.0 - u
	return lift * (o * o * o) + c1 * (3.0 * o * o * u) + c2 * (3.0 * o * u * u) + end * (u * u * u)


func _quad(a: Vector2, ctrl: Vector2, b: Vector2, k: float) -> Vector2:
	var u := 1.0 - clampf(k, 0.0, 1.0)
	var t := clampf(k, 0.0, 1.0)
	return a * (u * u) + ctrl * (2.0 * u * t) + b * (t * t)


func _dwell(k: float) -> float:
	var u := clampf(k, 0.0, 1.0)
	return u * u * (3.0 - 2.0 * u)


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
