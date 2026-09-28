class_name ClassicBrewSim
extends RefCounted
## 1:1 port of Web/src/scene/cauldron/ClassicBrewSim.ts.

const STIR_ENTER := 0.4
const STIR_EXIT := 0.4
const STIR_OMEGA := TAU / 1.2
const SPOON_R := 0.55
const SPOON_REACH := 0.32
const VORTEX_TAU := 2.5
const SINK_EASE := 3.0
const MAX_CHIPS := 60
const MAX_BLOOMS := 24
const MAX_STEAM := 40
const MAX_BUBBLES := 28
const MAX_DROPS := 36
const DROP_GRAVITY := 14.0
const BUBBLE_GROW := 0.72
const SPARKLE_LIFE := 0.7
const SQUASH_STIFFNESS := 120.0
const SQUASH_DAMPING := 10.0
const TILT_EASE := 6.0
const INSIDE := 0.9

# drop = (STOVE_HOLE.cy - CLASSIC_MOUTH.y) / CLASSIC_MOUTH.rx
const SPLASH_DROP := 1.4630574452003025
# depth = CLASSIC_MOUTH.ry / CLASSIC_MOUTH.rx
const SPLASH_DEPTH := 0.22222222222222224
# foot = STOVE_HOLE.rx / CLASSIC_MOUTH.rx + 0.2
const SPLASH_FOOT := 1.2841836734693877
# reachLeft = (CLASSIC_MOUTH.x - (mortar.x + mortar.width + SPLASH_MARGIN)) / CLASSIC_MOUTH.rx
const SPLASH_REACH_LEFT := 2.097033257747543
# reachRight = (bottlingPoint.x - SPLASH_MARGIN - CLASSIC_MOUTH.x) / CLASSIC_MOUTH.rx
const SPLASH_REACH_RIGHT := 1.5594293272864705
const SPLASH_SIDE_BACK := -0.6
const SPLASH_SIDE_FRONT := 0.9
# frontTop = (STOVE_HOLE.cy + STOVE_HOLE.ry + 6 - CLASSIC_MOUTH.y) / CLASSIC_MOUTH.rx
const SPLASH_FRONT_TOP := 1.8031934996220713
# frontBottom = (TABLE_TOP_FRONT_Y - SPLASH_MARGIN / 2 - CLASSIC_MOUTH.y) / CLASSIC_MOUTH.rx
const SPLASH_FRONT_BOTTOM := 1.902307820675168

const CLASSIC_SPLASH_TABLE := {
	"drop": SPLASH_DROP,
	"depth": SPLASH_DEPTH,
	"foot": SPLASH_FOOT,
	"reach_left": SPLASH_REACH_LEFT,
	"reach_right": SPLASH_REACH_RIGHT,
	"side_back": SPLASH_SIDE_BACK,
	"side_front": SPLASH_SIDE_FRONT,
	"front_top": SPLASH_FRONT_TOP,
	"front_bottom": SPLASH_FRONT_BOTTOM,
}

# w = (ZONE.width * (FLOOR.rx * 100 * 1.12 / 0.42)) / 100, ZONE.width = 250
const BOWL_W := 181.33333333333337
# h = (ZONE.height * (FLOOR.ry * 100 * 1.9 / 0.32)) / 100, ZONE.height = 273
const BOWL_H := 83.9645625
const BOWL_PX := {"w": BOWL_W, "h": BOWL_H}

const RESPAWN_START_Y := -560.0
const RESPAWN_GRAVITY := 3400.0
const RESPAWN_RESTITUTION := 0.22
const RESPAWN_MIN_BOUNCE := 60.0
const RESPAWN_ROCK_DEG := 7.0
const RESPAWN_ROCK_HZ := 4.2
const RESPAWN_ROCK_DAMP := 4.5
const RESPAWN_FILL_DELAY := 0.22
const RESPAWN_FILL_DUR := 0.95
const RESPAWN := {
	"start_y": RESPAWN_START_Y,
	"gravity": RESPAWN_GRAVITY,
	"restitution": RESPAWN_RESTITUTION,
	"min_bounce": RESPAWN_MIN_BOUNCE,
	"rock_deg": RESPAWN_ROCK_DEG,
	"rock_hz": RESPAWN_ROCK_HZ,
	"rock_damp": RESPAWN_ROCK_DAMP,
	"fill_delay": RESPAWN_FILL_DELAY,
	"fill_dur": RESPAWN_FILL_DUR,
}

const WATER := Color("3f6f8f")
const SMOKE_TINT := Color("6d655c")

const FLAT_TINT := {
	"saffron": {"tint": "#d4891c", "strength": 1.0},
	"poppy": {"tint": "#4a3d5c", "strength": 0.35},
	"borage": {"tint": "#6b4fb0", "strength": 1.0},
	"chamomile": {"tint": "#e0c85a", "strength": 0.7},
	"mint": {"tint": "#3d8f5a", "strength": 0.8},
	"ginger": {"tint": "#c17a2a", "strength": 0.9},
}

