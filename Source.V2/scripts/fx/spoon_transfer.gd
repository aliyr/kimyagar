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
var mortar_level := 1.0
var motes: Array = []
var _removed := 0.0
var _carry_rot := 0.0
var _scoops_taken := 0
var _dip_sent: Array[bool] = [false, false]
var _drag_sent: Array[bool] = [false, false]
var _kind := "powder"
var _kind_set := false
var _had_material := false
var _base_color := Color("#8a7a52")
var _base_set := false
var _mote_wait := 0.0
var _ang := -28.0
var _ang_vel := 0.0
var _hollow_sent: Array[bool] = [false, false]
## The wrist follows a smooth target. Acceleration stays near 6,000 deg/s^2.
## A hard speed cap was what snapped 240 deg/s down to -99 in one tick.
const MAX_ANG_ACC := 6000.0
const ANG_W := 38.0


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
	# The bowl lands on the material, at the centre of the painted opening.
	dip = MortarPile.scoop_point()
	start = Vector2(dip.x, dip.y - 52.0)
	var mr := MortarPile.visible_mouth_r()
	orbit = Vector2(mr.x * 0.20, mr.y * 0.10)
	# High enough above the mouth that the stream has a real fall into the opening.
	end = Vector2(mouth.x, mouth.y - mouth_r.y - 78.0)
	land = Vector2(mouth.x, mouth.y + mouth_r.y * 0.22)
	control = Vector2((start.x + end.x) * 0.5, minf(start.y, end.y) - 210.0)
	lift = Vector2(dip.x, dip.y - 22.0)
	hover = Vector2(dip.x - 16.0, MortarPile.visible_mouth().y - mr.y - 70.0)
	mortar_level = 1.0
	motes = []
	_removed = 0.0
	_carry_rot = 0.0
	_scoops_taken = 0
	_dip_sent = [false, false]
	_drag_sent = [false, false]
	_kind = "powder"
	_kind_set = false
	_had_material = false
	_base_set = false
	_mote_wait = 0.0
	_ang = REST_ROT
	_ang_vel = 0.0
	_hollow_sent = [false, false]


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
	var cue := ""
	var phase := "approach"
	var depth := 0.0
	var shedding := false
	if not _kind_set:
		# The kind is the pile at the tap. Later scoops must not re-read an
		# emptied bowl (that reported leaf for every powder).
		_kind_set = true
		if pile == null:
			_had_material = true
		else:
			_had_material = pile.surface_level() > 0.04
			if _had_material:
				_kind = pile.material_kind()
				_base_color = pile.mean_color()
				_base_set = true
	if t < T_IN:
		# From above and to the side, tip first, down into the opening.
		phase = "approach"
		var k := _quintic(t / T_IN)
		var mc := MortarPile.visible_mouth()
		var mr := MortarPile.visible_mouth_r()
		var rest := Vector2(mc.x + mr.x * 0.46, mc.y - mr.y - 28.0)
		var c1 := Vector2(mc.x + mr.x * 0.70, rest.y - 46.0)
		var c2 := Vector2(mc.x + 6.0, mc.y - mr.y * 0.25)
		pos = _cubic(rest, c1, c2, dip, k)
	elif t < T_SCOOP:
		phase = "scoop"
		var k2 := (t - T_IN) / T_STIR
		var cycle := clampf(k2, 0.0, 0.999) * 2.0
		var which := int(floor(cycle))
		var local := cycle - float(which)
		# Zero velocity at both ends of the cycle, so the seams stay C1.
		var hump := sin(local * PI)
		var xoff := hump * hump * orbit.x * 0.85
		var y := dip.y
		if which == 0:
			if local < 0.62:
				depth = 1.0 if local >= 0.34 else _ease_in(local / 0.34)
			else:
				var up := _quintic((local - 0.62) / 0.38)
				y = lerpf(dip.y, lift.y, up)
				depth = 1.0 - up
		elif local < 0.40:
			var down := _quintic(local / 0.40)
			y = lerpf(lift.y, dip.y, down)
			depth = down
		elif local < 0.62:
			depth = 1.0
		else:
			var up2 := _quintic((local - 0.62) / 0.38)
			y = lerpf(dip.y, lift.y, up2)
			depth = 1.0 - up2
		if local < 0.34:
			phase = "dip"
			if depth > 0.62 and which < _dip_sent.size() and not _dip_sent[which]:
				_dip_sent[which] = true
				cue = "dip"
		elif local < 0.62:
			var drag := (local - 0.34) / 0.28
			if drag > 0.2 and which < _drag_sent.size() and not _drag_sent[which]:
				_drag_sent[which] = true
				cue = "drag"
		else:
			var lift_k := (local - 0.62) / 0.38
			shedding = lift_k > 0.08 and lift_k < 0.92
		pos = Vector2(dip.x + xoff, y)
		if depth > 0.55:
			pos = _keep_in_mouth(pos)
		var sunk := (float(which) + depth) / 2.0
		if sunk > _removed:
			_removed = sunk
		if pile != null:
			if _had_material:
				# The pivot rests on the material. Chips sit deeper in the bowl,
				# under the buried tip, so gather there while the spoon is seated.
				var gather := pos
				if pos.y > dip.y - 10.0:
					gather = Vector2(pos.x, MortarPile.front_lip_y() - 2.0)
				_take(pile.scoop_under(gather.x, gather.y))
			if local >= 0.40 and which < _hollow_sent.size() and not _hollow_sent[which]:
				_hollow_sent[which] = true
				pile.note_hollow(pos.x, pos.y)
			if k2 > 0.93 and not _swept:
				_swept = true
				if _had_material:
					_take(pile.scoop_rest())
		# The mound stays empty until the bowl is in the material, then grows
		# through the drag and is carried out on the lift.
		if not _had_material:
			blob = 0.0
		elif local < 0.34:
			blob = 0.0
		elif local < 0.62:
			blob = _ease_in_out((local - 0.34) / 0.28)
		else:
			blob = 1.0
	elif t < T_SCOOP + T_CARRY:
		phase = "carry"
		var k3 := _dwell((t - T_SCOOP) / T_CARRY)
		if _carry_rot == 0.0 and absf(rot) < 0.01:
			_carry_rot = -2.0
		pos = _carry(k3)
		# A bump that is still at both ends, so the carry does not kick the wrist.
		var sway := sin(k3 * PI)
		sway *= sway
		pos.x += sway * 8.0
		pos.y += sway * 4.0
		blob = 1.0 if _had_material else 0.0
		var fine := 0
		for chip in chips:
			if str(chip.get("kind", "")) == "dust":
				fine += 1
		_trail += dt * (4.0 + minf(10.0, float(fine)))
	elif t < T_SCOOP + T_CARRY + T_DROP:
		phase = "pour"
		var k4 := (t - T_SCOOP - T_CARRY) / T_DROP
		var tilt_k := _dwell(clampf(k4 / 0.70, 0.0, 1.0))
		# Small arc onto the mouth, then a pause at full tilt while it pours.
		pos = Vector2(end.x + 14.0 * sin(tilt_k * PI * 0.5), end.y - 8.0 * sin(tilt_k * PI))
		if k4 >= DROP_AT and not _released:
			_released = true
			_release()
		if k4 > 0.10:
			# The ribbon grows out of the lip over 0.2 s. It does not pop in at full width.
			pouring = clampf((k4 - 0.10) / (0.20 / T_DROP), 0.0, 1.0)
		if _released and not _landed:
			var pour := clampf((k4 - DROP_AT) / (1.0 - DROP_AT), 0.0, 1.0)
			_place_fall(pour)
			if pour >= 0.92:
				_landed = true
				landed_now = true
		# The heap shrinks with the pour. It does not jump on the release tick.
		var poured := _dwell(clampf((k4 - 0.04) / 0.90, 0.0, 1.0))
		blob = (1.0 - poured) if _had_material else 0.0
	elif t < TOTAL:
		phase = "exit"
		if _released and not _landed:
			_landed = true
			landed_now = true
		var k5 := _dwell((t - T_SCOOP - T_CARRY - T_DROP) / T_EXIT)
		pos = Vector2(end.x + 14.0 - 22.0 * k5, end.y - 150.0 * k5)
		opacity = 1.0 - _ease_in_out((t - T_SCOOP - T_CARRY - T_DROP) / T_EXIT)
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
	mortar_level = _level_at(t)
	if pile != null:
		pile.set_visual_level(mortar_level)
		if prev < T_SCOOP and t >= T_SCOOP:
			pile.note_carry()
	rot = _slew_rot(_rot_target(t), dt)
	_tick_motes(dt, pos, shedding and _had_material, _chip_color())
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
		"phase": phase,
		"cue": cue,
		"kind": _kind,
		"level": mortar_level,
		"depth": depth,
		"motes": motes,
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


