class_name BottleGlass
extends RefCounted
## Liquid clipped to the inner profile. The glass texture is a rim, a thin
## body tint, highlights and a label; its interior alpha stays near 0 so the
## liquid drawn behind it remains visible at rest and after the cork.

const STREAM_START := 0.5
const STREAM_END := 1.7
## Shoulder (full) and base (empty), as fractions of the bottle rect height.
const SURFACE_FULL := 0.40
const SURFACE_EMPTY := 0.93
const TEX_W := 96
const TEX_H := 169
## Body sample, clear of the rim, highlight, label and cork.
const SAMPLE_X := 49
const SAMPLE_Y := 104
## (y fraction, half-width fraction) of the inner glass.
const PROFILE: Array[Vector2] = [
	Vector2(0.17, 0.10),
	Vector2(0.26, 0.12),
	Vector2(0.34, 0.14),
	Vector2(0.42, 0.24),
	Vector2(0.52, 0.34),
	Vector2(0.70, 0.33),
	Vector2(0.84, 0.29),
	Vector2(0.93, 0.18),
]


static func fill_level(phase: String, pour_t: float) -> float:
	if phase == "deliver" or phase == "rest":
		return 1.0
	if phase != "stream":
		return 0.0
	return clampf((pour_t - STREAM_START) / (STREAM_END - STREAM_START), 0.0, 1.0)


static func over(glass_px: Color, behind: Color) -> Color:
	var a := clampf(glass_px.a, 0.0, 1.0)
	return Color(
		glass_px.r * a + behind.r * (1.0 - a),
		glass_px.g * a + behind.g * (1.0 - a),
		glass_px.b * a + behind.b * (1.0 - a),
		1.0
	)


static func shade(c: Color, amount: float) -> Color:
	if amount >= 0.0:
		return Color(
			c.r + (1.0 - c.r) * amount,
			c.g + (1.0 - c.g) * amount,
			c.b + (1.0 - c.b) * amount,
			1.0
		)
	var k := 1.0 + amount
	return Color(c.r * k, c.g * k, c.b * k, 1.0)


static func mix_color(entries: Array, color_of: Callable) -> Color:
	var weight := 0.0
	var mixed := Vector3.ZERO
	for e in entries:
		var w := maxf(float(e.get("quantity", 1.0)), 0.001)
		var tint: Color = color_of.call(str(e.get("ingredientId", "")))
		mixed += Vector3(tint.r, tint.g, tint.b) * w
		weight += w
	if weight <= 0.0:
		return Color("3f6f8f")
	mixed /= weight
	return shade(Color(mixed.x, mixed.y, mixed.z, 1.0), -0.18)


static func blend_color(entries: Array, color_of: Callable, level: float) -> Color:
	var full := mix_color(entries, color_of)
	if entries.size() < 2:
		return full
	var first: Color = color_of.call(str(entries[0].get("ingredientId", "")))
	first = shade(first, -0.18)
	var u := clampf(level, 0.0, 1.0)
	u = u * u * (3.0 - 2.0 * u)
	return first.lerp(full, u)


static func half_width(u: float) -> float:
	var y := clampf(u, 0.0, 1.0)
	if y <= PROFILE[0].x:
		return PROFILE[0].y
	var last := PROFILE.size() - 1
	for i in last:
		var a: Vector2 = PROFILE[i]
		var b: Vector2 = PROFILE[i + 1]
		if y <= b.x:
			var span := b.x - a.x
			var t := 0.0 if span <= 0.001 else (y - a.x) / span
			return lerpf(a.y, b.y, t)
	return PROFILE[last].y


static func surface_u(level: float) -> float:
	return lerpf(SURFACE_EMPTY, SURFACE_FULL, clampf(level, 0.0, 1.0))


static func contains(rect: Rect2, p: Vector2) -> bool:
	if not rect.has_point(p):
		return false
	var u := (p.y - rect.position.y) / maxf(rect.size.y, 1.0)
	var nx := absf(p.x - (rect.position.x + rect.size.x * 0.5)) / maxf(rect.size.x, 1.0)
	return nx <= half_width(u) + 0.002