var time := 0.0
var chips: Array[Dictionary] = []
var blooms: Array[Dictionary] = []
var bubbles: Array[Dictionary] = []
var drops: Array[Dictionary] = []
var steam: Array[Dictionary] = []
var sparkles: Array[Dictionary] = []
var foam: Array[Dictionary] = []
var spots: Array[Dictionary] = []

var omega := 0.0
var swirl := 0.0
var spoon_angle := -PI / 2.0
var spoon_omega := 0.0
var slosh_x := 0.0
var slosh_y := 0.0
var heat := 0.0
var soot := 0.0
var dome := 0.0
var shiver := 0.0
var fire_glow := 0.0
var tilt := 0.0
var squash_x := 1.0
var squash_y := 1.0
var spawn_phase := "none"
var spawn_y := 0.0
var spawn_vy := 0.0
var fill := 1.0
var rock := 0.0

var _spawn_wait := 0.0
var _rock_t := -1.0
var _fill_t := -1.0
var _landings: Array[float] = []
var _fill_starts := 0
var _rng: KimRng
var _seed := 7
var _added: Dictionary = {}
var _progress: Dictionary = {}
var _spoon_mode := "none"
var _spoon_t := 0.0
var _spoon_follow: Variant = null
var _done := false
var _burnt := false
var _tilt_target := 0.0
var _squash_vx := 0.0
var _squash_vy := 0.0
var _bubble_timer := 0.0
var _steam_timer := 0.0
var _sparkle_timer := 0.0
var _foam_timer := 0.0
var _seq := 1


func _init(seed: int = 7) -> void:
	_seed = seed
	_rng = KimRng.new(seed)


static func strength_for(ingredient_id: String) -> float:
	if not FLAT_TINT.has(ingredient_id):
		return 0.75
	var spec: Dictionary = FLAT_TINT[ingredient_id]
	return float(spec["strength"])


static func flat_tint(ingredient_id: String) -> String:
	if not FLAT_TINT.has(ingredient_id):
		return "#3f6f8f"
	var spec: Dictionary = FLAT_TINT[ingredient_id]
	return str(spec["tint"])


static func chip_pixel_size(chip: Dictionary) -> Vector2:
	var w := (float(chip["w"]) / 100.0) * BOWL_W
	var h := (float(chip["h"]) / 100.0) * BOWL_H
	var size := maxf(6.0, maxf(w, h))
	var aspect := w / h if h > 0.0 else 1.0
	return Vector2(size, aspect)


static func drop_screen(d: Dictionary) -> Vector2:
	var x: float = float(d["x"])
	var y: float = float(d["y"])
	var z: float = float(d["z"])
	return Vector2(x, SPLASH_DROP - y + z * SPLASH_DEPTH)


static func drop_ground_y(d: Dictionary) -> float:
	return SPLASH_DROP + float(d["z"]) * SPLASH_DEPTH


static func table_visible(x: float, z: float) -> bool:
	var reach := SPLASH_REACH_LEFT if x < 0.0 else SPLASH_REACH_RIGHT
	if absf(x) >= SPLASH_FOOT and absf(x) <= reach:
		return z >= SPLASH_SIDE_BACK and z <= SPLASH_SIDE_FRONT
	var sy := SPLASH_DROP + z * SPLASH_DEPTH
	return sy >= SPLASH_FRONT_TOP and sy <= SPLASH_FRONT_BOTTOM


func reset(seed: Variant = null) -> void:
	var next_seed: int = _seed
	if seed != null:
		next_seed = int(seed)
	_seed = next_seed
	_rng = KimRng.new(next_seed)
	time = 0.0
	chips.clear()
	blooms.clear()
	bubbles.clear()
	drops.clear()
	steam.clear()
	sparkles.clear()
	foam.clear()
	spots.clear()
	omega = 0.0
	swirl = 0.0
	spoon_angle = -PI / 2.0
	spoon_omega = 0.0
	slosh_x = 0.0
	slosh_y = 0.0
	soot = 0.0
	dome = 0.0
	shiver = 0.0
	tilt = 0.0
	_tilt_target = 0.0
	squash_x = 1.0
	squash_y = 1.0
	_squash_vx = 0.0
	_squash_vy = 0.0
	_added.clear()
	_progress.clear()
	_spoon_mode = "none"
	_spoon_t = 0.0
	_spoon_follow = null
	_done = false
	_burnt = false
	_bubble_timer = 0.0
	_steam_timer = 0.0
	_sparkle_timer = 0.0
	_foam_timer = 0.0


