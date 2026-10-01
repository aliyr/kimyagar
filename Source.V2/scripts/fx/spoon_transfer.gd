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
## Wrist speed stays under the 250 deg/s cap, with a finite acceleration so
## phase seams do not snap.
const MAX_ANG_VEL := 240.0
const MAX_ANG_ACC := 1400.0


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
	_ang = -28.0
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
		# Rise from rest beside the mortar, arc over, and settle into the dip.
		phase = "approach"
		var k := _ease_in_out(t / T_IN)
		var rest := Vector2(start.x + 96.0, start.y - 12.0)
		var c1 := Vector2(start.x + 48.0, start.y - 92.0)
		var c2 := Vector2(start.x - 18.0, dip.y - 20.0)
		pos = _cubic(rest, c1, c2, dip, k)
		rot = lerpf(-28.0, 18.0, k)
	elif t < T_SCOOP:
		phase = "scoop"
		var k2 := (t - T_IN) / T_STIR
		var cycle := clampf(k2, 0.0, 0.999) * 2.0
		var which := int(floor(cycle))
		var local := cycle - float(which)
		var xoff := 0.0
		if local < 0.34:
			phase = "dip"
			depth = _ease_in(local / 0.34)
			xoff = sin(local / 0.34 * PI) * orbit.x * 0.22
			# The approach already seats the bowl. The second scoop drops in from the lift.
			var from_rot := 18.0 if which == 0 else -2.0
			rot = lerpf(from_rot, 48.0, _ease_in_out(local / 0.34))
			if depth > 0.62 and which < _dip_sent.size() and not _dip_sent[which]:
				_dip_sent[which] = true
				cue = "dip"
		elif local < 0.62:
			depth = 1.0
			var drag := (local - 0.34) / 0.28
			xoff = lerpf(0.0, orbit.x * 0.72, _ease_in_out(drag))
			rot = lerpf(48.0, 14.0, drag)
			if drag > 0.2 and which < _drag_sent.size() and not _drag_sent[which]:
				_drag_sent[which] = true
				cue = "drag"
		else:
			var lift_k := _ease_out((local - 0.62) / 0.38)
			depth = 1.0 - lift_k
			xoff = orbit.x * 0.72 * (1.0 - lift_k)
			rot = lerpf(14.0, -2.0, lift_k)
			shedding = lift_k > 0.08 and lift_k < 0.92
		var high := dip.y if (which == 0 and local < 0.62) else lift.y
		pos = Vector2(start.x + xoff, lerpf(high, dip.y, depth))
		var sunk := (float(which) + depth) / 2.0
		if sunk > _removed:
			_removed = sunk
		if pile != null:
			if _had_material:
				_take(pile.scoop_under(pos.x, pos.y))
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
		pos.x += sin(k3 * TAU) * 6.0
		pos.y += sin(k3 * PI) * 5.0
		if k3 > 0.84:
			var over := sin((k3 - 0.84) / 0.16 * PI)
			pos.x += over * 14.0
			pos.y -= over * 7.0
		var ahead := _carry(minf(1.0, k3 + 0.05))
		var want := clampf(-(ahead.x - pos.x) * 0.025, -4.0, 4.0)
		_carry_rot = lerpf(_carry_rot, want, 0.22)
		rot = _carry_rot + sin(k3 * TAU) * 1.6
		blob = 1.0 if _had_material else 0.0
		var fine := 0
		for chip in chips:
			if str(chip.get("kind", "")) == "dust":
				fine += 1
		_trail += dt * (4.0 + minf(10.0, float(fine)))
	elif t < T_SCOOP + T_CARRY + T_DROP:
		phase = "pour"
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
		var residue := 0.32 * (1.0 - clampf((k4 - DROP_AT) / (1.0 - DROP_AT), 0.0, 1.0))
		blob = (1.0 if not _released else residue) if _had_material else 0.0
	elif t < TOTAL:
		phase = "exit"
		if _released and not _landed:
			_landed = true
			landed_now = true
		var k5 := _ease_in_out((t - T_SCOOP - T_CARRY - T_DROP) / T_EXIT)
		pos = Vector2(end.x + 18.0 - 28.0 * k5, end.y - 170.0 * k5)
		# The web exit settles at 15 deg. k5 is already eased, and the
		# turn finishes early so the limited wrist can arrive and hold.
		var rot_k := clampf(k5 / 0.78, 0.0, 1.0)
		rot = lerpf(76.0, 15.0, rot_k)
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
	mortar_level = _level_at(t)
	if pile != null:
		pile.set_visual_level(mortar_level)
	rot = _slew_rot(rot, dt)
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
	var step_dt := maxf(dt, 0.0001)
	var err := target - _ang
	var want := clampf(err / step_dt, -MAX_ANG_VEL, MAX_ANG_VEL)
	_ang_vel = move_toward(_ang_vel, want, MAX_ANG_ACC * step_dt)
	_ang_vel = clampf(_ang_vel, -MAX_ANG_VEL, MAX_ANG_VEL)
	var step := _ang_vel * step_dt
	if absf(step) >= absf(err):
		_ang = target
		_ang_vel = clampf(err / step_dt, -MAX_ANG_VEL, MAX_ANG_VEL)
	else:
		_ang += step
	return _ang


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