static func liquid_polygon(rect: Rect2, level: float, wave: float) -> PackedVector2Array:
	var pts := PackedVector2Array()
	if level <= 0.001:
		return pts
	var surf := surface_u(level)
	var cx := rect.position.x + rect.size.x * 0.5
	var steps := 12
	for i in steps + 1:
		var t := float(i) / float(steps)
		var wobble := sin(t * TAU * 1.5 + wave) * 0.010 * rect.size.y
		var y := rect.position.y + surf * rect.size.y + wobble
		var hw := half_width(clampf((y - rect.position.y) / rect.size.y, 0.0, 1.0)) * rect.size.x
		pts.append(Vector2(cx - hw + t * hw * 2.0, y))
	var side := [0.55, 0.70, 0.84, 0.93]
	for u in side:
		if float(u) <= surf + 0.01:
			continue
		var hw2 := half_width(float(u)) * rect.size.x
		pts.append(Vector2(cx + hw2, rect.position.y + float(u) * rect.size.y))
	for i in range(side.size() - 1, -1, -1):
		var u2: float = float(side[i])
		if u2 <= surf + 0.01:
			continue
		var hw3 := half_width(u2) * rect.size.x
		pts.append(Vector2(cx - hw3, rect.position.y + u2 * rect.size.y))
	return pts


static func pour_path(rect: Rect2, level: float, wave: float) -> PackedVector2Array:
	var pts := PackedVector2Array()
	var cx := rect.position.x + rect.size.x * 0.5
	var top := 0.18
	var bot := surface_u(level)
	if bot < top + 0.02:
		return pts
	for i in 14:
		var t := float(i) / 13.0
		var u := lerpf(top, bot, t)
		var hw := half_width(u) * rect.size.x
		var sway := sin(t * PI * 2.0 + wave * 1.7) * minf(hw * 0.18, rect.size.x * 0.03)
		pts.append(Vector2(cx + sway, rect.position.y + u * rect.size.y))
	return pts


static func bubble_at(rect: Rect2, level: float, i: int, time: float) -> Vector3:
	## x, y, radius. y < 0 means the bubble is not visible.
	if level < 0.04:
		return Vector3(-1, -1, 0)
	var cycle := fposmod(time * 0.55 + float(i) * 0.37, 1.0)
	var surf := surface_u(level)
	var base := lerpf(SURFACE_EMPTY - 0.02, surf + 0.03, cycle)
	if base < surf - 0.005:
		return Vector3(-1, -1, 0)
	var y := rect.position.y + base * rect.size.y
	var hw := half_width(base) * rect.size.x * 0.72
	var x := rect.position.x + rect.size.x * 0.5 + sin(float(i) * 2.4 + time) * hw
	var rad := lerpf(1.4, 3.2, fposmod(float(i) * 0.37, 1.0))
	return Vector3(x, y, rad)


