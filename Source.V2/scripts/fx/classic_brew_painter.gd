class_name ClassicBrewPainter
extends RefCounted
## Port of Web/src/scene/cauldron/ClassicBrewPainter.ts.
##
## Coordinates: the CanvasItem is the full stage. `mouth` is the cauldron mouth
## center in that control's local pixels; `rx` and `ry` are the mouth radii.
## (0, 0) is the control origin, not the mouth.
##
## Draw order matches the web painter. Fills that the web clipped with ctx.clip()
## are polygon-clipped to the mouth ellipse (chips use the tighter inner ellipse).
## The spoon is drawn by ClassicSpoon between heat haze and the mouth interior.

const RoomFx = preload("res://scripts/fx/workshop_fx.gd")
const Poly = preload("res://scripts/fx/poly_draw.gd")
const SCENE_MOUTH_RX: float = 378.0 * 280.0 / 750.0
const SPLASH_DEPTH: float = 84.0 / 378.0
const DOME: float = 0.78

var _spoon: ClassicSpoon
var _blobs: Dictionary = {}
var _c: CanvasItem
var _sim
var _mouth: Vector2 = Vector2.ZERO
var _rx: float = 1.0
var _ry: float = 1.0
var _px: float = 1.0
var _mouth_clip: PackedVector2Array = PackedVector2Array()
var _chip_clip: PackedVector2Array = PackedVector2Array()
var _base: Color = Color.WHITE
var _deep: Color = Color.WHITE
var _light: Color = Color.WHITE
var _glint: Color = Color.WHITE
var _edge: Color = Color.WHITE
var disc_interior: ColorRect
var disc_liquid: ColorRect
var disc_highlight: ColorRect
var disc_glow: ColorRect
var _rad_i := 0
var _rad_img: Array = []
var _rad_tex: Array = []
var _liq_center := Vector2.ZERO
var _lrx := 0.0
var _lry := 0.0
var _liq_fill := 0.0
var _liq_ox := 0.0
## Workshop clears this when the effects toggle is off.
var draw_steam := true


func _init() -> void:
	_spoon = ClassicSpoon.new()


func present_water(sim, mouth: Vector2, rx: float, ry: float) -> void:
	# Disc state only. Safe to call outside `_draw` (tests, and the idle key).
	_c = null
	_sim = null
	if sim == null or rx < 1.0 or ry < 1.0:
		hide_discs()
		return
	_sim = sim
	_mouth = mouth
	_rx = rx
	_ry = ry
	_px = rx / SCENE_MOUTH_RX
	var liquid: Color = sim.liquid_color()
	_base = Color(liquid.r, liquid.g, liquid.b, 1.0)
	_deep = _scale(_base, 0.62)
	_light = _whiten(_base, 0.38)
	_glint = _whiten(_base, 0.7)
	_edge = _whiten(_base, -0.01)
	_interior()
	_liquid_body()
	_c = null
	_sim = null


func draw(c: CanvasItem, sim, mouth: Vector2, rx: float, ry: float) -> void:
	draw_back(c, sim, mouth, rx, ry)
	draw_front(c, sim, mouth, rx, ry)


func hide_discs() -> void:
	for node in [disc_interior, disc_liquid, disc_highlight, disc_glow]:
		if node != null:
			node.visible = false


func draw_back(c: CanvasItem, sim, mouth: Vector2, rx: float, ry: float) -> void:
	_rad_i = 0
	if not _prepare(c, sim, mouth, rx, ry):
		hide_discs()
		return
	if draw_steam:
		_steam()
	_heat_haze()
	_spoon.extras = draw_steam
	_spoon.draw(c, sim, mouth, rx, ry)
	_interior()
	_liquid_body()
	_c = null
	_sim = null


func draw_front(c: CanvasItem, sim, mouth: Vector2, rx: float, ry: float) -> void:
	if not _prepare(c, sim, mouth, rx, ry):
		return
	_liquid_marks()
	_stir_wake()
	_blooms()
	_chips()
	_bubbles()
	_spots()
	_sheen()
	_droplets()
	_sparkles()
	_c = null
	_sim = null


func _prepare(c: CanvasItem, sim, mouth: Vector2, rx: float, ry: float) -> bool:
	if c == null or sim == null or rx < 1.0 or ry < 1.0:
		return false
	_c = c
	_sim = sim
	_mouth = mouth
	_rx = rx
	_ry = ry
	_px = rx / SCENE_MOUTH_RX
	_mouth_clip = _ellipse_pts(mouth, rx, ry, 40, 0.0)
	_chip_clip = _ellipse_pts(Vector2(mouth.x, mouth.y - ry * 0.04), rx * 0.9, ry * 0.78, 36, 0.0)
	var liquid: Color = sim.liquid_color() as Color
	_base = Color(liquid.r, liquid.g, liquid.b, 1.0)
	_deep = _scale(_base, 0.62)
	_light = _whiten(_base, 0.38)
	_glint = _whiten(_base, 0.7)
	_edge = _whiten(_base, -0.01)
	return true


func _interior() -> void:
	var ts: PackedFloat32Array = PackedFloat32Array([0.0, 0.72, 1.0])
	var cols: Array[Color] = [Color("4a2818"), Color("2a140c"), Color("140804")]
	_fill_radial(disc_interior, _mouth, _rx, _ry, Vector2(_mouth.x, _mouth.y - _ry * 0.2), _rx, ts, cols, false)


func _liquid_geom() -> bool:
	var fillv: float = clampf(float(_sim.fill), 0.0, 1.0)
	_liq_fill = fillv
	if fillv <= 0.01:
		return false
	var depth: float = 1.0 - fillv
	var level: float = 0.42 + 0.58 * fillv
	_liq_ox = float(_sim.slosh_x) * _rx
	var oy: float = float(_sim.slosh_y) * _ry + float(_sim.shiver) * _ry * 0.02
	if float(_sim.dome) > 0.0:
		oy -= _ry * 0.03 * float(_sim.dome)
	var lx: float = _mouth.x + _liq_ox
	_lrx = _rx * 0.97 * level
	_lry = _ry * 0.88 * level
	var ly: float = _mouth.y - _ry * 0.04 + oy + depth * (_ry * 1.15 - _lry)
	if depth > 0.0:
		_wall_shadow(ly, _lry, depth)
	_liq_center = Vector2(lx, ly)
	return true


