class_name ClassicSpoon
extends RefCounted
## Goat-head spoon from Web/src/scene/classicSpoon.ts (design space 256, bowl at (128, 210)).
##
## draw() is in the CanvasItem's local space. Pass the cauldron mouth center and its
## pixel radii (the stage control is 1920×1080; mouth is not assumed to be the origin).
## Placement matches ClassicBrewPainter.drawSpoon:
##   scale   = rx * 2.15 / 256
##   bx      = mouth.x + cos(spoon_angle) * rx * 0.55
##   by      = mouth.y + sin(spoon_angle) * ry * 0.35 + bowl_ry * 0.1 * dip - (1 - dip) * ry * 8
##   bowl_ry = rx * 2.15 * 38/256
##   tilt    = -cos(spoon_angle) * 16 degrees
##   dip     = spoon_drop(); if stirring and dip ~= 0, dip = 1 so the spoon stays in the pot
## The bowl anchor (128, 210) is placed at (bx, by). Visible region matches the web clip:
## the wide rect above y = mouth.y - ry*0.2, union the mouth ellipse scaled by (0.96, 0.92).

const BOWL: Vector2 = Vector2(128.0, 210.0)
const CX: float = 128.0
const BOWL_RX: float = 34.0
const BOWL_RY: float = 38.0

const BRASS_LIGHT: Color = Color("f3dc92")
const BRASS_BASE: Color = Color("c4913b")
const BRASS_MID: Color = Color("a5772b")
const BRASS_SHADE: Color = Color("7b5517")
const BRASS_DARK: Color = Color("432f0c")
const WOOD_LIGHT: Color = Color("9d6d38")
const WOOD_BASE: Color = Color("5d3818")
const WOOD_SHADE: Color = Color("3b2209")
const WOOD_DARK: Color = Color("23130a")
const TURQ_BASE: Color = Color("2f9f96")
const TURQ_LIGHT: Color = Color("93e3d9")
const TURQ_DARK: Color = Color("1b5d57")
const OUTLINE: Color = Color("2a1a0c")
const OUTLINE_W: float = 2.2

var _c: CanvasItem
var _mouth: Vector2 = Vector2.ZERO
var _rx: float = 1.0
var _ry: float = 1.0
var _sc: float = 1.0
var _rot: float = 0.0
var _origin: Vector2 = Vector2.ZERO
var _upper: PackedVector2Array = PackedVector2Array()
var _lower: PackedVector2Array = PackedVector2Array()
var _mouth_clip: PackedVector2Array = PackedVector2Array()
var _free := false
var _fade := 1.0


func draw(c: CanvasItem, sim, mouth: Vector2, rx: float, ry: float) -> void:
	var drop: float = float(sim.spoon_drop())
	var stirring: bool = bool(sim.is_stirring())
	if drop <= 0.01 and not stirring:
		return
	if rx < 1.0 or ry < 1.0:
		return
	var dip: float = 1.0 if (stirring and drop <= 0.01) else drop
	var ang: float = float(sim.spoon_angle)
	var draw_w: float = rx * 2.15
	_c = c
	_mouth = mouth
	_rx = rx
	_ry = ry
	_sc = draw_w / 256.0
	_rot = -cos(ang) * 16.0 * PI / 180.0
	var bowl_ry: float = draw_w * (38.0 / 256.0)
	_origin = Vector2(
		mouth.x + cos(ang) * rx * 0.55,
		mouth.y + sin(ang) * ry * 0.35 + bowl_ry * 0.1 * dip - (1.0 - dip) * ry * 8.0
	)
	_build_clip()
	_head()
	_handle()
	_bowl()
	_c = null


func draw_free(c: CanvasItem, bowl_at: Vector2, rot: float, box: float, fade: float) -> void:
	if c == null or fade <= 0.01 or box < 1.0:
		return
	_c = c
	_free = true
	_fade = clampf(fade, 0.0, 1.0)
	_sc = box / 256.0
	_rot = rot
	_origin = bowl_at
	var pad := box * 3.0
	_upper = PackedVector2Array([
		bowl_at + Vector2(-pad, -pad),
		bowl_at + Vector2(pad, -pad),
		bowl_at + Vector2(pad, pad),
		bowl_at + Vector2(-pad, pad),
	])
	_lower = PackedVector2Array()
	_mouth_clip = PackedVector2Array()
	_head()
	_handle()
	_bowl()
	_free = false
	_fade = 1.0
	_c = null


