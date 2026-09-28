class_name DiscardMotion
extends RefCounted
## Web/src/scene/cauldron/discardMotion.ts plus the wall stain in DiscardWallFx.

const SHELF_BOTTOM := 448.0
const WALL_BOTTOM := 600.0
const IMPACT := Vector2(940.0, 534.0)
const IMPACT_SCALE := 0.5
const ARC := -30.0
const TUMBLE_DEG := 165.0
const TUMBLE_EASE := 2.5
const GOBS_LEAVE := 0.05
const GOBS_HIT := 0.32
const POT_HIT := 0.5
const BOUNCE_DUR := 0.12
const FALL_GRAVITY := 2600.0
const FALL_VY := 60.0
const THUD_AT := 1.06
const RESPAWN_AT := 1.15
const SPLAT_HOLD := 3.0
const SPLAT_FADE := 1.2
const END_AT := 4.8
const BLOB_POINTS := 16
const POT_SIZE := Vector2(400.0, 280.0)
const POT_REST := Vector2(847.0, 630.0)
const POT_RADIUS := 168.0
const MOUTH_LOCAL := Vector2(0.9337, -91.5033)


static func pot_pose(t: float) -> Dictionary:
	if t <= 0.0:
		return {"x": POT_REST.x, "y": POT_REST.y, "scale": 1.0, "rot": 0.0, "dark": 0.0, "visible": true}
	if t < POT_HIT:
		var u := t / POT_HIT
		var e := 1.0 - pow(1.0 - u, 1.7)
		return {
			"x": lerpf(POT_REST.x, IMPACT.x, e),
			"y": lerpf(POT_REST.y, IMPACT.y, e) - ARC * sin(PI * u),
			"scale": lerpf(1.0, IMPACT_SCALE, e),
			"rot": deg_to_rad(TUMBLE_DEG) * pow(e, TUMBLE_EASE),
			"dark": 0.0,
			"visible": true,
		}
	var bounce_end := POT_HIT + BOUNCE_DUR
	if t < bounce_end:
		var v := (t - POT_HIT) / BOUNCE_DUR
		return {
			"x": IMPACT.x - 14.0 * v,
			"y": IMPACT.y + 16.0 * v,
			"scale": lerpf(IMPACT_SCALE, IMPACT_SCALE * 1.12, v),
			"rot": deg_to_rad(TUMBLE_DEG + 22.0 * v),
			"dark": 0.0,
			"visible": true,
		}
	var tau := t - bounce_end
	var scale := IMPACT_SCALE * 1.12 + 0.1 * tau
	var y := IMPACT.y + 16.0 + FALL_VY * tau + 0.5 * FALL_GRAVITY * tau * tau
	return {
		"x": IMPACT.x - 14.0 - 40.0 * tau,
		"y": y,
		"scale": scale,
		"rot": deg_to_rad(TUMBLE_DEG + 22.0 + 110.0 * tau),
		"dark": clampf(tau / 0.3, 0.0, 1.0),
		"visible": y - POT_RADIUS * scale < WALL_BOTTOM,
	}


static func mouth_center(pose: Dictionary) -> Vector2:
	var rot := float(pose["rot"])
	var c := cos(rot)
	var s := sin(rot)
	var sc := float(pose["scale"])
	return Vector2(
		float(pose["x"]) + (MOUTH_LOCAL.x * c - MOUTH_LOCAL.y * s) * sc,
		float(pose["y"]) + (MOUTH_LOCAL.x * s + MOUTH_LOCAL.y * c) * sc
	)


static func splat_alpha(t: float) -> float:
	if t < GOBS_HIT:
		return 0.0
	var a := t - GOBS_HIT
	if a < SPLAT_HOLD:
		return 1.0
	return 1.0 - clampf((a - SPLAT_HOLD) / SPLAT_FADE, 0.0, 1.0)


static func splat_dryness(t: float) -> float:
	var a := t - GOBS_HIT
	if a <= 0.0:
		return 0.0
	return clampf(a / (SPLAT_HOLD + SPLAT_FADE), 0.0, 1.0)


