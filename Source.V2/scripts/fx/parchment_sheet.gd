extends RefCounted
## Aged alchemy parchment, baked once per kind. A small RGBA image, stretched
## by the overlay. No shader, so an Intel HD 630 only blits it.

static var _cache := {}

const W := 360
const H := 440


static func sheet(kind: String) -> Texture2D:
	if _cache.has(kind):
		return _cache[kind]
	var img := Image.create(W, H, false, Image.FORMAT_RGBA8)
	var bad := kind == "bad"
	var base := Color(0.62, 0.40, 0.24) if bad else Color(0.90, 0.82, 0.66)
	var ink := Color(0.28, 0.16, 0.08, 0.16)
	for y in H:
		for x in W:
			var n := _noise(x, y)
			var n2 := _noise(x / 6, y / 6)
			var edge := _edge(x, y, n2)
			var col := base
			col = col.lerp(Color(0.78, 0.68, 0.48), n * 0.22)
			if kind == "book" and int(y) % 28 == 22 and edge > 18.0:
				col = col.lerp(ink, 0.55)
			if bad and sin(float(x) * 0.08 + float(y) * 0.02) > 0.72 and edge < 40.0:
				col = col.lerp(Color(0.18, 0.08, 0.04), 0.45)
			var char_t := clampf((22.0 - edge) / 22.0, 0.0, 1.0)
			if bad:
				char_t = clampf((34.0 - edge) / 34.0, 0.0, 1.0)
			var char_col := Color(0.10, 0.05, 0.03) if bad else Color(0.28, 0.14, 0.07)
			col = col.lerp(char_col, char_t * (0.92 if bad else 0.75))
			var a := 0.0
			if edge > 0.0:
				a = clampf(edge / (10.0 if bad else 8.0), 0.0, 1.0)
			col.a = a
			img.set_pixel(x, y, col)
	var tex := ImageTexture.create_from_image(img)
	_cache[kind] = tex
	return tex


static func _edge(x: int, y: int, wobble: float) -> float:
	var nx := minf(float(x), float(W - 1 - x))
	var ny := minf(float(y), float(H - 1 - y))
	return minf(nx, ny) + (wobble - 0.5) * 14.0


static func _noise(x: int, y: int) -> float:
	var n := int(x) * 374761393 + int(y) * 668265263
	n = (n ^ (n >> 13)) * 1274126177
	return float(n & 255) / 255.0