func _build_clip() -> void:
	var top: float = _mouth.y - _ry * 24.0
	var line_y: float = _mouth.y - _ry * 0.2
	var bottom: float = _mouth.y + _ry * 30.0
	var left: float = _mouth.x - _rx * 3.0
	var right: float = _mouth.x + _rx * 3.0
	_upper = PackedVector2Array([
		Vector2(left, top), Vector2(right, top), Vector2(right, line_y), Vector2(left, line_y),
	])
	_lower = PackedVector2Array([
		Vector2(left, line_y), Vector2(right, line_y), Vector2(right, bottom), Vector2(left, bottom),
	])
	_mouth_clip = _ellipse_pts(_mouth, _rx * 0.96, _ry * 0.92, 40, 0.0)


func _head() -> void:
	_horn(Vector2(142, 44), Vector2(138, 23), Vector2(158, 8), Vector2(172, 22), BRASS_MID, false)
	_round_fill(CX - 7.0, 66.0, 14.0, 20.0, 2.0, BRASS_MID, OUTLINE, OUTLINE_W)
	_rect_fill(CX + 2.0, 67.0, 4.0, 18.0, _alpha(BRASS_SHADE, 0.6))
	_circle(Vector2(CX, 88.0), 13.0, BRASS_BASE, OUTLINE, OUTLINE_W)
	_ell_clip(Vector2(CX + 3.0, 92.0), 11.0, 8.0, _ellipse_pts(Vector2(CX, 88.0), 13.0, 13.0, 28, 0.0), _alpha(BRASS_SHADE, 0.5))
	_circle(Vector2(CX, 88.0), 6.5, TURQ_BASE, BRASS_DARK, 1.2)
	_circle(Vector2(CX - 2.0, 86.0), 2.0, _alpha(TURQ_LIGHT, 0.9), Color(0, 0, 0, 0), 0.0)
	_stroke_design(_quad(Vector2(CX - 10.0, 82.0), Vector2(CX - 4.0, 74.0), Vector2(CX + 6.0, 77.0), 12), _alpha(BRASS_LIGHT, 0.8), 1.6, false)

	var skull: PackedVector2Array = _skull()
	_fill_design(skull, BRASS_BASE)
	_stroke_design(skull, OUTLINE, OUTLINE_W, true)
	_ell_clip_fallback(Vector2(133, 66), 16.0, 8.0, skull, _alpha(BRASS_SHADE, 0.55))
	_ell_clip_fallback(Vector2(146, 56), 6.0, 12.0, skull, _alpha(BRASS_SHADE, 0.4))
	_ell_clip_fallback(Vector2(122, 50), 8.0, 3.5, skull, _alpha(BRASS_LIGHT, 0.55))
	_poly_fill(PackedVector2Array([Vector2(141, 40), Vector2(153, 31), Vector2(147, 46)]), BRASS_MID, OUTLINE, OUTLINE_W)
	_circle(Vector2(114, 57), 2.7, BRASS_DARK, Color(0, 0, 0, 0), 0.0)
	_circle(Vector2(113.2, 56.2), 0.9, BRASS_LIGHT, Color(0, 0, 0, 0), 0.0)
	_circle(Vector2(105.5, 60), 1.0, _alpha(BRASS_DARK, 0.8), Color(0, 0, 0, 0), 0.0)
	_horn(Vector2(135, 42), Vector2(128, 19), Vector2(148, 4), Vector2(164, 16), BRASS_BASE, true)


func _horn(p0: Vector2, c1: Vector2, c2: Vector2, p1: Vector2, fill: Color, ridge: bool) -> void:
	var spans: Array[Vector2] = [Vector2(0.0, 0.38), Vector2(0.34, 0.72), Vector2(0.68, 1.0)]
	var widths: Array[float] = [12.0, 8.0, 4.5]
	for i in 3:
		var span: Vector2 = spans[i]
		var w: float = widths[i]
		var pts: PackedVector2Array = _cubic_span(p0, c1, c2, p1, span.x, span.y, 12)
		_stroke_design(pts, OUTLINE, w + 3.0, false)
		_stroke_design(pts, fill, w, false)
		_stroke_design(pts, _alpha(BRASS_SHADE, 0.45), maxf(1.5, w * 0.4), false)
	if not ridge:
		return
	for t in [0.22, 0.38, 0.54, 0.7]:
		var p: Vector2 = _cubic_at(p0, c1, c2, p1, t)
		var p2: Vector2 = _cubic_at(p0, c1, c2, p1, t + 0.02)
		var d: Vector2 = p2 - p
		var length: float = d.length()
		if length < 0.0001:
			continue
		var half: float = (12.0 - 8.0 * t) * 0.5 - 1.0
		var n: Vector2 = Vector2(-d.y, d.x) / length * half
		_line_design(p + n, p - n, _alpha(BRASS_DARK, 0.7), 1.4)


