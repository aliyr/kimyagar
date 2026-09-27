class_name FireField
extends RefCounted
## Cellular fire from Web/src/art/flat/kit/fire.ts (24×12 in the furnace).

const TICK := 1.0 / 15.0

var width := 24
var height := 12
var lit := true
var level := 0.7
var intensity := 0.0
var heat: PackedFloat32Array
var _acc := 0.0
var _rng: KimRng
var texture: ImageTexture
var _img: Image


func _init(w: int = 24, h: int = 12, seed: int = 11) -> void:
	width = w
	height = h
	heat = PackedFloat32Array()
	heat.resize(w * h)
	_rng = KimRng.new(seed)
	_img = Image.create(w, h, false, Image.FORMAT_RGBA8)
	texture = ImageTexture.create_from_image(_img)


func set_level(next: float, is_lit: bool) -> void:
	level = clampf(next, 0.0, 1.0)
	lit = is_lit


func warm() -> void:
	intensity = level if lit else 0.0
	for _i in 24:
		_tick()
	_paint()


func update(dt: float) -> void:
	var target := level if lit else 0.0
	var step := dt / 1.2
	var diff := target - intensity
	intensity += signf(diff) * minf(step, absf(diff))
	_acc += dt
	while _acc >= TICK:
		_acc -= TICK
		_tick()
	_paint()


func _tick() -> void:
	var bottom := (height - 1) * width
	for x in width:
		var edge := 1.0 - absf((float(x) - float(width - 1) / 2.0) / (float(width - 1) / 2.0)) * 0.6
		heat[bottom + x] = _rng.range(0.75, 1.1) * intensity * edge if _rng.chance(0.9) else 0.0
	for y in height - 1:
		var below := (y + 1) * width
		for x in width:
			var l: float = heat[below + maxi(0, x - 1)]
			var c: float = heat[below + x]
			var r: float = heat[below + mini(width - 1, x + 1)]
			var v: float = (l + c * 2.0 + r) / 4.0 - _rng.range(0.02, 0.11)
			heat[y * width + x] = 0.0 if v < 0.0 else v


func _color(h: float) -> Color:
	if h > 0.85:
		return _lerp(Color("f5c542"), Color("fff2c0"), (h - 0.85) / 0.15)
	if h > 0.6:
		return _lerp(Color("e8802a"), Color("f5c542"), (h - 0.6) / 0.25)
	if h > 0.35:
		return _lerp(Color("c0392b"), Color("e8802a"), (h - 0.35) / 0.25)
	return _lerp(Color("7a1f14"), Color("c0392b"), h / 0.35)


func _lerp(a: Color, b: Color, t: float) -> Color:
	return a.lerp(b, clampf(t, 0.0, 1.0))


func _paint() -> void:
	_img.fill(Color(0, 0, 0, 0))
	if intensity <= 0.0:
		texture.update(_img)
		return
	for y in height:
		for x in width:
			var h: float = heat[y * width + x]
			if h < 0.1:
				continue
			var c := _color(h)
			c.a = minf(1.0, h * 2.2)
			_img.set_pixel(x, y, c)
	texture.update(_img)