func drop_chips(ingredient: Dictionary, chips: Array) -> void:
	var ing_id: String = str(ingredient["id"])
	var ing_tint: Color = _as_color(ingredient["tint"])
	var ing_strength: float = float(ingredient["strength"])
	var ing_qty: float = float(ingredient["quantity"])
	var prev_qty := 0.0
	if _added.has(ing_id):
		var prev: Dictionary = _added[ing_id]
		prev_qty = float(prev["quantity"])
	_added[ing_id] = {
		"id": ing_id,
		"tint": ing_tint,
		"strength": ing_strength,
		"quantity": prev_qty + ing_qty,
	}
	var list: Array = _slice_head(chips, MAX_CHIPS - self.chips.size())
	var n := maxi(1, list.size())
	for i in list.size():
		var chip: Dictionary = list[i]
		var angle := (float(i) / float(n)) * TAU + _rng.range(-0.25, 0.25)
		var rad := 0.22 + _rng.range(0.0, 0.62)
		var px_w := (float(chip["w"]) / 100.0) * BOWL_W
		var px_h := (float(chip["h"]) / 100.0) * BOWL_H
		var size := maxf(6.0, maxf(px_w, px_h))
		var aspect := px_w / px_h if px_h > 0.0 else 1.0
		var kind: String = str(chip["kind"])
		var crush: float = float(chip["crush"])
		var powder := kind == "dust" or crush >= 0.9
		if powder:
			size = maxf(5.0, size * 0.55)
		var raw_color: Variant = chip.get("color")
		var color: Color = ing_tint if raw_color == null else _as_color(raw_color)
		var raw_ing: Variant = chip.get("ingredient_id")
		var chip_ing: String = ing_id if raw_ing == null else str(raw_ing)
		var cu := cos(angle) * rad
		var cv := sin(angle) * rad
		var spin: float
		if powder:
			spin = _rng.range(-20.0, 20.0)
		else:
			spin = _rng.range(-40.0, 40.0)
		var bob := _rng.range(0.0, TAU)
		self.chips.append({
			"id": _seq,
			"ingredient_id": chip_ing,
			"kind": kind,
			"sprite": int(chip["sprite"]),
			"color": color,
			"crush": crush,
			"generation": int(chip["generation"]),
			"nick": float(chip["nick"]),
			"aspect": aspect,
			"size": size,
			"u": cu,
			"v": cv,
			"rot": float(chip["rot"]),
			"spin": spin,
			"depth": 0.0,
			"bloomed": 0.0,
			"bob": bob,
			"powder": powder,
		})
		_seq += 1
		_spawn_bloom(cu, cv, color, 0.55)
	squash_y -= 0.1
	squash_x += 0.06
	_splash(7, 1.0)
	var extra := self.chips.size() - MAX_CHIPS
	if extra > 0:
		for _j in extra:
			self.chips.remove_at(0)


func stir() -> void:
	_spoon_follow = null
	if _spoon_mode == "stir" or _spoon_mode == "enter":
		return
	_spoon_mode = "enter"
	_spoon_t = 0.0
	spoon_angle = -PI / 2.0


func dismiss_spoon() -> void:
	_spoon_follow = null
	if _spoon_mode == "none" or _spoon_mode == "exit":
		return
	_spoon_mode = "exit"
	_spoon_t = 0.0


func set_spoon_follow(angle: Variant) -> void:
	if angle == null:
		_spoon_follow = null
		return
	var next: float = float(angle)
	_spoon_follow = next
	if _spoon_mode == "none":
		_spoon_mode = "enter"
		_spoon_t = 0.0
		spoon_angle = next
	elif _spoon_mode == "exit":
		_spoon_mode = "enter"
		_spoon_t = STIR_ENTER * 0.5


func set_heat_level(level: float) -> void:
	heat = clampf(level, 0.0, 1.0)


func set_ingredient_progress(id: String, progress: float) -> void:
	_progress[id] = clampf(progress, 0.0, 1.0)


func set_done(done: bool) -> void:
	_done = done


func set_burnt(burnt: bool) -> void:
	_burnt = burnt
	if not burnt:
		return
	sparkles.clear()
	_sparkle_timer = 0.0
	if spots.is_empty():
		for _i in 5:
			var a := _rng.range(0.0, TAU)
			var rad := _rng.range(0.15, 0.7)
			spots.append({
				"u": cos(a) * rad,
				"v": sin(a) * rad,
				"r": _rng.range(0.08, 0.18),
			})


func set_pour_tilt(deg: float) -> void:
	_tilt_target = deg


func set_fire_glow(glow: float) -> void:
	fire_glow = clampf(glow, 0.0, 1.0)


func hide_pot() -> void:
	spawn_phase = "hidden"
	spawn_y = 0.0
	spawn_vy = 0.0
	rock = 0.0
	_rock_t = -1.0
	_fill_t = -1.0
	_landings.clear()
	_fill_starts = 0


func respawn(delay: float = 0.0) -> void:
	spawn_phase = "wait" if delay > 0.0 else "fall"
	_spawn_wait = delay
	spawn_y = RESPAWN_START_Y
	spawn_vy = 0.0
	fill = 0.0
	rock = 0.0
	_rock_t = -1.0
	_fill_t = -1.0
	_landings.clear()
	_fill_starts = 0


