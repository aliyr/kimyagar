class_name FilmHarness
extends RefCounted
## Frame-sequence capture for the spoon and stir shots.
## Main only constructs this when --shot=spoon-film or --shot=stir-film is set.

var kind := ""
var frames: Array = []
var index := 0
var armed := false
var _live_ings: Array[String] = ["chamomile", "mint", "poppy", "ginger", "borage", "saffron"]
var _live_mat := 0
var _live_phase := "boot"
var _live_saves := 0
var _live_next_u := 0.0
var _live_empty: Image
var _live_prev: Image
var _live_outside := 0
var _live_haze := -1
var _live_pop := 0
var _live_wait := 0
var _live_pos := 0.0
var _live_size := 0.0
var _live_rot := 0.0


func setup(shot: String) -> void:
	if "live" in shot:
		kind = "live"
	elif shot.begins_with("grind"):
		kind = "grind"
	elif shot.begins_with("stir"):
		kind = "stir"
	else:
		kind = "spoon"


func adjust_dt(dt: float, shot_frames: int) -> float:
	if kind == "live":
		return 1.0 / 60.0
	if kind == "stir" and shot_frames >= 6:
		return 1.2 / 24.0
	return dt


func capturing() -> bool:
	return not frames.is_empty()


func prepare(host) -> void:
	host.phase = "workshop"
	host.gate.visible = false
	if kind == "stir":
		var film_brew: Dictionary = Alchemy.create_brew()
		film_brew = Alchemy.add_ingredient(film_brew, "chamomile", 1.0, "fine", Game.defs)
		film_brew = Alchemy.advance_time(film_brew, 16.0, Game.defs)
		film_brew = Alchemy.stir(film_brew, Game.defs)
		Game.brew = film_brew
		host.workshop._spoon_angle = -0.2
		host.workshop._stirring = false
		host._seed_brush_residue()
		host._warm_workshop(0.35)
		return
	if kind == "live":
		Game.clear_mortar()
		return
	Game.add_classic_unit("chamomile")
	Game.start_grinding()
	if kind == "grind":
		host._warm_workshop(0.2)
		host.workshop.jump_grind(0.0)
		return
	Game.apply_grind_work(2.0)
	host._warm_workshop(0.35)
	host.workshop.jump_transfer(0.02)


func arm(host) -> void:
	var shot := str(host._shot)
	if shot.ends_with("-wide"):
		host.get_window().size = Vector2i(2400, 1080)
	if kind == "stir":
		host.workshop._stirring = false
		host.workshop._brew.stir()
		for _i in 36:
			host.workshop._brew.update(1.0 / 60.0)
		host.workshop.hold_sim = false
		for i in 24:
			frames.append({"name": "stir", "i": i, "t": 0.0})
		return
	if kind == "live":
		host.workshop.hold_sim = false
		frames.append({"name": "live", "i": 0})
		return
	if kind == "grind":
		for i in 24:
			var u := float(i) / 23.0
			frames.append({"name": "grind", "i": i, "t": 0.0, "work": u * 3.6})
		return
	frames.append_array(_span("approach", 0.02, 0.30, 24))
	frames.append_array(_span("dip", 0.36, 0.72, 24))
	frames.append_array(_span("scoop", 0.74, 1.90, 24))
	frames.append_array(_span("carry", 1.94, 2.60, 24))
	frames.append_array(_span("pour", 2.64, 3.48, 24))


func on_frame(host) -> void:
	host._shot_frames += 1
	if kind == "live":
		_live_frame(host)
		return
	if host._shot_frames < 6:
		return
	if armed:
		_save(host)
		index += 1
		armed = false
		if index >= frames.size():
			print("FILM done ", frames.size())
			host.get_tree().quit(0)
			return
	if index < frames.size():
		var spec: Dictionary = frames[index]
		if kind == "spoon":
			host.workshop.jump_transfer(float(spec["t"]))
		elif kind == "grind":
			host.workshop.jump_grind(float(spec["work"]))
		armed = true