static func mouth_liquid(t: float) -> float:
	return 1.0 - clampf((t - GOBS_LEAVE) / 0.16, 0.0, 1.0)


static func build_scene(seed: int) -> Dictionary:
	var rng := KimRng.new(seed * 7919 + 17)
	var gobs: Array = []
	for _i in 16:
		var spread_x := rng.range(-1.0, 1.0)
		var spread_y := rng.range(-1.0, 1.0)
		var leave := GOBS_LEAVE + rng.range(0.0, 0.12)
		var from := mouth_center(pot_pose(leave))
		var fan := rng.range(-1.1, 1.1)
		var radius := rng.range(9.0, 26.0)
		gobs.append({
			"leave": leave,
			"hit": GOBS_HIT + rng.range(-0.03, 0.04),
			"fx": from.x + sin(fan) * 26.0,
			"fy": from.y + (1.0 - cos(fan)) * 10.0,
			"tx": IMPACT.x + spread_x * 120.0 * (0.3 + 0.7 * absf(spread_x)),
			"ty": maxf(SHELF_BOTTOM + radius + 6.0, IMPACT.y - 14.0 + spread_y * 32.0),
			"r": radius,
			"arc": rng.range(4.0, 22.0),
			"sway": rng.range(-38.0, 38.0),
		})
	var cy := IMPACT.y - 14.0
	var blobs: Array = [
		_blob(rng, IMPACT.x, cy, 122.0, 50.0, GOBS_HIT, 0.12),
		_blob(rng, IMPACT.x - 64.0, cy + 14.0, 84.0, 36.0, GOBS_HIT + 0.02, 0.14),
		_blob(rng, IMPACT.x + 70.0, cy - 8.0, 78.0, 34.0, GOBS_HIT + 0.02, 0.14),
	]
	for g in gobs:
		blobs.append(_blob(rng, float(g["tx"]), float(g["ty"]), float(g["r"]) * 2.4, float(g["r"]) * 1.25, float(g["hit"]), 0.18))
	var tendrils: Array = []
	for _j in 9:
		var ang := rng.range(-0.55, 0.55) if rng.chance(0.5) else PI + rng.range(-0.55, 0.55)
		var a := PI / 2.0 + rng.range(-0.9, 0.9) if rng.chance(0.3) else ang
		tendrils.append({
			"x": IMPACT.x + cos(a) * 92.0,
			"y": maxf(SHELF_BOTTOM + 4.0, cy + sin(a) * 38.0),
			"ang": a,
			"len": rng.range(26.0, 78.0),
			"width": rng.range(6.0, 16.0),
			"at": GOBS_HIT + rng.range(0.0, 0.05),
		})
	var drips: Array = []
	for _k in 9:
		var src: Dictionary = rng.pick(blobs)
		var width := rng.range(5.0, 13.0)
		drips.append({
			"x": float(src["x"]) + rng.range(-float(src["rx"]) * 0.6, float(src["rx"]) * 0.6),
			"y0": float(src["y"]) + float(src["ry"]) * 0.5,
			"maxLen": rng.range(40.0, 150.0) * (0.7 + width / 26.0),
			"width": width,
			"delay": rng.range(0.05, 0.7),
			"tau": rng.range(0.6, 1.3) * (14.0 / (width + 4.0)),
			"wobble": rng.range(1.5, 5.0),
			"phase": rng.range(0.0, TAU),
		})
	var spatter: Array = []
	for _n in 34:
		var sa := rng.range(0.0, TAU)
		var sd := rng.range(105.0, 270.0)
		var sy := cy + sin(sa) * sd * 0.42
		if sy < SHELF_BOTTOM + 3.0:
			continue
		spatter.append({
			"x": IMPACT.x + cos(sa) * sd,
			"y": sy,
			"r": rng.range(1.8, 6.0),
			"ang": sa,
			"stretch": rng.range(1.2, 2.6),
			"at": GOBS_HIT + rng.range(0.0, 0.09),
		})
	return {"gobs": gobs, "blobs": blobs, "tendrils": tendrils, "drips": drips, "spatter": spatter}