func _handle() -> void:
	var top: float = 100.0
	var bottom: float = 184.0
	_round_fill(CX - 7.0, top, 14.0, bottom - top, 6.0, WOOD_BASE, OUTLINE, OUTLINE_W)
	_line_design(Vector2(CX - 3.0, top + 8.0), Vector2(CX - 4.0, bottom - 8.0), _alpha(WOOD_SHADE, 0.75), 1.2)
	_line_design(Vector2(CX + 2.0, top + 6.0), Vector2(CX + 3.0, bottom - 6.0), _alpha(WOOD_DARK, 0.55), 1.0)
	_line_design(Vector2(CX + 4.5, top + 20.0), Vector2(CX + 4.5, bottom - 26.0), _alpha(WOOD_DARK, 0.35), 1.4)
	_line_design(Vector2(CX - 4.6, top + 10.0), Vector2(CX - 4.6, bottom - 12.0), _alpha(WOOD_LIGHT, 0.55), 1.6)
	_ferrule(96.0)
	_ferrule(172.0)
	var bead_y: float = 140.0
	_round_fill(CX - 8.0, bead_y - 12.0, 16.0, 4.0, 1.5, BRASS_MID, BRASS_DARK, 1.0)
	_round_fill(CX - 8.0, bead_y + 8.0, 16.0, 4.0, 1.5, BRASS_MID, BRASS_DARK, 1.0)
	var bead: PackedVector2Array = _ellipse_pts(Vector2(CX, bead_y), 9.0, 9.0, 24, 0.0)
	_fill_design(bead, TURQ_BASE)
	_stroke_design(bead, OUTLINE, OUTLINE_W, true)
	_ell_clip(Vector2(CX + 2.0, bead_y + 4.0), 8.0, 5.0, bead, _alpha(TURQ_DARK, 0.6))
	_circle(Vector2(CX - 3.0, bead_y - 3.0), 2.6, _alpha(TURQ_LIGHT, 0.9), Color(0, 0, 0, 0), 0.0)


func _ferrule(y: float) -> void:
	_round_fill(CX - 9.0, y, 18.0, 11.0, 3.0, BRASS_BASE, OUTLINE, OUTLINE_W)
	_round_fill(CX - 9.0, y + 7.0, 18.0, 4.0, 2.0, _alpha(BRASS_SHADE, 0.6), Color(0, 0, 0, 0), 0.0)
	_line_design(Vector2(CX - 6.0, y + 3.0), Vector2(CX + 4.0, y + 3.0), _alpha(BRASS_LIGHT, 0.8), 1.4)


func _bowl() -> void:
	var body: PackedVector2Array = _ellipse_pts(BOWL, BOWL_RX, BOWL_RY, 36, 0.0)
	_fill_design(body, BRASS_BASE)
	_stroke_design(body, OUTLINE, OUTLINE_W, true)
	_ell_clip(Vector2(CX + 5.0, BOWL.y + 9.0), BOWL_RX * 0.9, BOWL_RY * 0.8, body, _alpha(BRASS_SHADE, 0.55))
	var marks: Array[Vector2] = [
		Vector2(CX - 14.0, BOWL.y + 10.0),
		Vector2(CX - 4.0, BOWL.y + 22.0),
		Vector2(CX + 10.0, BOWL.y + 18.0),
		Vector2(CX + 20.0, BOWL.y + 4.0),
		Vector2(CX - 22.0, BOWL.y - 4.0),
		Vector2(CX + 6.0, BOWL.y + 30.0),
	]
	for m in marks:
		_circle(m, 3.4, _alpha(BRASS_DARK, 0.12), Color(0, 0, 0, 0), 0.0)
	_ell(Vector2(CX - 15.0, BOWL.y + 9.0), 6.0, 13.0, _alpha(BRASS_LIGHT, 0.3))
	_ell(Vector2(CX, BOWL.y - 8.0), BOWL_RX * 0.74, BOWL_RY * 0.6, BRASS_DARK)
	_ell(Vector2(CX - 4.0, BOWL.y - 12.0), BOWL_RX * 0.52, BOWL_RY * 0.36, _alpha(BRASS_SHADE, 0.8))
	_ell(Vector2(CX + 9.0, BOWL.y - 3.0), BOWL_RX * 0.22, BOWL_RY * 0.11, _alpha(BRASS_MID, 0.75))
	var rim: PackedVector2Array = _quad(
		Vector2(CX - BOWL_RX * 0.92, BOWL.y - BOWL_RY * 0.15),
		Vector2(CX - BOWL_RX * 0.62, BOWL.y - BOWL_RY * 1.02),
		Vector2(CX + BOWL_RX * 0.18, BOWL.y - BOWL_RY * 0.96),
		12
	)
	_stroke_design(rim, _alpha(BRASS_LIGHT, 0.85), 2.0, false)