func _liquid_body() -> void:
	if not _liquid_geom():
		if disc_liquid:
			disc_liquid.visible = false
		if disc_highlight:
			disc_highlight.visible = false
		if disc_glow:
			disc_glow.visible = false
		return
	var lx := _liq_center.x
	var ly := _liq_center.y
	var body: Color = Color(_base.r, _base.g, _base.b, 0.92)
	var mid: Color = Color(_base.r, _base.g, _base.b, 0.97)
	var edge: Color = Color(_edge.r, _edge.g, _edge.b, 1.0)
	var ts: PackedFloat32Array = PackedFloat32Array([0.0, 0.62, 1.0])
	var cols: Array[Color] = [body, mid, edge]
	_fill_radial(disc_liquid, _liq_center, _lrx, _lry, Vector2(lx - _lrx * 0.15, ly - _lry * 0.2), _lrx, ts, cols, true)
	var hx: float = lx - _lrx * 0.22 + _liq_ox * 0.4
	var hy: float = ly - _lry * 0.28
	var hts: PackedFloat32Array = PackedFloat32Array([0.0, 1.0])
	var hcols: Array[Color] = [Color(1.0, 248.0 / 255.0, 230.0 / 255.0, 0.38), Color(1.0, 248.0 / 255.0, 230.0 / 255.0, 0.0)]
	_fill_radial(disc_highlight, Vector2(hx, hy), _lrx * 0.38, _lry * 0.28, Vector2(hx, hy), _lrx * 0.45, hts, hcols, true)
	var glow: float = float(_sim.fire_glow)
	if glow > 0.02:
		var gmul: float = glow * 0.28
		var gts: PackedFloat32Array = PackedFloat32Array([0.0, 0.7, 1.0])
		var gcols: Array[Color] = [
			Color(1.0, 150.0 / 255.0, 50.0 / 255.0, 0.0),
			Color(1.0, 120.0 / 255.0, 40.0 / 255.0, 0.45 * gmul),
			Color(1.0, 80.0 / 255.0, 20.0 / 255.0, 0.0),
		]
		_fill_radial(disc_glow, _liq_center, _lrx, _lry, Vector2(lx, ly + _lry * 0.4), _lrx, gts, gcols, true)
	elif disc_glow:
		disc_glow.visible = false


func _liquid_marks() -> void:
	if _liq_fill <= 0.01 or _lrx < 1.0:
		return
	var center := _liq_center
	var swirl: float = float(_sim.swirl)
	var vein: Color = Color(1.0, 244.0 / 255.0, 220.0 / 255.0, 0.07 * 0.9)
	var vein_w: float = maxf(1.0, _ry * 0.035)
	for i in 2:
		_stroke(_arc(center, _lrx * (0.34 + float(i) * 0.22), _lry * (0.26 + float(i) * 0.18), swirl + float(i) * 0.5, 0.4, PI * 1.35, 16), vein, vein_w)
	_stroke(_arc(center, _lrx * 0.99, _lry * 0.99, 0.0, 0.0, TAU, 32), Color(70.0 / 255.0, 32.0 / 255.0, 14.0 / 255.0, 0.45), maxf(1.0, _ry * 0.028))
	_stroke(_arc(center, _lrx * 0.9, _lry * 0.88, 0.0, PI * 1.05, PI * 1.85, 12), Color(196.0 / 255.0, 120.0 / 255.0, 64.0 / 255.0, 0.4), maxf(1.2, _ry * 0.03))
	if _liq_fill < 1.0:
		var ripple: Color = Color(1.0, 250.0 / 255.0, 240.0 / 255.0, 1.0)
		var rw: float = maxf(1.0, _ry * 0.04)
		for i in 3:
			var p: float = fmod(float(_sim.time) * 1.7 + float(i) / 3.0, 1.0)
			var a: float = (1.0 - p) * 0.4 * minf(1.0, _liq_fill * 4.0) * 0.9
			_stroke(_arc(center, _lrx * (0.1 + 0.85 * p), _lry * (0.1 + 0.85 * p), 0.0, 0.0, TAU, 28), Color(ripple.r, ripple.g, ripple.b, a), rw)


func _stir_wake() -> void:
	if not draw_steam or _sim == null or not bool(_sim.is_stirring()):
		return
	var ang := float(_sim.spoon_angle)
	var behind := ang - 0.6
	var px := _mouth.x + cos(behind) * _rx * 0.34
	var py := _mouth.y + sin(behind) * _ry * 0.16 + _ry * 0.06
	var wash := Color(_light.r, _light.g, _light.b, 0.22)
	_stroke(_arc(Vector2(px, py), _rx * 0.15, _ry * 0.09, ang, 0.35, PI, 8), wash, 1.5)
	_stroke(_arc(Vector2(px, py), _rx * 0.26, _ry * 0.14, ang, 0.15, PI * 0.85, 8), Color(wash.r, wash.g, wash.b, 0.12), 1.2)


func _wall_shadow(ly: float, lry: float, depth: float) -> void:
	var steps: int = 12
	var top: float = _mouth.y - _ry
	var bot: float = _mouth.y + _ry
	var y0g: float = ly - lry
	var span: float = maxf(1.0, lry * 2.0)
	var ell: PackedVector2Array = _mouth_clip
	for i in steps:
		var y0: float = lerpf(top, bot, float(i) / float(steps))
		var y1: float = lerpf(top, bot, float(i + 1) / float(steps))
		var gt: float = clampf(((y0 + y1) * 0.5 - y0g) / span, 0.0, 1.0)
		var a: float = (1.0 - gt) * 0.6 * 0.55 * depth
		if a <= 0.004:
			continue
		var slab: PackedVector2Array = PackedVector2Array([
			Vector2(_mouth.x - _rx * 2.0, y0),
			Vector2(_mouth.x + _rx * 2.0, y0),
			Vector2(_mouth.x + _rx * 2.0, y1),
			Vector2(_mouth.x - _rx * 2.0, y1),
		])
		_paint(_clip_poly(ell, slab), Color(0, 0, 0, a))


func _blooms() -> void:
	for item in _arr(_sim.blooms):
		var b: Dictionary = _as_dict(item)
		if b.is_empty():
			continue
		var life: float = maxf(0.0001, _f(b, "life"))
		var t: float = clampf(_f(b, "age") / life, 0.0, 1.0)
		var a: float = sin(minf(1.0, t) * PI) * 0.42
		if a <= 0.004:
			continue
		var rad: float = _f(b, "radius") * _rx * 0.85
		var origin: Vector2 = Vector2(_mouth.x + _f(b, "u") * _rx - rad, _mouth.y + _f(b, "v") * _ry - rad * 0.55)
		var size: Vector2 = Vector2(rad * 2.0, rad * 1.1)
		_blit(_blob(_col(b, "color"), 0.7), origin, size, a)


