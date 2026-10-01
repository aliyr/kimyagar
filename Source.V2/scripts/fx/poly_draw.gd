class_name PolyDraw
extends RefCounted
## Skips polygons Godot cannot triangulate. A sliver or a bowtie used to print
## "Invalid polygon data, triangulation failed" from the bottle, the wall spatter,
## and the cauldron painter.


static func kept_polygon(pts: PackedVector2Array) -> PackedVector2Array:
	var clean := PackedVector2Array()
	for p in pts:
		if clean.is_empty() or clean[clean.size() - 1].distance_squared_to(p) > 0.04:
			clean.append(p)
	if clean.size() >= 2 and clean[0].distance_squared_to(clean[clean.size() - 1]) < 0.04:
		clean.remove_at(clean.size() - 1)
	if clean.size() < 3:
		return PackedVector2Array()
	var area := 0.0
	for i in clean.size():
		var a: Vector2 = clean[i]
		var b: Vector2 = clean[(i + 1) % clean.size()]
		area += a.x * b.y - b.x * a.y
	if absf(area) < 0.5:
		return PackedVector2Array()
	if Geometry2D.triangulate_polygon(clean).is_empty():
		return PackedVector2Array()
	return clean


static func draw_colored(c: CanvasItem, pts: PackedVector2Array, color: Color) -> void:
	if c == null or color.a <= 0.004:
		return
	var clean := kept_polygon(pts)
	if clean.size() < 3:
		return
	c.draw_colored_polygon(clean, color)


static func draw_vertex_colors(c: CanvasItem, pts: PackedVector2Array, cols: PackedColorArray) -> void:
	if c == null or pts.size() < 3:
		return
	var clean := PackedVector2Array()
	var kept := PackedColorArray()
	for i in pts.size():
		var p: Vector2 = pts[i]
		if not clean.is_empty() and clean[clean.size() - 1].distance_squared_to(p) <= 0.04:
			continue
		clean.append(p)
		if i < cols.size():
			kept.append(cols[i])
		elif cols.size() > 0:
			kept.append(cols[cols.size() - 1])
		else:
			kept.append(Color.WHITE)
	if clean.size() >= 2 and clean[0].distance_squared_to(clean[clean.size() - 1]) < 0.04:
		clean.remove_at(clean.size() - 1)
		kept.remove_at(kept.size() - 1)
	if clean.size() < 3 or kept.size() != clean.size():
		return
	var area := 0.0
	for i in clean.size():
		var a: Vector2 = clean[i]
		var b: Vector2 = clean[(i + 1) % clean.size()]
		area += a.x * b.y - b.x * a.y
	if absf(area) < 0.5:
		return
	if Geometry2D.triangulate_polygon(clean).is_empty():
		return
	c.draw_polygon(clean, kept)
