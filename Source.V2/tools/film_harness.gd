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
var _live_outside_hard := 0
var _live_haze := -1
var _live_pop := 0
var _live_wait := 0
var _live_pos := 0.0
var _live_size := 0.0
var _live_rot := 0.0
var _flow_phase := "boot"
var _flow_wait := 0
var _flow_empty: Image
var _flow_prev: Image
var _flow_hist: Array = []
var _flow_xors: Array[int] = []
var _flow_bright := 0
var _flow_scoop_xor := 0
var _flow_mat := 0
var _flow_end := 0
var _flow_graw: Array[int] = []
var _flow_gmat: Array[int] = []
var _flow_graw_max := 0
var _flow_gmat_max := 0
var _flow_gmat_at := 0.0
var _flow_rd: Array[int] = []
var _flow_rd_max := 0
var _flow_rs: Array[int] = []
var _flow_rs_max := 0
var _flow_dropxor: Array[int] = []
var _flow_drop_max := 0
var _flow_drop_left := 0
var _flow_rgb_prev := PackedByteArray()
var _flow_tail := -1
var _flow_tail_max := 0
var _flow_tail_vals: Array[int] = []
var _flow_surf := -1.0
var _flow_rd_d: Array[int] = []
var _flow_rs_d: Array[int] = []
var _flow_drop_d: Array[int] = []
var _flow_chip_rgb := Vector3.ZERO
var _flow_box_rgb := Vector3.ZERO
var _flow_cornered := false
var _span_lum: Array = []
var _span_pose: Array = []
var _span_rgb: Array = []
var _fps_sum := 0.0
var _fps_n := 0
var _grind_draw_sum := 0.0
var _grind_draw_n := 0
var _spoon_draw_sum := 0.0
var _spoon_draw_n := 0
var _piece_nz := 0
var _piece_samples := 0
var _piece_worst := 0
var _piece_ring := 0
var _draw_sum := 0.0
var _draw_n := 0
var _flow_haze := 0
var _flow_haze2 := 0
var _flow_pour: Array[int] = []
var _flow_ribbon: Array[int] = []
var _flow_ribbon_n := 0
var _flow_pourk: Array[float] = []
var _flow_land := Vector2.ZERO
var _flow_pour_prev: Image
var _flow_level_bright := 0.0
var _flow_saved_grind := false
var _flow_saved_scoop := false
var _flow_lum_prev := PackedByteArray()
var _flow_lum_hist: Array = []
var _flow_pose_hist: Array = []
var _flow_pose_prev: Dictionary = {}
var _flow_empty_lum := PackedByteArray()
var _flow_empty_cover := PackedByteArray()
var _flow_grind_max := 0
var _flow_grind_at := 0.0
var _flow_still_xor := 0
var _flow_spoon_at := Vector2(-9999, -9999)
var _flow_pour_lum := PackedByteArray()
var _flow_aside_lum := PackedByteArray()
var _flow_aside_snap: Dictionary = {}
var _flow_bright115 := 0
var _flow_excess := 0.0
var _flow_spoon_px := 0
var _flow_pestle_px := 0
var _flow_scoop_level := 0.0
var _snap: Dictionary = {}
var _tex_ready := false
var _spoon_rgba := PackedByteArray()
var _pestle_bank: Array[PackedByteArray] = []
var _spoon_dist := PackedByteArray()
var _pestle_dist: Array[PackedByteArray] = []
var _flow_grind_travel := 0.0
var _flow_mouth := Vector2.ZERO
var _flow_mouth_r := Vector2(200.0, 40.0)


func setup(shot: String) -> void:
	if "flow" in shot:
		kind = "flow"
	elif "live" in shot:
		kind = "live"
	elif shot.begins_with("grind"):
		kind = "grind"
	elif shot.begins_with("stir"):
		kind = "stir"
	else:
		kind = "spoon"


func adjust_dt(dt: float, shot_frames: int) -> float:
	if kind == "live" or kind == "flow":
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
	if kind == "live" or kind == "flow":
		var kinds_env := OS.get_environment("KIM_FLOW_KINDS")
		if kinds_env != "":
			var picked: Array[String] = []
			for part in kinds_env.split(","):
				var name := part.strip_edges()
				if name != "":
					picked.append(name)
			if not picked.is_empty():
				_live_ings = picked
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
	if kind == "flow":
		host.workshop.hold_sim = false
		frames.append({"name": "flow", "i": 0})
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
	if kind == "flow":
		_flow_frame(host)
		return
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
	_live_outside_hard = maxi(_live_outside_hard, _shell_leak_at(img, ox, 0.55))
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
		var left_hard := _shell_leak_at(img, ox, 0.55)
		_live_empty.save_jpg(str(host._shot_out) + "/empty-full.jpg", 0.85)
		img.save_jpg(str(host._shot_out) + "/final-full.jpg", 0.85)
		print("LIVE done outside %s outside_hard %s haze %s redrop_pop %s tail %s tail_hard %s %s" % [_live_outside, _live_outside_hard, _live_haze, _live_pop, left, left_hard, _motion_line(host)])
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
	return _shell_leak_at(img, ox, 0.20)


func _shell_leak_at(img: Image, ox: int, thresh: float) -> int:
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
			if _pix_delta(img, _live_empty, x, y) > thresh:
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