func _chips() -> void:
	for item in _arr(_sim.chips):
		var chip: Dictionary = _as_dict(item)
		if chip.is_empty():
			continue
		var depth: float = _f(chip, "depth")
		if depth > 0.98:
			continue
		var bob: float = sin(_f(chip, "bob")) * _ry * 0.035 * (1.0 - depth)
		var center: Vector2 = Vector2(_mouth.x + _f(chip, "u") * _rx, _mouth.y + _f(chip, "v") * _ry + bob + depth * _ry * 0.25)
		var scale: float = 1.0 - 0.5 * depth
		var alpha: float = 1.0 - 0.65 * depth
		var longest: float = _f(chip, "size") * _px * scale
		var aspect: float = maxf(0.05, _f(chip, "aspect"))
		var w: float = longest if aspect >= 1.0 else longest * aspect
		var h: float = longest / aspect if aspect >= 1.0 else longest
		var ang: float = _f(chip, "rot") * PI / 180.0
		var shadow_a: float = alpha * 0.35 * 0.8
		_paint(_clip_poly(_ell_local(Vector2(w * 0.08, h * 0.12), w * 0.46, h * 0.28, 0.0, ang, center, 14), _chip_clip), Color(20.0 / 255.0, 10.0 / 255.0, 4.0 / 255.0, shadow_a))
		if _b(chip, "powder"):
			var pw: float = w * 1.1
			var ph: float = h * 1.1
			_blit_rot(_blob(_col(chip, "color"), 0.9), center, pw, ph, ang, alpha, _chip_clip)
			continue
		var kind: String = _s(chip, "kind")
		var tex: Texture2D = _piece_tex(kind, _i(chip, "sprite"))
		var norm: PackedVector2Array = PackedVector2Array()
		if _i(chip, "generation") > 0:
			norm = _nick_norm(_i(chip, "nick"))
		elif tex == null and not _kind_norm(kind).is_empty():
			norm = _kind_norm(kind)
		else:
			norm = _rect_norm()
		var pair: Array = _chip_poly(norm, w, h, ang, center)
		var pts: PackedVector2Array = pair[0]
		var uvs: PackedVector2Array = pair[1]
		var cut: Array = _clip_uv(pts, uvs, _chip_clip)
		pts = cut[0]
		uvs = cut[1]
		var tint: Color = _col(chip, "color")
		if depth > 0.45:
			tint = _base
		if tex != null:
			_paint_tex(pts, uvs, tex, Color(1, 1, 1, alpha))
			_paint(pts, Color(tint.r, tint.g, tint.b, alpha * 0.28))
		else:
			_paint(pts, Color(tint.r, tint.g, tint.b, alpha))
			if depth <= 0.45:
				var hl: PackedVector2Array = _ell_box(Vector2(w * 0.34, h * 0.3), w * 0.16, h * 0.1, -0.5, w, h, ang, center, 12)
				_paint(_clip_poly(hl, _chip_clip), Color(1.0, 244.0 / 255.0, 220.0 / 255.0, alpha * 0.28 * 0.85))


func _bubbles() -> void:
	var grow: float = float(ClassicBrewSim.BUBBLE_GROW)
	var now: float = float(_sim.time)
	for item in _arr(_sim.bubbles):
		var b: Dictionary = _as_dict(item)
		if b.is_empty():
			continue
		var dur: float = maxf(0.0001, _f(b, "dur"))
		var t: float = _f(b, "age") / dur
		var base: float = 3.8 * _f(b, "size") * _px
		var x: float = _mouth.x + _f(b, "u") * _rx
		var y: float = _mouth.y + _f(b, "v") * _ry
		if t < grow:
			var g: float = _ease(t / grow)
			var wob: float = _f(b, "wob")
			var wave: float = sin(now * 21.0 + wob)
			var rad: float = base * (0.28 + 0.72 * g) * (1.0 + 0.045 * wave * g)
			var ry2: float = rad * DOME * (1.0 - 0.08 * sin(now * 21.0 + wob + 1.2) * g)
			var lift: float = rad * 0.22 * g
			var cy: float = y - lift
			var strain: float = maxf(0.0, (t - grow * 0.7) / (grow * 0.3))
			_paint(_clip_poly(_ellipse_pts(Vector2(x, y + rad * 0.12), rad * 1.02, ry2 * 0.55, 16, 0.0), _mouth_clip), _rgba(_deep, 0.22 * g))
			var bts: PackedFloat32Array = PackedFloat32Array([0.0, 0.55, 0.86, 1.0])
			var bcols: Array[Color] = [
				_rgba(_light, 0.08 * 0.9),
				_rgba(_base, 0.1 * 0.9),
				_rgba(_deep, 0.32 * 0.9),
				_rgba(_glint, (0.62 + 0.25 * strain) * 0.9),
			]
			_radial(Vector2(x, cy), rad, ry2, Vector2(x - rad * 0.2, cy - ry2 * 0.25), rad, bts, bcols, 5, 10, true)
			var rim_a: float = 0.75 + 0.2 * strain
			var rim_w: float = maxf(0.7, rad * 0.16)
			_stroke(_arc(Vector2(x, cy), rad * 0.93, ry2 * 0.93, 0.0, PI * 0.95, PI * 1.9, 10), _rgba(_glint, 0.9 * rim_a), rim_w)
			_stroke(_arc(Vector2(x, cy), rad * 0.93, ry2 * 0.93, 0.0, PI * 0.1, PI * 0.85, 8), _rgba(_deep, 0.9 * 0.28), rim_w)
			_paint(_clip_poly(_ellipse_pts(Vector2(x - rad * 0.36, cy - ry2 * 0.42), rad * 0.26, ry2 * 0.18, 12, -0.6), _mouth_clip), Color(1, 252.0 / 255.0, 246.0 / 255.0, 0.85 * 0.95))
			_paint(_clip_poly(_ellipse_pts(Vector2(x + rad * 0.42, cy + ry2 * 0.38), rad * 0.11, rad * 0.11, 10, 0.0), _mouth_clip), Color(1, 252.0 / 255.0, 246.0 / 255.0, 0.35 * 0.95))
		else:
			var p: float = (t - grow) / maxf(0.0001, 1.0 - grow)
			var fade: float = 1.0 - p
			var rad2: float = base * (1.0 + p * 0.95)
			var cy2: float = y - base * 0.22 * (1.0 - p)
			_stroke(_arc(Vector2(x, cy2), rad2, rad2 * DOME, 0.0, 0.0, TAU, 20), _rgba(_glint, 0.95 * 0.8 * fade), maxf(0.5, base * 0.16 * fade + 0.3))
			_paint(_clip_poly(_ellipse_pts(Vector2(x, y), base * 0.7 * (1.0 - p * 0.5), base * 0.35 * (1.0 - p * 0.5), 12, 0.0), _mouth_clip), _rgba(_deep, 0.18 * fade))
			var speck: Color = _rgba(_glint, 0.9 * fade)
			var n: int = 4
			var wob2: float = _f(b, "wob")
			for i in n:
				var a: float = wob2 + (float(i) / float(n)) * TAU
				var fly: float = rad2 * (1.05 + p * 0.55)
				var sx: float = x + cos(a) * fly
				var sy: float = cy2 + sin(a) * fly * DOME - p * base * 0.9
				var sr: float = maxf(0.4, base * 0.18 * fade)
				_paint(_clip_poly(_ellipse_pts(Vector2(sx, sy), sr, sr, 8, 0.0), _mouth_clip), speck)
	for item in _arr(_sim.foam):
		var f: Dictionary = _as_dict(item)
		if f.is_empty():
			continue
		var ft: float = _f(f, "age") / maxf(0.0001, _f(f, "dur"))
		var fa: float = 0.35 * (1.0 - ft) * 0.9
		if fa <= 0.004:
			continue
		var fp: Vector2 = Vector2(_mouth.x + _f(f, "u") * _rx, _mouth.y + _f(f, "v") * _ry)
		_paint(_clip_poly(_ellipse_pts(fp, _rx * 0.06, _ry * 0.08, 12, 0.0), _mouth_clip), Color(1.0, 250.0 / 255.0, 240.0 / 255.0, fa))


