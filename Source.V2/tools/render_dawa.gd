## Rebuild tools/dawa_ink.png. ffmpeg drawtext has no Arabic shaping and drew
## three hollow boxes. Godot's text server shapes دوا in Aref Ruqaa (RTL).
## د و ا do not join in Unicode, so the natural render is three pieces: the
## alif sits above the waw's tail, and the dal sits to the right of the waw.
## A downward nudge on the alif and a left nudge on the dal close those two
## gaps. The letter bodies stay apart. Run with a display, not --headless:
## godot --path Source.V2 -s res://tools/render_dawa.gd
extends SceneTree

var _vp: SubViewport
var _n := 0
const FONT_PX := 360

func _initialize() -> void:
	var font := FontFile.new()
	font.load_dynamic_font("/workspace/Source.V2/assets/fonts/ArefRuqaa-Regular.ttf")
	var ts: TextServer = TextServerManager.get_primary_interface()
	var shaped: RID = ts.create_shaped_text(TextServer.DIRECTION_RTL)
	var rids: Array[RID] = font.get_rids()
	ts.shaped_text_add_string(shaped, "دوا", rids, FONT_PX, {}, "ar")
	ts.shaped_text_shape(shaped)
	var glyphs: Array = ts.shaped_text_get_glyphs(shaped)
	var scale := float(FONT_PX) / 240.0
	# Found at 240 px against a natural render of the same string.
	# x: leave alif and waw, pull the dal left until it touches the waw.
	# y: drop the alif onto the waw's tail. Larger pulls swallow the dal.
	var pulls: Array[float] = [0.0, 0.0, -40.0 * scale]
	# 30 px touches at full resolution and opens again once the label is
	# resampled. 40 px overlaps the foot enough that the join stays opaque.
	var ypulls: Array[float] = [40.0 * scale, 0.0, 0.0]
	var scr := GDScript.new()
	scr.source_code = """extends Node2D
var font: Font
var glyphs: Array
var pulls: Array
var ypulls: Array
var font_px: int
func _draw() -> void:
	var ts: TextServer = TextServerManager.get_primary_interface()
	var rid: RID = font.get_rids()[0]
	var x := 40.0
	var y := 400.0
	var i := 0
	for g in glyphs:
		var pull := 0.0
		var yp := 0.0
		if i < pulls.size():
			pull = float(pulls[i])
		if i < ypulls.size():
			yp = float(ypulls[i])
		var off: Vector2 = g.get("offset")
		ts.font_draw_glyph(rid, get_canvas_item(), font_px, Vector2(x + pull, y + yp) + off, int(g.get("index")), Color(1, 1, 1, 1))
		x += float(g.get("advance"))
		i += 1
"""
	scr.reload()
	_vp = SubViewport.new()
	_vp.size = Vector2i(640, 560)
	_vp.transparent_bg = true
	_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(_vp)
	var node := Node2D.new()
	node.set_script(scr)
	node.set("font", font)
	node.set("glyphs", glyphs)
	node.set("pulls", pulls)
	node.set("ypulls", ypulls)
	node.set("font_px", FONT_PX)
	_vp.add_child(node)

func _process(_dt: float) -> bool:
	_n += 1
	if _n < 5:
		return false
	if _vp == null or _vp.get_texture() == null:
		print("no vp")
		quit()
		return true
	var img := _vp.get_texture().get_image()
	var used := img.get_used_rect()
	used = used.grow_individual(8, 8, 8, 8)
	used = used.intersection(Rect2i(0, 0, img.get_width(), img.get_height()))
	var cut := img.get_region(used)
	var path := "/workspace/Source.V2/tools/dawa_ink.png"
	print("saved ", cut.save_png(path), " ", cut.get_size(), " from ", used)
	quit()
	return true