static func tones_for(col: Color, burnt: bool) -> Dictionary:
	var base := _scale(col, 0.96) if burnt else _saturate(col, 1.22)
	return {
		"base": base,
		"deep": _scale(base, 0.86),
		"light": base.lerp(Color.WHITE, 0.14),
		"glint": base.lerp(Color.WHITE, 0.32),
	}


static func draw_flight(c: CanvasItem, tex: Texture2D, t: float, liquid: Color, scene: Dictionary) -> void:
	if tex == null or t < 0.0:
		return
	var pose := pot_pose(t)
	if bool(pose["visible"]):
		var dark := float(pose["dark"])
		var tint := Color(1, 1, 1).lerp(Color(0.15, 0.12, 0.1), dark)
		var sc := float(pose["scale"])
		c.draw_set_transform(Vector2(float(pose["x"]), float(pose["y"])), float(pose["rot"]), Vector2(sc, sc))
		c.draw_texture_rect(tex, Rect2(-POT_SIZE * 0.5, POT_SIZE), false, tint)
		var liq := mouth_liquid(t)
		if liq > 0.02:
			var fill := Color(liquid.r, liquid.g, liquid.b, 0.9 * liq)
			c.draw_ellipse(MOUTH_LOCAL, 140.0, 31.0, fill)
		c.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	for g in scene.get("gobs", []):
		var at := _gob_position(g, t)
		if at == Vector2.INF:
			continue
		var u := clampf((t - float(g["leave"])) / maxf(0.001, float(g["hit"]) - float(g["leave"])), 0.0, 1.0)
		var rad := float(g["r"]) * lerpf(1.0, 0.72, u)
		c.draw_circle(at, rad, Color(liquid.r, liquid.g, liquid.b, 0.92))
		c.draw_circle(at + Vector2(-rad * 0.2, -rad * 0.25), rad * 0.35, Color(1, 1, 1, 0.28))


