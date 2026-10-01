class_name BottleGlass
extends RefCounted

const Poly = preload("res://scripts/fx/poly_draw.gd")
## Liquid clipped to the inner profile. The glass texture is a rim, a thin
## body tint, highlights and a label; its interior alpha stays near 0 so the
## liquid drawn behind it remains visible at rest and after the cork.

const STREAM_START := 0.5
const STREAM_END := 1.7
## Shoulder (full) and base (empty), as fractions of the bottle rect height.
const SURFACE_FULL := 0.43
const SURFACE_EMPTY := 0.77
## Round inner bottom. The profile falls away below this, outside the glass.
const LIQUID_BOTTOM := 0.785
const TEX_W := 512
const TEX_H := 896
## Upper belly, above the parchment label and clear of the shoulder highlight.
const SAMPLE_X := 256
const SAMPLE_Y := 421
## Inner bore of the round flask. (y fraction, half-width fraction). No feet.
const PROFILE: Array[Vector2] = [
	Vector2(0.200, 0.056),
	Vector2(0.210, 0.059),
	Vector2(0.220, 0.061),
	Vector2(0.230, 0.063),
	Vector2(0.240, 0.064),
	Vector2(0.250, 0.068),
	Vector2(0.260, 0.076),
	Vector2(0.270, 0.088),
	Vector2(0.280, 0.099),
	Vector2(0.290, 0.107),
	Vector2(0.300, 0.111),
	Vector2(0.310, 0.116),
	Vector2(0.320, 0.129),
	Vector2(0.330, 0.143),
	Vector2(0.340, 0.151),
	Vector2(0.350, 0.151),
	Vector2(0.360, 0.154),
	Vector2(0.370, 0.161),
	Vector2(0.380, 0.175),
	Vector2(0.390, 0.193),
	Vector2(0.400, 0.215),
	Vector2(0.410, 0.238),
	Vector2(0.420, 0.262),
	Vector2(0.430, 0.284),
	Vector2(0.440, 0.304),
	Vector2(0.450, 0.318),
	Vector2(0.460, 0.326),
	Vector2(0.470, 0.333),
	Vector2(0.480, 0.338),
	Vector2(0.490, 0.344),
	Vector2(0.500, 0.349),
	Vector2(0.510, 0.353),
	Vector2(0.520, 0.358),
	Vector2(0.530, 0.362),
	Vector2(0.540, 0.365),
	Vector2(0.550, 0.368),
	Vector2(0.560, 0.370),
	Vector2(0.570, 0.371),
	Vector2(0.580, 0.372),
	Vector2(0.590, 0.372),
	Vector2(0.600, 0.371),
	Vector2(0.610, 0.370),
	Vector2(0.620, 0.368),
	Vector2(0.630, 0.365),
	Vector2(0.640, 0.362),
	Vector2(0.650, 0.358),
	Vector2(0.660, 0.353),
	Vector2(0.670, 0.348),
	Vector2(0.680, 0.341),
	Vector2(0.690, 0.334),
	Vector2(0.700, 0.326),
	Vector2(0.710, 0.317),
	Vector2(0.720, 0.307),
	Vector2(0.730, 0.296),
	Vector2(0.740, 0.284),
	Vector2(0.750, 0.271),
	Vector2(0.760, 0.256),
	Vector2(0.770, 0.240),
	Vector2(0.780, 0.222),
	Vector2(0.790, 0.201),
	Vector2(0.800, 0.178),
	Vector2(0.820, 0.000),
	Vector2(0.960, 0.000),
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


static func _saturate(c: Color, amount: float) -> Color:
	var l := 0.299 * c.r + 0.587 * c.g + 0.114 * c.b
	var k := 1.0 + amount
	return Color(
		clampf(l + (c.r - l) * k, 0.0, 1.0),
		clampf(l + (c.g - l) * k, 0.0, 1.0),
		clampf(l + (c.b - l) * k, 0.0, 1.0),
		c.a
	)


static func _liquor_band(body: Color, light: Color, deep: Color, depth: float) -> Color:
	## Plateau around depth 0.2 is the snapshot. Lift is only the surface;
	## the darkening is already strong by the top of the label.
	var lift := clampf(1.0 - depth / 0.11, 0.0, 1.0)
	lift *= lift
	var sink := clampf((depth - 0.36) / 0.24, 0.0, 1.0)
	var col := body.lerp(light, lift)
	col = col.lerp(deep, sink)
	if depth < 0.14 or depth > 0.40:
		var grit := sin(depth * 47.0) * 0.035
		var grit_col := deep
		if grit > 0.0:
			grit_col = light
		col = col.lerp(grit_col, absf(grit))
	col.a = lerpf(0.90, 0.96, sink)
	return col


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
	var steps := 16
	for i in steps + 1:
		var t := float(i) / float(steps)
		# The front of the surface sits a little lower, so the fill reads as a curve.
		var bow := sin(t * PI) * 0.012 * rect.size.y
		var wobble := sin(t * TAU + wave) * 0.004 * rect.size.y
		var y := rect.position.y + surf * rect.size.y + bow * 0.35 + wobble
		var hw := half_width(clampf((y - rect.position.y) / rect.size.y, 0.0, 1.0)) * rect.size.x * 0.90
		pts.append(Vector2(cx - hw + t * hw * 2.0, y))
	var side_n := 12
	for i in side_n:
		var t2 := float(i + 1) / float(side_n)
		var u := lerpf(surf + 0.01, LIQUID_BOTTOM, t2)
		var hw2 := half_width(u) * rect.size.x * 0.90
		pts.append(Vector2(cx + hw2, rect.position.y + u * rect.size.y))
	for i in side_n:
		var t3 := float(side_n - 1 - i) / float(side_n)
		var u2 := lerpf(surf + 0.01, LIQUID_BOTTOM, t3)
		if u2 <= surf:
			continue
		var hw3 := half_width(u2) * rect.size.x * 0.90
		pts.append(Vector2(cx - hw3, rect.position.y + u2 * rect.size.y))
	return pts


static func _ellipse(center: Vector2, rx: float, ry: float, n: int) -> PackedVector2Array:
	var pts := PackedVector2Array()
	if rx < 0.5 or ry < 0.4 or n < 3:
		return pts
	for i in n:
		var a := float(i) / float(n) * TAU
		pts.append(center + Vector2(cos(a) * rx, sin(a) * ry))
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


static func draw(c: CanvasItem, rect: Rect2, phase: String, pour_t: float, entries: Array, color_of: Callable, time: float, ink_override = null, level_override = null) -> void:
	var resting := phase == "rest"
	if phase != "tilt" and phase != "stream" and phase != "deliver" and not resting:
		return
	var level := fill_level(phase, pour_t)
	if level_override != null:
		level = float(level_override)
	var wave := 0.0 if resting else time * 5.5
	var body := blend_color(entries, color_of, level)
	if ink_override != null:
		body = ink_override as Color
	var incoming := blend_color(entries, color_of, clampf(level + 0.15, 0.0, 1.0))
	var poly := liquid_polygon(rect, level, wave)
	var surf := surface_u(level)
	var cx := rect.position.x + rect.size.x * 0.5
	if poly.size() >= 3:
		# Stacked bands, not one smooth polygon. The mid-belly band stays on
		# the snapshot. Above it the paint is lighter; below it, down to the
		# label, the paint is clearly darker. More bands, plus a small per-segment
		# wobble, so the horizontal steps do not read as stripes.
		var deep := shade(body, -0.38)
		var light := _saturate(shade(body, 0.18), 0.28)
		var n_bands := 18
		for i in n_bands:
			var d0 := float(i) / float(n_bands)
			var d1 := float(i + 1) / float(n_bands)
			var depth := (d0 + d1) * 0.5
			var nse := sin(float(i) * 6.5) * 0.010
			if depth > 0.16 and depth < 0.30:
				nse *= 0.25
			depth = clampf(depth + nse, 0.0, 1.0)
			var u0 := lerpf(surf, LIQUID_BOTTOM, d0)
			var u1 := lerpf(surf, LIQUID_BOTTOM, d1)
			var col := _liquor_band(body, light, deep, depth)
			var y0 := rect.position.y + u0 * rect.size.y + sin(u0 * 22.0 + wave) * 1.3
			var y1 := rect.position.y + u1 * rect.size.y + sin(u1 * 22.0 + wave + 0.6) * 1.3 + 1.6
			for s in 3:
				var a0 := -1.0 + float(s) * (2.0 / 3.0)
				var a1 := a0 + 2.0 / 3.0
				var edge := 0.0
				if s != 1:
					edge = 0.12
				var wob := 0.0
				if s != 1 or depth < 0.16 or depth > 0.32:
					wob = sin(float(i) * 4.1 + float(s) * 2.7) * 0.030
				var bc := col.lerp(deep, edge)
				if wob >= 0.0:
					bc = bc.lerp(light, wob)
				else:
					bc = bc.lerp(deep, -wob)
				var hw0 := half_width(clampf(u0, 0.0, 1.0)) * rect.size.x * 0.90
				var hw1 := half_width(clampf(u1, 0.0, 1.0)) * rect.size.x * 0.90
				var band := PackedVector2Array()
				band.append(Vector2(cx + a0 * hw0, y0))
				band.append(Vector2(cx + a1 * hw0, y0 + sin(float(s) + float(i)) * 0.6))
				band.append(Vector2(cx + a1 * hw1, y1))
				band.append(Vector2(cx + a0 * hw1, y1))
				Poly.draw_colored(c, band, bc)
		for b in 6:
			var bd := 0.02 + float(b) * 0.03
			var use_light := true
			if b >= 3:
				bd = 0.52 + float(b - 3) * 0.12
				use_light = false
			var bu := lerpf(surf, LIQUID_BOTTOM, bd)
			var bhw := half_width(bu) * rect.size.x * (0.42 + 0.08 * sin(float(b) * 1.7))
			var by := rect.position.y + bu * rect.size.y
			var bx := cx + sin(float(b) * 2.1) * rect.size.x * 0.06
			var brush := _ellipse(Vector2(bx, by), bhw, maxf(1.6, rect.size.y * 0.018), 10)
			var paint := light
			if not use_light:
				paint = deep
			paint.a = 0.12
			Poly.draw_colored(c, brush, paint)
		var men := PackedVector2Array()
		var men_n := 12
		for i in men_n + 1:
			var t := float(i) / float(men_n)
			var hw := half_width(surf) * rect.size.x * 0.86
			var y := rect.position.y + surf * rect.size.y + sin(t * PI) * rect.size.y * 0.010 + sin(t * TAU * 2.0 + wave) * 0.7
			men.append(Vector2(cx - hw + t * hw * 2.0, y))
		for i in men_n + 1:
			var t2 := float(men_n - i) / float(men_n)
			var hw2 := half_width(surf) * rect.size.x * 0.78
			var y2 := rect.position.y + (surf + 0.028) * rect.size.y + sin(t2 * PI) * rect.size.y * 0.006
			men.append(Vector2(cx - hw2 + t2 * hw2 * 2.0, y2))
		var men_col := _saturate(shade(body, 0.22), 0.12)
		men_col.a = 0.48
		Poly.draw_colored(c, men, men_col)
		var rim_l := PackedVector2Array()
		var rim_r := PackedVector2Array()
		for i in 8:
			var rt := float(i) / 7.0
			var ru := lerpf(surf + 0.015, minf(surf + 0.20, LIQUID_BOTTOM - 0.02), rt)
			var rhw := half_width(ru) * rect.size.x * 0.86
			var ry := rect.position.y + ru * rect.size.y
			rim_l.append(Vector2(cx - rhw, ry))
			rim_r.append(Vector2(cx + rhw, ry))
		var rim_col := _saturate(shade(body, 0.20), 0.06)
		rim_col.a = 0.28
		if rim_l.size() >= 2:
			c.draw_polyline(rim_l, rim_col, 1.25, true)
			c.draw_polyline(rim_r, rim_col, 1.25, true)
		var cau_d := 0.46
		var cau_u := lerpf(surf, LIQUID_BOTTOM, cau_d)
		var cau := _ellipse(
			Vector2(cx - rect.size.x * 0.04, rect.position.y + cau_u * rect.size.y),
			half_width(cau_u) * rect.size.x * 0.36,
			maxf(2.4, rect.size.y * 0.032),
			12
		)
		var cau_col := shade(body, 0.10)
		cau_col.a = 0.13
		Poly.draw_colored(c, cau, cau_col)
		for i in 6:
			var sd := 0.08 + float(i) * 0.13
			var su := lerpf(surf, LIQUID_BOTTOM, sd)
			var sx := cx + sin(float(i) * 2.3 + 0.4) * half_width(su) * rect.size.x * 0.42
			var sy := rect.position.y + su * rect.size.y
			if not contains(rect, Vector2(sx, sy)):
				continue
			var sr := 0.45 + float(i % 3) * 0.28
			c.draw_circle(Vector2(sx, sy), sr, Color(1, 1, 1, 0.20))
	if level > 0.08:
		for i in 3:
			var b := bubble_at(rect, level, i, 0.0 if resting else time)
			if b.z < 0.5 or b.y < 0.0:
				continue
			if not contains(rect, Vector2(b.x, b.y)):
				continue
			var rad := b.z * rect.size.y / 220.0
			c.draw_circle(Vector2(b.x, b.y), rad, Color(1, 1, 1, 0.22))
			c.draw_circle(Vector2(b.x - rad * 0.25, b.y - rad * 0.25), maxf(0.6, rad * 0.28), Color(1, 1, 1, 0.55))
	if phase == "stream" or (phase == "tilt" and pour_t > 0.35):
		var path := pour_path(rect, maxf(level, 0.02), wave)
		if path.size() >= 2:
			var ribbon := shade(incoming, 0.04)
			ribbon.a = 0.94
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
	var hw := half_width(v) + 0.016
	if nx > hw:
		return Color(0, 0, 0, 0)
	var inset := (hw - nx) * float(TEX_W)
	if corked and v > 0.028 and v < 0.205 and nx <= half_width(v) * 0.92:
		return _cork_pixel(u, v)
	# Brass lip, the same weight as the mortar rim. The open mouth stays clear.
	if inset < 6.4:
		return _brass_rim(u, inset, 6.4)
	if v > 0.205 and v < 0.255 and inset < 16.0:
		return _copper(u, v, inset)
	if inset < 9.2:
		var wall_t := clampf((inset - 6.4) / 2.8, 0.0, 1.0)
		var wall := Color(0.55, 0.38, 0.16, lerpf(0.55, 0.14, wall_t))
		return wall
	if u > 0.56 and u < 0.80 and v > 0.72 and v < 0.88 and nx < half_width(v) - 0.03:
		return _label_pixel(u, v)
	var body_a := 0.0
	if v >= 0.34:
		body_a = 0.05
	var col := Color(0.93, 0.84, 0.62, body_a)
	if u < 0.46 and v > 0.38 and v < 0.86:
		var band := exp(-pow((u - 0.34) / 0.02, 2.0))
		var ha := band * 0.72
		if ha > col.a:
			col = Color(0.98, 0.94, 0.82, ha)
	if u > 0.78 and v > 0.40 and v < 0.90:
		var shade := exp(-pow((u - 0.86) / 0.04, 2.0)) * 0.22
		if shade > col.a:
			col = Color(0.42, 0.26, 0.10, shade)
	return col


static func _cork_pixel(u: float, v: float) -> Color:
	var grain := sin(v * 150.0) * 0.045 + sin(u * 40.0 + v * 18.0) * 0.03
	var cork := Color(0.62 + grain, 0.40 + grain * 0.6, 0.18, 1.0)
	if v < 0.055:
		cork = Color(0.78, 0.55, 0.28, 1.0)
	elif absf(v - 0.09) < 0.012 or absf(v - 0.15) < 0.010:
		cork = Color(0.36, 0.20, 0.09, 1.0)
	if u < 0.46:
		cork.r = minf(1.0, cork.r + 0.06)
		cork.g = minf(1.0, cork.g + 0.04)
	return cork


static func _brass_rim(u: float, inset: float, lip: float) -> Color:
	var t := clampf(inset / lip, 0.0, 1.0)
	var dark := Color(0.38, 0.22, 0.08, 1.0)
	var mid := Color(0.72, 0.52, 0.18, 1.0)
	var hi := Color(0.95, 0.84, 0.48, 1.0)
	var col := dark.lerp(mid, smoothstep(0.0, 0.45, t)).lerp(hi, smoothstep(0.55, 1.0, t))
	if u < 0.42:
		col = col.lerp(hi, 0.35)
	elif u > 0.70:
		col = col.lerp(dark, 0.25)
	col.a = lerpf(0.72, 1.0, t)
	if inset < 1.1:
		col.a *= inset / 1.1
	return col


static func _copper(u: float, v: float, inset: float) -> Color:
	var hi := Color(0.86, 0.48, 0.22, 1.0)
	var mid := Color(0.62, 0.28, 0.12, 1.0)
	var col := mid.lerp(hi, clampf(1.0 - absf(v - 0.228) / 0.03, 0.0, 1.0))
	if u < 0.42:
		col = col.lerp(Color(0.95, 0.62, 0.32, 1.0), 0.4)
	col.a = lerpf(0.85, 1.0, clampf(inset / 8.0, 0.0, 1.0))
	return col


static func _label_pixel(u: float, v: float) -> Color:
	var paper := Color(0.93, 0.84, 0.64, 0.96)
	var edge := v < 0.735 or v > 0.865 or u < 0.575 or u > 0.785
	if edge:
		return Color(0.45, 0.28, 0.12, 0.95)
	var line := absf(v - 0.78) < 0.006 or absf(v - 0.82) < 0.005
	if line and u > 0.60 and u < 0.76:
		return Color(0.42, 0.24, 0.12, 0.9)
	if u > 0.60 and u < 0.66 and v > 0.74 and v < 0.80:
		return Color(0.56, 0.12, 0.10, 0.95)
	return paper