func _flow_frame(host) -> void:
	if host._shot_frames < 6:
		_flow_snap(host)
		return
	var img: Image = host.get_viewport().get_texture().get_image()
	var ox := 240 if img.get_width() >= 2300 else 0
	_fps_sum += Engine.get_frames_per_second()
	_fps_n += 1
	var draws := float(Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME))
	_draw_sum += draws
	_draw_n += 1
	if _flow_phase == "grind":
		_grind_draw_sum += draws
		_grind_draw_n += 1
	elif _flow_phase == "scoop":
		_spoon_draw_sum += draws
		_spoon_draw_n += 1
	if _flow_phase == "boot":
		_flow_load_tex()
		_flow_empty = img.duplicate()
		var empty_crop := _bowl_crop(img, ox)
		_flow_empty_lum = _luma_bytes(empty_crop)
		_flow_empty_cover = _pestle_cover(empty_crop, _crop_origin(ox), _snap)
		_debug_pivots(host)
		_flow_begin(host)
		_flow_phase = "drop"
		_flow_wait = 0
		_reset_kind_metrics()
		_seed_span(img, ox)
		_flow_snap(host)
		return
	if _flow_drop_left > 0 and (_flow_phase == "drop" or _flow_phase == "grind"):
		_span_push(_bowl_crop(img, ox), _crop_origin(ox), _flow_dropxor, 2, _flow_drop_d)
		_flow_drop_left -= 1
		if _flow_drop_left == 0:
			_flow_drop_max = _max_of(_flow_dropxor)
			_span_lum = []
			_span_pose = []
	if _flow_phase == "drop":
		_flow_wait += 1
		if not _flow_cornered and _flow_wait >= 2 and _flow_pieces_opaque(host):
			_flow_box_rgb = _chip_box(img, ox)
			_flow_chip_rgb = _flow_box_rgb
			_piece_probe(host, img, ox)
			_flow_write(host, img, "drop-%s" % _live_ings[_live_mat])
			_flow_cornered = true
		if _flow_wait >= 2:
			_flow_haze = _flow_gap(img, ox, host)
			if host.workshop._pile != null:
				var vis_n := 0
				for chip_v in host.workshop._pile.presentation():
					if float(chip_v.get("vis_alpha", 0.0)) >= 0.8:
						vis_n += 1
				var surf := -1.0
				if host.workshop._pile.has_method("surface_k"):
					surf = float(host.workshop._pile.surface_k())
				print("DROP %s haze %s opaque %s surf %.3f" % [_live_ings[_live_mat], _flow_haze, vis_n, surf])
			if OS.get_environment("KIM_FLOW_STOP") == "drop":
				print("R20B %s corners %s/%s worst %s ring %s" % [
					_live_ings[_live_mat], _piece_nz, _piece_samples, _piece_worst, _piece_ring,
				])
				print("FILM done flow")
				host.get_tree().quit(0)
				return
			_flow_phase = "grind"
			_flow_wait = 0
			_flow_hist = []
			_flow_xors = []
			_flow_lum_hist = []
			_flow_pose_hist = []
			_flow_grind_max = 0
			_flow_grind_at = 0.0
			_flow_pestle_px = 0
			_flow_prev = img
			_flow_saved_grind = false
			if host.workshop._pile != null:
				host.workshop._pile.motion_reset()
		_flow_snap(host)
		return
	if _flow_phase == "grind":
		if not _flow_cornered and _flow_pieces_opaque(host):
			_flow_box_rgb = _chip_box(img, ox)
			_flow_chip_rgb = _flow_box_rgb
			_piece_probe(host, img, ox)
			_flow_write(host, img, "drop-%s" % _live_ings[_live_mat])
			_flow_cornered = true
		_note_motion(host)
		var grind_before := _flow_grind_max
		_flow_count_grind(_bowl_crop(img, ox), _crop_origin(ox))
		if _flow_grind_max > grind_before and host.workshop._pile != null:
			print("GMAX %s work %.2f chips %s bed %.3f vis %.3f" % [_flow_grind_max, _flow_grind_at, host.workshop._pile.chips().size(), host.workshop._pile.bed_coverage(), host.workshop._pile.visual_progress()])
		var u := clampf(_mortar_work() / 3.6, 0.0, 1.0)
		if not _flow_saved_grind and u >= 0.45:
			_flow_saved_grind = true
			_flow_write(host, img, "grind-%s" % _live_ings[_live_mat])
			_flow_pestle_px = _count_role(_bowl_crop(img, ox), _crop_origin(ox), _snap, false)
		if u >= 0.995 and _flow_wait > 30:
			_flow_phase = "tap"
		if _flow_wait % 90 == 0:
			print("TICK grind %s u %.2f med %s max %s" % [_live_ings[_live_mat], u, _median(_flow_xors), _flow_grind_max])
		_flow_wait += 1
		_flow_prev = img
		_flow_snap(host)
		return
	if _flow_phase == "tap":
		host.workshop._on_mortar_tap()
		_flow_phase = "scoop"
		_flow_wait = 0
		_flow_mat = 0
		_flow_end = 0
		_flow_bright = 0
		_flow_bright115 = 0
		_flow_excess = 0.0
		_flow_scoop_xor = 0
		_flow_scoop_level = 0.0
		_flow_still_xor = 0
		_flow_level_bright = 0.0
		_flow_pour = []
		_flow_ribbon = []
		_flow_pourk = []
		_flow_pour_lum = PackedByteArray()
		_flow_aside_lum = PackedByteArray()
		_flow_aside_snap = {}
		_flow_lum_prev = PackedByteArray()
		_flow_pose_prev = {}
		_flow_spoon_at = Vector2(-9999, -9999)
		_flow_spoon_px = 0
		_flow_saved_scoop = false
		_flow_prev = img
		_flow_snap(host)
		return
	if _flow_phase == "scoop":
		_flow_wait += 1
		var level := float(_snap.get("level", 1.0))
		var phase := str(_snap.get("phase", ""))
		if _flow_surf < 0.0 and phase == "scoop" and level <= 0.14 and level >= 0.09 and host.workshop._pile != null and host.workshop._pile.has_method("surface_k"):
			_flow_surf = float(host.workshop._pile.surface_k())
		var at := Vector2(float(_snap.get("x", 0.0)), float(_snap.get("y", 0.0)))
		var moved := at.distance_to(_flow_spoon_at)
		_flow_spoon_at = at
		if phase != "pour" and phase != "exit":
			_flow_count_scoop(_bowl_crop(img, ox), _crop_origin(ox), moved, phase, level)
		if not _flow_saved_scoop and level <= 0.55 and level >= 0.45 and (phase == "dip" or phase == "scoop"):
			_flow_saved_scoop = true
			_flow_write(host, img, "scoop-%s" % _live_ings[_live_mat])
			_flow_spoon_px = _count_role(_bowl_crop(img, ox), _crop_origin(ox), _snap, true)
			print("MASK %s spoon_in %s pestle_in %s" % [_live_ings[_live_mat], _flow_spoon_px, _flow_pestle_px])
		var prect := Rect2i(760 + ox, 430, 520, 280)
		prect = prect.intersection(Rect2i(0, 0, img.get_width(), img.get_height()))
		var pour_img := img.get_region(prect)
		if phase == "pour" and _flow_pour.is_empty():
			var stage := Vector2(float(_snap.get("stage_ox", 0.0)), 0.0)
			_flow_mouth = host.workshop._mouth + stage
			_flow_mouth_r = host.workshop._mouth_r
			if host.workshop._transfer != null:
				_flow_land = host.workshop._transfer.land + stage
			print("MOUTH ", _flow_mouth, " r ", _flow_mouth_r)
		if phase == "pour" and _flow_pour.size() < 20:
			var pxor := _flow_rect_delta(pour_img, Vector2(prect.position))
			_flow_pour.append(pxor)
			_flow_ribbon.append(_flow_ribbon_n)
			_flow_pourk.append(float(_snap.get("pouring", 0.0)))
			if _flow_pour.size() == 1 or _flow_pour.size() == 6 or _flow_pour.size() == 11 or _flow_pour.size() == 20:
				_flow_write_rect(host, pour_img, "pour-%s-%02d" % [_live_ings[_live_mat], _flow_pour.size() - 1])
		elif phase != "pour":
			_flow_pour_lum = _luma_bytes(pour_img)
		_flow_prev = img
		var ended: bool = host.workshop.transfer_t < 0.0 and _flow_wait > 8
		if ended:
			_flow_phase = "redrop"
			_flow_wait = 0
			_seed_span(img, ox)
			Game.add_classic_unit(_live_ings[_live_mat])
			Game.start_grinding()
		_flow_snap(host)
		return
	if _flow_phase == "redrop":
		_flow_wait += 1
		_span_push(_bowl_crop(img, ox), _crop_origin(ox), _flow_rd, 2, _flow_rd_d)
		if _flow_wait < 2:
			_flow_snap(host)
			return
		if _flow_wait == 2:
			_flow_haze2 = _flow_gap(img, ox, host)
			_flow_write(host, img, "redrop-%s" % _live_ings[_live_mat])
		if _flow_wait < 24:
			_flow_snap(host)
			return
		_flow_rd_max = _max_of(_flow_rd)
		_seed_span(img, ox)
		Game.reset_brew()
		_flow_phase = "rst"
		_flow_wait = 0
		_flow_snap(host)
		return
	if _flow_phase == "rst":
		_flow_wait += 1
		_span_push(_bowl_crop(img, ox), _crop_origin(ox), _flow_rs, 2, _flow_rs_d)
		if _flow_wait < 24:
			_flow_snap(host)
			return
		_flow_rs_max = _max_of(_flow_rs)
		var pour_max := 0
		var pour_txt := ""
		for pv in _flow_pour:
			pour_max = maxi(pour_max, int(pv))
			pour_txt += "%s " % int(pv)
		var line := "FLOW %s haze %s haze2 %s bright %s b115 %s excess %.1f xor %s at %.3f still %s mat %s end %s grind_n %s grind_med %s grind_max %s graw_n %s graw_med %s graw_max %s gmat_n %s gmat_med %s gmat_max %s gmat_at %.2f g_at %.2f g_mv %.1f pour_n %s pour_max %s rd %s rs %s drop %s fps %.2f draws %.1f spoon_in %s pestle_in %s over %s %s" % [
			_live_ings[_live_mat], _flow_haze, _flow_haze2, _flow_bright, _flow_bright115, _flow_excess,
			_flow_scoop_xor, _flow_scoop_level, _flow_still_xor, _flow_mat, _flow_end,
			_flow_xors.size(), _median(_flow_xors), _flow_grind_max,
			_flow_graw.size(), _median(_flow_graw), _flow_graw_max,
			_flow_gmat.size(), _median(_flow_gmat), _flow_gmat_max, _flow_gmat_at,
			_flow_grind_at, _flow_grind_travel, _flow_pour.size(), pour_max,
			_flow_rd_max, _flow_rs_max, _flow_drop_max,
			_fps_sum / maxf(float(_fps_n), 1.0), _draw_sum / maxf(float(_draw_n), 1.0),
			_flow_spoon_px, _flow_pestle_px, Game.overprocessed(), _motion_line(host),
		]
		print(line)
		print("POUR %s %s" % [_live_ings[_live_mat], pour_txt])
		var rib_txt := ""
		for rv in _flow_ribbon:
			rib_txt += "%s " % int(rv)
		print("RIBBON %s %s" % [_live_ings[_live_mat], rib_txt])
		var pk_txt := ""
		for pk in _flow_pourk:
			pk_txt += "%.2f " % float(pk)
		print("POURK %s %s" % [_live_ings[_live_mat], pk_txt])
		print("R20 %s chip %.1f %.1f %.1f box %.1f %.1f %.1f surf %.3f tail_n %s tail_max %s tail %s ghid_n %s ghid_med %s ghid_p90 %s ghid_max %s gpres_med %s gpres_p90 %s gpres_max %s drop3 %s redrop3 %s reset3 %s" % [
			_live_ings[_live_mat], _flow_chip_rgb.x, _flow_chip_rgb.y, _flow_chip_rgb.z, _flow_box_rgb.x, _flow_box_rgb.y, _flow_box_rgb.z, _flow_surf,
			_flow_tail_vals.size(), _flow_tail_max, _fmt_ints(_flow_tail_vals),
			_flow_gmat.size(), _median(_flow_gmat), _p90(_flow_gmat), _flow_gmat_max,
			_median(_flow_graw), _p90(_flow_graw), _flow_graw_max,
			_max_of(_flow_drop_d), _max_of(_flow_rd_d), _max_of(_flow_rs_d),
		])
		print("R20B %s corners %s/%s worst %s ring %s grind_draws %.1f spoon_draws %.1f" % [
			_live_ings[_live_mat], _piece_nz, _piece_samples, _piece_worst, _piece_ring,
			_grind_draw_sum / maxf(float(_grind_draw_n), 1.0),
			_spoon_draw_sum / maxf(float(_spoon_draw_n), 1.0),
		])
		_live_mat += 1
		var flow_n := _live_ings.size()
		var flow_env := OS.get_environment("KIM_FLOW_N")
		if flow_env != "":
			flow_n = mini(_live_ings.size(), int(flow_env))
		if _live_mat >= flow_n:
			print("FILM done flow")
			host.get_tree().quit(0)
			_flow_snap(host)
			return
		_flow_begin(host)
		_flow_phase = "drop"
		_flow_wait = 0
		_reset_kind_metrics()
		_seed_span(img, ox)
		_flow_snap(host)