static func draw_wall(c: CanvasItem, t: float, scene: Dictionary, tone: Dictionary) -> void:
	var alpha := splat_alpha(t)
	if alpha <= 0.0:
		return
	var dry := splat_dryness(t)
	var shrink := 1.0 - 0.07 * dry
	var base: Color = tone["base"]
	var deep: Color = tone["deep"]
	var glint: Color = tone["glint"]
	var since := t - GOBS_HIT
	for s in scene.get("spatter", []):
		if t < float(s["at"]):
			continue
		var g := _ease_out(clampf((t - float(s["at"])) / 0.1, 0.0, 1.0)) * shrink
		_spatter(c, s, g, Color(base.r, base.g, base.b, alpha * 0.9))
	for td in scene.get("tendrils", []):
		if t < float(td["at"]):
			continue
		var tg := _ease_out(clampf((t - float(td["at"])) / 0.14, 0.0, 1.0)) * shrink
		_tendril(c, td, tg, Color(base.r, base.g, base.b, alpha * 0.92))
	for b in scene.get("blobs", []):
		var bg := _blob_grow(b, t) * shrink
		if bg <= 0.0:
			continue
		var poly := _blob_poly(b, bg)
		if poly.size() >= 3:
			c.draw_colored_polygon(poly, Color(base.r, base.g, base.b, alpha * 0.95))
	for b2 in scene.get("blobs", []):
		if float(b2["rx"]) < 60.0:
			continue
		var bg2 := _blob_grow(b2, t) * shrink
		if bg2 <= 0.0:
			continue
		var cx := float(b2["x"])
		var cy := float(b2["y"]) + float(b2["ry"]) * 0.15
		c.draw_circle(Vector2(cx, cy), float(b2["rx"]) * bg2 * 0.45, Color(deep.r, deep.g, deep.b, alpha * 0.22 * (1.0 - 0.4 * dry)))
	for d in scene.get("drips", []):
		var length := _drip_length(d, since)
		if length <= 0.5:
			continue
		var steps := maxi(2, int(ceil(length / 8.0)))
		for i in steps:
			var s0 := (float(i) / float(steps)) * length
			var s1 := (float(i + 1) / float(steps)) * length
			var p0 := _drip_point(d, s0)
			var p1 := _drip_point(d, s1)
			if p0.y > WALL_BOTTOM and p1.y > WALL_BOTTOM:
				continue
			var taper := 1.0 - 0.55 * (s1 / maxf(length, 1.0))
			var width := maxf(1.2, float(d["width"]) * taper * (1.0 - 0.25 * dry))
			c.draw_line(p0, p1, Color(deep.r, deep.g, deep.b, alpha * 0.9), width)
		var head := _drip_point(d, length)
		if head.y <= WALL_BOTTOM:
			var full := 1.0 - length / maxf(float(d["maxLen"]), 1.0)
			var hr := float(d["width"]) * (0.5 + 0.45 * full) * (1.0 - 0.3 * dry)
			c.draw_ellipse(head + Vector2(0, hr * 0.3), hr, hr * 1.25, Color(deep.r, deep.g, deep.b, alpha * 0.9))
	var wet := 1.0 - dry
	if since >= 0.0 and since < 0.22:
		var p := since / 0.22
		c.draw_arc(IMPACT, 60.0 + p * 150.0, 0.0, TAU, 28, Color(glint.r, glint.g, glint.b, 0.55 * (1.0 - p)), 6.0 * (1.0 - p) + 1.0)
	for b3 in scene.get("blobs", []):
		var bg3 := _blob_grow(b3, t) * (1.0 - 0.07 * (1.0 - wet))
		if bg3 <= 0.0:
			continue
		var ring := _blob_poly(b3, bg3)
		if ring.size() >= 3:
			var closed := ring.duplicate()
			closed.append(ring[0])
			c.draw_polyline(closed, Color(deep.r, deep.g, deep.b, alpha * (0.22 + 0.2 * wet)), 2.4 if float(b3["rx"]) > 60.0 else 1.4, true)
		if float(b3["rx"]) >= 30.0:
			var hx := float(b3["x"]) - float(b3["rx"]) * bg3 * 0.32
			var hy := float(b3["y"]) - float(b3["ry"]) * bg3 * 0.36
			c.draw_circle(Vector2(hx, hy), float(b3["rx"]) * bg3 * 0.28, Color(glint.r, glint.g, glint.b, alpha * 0.2 * wet))


static func _blob(rng: KimRng, x: float, y: float, rx: float, ry: float, at: float, rough: float) -> Dictionary:
	var lobes: Array = []
	for _i in BLOB_POINTS:
		lobes.append(1.0 + rng.range(-rough, rough))
	var bumps := rng.int_range(2, 4)
	for _b in bumps:
		var k := rng.int_range(0, BLOB_POINTS - 1)
		lobes[k] = float(lobes[k]) + rng.range(0.12, 0.3)
		var n := (k + 1) % BLOB_POINTS
		lobes[n] = float(lobes[n]) + rng.range(0.04, 0.12)
	return {
		"x": x, "y": y, "rx": rx, "ry": ry,
		"rot": rng.range(-0.2, 0.2),
		"lobes": lobes, "at": at,
	}


static func _blob_grow(b: Dictionary, t: float) -> float:
	if t < float(b["at"]):
		return 0.0
	var u := clampf((t - float(b["at"])) / 0.16, 0.0, 1.0)
	return 0.5 + 0.5 * _ease_out(u) + 0.08 * sin(minf(1.0, u) * PI)


static func _blob_point(b: Dictionary, i: int, g: float) -> Vector2:
	var k := posmod(i, BLOB_POINTS)
	var a := (float(k) / float(BLOB_POINTS)) * TAU
	var lobes: Array = b["lobes"]
	var m := float(lobes[k]) * g
	var lx := cos(a) * float(b["rx"]) * m
	var ly := sin(a) * float(b["ry"]) * m
	var c := cos(float(b["rot"]))
	var s := sin(float(b["rot"]))
	return Vector2(float(b["x"]) + lx * c - ly * s, float(b["y"]) + lx * s + ly * c)


