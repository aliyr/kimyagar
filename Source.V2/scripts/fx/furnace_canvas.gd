extends Control
## Painterly furnace from Web/src/scene/FurnaceFire.tsx.
## Drawn at the arch size, additive, so the iron grate in the table art shows through.

const GRID_W := 24
const GRID_H := 12
const BUCKETS := 14
const TONGUES := 5
const MAX_EMBERS := 28
const SPRITE_PX := 32

var fire: FireField
var _time := 0.0
var _rng: KimRng
var _sprites: Array = []
var _embers: Array = []
var _phase := PackedFloat32Array()


func setup(field: FireField) -> void:
	fire = field
	_rng = KimRng.new(7)
	mouse_filter = MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	# Additive, no clip shader. Draw UVs on a Control are not the arch, so a
	# discard shader erased every tongue. Gaps stay transparent and the grate
	# in the table art shows through.
	var add := CanvasItemMaterial.new()
	add.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	material = add
	# The iron grate is the table art just under this rect. Unclipped blobs
	# were painting past the arch and hiding it.
	clip_contents = true
	_phase.resize(TONGUES)
	for i in TONGUES:
		_phase[i] = float(i) * 1.7
	_build_sprites()


func tick(dt: float) -> void:
	_time += dt
	_step_embers(dt)
	queue_redraw()


func _fire_color(h: float) -> Color:
	if h > 0.85:
		return Color("f5c542").lerp(Color("fff2c0"), (h - 0.85) / 0.15)
	if h > 0.6:
		return Color("e8802a").lerp(Color("f5c542"), (h - 0.6) / 0.25)
	if h > 0.35:
		return Color("c0392b").lerp(Color("e8802a"), (h - 0.35) / 0.25)
	return Color("7a1f14").lerp(Color("c0392b"), h / 0.35)


func _build_sprites() -> void:
	var n := SPRITE_PX
	var cx := float(n - 1) * 0.5
	for i in BUCKETS:
		var col := _fire_color((float(i) + 0.5) / float(BUCKETS))
		var img := Image.create(n, n, false, Image.FORMAT_RGBA8)
		for y in n:
			for x in n:
				var d := Vector2(float(x) - cx, float(y) - cx).length() / cx
				var a := 0.0
				if d < 0.45:
					a = lerpf(0.9, 0.42, d / 0.45)
				elif d < 1.0:
					a = lerpf(0.42, 0.0, (d - 0.45) / 0.55)
				img.set_pixel(x, y, Color(col.r, col.g, col.b, a))
		_sprites.append(ImageTexture.create_from_image(img))


func _step_embers(dt: float) -> void:
	if fire == null or _rng == null:
		return
	var intensity := fire.intensity
	if intensity > 0.05 and _embers.size() < MAX_EMBERS and _rng.chance(0.06 + intensity * 0.22):
		_embers.append({
			"x": _rng.range(0.3, 0.7),
			"y": _rng.range(0.55, 0.85),
			"vx": _rng.range(-0.05, 0.05),
			"vy": -_rng.range(0.25, 0.55) * (0.6 + intensity * 0.6),
			"life": 0.0,
			"max": _rng.range(0.9, 1.9),
			"size": _rng.range(1.2, 2.6),
		})
	var keep: Array = []
	for item in _embers:
		var e: Dictionary = item
		e["life"] = float(e["life"]) + dt
		e["vx"] = float(e["vx"]) + sin(_time * 6.0 + float(e["y"]) * 20.0) * dt * 0.25
		e["x"] = float(e["x"]) + float(e["vx"]) * dt
		e["y"] = float(e["y"]) + float(e["vy"]) * dt
		if float(e["life"]) < float(e["max"]) and float(e["y"]) > -0.2:
			keep.append(e)
	_embers = keep