func _skull() -> PackedVector2Array:
	var pts: PackedVector2Array = PackedVector2Array()
	_add_cubic(pts, Vector2(142, 40), Vector2(152, 46), Vector2(152, 62), Vector2(143, 69), true)
	_add_cubic(pts, Vector2(143, 69), Vector2(135, 75), Vector2(122, 74), Vector2(113, 68), false)
	pts.append(Vector2(110, 79))
	pts.append(Vector2(107, 67))
	_add_cubic(pts, Vector2(107, 67), Vector2(102, 64), Vector2(100, 58), Vector2(104, 53), false)
	_add_cubic(pts, Vector2(104, 53), Vector2(108, 49), Vector2(116, 46), Vector2(124, 44), false)
	pts.append(Vector2(142, 40))
	return pts


func _circle(center: Vector2, radius: float, fill: Color, stroke: Color, width: float) -> void:
	var pts: PackedVector2Array = _ellipse_pts(center, radius, radius, 18, 0.0)
	if fill.a > 0.004:
		_fill_design(pts, fill)
	if width > 0.0 and stroke.a > 0.004:
		_stroke_design(pts, stroke, width, true)


func _ell(center: Vector2, rx: float, ry: float, fill: Color) -> void:
	if fill.a <= 0.004:
		return
	_fill_design(_ellipse_pts(center, rx, ry, 28, 0.0), fill)


func _ell_clip(center: Vector2, rx: float, ry: float, clip: PackedVector2Array, fill: Color) -> void:
	if fill.a <= 0.004 or clip.size() < 3:
		return
	var cut: PackedVector2Array = _clip_poly(_ellipse_pts(center, rx, ry, 28, 0.0), clip)
	_fill_design(cut, fill)


func _ell_clip_fallback(center: Vector2, rx: float, ry: float, clip: PackedVector2Array, fill: Color) -> void:
	if fill.a <= 0.004:
		return
	var src: PackedVector2Array = _ellipse_pts(center, rx, ry, 24, 0.0)
	var cut: PackedVector2Array = _clip_poly(src, clip)
	if cut.size() < 3 or not _within(cut, clip):
		cut = src
	_fill_design(cut, fill)


func _round_fill(x: float, y: float, w: float, h: float, radius: float, fill: Color, stroke: Color, sw: float) -> void:
	var pts: PackedVector2Array = _round_rect(x, y, w, h, radius)
	if fill.a > 0.004:
		_fill_design(pts, fill)
	if sw > 0.0 and stroke.a > 0.004:
		_stroke_design(pts, stroke, sw, true)


func _rect_fill(x: float, y: float, w: float, h: float, fill: Color) -> void:
	_fill_design(_round_rect(x, y, w, h, 0.0), fill)


func _poly_fill(pts: PackedVector2Array, fill: Color, stroke: Color, sw: float) -> void:
	if fill.a > 0.004:
		_fill_design(pts, fill)
	if sw > 0.0 and stroke.a > 0.004:
		_stroke_design(pts, stroke, sw, true)


func _fill_design(pts: PackedVector2Array, color: Color) -> void:
	if color.a <= 0.004 or pts.size() < 3 or _c == null:
		return
	var screen: PackedVector2Array = PackedVector2Array()
	screen.resize(pts.size())
	for i in pts.size():
		screen[i] = _map(pts[i])
	_fill_screen(screen, color)


func _fill_screen(screen: PackedVector2Array, color: Color) -> void:
	var up: PackedVector2Array = _clean(_clip_poly(screen, _upper))
	if up.size() >= 3:
		_c.draw_colored_polygon(up, Color(color.r, color.g, color.b, color.a * _fade))
	var below: PackedVector2Array = _clip_poly(screen, _lower)
	var in_mouth: PackedVector2Array = _clean(_clip_poly(below, _mouth_clip))
	if in_mouth.size() >= 3:
		_c.draw_colored_polygon(in_mouth, color)