## Keep the part of poly at or above limit_y (smaller y). clip_polygons is a
## difference in Godot 4.7.2 and would keep the buried half.
static func clip_above(poly: PackedVector2Array, limit_y: float) -> PackedVector2Array:
	if poly.size() < 3:
		return PackedVector2Array()
	var rect := PackedVector2Array([
		Vector2(-4000.0, -4000.0),
		Vector2(8000.0, -4000.0),
		Vector2(8000.0, limit_y),
		Vector2(-4000.0, limit_y),
	])
	var clipped: Array = Geometry2D.intersect_polygons(poly, rect)
	if clipped.is_empty():
		return PackedVector2Array()
	var best: PackedVector2Array = clipped[0]
	var best_n := best.size()
	for i in range(1, clipped.size()):
		var part: PackedVector2Array = clipped[i]
		if part.size() > best_n:
			best = part
			best_n = part.size()
	return best


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


func _cubic(a: Vector2, b: Vector2, c: Vector2, d: Vector2, k: float) -> Vector2:
	var u := 1.0 - clampf(k, 0.0, 1.0)
	var t := clampf(k, 0.0, 1.0)
	return a * (u * u * u) + b * (3.0 * u * u * t) + c * (3.0 * u * t * t) + d * (t * t * t)


func _tick_motes(dt: float, origin: Vector2, shedding: bool, col: Color) -> void:
	var keep: Array = []
	for item_v in motes:
		var item: Dictionary = item_v
		item["life"] = float(item.get("life", 0.0)) - dt
		item["x"] = float(item.get("x", 0.0)) + float(item.get("vx", 0.0)) * dt
		item["y"] = float(item.get("y", 0.0)) + float(item.get("vy", 0.0)) * dt
		item["vy"] = float(item.get("vy", 0.0)) + float(item.get("g", 0.0)) * dt
		if float(item["life"]) > 0.0:
			keep.append(item)
	motes = keep
	if not shedding:
		return
	_mote_wait -= dt
	if _mote_wait > 0.0 or motes.size() >= 6:
		return
	_mote_wait = 0.08
	motes.append({
		"x": origin.x - 4.0, "y": origin.y + 10.0, "vx": -22.0, "vy": 70.0, "g": 80.0,
		"life": 0.32, "r": 3.4, "dust": false, "color": col,
	})
	motes.append({
		"x": origin.x + 8.0, "y": origin.y + 2.0, "vx": 16.0, "vy": -28.0, "g": 6.0,
		"life": 0.42, "r": 1.7, "dust": true, "color": col,
	})