func take_landing() -> float:
	if _landings.is_empty():
		return 0.0
	var v: float = _landings[0]
	_landings.remove_at(0)
	return v


func take_fill_start() -> bool:
	if _fill_starts == 0:
		return false
	_fill_starts -= 1
	return true


func pot_visible() -> bool:
	return spawn_phase != "hidden" and spawn_phase != "wait"


func pot_settled() -> bool:
	return spawn_phase == "none"


func is_stirring() -> bool:
	return _spoon_mode == "stir"


func spoon_drop() -> float:
	if _spoon_mode == "none":
		return 0.0
	if _spoon_mode == "enter":
		return _ease_out(minf(1.0, _spoon_t / STIR_ENTER))
	if _spoon_mode == "exit":
		return 1.0 - _ease_in(minf(1.0, _spoon_t / STIR_EXIT))
	return 1.0


func sparkle_count() -> int:
	return sparkles.size()


func boil_tier() -> String:
	if heat >= 0.9:
		return "rolling"
	if heat > 0.5:
		return "simmer"
	if heat > 0.05:
		return "warm"
	return "off"


func liquid_color() -> Color:
	return mix_liquid()


func mix_liquid() -> Color:
	var weight := 0.0
	var mixed := Color(0.0, 0.0, 0.0, 1.0)
	for key in _added:
		var ing: Dictionary = _added[key]
		var amount := _dissolved(str(ing["id"])) * float(ing["strength"]) * minf(2.0, float(ing["quantity"]))
		if amount <= 0.0:
			continue
		var tint: Color = ing["tint"]
		mixed.r += tint.r * amount
		mixed.g += tint.g * amount
		mixed.b += tint.b * amount
		weight += amount
	var color := WATER
	if weight > 0.0:
		var avg := Color(mixed.r / weight, mixed.g / weight, mixed.b / weight, 1.0)
		avg = _saturate(avg, 1.35)
		var k := weight / (weight + 0.55)
		color = _lerp_rgb(WATER, avg, k)
	color = _scale_rgb(color, 1.0 - minf(0.18, heat * 0.12))
	if _done and not _burnt:
		color = _tint_white(color, 0.06 + 0.05 * sin(time * 3.0))
	if _burnt:
		color = _burnt_liquid(color)
	return color


func dominant_tint() -> Color:
	var best := WATER
	var best_w := 0.0
	for key in _added:
		var ing: Dictionary = _added[key]
		var w := float(ing["strength"]) * float(ing["quantity"]) * (0.25 + 0.75 * _dissolved(str(ing["id"])))
		if w > best_w:
			best_w = w
			var picked: Color = ing["tint"]
			best = picked
	return best


func squash() -> Vector2:
	var boil := (heat - 0.5) * 2.0 if heat > 0.5 else 0.0
	return Vector2(squash_x, squash_y + 0.012 * sin(time * 18.0) * boil)


func update(dt: float) -> void:
	time += dt
	_update_spoon(dt)
	_update_vortex(dt)
	_update_chips(dt)
	_update_blooms(dt)
	_update_boil(dt)
	_update_steam(dt)
	_update_sparkles(dt)
	_update_slosh(dt)
	_update_squash(dt)
	_update_spawn(dt)
	tilt += (_tilt_target - tilt) * minf(1.0, dt * TILT_EASE)
	if heat > 0.85:
		soot = minf(1.0, soot + dt / 28.0)
	shiver = heat * (0.35 + 0.65 * sin(time * 11.0)) if heat > 0.05 else 0.0
	dome = 0.55 + 0.45 * sin(time * 6.5) if boil_tier() == "rolling" else 0.0


func _dissolved(id: String) -> float:
	var reported: Variant = _progress.get(id)
	var sum := 0.0
	var count := 0
	for i in chips.size():
		var c: Dictionary = chips[i]
		if str(c["ingredient_id"]) == id:
			sum += float(c["depth"])
			count += 1
	if count == 0:
		if reported == null:
			return 0.0
		return float(reported)
	var mean := sum / float(count)
	if reported == null:
		return mean
	return maxf(mean, float(reported) * 0.15)


func _update_spoon(dt: float) -> void:
	spoon_omega = 0.0
	if _spoon_mode == "none":
		return
	_spoon_t += dt
	if _spoon_mode == "enter" and _spoon_t >= STIR_ENTER:
		_spoon_mode = "stir"
		_spoon_t = 0.0
	elif _spoon_mode == "stir":
		if _spoon_follow != null:
			var follow: float = float(_spoon_follow)
			var delta := _wrap(follow - spoon_angle)
			var max_step := STIR_OMEGA * 2.0 * dt
			var step := clampf(delta * minf(1.0, dt * 14.0), -max_step, max_step)
			spoon_angle += step
			spoon_omega = step / dt if dt > 0.0 else 0.0
		else:
			spoon_angle += STIR_OMEGA * dt
			spoon_omega = STIR_OMEGA
	elif _spoon_mode == "exit" and _spoon_t >= STIR_EXIT:
		_spoon_mode = "none"


