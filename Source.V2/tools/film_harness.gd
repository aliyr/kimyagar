class_name FilmHarness
extends RefCounted
## Frame-sequence capture for the spoon and stir shots.
## Main only constructs this when --shot=spoon-film or --shot=stir-film is set.

var kind := ""
var frames: Array = []
var index := 0
var armed := false


func setup(shot: String) -> void:
	kind = "stir" if shot.begins_with("stir") else "spoon"


func adjust_dt(dt: float, shot_frames: int) -> float:
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
	Game.add_classic_unit("chamomile")
	Game.start_grinding()
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
	frames.append_array(_span("approach", 0.02, 0.30, 24))
	frames.append_array(_span("dip", 0.36, 0.72, 24))
	frames.append_array(_span("scoop", 0.74, 1.90, 24))
	frames.append_array(_span("carry", 1.94, 2.60, 24))
	frames.append_array(_span("pour", 2.64, 3.48, 24))


func on_frame(host) -> void:
	host._shot_frames += 1
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
		armed = true


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
	print("FILM ", path, " ", img.get_width(), "x", img.get_height(), " spoon ", pose.get("x", 0), ",", pose.get("y", 0), " draws ", draws, " err ", err)