func _seed_span(img: Image, ox: int) -> void:
	var crop := _bowl_crop(img, ox)
	_span_lum = [_luma_bytes(crop)]
	_span_rgb = [_rgba(crop)]
	_span_pose = [_snap.duplicate(true)]


func _reset_kind_metrics() -> void:
	_flow_mat = 0
	_flow_end = 0
	_flow_graw = []
	_flow_gmat = []
	_flow_graw_max = 0
	_flow_gmat_max = 0
	_flow_gmat_at = 0.0
	_flow_rd = []
	_flow_rd_max = 0
	_flow_rs = []
	_flow_rs_max = 0
	_flow_dropxor = []
	_flow_drop_max = 0
	_flow_drop_left = 24
	_flow_rgb_prev = PackedByteArray()
	_flow_tail = -1
	_flow_tail_max = 0
	_flow_tail_vals = []
	_flow_surf = -1.0
	_flow_rd_d = []
	_flow_rs_d = []
	_flow_drop_d = []
	_flow_chip_rgb = Vector3.ZERO
	_flow_box_rgb = Vector3.ZERO
	_flow_cornered = false
	_span_lum = []
	_span_pose = []
	_span_rgb = []
	_grind_draw_sum = 0.0
	_grind_draw_n = 0
	_spoon_draw_sum = 0.0
	_spoon_draw_n = 0
	_piece_nz = 0
	_piece_samples = 0
	_piece_worst = 0
	_piece_ring = 0


func _max_of(values: Array) -> int:
	var m := 0
	for v in values:
		m = maxi(m, int(v))
	return m


func _span_push(crop: Image, origin: Vector2, bucket: Array, mode: int, drgb_bucket: Array = []) -> void:
	var lum := _luma_bytes(crop)
	var rgba := _rgba(crop)
	_span_lum.append(lum)
	_span_rgb.append(rgba)
	_span_pose.append(_snap.duplicate(true))
	if _span_lum.size() >= 4:
		var cur: PackedByteArray = _span_lum[_span_lum.size() - 1]
		var old: PackedByteArray = _span_lum[_span_lum.size() - 4]
		var pose_now: Dictionary = _span_pose[_span_pose.size() - 1]
		var pose_old: Dictionary = _span_pose[_span_pose.size() - 4]
		var w := crop.get_width()
		var h := crop.get_height()
		bucket.append(_interior_diff(cur, old, w, h, origin, pose_now, pose_old, mode))
		if _span_rgb.size() >= 4:
			var cr: PackedByteArray = _span_rgb[_span_rgb.size() - 1]
			var oraw: PackedByteArray = _span_rgb[_span_rgb.size() - 4]
			drgb_bucket.append(_interior_drgb(cr, oraw, w, h, origin, pose_now, pose_old, mode))
	if _span_lum.size() > 4:
		_span_lum.remove_at(0)
		_span_rgb.remove_at(0)
		_span_pose.remove_at(0)


## mode 0 counts the whole opening, including the pestle. mode 1 drops the pestle
## silhouette. mode 2 also drops the spoon. Dust, shadow, bed, and chunks stay.
func _interior_diff(cur: PackedByteArray, old: PackedByteArray, w: int, h: int, origin: Vector2, pose_now: Dictionary, pose_old: Dictionary, mode: int) -> int:
	var center := origin + Vector2(140.0, 70.0)
	var shift := _cam_delta(pose_now, pose_old)
	var n := 0
	var count := mini(cur.size(), old.size())
	for i in count:
		var x := i % w
		var y := int(i / w)
		if y >= h:
			break
		var prev := _lum_shift(old, w, h, x, y, shift)
		if prev < 0:
			continue
		if absi(int(cur[i]) - prev) < 18:
			continue
		var dx := (float(x) + origin.x - center.x) / 120.0
		var dy := (float(y) + origin.y - center.y) / 56.0
		if dx * dx + dy * dy > 1.0:
			continue
		var vp := origin + Vector2(float(x), float(y))
		var prad := 14.0
		if pose_now.has("head_vp") and pose_old.has("head_vp"):
			prad = maxf(prad, (pose_now["head_vp"] as Vector2).distance_to(pose_old["head_vp"]))
		if mode >= 1 and (_near_pestle(vp, pose_now, prad) or _near_pestle(vp, pose_old, prad)):
			continue
		if mode >= 2 and (_hit_spoon(vp, pose_now) or _hit_spoon(vp, pose_old)):
			continue
		n += 1
	return n


## Whole-interior change. mode 0 keeps the pestle, mode 1 hides it, mode 2 also hides the spoon.
## A pixel counts when the sum of absolute channel deltas is at least 18.
func _interior_drgb(cur: PackedByteArray, old: PackedByteArray, w: int, h: int, origin: Vector2, pose_now: Dictionary, pose_old: Dictionary, mode: int) -> int:
	var center := origin + Vector2(140.0, 70.0)
	var shift := _cam_delta(pose_now, pose_old)
	var sx0 := int(round(shift.x))
	var sy0 := int(round(shift.y))
	var n := 0
	var pixels := w * h
	for i in pixels:
		var x := i % w
		var y := int(i / w)
		var sx := x + sx0
		var sy := y + sy0
		if sx < 0 or sy < 0 or sx >= w or sy >= h:
			continue
		var ic := i * 4
		var io := (sy * w + sx) * 4
		if ic + 2 >= cur.size() or io + 2 >= old.size():
			continue
		var sum := absi(int(cur[ic]) - int(old[io])) + absi(int(cur[ic + 1]) - int(old[io + 1])) + absi(int(cur[ic + 2]) - int(old[io + 2]))
		if sum < 18:
			continue
		var dx := (float(x) + origin.x - center.x) / 120.0
		var dy := (float(y) + origin.y - center.y) / 56.0
		if dx * dx + dy * dy > 1.0:
			continue
		var vp := origin + Vector2(float(x), float(y))
		var prad := 14.0
		if pose_now.has("head_vp") and pose_old.has("head_vp"):
			prad = maxf(prad, (pose_now["head_vp"] as Vector2).distance_to(pose_old["head_vp"]))
		if mode >= 1 and (_near_pestle(vp, pose_now, prad) or _near_pestle(vp, pose_old, prad)):
			continue
		if mode >= 2 and (_hit_spoon(vp, pose_now) or _hit_spoon(vp, pose_old)):
			continue
		n += 1
	return n


func _flow_pieces_opaque(host) -> bool:
	if host.workshop._pile == null:
		return false
	for chip_v in host.workshop._pile.presentation():
		var chip: Dictionary = chip_v
		if str(chip.get("kind", "")) == "dust":
			continue
		if float(chip.get("vis_alpha", 0.0)) >= 0.8:
			return true
	return false


func _flow_begin(host) -> void:
	Game.clear_mortar()
	Game.add_classic_unit(_live_ings[_live_mat])
	Game.start_grinding()
	if host.workshop._pile != null:
		host.workshop._pile.motion_reset()


func _crop_origin(ox: int) -> Vector2:
	return Vector2(414.0 + float(ox) - 140.0, 496.0)


func _flow_load_tex() -> void:
	if _tex_ready:
		return
	var spoon := load("res://assets/art/workshop/wooden_spoon.png") as Texture2D
	if spoon != null:
		_spoon_rgba = _rgba(spoon.get_image())
	_pestle_bank.clear()
	for i in 6:
		var tex := load("res://assets/art/mortar/v3/pestle_%d.png" % (i + 1)) as Texture2D
		if tex == null:
			_pestle_bank.append(PackedByteArray())
		else:
			_pestle_bank.append(_rgba(tex.get_image()))
	_spoon_dist = FileAccess.get_file_as_bytes("/tmp/kim-r18/dist/spoon.u8")
	_pestle_dist.clear()
	for i in 6:
		_pestle_dist.append(FileAccess.get_file_as_bytes("/tmp/kim-r18/dist/pestle_%d.u8" % (i + 1)))
	_tex_ready = true
	print("DIST spoon ", _spoon_dist.size(), " pestle ", _pestle_dist[0].size())