func _spots() -> void:
	for item in _arr(_sim.spots):
		var s: Dictionary = _as_dict(item)
		if s.is_empty():
			continue
		var sp: Vector2 = Vector2(_mouth.x + _f(s, "u") * _rx, _mouth.y + _f(s, "v") * _ry)
		var sr: float = _f(s, "r")
		_paint(_clip_poly(_ellipse_pts(sp, sr * _rx, sr * _ry * 0.7, 12, 0.0), _mouth_clip), Color(20.0 / 255.0, 12.0 / 255.0, 8.0 / 255.0, 0.55))


func _sheen() -> void:
	if _arr(_sim.spots).is_empty():
		return
	_stroke(_arc(_mouth, _rx * 0.55, _ry * 0.35, -0.4, 0.4, 2.2, 12), Color(180.0 / 255.0, 160.0 / 255.0, 120.0 / 255.0, 0.8 * 0.2), maxf(1.0, 2.0 * _px))


func _droplets() -> void:
	var drops: Array = _arr(_sim.drops)
	if drops.is_empty():
		return
	for item in drops:
		var d: Dictionary = _as_dict(item)
		if _s(d, "phase") == "dry":
			_splat(d)
	for item in drops:
		var d2: Dictionary = _as_dict(item)
		if _s(d2, "phase") != "fly":
			continue
		if not bool(ClassicBrewSim.table_visible(_f(d2, "x"), _f(d2, "z"))):
			continue
		var gx: float = _mouth.x + _f(d2, "x") * _rx
		var gy: float = _mouth.y + float(ClassicBrewSim.drop_ground_y(d2)) * _rx
		var h: float = maxf(0.0, _f(d2, "y"))
		var rad: float = _f(d2, "r") * _px * (1.1 - minf(0.5, h * 0.35))
		var a: float = maxf(0.0, 0.3 - h * 0.14)
		if a <= 0.004:
			continue
		_paint(_ellipse_pts(Vector2(gx, gy), rad, rad * 0.42, 12, 0.0), Color(24.0 / 255.0, 12.0 / 255.0, 4.0 / 255.0, a))
	for item in drops:
		var d3: Dictionary = _as_dict(item)
		if _s(d3, "phase") != "fly":
			continue
		_fly(d3)


func _fly(d: Dictionary) -> void:
	var s: Vector2 = ClassicBrewSim.drop_screen(d)
	var pos: Vector2 = Vector2(_mouth.x + s.x * _rx, _mouth.y + s.y * _rx)
	var svx: float = _f(d, "vx")
	var svy: float = -_f(d, "vy") + _f(d, "vz") * SPLASH_DEPTH
	var speed: float = sqrt(svx * svx + svy * svy)
	var stretch: float = minf(0.85, speed * 0.16)
	var ang: float = atan2(svy, svx)
	var rad: float = _f(d, "r") * _px
	var rl: float = rad * (1.0 + stretch)
	var rs: float = rad * (1.0 - stretch * 0.32)
	var body_a: float = 0.85 if _b(d, "child") else 0.95
	var drop: PackedVector2Array = _teardrop(rl, rs, ang, pos)
	_paint(drop, _rgba(_base, 0.96 * body_a))
	_paint(_xform_ell(Vector2(-rl * 0.35, 0.0), rl * 0.28, rs * 0.45, ang, pos, 10), _rgba(_deep, 0.55 * body_a))
	_paint(_xform_ell(Vector2(rl * 0.15, -rs * 0.15), rl * 0.32, rs * 0.28, ang, pos, 10), _rgba(_light, 0.55 * body_a))
	_paint(_xform_ell(Vector2(rl * 0.05, -rs * 0.38), rl * 0.28, rs * 0.2, ang, pos, 10), Color(1.0, 253.0 / 255.0, 247.0 / 255.0, 0.8 * 0.95))


func _splat(d: Dictionary) -> void:
	var s: Vector2 = ClassicBrewSim.drop_screen(d)
	var pos: Vector2 = Vector2(_mouth.x + s.x * _rx, _mouth.y + s.y * _rx)
	var dry: float = minf(1.0, _f(d, "dry"))
	var wet: float = 1.0 - dry
	var settle: float = minf(1.0, _f(d, "hit") / 0.12)
	var w: float = _f(d, "r") * _px * _f(d, "splat") * (0.75 + 0.25 * _ease(settle)) * (1.0 - 0.45 * dry * dry)
	var h: float = w * 0.4
	var spin: float = _f(d, "rot") * 0.35
	var side: float = _f(d, "rot")
	var fill: Color = _rgba(_scale(_base, 0.85), 0.9 * wet)
	_paint(_ellipse_pts(pos, w, h, 16, spin), fill)
	if not _b(d, "child"):
		var off1: Vector2 = _spin(Vector2(cos(side) * w * 0.85, sin(side) * h * 0.8), spin, Vector2.ZERO)
		var off2: Vector2 = _spin(Vector2(-cos(side + 0.7) * w * 0.8, -sin(side + 0.7) * h * 0.7), spin, Vector2.ZERO)
		_paint(_ellipse_pts(pos + off1, w * 0.28, h * 0.32, 10, spin), fill)
		_paint(_ellipse_pts(pos + off2, w * 0.2, h * 0.26, 10, spin), fill)
	_stroke(_arc(pos, w * 0.96, h * 0.96, spin, 0.0, TAU, 18), _rgba(_deep, 0.35 * wet), maxf(0.6, h * 0.16), false)
	var glint_c: Vector2 = pos + _spin(Vector2(0.0, -h * 0.05), spin, Vector2.ZERO)
	_stroke(_arc(glint_c, w * 0.72, h * 0.62, spin, PI * 1.1, PI * 1.8, 8), _rgba(_glint, 0.7 * wet * wet), maxf(0.6, h * 0.22), false)
	if (not _b(d, "child")) and _f(d, "hit") < 0.25:
		var p: float = _f(d, "hit") / 0.25
		var rr: float = _f(d, "r") * _px * (1.2 + p * 2.6)
		_stroke(_arc(pos, rr, rr * 0.4, 0.0, 0.0, TAU, 20), _rgba(_light, 0.6 * (1.0 - p)), maxf(0.6, _f(d, "r") * _px * 0.45 * (1.0 - p)))