func _draw() -> void:
	if fire == null or _sprites.is_empty():
		return
	var intensity := fire.intensity
	if intensity <= 0.001:
		return
	var w := size.x
	var h := size.y
	var cell_w := (w * 0.86) / float(GRID_W)
	var cell_h := (h * 0.78) / float(GRID_H)
	var ox := w * 0.07
	var oy := h * 0.16
	# Every other cell. A 24×12 textured blob grid is the idle-workshop draw
	# spike on a weak iGPU; the larger blob keeps the arch covered.
	var step := 2
	var blob := maxf(cell_w, cell_h) * 2.05 * 1.85
	for y in range(0, GRID_H, step):
		var row := y * GRID_W
		for x in range(0, GRID_W, step):
			var heat: float = fire.heat[row + x]
			if heat < 0.18:
				continue
			var at := Vector2(ox + float(x) * cell_w + cell_w * 0.5, oy + float(y) * cell_h + cell_h * 0.5)
			if not _in_arch(at.x, at.y, w, h):
				continue
			var bucket := mini(BUCKETS - 1, int(minf(1.0, heat) * float(BUCKETS)))
			var sprite: Texture2D = _sprites[bucket]
			draw_texture_rect(sprite, Rect2(at - Vector2(blob, blob) * 0.5, Vector2(blob, blob)), false, Color(1, 1, 1, minf(1.0, heat * 0.85)))
	for i in TONGUES:
		var t := _time * (2.2 + float(i) * 0.37) + _phase[i]
		var cx := w * (0.28 + (float(i) / float(TONGUES - 1)) * 0.44) + sin(t * 1.3) * w * 0.03
		var height := h * (0.28 + 0.34 * intensity) * (0.8 + 0.2 * sin(t * 2.1))
		if i == TONGUES / 2:
			height *= 1.15
		else:
			height *= 0.92
		if _in_arch(cx, h * 0.9, w, h):
			_tongue(cx, h * 0.9, w * (0.05 + 0.025 * intensity), height, sin(t) * w * 0.035, intensity)
	for item in _embers:
		var e: Dictionary = item
		var at := Vector2(float(e["x"]) * w, float(e["y"]) * h)
		if not _in_arch(at.x, at.y, w, h):
			continue
		var k := float(e["life"]) / float(e["max"])
		var fade := 1.0 if k >= 0.15 else k / 0.15
		var a := (1.0 - k) * fade * 0.95
		var col := Color("ffd27a") if k < 0.5 else Color("ff8c3a")
		col.a = a
		draw_circle(at, float(e["size"]) * (w / 160.0), col)


func _tongue(cx: float, base_y: float, half: float, height: float, lean: float, level: float) -> void:
	if height < 2.0:
		return
	var tip := Vector2(cx + lean, base_y - height)
	var left := Vector2(cx - half, base_y)
	var right := Vector2(cx + half, base_y)
	var pts := PackedVector2Array()
	var cols := PackedColorArray()
	var n := 6
	for i in n + 1:
		var u := float(i) / float(n)
		pts.append(_bezier(left, Vector2(cx - half * 1.1, base_y - height * 0.45), Vector2(cx - half * 0.25, base_y - height * 0.75), tip, u))
		cols.append(_flame_stop(1.0 - u, level))
	for i in range(n, -1, -1):
		var u := float(i) / float(n)
		pts.append(_bezier(right, Vector2(cx + half * 1.1, base_y - height * 0.45), Vector2(cx + half * 0.3, base_y - height * 0.75), tip, u))
		cols.append(_flame_stop(1.0 - u, level))
	draw_polygon(pts, cols)


func _flame_stop(from_tip: float, level: float) -> Color:
	var clear := Color(1.0, 0.94, 0.7, 0.0)
	var gold := Color(1.0, 0.745, 0.275, 0.5 * level)
	var orange := Color(0.941, 0.431, 0.118, 0.6 * level)
	var red := Color(0.784, 0.196, 0.078, 0.3 * level)
	if from_tip < 0.35:
		return clear.lerp(gold, from_tip / 0.35)
	if from_tip < 0.75:
		return gold.lerp(orange, (from_tip - 0.35) / 0.4)
	return orange.lerp(red, (from_tip - 0.75) / 0.25)


func _in_arch(x: float, y: float, w: float, h: float) -> bool:
	# furnace__canvas border-radius: 46% 46% 4% 4% / 38% 38% 4% 4%
	if x < 0.0 or y < 0.0 or x > w or y > h:
		return false
	var rx := w * 0.46
	var ry := h * 0.38
	if x < rx and y < ry:
		var dx := (rx - x) / rx
		var dy := (ry - y) / ry
		return dx * dx + dy * dy <= 1.0
	if x > w - rx and y < ry:
		var dx := (x - (w - rx)) / rx
		var dy := (ry - y) / ry
		return dx * dx + dy * dy <= 1.0
	return true


func _bezier(p0: Vector2, p1: Vector2, p2: Vector2, p3: Vector2, t: float) -> Vector2:
	var u := 1.0 - t
	return p0 * u * u * u + p1 * 3.0 * u * u * t + p2 * 3.0 * u * t * t + p3 * t * t * t