func _stroke_design(pts: PackedVector2Array, color: Color, width: float, closed: bool) -> void:
	if color.a <= 0.004 or width <= 0.0 or pts.size() < 2 or _c == null:
		return
	var screen: PackedVector2Array = PackedVector2Array()
	for i in pts.size():
		screen.append(_map(pts[i]))
	if closed and screen.size() >= 2:
		screen.append(screen[0])
	var px: float = width * _sc
	for run in _runs(screen):
		var poly: PackedVector2Array = run
		if poly.size() >= 2:
			_c.draw_polyline(poly, Color(color.r, color.g, color.b, color.a * _fade), px, true)


func _line_design(a: Vector2, b: Vector2, color: Color, width: float) -> void:
	var pts: PackedVector2Array = PackedVector2Array()
	pts.append(a)
	pts.append(b)
	_stroke_design(pts, color, width, false)


func _map(p: Vector2) -> Vector2:
	var d: Vector2 = (p - BOWL) * _sc
	var cs: float = cos(_rot)
	var sn: float = sin(_rot)
	return _origin + Vector2(cs * d.x - sn * d.y, sn * d.x + cs * d.y)


func _visible(p: Vector2) -> bool:
	if _free:
		return true
	var ex: float = _rx * 0.96
	var ey: float = _ry * 0.92
	if ex > 0.0 and ey > 0.0:
		var nx: float = (p.x - _mouth.x) / ex
		var ny: float = (p.y - _mouth.y) / ey
		if nx * nx + ny * ny <= 1.0:
			return true
	var line_y: float = _mouth.y - _ry * 0.2
	var top: float = _mouth.y - _ry * 24.0
	return p.y <= line_y and p.y >= top and absf(p.x - _mouth.x) <= _rx * 3.0


func _runs(pts: PackedVector2Array) -> Array:
	var out: Array = []
	if pts.size() < 2:
		return out
	var cur: PackedVector2Array = PackedVector2Array()
	var prev: Vector2 = pts[0]
	var prev_in: bool = _visible(prev)
	if prev_in:
		cur.append(prev)
	for i in range(1, pts.size()):
		var q: Vector2 = pts[i]
		var q_in: bool = _visible(q)
		if prev_in and q_in:
			cur.append(q)
		elif prev_in and not q_in:
			cur.append(_boundary(prev, q))
			if cur.size() >= 2:
				out.append(cur.duplicate())
			cur = PackedVector2Array()
		elif (not prev_in) and q_in:
			cur = PackedVector2Array()
			cur.append(_boundary(prev, q))
			cur.append(q)
		prev = q
		prev_in = q_in
	if cur.size() >= 2:
		out.append(cur.duplicate())
	return out


func _boundary(a: Vector2, b: Vector2) -> Vector2:
	var lo: Vector2 = a
	var hi: Vector2 = b
	for _i in 10:
		var mid: Vector2 = (lo + hi) * 0.5
		if _visible(mid) == _visible(a):
			lo = mid
		else:
			hi = mid
	return (lo + hi) * 0.5


func _round_rect(x: float, y: float, w: float, h: float, radius: float) -> PackedVector2Array:
	var pts: PackedVector2Array = PackedVector2Array()
	var rr: float = minf(radius, minf(absf(w) * 0.5, absf(h) * 0.5))
	if rr <= 0.05:
		pts.append(Vector2(x, y))
		pts.append(Vector2(x + w, y))
		pts.append(Vector2(x + w, y + h))
		pts.append(Vector2(x, y + h))
		return pts
	for k in 4:
		var a0: float = -PI * 0.5
		var center: Vector2 = Vector2(x + w - rr, y + rr)
		if k == 1:
			a0 = 0.0
			center = Vector2(x + w - rr, y + h - rr)
		elif k == 2:
			a0 = PI * 0.5
			center = Vector2(x + rr, y + h - rr)
		elif k == 3:
			a0 = PI
			center = Vector2(x + rr, y + rr)
		for s in 4:
			var a: float = a0 + (PI * 0.5) * float(s) / 4.0
			pts.append(center + Vector2(cos(a) * rr, sin(a) * rr))
	return pts


func _ellipse_pts(center: Vector2, rx: float, ry: float, n: int, rot: float) -> PackedVector2Array:
	var pts: PackedVector2Array = PackedVector2Array()
	pts.resize(n)
	var cs: float = cos(rot)
	var sn: float = sin(rot)
	for i in n:
		var a: float = TAU * float(i) / float(n)
		var lx: float = cos(a) * rx
		var ly: float = sin(a) * ry
		pts[i] = center + Vector2(cs * lx - sn * ly, sn * lx + cs * ly)
	return pts