func _chip_color() -> Color:
	if chips.is_empty():
		return _base_color
	var r := 0.0
	var g := 0.0
	var b := 0.0
	var n := 0
	for chip_v in chips:
		var chip: Dictionary = chip_v
		var col: Color = _base_color
		var raw: Variant = chip.get("color", null)
		if raw is Color:
			col = raw
		elif raw != null and str(raw) != "":
			col = Color(str(raw))
		r += col.r
		g += col.g
		b += col.b
		n += 1
	if n == 0:
		return _base_color
	return Color(r / float(n), g / float(n), b / float(n), 1.0)


## 42 deg sends the handle up and out over the side of the rim. The tip,
## local +Y, points down into the material.
const DIP_ROT := 42.0
const REST_ROT := 64.0
const UNWIND_AT := 1.62
const POUR_TILT := 68.0


func _rot_target(now: float) -> float:
	if now <= 0.0:
		return REST_ROT
	if now < T_IN:
		return lerpf(REST_ROT, DIP_ROT, _quintic(now / T_IN))
	if now < UNWIND_AT:
		return DIP_ROT
	if now < T_SCOOP:
		return lerpf(DIP_ROT, -2.0, _dwell((now - UNWIND_AT) / (T_SCOOP - UNWIND_AT)))
	var carry_end := T_SCOOP + T_CARRY
	if now < carry_end:
		var k := (now - T_SCOOP) / T_CARRY
		var bump := sin(k * PI)
		return -2.0 + bump * bump * 2.2
	var pour_end := carry_end + T_DROP
	if now < pour_end:
		var k4 := (now - carry_end) / T_DROP
		if k4 < 0.70:
			return lerpf(-2.0, POUR_TILT, _dwell(k4 / 0.70))
		return POUR_TILT
	# 68 -> 15 across the whole exit. Smoothstep peaks near 230 deg/s.
	var k5 := clampf((now - pour_end) / T_EXIT, 0.0, 1.0)
	return lerpf(POUR_TILT, 15.0, _dwell(k5))