func _flow_snap(host) -> void:
	var w = host.workshop
	var snap := {
		"pestle": false,
		"spoon": false,
		"level": 1.0,
		"phase": "",
		"x": 0.0,
		"y": 0.0,
	}
	var pestle = w._pestle
	if pestle != null and pestle.texture != null and pestle.size.x > 2.0:
		var tex_sz: Vector2 = pestle.texture.get_size()
		var s := minf(pestle.size.x / tex_sz.x, pestle.size.y / tex_sz.y)
		var fitted := tex_sz * s
		var frame := 1
		if w._pile != null:
			frame = int(w._pile.pestle().get("frame", 1))
		snap["pestle"] = true
		snap["inv"] = pestle.get_global_transform().affine_inverse()
		snap["fitted"] = fitted
		snap["inset"] = (pestle.size - fitted) * 0.5
		snap["frame"] = clampi(frame, 1, 6)
		snap["head_vp"] = pestle.get_global_transform() * pestle.pivot_offset
		snap["butt_vp"] = pestle.get_global_transform() * Vector2(pestle.size.x * 0.42, 2.0)
	if w.transfer_t >= 0.0 and w._transfer_draw != null:
		var pose: Dictionary = w._transfer_last
		var phase := str(pose.get("phase", ""))
		var level := float(pose.get("level", 1.0))
		var bury := 100000.0
		if phase == "approach" or phase == "dip" or phase == "scoop":
			bury = minf(MortarPile.pile_surface_y(level), MortarPile.front_lip_y() - 12.0)
		snap["spoon"] = true
		snap["draw_inv"] = w._transfer_draw.get_global_transform().affine_inverse()
		snap["origin"] = Vector2(float(pose.get("x", 0.0)), float(pose.get("y", 0.0)))
		snap["rot"] = deg_to_rad(float(pose.get("rot", 0.0)))
		snap["fade"] = float(pose.get("opacity", 1.0))
		snap["bury"] = bury
		snap["soft"] = minf(bury + 26.0, MortarPile.front_lip_y() - 1.0) if bury < 50000.0 else 100000.0
		snap["level"] = level
		snap["phase"] = phase
		snap["x"] = float(pose.get("x", 0.0))
		snap["y"] = float(pose.get("y", 0.0))
		snap["spoon_vp"] = w._transfer_draw.get_global_transform() * (snap["origin"] as Vector2)
		snap["pouring"] = float(pose.get("pouring", 0.0))
	var cam := Vector2.ZERO
	if w._camera != null:
		cam = w._camera.position
	snap["cam"] = cam
	snap["over"] = Game.overprocessed()
	# The workshop is a 1920 subviewport. On a wider window it is shifted, and
	# node transforms stay in that subviewport while the filmed image does not.
	var stage_ox := 240.0 if host.get_viewport().get_visible_rect().size.x >= 2300.0 else 0.0
	snap["stage_ox"] = stage_ox
	if snap.has("head_vp"):
		snap["head_vp"] = (snap["head_vp"] as Vector2) + Vector2(stage_ox, 0.0)
	if snap.has("butt_vp"):
		snap["butt_vp"] = (snap["butt_vp"] as Vector2) + Vector2(stage_ox, 0.0)
	if snap.has("spoon_vp"):
		snap["spoon_vp"] = (snap["spoon_vp"] as Vector2) + Vector2(stage_ox, 0.0)
	_snap = snap


func _debug_pivots(host) -> void:
	var pestle = host.workshop._pestle
	if pestle != null and bool(_snap.get("pestle", false)):
		var head: Vector2 = pestle.get_global_transform() * pestle.pivot_offset
		head += Vector2(float(_snap.get("stage_ox", 0.0)), 0.0)
		print("PIVOT pestle ", _hit_pestle(head, _snap))
	if bool(_snap.get("spoon", false)):
		var draw = host.workshop._transfer_draw
		var vp: Vector2 = draw.get_global_transform() * (_snap["origin"] as Vector2)
		print("PIVOT spoon ", _hit_spoon(vp, _snap))


func _tex_a(rgba: PackedByteArray, w: int, x: int, y: int) -> int:
	if x < 0 or y < 0 or rgba.is_empty():
		return 0
	var i := (y * w + x) * 4 + 3
	if i < 0 or i >= rgba.size():
		return 0
	return int(rgba[i])


func _stage_local(vp: Vector2, snap: Dictionary) -> Vector2:
	return vp - Vector2(float(snap.get("stage_ox", 0.0)), 0.0)


func _in_pestle_rect(vp: Vector2, snap: Dictionary, pad: float) -> bool:
	if not bool(snap.get("pestle", false)):
		return false
	var local: Vector2 = (snap["inv"] as Transform2D) * _stage_local(vp, snap)
	var fitted: Vector2 = snap["fitted"]
	var inset: Vector2 = snap["inset"]
	var size := fitted + inset * 2.0
	return local.x >= -pad and local.y >= -pad and local.x <= size.x + pad and local.y <= size.y + pad


func _hit_pestle(vp: Vector2, snap: Dictionary) -> bool:
	if not bool(snap.get("pestle", false)):
		return false
	var frame := int(snap.get("frame", 1)) - 1
	if frame < 0 or frame >= _pestle_bank.size():
		return false
	var rgba: PackedByteArray = _pestle_bank[frame]
	var local: Vector2 = (snap["inv"] as Transform2D) * _stage_local(vp, snap)
	var fitted: Vector2 = snap["fitted"]
	var inset: Vector2 = snap["inset"]
	var p := local - inset
	if p.x < 0.0 or p.y < 0.0 or p.x >= fitted.x or p.y >= fitted.y:
		return false
	var tx := int(p.x / fitted.x * 1360.0)
	var ty := int(p.y / fitted.y * 1088.0)
	return _tex_a(rgba, 1360, tx, ty) > 40


func _hit_spoon(vp: Vector2, snap: Dictionary) -> bool:
	if not bool(snap.get("spoon", false)) or _spoon_rgba.is_empty():
		return false
	var local: Vector2 = (snap["draw_inv"] as Transform2D) * _stage_local(vp, snap)
	var bury := float(snap.get("bury", 100000.0))
	if bury < 50000.0 and local.y > float(snap.get("soft", 100000.0)):
		return false
	var origin: Vector2 = snap["origin"]
	var d := local - origin
	var rot := float(snap.get("rot", 0.0))
	var cs := cos(rot)
	var sn := sin(rot)
	var vx := cs * d.x + sn * d.y
	var vy := -sn * d.x + cs * d.y
	var div := (300.0 / 256.0) * (34.0 / 200.0)
	var tx := int(256.0 + vx / div)
	var ty := int(1000.0 + vy / div)
	var a := _tex_a(_spoon_rgba, 512, tx, ty)
	if a <= 8:
		return false
	var fade := float(snap.get("fade", 1.0))
	if bury < 50000.0:
		var u := clampf((local.y - (bury - 4.0)) / 30.0, 0.0, 1.0)
		fade *= 1.0 - u
	return int(float(a) * fade) > 40


func _spoon_tex(vp: Vector2, snap: Dictionary) -> Vector2i:
	if not bool(snap.get("spoon", false)) or _spoon_dist.is_empty():
		return Vector2i(-999, -999)
	var local: Vector2 = (snap["draw_inv"] as Transform2D) * _stage_local(vp, snap)
	var bury := float(snap.get("bury", 100000.0))
	if bury < 50000.0 and local.y > float(snap.get("soft", 100000.0)) + 8.0:
		return Vector2i(-999, -999)
	var origin: Vector2 = snap["origin"]
	var d := local - origin
	var rot := float(snap.get("rot", 0.0))
	var cs := cos(rot)
	var sn := sin(rot)
	var vx := cs * d.x + sn * d.y
	var vy := -sn * d.x + cs * d.y
	var div := (300.0 / 256.0) * (34.0 / 200.0)
	return Vector2i(int(256.0 + vx / div), int(1000.0 + vy / div))


func _near_spoon(vp: Vector2, snap: Dictionary, screen_rad: float) -> bool:
	var t := _spoon_tex(vp, snap)
	if t.x < -100:
		return false
	var div := (300.0 / 256.0) * (34.0 / 200.0)
	var tx := t.x
	var ty := t.y
	var ox := 0
	var oy := 0
	if tx < 0:
		ox = -tx
		tx = 0
	elif tx >= 512:
		ox = tx - 511
		tx = 511
	if ty < 0:
		oy = -ty
		ty = 0
	elif ty >= 1280:
		oy = ty - 1279
		ty = 1279
	var idx := ty * 512 + tx
	if idx < 0 or idx >= _spoon_dist.size():
		return false
	var tex_d := float(_spoon_dist[idx]) + sqrt(float(ox * ox + oy * oy))
	return tex_d * div <= screen_rad


func _pestle_tex(vp: Vector2, snap: Dictionary) -> Vector2i:
	if not bool(snap.get("pestle", false)):
		return Vector2i(-1, -1)
	var local: Vector2 = (snap["inv"] as Transform2D) * _stage_local(vp, snap)
	var fitted: Vector2 = snap["fitted"]
	var inset: Vector2 = snap["inset"]
	var p := local - inset
	if fitted.x < 1.0:
		return Vector2i(-1, -1)
	return Vector2i(int(p.x / fitted.x * 1360.0), int(p.y / fitted.y * 1088.0))