func _update_vortex(dt: float) -> void:
	if _spoon_mode == "stir":
		var target := clampf(spoon_omega, -6.0, 6.0)
		omega += (target - omega) * minf(1.0, dt * 2.2)
	else:
		omega *= exp(-dt / VORTEX_TAU)
		if absf(omega) < 0.01:
			omega = 0.0
	swirl += omega * dt


func _update_chips(dt: float) -> void:
	var stirring := _spoon_mode == "stir"
	var su := SPOON_R * cos(spoon_angle)
	var sv := SPOON_R * sin(spoon_angle)
	for i in chips.size():
		var c: Dictionary = chips[i]
		var reported: Variant = _progress.get(str(c["ingredient_id"]))
		var target := 0.0 if reported == null else float(reported)
		var depth: float = float(c["depth"])
		if target > depth:
			depth += (target - depth) * minf(1.0, dt * SINK_EASE)
			c["depth"] = depth
		if depth - float(c["bloomed"]) > 0.14:
			var bloom_color: Color = c["color"]
			_spawn_bloom(float(c["u"]), float(c["v"]), bloom_color, 0.4 + depth * 0.4)
			c["bloomed"] = depth
		var u: float = float(c["u"])
		var v: float = float(c["v"])
		var r := _hypot(u, v)
		var ang := atan2(v, u)
		var local := omega * (1.0 - 0.45 * r * r)
		ang += local * dt
		var next_r := r
		if stirring:
			var dist := _hypot(u - su, v - sv)
			if dist < SPOON_REACH:
				var falloff := 1.0 - dist / SPOON_REACH
				ang += spoon_omega * 0.55 * falloff * dt
		if heat > 0.7:
			next_r += _rng.range(-1.0, 1.0) * 0.05 * dt * heat
		next_r = clampf(next_r, 0.18, INSIDE)
		c["u"] = cos(ang) * next_r
		c["v"] = sin(ang) * next_r
		c["rot"] = float(c["rot"]) + float(c["spin"]) * dt * (0.25 + minf(2.0, absf(local)))
		c["bob"] = float(c["bob"]) + dt * (1.4 + heat)


func _spawn_bloom(u: float, v: float, color: Color, radius: float) -> void:
	if blooms.size() >= MAX_BLOOMS:
		blooms.pop_front()
	blooms.append({
		"u": u,
		"v": v,
		"age": 0.0,
		"life": _rng.range(1.4, 2.4),
		"radius": radius,
		"grow": _rng.range(0.35, 0.7),
		"color": color,
	})


func _update_blooms(dt: float) -> void:
	for i in blooms.size():
		var b: Dictionary = blooms[i]
		b["age"] = float(b["age"]) + dt
		var u: float = float(b["u"])
		var v: float = float(b["v"])
		var r := _hypot(u, v)
		var ang := atan2(v, u)
		ang += omega * (1.0 - 0.4 * r * r) * 0.65 * dt
		var next := minf(INSIDE, r)
		b["u"] = cos(ang) * next
		b["v"] = sin(ang) * next
		b["radius"] = minf(1.3, float(b["radius"]) + float(b["grow"]) * dt)
	var kept: Array[Dictionary] = []
	for i in blooms.size():
		var b: Dictionary = blooms[i]
		if float(b["age"]) < float(b["life"]):
			kept.append(b)
	blooms = kept


func _update_boil(dt: float) -> void:
	var tier := boil_tier()
	if tier == "simmer" or tier == "rolling":
		var rate := 16.0 if tier == "rolling" else 8.0
		_bubble_timer += dt * heat * heat * rate
		while _bubble_timer >= 1.0 and bubbles.size() < MAX_BUBBLES:
			_bubble_timer -= 1.0
			var rim := tier == "simmer" or _rng.chance(0.45)
			var rad: float
			if rim:
				rad = _rng.range(0.62, 0.88)
			else:
				rad = _rng.range(0.05, 0.4)
			var a := _rng.range(0.0, TAU)
			var big := 1.25 if tier == "rolling" else 1.0
			var dur: float
			if rim:
				dur = _rng.range(0.5, 0.9)
			else:
				dur = _rng.range(0.7, 1.3)
			var size_mul: float
			if rim:
				size_mul = _rng.range(0.55, 1.0)
			else:
				size_mul = _rng.range(0.9, 1.6)
			bubbles.append({
				"u": cos(a) * rad,
				"v": sin(a) * rad,
				"age": 0.0,
				"dur": dur,
				"rim": rim,
				"size": size_mul * big,
				"wob": _rng.range(0.0, TAU),
			})
		if tier == "rolling" and _rng.chance(dt * 2.5):
			_splash(1, 0.65)
	else:
		_bubble_timer = 0.0
	for i in bubbles.size():
		var b: Dictionary = bubbles[i]
		b["age"] = float(b["age"]) + dt
		if omega != 0.0:
			var u: float = float(b["u"])
			var v: float = float(b["v"])
			var r := _hypot(u, v)
			var ang := atan2(v, u) + omega * (1.0 - 0.4 * r * r) * 0.5 * dt
			b["u"] = cos(ang) * r
			b["v"] = sin(ang) * r
	var kept: Array[Dictionary] = []
	for i in bubbles.size():
		var b: Dictionary = bubbles[i]
		if float(b["age"]) < float(b["dur"]):
			kept.append(b)
	bubbles = kept
	_step_drops(dt)