func _keep_in_mouth(p: Vector2) -> Vector2:
	var center := MortarPile.visible_mouth()
	var rad := MortarPile.visible_mouth_r()
	var dx := (p.x - center.x) / rad.x
	var dy := (p.y - center.y) / rad.y
	var n := sqrt(dx * dx + dy * dy)
	if n <= 0.58 or n < 0.001:
		return p
	var s := 0.58 / n
	return Vector2(center.x + dx * s * rad.x, center.y + dy * s * rad.y)


func _level_at(now: float) -> float:
	# Each scoop drops 0.46, and only while the bowl is in the material.
	# The ease starts and ends flat, so the two scoops meet without a step.
	if now < T_IN:
		return 1.0
	if now >= T_SCOOP:
		return 0.08
	var k2 := (now - T_IN) / T_STIR
	var cycle := clampf(k2, 0.0, 0.999) * 2.0
	var which := int(floor(cycle))
	var local := cycle - float(which)
	var u := 0.0
	if local >= 0.34:
		u = _ease_in_out((local - 0.34) / 0.66)
	return 1.0 - 0.46 * (float(which) + u)


func _slew_rot(target: float, dt: float) -> float:
	# The target is already smoothstep-shaped, so the wrist is that curve.
	# A spring here was unstable at 30 Hz and snapped the speed.
	var step_dt := maxf(dt, 0.0001)
	var prev := _rot_target(maxf(0.0, t - step_dt))
	var vel := clampf((target - prev) / step_dt, -245.0, 245.0)
	var acc := clampf((vel - _ang_vel) / step_dt, -MAX_ANG_ACC, MAX_ANG_ACC)
	_ang_vel += acc * step_dt
	# Stay on the target when the limit is not binding.
	if absf(acc) < MAX_ANG_ACC - 1.0:
		_ang = target
		_ang_vel = vel
	else:
		_ang += _ang_vel * step_dt
	return _ang


func _quintic(k: float) -> float:
	var u := clampf(k, 0.0, 1.0)
	return u * u * u * (u * (u * 6.0 - 15.0) + 10.0)


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