static func draw(c: CanvasItem, rect: Rect2, phase: String, pour_t: float, entries: Array, color_of: Callable, time: float) -> void:
	var resting := phase == "rest"
	if phase != "tilt" and phase != "stream" and phase != "deliver" and not resting:
		return
	var level := fill_level(phase, pour_t)
	var wave := 0.0 if resting else time * 5.5
	var body := blend_color(entries, color_of, level)
	var incoming := blend_color(entries, color_of, clampf(level + 0.15, 0.0, 1.0))
	var poly := liquid_polygon(rect, level, wave)
	if poly.size() >= 3:
		var deep := shade(body, -0.28)
		var light := shade(body, 0.22)
		var cols := PackedColorArray()
		cols.resize(poly.size())
		for i in poly.size():
			var t := clampf((poly[i].y - rect.position.y) / rect.size.y, 0.0, 1.0)
			cols[i] = light.lerp(deep, t)
		c.draw_polygon(poly, cols)
		var edge := PackedVector2Array()
		for i in mini(13, poly.size()):
			edge.append(poly[i])
		if edge.size() >= 2:
			c.draw_polyline(edge, Color(1, 1, 1, 0.55), 1.6, true)
	if level > 0.04 and phase != "tilt" and not resting:
		for i in 5:
			var b := bubble_at(rect, level, i, time)
			if b.z < 0.5 or b.y < 0.0:
				continue
			if not contains(rect, Vector2(b.x, b.y)):
				continue
			c.draw_circle(Vector2(b.x, b.y), b.z, Color(1, 1, 1, 0.28))
			c.draw_arc(Vector2(b.x, b.y), b.z, 0.4, 4.2, 8, Color(1, 1, 1, 0.7), 1.0, true)
	# Highlight stays on the body, inside the inner profile. No shader.
	var gloss := PackedVector2Array([
		rect.position + Vector2(rect.size.x * 0.40, rect.size.y * 0.48),
		rect.position + Vector2(rect.size.x * 0.48, rect.size.y * 0.46),
		rect.position + Vector2(rect.size.x * 0.46, rect.size.y * 0.78),
		rect.position + Vector2(rect.size.x * 0.38, rect.size.y * 0.80),
	])
	var gloss_ok := true
	for g in gloss:
		if not contains(rect, g):
			gloss_ok = false
			break
	if gloss_ok and level > 0.08:
		c.draw_colored_polygon(gloss, Color(1, 1, 1, 0.16))
	if phase == "stream" or (phase == "tilt" and pour_t > 0.35):
		var path := pour_path(rect, maxf(level, 0.02), wave)
		if path.size() >= 2:
			var ribbon := shade(incoming, 0.12)
			ribbon.a = 0.92
			c.draw_polyline(path, ribbon, maxf(3.0, rect.size.x * 0.045), true)
			c.draw_polyline(path, Color(1, 1, 1, 0.45), 1.4, true)


static func bake_image(corked: bool) -> Image:
	var img := Image.create(TEX_W, TEX_H, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	for y in TEX_H:
		for x in TEX_W:
			var u := (float(x) + 0.5) / float(TEX_W)
			var v := (float(y) + 0.5) / float(TEX_H)
			var px := _glass_pixel(u, v, corked)
			if px.a > 0.001:
				img.set_pixel(x, y, px)
	return img


static func _glass_pixel(u: float, v: float, corked: bool) -> Color:
	var nx := absf(u - 0.5)
	var hw := half_width(v) + 0.012
	if nx > hw:
		return Color(0, 0, 0, 0)
	var inset := (hw - nx) * float(TEX_W)
	if corked and v > 0.035 and v < 0.20 and nx <= half_width(v) * 0.86:
		var cork := Color(0.55, 0.34, 0.16, 1.0)
		if v < 0.07:
			cork = Color(0.72, 0.50, 0.26, 1.0)
		elif absf(v - 0.11) < 0.012:
			cork = Color(0.40, 0.24, 0.11, 1.0)
		return cork
	if inset < 3.2:
		var t := clampf(inset / 3.2, 0.0, 1.0)
		var lip := Color(0.96, 0.99, 1.0).lerp(Color(0.55, 0.78, 0.84), t)
		lip.a = lerpf(0.35, 0.96, t)
		if inset < 0.8:
			lip.a *= inset / 0.8
		return lip
	if inset < 5.0:
		var wall := Color(0.70, 0.86, 0.90, lerpf(0.42, 0.12, (inset - 3.2) / 1.8))
		return wall
	# Open mouth stays clear. The body is a thin cool tint, not a filled glass.
	var body_a := 0.0 if v < 0.30 else 0.06
	var col := Color(0.75, 0.90, 0.93, body_a)
	if u < 0.46 and v > 0.40 and v < 0.84:
		var band := exp(-pow((u - 0.36) / 0.018, 2.0))
		var ha := band * 0.62
		if ha > col.a:
			col = Color(0.96, 0.99, 1.0, ha)
	if u > 0.66 and u < 0.74 and v > 0.46 and v < 0.70:
		var ref := exp(-pow((u - 0.70) / 0.012, 2.0)) * 0.28
		if ref > col.a:
			col = Color(0.88, 0.95, 0.97, ref)
	if u > 0.57 and u < 0.78 and v > 0.73 and v < 0.88 and nx < half_width(v) - 0.02:
		var paper := Color(0.90, 0.82, 0.64, 0.94)
		if absf(v - 0.78) < 0.008 or absf(v - 0.83) < 0.006:
			paper = Color(0.45, 0.28, 0.14, 0.9)
		return paper
	return col