func _near_pestle(vp: Vector2, snap: Dictionary, screen_rad: float) -> bool:
	if _pestle_dist.is_empty() or not bool(snap.get("pestle", false)):
		return _hit_pestle(vp, snap)
	var frame := int(snap.get("frame", 1)) - 1
	if frame < 0 or frame >= _pestle_dist.size():
		return false
	var dist: PackedByteArray = _pestle_dist[frame]
	if dist.is_empty():
		return _hit_pestle(vp, snap)
	var t := _pestle_tex(vp, snap)
	var fitted: Vector2 = snap["fitted"]
	var scale := fitted.x / 1360.0
	var tx := t.x
	var ty := t.y
	var ox := 0
	var oy := 0
	if tx < 0:
		ox = -tx
		tx = 0
	elif tx >= 1360:
		ox = tx - 1359
		tx = 1359
	if ty < 0:
		oy = -ty
		ty = 0
	elif ty >= 1088:
		oy = ty - 1087
		ty = 1087
	var idx := ty * 1360 + tx
	if idx < 0 or idx >= dist.size():
		return false
	var tex_d := float(dist[idx]) + sqrt(float(ox * ox + oy * oy))
	return tex_d * scale <= screen_rad


func _pestle_cover(crop: Image, origin: Vector2, snap: Dictionary) -> PackedByteArray:
	var w := crop.get_width()
	var h := crop.get_height()
	var out := PackedByteArray()
	out.resize(w * h)
	if not bool(snap.get("pestle", false)):
		return out
	for y in h:
		for x in w:
			if _hit_pestle(origin + Vector2(float(x), float(y)), snap):
				out[y * w + x] = 1
	return _dilate_cover(out, w, h)


func _dilate_cover(mask: PackedByteArray, w: int, h: int) -> PackedByteArray:
	var src := mask.duplicate()
	for y in h:
		for x in w:
			if src[y * w + x] == 0:
				continue
			for oy in range(-2, 3):
				var ny := y + oy
				if ny < 0 or ny >= h:
					continue
				for ox in range(-2, 3):
					var nx := x + ox
					if nx < 0 or nx >= w:
						continue
					mask[ny * w + nx] = 1
	return mask


func _ellipse_excess(x: float, y: float, center: Vector2) -> float:
	var dx := x - center.x
	var dy := y - center.y
	var r := sqrt(dx * dx + dy * dy)
	if r < 0.001:
		return -1.0
	var cs := dx / r
	var sn := dy / r
	var rb := (120.0 * 56.0) / sqrt((56.0 * cs) * (56.0 * cs) + (120.0 * sn) * (120.0 * sn))
	return r - rb


func _covered(vp: Vector2, snap: Dictionary) -> bool:
	return _pad_hit(vp, snap)


func _pad_hit(vp: Vector2, snap: Dictionary) -> bool:
	if _hit_spoon(vp, snap) or _hit_pestle(vp, snap):
		return true
	# A two-pixel skirt covers the sprite fringe. Powder farther out still counts.
	var skirt: Array[Vector2] = [
		Vector2(2, 0), Vector2(-2, 0), Vector2(0, 2), Vector2(0, -2),
		Vector2(4, 0), Vector2(-4, 0), Vector2(0, 4), Vector2(0, -4),
	]
	for off in skirt:
		var q: Vector2 = vp + off
		if _hit_spoon(q, snap) or _hit_pestle(q, snap):
			return true
	return false


func _pad_hit_r(vp: Vector2, snap: Dictionary, rad: float) -> bool:
	var r := int(rad)
	var y := -r
	while y <= r:
		var x := -r
		while x <= r:
			if x * x + y * y <= r * r:
				var q := vp + Vector2(float(x), float(y))
				if _hit_spoon(q, snap) or _hit_pestle(q, snap):
					return true
			x += 2
		y += 2
	return false


func _spoon_mask(w: int, h: int, origin: Vector2, snap: Dictionary, rad: int) -> PackedByteArray:
	var hits := PackedByteArray()
	hits.resize(w * h)
	var out := PackedByteArray()
	out.resize(w * h)
	if not bool(snap.get("spoon", false)):
		return out
	for y in h:
		for x in w:
			if _hit_spoon(origin + Vector2(float(x), float(y)), snap):
				hits[y * w + x] = 1
	var step := 1 if rad <= 8 else 2
	for y in h:
		for x in w:
			if hits[y * w + x] == 0:
				continue
			for oy in range(-rad, rad + 1, step):
				var ny := y + oy
				if ny < 0 or ny >= h:
					continue
				for ox in range(-rad, rad + 1, step):
					var nx := x + ox
					if nx < 0 or nx >= w:
						continue
					if ox * ox + oy * oy > rad * rad:
						continue
					out[ny * w + nx] = 1
	var at: Vector2 = snap.get("spoon_vp", Vector2(-99999, -99999))
	for y in h:
		for x in w:
			if origin.distance_squared_to(at - Vector2(float(x), float(y))) <= 46.0 * 46.0:
				out[y * w + x] = 1
	return out


func _flow_raw(host, name: String) -> String:
	var dir := str(host._shot_out) + "/raw"
	if not DirAccess.dir_exists_absolute(dir):
		DirAccess.make_dir_recursive_absolute(dir)
	return dir + "/" + name


func _flow_append(img: Image, path: String) -> void:
	var f := FileAccess.open(path, FileAccess.READ_WRITE)
	if f == null:
		f = FileAccess.open(path, FileAccess.WRITE)
	else:
		f.seek_end()
	if f == null:
		return
	f.store_buffer(_rgba(img))
	f.close()


func _flow_note(host, name: String, text: String) -> void:
	var path := _flow_raw(host, name)
	var f := FileAccess.open(path, FileAccess.READ_WRITE)
	if f == null:
		f = FileAccess.open(path, FileAccess.WRITE)
	else:
		f.seek_end()
	if f == null:
		return
	f.store_string(text)
	f.close()


func _luma_bytes(img: Image) -> PackedByteArray:
	var rgba := _rgba(img)
	var n := img.get_width() * img.get_height()
	var out := PackedByteArray()
	out.resize(n)
	var w := img.get_width()
	for i in n:
		var o := i * 4
		out[i] = int(float(rgba[o]) * 0.299 + float(rgba[o + 1]) * 0.587 + float(rgba[o + 2]) * 0.114)
	return out


func _bowl_diff(a: PackedByteArray, b: PackedByteArray, inside: bool) -> int:
	var n := mini(a.size(), b.size())
	var count := 0
	var limit := 1.15 * 1.15
	for i in n:
		var x := i % 280
		var y := int(i / 280)
		var dx := (float(x) - 140.0) / 120.0
		var dy := (float(y) - 70.0) / 56.0
		var n2 := dx * dx + dy * dy
		if inside:
			if n2 > 1.0:
				continue
		elif n2 <= 1.0 or n2 > limit:
			continue
		if absi(int(a[i]) - int(b[i])) >= 18:
			count += 1
	return count


func _flow_count_grind(crop: Image, origin: Vector2) -> void:
	var lum := _luma_bytes(crop)
	_flow_lum_hist.append(lum)
	_flow_pose_hist.append(_snap.duplicate(true))
	if _flow_lum_hist.size() >= 4:
		var cur: PackedByteArray = _flow_lum_hist[_flow_lum_hist.size() - 1]
		var old: PackedByteArray = _flow_lum_hist[_flow_lum_hist.size() - 4]
		var pose_now: Dictionary = _flow_pose_hist[_flow_pose_hist.size() - 1]
		var pose_old: Dictionary = _flow_pose_hist[_flow_pose_hist.size() - 4]
		var step := _masked_diff(cur, old, crop.get_width(), crop.get_height(), origin, true, pose_now, pose_old)
		_flow_xors.append(step)
		var raw := _interior_diff(cur, old, crop.get_width(), crop.get_height(), origin, pose_now, pose_old, 0)
		var mat := _interior_diff(cur, old, crop.get_width(), crop.get_height(), origin, pose_now, pose_old, 1)
		_flow_graw.append(raw)
		_flow_gmat.append(mat)
		_flow_graw_max = maxi(_flow_graw_max, raw)
		if mat > _flow_gmat_max:
			_flow_gmat_max = mat
			_flow_gmat_at = _mortar_work()
		if step > _flow_grind_max:
			_flow_grind_max = step
			_flow_grind_at = _mortar_work()
			_flow_grind_travel = 0.0
			if pose_now.has("head_vp") and pose_old.has("head_vp"):
				_flow_grind_travel = (pose_now["head_vp"] as Vector2).distance_to(pose_old["head_vp"])
	if _flow_lum_hist.size() > 4:
		_flow_lum_hist.remove_at(0)
		_flow_pose_hist.remove_at(0)