func _steam() -> void:
	for item in _arr(_sim.steam):
		var s: Dictionary = _as_dict(item)
		if s.is_empty():
			continue
		var dur: float = maxf(0.0001, _f(s, "dur"))
		var t: float = clampf(_f(s, "age") / dur, 0.0, 1.0)
		var fade: float = minf(1.0, t * 4.0) * pow(1.0 - t, 0.85)
		if fade <= 0.004:
			continue
		var smoke: bool = _b(s, "smoke")
		var y: float = _mouth.y - _ry * 1.2 - _f(s, "rise") * _ry * 5.5 - t * _ry * 1.1
		var x: float = _mouth.x + _f(s, "u") * _rx + sin(_f(s, "phase") + t * 4.0) * _rx * 0.12
		var size: float = (18.0 + t * 46.0) * _f(s, "size") * _px
		var clockwise: bool = _f(s, "phase") > PI
		var col: Color = _steam_color(s, smoke)
		col.a = fade * (0.62 if smoke else 0.72)
		var width: float = (5.0 if smoke else 3.2) * (0.6 + t) * _px
		var turns: float = 1.2 if smoke else 1.6
		var pts: PackedVector2Array = PackedVector2Array()
		pts.resize(29)
		for i in 29:
			var a: float = (float(i) / 28.0) * TAU * turns + _f(s, "phase")
			var rad: float = (float(i) / 28.0) * size
			var dir: float = 1.0 if clockwise else -1.0
			pts[i] = Vector2(x + cos(a) * rad * dir, y - rad * 0.55 + sin(a) * rad * 0.28)
		if width > 0.2:
			_c.draw_polyline(pts, col, width, true)


func _heat_haze() -> void:
	var heat: float = float(_sim.heat)
	if heat < 0.75:
		return
	var col: Color = Color(1.0, 236.0 / 255.0, 210.0 / 255.0, (heat - 0.7) * 0.18 * 0.8)
	var step: float = maxf(4.0, 8.0 * _px)
	var amp: float = 2.5 * _px
	var width: float = maxf(1.0, 2.0 * _px)
	var now: float = float(_sim.time)
	for i in 4:
		var y: float = _mouth.y - _ry * (1.05 + float(i) * 0.18)
		var pts: PackedVector2Array = PackedVector2Array()
		var x: float = -_rx
		while x <= _rx + 0.01:
			pts.append(Vector2(_mouth.x + x, y + sin(now * 7.0 + x * 0.05 + float(i)) * amp))
			x += step
		if pts.size() >= 2:
			_c.draw_polyline(pts, col, width, true)


func _sparkles() -> void:
	for item in _arr(_sim.sparkles):
		var s: Dictionary = _as_dict(item)
		if s.is_empty():
			continue
		var t: float = _f(s, "age") / 0.7
		var a: float = sin(PI * clampf(t, 0.0, 1.0))
		if a <= 0.004:
			continue
		var pos: Vector2 = Vector2(_mouth.x + _f(s, "u") * _rx, _mouth.y + _f(s, "v") * _ry - _ry * 0.35)
		var rad: float = (7.0 + a * 11.0) * _px
		var rot: float = t * 1.1
		_paint(_star(pos, rot, 8, rad, rad * 0.38), Color("e8c15a", a))
		_paint(_star(pos, rot + 0.4, 4, rad * 0.42, rad * 0.16), Color("fff6d2", a))


func _fill_radial(node: ColorRect, ell_c: Vector2, ell_rx: float, ell_ry: float, grad_c: Vector2, grad_r: float, ts: PackedFloat32Array, cols: Array, also_mouth: bool) -> void:
	if node != null and node.material is ShaderMaterial:
		_place_disc(node, ell_c, ell_rx, ell_ry, grad_c, grad_r, ts, cols, also_mouth)
		return
	_radial(ell_c, ell_rx, ell_ry, grad_c, grad_r, ts, cols, 1, 1, also_mouth)


func _place_disc(node: ColorRect, ell_c: Vector2, ell_rx: float, ell_ry: float, grad_c: Vector2, grad_r: float, ts: PackedFloat32Array, cols: Array, also_mouth: bool) -> void:
	if ell_rx < 0.4 or ell_ry < 0.4 or grad_r < 0.4:
		node.visible = false
		return
	node.visible = true
	node.position = ell_c - Vector2(ell_rx, ell_ry)
	node.size = Vector2(ell_rx, ell_ry) * 2.0
	var mat := node.material as ShaderMaterial
	mat.set_shader_parameter("rect_size", node.size)
	mat.set_shader_parameter("grad_center", grad_c - node.position)
	mat.set_shader_parameter("grad_radius", grad_r)
	mat.set_shader_parameter("clip_mouth", also_mouth)
	mat.set_shader_parameter("mouth_center", _mouth - node.position)
	mat.set_shader_parameter("mouth_radii", Vector2(_rx, _ry))
	var stops: Array[Color] = [Color(0, 0, 0, 0), Color(0, 0, 0, 0), Color(0, 0, 0, 0), Color(0, 0, 0, 0)]
	var times := [0.0, 1.0, 1.0, 1.0]
	var n := mini(4, mini(ts.size(), cols.size()))
	for i in n:
		stops[i] = cols[i]
		times[i] = float(ts[i])
	mat.set_shader_parameter("stop_count", n)
	mat.set_shader_parameter("stop0", stops[0])
	mat.set_shader_parameter("stop1", stops[1])
	mat.set_shader_parameter("stop2", stops[2])
	mat.set_shader_parameter("stop3", stops[3])
	mat.set_shader_parameter("t0", times[0])
	mat.set_shader_parameter("t1", times[1])
	mat.set_shader_parameter("t2", times[2])
	mat.set_shader_parameter("t3", times[3])


func _radial(ell_c: Vector2, ell_rx: float, ell_ry: float, grad_c: Vector2, grad_r: float, ts: PackedFloat32Array, cols: Array, _bands: int, _segs: int, also_mouth: bool) -> void:
	if _c == null or ell_rx < 0.4 or ell_ry < 0.4 or grad_r < 0.4:
		return
	var tex := _bake_radial(ell_c, ell_rx, ell_ry, grad_c, grad_r, ts, cols)
	var count := 36
	var pts := PackedVector2Array()
	var uvs := PackedVector2Array()
	pts.resize(count)
	uvs.resize(count)
	for i in count:
		var a := TAU * float(i) / float(count)
		pts[i] = ell_c + Vector2(cos(a) * ell_rx, sin(a) * ell_ry)
		uvs[i] = Vector2((cos(a) + 1.0) * 0.5, (sin(a) + 1.0) * 0.5)
	if also_mouth:
		var cut: Array = _clip_uv(pts, uvs, _mouth_clip)
		pts = cut[0]
		uvs = cut[1]
	_paint_tex(pts, uvs, tex, Color.WHITE)