func _pick_landing(spread: float) -> Dictionary:
	if _rng.chance(0.22):
		var sy := _rng.range(SPLASH_FRONT_TOP, SPLASH_FRONT_BOTTOM)
		var x := _rng.range(-SPLASH_FOOT * 0.85, SPLASH_FOOT * 0.85)
		return {"x": x, "z": (sy - SPLASH_DROP) / SPLASH_DEPTH}
	var side := -1.0 if _rng.chance(0.5) else 1.0
	var reach := SPLASH_REACH_LEFT if side < 0.0 else SPLASH_REACH_RIGHT
	var far := minf(1.0, _rng.range(0.04, 1.0) * (0.55 + 0.6 * spread))
	var zx := side * (SPLASH_FOOT + maxf(0.04, reach - SPLASH_FOOT) * far)
	var zz := _rng.range(SPLASH_SIDE_BACK, SPLASH_SIDE_FRONT)
	return {"x": zx, "z": zz}


func _push_drop(d: Dictionary) -> void:
	if drops.size() >= MAX_DROPS:
		var idx := -1
		for i in drops.size():
			if str(drops[i]["phase"]) == "dry":
				idx = i
				break
		drops.remove_at(0 if idx < 0 else idx)
	drops.append(d)


func _splash(count: int, spread: float) -> void:
	for _i in count:
		var land: Dictionary = _pick_landing(spread)
		var land_x: float = float(land["x"])
		var land_z: float = float(land["z"])
		var toward := atan2(land_z, land_x)
		var start_r := _rng.range(0.3, 0.8)
		var start_a := toward + _rng.range(-0.6, 0.6)
		var x0 := cos(start_a) * start_r
		var z0 := sin(start_a) * start_r
		var flight := _rng.range(0.55, 0.85)
		var life_max := _rng.range(1.3, 2.4)
		var radius := _rng.range(2.6, 5.2) * (0.8 + 0.3 * spread)
		var splat := _rng.range(1.8, 2.6)
		var rot := _rng.range(-0.5, 0.5)
		_push_drop({
			"x": x0,
			"y": SPLASH_DROP,
			"z": z0,
			"vx": (land_x - x0) / flight,
			"vz": (land_z - z0) / flight,
			"vy": (DROP_GRAVITY * flight) / 2.0 - SPLASH_DROP / flight,
			"life": 0.0,
			"max": life_max,
			"phase": "fly",
			"dry": 0.0,
			"r": radius,
			"child": false,
			"splat": splat,
			"rot": rot,
			"hit": 0.0,
			"tx": land_x,
			"tz": land_z,
		})


func _spatter(parent: Dictionary) -> void:
	var n := int(floor(_rng.range(1.0, 4.0)))
	var px: float = float(parent["x"])
	var pz: float = float(parent["z"])
	var pr: float = float(parent["r"])
	var away := atan2(pz, px)
	for _i in n:
		var a := away + _rng.range(-0.9, 0.9)
		var dist := _rng.range(0.05, 0.16)
		var flight := _rng.range(0.16, 0.28)
		var tx := px + cos(a) * dist
		var tz := pz + sin(a) * dist * 0.6
		var life_max := _rng.range(0.7, 1.2)
		var radius := pr * _rng.range(0.3, 0.45)
		var splat := _rng.range(1.2, 1.6)
		var rot := _rng.range(-0.5, 0.5)
		_push_drop({
			"x": px,
			"y": 0.0,
			"z": pz,
			"vx": (tx - px) / flight,
			"vz": (tz - pz) / flight,
			"vy": (DROP_GRAVITY * flight) / 2.0,
			"life": 0.0,
			"max": life_max,
			"phase": "fly",
			"dry": 0.0,
			"r": radius,
			"child": true,
			"splat": splat,
			"rot": rot,
			"hit": 0.0,
			"tx": tx,
			"tz": tz,
		})


