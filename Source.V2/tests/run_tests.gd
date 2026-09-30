extends SceneTree
## Headless mirror of the web Vitest logic tests.

var fails := 0
var ran := false
var game
var _shade_phase := 0
var _shade_views: Array = []


func _process(_dt: float) -> bool:
	if not ran:
		ran = true
		game = root.get_node("Game")
		_run()
		if DisplayServer.get_name() == "headless":
			print("SKIP tilt shade render (headless renderer)")
			_finish()
			return true
		_shade_setup()
		return false
	_shade_phase += 1
	# The viewport draws after _process, so the first two ticks only wait.
	if _shade_phase < 3:
		return false
	_shade_check()
	_finish()
	return true


func _finish() -> void:
	for vp in _shade_views:
		if vp is Node and is_instance_valid(vp):
			(vp as Node).free()
	_shade_views.clear()
	if fails == 0:
		print("ALL TESTS PASSED")
		quit(0)
	else:
		print("FAILED %d" % fails)
		quit(1)


func check(cond: bool, msg: String) -> void:
	if cond:
		return
	fails += 1
	push_error("FAIL " + msg)
	print("FAIL ", msg)


func near(a: float, b: float, msg: String, eps: float = 1e-4) -> void:
	check(absf(a - b) <= eps, "%s got %s expected %s" % [msg, a, b])


func _run() -> void:
	_curves()
	_labels()
	_bottle()
	_evaluate_shape()
	_mortar()
	_progress()
	_intro()
	_tilt()
	_quality()
	_format()
	_rng()
	_golden()
	_layout()
	_stage_fit()
	_layers()
	_spoon_motion()
	_bottle_glass()
	_gate_text()
	_round2()
	_round3()
	_round4()


func _fixture_tuning() -> Dictionary:
	return {
		"quantityCurve": [
			{"quantity": 0.5, "factor": 0.6},
			{"quantity": 1.0, "factor": 1.0},
			{"quantity": 1.5, "factor": 1.4},
			{"quantity": 2.0, "factor": 1.7},
			{"quantity": 3.0, "factor": 2.15},
			{"quantity": 4.0, "factor": 2.4},
		],
		"heatExposureRate": {"low": 0.6, "medium": 1.0, "high": 1.6},
		"stageThresholds": {"extracting": 4, "ready": 14, "overprocessed": 42},
		"extractionFraction": {"fresh": 0.35, "extracting": 0.7, "ready": 1.0},
		"tensionCostFactor": 0.08,
		"stirCorrections": [0.15, 0.08, 0.03],
		"instabilityNormalization": 1.4,
		"stabilityQualityCurve": [
			{"stability": 0.9, "modifier": 1.0},
			{"stability": 0.75, "modifier": 0.98},
			{"stability": 0.6, "modifier": 0.93},
			{"stability": 0.45, "modifier": 0.82},
			{"stability": 0.3, "modifier": 0.65},
			{"stability": 0.15, "modifier": 0.4},
		],
		"bandThresholds": {"excellent": 90, "good": 70, "partial": 40},
		"processErrorPenalty": {"fresh": 0.25, "extracting": 0.1, "overprocessed": 0.3},
		"evaluationWeights": {
			"mustHave": 70, "avoid": 30, "preferredBonus": 8, "tagBonus": 6,
			"sideEffectPenaltyPerUnit": 6, "sideEffectFreeThreshold": 0.8,
		},
	}


func _curves() -> void:
	var t := _fixture_tuning()
	near(Alchemy.quantity_factor_for(0.5, t), 0.6, "q0.5")
	near(Alchemy.quantity_factor_for(1.0, t), 1.0, "q1")
	near(Alchemy.quantity_factor_for(1.5, t), 1.4, "q1.5")
	near(Alchemy.quantity_factor_for(2.0, t), 1.7, "q2")
	near(Alchemy.quantity_factor_for(3.0, t), 2.15, "q3")
	near(Alchemy.quantity_factor_for(0.75, t), 0.8, "q0.75")
	near(Alchemy.quantity_factor_for(1.25, t), 1.2, "q1.25")
	near(Alchemy.quantity_factor_for(1.75, t), 1.55, "q1.75")
	near(Alchemy.quantity_factor_for(2.5, t), 1.925, "q2.5")
	near(Alchemy.quantity_factor_for(0.1, t), 0.6, "qclamp lo")
	near(Alchemy.quantity_factor_for(10.0, t), 2.4, "qclamp hi")
	near(Alchemy.interpolate_curve([{"x": 2, "y": 20}, {"x": 0, "y": 0}, {"x": 1, "y": 10}], 0.5), 5.0, "unsorted")
	near(Alchemy.interpolate_curve([{"x": 2, "y": 20}, {"x": 0, "y": 0}, {"x": 1, "y": 10}], 1.5), 15.0, "unsorted 1.5")
	check(Alchemy.stage_of(0.0, t) == "fresh", "stage fresh")
	check(Alchemy.stage_of(4.0, t) == "extracting", "stage extracting edge")
	check(Alchemy.stage_of(14.0, t) == "ready", "stage ready edge")
	check(Alchemy.stage_of(42.0, t) == "overprocessed", "stage burnt edge")
	near(Alchemy.extraction_fraction_at(0.0, t), 0.35, "frac 0")
	near(Alchemy.extraction_fraction_at(4.0, t), 0.7, "frac 4")
	near(Alchemy.extraction_fraction_at(14.0, t), 1.0, "frac 14")
	near(Alchemy.extraction_fraction_at(100.0, t), 1.0, "frac clamp")
	near(Alchemy.smoothstep01(0.0), 0.0, "ss0")
	near(Alchemy.smoothstep01(1.0), 1.0, "ss1")
	near(Alchemy.smoothstep01(0.5), 0.5, "ss.5")
	near(Alchemy.stability_modifier_for(0.9, t), 1.0, "stab 0.9")
	near(Alchemy.stability_modifier_for(0.75, t), 0.98, "stab 0.75")


func _labels() -> void:
	var prop := {"thresholds": {"low": 0.5, "medium": 1.2, "high": 2.2, "veryHigh": 3.2}}
	check(Alchemy.qualitative_level(0.0, prop) == "none", "ql none")
	check(Alchemy.qualitative_level(0.5, prop) == "low", "ql low")
	check(Alchemy.qualitative_level(1.2, prop) == "medium", "ql med")
	check(Alchemy.qualitative_level(2.2, prop) == "high", "ql high")
	check(Alchemy.qualitative_level(3.2, prop) == "very_high", "ql vh")
	check(Alchemy.stability_label_of(0.75) == "stable", "stab label")
	check(Alchemy.stability_label_of(0.55) == "slightly_unstable", "stab label 2")
	check(Alchemy.stability_label_of(0.3) == "unstable", "stab label 3")
	check(Alchemy.stability_label_of(0.29) == "very_unstable", "stab label 4")


func _bottle() -> void:
	var defs := Catalog.load_defs()
	var tuning: Dictionary = defs["tuning"]
	near(Alchemy.quantity_factor_for(6.0, tuning), 2.68, "real curve 6")
	var brew := Alchemy.create_brew()
	brew = Alchemy.set_heat(brew, "low", defs)
	check(brew["currentHeat"] == "low", "heat low")
	check((brew["history"] as Array).size() == 1, "heat history")
	brew = Alchemy.set_heat(brew, "low", defs)
	check((brew["history"] as Array).size() == 1, "heat no-op")
	var id: String = defs["ingredients"][0]["id"]
	brew = Alchemy.add_ingredient(brew, id, 1.0, "fine", defs)
	check((brew["entries"] as Array).size() == 1, "one entry")
	check(brew["entries"][0]["stage"] == "fresh", "fresh at add")
	check(brew["entries"][0]["heatAtEntry"] == "low", "heat at entry")
	var before := float(brew["entries"][0]["contributions"].values()[0])
	brew = Alchemy.advance_time(brew, 20.0, defs)
	check(float(brew["entries"][0]["exposure"]) > 0.0, "exposure grew")
	check(float(brew["entries"][0]["contributions"].values()[0]) >= before - 1e-6, "contribution grew")
	var stirred := Alchemy.stir(Alchemy.stir(Alchemy.stir(Alchemy.stir(brew, defs), defs), defs), defs)
	check(int(stirred["stirCount"]) == 4, "4 stirs")
	near(float(stirred["stirCorrection"]), 0.15 + 0.08 + 0.03, "diminishing stir")
	var potion := Alchemy.bottle(stirred, defs)
	check((potion["history"] as Array)[-1]["type"] == "bottled", "bottled event")
	check(potion["stability"] >= 0.0 and potion["stability"] <= 1.0, "stability range")
	check(potion.has("effectProfile"), "profile")
	var zero := Alchemy.advance_time(brew, 0.0, defs)
	check(zero == brew, "dt 0 identity")


