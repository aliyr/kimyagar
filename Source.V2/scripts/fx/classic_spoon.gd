class_name ClassicSpoon
extends RefCounted
## Carved walnut spoon. The picture is assets/art/workshop/wooden_spoon.png
## (512×1280, bowl pivot at 256,1000). The bowl pixel sits on the same anchor
## the cauldron spoon and the transfer spoon already use, so timing stays put.
## In the pot the sprite is clipped to the rim and the mouth. While stirring,
## the bowl rides an ellipse below the waterline and the handle leans out.

const BOWL := Vector2(128.0, 210.0)
const TEX_SIZE := Vector2(512.0, 1280.0)
const TEX_BOWL := Vector2(256.0, 1000.0)
## Texture bowl radius 200px matches the old 34-unit bowl.
const TEX_SCALE := 34.0 / 200.0

static var _tex: Texture2D

var _c: CanvasItem
var _mouth := Vector2.ZERO
var _rx := 1.0
var _ry := 1.0
var _sc := 1.0
var _rot := 0.0
var _origin := Vector2.ZERO
var _upper := PackedVector2Array()
var _lower := PackedVector2Array()
var _mouth_clip := PackedVector2Array()
var _free := false
var _fade := 1.0
var extras := true
var _exiting := false
var _prev_drop := 0.0
var _drip := Color(0.55, 0.32, 0.12, 0.7)


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
	# Handle leans as the bowl travels the ellipse, so the grip stays out of the water.
	_rot = -cos(ang) * 26.0 * PI / 180.0 - sin(ang) * 8.0 * PI / 180.0
	var fig := sin(ang * 2.0) * 0.16
	var bowl_ry: float = draw_w * (38.0 / 256.0)
	_origin = Vector2(
		mouth.x + cos(ang) * rx * (0.46 + fig),
		mouth.y + sin(ang) * ry * 0.22 + ry * 0.50 * dip - (1.0 - dip) * ry * 7.0 + bowl_ry * 0.05 * dip
	)
	_exiting = drop + 0.015 < _prev_drop and not stirring
	_prev_drop = drop
	var ink: Color = sim.liquid_color()
	_drip = Color(ink.r, ink.g, ink.b, 0.75)
	_free = false
	_fade = 1.0
	_build_clip()
	_draw_sprite()
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
	_draw_sprite()
	_free = false
	_fade = 1.0
	_c = null


func _texture() -> Texture2D:
	if _tex == null:
		_tex = load("res://assets/art/workshop/wooden_spoon.png")
	return _tex


func _draw_sprite() -> void:
	var tex := _texture()
	if tex == null or _c == null:
		return
	var origin := BOWL - TEX_BOWL * TEX_SCALE
	var sz := TEX_SIZE * TEX_SCALE
	var local := PackedVector2Array([
		origin,
		origin + Vector2(sz.x, 0.0),
		origin + sz,
		origin + Vector2(0.0, sz.y),
	])
	var uvs := PackedVector2Array([
		Vector2(0, 0), Vector2(1, 0), Vector2(1, 1), Vector2(0, 1),
	])
	var screen := PackedVector2Array()
	for p in local:
		screen.append(_map(p))
	var tint := Color(1, 1, 1, _fade)
	if _free:
		_paint(screen, uvs, tex, tint)
		return
	if _exiting and extras:
		for i in 3:
			var drop_at := _origin + Vector2(float(i - 1) * 5.0, 16.0 + float(i) * 9.0)
			_c.draw_circle(drop_at, 2.4 - float(i) * 0.3, Color(_drip.r, _drip.g, _drip.b, 0.55 - float(i) * 0.12))
	var up: Array = _clip_uv(screen, uvs, _upper)
	if (up[0] as PackedVector2Array).size() >= 3:
		_paint(up[0], up[1], tex, tint)
	var low: Array = _clip_uv(screen, uvs, _lower)
	var mouth: Array = _clip_uv(low[0], low[1], _mouth_clip)
	if (mouth[0] as PackedVector2Array).size() >= 3:
		_paint(mouth[0], mouth[1], tex, tint)


func _paint(pts: PackedVector2Array, uvs: PackedVector2Array, tex: Texture2D, tint: Color) -> void:
	var cols := PackedColorArray()
	cols.resize(pts.size())
	cols.fill(tint)
	_c.draw_polygon(pts, cols, uvs, tex)


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


func _map(p: Vector2) -> Vector2:
	var d: Vector2 = (p - BOWL) * _sc
	var cs := cos(_rot)
	var sn := sin(_rot)
	return _origin + Vector2(cs * d.x - sn * d.y, sn * d.x + cs * d.y)


func _ellipse_pts(center: Vector2, rx: float, ry: float, n: int, rot: float) -> PackedVector2Array:
	var pts := PackedVector2Array()
	pts.resize(n)
	var cs := cos(rot)
	var sn := sin(rot)
	for i in n:
		var a := TAU * float(i) / float(n)
		var lx := cos(a) * rx
		var ly := sin(a) * ry
		pts[i] = center + Vector2(cs * lx - sn * ly, sn * lx + cs * ly)
	return pts


func _clip_uv(subj: PackedVector2Array, uvs: PackedVector2Array, clip: PackedVector2Array) -> Array:
	var empty := [PackedVector2Array(), PackedVector2Array()]
	if subj.size() < 3 or clip.size() < 3 or uvs.size() != subj.size():
		return empty
	var sp := subj
	var su := uvs
	var nclip := clip.size()
	for i in nclip:
		var a: Vector2 = clip[i]
		var b: Vector2 = clip[(i + 1) % nclip]
		var ip := sp
		var iu := su
		sp = PackedVector2Array()
		su = PackedVector2Array()
		if ip.is_empty():
			break
		var s: Vector2 = ip[ip.size() - 1]
		var suv: Vector2 = iu[iu.size() - 1]
		for k in ip.size():
			var e: Vector2 = ip[k]
			var euv: Vector2 = iu[k]
			var ein := _inside_edge(e, a, b)
			var sin := _inside_edge(s, a, b)
			if ein:
				if not sin:
					var hit := _split(s, e, suv, euv, a, b)
					sp.append(hit[0])
					su.append(hit[1])
				sp.append(e)
				su.append(euv)
			elif sin:
				var hit2 := _split(s, e, suv, euv, a, b)
				sp.append(hit2[0])
				su.append(hit2[1])
			s = e
			suv = euv
	return [sp, su]


func _split(s: Vector2, e: Vector2, suv: Vector2, euv: Vector2, a: Vector2, b: Vector2) -> Array:
	var hit := _hit(s, e, a, b)
	var den := e.distance_to(s)
	var t := 0.0 if den <= 0.0001 else clampf(s.distance_to(hit) / den, 0.0, 1.0)
	return [hit, suv.lerp(euv, t)]


func _inside_edge(p: Vector2, a: Vector2, b: Vector2) -> bool:
	return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -0.0001


func _hit(s: Vector2, e: Vector2, a: Vector2, b: Vector2) -> Vector2:
	var se := e - s
	var ab := b - a
	var den := se.x * ab.y - se.y * ab.x
	if absf(den) < 0.0000001:
		return e
	var t := clampf(((a.x - s.x) * ab.y - (a.y - s.y) * ab.x) / den, 0.0, 1.0)
	return s + se * t