func _bake_radial(ell_c: Vector2, ell_rx: float, ell_ry: float, grad_c: Vector2, grad_r: float, ts: PackedFloat32Array, cols: Array) -> Texture2D:
	const RES := 96
	if _rad_img.size() <= _rad_i:
		var created := Image.create(RES, RES, false, Image.FORMAT_RGBA8)
		_rad_img.append(created)
		_rad_tex.append(ImageTexture.create_from_image(created))
	var img: Image = _rad_img[_rad_i]
	var tex: ImageTexture = _rad_tex[_rad_i]
	_rad_i += 1
	for y in RES:
		for x in RES:
			var uv := Vector2((float(x) + 0.5) / float(RES), (float(y) + 0.5) / float(RES))
			var e := (uv - Vector2(0.5, 0.5)) * 2.0
			var col := Color(0, 0, 0, 0)
			if e.length_squared() <= 1.0:
				var world := ell_c + Vector2(e.x * ell_rx, e.y * ell_ry)
				col = _sample(ts, cols, world.distance_to(grad_c) / grad_r)
			img.set_pixel(x, y, col)
	tex.update(img)
	return tex


func _blit(tex: Texture2D, origin: Vector2, size: Vector2, alpha: float) -> void:
	if tex == null or alpha <= 0.004:
		return
	var pts: PackedVector2Array = PackedVector2Array([
		origin,
		origin + Vector2(size.x, 0.0),
		origin + size,
		origin + Vector2(0.0, size.y),
	])
	var uvs: PackedVector2Array = PackedVector2Array([Vector2(0, 0), Vector2(1, 0), Vector2(1, 1), Vector2(0, 1)])
	var cut: Array = _clip_uv(pts, uvs, _mouth_clip)
	_paint_tex(cut[0], cut[1], tex, Color(1, 1, 1, alpha))


func _blit_rot(tex: Texture2D, center: Vector2, w: float, h: float, ang: float, alpha: float, clip: PackedVector2Array) -> void:
	if tex == null or alpha <= 0.004:
		return
	var locals: PackedVector2Array = PackedVector2Array([
		Vector2(-w * 0.5, -h * 0.5),
		Vector2(w * 0.5, -h * 0.5),
		Vector2(w * 0.5, h * 0.5),
		Vector2(-w * 0.5, h * 0.5),
	])
	var uvs: PackedVector2Array = PackedVector2Array([Vector2(0, 0), Vector2(1, 0), Vector2(1, 1), Vector2(0, 1)])
	var pts: PackedVector2Array = PackedVector2Array()
	for local in locals:
		pts.append(_spin(local, ang, center))
	var cut: Array = _clip_uv(pts, uvs, clip)
	_paint_tex(cut[0], cut[1], tex, Color(1, 1, 1, alpha))


func _blob(col: Color, inner: float) -> Texture2D:
	var key: String = "%0.3f|%0.3f|%0.3f|%0.2f" % [col.r, col.g, col.b, inner]
	if _blobs.has(key):
		return _blobs[key] as Texture2D
	var img: Image = Image.create(64, 64, false, Image.FORMAT_RGBA8)
	for y in 64:
		for x in 64:
			var dx: float = float(x) + 0.5 - 32.0
			var dy: float = float(y) + 0.5 - 32.0
			var d: float = sqrt(dx * dx + dy * dy) / 32.0
			var a: float = 0.0
			if d < 0.55:
				a = lerpf(inner, 0.22, d / 0.55)
			elif d < 1.0:
				a = lerpf(0.22, 0.0, (d - 0.55) / 0.45)
			img.set_pixel(x, y, Color(col.r, col.g, col.b, a))
	var tex: Texture2D = ImageTexture.create_from_image(img)
	_blobs[key] = tex
	return tex


func _piece_tex(kind: String, sprite: int) -> Texture2D:
	if kind == "" or kind == "dust":
		return null
	var count: int = 7
	var i: int = sprite % count
	if i < 0:
		i += count
	return UiKit.tex("mortar/v3/pieces/%s_%d.png" % [kind, i + 1])


func _chip_poly(norm: PackedVector2Array, w: float, h: float, ang: float, center: Vector2) -> Array:
	var pts: PackedVector2Array = PackedVector2Array()
	var uvs: PackedVector2Array = PackedVector2Array()
	for p in norm:
		var local: Vector2 = Vector2(p.x * w - w * 0.5, p.y * h - h * 0.5)
		pts.append(_spin(local, ang, center))
		uvs.append(p)
	return [pts, uvs]


func _ell_local(local_c: Vector2, rx: float, ry: float, local_rot: float, ang: float, center: Vector2, n: int) -> PackedVector2Array:
	var pts: PackedVector2Array = PackedVector2Array()
	pts.resize(n)
	for i in n:
		var a: float = TAU * float(i) / float(n)
		var local: Vector2 = local_c + _spin(Vector2(cos(a) * rx, sin(a) * ry), local_rot, Vector2.ZERO)
		pts[i] = _spin(local, ang, center)
	return pts


func _ell_box(box_c: Vector2, rx: float, ry: float, local_rot: float, w: float, h: float, ang: float, center: Vector2, n: int) -> PackedVector2Array:
	var shifted: Vector2 = box_c - Vector2(w * 0.5, h * 0.5)
	return _ell_local(shifted, rx, ry, local_rot, ang, center, n)


func _teardrop(rl: float, rs: float, ang: float, pos: Vector2) -> PackedVector2Array:
	var a: PackedVector2Array = _cubic(Vector2(-rl, 0.0), Vector2(-rl * 0.6, -rs), Vector2(rl * 0.25, -rs), Vector2(rl, 0.0), 18)
	var b: PackedVector2Array = _cubic(Vector2(rl, 0.0), Vector2(rl * 0.25, rs), Vector2(-rl * 0.6, rs), Vector2(-rl, 0.0), 18)
	var pts: PackedVector2Array = PackedVector2Array()
	for i in a.size():
		pts.append(_spin(a[i], ang, pos))
	for i in range(1, b.size()):
		pts.append(_spin(b[i], ang, pos))
	return pts


func _xform_ell(local_c: Vector2, rx: float, ry: float, ang: float, pos: Vector2, n: int) -> PackedVector2Array:
	var pts: PackedVector2Array = PackedVector2Array()
	pts.resize(n)
	for i in n:
		var a: float = TAU * float(i) / float(n)
		pts[i] = _spin(local_c + Vector2(cos(a) * rx, sin(a) * ry), ang, pos)
	return pts