func _cubic_at(p0: Vector2, c1: Vector2, c2: Vector2, p1: Vector2, t: float) -> Vector2:
	var u: float = 1.0 - t
	return p0 * (u * u * u) + c1 * (3.0 * u * u * t) + c2 * (3.0 * u * t * t) + p1 * (t * t * t)


func _cubic_span(p0: Vector2, c1: Vector2, c2: Vector2, p1: Vector2, a: float, b: float, n: int) -> PackedVector2Array:
	var pts: PackedVector2Array = PackedVector2Array()
	pts.resize(n + 1)
	for i in n + 1:
		pts[i] = _cubic_at(p0, c1, c2, p1, lerpf(a, b, float(i) / float(n)))
	return pts


func _quad(p0: Vector2, control: Vector2, p1: Vector2, n: int) -> PackedVector2Array:
	var pts: PackedVector2Array = PackedVector2Array()
	pts.resize(n + 1)
	for i in n + 1:
		var t: float = float(i) / float(n)
		var u: float = 1.0 - t
		pts[i] = p0 * (u * u) + control * (2.0 * u * t) + p1 * (t * t)
	return pts


func _add_cubic(pts: PackedVector2Array, p0: Vector2, c1: Vector2, c2: Vector2, p1: Vector2, include_start: bool) -> void:
	var n: int = 12
	var start: int = 0 if include_start else 1
	for i in range(start, n + 1):
		pts.append(_cubic_at(p0, c1, c2, p1, float(i) / float(n)))


func _alpha(c: Color, a: float) -> Color:
	return Color(c.r, c.g, c.b, a)


func _clip_poly(subj: PackedVector2Array, clip: PackedVector2Array) -> PackedVector2Array:
	if subj.size() < 3 or clip.size() < 3:
		return PackedVector2Array()
	var all_in: bool = true
	for p in subj:
		if not _in_convex(p, clip):
			all_in = false
			break
	if all_in:
		return subj
	var sp: PackedVector2Array = subj
	var nclip: int = clip.size()
	for i in nclip:
		var a: Vector2 = clip[i]
		var b: Vector2 = clip[(i + 1) % nclip]
		var ip: PackedVector2Array = sp
		sp = PackedVector2Array()
		if ip.is_empty():
			break
		var s: Vector2 = ip[ip.size() - 1]
		for k in ip.size():
			var e: Vector2 = ip[k]
			var ein: bool = _inside_edge(e, a, b)
			var sin: bool = _inside_edge(s, a, b)
			if ein:
				if not sin:
					sp.append(_hit(s, e, a, b))
				sp.append(e)
			elif sin:
				sp.append(_hit(s, e, a, b))
			s = e
	return sp


func _inside_edge(p: Vector2, a: Vector2, b: Vector2) -> bool:
	return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -0.0001


func _in_convex(p: Vector2, clip: PackedVector2Array) -> bool:
	var n: int = clip.size()
	for i in n:
		if not _inside_edge(p, clip[i], clip[(i + 1) % n]):
			return false
	return true


func _hit(s: Vector2, e: Vector2, a: Vector2, b: Vector2) -> Vector2:
	var se: Vector2 = e - s
	var ab: Vector2 = b - a
	var den: float = se.x * ab.y - se.y * ab.x
	if absf(den) < 0.0000001:
		return e
	var t: float = clampf(((a.x - s.x) * ab.y - (a.y - s.y) * ab.x) / den, 0.0, 1.0)
	return s + se * t


func _clean(pts: PackedVector2Array) -> PackedVector2Array:
	var out: PackedVector2Array = PackedVector2Array()
	for p in pts:
		if out.is_empty() or out[out.size() - 1].distance_squared_to(p) > 0.05:
			out.append(p)
	if out.size() >= 2 and out[0].distance_squared_to(out[out.size() - 1]) < 0.05:
		out.remove_at(out.size() - 1)
	return out


func _within(pts: PackedVector2Array, clip: PackedVector2Array) -> bool:
	if pts.size() < 3 or clip.size() < 3:
		return false
	var bb: Rect2 = Rect2(clip[0], Vector2.ZERO)
	for i in range(1, clip.size()):
		bb = bb.expand(clip[i])
	bb = bb.grow(3.0)
	for p in pts:
		if not bb.has_point(p):
			return false
	return true
