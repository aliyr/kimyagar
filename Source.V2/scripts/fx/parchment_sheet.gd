extends RefCounted
## Aged alchemy parchment, baked once per kind. A small RGBA image, stretched
## by the overlay. The burnt edge is a smooth scorched gradient, not a dithered
## alpha fringe. No shader, so an Intel HD 630 only blits it.

static var _cache := {}

const W := 360
const H := 440


static func sheet(kind: String) -> Texture2D:
	if _cache.has(kind):
		return _cache[kind]
	var img := Image.create(W, H, false, Image.FORMAT_RGBA8)
	var bad := kind == "bad"
	var base := Color(0.90, 0.82, 0.66)
	if kind == "card":
		base = Color(0.84, 0.74, 0.56)
	elif bad:
		base = Color(0.62, 0.40, 0.24)
	var ink := Color(0.28, 0.16, 0.08, 1.0)
	var char_col := Color(0.22, 0.09, 0.04) if bad else Color(0.16, 0.07, 0.03)
	for y in H:
		for x in W:
			var n := _noise(x, y)
			var rim := _rim(x, y)
			var col := base.lerp(Color(0.78, 0.68, 0.48), n * 0.18)
			var stain := _noise(x / 17 + 3, y / 19 + 1)
			if stain > 0.72 and rim > 30.0:
				col = col.lerp(Color(0.62, 0.48, 0.28), (stain - 0.72) * 0.9)
			if kind == "book" and int(y) % 28 == 22 and rim > 22.0:
				col = col.lerp(ink, 0.55)
			if bad and sin(float(x) * 0.08 + float(y) * 0.02) > 0.72 and rim > 36.0:
				col = col.lerp(Color(0.18, 0.08, 0.04), 0.45)
			var scorch := clampf((28.0 - rim) / 28.0, 0.0, 1.0)
			scorch = scorch * scorch
			col = col.lerp(char_col, scorch * 0.9)
			var ash := clampf((9.0 - rim) / 9.0, 0.0, 1.0)
			col = col.lerp(Color(0.05, 0.02, 0.01), ash * 0.75)
			var fringe := clampf(rim / 2.8, 0.0, 1.0)
			fringe = fringe * fringe * (3.0 - 2.0 * fringe)
			col.a = fringe
			img.set_pixel(x, y, col)
	var tex := ImageTexture.create_from_image(img)
	_cache[kind] = tex
	return tex


static func _rim(x: int, y: int) -> float:
	var nx := minf(float(x), float(W - 1 - x))
	var ny := minf(float(y), float(H - 1 - y))
	var wobble := sin(float(y) * 0.085) * 2.2 + sin(float(x) * 0.047 + float(y) * 0.019) * 1.5
	return minf(nx, ny) + wobble


static func _noise(x: int, y: int) -> float:
	var n := int(x) * 374761393 + int(y) * 668265263
	n = (n ^ (n >> 13)) * 1274126177
	return float(n & 255) / 255.0