func _evaluate_shape() -> void:
	var defs := Catalog.load_defs()
	var brew := Alchemy.create_brew()
	brew = Alchemy.add_ingredient(brew, "chamomile", 2.0, "fine", defs)
	brew = Alchemy.advance_time(brew, 30.0, defs)
	var potion := Alchemy.bottle(brew, defs)
	var customer: Dictionary = defs["customers"][0]
	var ev := Alchemy.evaluate(potion, customer, defs)
	check(ev["customerId"] == customer["id"], "eval customer")
	check(["excellent", "good", "partial", "failure"].has(ev["band"]), "band")
	check(float(ev["score"]) >= 0.0 and float(ev["score"]) <= 100.0, "score range")
	check(str(ev["reactionFa"]).length() > 0, "reaction")
	near(Alchemy.satisfaction_of(2.0, {"direction": "at_least", "threshold": 1.0}), 1.0, "sat full")
	near(Alchemy.satisfaction_of(0.0, {"direction": "at_least", "threshold": 1.0}), 0.0, "sat zero")


func _mortar() -> void:
	game.start_fresh()
	var a: String = game.defs["ingredients"][0]["id"]
	var b: String = game.defs["ingredients"][1]["id"]
	game.add_classic_unit(a)
	check(is_equal_approx(float(game.mortar["quantity"]), 1.0), "classic 1")
	game.add_classic_unit(a)
	check(is_equal_approx(float(game.mortar["quantity"]), 2.0), "classic 2")
	check(game.mortar["grindState"] == null, "reset grind on add")
	game.apply_grind_work(10.0)
	game.transfer_mortar()
	check(game.mortar["grinding"] == false, "stopped")
	game.add_mortar_to_cauldron()
	check(game.mortar == null, "poured")
	check((game.brew["entries"] as Array).size() == 1, "brew entry")
	check(is_equal_approx(float(game.brew["entries"][0]["quantity"]), 2.0), "qty 2")
	game.reset_brew()
	for _i in 6:
		game.add_classic_unit(a)
	check(is_equal_approx(game.mortar_total_units(), 6.0), "cap 6")
	game.add_classic_unit(b)
	check(is_equal_approx(game.mortar_total_units(), 6.0), "seventh ignored")
	game.clear_mortar()
	game.add_classic_unit(a)
	game.add_classic_unit(b)
	game.apply_grind_work(3.6 * 2.0)
	game.transfer_mortar()
	game.add_mortar_to_cauldron()
	check((game.brew["entries"] as Array).size() == 2, "two pours")
	game.start_fresh()
	game.add_unit_to_mortar(a)
	game.add_unit_to_mortar(a)
	game.add_unit_to_mortar(a)
	game.add_unit_to_mortar(a)
	check(is_equal_approx(float(game.mortar["quantity"]), 3.0), "v2 cap 3")
	game.add_unit_to_mortar(b)
	check(game.mortar["ingredientId"] == b and is_equal_approx(float(game.mortar["quantity"]), 1.0), "replace")
	game.start_fresh()
	game.add_unit_to_mortar(a)
	game.start_grinding()
	var rate := 3.6 / 3.5
	game.tick(1.0 / rate + 0.1)
	check(game.mortar["grindState"] == "coarse", "coarse")
	game.tick((2.2 - 1.0) / rate)
	check(game.mortar["grindState"] == "crushed", "crushed")
	game.tick(3.5)
	check(game.mortar["grindState"] == "fine", "fine")
	check(game.mortar["grinding"] == false, "grind stops at cap")
	game.start_fresh()
	game.add_classic_unit(a)
	game.start_grinding()
	game.open_overlay_action("notebook")
	var work := float(game.mortar["grindWork"])
	game.tick(1.0)
	check(is_equal_approx(float(game.mortar["grindWork"]), work), "paused grind")
	game.close_overlay()
	game.start_fresh()
	check(game.transfer_mortar() == false, "empty transfer")


func _progress() -> void:
	var p := ProgressLogic.with_score(
		{"version": 1, "customerIndex": 3, "discoveredTagIds": ["restful"], "usedIngredientIds": ["mint"], "scoreHistory": [], "bestScore": null, "lastPlayedAt": null},
		{"customerId": "c1", "score": 72, "band": "good", "at": 1000},
	)
	var back := ProgressLogic.parse(ProgressLogic.serialize(p))
	check(int(back["customerIndex"]) == 3, "roundtrip index")
	check(back["discoveredTagIds"][0] == "restful", "roundtrip tag")
	check(is_equal_approx(float(back["scoreHistory"][0]["score"]), 72.0), "roundtrip score")
	check(ProgressLogic.has_progress(back), "has progress")
	check(int(ProgressLogic.parse(null)["customerIndex"]) == 0, "null parse")
	check(int(ProgressLogic.parse("not json")["customerIndex"]) == 0, "garbage")
	check(int(ProgressLogic.parse("42")["customerIndex"]) == 0, "number")
	var newer := ProgressLogic.parse(JSON.stringify({"version": 2, "customerIndex": 9}))
	check(int(newer["customerIndex"]) == 0, "future version")
	var broken := ProgressLogic.parse(JSON.stringify({
		"version": 1,
		"customerIndex": -2,
		"discoveredTagIds": "nope",
		"scoreHistory": [
			{"customerId": "ok", "score": 55, "band": "partial", "at": 5},
			{"customerId": "bad-band", "score": 10, "band": "legendary"},
			{"score": 1, "band": "good"},
		],
	}))
	check(int(broken["customerIndex"]) == 0, "bad index")
	check((broken["discoveredTagIds"] as Array).is_empty(), "bad tags")
	check((broken["scoreHistory"] as Array).size() == 1, "one good row")
	check(is_equal_approx(float(broken["bestScore"]), 55.0), "best")
	var hist := ProgressLogic.empty()
	for i in ProgressLogic.MAX_SCORE_HISTORY + 5:
		hist = ProgressLogic.with_score(hist, {"customerId": "c%d" % i, "score": i, "band": "good", "at": i})
	check((hist["scoreHistory"] as Array).size() == ProgressLogic.MAX_SCORE_HISTORY, "cap")
	check(hist["scoreHistory"][0]["customerId"] == "c5", "oldest dropped")