func _live_frame(host) -> void:
	if host._shot_frames < 6:
		return
	var img: Image = host.get_viewport().get_texture().get_image()
	var ox := 240 if img.get_width() >= 2300 else 0
	if _live_phase == "boot":
		_live_empty = img.duplicate()
		_live_begin(host, _live_ings[0])
		_live_phase = "wait"
		return
	if _live_phase == "wait":
		# The drop was synced after the previous draw. The next image is the drop.
		_live_phase = "arm-drop"
		return
	if _live_phase == "arm-drop":
		# This image is the first draw after the drop.
		_live_haze = _opening_ring(img, ox)
		_live_write(host, img, "drop-%s" % _live_ings[_live_mat], 0)
		_live_phase = "grind"
		_live_prev = img
		return
	_live_outside = maxi(_live_outside, _shell_leak(img, ox))
	_note_motion(host)
	if _live_phase == "grind":
		var u := clampf(_mortar_work() / 3.6, 0.0, 1.0)
		if u + 0.02 >= _live_next_u and _live_saves < 24:
			_live_write(host, img, _live_ings[_live_mat], _live_saves)
			_live_saves += 1
			_live_next_u += 1.0 / 23.0
		if u >= 0.995 and _live_saves >= 24:
			Game.add_classic_unit(_live_ings[_live_mat])
			_live_phase = "redrop"
			_live_wait = 0
			_live_prev = img
		return
	if _live_phase == "redrop":
		_live_wait += 1
		if _live_prev != null:
			_live_pop = maxi(_live_pop, _bowl_pop(img, _live_prev, ox))
		_live_prev = img
		if _live_wait <= 8:
			_live_write(host, img, "redrop-%s" % _live_ings[_live_mat], _live_wait)
		if _live_wait < 24:
			return
		print("LIVE mat ", _live_ings[_live_mat], " ", _motion_line(host))
		_live_mat += 1
		if _live_mat >= _live_ings.size():
			Game.clear_mortar()
			_live_phase = "settle"
			_live_wait = 0
			return
		_live_begin(host, _live_ings[_live_mat])
		_live_phase = "grind"
		_live_saves = 0
		_live_next_u = 0.0
		return
	if _live_phase == "settle":
		_live_wait += 1
		if _live_wait < 130:
			return
		var left := _shell_leak(img, ox)
		print("LIVE done outside %s haze %s redrop_pop %s tail %s %s" % [_live_outside, _live_haze, _live_pop, left, _motion_line(host)])
		print("FILM done live")
		host.get_tree().quit(0)


func _live_begin(host, id: String) -> void:
	Game.clear_mortar()
	Game.add_classic_unit(id)
	Game.start_grinding()
	if host.workshop._pile != null:
		host.workshop._pile.motion_reset()


func _mortar_work() -> float:
	if Game.mortar == null:
		return 0.0
	return float(Game.mortar.get("grindWork", 0.0))


func _note_motion(host) -> void:
	if host.workshop._pile == null:
		return
	var report: Dictionary = host.workshop._pile.motion_report()
	_live_pos = maxf(_live_pos, float(report.get("pos", 0.0)))
	_live_size = maxf(_live_size, float(report.get("size", 0.0)))
	_live_rot = maxf(_live_rot, float(report.get("rot", 0.0)))


func _motion_line(host) -> String:
	return "pos %.3f size %.4f rot %.2f" % [_live_pos, _live_size, _live_rot]


func _live_write(host, img: Image, label: String, i: int) -> void:
	var dir := str(host._shot_out)
	if dir == "":
		dir = "user://film"
	if not DirAccess.dir_exists_absolute(dir):
		DirAccess.make_dir_recursive_absolute(dir)
	var path := "%s/%s-%02d.jpg" % [dir, label, i]
	var ox := 240 if img.get_width() >= 2300 else 0
	var rect := Rect2i(250 + ox, 470, 360, 250)
	rect = rect.intersection(Rect2i(0, 0, img.get_width(), img.get_height()))
	var crop := img.get_region(rect)
	var err := crop.save_jpg(path, 0.82)
	print("FILM ", path, " ", crop.get_width(), "x", crop.get_height(), " err ", err)