func _flow_count_scoop(crop: Image, origin: Vector2, moved: float, phase: String, level: float) -> void:
	var lum := _luma_bytes(crop)
	var w := crop.get_width()
	var h := crop.get_height()
	var prev_pose: Dictionary = _flow_pose_prev if not _flow_pose_prev.is_empty() else _snap
	if _flow_aside_lum.is_empty() and _flow_wait >= 10 and (phase == "approach" or phase == "dip"):
		# Pestle has moved aside. Later bright pixels are new, not that shadow lifting.
		_flow_aside_lum = lum.duplicate()
		_flow_aside_snap = _snap.duplicate(true)
	if _flow_aside_lum.size() == lum.size() and (phase == "dip" or phase == "scoop" or phase == "carry"):
		var band := _bright_band(lum, w, h, origin, _snap)
		_flow_bright = maxi(_flow_bright, int(band["n"]))
		_flow_bright115 = maxi(_flow_bright115, int(band["n115"]))
		_flow_excess = maxf(_flow_excess, float(band["excess"]))
	if _flow_lum_prev.size() == lum.size() and (phase == "approach" or phase == "dip" or phase == "scoop" or phase == "carry"):
		var step := _masked_diff(lum, _flow_lum_prev, w, h, origin, true, _snap, prev_pose)
		var mat := _interior_diff(lum, _flow_lum_prev, w, h, origin, _snap, prev_pose, 2)
		var rgba := _rgba(crop)
		if _flow_rgb_prev.size() == rgba.size():
			var drgb := _interior_drgb(rgba, _flow_rgb_prev, w, h, origin, _snap, prev_pose, 2)
			if _flow_tail < 0 and phase == "scoop" and level <= 0.14 and level >= 0.09:
				_flow_tail = 31
			if _flow_tail > 0:
				_flow_tail_vals.append(drgb)
				_flow_tail_max = maxi(_flow_tail_max, drgb)
				_flow_tail -= 1
		_flow_rgb_prev = rgba
		if mat > _flow_mat:
			_flow_mat = mat
		if level <= 0.16 and mat > _flow_end:
			_flow_end = mat
		if step > _flow_scoop_xor:
			_flow_scoop_xor = step
			_flow_scoop_level = level
		if moved < 2.0:
			_flow_still_xor = maxi(_flow_still_xor, step)
	_flow_lum_prev = lum
	_flow_pose_prev = _snap.duplicate(true)


func _flow_rect_delta(img: Image, origin: Vector2) -> int:
	var lum := _luma_bytes(img)
	var n := 0
	_flow_ribbon_n = 0
	if _flow_pour_lum.size() == lum.size():
		var w := img.get_width()
		var h := img.get_height()
		var rad := 10.0
		if bool(_snap.get("spoon", false)) and bool(_flow_pose_prev.get("spoon", false)):
			var drot := absf(float(_snap.get("rot", 0.0)) - float(_flow_pose_prev.get("rot", 0.0)))
			rad = clampf(240.0 * drot + 10.0, 12.0, 96.0)
		var psx := 0.0
		var psy := 0.0
		var pn := 0
		var rib := 0
		var lip := _lip_vp(_snap)
		var land := _flow_land
		for y in h:
			for x in w:
				var i := y * w + x
				if absi(int(lum[i]) - int(_flow_pour_lum[i])) < 18:
					continue
				var vp := origin + Vector2(float(x), float(y))
				var on_stream := _seg_dist(vp, lip, land) <= 16.0 and vp.y < _flow_mouth.y - 4.0
				if on_stream and not _near_spoon(vp, _snap, 10.0) and not _near_spoon(vp, _flow_pose_prev, 10.0):
					rib += 1
				if _near_spoon(vp, _snap, rad) or _near_spoon(vp, _flow_pose_prev, rad):
					continue
				# The pot's own surface sits in this rect. The ribbon is the air above the rim.
				if vp.y > _flow_mouth.y - _flow_mouth_r.y * 0.35 and absf(vp.x - _flow_mouth.x) < _flow_mouth_r.x * 1.45:
					continue
				n += 1
				if n <= 4000:
					psx += vp.x
					psy += vp.y
					pn += 1
		_flow_ribbon_n = rib
		if n > 800 and _flow_pour.size() < 6:
			var spoon_at: Vector2 = _snap.get("spoon_vp", Vector2.ZERO)
			print("POURPIX n %s rad %.0f at %.0f,%.0f spoon %.0f,%.0f rib %s" % [n, rad, psx / maxf(1.0, float(pn)), psy / maxf(1.0, float(pn)), spoon_at.x, spoon_at.y, rib])
	_flow_pour_lum = lum
	return n


func _lip_vp(snap: Dictionary) -> Vector2:
	var at: Vector2 = snap.get("spoon_vp", Vector2.ZERO)
	var rad := float(snap.get("rot", 0.0))
	var front := Vector2(-sin(rad), cos(rad))
	var dir := front * 0.75 + Vector2(0.0, 1.0) * 0.45
	if dir.length() < 0.001:
		return at + Vector2(0.0, 30.0)
	return at + dir.normalized() * 30.0