func _intro() -> void:
	check(Content.time_of_day_for_hour(4) == "dawn", "dawn 4")
	check(Content.time_of_day_for_hour(10) == "dawn", "dawn 10")
	check(Content.time_of_day_for_hour(10.9) == "dawn", "dawn 10.9")
	check(Content.time_of_day_for_hour(11) == "dusk", "dusk 11")
	check(Content.time_of_day_for_hour(18) == "dusk", "dusk 18")
	check(Content.time_of_day_for_hour(19) == "night", "night 19")
	check(Content.time_of_day_for_hour(0) == "night", "night 0")
	check(Content.time_of_day_for_hour(3) == "night", "night 3")
	check(Content.time_of_day_for_hour(25) == "night", "hour 25")
	check(Content.time_of_day_for_hour(-2) == "night", "hour -2")
	check(Content.hour_override("?hour=21") == 21, "override 21")
	check(Content.hour_override("?foo=1&hour=7") == 7, "override mid")
	check(Content.hour_override("?hour=24") == null, "override 24")
	check(Content.hour_override("?hour=abc") == null, "override abc")
	check(Content.hour_override("") == null, "override empty")
	check(Content.hour_from_flag("--hour=6") == 6, "flag 6")
	check(Content.hour_from_flag("--hour=22") == 22, "flag 22")
	check(Content.hour_from_flag("--hour=17") == 17, "flag 17")
	check(Content.hour_from_flag("--hour=24") == null, "flag 24")
	check(Content.hour_from_flag("--hour=abc") == null, "flag abc")
	check(Content.hour_from_flag("--hour=") == null, "flag empty")
	check(Content.SKY["night"]["fireflies"] == true, "flies")
	check(Content.SKY["dusk"]["fireflies"] == false, "no flies dusk")
	check(float(Content.SKY["night"]["passerOpacity"]) > float(Content.SKY["dusk"]["passerOpacity"]), "passer night")
	check(Content.day_of_year_ymd(2026, 1, 1) == 0, "doy jan")
	check(Content.day_of_year_ymd(2026, 2, 1) == 31, "doy feb")
	check(Content.day_of_year_ymd(2026, 12, 31) == 364, "doy dec")
	check(Content.quote_for_date(2026, 5, 10)["lines"][0] == Content.quote_for_date(2026, 5, 10)["lines"][0], "quote stable")
	var seen := {}
	for d in Content.QUOTES.size():
		var q := Content.quote_for_date(2026, 1, 1 + d)
		seen[q["lines"][0]] = true
	check(seen.size() == Content.QUOTES.size(), "quotes cycle")
	check(Content.STAGES.size() == 6, "6 stages")
	check(Content.STAGES[0]["id"] == "shop", "shop")
	check(Content.stage_unlocked(0) and not Content.stage_unlocked(1), "unlock")


func _tilt() -> void:
	check(TiltMath.tilt_mode_for("high", false, false) == "full", "mode full")
	check(TiltMath.tilt_mode_for("medium", false, false) == "lite", "mode lite")
	check(TiltMath.tilt_mode_for("low", false, false) == "flat", "mode flat")
	check(TiltMath.tilt_mode_for("high", true, false) == "off", "mode reduce")
	check(TiltMath.tilt_mode_for("medium", false, true) == "off", "mode latch")
	var pose := {"px": 0.5, "py": -1.0}
	check(TiltMath.rig_transform(pose, "full") == "scale(1.06) rotateX(2deg) rotateY(1.1deg)", "rig " + TiltMath.rig_transform(pose, "full"))
	check(TiltMath.rig_transform(pose, "lite") == TiltMath.rig_transform(pose, "full"), "lite=full")
	check(TiltMath.rig_transform(pose, "flat") == "scale(1.06)", "flat")
	check(TiltMath.rig_transform(pose, "off") == "", "off")
	check(TiltMath.depth_transform({"px": 0.25, "py": -0.5}, 36.0, "full") == "translate3d(9px, -18px, 0)", "depth")
	check(TiltMath.depth_transform({"px": 1.0 / 3.0, "py": 0.0}, 2.0, "lite") == "translate3d(0.667px, 0px, 0)", "depth third " + TiltMath.depth_transform({"px": 1.0 / 3.0, "py": 0.0}, 2.0, "lite"))
	var st := TiltMath.screen_tilt(10.0, 0.0, 0.0, 0.0, 0.0)
	check(is_zero_approx(st["px"]), "deadzone px")
	var pt := TiltMath.pointer_tilt(0.0, 0.0, 100.0, 100.0)
	near(pt["px"], -1.0, "pointer corner")
	var mid := TiltMath.project_mid({"px": 0.2, "py": -0.3}, 400.0, 300.0)
	var back := TiltMath.unproject_mid({"px": 0.2, "py": -0.3}, mid.x, mid.y)
	near(back.x, 400.0, "unproject x", 0.05)
	near(back.y, 300.0, "unproject y", 0.05)
	var w := TiltMath.unproject_work({"px": 0.5, "py": -0.25}, 100.0, 80.0)
	near(w.x, 100.0 - 0.5 * 2.0, "work x")
	near(w.y, 80.0 - (-0.25) * 2.0, "work y")
	near(TiltMath.angle_delta(10.0, 350.0, 360.0), 20.0, "wrap")
	var layer_pose := {"px": 0.4, "py": -0.25}
	var projected := TiltMath.project_mid(layer_pose, 880.0, 420.0)
	var roundtrip := TiltMath.unproject_layer(layer_pose, projected.x, projected.y, 36.0, "full")
	near(roundtrip.x, 880.0, "layer x", 0.05)
	near(roundtrip.y, 420.0, "layer y", 0.05)
	var same := TiltMath.unproject_mid(layer_pose, 1000.0, 400.0)
	var via := TiltMath.unproject_layer(layer_pose, 1000.0, 400.0, 36.0, "full")
	near(via.x, same.x, "mid alias x", 0.0001)
	near(via.y, same.y, "mid alias y", 0.0001)
	var flat_hit := TiltMath.unproject_layer({"px": 0.0, "py": 0.0}, 960.0 + 106.0, 540.0, 0.0, "flat")
	near(flat_hit.x, 1060.0, "flat scale", 0.02)
	var off_hit := TiltMath.unproject_layer({"px": 0.5, "py": 0.5}, 100.0, 80.0, 36.0, "off")
	near(off_hit.x, 100.0, "off x")
	var flag: Variant = TiltMath.pose_from_flag("--tilt=0.6,-0.3")
	check(flag is Vector2, "tilt flag type")
	if flag is Vector2:
		var forced: Vector2 = flag
		near(forced.x, 0.6, "tilt flag x")
		near(forced.y, -0.3, "tilt flag y")
	check(TiltMath.pose_from_flag("--tilt=nope") == null, "tilt flag bad")
	check(TiltMath.pose_from_flag("--tilt=0.6") == null, "tilt flag one")
	check(TiltMath.pose_from_flag("--hour=17") == null, "tilt flag other")
	# Loaded at runtime so this script does not compile TiltDriver before autoloads exist.
	var driver_script: GDScript = load("res://scripts/tilt/tilt_driver.gd")
	check(driver_script != null and driver_script.can_instantiate(), "tilt driver compiles")
	var driver: Node = driver_script.new()
	root.add_child(driver)
	driver.mode = "flat"
	driver.force_pose(0.6, -0.3)
	near(float(driver.px), 0.6, "forced px")
	near(float(driver.py), -0.3, "forced py")
	check(str(driver.mode) == "lite", "forced mode lifts flat")
	driver.set_enabled(false)
	near(float(driver.px), 0.6, "forced pose survives disable")
	driver._drop()
	check(str(driver.mode) == "lite", "forced mode stays dimensional")
	root.remove_child(driver)
	driver.free()
	for shader_path in ["res://shaders/rig_perspective.gdshader", "res://shaders/door_leaf.gdshader"]:
		var src := FileAccess.get_file_as_string(shader_path)
		var frag_at := src.find("void fragment()")
		check(frag_at >= 0, "fragment " + shader_path)
		var frag := src.substr(frag_at)
		check(src.find("varying vec4 modulate_color") >= 0, "varying " + shader_path)
		check(src.find("void vertex()") >= 0, "vertex " + shader_path)
		check(frag.find("modulate_color") >= 0, "sample uses vertex modulate " + shader_path)
		check(frag.find("vec4 tint = COLOR") < 0, "no fragment tint copy " + shader_path)
		check(frag.find("texture(TEXTURE") >= 0, "samples once " + shader_path)
	var rest := DiscardMotion.pot_pose(0.0)
	near(float(rest["x"]), 847.0, "pot rest x")
	near(float(rest["scale"]), 1.0, "pot rest scale")
	check(DiscardMotion.splat_alpha(0.1) == 0.0, "splat early")
	check(is_equal_approx(DiscardMotion.splat_alpha(0.4), 1.0), "splat hold")
	var scene := DiscardMotion.build_scene(17)
	check((scene["gobs"] as Array).size() == 16, "gobs")
	check((scene["blobs"] as Array).size() > 3, "blobs")