func _step_drops(dt: float) -> void:
	var landed: Array[Dictionary] = []
	for i in drops.size():
		var d: Dictionary = drops[i]
		if str(d["phase"]) == "fly":
			d["life"] = float(d["life"]) + dt
			d["vy"] = float(d["vy"]) - DROP_GRAVITY * dt
			d["x"] = float(d["x"]) + float(d["vx"]) * dt
			d["y"] = float(d["y"]) + float(d["vy"]) * dt
			d["z"] = float(d["z"]) + float(d["vz"]) * dt
			if float(d["y"]) <= 0.0 and float(d["vy"]) < 0.0:
				d["y"] = 0.0
				d["x"] = float(d["tx"])
				d["z"] = float(d["tz"])
				d["phase"] = "dry"
				d["vx"] = 0.0
				d["vy"] = 0.0
				d["vz"] = 0.0
				if not bool(d["child"]):
					landed.append(d)
		else:
			d["hit"] = float(d["hit"]) + dt
			d["dry"] = float(d["dry"]) + dt / float(d["max"])
	for i in landed.size():
		var parent: Dictionary = landed[i]
		_spatter(parent)
	var kept: Array[Dictionary] = []
	for i in drops.size():
		var d: Dictionary = drops[i]
		if str(d["phase"]) == "fly" or float(d["dry"]) < 1.0:
			kept.append(d)
	drops = kept


func _update_steam(dt: float) -> void:
	if heat <= 0.02 or _added.is_empty():
		var cooled: Array[Dictionary] = []
		for i in steam.size():
			var s: Dictionary = steam[i]
			s["age"] = float(s["age"]) + dt
			if float(s["age"]) < float(s["dur"]):
				cooled.append(s)
		steam = cooled
		return
	var tint: Color = SMOKE_TINT if _burnt else dominant_tint()
	_steam_timer += dt * heat * (11.0 if _burnt else 6.5)
	while _steam_timer >= 1.0 and steam.size() < MAX_STEAM:
		_steam_timer -= 1.0
		var u := _rng.range(-0.75, 0.75)
		var dur: float
		if _burnt:
			dur = _rng.range(2.2, 3.4)
		else:
			dur = _rng.range(1.5, 2.4)
		var size_hi := 1.6 if _burnt else 1.15
		var size := _rng.range(0.7, size_hi)
		var phase := _rng.range(0.0, TAU)
		steam.append({
			"u": u,
			"rise": 0.0,
			"age": 0.0,
			"dur": dur,
			"size": size,
			"phase": phase,
			"tint": tint,
			"smoke": _burnt,
		})
	var rise_rate := 0.42 if _burnt else 0.55
	for i in steam.size():
		var s: Dictionary = steam[i]
		s["age"] = float(s["age"]) + dt
		s["rise"] = float(s["rise"]) + dt * rise_rate
		s["u"] = float(s["u"]) + sin(time * 2.2 + float(s["phase"])) * dt * 0.15
	var kept: Array[Dictionary] = []
	for i in steam.size():
		var s: Dictionary = steam[i]
		if float(s["age"]) < float(s["dur"]):
			kept.append(s)
	steam = kept


func _update_sparkles(dt: float) -> void:
	if _done and not _burnt:
		_sparkle_timer += dt * 6.0
		while _sparkle_timer >= 1.0:
			_sparkle_timer -= 1.0
			var a := _rng.range(0.0, TAU)
			var r := _rng.range(0.15, 0.85)
			sparkles.append({
				"u": cos(a) * r,
				"v": sin(a) * r * 0.7,
				"age": 0.0,
			})
	for i in sparkles.size():
		var s: Dictionary = sparkles[i]
		s["age"] = float(s["age"]) + dt
	var kept: Array[Dictionary] = []
	for i in sparkles.size():
		var s: Dictionary = sparkles[i]
		if float(s["age"]) < SPARKLE_LIFE:
			kept.append(s)
	sparkles = kept


func _update_slosh(dt: float) -> void:
	var stirring := _spoon_mode == "stir"
	var push := clampf(spoon_omega, -3.0, 3.0) if stirring else 0.0
	var tx := cos(spoon_angle) * push * 0.07
	var ty := sin(spoon_angle) * push * 0.045
	slosh_x += (tx - slosh_x) * minf(1.0, dt * 3.0)
	slosh_y += (ty - slosh_y) * minf(1.0, dt * 3.0)
	if stirring:
		var guided := _spoon_follow != null
		var foam_rate := minf(3.0, absf(spoon_omega) + 0.4) if guided else 0.45
		_foam_timer += dt * foam_rate
		if guided and absf(spoon_omega) > 2.0 and _rng.chance(dt * 2.2):
			_splash(1, 0.8)
		while _foam_timer > 0.22 and foam.size() < 10:
			_foam_timer -= 0.22
			var fu := SPOON_R * cos(spoon_angle) + _rng.range(-0.08, 0.08)
			var fv := SPOON_R * sin(spoon_angle) + _rng.range(-0.06, 0.06)
			foam.append({"u": fu, "v": fv, "age": 0.0, "dur": 0.7})
	for i in foam.size():
		var f: Dictionary = foam[i]
		f["age"] = float(f["age"]) + dt
	var kept: Array[Dictionary] = []
	for i in foam.size():
		var f: Dictionary = foam[i]
		if float(f["age"]) < float(f["dur"]):
			kept.append(f)
	foam = kept
	if _burnt:
		for i in spots.size():
			var s: Dictionary = spots[i]
			var u: float = float(s["u"])
			var v: float = float(s["v"])
			var r := _hypot(u, v)
			var ang := atan2(v, u) + omega * 0.4 * dt
			var next := minf(0.8, maxf(0.08, r))
			s["u"] = cos(ang) * next
			s["v"] = sin(ang) * next