static func _blob_poly(b: Dictionary, g: float) -> PackedVector2Array:
	var pts := PackedVector2Array()
	var prev := (_blob_point(b, 0, g) + _blob_point(b, 1, g)) * 0.5
	pts.append(prev)
	for i in range(1, BLOB_POINTS + 1):
		var ctrl := _blob_point(b, i, g)
		var nxt := (_blob_point(b, i, g) + _blob_point(b, i + 1, g)) * 0.5
		for s in 3:
			var t := float(s + 1) / 3.0
			var u := 1.0 - t
			pts.append(prev * (u * u) + ctrl * (2.0 * u * t) + nxt * (t * t))
		prev = nxt
	return pts


static func _drip_length(d: Dictionary, a: float) -> float:
	if a < float(d["delay"]):
		return 0.0
	return float(d["maxLen"]) * (1.0 - exp(-(a - float(d["delay"])) / float(d["tau"])))


static func _drip_point(d: Dictionary, s: float) -> Vector2:
	return Vector2(
		float(d["x"]) + sin(s / 22.0 + float(d["phase"])) * float(d["wobble"]) * minf(1.0, s / 30.0),
		float(d["y0"]) + s
	)


static func _gob_position(g: Dictionary, t: float) -> Vector2:
	if t < float(g["leave"]) or t >= float(g["hit"]):
		return Vector2.INF
	var u := (t - float(g["leave"])) / (float(g["hit"]) - float(g["leave"]))
	var dx := float(g["tx"]) - float(g["fx"])
	var dy := float(g["ty"]) - float(g["fy"])
	var length := maxf(1.0, Vector2(dx, dy).length())
	var side := sin(PI * u) * float(g["sway"])
	var y := lerpf(float(g["fy"]), float(g["ty"]), u) + (dx / length) * side - float(g["arc"]) * sin(PI * u)
	y = maxf(y, SHELF_BOTTOM + float(g["r"]) + 6.0)
	return Vector2(lerpf(float(g["fx"]), float(g["tx"]), u) + (-dy / length) * side, y)


static func _spatter(c: CanvasItem, s: Dictionary, g: float, col: Color) -> void:
	var rad := float(s["r"]) * g
	var stretch := float(s["stretch"])
	var ang := float(s["ang"])
	var pts := PackedVector2Array()
	pts.append(_spin(Vector2(-rad, 0.0), ang, Vector2(float(s["x"]), float(s["y"]))))
	pts.append(_spin(Vector2(rad * stretch, 0.0), ang, Vector2(float(s["x"]), float(s["y"]))))
	pts.append(_spin(Vector2(-rad * 0.2, rad * 0.7), ang, Vector2(float(s["x"]), float(s["y"]))))
	c.draw_colored_polygon(pts, col)


static func _tendril(c: CanvasItem, td: Dictionary, g: float, col: Color) -> void:
	var length := float(td["len"]) * g
	var w := float(td["width"])
	var origin := Vector2(float(td["x"]), float(td["y"]))
	var ang := float(td["ang"])
	var a := _spin(Vector2(-4.0, -w * 0.5), ang, origin)
	var tip := _spin(Vector2(length, 0.0), ang, origin)
	var b := _spin(Vector2(-4.0, w * 0.5), ang, origin)
	c.draw_colored_polygon(PackedVector2Array([a, tip, b]), col)
	c.draw_circle(tip, w * 0.32, col)


static func _spin(local: Vector2, ang: float, origin: Vector2) -> Vector2:
	return origin + Vector2(cos(ang) * local.x - sin(ang) * local.y, sin(ang) * local.x + cos(ang) * local.y)


static func _ease_out(t: float) -> float:
	return 1.0 - (1.0 - t) * (1.0 - t)


static func _saturate(col: Color, k: float) -> Color:
	var grey := col.r * 0.2126 + col.g * 0.7152 + col.b * 0.0722
	return Color(lerpf(grey, col.r, k), lerpf(grey, col.g, k), lerpf(grey, col.b, k), 1.0)


static func _scale(col: Color, k: float) -> Color:
	return Color(col.r * k, col.g * k, col.b * k, 1.0)