func _quality() -> void:
	var q := QualityProbe.new()
	q.set_tier("high")
	check(q.get_quality()["particleScale"] == 1.0, "high budget")
	q.set_tier("medium")
	check(is_equal_approx(float(q.get_quality()["particleScale"]), 0.6), "med budget")
	q.set_tier("low")
	check(q.get_quality()["specular"] == false, "low spec")
	q.set_tier("high")
	var n := [0]
	q.subscribe(func(): n[0] += 1)
	q.set_tier("medium")
	q.set_tier("medium")
	q.set_reduced_motion(true)
	q.set_reduced_motion(true)
	check(n[0] == 2, "subscribe %d" % n[0])
	q.set_tier("high")
	q.set_reduced_motion(false)
	q.now_ms = 1000.0
	for _i in 90:
		q.report_frame_time(30.0)
	check(q.tier == "medium", "drop tier")
	check(q.describe() == "medium (auto)", "describe " + q.describe())
	for _i in 90:
		q.report_frame_time(5.0)
	check(q.tier == "medium", "cooldown holds")
	q.now_ms = 2500.0
	for _i in 90:
		q.report_frame_time(5.0)
	check(q.tier == "high", "climb back")
	check(QualityProbe.detect_ceiling(2, 0.0, 1.0, false) == "low", "cores 2")
	check(QualityProbe.detect_ceiling(4, 0.0, 1.0, false) == "medium", "cores 4")
	check(QualityProbe.detect_ceiling(8, 8.0, 1.0, true) == "medium", "native cap")


func _format() -> void:
	check(Content.format_quantity(0.5) == "۰٫۵", "fq 0.5")
	check(Content.format_quantity(1.0) == "۱", "fq 1")
	check(Content.format_quantity(6.0) == "شش واحد", "fq 6")
	check(Content.heat_from_payload({"heat": "high"}) == "high", "heat payload")
	check(Content.heat_from_payload({"to": "low"}) == "low", "heat to")
	check(Content.heat_from_payload({}) == null, "heat none")
	check(Content.UI["gateReturn"] == "سردر", "label")
	check(Content.GRIND["fine"] == "نرم", "grind label")


func _rng() -> void:
	var a := KimRng.new(3)
	var b := KimRng.new(3)
	for _i in 8:
		near(a.next(), b.next(), "rng", 0.0)
	check(KimRng.seed_for_customer("c11_joy", 0) == KimRng.seed_for_customer("c11_joy", 0), "seed stable")
	check(KimRng.seed_for_customer("c11_joy", 0) != KimRng.seed_for_customer("c11_joy", 1), "seed round")
	var rng_path := "res://tests/fixtures/rng_golden.json"
	if FileAccess.file_exists(rng_path):
		var g = JSON.parse_string(FileAccess.open(rng_path, FileAccess.READ).get_as_text())
		var r := KimRng.new(7)
		for i in (g["rng"] as Array).size():
			if i < 3:
				# JSON number formatting is not bit-identical to the f64 quotient.
				near(r.next(), float(g["rng"][i]), "mulberry %d" % i, 1e-12)
		check(KimRng.seed_for_customer("c11_joy", 2) == int(g["seed"]), "fnv seed %s" % KimRng.seed_for_customer("c11_joy", 2))


func _golden() -> void:
	var path := "res://tests/fixtures/brew_golden.json"
	if not FileAccess.file_exists(path):
		print("skip golden (no fixture yet)")
		return
	var golden = JSON.parse_string(FileAccess.open(path, FileAccess.READ).get_as_text())
	for case in golden:
		var defs := Catalog.load_defs()
		var brew := Alchemy.create_brew()
		if case.has("heat"):
			brew = Alchemy.set_heat(brew, case["heat"], defs)
		for step in case["steps"]:
			match step["op"]:
				"add":
					brew = Alchemy.add_ingredient(brew, step["id"], float(step["qty"]), step["grind"], defs)
				"heat":
					brew = Alchemy.set_heat(brew, step["heat"], defs)
				"time":
					brew = Alchemy.advance_time(brew, float(step["dt"]), defs)
				"stir":
					brew = Alchemy.stir(brew, defs)
		var potion := Alchemy.bottle(brew, defs)
		_cmp_num(potion["stability"], case["stability"], "golden stability " + str(case.get("name", "")))
		for k in case["effect"]:
			near(float((potion["effectProfile"] as Dictionary).get(k, 0.0)), float(case["effect"][k]), "golden %s %s" % [case.get("name", ""), k], 5e-4)
		if case.has("band"):
			var ev := Alchemy.evaluate(potion, _customer(defs, case["customer"]), defs)
			check(ev["band"] == case["band"], "golden band %s got %s" % [case.get("name", ""), ev["band"]])
			near(float(ev["score"]), float(case["score"]), "golden score", 5e-3)
			if case.has("reaction"):
				check(ev["reactionFa"] == case["reaction"], "golden reaction %s\n got %s\n exp %s" % [case.get("name", ""), ev["reactionFa"], case["reaction"]])


func _stage_fit() -> void:
	var fit = load("res://scripts/engine/stage_fit.gd")
	var z := Vector4.ZERO
	check(fit.origin(Vector2(1920, 1080), z) == Vector2.ZERO, "16:9 stage fills the window")
	check(fit.origin(Vector2(2400, 1080), z) == Vector2(240, 0), "2400x1080 stage origin got %s" % fit.origin(Vector2(2400, 1080), z))
	check(fit.origin(Vector2(2340, 1080), z) == Vector2(210, 0), "2340x1080 stage origin got %s" % fit.origin(Vector2(2340, 1080), z))
	check(fit.origin(Vector2(1920, 1200), z) == Vector2(0, 60), "taller window letterboxes vertically")
	check(fit.origin(Vector2(1920, 1080), Vector4(40, 0, 0, 0)) == Vector2.ZERO, "16:9 stage does not shrink for a notch")
	check(fit.origin(Vector2(2400, 1080), Vector4(48, 0, 0, 0)) == Vector2(240, 0), "a notch inside the bar leaves the stage centered")
	check(fit.origin(Vector2(2400, 1080), Vector4(300, 0, 0, 0)) == Vector2(300, 0), "stage moves inside a safe inset deeper than the bar")
	check(fit.gear_position(z) == Vector2(4, 2), "gear stays at the 16:9 corner")
	check(fit.gear_position(Vector4(40, 20, 0, 0)) == Vector2(32, 12), "gear follows the safe inset")
	check(is_equal_approx(fit.pill_y(1080.0), 1038.0), "pills stay on the 16:9 baseline")


func _layout() -> void:
	var stage := Control.new()
	UiKit.fill(stage)
	check(stage.anchor_left == stage.anchor_right and stage.anchor_top == stage.anchor_bottom, "stage anchors are equal")
	check(stage.size == Vector2(1920, 1080), "stage is 1920x1080 got %s" % stage.size)
	var pestle := UiKit.sprite("mortar/v3/pestle_1.png", Rect2(10, 20, 100, 80))
	check(pestle.size == Vector2(100, 80), "pestle keeps layout rect got %s" % pestle.size)
	check(pestle.expand_mode == TextureRect.EXPAND_IGNORE_SIZE, "pestle ignores texture size")
	var mortar := UiKit.sprite("mortar/v3/mortar_back.png", Rect2(290, 506, 250, 273))
	check(mortar.size == Vector2(250, 273), "mortar zone got %s" % mortar.size)
	var parchment := UiKit.sprite("gate/parchment.png", Rect2(1406, 868, 306, 173), "fill")
	check(parchment.size == Vector2(306, 173), "parchment quote got %s" % parchment.size)
	var plaque := UiKit.sprite("intro/plaque.png", Rect2(850, 805, 210, 97))
	check(plaque.size == Vector2(210, 97), "plaque got %s" % plaque.size)
	var cabinet := UiKit.sprite("shelf/side_cabinet.png", Rect2(10, 100, 270, 950))
	check(cabinet.size == Vector2(270, 950), "cabinet zone got %s" % cabinet.size)
	root.add_child(pestle)
	check(pestle.size == Vector2(100, 80), "pestle stays laid out in the tree got %s" % pestle.size)
	pestle.free()
	mortar.free()
	parchment.free()
	plaque.free()
	cabinet.free()
	stage.free()