func _opening_ring(img: Image, ox: int) -> int:
	if _live_empty == null:
		return 0
	var cx := 414 + ox
	var cy := 566
	var n := 0
	for y in range(cy - 48, cy + 48):
		for x in range(cx - 100, cx + 100):
			var dx := (float(x) - float(cx)) / 120.0
			var dy := (float(y) - float(cy)) / 56.0
			var norm := sqrt(dx * dx + dy * dy)
			if norm < 0.78 or norm > 0.96:
				continue
			if _pix_delta(img, _live_empty, x, y) > 0.16:
				n += 1
	return n


func _shell_leak(img: Image, ox: int) -> int:
	if _live_empty == null:
		return 0
	var cx := 414 + ox
	var cy := 566
	var n := 0
	for y in range(590, 648):
		for x in range(cx - 150, cx + 150):
			var dx := (float(x) - float(cx)) / 120.0
			var dy := (float(y) - float(cy)) / 56.0
			var norm := sqrt(dx * dx + dy * dy)
			if norm < 1.03 or norm > 1.25:
				continue
			var d := _pix_delta(img, _live_empty, x, y)
			if d > 0.20:
				n += 1
	return n


func _bowl_pop(img: Image, prev: Image, ox: int) -> int:
	var cx := 414 + ox
	var cy := 566
	var n := 0
	for y in range(cy - 60, cy + 70):
		for x in range(cx - 130, cx + 130):
			var dx := (float(x) - float(cx)) / 120.0
			var dy := (float(y) - float(cy)) / 56.0
			if dx * dx + dy * dy > 1.0:
				continue
			if _pix_delta(img, prev, x, y) > 0.16:
				n += 1
	return n


func _pix_delta(a: Image, b: Image, x: int, y: int) -> float:
	if x < 0 or y < 0 or x >= a.get_width() or y >= a.get_height():
		return 0.0
	var pa := a.get_pixel(x, y)
	var pb := b.get_pixel(x, y)
	return absf(pa.r - pb.r) + absf(pa.g - pb.g) + absf(pa.b - pb.b)


func _span(phase_name: String, a: float, b: float, n: int) -> Array:
	var out: Array = []
	for i in n:
		var u := float(i) / float(n - 1)
		out.append({"name": phase_name, "i": i, "t": lerpf(a, b, u)})
	return out


func _save(host) -> void:
	var spec: Dictionary = frames[index]
	var dir := str(host._shot_out)
	if dir == "":
		dir = "user://film"
	if not DirAccess.dir_exists_absolute(dir):
		DirAccess.make_dir_recursive_absolute(dir)
	var path := "%s/%s-%02d.jpg" % [dir, str(spec["name"]), int(spec["i"])]
	var img: Image = host.get_viewport().get_texture().get_image()
	var err := img.save_jpg(path, 0.8)
	var pose: Dictionary = host.workshop._transfer_last
	var draws := Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
	var extra := ""
	if kind == "grind" and host.workshop._pile != null:
		var st: Dictionary = host.workshop._pile.chunk_stats()
		extra = " work %.3f chunks %s coarse %s dust %s median %.2f max %.2f area %.2f bed %.4f" % [
			float(spec.get("work", 0.0)), st["n"], st["coarse"], st["dust"], st["median"], st["max"], st["median_area"], host.workshop._pile.bed_coverage(),
		]
	print("FILM ", path, " ", img.get_width(), "x", img.get_height(), " spoon ", pose.get("x", 0), ",", pose.get("y", 0), " draws ", draws, extra, " err ", err)