func _star(pos: Vector2, rot: float, points: int, outer: float, inner: float) -> PackedVector2Array:
	var pts: PackedVector2Array = PackedVector2Array()
	var n: int = points * 2
	pts.resize(n)
	for i in n:
		var ang: float = float(i) * PI / float(points) - PI * 0.5
		var r: float = outer if i % 2 == 0 else inner
		pts[i] = _spin(Vector2(cos(ang) * r, sin(ang) * r), rot, pos)
	return pts


func _steam_color(s: Dictionary, smoke: bool) -> Color:
	var tint := Color("3f6f8f")
	if s.has("tint"):
		tint = s["tint"] as Color
	return RoomFx.steam_color(tint, smoke)


func _arc(center: Vector2, rx: float, ry: float, rot: float, a0: float, a1: float, n: int) -> PackedVector2Array:
	var pts: PackedVector2Array = PackedVector2Array()
	var steps: int = maxi(2, n)
	pts.resize(steps + 1)
	var cs: float = cos(rot)
	var sn: float = sin(rot)
	for i in steps + 1:
		var a: float = lerpf(a0, a1, float(i) / float(steps))
		var lx: float = cos(a) * rx
		var ly: float = sin(a) * ry
		pts[i] = center + Vector2(cs * lx - sn * ly, sn * lx + cs * ly)
	return pts


func _ellipse_pts(center: Vector2, rx: float, ry: float, n: int, rot: float) -> PackedVector2Array:
	var pts: PackedVector2Array = PackedVector2Array()
	var steps: int = maxi(3, n)
	pts.resize(steps)
	var cs: float = cos(rot)
	var sn: float = sin(rot)
	for i in steps:
		var a: float = TAU * float(i) / float(steps)
		var lx: float = cos(a) * rx
		var ly: float = sin(a) * ry
		pts[i] = center + Vector2(cs * lx - sn * ly, sn * lx + cs * ly)
	return pts


func _stroke(pts: PackedVector2Array, color: Color, width: float, clip: bool = true) -> void:
	if color.a <= 0.004 or width <= 0.0 or pts.size() < 2 or _c == null:
		return
	if not clip:
		_c.draw_polyline(pts, color, width, true)
		return
	for run in _runs(pts):
		var poly: PackedVector2Array = run
		if poly.size() >= 2:
			_c.draw_polyline(poly, color, width, true)


func _runs(pts: PackedVector2Array) -> Array:
	var out: Array = []
	var cur: PackedVector2Array = PackedVector2Array()
	var prev: Vector2 = pts[0]
	var prev_in: bool = _in_mouth(prev)
	if prev_in:
		cur.append(prev)
	for i in range(1, pts.size()):
		var q: Vector2 = pts[i]
		var q_in: bool = _in_mouth(q)
		if prev_in and q_in:
			cur.append(q)
		elif prev_in and not q_in:
			cur.append(_bound(prev, q))
			if cur.size() >= 2:
				out.append(cur.duplicate())
			cur = PackedVector2Array()
		elif (not prev_in) and q_in:
			cur = PackedVector2Array()
			cur.append(_bound(prev, q))
			cur.append(q)
		prev = q
		prev_in = q_in
	if cur.size() >= 2:
		out.append(cur.duplicate())
	return out


func _in_mouth(p: Vector2) -> bool:
	var nx: float = (p.x - _mouth.x) / _rx
	var ny: float = (p.y - _mouth.y) / _ry
	return nx * nx + ny * ny <= 1.0


func _bound(a: Vector2, b: Vector2) -> Vector2:
	var lo: Vector2 = a
	var hi: Vector2 = b
	for _i in 8:
		var mid: Vector2 = (lo + hi) * 0.5
		if _in_mouth(mid) == _in_mouth(a):
			lo = mid
		else:
			hi = mid
	return (lo + hi) * 0.5


func _paint(pts: PackedVector2Array, color: Color) -> void:
	if _c == null or color.a <= 0.004:
		return
	Poly.draw_colored(_c, _clean(pts), color)


func _paint_tex(pts: PackedVector2Array, uvs: PackedVector2Array, tex: Texture2D, modulate: Color) -> void:
	if _c == null or tex == null or pts.size() < 3 or uvs.size() != pts.size():
		return
	var clean := PackedVector2Array()
	var clean_uv := PackedVector2Array()
	for i in pts.size():
		var p: Vector2 = pts[i]
		if clean.is_empty() or clean[clean.size() - 1].distance_squared_to(p) > 0.04:
			clean.append(p)
			clean_uv.append(uvs[i])
	if clean.size() >= 2 and clean[0].distance_squared_to(clean[clean.size() - 1]) < 0.04:
		clean.remove_at(clean.size() - 1)
		clean_uv.remove_at(clean_uv.size() - 1)
	if clean.size() < 3:
		return
	var area := 0.0
	for i in clean.size():
		var a: Vector2 = clean[i]
		var b: Vector2 = clean[(i + 1) % clean.size()]
		area += a.x * b.y - b.x * a.y
	# A clipped chip can collapse into a sliver. Godot's triangulator errors on it.
	if absf(area) < 1.5:
		return
	if Geometry2D.triangulate_polygon(clean).is_empty():
		return
	var cols: PackedColorArray = PackedColorArray()
	cols.resize(clean.size())
	cols.fill(modulate)
	_c.draw_polygon(clean, cols, clean_uv, tex)


func _spin(local: Vector2, ang: float, center: Vector2) -> Vector2:
	var cs: float = cos(ang)
	var sn: float = sin(ang)
	return center + Vector2(cs * local.x - sn * local.y, sn * local.x + cs * local.y)


func _cubic(p0: Vector2, c1: Vector2, c2: Vector2, p1: Vector2, n: int) -> PackedVector2Array:
	var pts: PackedVector2Array = PackedVector2Array()
	pts.resize(n + 1)
	for i in n + 1:
		var t: float = float(i) / float(n)
		var u: float = 1.0 - t
		pts[i] = p0 * (u * u * u) + c1 * (3.0 * u * u * t) + c2 * (3.0 * u * t * t) + p1 * (t * t * t)
	return pts


func _sample(ts: PackedFloat32Array, cols: Array, t: float) -> Color:
	if ts.is_empty():
		return Color(0, 0, 0, 0)
	if t <= ts[0]:
		return cols[0] as Color
	for i in range(1, ts.size()):
		if t <= ts[i]:
			var den: float = ts[i] - ts[i - 1]
			var u: float = 0.0 if den <= 0.0001 else (t - ts[i - 1]) / den
			return (cols[i - 1] as Color).lerp(cols[i] as Color, u)
	return cols[cols.size() - 1] as Color


func _ease(t: float) -> float:
	var u: float = 1.0 - clampf(t, 0.0, 1.0)
	return 1.0 - u * u


