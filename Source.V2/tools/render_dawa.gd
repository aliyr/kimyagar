## Reference render of دوا in Aref Ruqaa. ffmpeg drawtext does not shape Arabic.
## This uses Godot's text server (RTL, language ar) with no tracking, so the
## letter bodies stay the font's own strokes. bake_flask.py thins that render
## and joins the letters along the baseline. Run with a display, not --headless:
## godot --path Source.V2 -s res://tools/render_dawa.gd
extends SceneTree

var _vp: SubViewport
var _n := 0
const FONT_PX := 400

func _initialize() -> void:
	var font := FontFile.new()
	font.load_dynamic_font("/workspace/Source.V2/assets/fonts/ArefRuqaa-Regular.ttf")
	var ts: TextServer = TextServerManager.get_primary_interface()
	var shaped: RID = ts.create_shaped_text(TextServer.DIRECTION_RTL)
	var rids: Array[RID] = font.get_rids()
	ts.shaped_text_add_string(shaped, "دوا", rids, FONT_PX, {}, "ar")
	ts.shaped_text_shape(shaped)
	var glyphs: Array = ts.shaped_text_get_glyphs(shaped)
	var scr := GDScript.new()
	scr.source_code = """extends Node2D
var font: Font
var glyphs: Array
var font_px: int
func _draw() -> void:
	var ts: TextServer = TextServerManager.get_primary_interface()
	var rid: RID = font.get_rids()[0]
	var x := 80.0
	var y := 460.0
	for g in glyphs:
		var off: Vector2 = g.get(\"offset\")
		ts.font_draw_glyph(rid, get_canvas_item(), font_px, Vector2(x, y) + off, int(g.get(\"index\")), Color(1, 1, 1, 1))
		x += float(g.get(\"advance\"))
"""
	scr.reload()
	_vp = SubViewport.new()
	_vp.size = Vector2i(900, 620)
	_vp.transparent_bg = true
	_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(_vp)
	var node := Node2D.new()
	node.set_script(scr)
	node.set("font", font)
	node.set("glyphs", glyphs)
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
	var used := img.get_used_rect().grow_individual(10, 10, 10, 10)
	used = used.intersection(Rect2i(0, 0, img.get_width(), img.get_height()))
	var cut := img.get_region(used)
	var path := "/workspace/Source.V2/tools/dawa_src.png"
	print("saved ", cut.save_png(path), " ", cut.get_size(), " from ", used)
	quit()
	return true