func _update_squash(dt: float) -> void:
	_squash_vx += (-SQUASH_STIFFNESS * (squash_x - 1.0) - SQUASH_DAMPING * _squash_vx) * dt
	_squash_vy += (-SQUASH_STIFFNESS * (squash_y - 1.0) - SQUASH_DAMPING * _squash_vy) * dt
	squash_x += _squash_vx * dt
	squash_y += _squash_vy * dt


func _update_spawn(dt: float) -> void:
	var phase := spawn_phase
	if phase == "none" or phase == "hidden":
		return
	if phase == "wait":
		_spawn_wait -= dt
		if _spawn_wait <= 0.0:
			spawn_phase = "fall"
		return
	if phase == "fall":
		spawn_vy += RESPAWN_GRAVITY * dt
		spawn_y += spawn_vy * dt
		if spawn_y >= 0.0:
			spawn_y = 0.0
			var impact := spawn_vy
			var k := minf(1.0, impact / 2200.0)
			squash_y -= 0.16 * k
			squash_x += 0.1 * k
			_landings.append(impact)
			if _rock_t < 0.0:
				_rock_t = 0.0
			if impact * RESPAWN_RESTITUTION > RESPAWN_MIN_BOUNCE:
				spawn_vy = -impact * RESPAWN_RESTITUTION
			else:
				spawn_vy = 0.0
				spawn_phase = "settle"
				_fill_t = -RESPAWN_FILL_DELAY
		_update_rock(dt)
		return
	_update_rock(dt)
	var before := _fill_t
	_fill_t += dt
	if before < 0.0 and _fill_t >= 0.0:
		_fill_starts += 1
	if _fill_t >= 0.0:
		fill = _ease_out(clampf(_fill_t / RESPAWN_FILL_DUR, 0.0, 1.0))
	if fill >= 1.0 and absf(rock) < 0.05:
		rock = 0.0
		spawn_phase = "none"


func _update_rock(dt: float) -> void:
	if _rock_t < 0.0:
		return
	_rock_t += dt
	rock = RESPAWN_ROCK_DEG * exp(-_rock_t * RESPAWN_ROCK_DAMP) * sin(_rock_t * RESPAWN_ROCK_HZ * TAU)


static func _slice_head(items: Array, count: int) -> Array:
	var end := count
	if end < 0:
		end = items.size() + end
	if end < 0:
		end = 0
	if end > items.size():
		end = items.size()
	var out: Array = []
	for i in end:
		out.append(items[i])
	return out


static func _hypot(x: float, y: float) -> float:
	return sqrt(x * x + y * y)


static func _wrap(delta: float) -> float:
	var d := delta
	while d > PI:
		d -= TAU
	while d < -PI:
		d += TAU
	return d


static func _ease_out(t: float) -> float:
	return 1.0 - (1.0 - t) * (1.0 - t)


static func _ease_in(t: float) -> float:
	return t * t


static func _hex_color(hex: String) -> Color:
	var h := hex.strip_edges()
	if not h.begins_with("#"):
		h = "#" + h
	return Color(h)


static func _as_color(value: Variant) -> Color:
	if value is Color:
		var c: Color = value
		return c
	return _hex_color(str(value))


static func _lerp_rgb(a: Color, b: Color, t: float) -> Color:
	return Color(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t, 1.0)


static func _scale_rgb(c: Color, k: float) -> Color:
	return Color(clampf(c.r * k, 0.0, 1.0), clampf(c.g * k, 0.0, 1.0), clampf(c.b * k, 0.0, 1.0), 1.0)


static func _saturate(c: Color, k: float) -> Color:
	var grey := 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
	return Color(
		clampf(grey + (c.r - grey) * k, 0.0, 1.0),
		clampf(grey + (c.g - grey) * k, 0.0, 1.0),
		clampf(grey + (c.b - grey) * k, 0.0, 1.0),
		1.0
	)


static func _tint_white(c: Color, t: float) -> Color:
	return _lerp_rgb(c, Color(1.0, 1.0, 1.0, 1.0), t)


static func _burnt_liquid(c: Color) -> Color:
	var grey := 0.299 * c.r + 0.587 * c.g + 0.114 * c.b
	var k := 0.55
	var dim := 0.7
	return Color((grey + (c.r - grey) * k) * dim, (grey + (c.g - grey) * k) * dim, (grey + (c.b - grey) * k) * dim, 1.0)