func _seg_dist(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var len2 := ab.length_squared()
	if len2 < 1.0:
		return p.distance_to(a)
	var u := clampf((p - a).dot(ab) / len2, 0.0, 1.0)
	return p.distance_to(a + ab * u)


func _cam_delta(pose_now: Dictionary, pose_old: Dictionary) -> Vector2:
	# The workshop root is a Control. Moving it slides content with the offset,
	# so the older frame's matching pixel is the current one plus (old - now).
	var a: Vector2 = pose_now.get("cam", Vector2.ZERO)
	var b: Vector2 = pose_old.get("cam", Vector2.ZERO)
	return b - a


func _lum_shift(lum: PackedByteArray, w: int, h: int, x: int, y: int, shift: Vector2) -> int:
	var sx := x + int(round(shift.x))
	var sy := y + int(round(shift.y))
	if sx < 0 or sy < 0 or sx >= w or sy >= h:
		return -1
	var i := sy * w + sx
	if i < 0 or i >= lum.size():
		return -1
	return int(lum[i])


func _masked_diff(cur: PackedByteArray, old: PackedByteArray, w: int, h: int, origin: Vector2, inside: bool, pose_now: Dictionary, pose_old: Dictionary) -> int:
	var center := Vector2(origin.x + 140.0, origin.y + 70.0)
	if w != 280:
		center = Vector2(origin.x + float(w) * 0.5, origin.y + 70.0)
	# A hit shake slides the whole bowl. Compare the same world pixel.
	var shift := _cam_delta(pose_now, pose_old)
	var n := 0
	var count := mini(cur.size(), old.size())
	for i in count:
		var x := i % w
		var y := int(i / w)
		if y >= h:
			break
		var prev := _lum_shift(old, w, h, x, y, shift)
		if prev < 0:
			continue
		if absi(int(cur[i]) - prev) < 18:
			continue
		var dx := (float(x) + origin.x - center.x) / 120.0
		var dy := (float(y) + origin.y - center.y) / 56.0
		var n2 := dx * dx + dy * dy
		if inside and n2 > 1.0:
			continue
		var vp := origin + Vector2(float(x), float(y))
		var travel := 0.0
		if pose_now.has("head_vp") and pose_old.has("head_vp"):
			travel = (pose_now["head_vp"] as Vector2).distance_to(pose_old["head_vp"])
		if pose_now.has("butt_vp") and pose_old.has("butt_vp"):
			travel = maxf(travel, (pose_now["butt_vp"] as Vector2).distance_to(pose_old["butt_vp"]))
		if _near_spoon(vp, pose_now, 18.0) or _near_spoon(vp, pose_old, 18.0):
			continue
		if _near_pestle(vp, pose_now, 6.0 + travel) or _near_pestle(vp, pose_old, 6.0 + travel):
			continue
		n += 1
	return n


func _bright_band(lum: PackedByteArray, w: int, h: int, origin: Vector2, snap: Dictionary) -> Dictionary:
	var center := Vector2(414.0 + (origin.x - (414.0 - 140.0)), 566.0)
	# origin is (414+ox-140, 496), so the painted centre is origin + (140, 70).
	center = origin + Vector2(140.0, 70.0)
	var n := 0
	var n115 := 0
	var excess := 0.0
	var sx := 0.0
	var sy := 0.0
	var shift := _cam_delta(snap, _flow_aside_snap)
	for y in h:
		for x in w:
			var i := y * w + x
			if i >= lum.size():
				continue
			var aside := _lum_shift(_flow_aside_lum, w, h, x, y, shift)
			if aside < 0:
				continue
			if int(lum[i]) - aside < 18:
				continue
			var vp := origin + Vector2(float(x), float(y))
			var ex := _ellipse_excess(vp.x, vp.y, center)
			if ex <= 0.4 or ex > 20.0:
				continue
			if _near_spoon(vp, snap, 26.0) or _near_spoon(vp, _flow_aside_snap, 18.0) or _near_pestle(vp, snap, 16.0):
				continue
			n += 1
			sx += vp.x
			sy += vp.y
			var dx := (vp.x - center.x) / 120.0
			var dy := (vp.y - center.y) / 56.0
			if dx * dx + dy * dy <= 1.15 * 1.15:
				n115 += 1
			excess = maxf(excess, ex)
	if n > 40 and n >= _flow_bright:
		var spoon_at: Vector2 = snap.get("spoon_vp", Vector2.ZERO)
		var cols := 14
		var rows := 8
		var grid := PackedInt32Array()
		grid.resize(cols * rows)
		for y2 in h:
			for x2 in w:
				var i2 := y2 * w + x2
				if i2 >= lum.size():
					continue
				var aside2 := _lum_shift(_flow_aside_lum, w, h, x2, y2, shift)
				if aside2 < 0:
					continue
				if int(lum[i2]) - aside2 < 18:
					continue
				var vp2 := origin + Vector2(float(x2), float(y2))
				var ex2 := _ellipse_excess(vp2.x, vp2.y, center)
				if ex2 <= 0.4 or ex2 > 20.0:
					continue
				if _near_spoon(vp2, snap, 26.0) or _near_spoon(vp2, _flow_aside_snap, 18.0) or _near_pestle(vp2, snap, 16.0):
					continue
				var gx := clampi(int(float(x2) / float(w) * float(cols)), 0, cols - 1)
				var gy := clampi(int(float(y2) / float(h) * float(rows)), 0, rows - 1)
				grid[gy * cols + gx] += 1
		var map_txt := ""
		for gy2 in rows:
			var row := ""
			for gx2 in cols:
				var c := grid[gy2 * cols + gx2]
				if c > 12:
					row += "#"
				elif c > 0:
					row += "+"
				else:
					row += "."
			map_txt += row + " "
		print("BRIGHT n %s at %.0f,%.0f spoon %.0f,%.0f cam %s over %s map %s" % [n, sx / float(n), sy / float(n), spoon_at.x, spoon_at.y, shift, snap.get("over", false), map_txt])
	return {"n": n, "n115": n115, "excess": excess}


func _count_role(crop: Image, origin: Vector2, snap: Dictionary, spoon: bool) -> int:
	var w := crop.get_width()
	var h := crop.get_height()
	var center := origin + Vector2(140.0, 70.0)
	var n := 0
	for y in h:
		for x in w:
			var vp := origin + Vector2(float(x), float(y))
			var dx := (vp.x - center.x) / 120.0
			var dy := (vp.y - center.y) / 56.0
			if dx * dx + dy * dy > 1.0:
				continue
			var hit := _hit_spoon(vp, snap) if spoon else _hit_pestle(vp, snap)
			if hit:
				n += 1
	return n


func _flow_write_rect(host, img: Image, label: String) -> void:
	var dir := str(host._shot_out)
	if dir == "":
		dir = "user://film"
	if not DirAccess.dir_exists_absolute(dir):
		DirAccess.make_dir_recursive_absolute(dir)
	var path := "%s/%s.jpg" % [dir, label]
	var err := img.save_jpg(path, 0.86)
	print("FILM ", path, " ", img.get_width(), "x", img.get_height(), " err ", err)


func _flow_push_xor(img: Image, ox: int) -> void:
	_flow_hist.append(_bowl_crop(img, ox))
	if _flow_hist.size() >= 4:
		var cur: Image = _flow_hist[_flow_hist.size() - 1]
		var old: Image = _flow_hist[_flow_hist.size() - 4]
		_flow_xors.append(_crop_xor(cur, old))
	if _flow_hist.size() > 4:
		_flow_hist.remove_at(0)


func _bowl_crop(img: Image, ox: int) -> Image:
	var rect := Rect2i(414 + ox - 140, 496, 280, 150)
	rect = rect.intersection(Rect2i(0, 0, img.get_width(), img.get_height()))
	return img.get_region(rect)


func _flow_bright_px(img: Image, ox: int) -> int:
	if _flow_empty == null:
		return 0
	return _flow_band(img, _flow_empty, ox)


func _flow_band(img: Image, empty: Image, ox: int) -> int:
	var rect := Rect2i(414 + ox - 150, 566 - 72, 300, 150)
	rect = rect.intersection(Rect2i(0, 0, img.get_width(), img.get_height()))
	var ca := img.get_region(rect)
	var cb := empty.get_region(rect)
	var w := ca.get_width()
	var h := ca.get_height()
	if w != cb.get_width() or h != cb.get_height() or w < 2:
		return 0
	var da := _rgba(ca)
	var db := _rgba(cb)
	var n := 0
	var cx := 150
	var cy := 72
	for y in h:
		var dy := (float(y) - float(cy)) / 56.0
		for x in w:
			var dx := (float(x) - float(cx)) / 120.0
			var norm := sqrt(dx * dx + dy * dy)
			if norm <= 1.0 or norm > 1.22:
				continue
			if _byte_luma(da, w, x, y, db) >= 18.0:
				n += 1
	return n


func _crop_xor(a: Image, b: Image) -> int:
	var wa := a.get_width()
	var ha := a.get_height()
	if wa != b.get_width() or ha != b.get_height():
		return 0
	var da := _rgba(a)
	var db := _rgba(b)
	var n := 0
	for y in ha:
		var dy := (float(y) - 70.0) / 56.0
		for x in wa:
			var dx := (float(x) - 140.0) / 120.0
			if dx * dx + dy * dy > 1.0:
				continue
			if _byte_luma(da, wa, x, y, db) >= 18.0:
				n += 1
	return n


func _flow_xor(a: Image, b: Image, ox: int, _limit: float) -> int:
	var crop_a := _bowl_crop(a, ox)
	var crop_b := _bowl_crop(b, ox)
	return _crop_xor(crop_a, crop_b)


func _flow_rect_xor(a: Image, b: Image, ox: int) -> int:
	var rect := Rect2i(760 + ox, 430, 520, 280)
	rect = rect.intersection(Rect2i(0, 0, a.get_width(), a.get_height()))
	var ca := a.get_region(rect)
	var cb := b.get_region(rect)
	var w := ca.get_width()
	var h := ca.get_height()
	if w != cb.get_width() or h != cb.get_height() or w < 2:
		return 0
	var da := _rgba(ca)
	var db := _rgba(cb)
	var n := 0
	for y in h:
		for x in w:
			if _byte_luma(da, w, x, y, db) >= 18.0:
				n += 1
	return n


func _rgba(img: Image) -> PackedByteArray:
	if img.get_format() == Image.FORMAT_RGBA8:
		return img.get_data()
	var copy := img.duplicate()
	copy.convert(Image.FORMAT_RGBA8)
	return copy.get_data()


func _byte_luma(a: PackedByteArray, w: int, x: int, y: int, b: PackedByteArray) -> float:
	var i := (y * w + x) * 4
	var la := float(a[i]) * 0.299 + float(a[i + 1]) * 0.587 + float(a[i + 2]) * 0.114
	var lb := float(b[i]) * 0.299 + float(b[i + 1]) * 0.587 + float(b[i + 2]) * 0.114
	return absf(la - lb)


func _flow_gap(img: Image, ox: int, host) -> int:
	if _flow_empty_lum.is_empty() or host.workshop._pile == null:
		return 0
	var crop := _bowl_crop(img, ox)
	var lum := _luma_bytes(crop)
	var origin := _crop_origin(ox)
	var w := crop.get_width()
	var h := crop.get_height()
	var center := origin + Vector2(140.0, 70.0)
	var polys: Array = []
	for chip_v in host.workshop._pile.presentation():
		var chip: Dictionary = chip_v
		if float(chip.get("vis_alpha", 1.0)) < 0.35:
			continue
		var lay: Dictionary = host.workshop._pile.layout_chip(chip)
		var poly: PackedVector2Array = lay["poly"]
		var scene := PackedVector2Array()
		scene.resize(poly.size())
		for i in poly.size():
			scene[i] = poly[i] + Vector2(MortarPile.ZONE_X + float(ox), MortarPile.ZONE_Y)
		if scene.size() >= 3:
			polys.append(scene)
	var offsets: Array[Vector2] = [
		Vector2.ZERO, Vector2(3, 0), Vector2(-3, 0), Vector2(0, 3), Vector2(0, -3),
		Vector2(2, 2), Vector2(-2, 2), Vector2(2, -2), Vector2(-2, -2),
	]
	var n := 0
	for y in h:
		for x in w:
			var vp := origin + Vector2(float(x), float(y))
			var dx := (vp.x - center.x) / 120.0
			var dy := (vp.y - center.y) / 56.0
			if dx * dx + dy * dy > 0.98:
				continue
			var i := y * w + x
			if i >= lum.size() or i >= _flow_empty_lum.size():
				continue
			if absi(int(lum[i]) - int(_flow_empty_lum[i])) < 18:
				continue
			if i < _flow_empty_cover.size() and _flow_empty_cover[i] != 0:
				continue
			if _pad_hit(vp, _snap):
				continue
			var piece := false
			for poly_v in polys:
				var poly: PackedVector2Array = poly_v
				for off in offsets:
					if Geometry2D.is_point_in_polygon(vp + off, poly):
						piece = true
						break
				if piece:
					break
			if piece:
				continue
			n += 1
	return n


func _luma_delta(a: Image, b: Image, x: int, y: int) -> float:
	if x < 0 or y < 0 or x >= a.get_width() or y >= a.get_height() or x >= b.get_width() or y >= b.get_height():
		return 0.0
	var pa := a.get_pixel(x, y)
	var pb := b.get_pixel(x, y)
	var la := pa.r * 0.299 + pa.g * 0.587 + pa.b * 0.114
	var lb := pb.r * 0.299 + pb.g * 0.587 + pb.b * 0.114
	return absf(la - lb) * 255.0


func _median(values: Array[int]) -> int:
	if values.is_empty():
		return 0
	var copy: Array[int] = values.duplicate()
	copy.sort()
	return copy[copy.size() / 2]


func _p90(values: Array[int]) -> int:
	if values.is_empty():
		return 0
	var copy: Array[int] = values.duplicate()
	copy.sort()
	var i := int(floor(float(copy.size() - 1) * 0.90))
	return copy[clampi(i, 0, copy.size() - 1)]


func _fmt_ints(values: Array[int]) -> String:
	var txt := ""
	var n := mini(values.size(), 31)
	for i in n:
		txt += "%s " % int(values[i])
	return txt


func _chip_box(img: Image, ox: int) -> Vector3:
	if _flow_empty == null:
		return Vector3.ZERO
	var crop := _bowl_crop(img, ox)
	var empty := _bowl_crop(_flow_empty, ox)
	var w := crop.get_width()
	var a := _rgba(crop)
	var b := _rgba(empty)
	var n := 0
	var r := 0.0
	var g := 0.0
	var bl := 0.0
	var pixels := mini(int(a.size() / 4), int(b.size() / 4))
	for i in pixels:
		var o := i * 4
		var sum := absi(int(a[o]) - int(b[o])) + absi(int(a[o + 1]) - int(b[o + 1])) + absi(int(a[o + 2]) - int(b[o + 2]))
		if sum < 30:
			continue
		var x := i % w
		var y := int(i / w)
		var dx := (float(x) - 140.0) / 120.0
		var dy := (float(y) - 70.0) / 56.0
		if dx * dx + dy * dy > 1.0:
			continue
		r += float(a[o])
		g += float(a[o + 1])
		bl += float(a[o + 2])
		n += 1
	if n == 0:
		return Vector3.ZERO
	return Vector3(r / float(n), g / float(n), bl / float(n))


func _piece_probe(host, img: Image, ox: int) -> void:
	_piece_nz = 0
	_piece_samples = 0
	_piece_worst = 0
	_piece_ring = 0
	if _flow_empty == null or host.workshop._pile == null or host.workshop._mortar_fx == null:
		return
	var xf: Transform2D = host.workshop._mortar_fx.get_global_transform()
	var shown: Array = host.workshop._pile.presentation()
	var quads: Array = []
	for chip_v in shown:
		var chip: Dictionary = chip_v
		if float(chip.get("vis_alpha", 1.0)) < 0.8:
			continue
		if str(chip.get("kind", "")) == "dust":
			continue
		var lay: Dictionary = host.workshop._pile.layout_chip(chip)
		var poly: PackedVector2Array = lay["poly"]
		if poly.size() < 3:
			continue
		var pts: Array[Vector2] = []
		var acc := Vector2.ZERO
		for p in poly:
			var g: Vector2 = xf * p
			var at := Vector2(g.x + float(ox), g.y)
			pts.append(at)
			acc += at
		var uvs: PackedVector2Array = lay["uvs"]
		quads.append({"pts": pts, "uvs": uvs, "mid": acc / float(pts.size()), "kind": str(chip.get("kind", "")), "spr": int(chip.get("sprite", -1)), "w": float(lay["w"]), "h": float(lay["h"])})
	var own_nz := 0
	var lap_nz := 0
	var core_n := 0
	var core_r := 0.0
	var core_g := 0.0
	var core_b := 0.0
	for qi in quads.size():
		var quad: Dictionary = quads[qi]
		var pts: Array = quad["pts"]
		var mid: Vector2 = quad["mid"]
		for corner_v in pts:
			var corner: Vector2 = corner_v
			var inward := mid - corner
			if inward.length() < 0.001:
				continue
			inward = inward.normalized()
			for inset in [0.5, 1.0, 2.0]:
				var sample: Vector2 = corner + inward * inset
				if _in_pestle_rect(sample, _snap, 3.0):
					continue
				var delta := _px_delta(img, _flow_empty, sample)
				_piece_samples += 1
				var lap := false
				for qj in quads.size():
					if qj == qi:
						continue
					var other: Array = quads[qj]["pts"]
					if _pt_in_poly(sample, other):
						lap = true
						break
				if delta > 0:
					_piece_nz += 1
					if lap:
						lap_nz += 1
					else:
						own_nz += 1
				if not lap:
					_piece_worst = maxi(_piece_worst, delta)
		var min_p: Vector2 = pts[0]
		var max_p: Vector2 = pts[0]
		for pt_v in pts:
			var pt: Vector2 = pt_v
			min_p.x = minf(min_p.x, pt.x)
			min_p.y = minf(min_p.y, pt.y)
			max_p.x = maxf(max_p.x, pt.x)
			max_p.y = maxf(max_p.y, pt.y)
		var x0 := int(floor(min_p.x)) - 3
		var y0 := int(floor(min_p.y)) - 3
		var x1 := int(ceil(max_p.x)) + 3
		var y1 := int(ceil(max_p.y)) + 3
		for y in range(y0, y1 + 1):
			for x in range(x0, x1 + 1):
				var inside := x >= int(floor(min_p.x)) and x <= int(ceil(max_p.x)) and y >= int(floor(min_p.y)) and y <= int(ceil(max_p.y))
				if inside:
					continue
				var at := Vector2(x, y)
				var covered := false
				for qj2 in quads.size():
					var box: Array = quads[qj2]["pts"]
					var b0: Vector2 = box[0]
					var b1: Vector2 = box[0]
					for bp_v in box:
						var bp: Vector2 = bp_v
						b0.x = minf(b0.x, bp.x)
						b0.y = minf(b0.y, bp.y)
						b1.x = maxf(b1.x, bp.x)
						b1.y = maxf(b1.y, bp.y)
					if at.x >= b0.x and at.x <= b1.x and at.y >= b0.y and at.y <= b1.y:
						covered = true
						break
				if covered:
					continue
				if _in_pestle_rect(at, _snap, 3.0):
					continue
				if _px_delta(img, _flow_empty, at) > 0:
					_piece_ring += 1
		if not _in_pestle_rect(mid, _snap, 3.0):
			var mx := int(floor(mid.x))
			var my := int(floor(mid.y))
			if mx >= 0 and my >= 0 and mx < img.get_width() and my < img.get_height():
				var core := img.get_pixel(mx, my)
				core_r += core.r * 255.0
				core_g += core.g * 255.0
				core_b += core.b * 255.0
				core_n += 1
	if core_n > 0:
		_flow_chip_rgb = Vector3(core_r / float(core_n), core_g / float(core_n), core_b / float(core_n))
	_piece_nz = own_nz
	print("PIECE own ", own_nz, " lap ", lap_nz, " ring ", _piece_ring, " core ", snappedf(_flow_chip_rgb.x, 0.1), " ", snappedf(_flow_chip_rgb.y, 0.1), " ", snappedf(_flow_chip_rgb.z, 0.1))


func _pt_in_poly(pt: Vector2, poly: Array) -> bool:
	var inside := false
	var n := poly.size()
	var j := n - 1
	for i in n:
		var a: Vector2 = poly[i]
		var b: Vector2 = poly[j]
		if ((a.y > pt.y) != (b.y > pt.y)) and (pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x):
			inside = not inside
		j = i
	return inside


func _px_delta(img: Image, empty: Image, at: Vector2) -> int:
	var x := int(floor(at.x))
	var y := int(floor(at.y))
	if x < 0 or y < 0 or x >= img.get_width() or y >= img.get_height():
		return 0
	if x >= empty.get_width() or y >= empty.get_height():
		return 0
	var a := img.get_pixel(x, y)
	var b := empty.get_pixel(x, y)
	var d := int(round(absf(a.r - b.r) * 255.0))
	d = maxi(d, int(round(absf(a.g - b.g) * 255.0)))
	d = maxi(d, int(round(absf(a.b - b.b) * 255.0)))
	return d


func _flow_write(host, img: Image, label: String) -> void:
	var dir := str(host._shot_out)
	if dir == "":
		dir = "user://film"
	if not DirAccess.dir_exists_absolute(dir):
		DirAccess.make_dir_recursive_absolute(dir)
	var ox := 240 if img.get_width() >= 2300 else 0
	var rect := Rect2i(250 + ox, 470, 360, 250)
	rect = rect.intersection(Rect2i(0, 0, img.get_width(), img.get_height()))
	var crop := img.get_region(rect)
	var path := "%s/%s.jpg" % [dir, label]
	var err := crop.save_jpg(path, 0.86)
	print("FILM ", path, " ", crop.get_width(), "x", crop.get_height(), " err ", err)