func _scale(c: Color, k: float) -> Color:
	return Color(clampf(c.r * k, 0.0, 1.0), clampf(c.g * k, 0.0, 1.0), clampf(c.b * k, 0.0, 1.0), 1.0)


func _whiten(c: Color, t: float) -> Color:
	var out: Color = c.lerp(Color(1, 1, 1, 1), t)
	return Color(out.r, out.g, out.b, 1.0)


func _rgba(c: Color, a: float) -> Color:
	return Color(c.r, c.g, c.b, a)


func _arr(value) -> Array:
	if value is Array:
		return value
	return []


func _as_dict(value) -> Dictionary:
	if value is Dictionary:
		return value
	return {}


func _f(d: Dictionary, k: String) -> float:
	return float(d[k])


func _b(d: Dictionary, k: String) -> bool:
	return bool(d[k])


func _i(d: Dictionary, k: String) -> int:
	return int(d[k])


func _s(d: Dictionary, k: String) -> String:
	return str(d[k])


func _col(d: Dictionary, k: String) -> Color:
	return d[k] as Color


func _rect_norm() -> PackedVector2Array:
	return PackedVector2Array([Vector2(0, 0), Vector2(1, 0), Vector2(1, 1), Vector2(0, 1)])


func _kind_norm(kind: String) -> PackedVector2Array:
	match kind:
		"flower":
			return _flat([0.50, 0.0, 0.63, 0.21, 0.88, 0.12, 0.76, 0.35, 1.0, 0.50, 0.76, 0.65, 0.88, 0.88, 0.63, 0.79, 0.50, 1.0, 0.37, 0.79, 0.12, 0.88, 0.24, 0.65, 0.0, 0.50, 0.24, 0.35, 0.12, 0.12, 0.37, 0.21])
		"thread":
			return _flat([0.38, 0.0, 0.66, 0.04, 0.62, 0.70, 0.74, 1.0, 0.26, 1.0, 0.36, 0.68])
		"leaf":
			return _flat([0.50, 0.0, 0.78, 0.14, 0.96, 0.38, 0.82, 0.72, 0.54, 1.0, 0.22, 0.78, 0.04, 0.42, 0.20, 0.14])
		"petal":
			return _flat([0.50, 0.0, 0.78, 0.10, 1.0, 0.42, 0.80, 0.86, 0.50, 1.0, 0.20, 0.86, 0.0, 0.42, 0.22, 0.10])
		"star":
			return _flat([0.50, 0.0, 0.61, 0.32, 1.0, 0.36, 0.70, 0.58, 0.80, 1.0, 0.50, 0.76, 0.20, 1.0, 0.30, 0.58, 0.0, 0.36, 0.39, 0.32])
		"root":
			return _flat([0.06, 0.48, 0.22, 0.10, 0.48, 0.04, 0.72, 0.18, 0.96, 0.38, 0.78, 0.52, 0.90, 0.88, 0.58, 1.0, 0.28, 0.86, 0.10, 0.72])
		_:
			return PackedVector2Array()


func _nick_norm(nick: int) -> PackedVector2Array:
	match nick:
		0:
			return _flat([0.34, 0.06, 1.0, 0.0, 0.96, 1.0, 0.0, 0.92, 0.0, 0.38])
		1:
			return _flat([0.0, 0.0, 0.68, 0.04, 1.0, 0.36, 1.0, 1.0, 0.06, 0.96])
		2:
			return _flat([0.04, 0.0, 1.0, 0.08, 1.0, 0.64, 0.70, 1.0, 0.0, 1.0])
		3:
			return _flat([0.0, 0.0, 1.0, 0.0, 0.96, 1.0, 0.36, 1.0, 0.0, 0.62])
		_:
			return _flat([0.14, 0.0, 0.86, 0.04, 1.0, 0.22, 0.92, 1.0, 0.08, 0.94, 0.0, 0.28])


func _flat(nums: Array) -> PackedVector2Array:
	var out: PackedVector2Array = PackedVector2Array()
	var i: int = 0
	while i + 1 < nums.size():
		out.append(Vector2(float(nums[i]), float(nums[i + 1])))
		i += 2
	return out


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


func _clip_uv(subj: PackedVector2Array, uvs: PackedVector2Array, clip: PackedVector2Array) -> Array:
	if subj.size() < 3 or uvs.size() != subj.size() or clip.size() < 3:
		return [PackedVector2Array(), PackedVector2Array()]
	var sp: PackedVector2Array = subj
	var su: PackedVector2Array = uvs
	var nclip: int = clip.size()
	for i in nclip:
		var a: Vector2 = clip[i]
		var b: Vector2 = clip[(i + 1) % nclip]
		var ip: PackedVector2Array = sp
		var iu: PackedVector2Array = su
		sp = PackedVector2Array()
		su = PackedVector2Array()
		if ip.is_empty():
			break
		var s: Vector2 = ip[ip.size() - 1]
		var suv: Vector2 = iu[iu.size() - 1]
		for k in ip.size():
			var e: Vector2 = ip[k]
			var euv: Vector2 = iu[k]
			var ein: bool = _inside_edge(e, a, b)
			var sin: bool = _inside_edge(s, a, b)
			if ein:
				if not sin:
					var t: float = _hit_t(s, e, a, b)
					sp.append(s.lerp(e, t))
					su.append(suv.lerp(euv, t))
				sp.append(e)
				su.append(euv)
			elif sin:
				var t2: float = _hit_t(s, e, a, b)
				sp.append(s.lerp(e, t2))
				su.append(suv.lerp(euv, t2))
			s = e
			suv = euv
	return [sp, su]


func _inside_edge(p: Vector2, a: Vector2, b: Vector2) -> bool:
	return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -0.0001


func _in_convex(p: Vector2, clip: PackedVector2Array) -> bool:
	var n: int = clip.size()
	for i in n:
		if not _inside_edge(p, clip[i], clip[(i + 1) % n]):
			return false
	return true


func _hit(s: Vector2, e: Vector2, a: Vector2, b: Vector2) -> Vector2:
	return s.lerp(e, _hit_t(s, e, a, b))


func _hit_t(s: Vector2, e: Vector2, a: Vector2, b: Vector2) -> float:
	var se: Vector2 = e - s
	var ab: Vector2 = b - a
	var den: float = se.x * ab.y - se.y * ab.x
	if absf(den) < 0.0000001:
		return 0.0
	return clampf(((a.x - s.x) * ab.y - (a.y - s.y) * ab.x) / den, 0.0, 1.0)


func _clean(pts: PackedVector2Array) -> PackedVector2Array:
	var out: PackedVector2Array = PackedVector2Array()
	for p in pts:
		if out.is_empty() or out[out.size() - 1].distance_squared_to(p) > 0.04:
			out.append(p)
	if out.size() >= 2 and out[0].distance_squared_to(out[out.size() - 1]) < 0.04:
		out.remove_at(out.size() - 1)
	return out