func _dist_to_segment(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var den := ab.length_squared()
	if den < 0.001:
		return p.distance_to(a)
	var t := clampf((p - a).dot(ab) / den, 0.0, 1.0)
	return p.distance_to(a + ab * t)


func _spoon_motion() -> void:
	var spoon: GDScript = load("res://scripts/fx/spoon_transfer.gd")
	var s = spoon.new()
	s.begin(Vector2(900, 640), Vector2(180, 70))
	var deepest: float = s.start.y
	var carry: Array = []
	var pour_rot := 0.0
	var exit_rot := 99.0
	var saw_dip := false
	while s.active():
		var pose: Dictionary = s.update(1.0 / 60.0, null)
		if not bool(pose.get("alive", false)):
			break
		var y := float(pose["y"])
		var tt: float = s.t
		if tt > 0.45 and tt < 1.92:
			if y > deepest:
				deepest = y
			if y > s.dip.y - 4.0:
				saw_dip = true
		if tt > 1.92 and tt < 2.62:
			carry.append(Vector2(float(pose["x"]), y))
		if tt > 2.62 and tt < 3.50:
			pour_rot = maxf(pour_rot, absf(float(pose["rot"])))
		if tt > 3.70:
			exit_rot = absf(float(pose["rot"]))
	check(saw_dip and deepest > s.start.y + 36.0, "spoon dips into the mortar got %s start %s" % [deepest, s.start.y])
	var dev := 0.0
	if carry.size() >= 3:
		var a: Vector2 = carry[0]
		var b: Vector2 = carry[carry.size() - 1]
		for p in carry:
			dev = maxf(dev, _dist_to_segment(p, a, b))
	check(dev > 40.0, "carry follows a curve, deviation %s" % dev)
	check(pour_rot > 60.0, "spoon tilts over the cauldron got %s" % pour_rot)
	check(exit_rot < 12.0, "spoon returns upright got %s" % exit_rot)
	var lip0: Vector2 = s.lip_offset(0.0)
	var lip1: Vector2 = s.lip_offset(76.0)
	check(lip0.y > 12.0, "material sits in the bowl")
	check(lip0.distance_to(lip1) > 8.0, "material slides to the lip as the spoon tilts")


func _bottle_glass() -> void:
	var glass: GDScript = load("res://scripts/fx/bottle_glass.gd")
	check(is_equal_approx(glass.fill_level("tilt", 0.4), 0.0), "bottle empty before the stream")
	near(glass.fill_level("stream", 1.1), 0.5, "bottle mid fill", 0.02)
	check(is_equal_approx(glass.fill_level("stream", 1.7), 1.0), "bottle full as the stream ends")
	check(is_equal_approx(glass.fill_level("deliver", 2.2), 1.0), "bottle stays full on delivery")
	var entries: Array = [
		{"ingredientId": "a", "quantity": 1.0},
		{"ingredientId": "b", "quantity": 1.0},
	]
	var color_of := func(id: String) -> Color:
		return Color("cc4422") if id == "a" else Color("2266cc")
	var early: Color = glass.blend_color(entries, color_of, 0.0)
	var late: Color = glass.blend_color(entries, color_of, 1.0)
	check(early.r > early.b + 0.2, "blend starts on the first material got %s" % early)
	check(absf(late.r - late.b) < 0.12, "blend reaches the mixed colour got %s" % late)
	var rect := Rect2(100, 200, 125, 220)
	for level in [0.2, 0.55, 0.9]:
		var poly: PackedVector2Array = glass.liquid_polygon(rect, level, 0.4)
		check(poly.size() >= 6, "liquid polygon at %s" % level)
		var prev_y := 9999.0
		for p in poly:
			check(glass.contains(rect, p), "liquid stays inside the glass at %s %s" % [level, p])
			prev_y = minf(prev_y, p.y)
		if level > 0.2:
			var lower: PackedVector2Array = glass.liquid_polygon(rect, level - 0.2, 0.4)
			var lower_top := 9999.0
			for q in lower:
				lower_top = minf(lower_top, q.y)
			check(prev_y < lower_top, "surface rises as material enters")
	var path: PackedVector2Array = glass.pour_path(rect, 0.35, 1.2)
	check(path.size() >= 8, "pour path from the mouth")
	check(path[0].y < path[path.size() - 1].y - 20.0, "pour runs downward")
	for q2 in path:
		check(glass.contains(rect, q2), "pour stays inside the glass %s" % q2)
	var bub: Vector3 = glass.bubble_at(rect, 0.6, 2, 0.3)
	if bub.z > 0.5:
		check(glass.contains(rect, Vector2(bub.x, bub.y)), "bubble stays inside the glass")


func _gate_text() -> void:
	var packed: PackedScene = load("res://scenes/main.tscn")
	var main: Node = packed.instantiate()
	root.add_child(main)
	var gate: Node = main.get_node("GateLayer/Gate")
	gate.force_idle()
	var labels := _collect_labels(gate)
	check(_visible_caption(labels, "کیمیاگر"), "gate title is on screen")
	check(_visible_caption(labels, Content.UI["gateStart"]) or _visible_caption(labels, Content.UI["gateContinue"]), "gate plaque is on screen")
	check(_visible_caption(labels, Content.UI["gateStages"]), "stages tag is on screen")
	check(_visible_caption(labels, Content.UI["gateSubtitle"]), "gate subtitle is on screen")
	gate.panel = "stages"
	gate._refresh_panel()
	labels = _collect_labels(gate)
	var any := false
	check(_visible_caption(labels, Content.UI["gateMapTitle"]), "map title is on screen")
	for st in Content.STAGES:
		var name := str(st["nameFa"])
		var shown := _visible_caption(labels, name)
		if shown:
			any = true
		check(shown, "stage %s has visible text" % name)
		var hint := str(st["hintFa"]) if Content.stage_unlocked(Content.STAGES.find(st)) else str(Content.UI["gateLocked"])
		check(_visible_caption(labels, hint), "stage %s hint is visible" % name)
	check(any, "the gate shows text on at least one stage")
	root.remove_child(main)
	main.free()


func _round2() -> void:
	var shader := FileAccess.get_file_as_string("res://shaders/radial_disc.gdshader")
	check(shader.find("discard") < 0, "cauldron water shader does not kill fragments")
	var sim := ClassicBrewSim.new()
	check(sim.fill > 0.5, "cauldron starts with water")
	sim.hide_pot()
	check(not sim.pot_visible(), "a hidden pot is not drawn")
	sim.respawn(0.0)
	check(sim.fill == 0.0, "respawn empties the pot before the water returns")
	for _i in 120:
		sim.update(0.05)
	check(sim.fill > 0.5, "water returns after the pot settles, fill %s" % sim.fill)
	var sheets: Script = load("res://scripts/fx/parchment_sheet.gd")
	var ok: Texture2D = sheets.sheet("ok")
	var bad: Texture2D = sheets.sheet("bad")
	check(ok != null and ok.get_width() > 0, "success parchment bakes")
	check(bad != null and bad.get_width() == ok.get_width(), "failure parchment bakes")
	var ok_px: Color = ok.get_image().get_pixel(180, 220)
	var bad_px: Color = bad.get_image().get_pixel(180, 220)
	check(ok_px != bad_px, "failure parchment is scorched")
	var packed: PackedScene = load("res://scenes/main.tscn")
	var main: Node = packed.instantiate()
	root.add_child(main)
	var workshop: Node = main.get_node("WorkshopPlate/WorkshopViewport/Workshop")
	var tipped: Vector2 = workshop._jar_pour_pose(0.55)
	near(tipped.x, -10.0, "jar lifts at the web pour keyframe", 0.05)
	near(tipped.y, 26.0, "jar tips toward the mortar", 0.05)
	var enter0: Dictionary = workshop._customer_pose("enter", 0.0)
	check(float(enter0["x"]) > 200.0, "customer enters from the right")
	check(float(enter0["a"]) < 0.05, "customer is unseen at the start of the walk")
	var arrived: Dictionary = workshop._customer_pose("enter", 1.1)
	check(absf(float(arrived["x"])) < 12.0, "customer reaches the counter, x %s" % arrived["x"])
	var left: Dictionary = workshop._customer_pose("leave", 0.9)
	check(float(left["x"]) > 200.0, "customer departs to the right")
	workshop._spawn_flight("chamomile", Vector2(80, 200))
	check(workshop._flights.size() >= 4, "pieces leave the jar")
	check(workshop._jar_pour.has("chamomile"), "the jar plays the pour")
	workshop._tick_flights(0.2)
	var airborne := false
	for flight in workshop._flights:
		var ft := float(flight["t"])
		if ft >= 0.0 and ft < 0.34:
			airborne = true
	check(airborne, "pieces are in the air on the way to the mortar")
	var brew: Dictionary = Alchemy.create_brew()
	brew = Alchemy.add_ingredient(brew, "ginger", 1.0, "crushed", game.defs)
	game.brew = brew
	workshop.begin_discard()
	check(workshop.discard_t == 0.0, "the throw starts")
	check(not workshop._brew.pot_visible(), "the pot leaves the hearth")
	workshop._tick_discard(0.52)
	check(workshop._splat_fired and workshop._clang_fired, "splat and clang stay on the web clock")
	workshop._sync_liquid()
	check(workshop._throw_was, "the wall stain and the flying pot redraw")
	root.remove_child(main)
	main.free()


func _round3() -> void:
	var fx: Script = load("res://scripts/fx/workshop_fx.gd")
	var sfx: Script = load("res://scripts/autoload/sfx.gd")
	var ident: Vector3 = fx.candle_pose(0.0)
	near(ident.x, 1.0, "candle glow is unscaled at t=0")
	near(ident.y, 0.0, "candle shadow x is pinned at t=0")
	near(ident.z, 0.0, "candle shadow y is pinned at t=0")
	var peak_t := PI / 2.0 / 2.15
	var peak: Vector3 = fx.candle_pose(peak_t)
	near(peak.y, 1.2, "candle shadow reaches the slow sine", 0.02)
	check(absf(peak.x - 1.0) > 0.02, "candle glow breathes")
	var hit: Vector2 = fx.shake_offset("hit", 0.0)
	near(hit.x, 0.0, "throw shake starts still")
	var mid: Vector2 = fx.shake_offset("hit", 0.10)
	check(absf(mid.x) > 8.0, "throw shake moves the room, x %s" % mid.x)
	var done: Vector2 = fx.shake_offset("hit", 0.62)
	near(done.x, 0.0, "throw shake settles", 0.05)
	near(done.y, 0.0, "throw shake settles vertically", 0.05)
	var drop: Vector2 = fx.shake_offset("drop", 0.06)
	check(absf(drop.y) > 1.0, "landing shake dips")
	var quiet: Dictionary = fx.plume(0, 0.0)
	check(float(quiet["a"]) < 0.02, "steam plume starts clear")
	var risen: Dictionary = fx.plume(0, 1.2)
	check(float(risen["a"]) > 0.4, "steam plume is up at 1.2s")
	var saffron := Color("d4891c")
	var chamomile := Color("e0c85a")
	var steam_a: Color = fx.steam_color(saffron, false)
	var steam_b: Color = fx.steam_color(chamomile, false)
	check(absf(steam_a.r - steam_b.r) + absf(steam_a.g - steam_b.g) > 0.04, "steam follows the potion")
	var ash := Color("6a625c")
	var smoked: Color = fx.steam_color(saffron, true)
	check(absf(smoked.r - ash.r) > 0.08, "smoke keeps the potion hue")
	var mixed: Color = fx.steam_color(saffron.lerp(chamomile, 0.5), false)
	check(absf(mixed.g - steam_a.g) > 0.01, "a second ingredient shifts the steam")
	check(sfx.bubble_loudness(0.7, true) > sfx.bubble_loudness(0.7, false), "an active pot bubbles louder")
	near(sfx.bubble_loudness(0.0, true), 0.0, "an empty pot does not bubble harder")
	check(sfx.simmer_loop_gain(0.7, true, true) > sfx.simmer_loop_gain(0.7, false, true), "effects raise the simmer bed")
	near(sfx.simmer_loop_gain(0.7, true, false), 0.0, "sound off silences the simmer")
	check(sfx.creak_allowed(true, 0.7, true), "wood can creak while the fire is up")
	check(not sfx.creak_allowed(false, 0.7, true), "effects off skips the creak")
	check(not sfx.creak_allowed(true, 0.7, false), "sound off skips the creak")
	var sim := ClassicBrewSim.new()
	sim.set_heat_level(0.8)
	sim.set_ingredient_progress("chamomile", 1.0)
	sim.drop_chips({
		"id": "chamomile",
		"tint": chamomile,
		"strength": 0.7,
		"quantity": 1.0,
	}, [{"kind": "petal", "sprite": 1, "crush": 0.4, "generation": 0, "nick": 0.2, "rot": 10.0, "w": 16.0, "h": 12.0, "color": chamomile}])
	for _i in 40:
		sim.update(0.05)
	check(sim.steam.size() > 0, "the pot gives off steam")
	var one: Color = sim.mix_liquid()
	var carried: Color = sim.steam[0]["tint"]
	near(carried.r, one.r, "steam tint matches the liquor", 0.02)
	sim.set_ingredient_progress("saffron", 1.0)
	sim.drop_chips({
		"id": "saffron",
		"tint": saffron,
		"strength": 1.0,
		"quantity": 1.0,
	}, [{"kind": "petal", "sprite": 1, "crush": 0.4, "generation": 0, "nick": 0.2, "rot": 10.0, "w": 16.0, "h": 12.0, "color": saffron}])
	sim.update(0.05)
	var two: Color = sim.mix_liquid()
	check(absf(two.r - one.r) + absf(two.g - one.g) > 0.02, "the liquor changes as ingredients combine")
	var followed: Color = sim.steam[0]["tint"]
	near(followed.r, two.r, "steam follows the new mix", 0.02)
	var settings: Node = root.get_node("Settings")
	var haptics: Node = root.get_node("Haptics")
	var packed: PackedScene = load("res://scenes/main.tscn")
	var main: Node = packed.instantiate()
	root.add_child(main)
	var workshop: Node = main.get_node("WorkshopPlate/WorkshopViewport/Workshop")
	workshop.pin_flicker = true
	workshop._clock = peak_t
	workshop._tick_fire(0.0)
	near(workshop._fire_glow.modulate.a, 0.28, "a pinned candle does not dim the room", 0.02)
	near(workshop._shadows.position.x, 0.0, "pinned shadows stay put", 0.05)
	workshop.pin_flicker = false
	settings.effects_enabled = true
	workshop._tick_fire(0.0)
	near(workshop._shadows.position.x, 1.2, "live shadows drift with the candle", 0.05)
	settings.effects_enabled = false
	workshop._tick_fire(0.0)
	near(workshop._shadows.position.x, 0.0, "effects off freezes the candle", 0.05)
	settings.effects_enabled = true
	settings.haptics_enabled = false
	var held: int = haptics.pulses
	workshop._exploded = false
	var burnt: Dictionary = Alchemy.create_brew()
	burnt = Alchemy.add_ingredient(burnt, "chamomile", 1.0, "fine", game.defs)
	burnt = Alchemy.advance_time(burnt, 80.0, game.defs)
	game.brew = burnt
	check(game.overprocessed(), "a long boil burns")
	workshop._tick_burst()
	check(haptics.pulses == held, "haptics off ignores the explosion")
	check(workshop._shake_kind == "hit", "the explosion still shakes when effects are on")
	workshop._shake_kind = ""
	workshop._exploded = false
	settings.effects_enabled = false
	workshop._tick_burst()
	check(workshop._shake_kind == "", "effects off does not shake")
	settings.effects_enabled = true
	settings.haptics_enabled = true
	var before: int = haptics.pulses
	workshop.jump_shake("hit", 0.10)
	check(workshop._camera.position.length() > 8.0, "the throw offsets the camera")
	settings.effects_enabled = false
	workshop._apply_camera()
	near(workshop._camera.position.x, 0.0, "effects off clears the shake", 0.05)
	settings.effects_enabled = true
	workshop._shake_kind = ""
	workshop.begin_discard()
	workshop._tick_discard(0.52)
	check(workshop._clang_fired, "the wall hit still clangs")
	check(workshop._shake_kind == "hit", "the wall hit shakes the room")
	check(haptics.pulses > before, "the throw vibrates")
	settings.haptics_enabled = false
	var silent: int = haptics.pulses
	haptics.pulse("heavy")
	check(haptics.pulses == silent, "the haptics setting still wins")
	settings.effects_enabled = true
	settings.haptics_enabled = true
	root.remove_child(main)
	main.free()


func _round4() -> void:
	var glass: GDScript = load("res://scripts/fx/bottle_glass.gd")
	var sheets: Script = load("res://scripts/fx/parchment_sheet.gd")
	check(FileAccess.file_exists("res://scripts/fx/workshop_fx.gd.uid"), "workshop fx uid is committed")
	var entries: Array = [
		{"ingredientId": "rose", "quantity": 1.0},
		{"ingredientId": "ink", "quantity": 1.0},
	]
	var color_of := func(id: String) -> Color:
		return Color(0.86, 0.12, 0.18) if id == "rose" else Color(0.15, 0.22, 0.72)
	var liquid: Color = glass.blend_color(entries, color_of, 1.0)
	var teal := Color8(31, 130, 114)
	for rel in ["bottles/glass_open.webp", "bottles/glass_cork.webp"]:
		var tex: Texture2D = load("res://assets/art/" + rel)
		check(tex != null, "glass texture loads %s" % rel)
		var img := tex.get_image()
		check(img != null and not img.is_empty(), "glass image %s" % rel)
		if img.get_format() != Image.FORMAT_RGBA8:
			img.convert(Image.FORMAT_RGBA8)
		var px: Color = img.get_pixel(glass.SAMPLE_X, glass.SAMPLE_Y)
		check(px.a < 0.12, "bottle interior is clear %s alpha %s" % [rel, px.a])
		var shown: Color = glass.over(px, liquid)
		var to_liquid := _rgb_dist(shown, liquid)
		var to_teal := _rgb_dist(shown, teal)
		check(to_liquid < 0.12, "resting interior shows the liquid %s dist %s" % [rel, to_liquid])
		check(to_liquid < to_teal, "resting interior is not the glass tint %s" % rel)
	var cork_tex: Texture2D = load("res://assets/art/bottles/glass_cork.webp")
	var cork_img := cork_tex.get_image()
	if cork_img.get_format() != Image.FORMAT_RGBA8:
		cork_img.convert(Image.FORMAT_RGBA8)
	var neck: Color = cork_img.get_pixel(int(glass.TEX_W / 2), int(0.12 * float(glass.TEX_H)))
	check(neck.a > 0.8 and neck.r > neck.b, "the cork stays on the neck got %s" % neck)
	var open_tex: Texture2D = load("res://assets/art/bottles/glass_open.webp")
	var open_img := open_tex.get_image()
	if open_img.get_format() != Image.FORMAT_RGBA8:
		open_img.convert(Image.FORMAT_RGBA8)
	var mouth: Color = open_img.get_pixel(int(glass.TEX_W / 2), int(0.12 * float(glass.TEX_H)))
	check(mouth.a < 0.2, "the open mouth is clear got %s" % mouth)
	var wood := Color(0.55, 0.36, 0.18)
	var empty_shown: Color = glass.over(open_img.get_pixel(glass.SAMPLE_X, glass.SAMPLE_Y), wood)
	check(_rgb_dist(empty_shown, wood) < _rgb_dist(empty_shown, teal), "an empty bottle shows the room, not teal glass")
	for kind in ["book", "ok", "bad", "card"]:
		var page: Texture2D = sheets.sheet(kind)
		var page_img := page.get_image()
		var edge: Color = page_img.get_pixel(5, 220)
		var inner: Color = page_img.get_pixel(180, 220)
		check(edge.a > 0.8, "parchment edge stays solid %s alpha %s" % [kind, edge.a])
		check(edge.r + edge.g + edge.b < inner.r + inner.g + inner.b - 0.2, "parchment edge is scorched %s" % kind)
		var flips := 0
		var prev := 0.0
		for x in 36:
			var a := page_img.get_pixel(x, 220).a
			if x > 0 and absf(a - prev) > 0.45:
				flips += 1
			prev = a
		check(flips <= 1, "parchment edge is a smooth fringe %s flips %s" % [kind, flips])
	var packed: PackedScene = load("res://scenes/main.tscn")
	var main: Node = packed.instantiate()
	root.add_child(main)
	var workshop: Node = main.get_node("WorkshopPlate/WorkshopViewport/Workshop")
	workshop._sync_liquid()
	check(str(workshop._bottle.texture.resource_path).find("glass_open") >= 0, "the resting bottle is open glass")
	var brew: Dictionary = Alchemy.create_brew()
	brew = Alchemy.add_ingredient(brew, "chamomile", 1.0, "fine", game.defs)
	brew = Alchemy.add_ingredient(brew, "saffron", 1.0, "fine", game.defs)
	game.brew = brew
	game.bottle_brew()
	game.result = null
	workshop.pour = ""
	workshop._sync_liquid()
	check(bool(game.brew["bottled"]), "the brew stays bottled")
	check(str(workshop._bottle.texture.resource_path).find("glass_cork") >= 0, "a corked bottle keeps its cork")
	check(workshop._bottle.visible, "the corked bottle stays on the bench")
	check(workshop._bottle_draw_key.begins_with("rest:"), "the fill is drawn while the bottle rests, key %s" % workshop._bottle_draw_key)
	check(is_equal_approx(glass.fill_level("rest", 0.0), 1.0), "a resting bottle keeps its level")
	workshop.jump_pour("stream", 1.1)
	check(str(workshop._pour_bottle.texture.resource_path).find("glass_open") >= 0, "the pour uses open glass")
	workshop.jump_pour("deliver", 2.1)
	check(str(workshop._pour_bottle.texture.resource_path).find("glass_cork") >= 0, "delivery corks the moving bottle")
	var overlays: Node = main.get_node("ChromeLayer/Overlays")
	game.open_overlay = "notebook"
	overlays.advance(0.0)
	check(overlays.get_node_or_null("WaxSeal") != null, "the notebook page has a wax seal")
	game.open_overlay = null
	root.remove_child(main)
	main.free()


func _rgb_dist(a: Color, b: Color) -> float:
	var dr := a.r - b.r
	var dg := a.g - b.g
	var db := a.b - b.b
	return sqrt(dr * dr + dg * dg + db * db)


func _collect_labels(node: Node) -> Array:
	var out: Array = []
	if node is Label:
		out.append(node)
	for child in node.get_children():
		out.append_array(_collect_labels(child))
	return out


func _visible_caption(labels: Array, text: String) -> bool:
	for node in labels:
		var l: Label = node
		if l.text != text:
			continue
		if not l.visible or l.modulate.a < 0.45 or l.clip_text:
			continue
		var fs := float(l.get_theme_font_size("font_size"))
		if l.size.y < fs * 1.35:
			continue
		var gp := l.get_global_rect()
		if not Rect2(Vector2.ZERO, Vector2(1920, 1080)).intersects(gp):
			continue
		return true
	return false


func _layers() -> void:
	var packed: PackedScene = load("res://scenes/main.tscn")
	var main: Node = packed.instantiate()
	root.add_child(main)
	var gate: CanvasItem = main.get_node("GateLayer/Gate") as CanvasItem
	var workshop: Node = main.get_node("WorkshopPlate/WorkshopViewport/Workshop")
	var plate: CanvasItem = main.get_node("WorkshopPlate") as CanvasItem
	var chrome: CanvasLayer = main.get_node("ChromeLayer") as CanvasLayer
	var gate_canvas := gate.get_canvas_layer_node()
	check(gate_canvas != null, "gate has a canvas layer")
	check(chrome.layer > gate_canvas.layer, "chrome draws above the gate")
	var plate_canvas := plate.get_canvas_layer_node()
	var plate_layer := -1
	if plate_canvas != null:
		plate_layer = plate_canvas.layer
	check(plate_layer < gate_canvas.layer, "workshop plate is below the gate got %d vs %d" % [plate_layer, gate_canvas.layer])
	var mortar: CanvasItem = _find_canvas(workshop, "MortarFront")
	check(mortar != null, "mortar front exists")
	mortar.z_as_relative = false
	mortar.z_index = 4096
	_assert_below_gate(mortar, gate, gate_canvas)
	_walk_below(workshop, gate, gate_canvas)
	check(mortar.get_viewport() != gate.get_viewport(), "mortar is not in the gate viewport")
	root.remove_child(main)
	main.free()


func _walk_below(node: Node, gate: CanvasItem, gate_canvas: CanvasLayer) -> void:
	if node is CanvasItem:
		_assert_below_gate(node as CanvasItem, gate, gate_canvas)
	for child in node.get_children():
		_walk_below(child, gate, gate_canvas)


func _assert_below_gate(item: CanvasItem, gate: CanvasItem, gate_canvas: CanvasLayer) -> void:
	var item_canvas := item.get_canvas_layer_node()
	check(item_canvas != gate_canvas, "workshop sprite %s is not on the gate layer" % item.name)
	if item.get_viewport() == gate.get_viewport():
		var item_layer := -1
		if item_canvas != null:
			item_layer = item_canvas.layer
		check(item_layer < gate_canvas.layer, "workshop sprite %s layer %d is below the gate" % [item.name, item_layer])


func _find_canvas(node: Node, wanted: String) -> CanvasItem:
	if node is CanvasItem and str(node.name) == wanted:
		return node as CanvasItem
	for child in node.get_children():
		var found: CanvasItem = _find_canvas(child, wanted)
		if found != null:
			return found
	return null


func _customer(defs: Dictionary, id: String) -> Dictionary:
	for c in defs["customers"]:
		if c["id"] == id:
			return c
	return defs["customers"][0]


func _cmp_num(a, b, msg: String) -> void:
	near(float(a), float(b), msg, 5e-4)


## GPU check: with `--tilt=0.6,-0.3` uniforms on, the backdrop stays within 3
## points of the same sprite drawn without the shader. Headless skips this.
func _shade_setup() -> void:
	var bg: Texture2D = load("res://assets/art/background/shop_background.png")
	var grey_img := Image.create(128, 128, false, Image.FORMAT_RGBA8)
	grey_img.fill(Color8(128, 128, 128, 255))
	var grey := ImageTexture.create_from_image(grey_img)
	var pose := Vector2(0.6, -0.3)
	var rig := ShaderMaterial.new()
	rig.shader = load("res://shaders/rig_perspective.gdshader")
	rig.set_shader_parameter("ax", deg_to_rad(-pose.y * 2.0))
	rig.set_shader_parameter("ay", deg_to_rad(pose.x * 2.2))
	rig.set_shader_parameter("rig_scale", 1.06)
	rig.set_shader_parameter("perspective", 1400.0)
	rig.set_shader_parameter("scene_size", Vector2(320, 180))
	rig.set_shader_parameter("depth_offset", pose * 18.0)
	var ident := ShaderMaterial.new()
	ident.shader = load("res://shaders/rig_perspective.gdshader")
	ident.set_shader_parameter("ax", 0.0)
	ident.set_shader_parameter("ay", 0.0)
	ident.set_shader_parameter("rig_scale", 1.0)
	ident.set_shader_parameter("perspective", 1400.0)
	ident.set_shader_parameter("scene_size", Vector2(320, 180))
	ident.set_shader_parameter("depth_offset", Vector2.ZERO)
	var door := ShaderMaterial.new()
	door.shader = load("res://shaders/door_leaf.gdshader")
	door.set_shader_parameter("angle_deg", 18.0)
	door.set_shader_parameter("hinge", 0.0)
	door.set_shader_parameter("perspective", 1500.0)
	door.set_shader_parameter("leaf_size", Vector2(128, 128))
	door.set_shader_parameter("leaf_origin", Vector2.ZERO)
	door.set_shader_parameter("persp_origin", Vector2(64, 64))
	_shade_views = [
		_shade_view(bg, null, Vector2i(320, 180)),
		_shade_view(bg, rig, Vector2i(320, 180)),
		_shade_view(bg, ident, Vector2i(320, 180)),
		_shade_view(grey, rig, Vector2i(128, 128)),
		_shade_view(grey, door, Vector2i(128, 128)),
	]


func _shade_view(tex: Texture2D, mat: Material, size: Vector2i) -> SubViewport:
	var vp := SubViewport.new()
	vp.size = size
	vp.transparent_bg = false
	vp.disable_3d = true
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	var rect := TextureRect.new()
	rect.texture = tex
	rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	rect.stretch_mode = TextureRect.STRETCH_SCALE
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rect.position = Vector2.ZERO
	rect.size = Vector2(size)
	rect.material = mat
	vp.add_child(rect)
	root.add_child(vp)
	return vp


func _shade_check() -> void:
	var plain := _shade_mean(_shade_views[0], 0.2)
	var tilted := _shade_mean(_shade_views[1], 0.2)
	var ident := _shade_mean(_shade_views[2], 0.2)
	var grey_rig := _shade_mean(_shade_views[3], 0.25)
	var grey_door := _shade_mean(_shade_views[4], 0.25)
	print("tilt shade bg plain ", _rgb_text(plain), " tilted ", _rgb_text(tilted), " ident ", _rgb_text(ident), " grey rig ", _rgb_text(grey_rig), " grey door ", _rgb_text(grey_door))
	_near_rgb(ident, plain, "identity shader background")
	_near_rgb(tilted, plain, "tilted background")
	_near_rgb(grey_rig, Vector3(128, 128, 128), "tilted grey backdrop")
	_near_rgb(grey_door, Vector3(128, 128, 128), "tilted grey door")


func _shade_mean(vp: SubViewport, inset: float) -> Vector3:
	var tex := vp.get_texture()
	if tex == null:
		return Vector3(-1, -1, -1)
	var img := tex.get_image()
	if img == null or img.is_empty():
		return Vector3(-1, -1, -1)
	if img.get_format() != Image.FORMAT_RGBA8:
		img.convert(Image.FORMAT_RGBA8)
	var w := img.get_width()
	var h := img.get_height()
	var x0 := int(float(w) * inset)
	var y0 := int(float(h) * inset)
	var x1 := int(float(w) * (1.0 - inset))
	var y1 := int(float(h) * (1.0 - inset))
	var acc := Vector3.ZERO
	var n := 0
	for y in range(y0, y1):
		for x in range(x0, x1):
			var c := img.get_pixel(x, y)
			if c.a < 0.5:
				continue
			acc += Vector3(c.r, c.g, c.b)
			n += 1
	if n == 0:
		return Vector3(-1, -1, -1)
	return acc / float(n) * 255.0


func _near_rgb(got: Vector3, exp: Vector3, msg: String) -> void:
	var d := (got - exp).abs()
	check(d.x <= 3.0 and d.y <= 3.0 and d.z <= 3.0, "%s got %s expected %s" % [msg, _rgb_text(got), _rgb_text(exp)])


func _rgb_text(c: Vector3) -> String:
	return "%d,%d,%d" % [int(round(c.x)), int(round(c.y)), int(round(c.z))]
