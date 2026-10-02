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
	_spoon_pile()
	_bottle_glass()
	_gate_text()
	_round2()
	_round3()
	_round4()
	_round5()
	_round6()
	_round7()
	_round8()
	_round9()
	_round11()
	_round12()
	_round16()
	_round17()


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
	var prev := Vector2.ZERO
	var prev_rot := 0.0
	var prev_step := 0.0
	var have_prev := false
	var max_step := 0.0
	var max_accel := 0.0
	var max_ang := 0.0
	var carry_ang := 0.0
	var carry_abs := 0.0
	var approach: Array = []
	var level := 1.0
	var level_drops: Array = []
	var dip_cues := 0
	var drag_cues := 0
	var saw_mote := false
	var worst_norm := 0.0
	var deep_norm := 0.0
	var below_lip := false
	var dip_rise := 1.0
	var prev_ang_v := 0.0
	var have_ang_v := false
	var max_ang_acc := 0.0
	var max_blob_step := 0.0
	var prev_blob := 0.0
	var have_blob := false
	while s.active():
		var pose: Dictionary = s.update(1.0 / 60.0, null)
		if not bool(pose.get("alive", false)):
			break
		var y := float(pose["y"])
		var here := Vector2(float(pose["x"]), y)
		var step := 0.0
		var drot := 0.0
		if have_prev:
			step = here.distance_to(prev)
			max_step = maxf(max_step, step)
			max_accel = maxf(max_accel, absf(step - prev_step))
			drot = (float(pose["rot"]) - prev_rot) * 60.0
			max_ang = maxf(max_ang, absf(drot))
			if have_ang_v:
				max_ang_acc = maxf(max_ang_acc, absf(drot - prev_ang_v) * 60.0)
			have_ang_v = true
			prev_ang_v = drot
		var blob_now := float(pose.get("blob", 0.0))
		if have_blob and str(pose.get("phase", "")) == "pour":
			max_blob_step = maxf(max_blob_step, absf(blob_now - prev_blob))
		have_blob = true
		prev_blob = blob_now
		have_prev = true
		prev = here
		prev_step = step
		prev_rot = float(pose["rot"])
		var tt: float = s.t
		if tt < 0.32:
			approach.append(here)
		if tt > 0.45 and tt < 1.92:
			if y > deepest:
				deepest = y
			if y > s.dip.y - 4.0:
				saw_dip = true
			var next_level := float(pose.get("level", 1.0))
			level_drops.append(next_level)
			level = next_level
		if tt > 1.92 and tt < 2.62:
			carry.append(here)
			carry_ang = maxf(carry_ang, absf(drot))
			carry_abs = maxf(carry_abs, absf(float(pose["rot"])))
		if tt > 2.62 and tt < 3.50:
			pour_rot = maxf(pour_rot, absf(float(pose["rot"])))
		if tt > 3.70:
			exit_rot = absf(float(pose["rot"]))
		var phase := str(pose.get("phase", ""))
		if phase == "dip" or phase == "scoop" or phase == "approach":
			var norm := MortarPile.mouth_norm(here)
			if phase != "approach":
				worst_norm = maxf(worst_norm, norm)
			if float(pose.get("depth", 0.0)) > 0.8:
				deep_norm = maxf(deep_norm, norm)
			if here.y > MortarPile.front_lip_y():
				below_lip = true
		if phase == "dip":
			# Local handle is -Y. Screen dy of that axis is -cos(rot); negative means it rises.
			dip_rise = minf(dip_rise, -cos(deg_to_rad(float(pose["rot"]))))
		if str(pose.get("cue", "")) == "dip":
			dip_cues += 1
		if str(pose.get("cue", "")) == "drag":
			drag_cues += 1
		if (pose.get("motes", []) as Array).size() > 0:
			saw_mote = true
	check(saw_dip and deepest > s.start.y + 36.0, "spoon dips into the mortar got %s start %s" % [deepest, s.start.y])
	var scoop: Vector2 = MortarPile.scoop_point()
	var lip_y := MortarPile.front_lip_y()
	check(MortarPile.mouth_norm(scoop) <= 0.6, "scoop sits inside the opening, norm %s at %s" % [MortarPile.mouth_norm(scoop), scoop])
	check(absf(scoop.x - 414.0) < 2.0 and scoop.y >= 560.0 and scoop.y <= 575.0, "scoop is at the material centre %s" % scoop)
	check(scoop.y < lip_y - 12.0, "scoop is above the front lip, y %s lip %s" % [scoop.y, lip_y])
	check(s.dip.distance_to(scoop) < 1.0, "dip uses the interior scoop point")
	check(deep_norm <= 0.6, "max depth stays inside the opening, norm %s" % deep_norm)
	check(worst_norm < 0.78, "dip and drag stay inside the opening, norm %s" % worst_norm)
	check(max_ang_acc < 6500.0, "angular acceleration %s deg/s^2" % max_ang_acc)
	check(max_blob_step < 0.08, "mound shrinks continuously, step %s" % max_blob_step)
	check(not below_lip, "bowl centre stays above the front lip")
	check(dip_rise < -0.35, "handle rises out of the cavity, screen dy %s" % dip_rise)
	var dev := 0.0
	if carry.size() >= 3:
		var a: Vector2 = carry[0]
		var b: Vector2 = carry[carry.size() - 1]
		for p in carry:
			dev = maxf(dev, _dist_to_segment(p, a, b))
	check(dev > 40.0, "carry follows a curve, deviation %s" % dev)
	check(pour_rot > 60.0, "spoon tilts over the cauldron got %s" % pour_rot)
	check(exit_rot > 12.0 and exit_rot < 18.0, "spoon exit settles near 15 deg got %s" % exit_rot)
	check(max_ang <= 250.0, "angular speed capped got %s" % max_ang)
	var lip0: Vector2 = s.lip_offset(0.0)
	var lip1: Vector2 = s.lip_offset(76.0)
	check(lip0.y > 12.0, "material sits in the bowl")
	check(lip0.distance_to(lip1) > 8.0, "material slides to the lip as the spoon tilts")
	var chord := 0.0
	var path_len := 0.0
	if approach.size() >= 2:
		chord = (approach[0] as Vector2).distance_to(approach[approach.size() - 1])
		var walk := approach[0] as Vector2
		for p in approach:
			path_len += (p as Vector2).distance_to(walk)
			walk = p
	var curve := 1.0 if chord < 1.0 else path_len / chord
	check(curve > 1.12, "approach is a curve, ratio %s" % curve)
	check(max_step < 22.0, "path step %s px" % max_step)
	check(max_accel < 12.0, "path acceleration %s" % max_accel)
	check(carry_abs < 12.0, "bowl stays level while carrying, rot %s" % carry_abs)
	check(carry_ang < 160.0, "carry angular velocity %s deg/s" % carry_ang)
	var mono := true
	var prev_l := 1.0
	var drop_sum := 0.0
	for lv in level_drops:
		var now := float(lv)
		if now > prev_l + 0.002:
			mono = false
		drop_sum += maxf(0.0, prev_l - now)
		prev_l = now
	check(mono, "mortar level falls monotonically")
	check(level < 0.15, "mortar is nearly empty after the scoops, level %s" % level)
	check(dip_cues == 2 and drag_cues == 2, "two dips and two drags, %s %s" % [dip_cues, drag_cues])
	check(saw_mote, "lift sheds material")
	var early_blob := 0.0
	var drag_blob := 0.0
	var lift_blob := 0.0
	var level_step := 0.0
	var prev_level := 1.0
	var at_first := 1.0
	var at_second := 1.0
	var ang30 := _spoon_ang_at(1.0 / 30.0)
	var s2 = spoon.new()
	s2.begin(Vector2(900, 640), Vector2(180, 70))
	var have_l := false
	while s2.active():
		var pose2: Dictionary = s2.update(1.0 / 60.0, null)
		if not bool(pose2.get("alive", false)):
			break
		var tt2: float = s2.t
		var blob := float(pose2.get("blob", 0.0))
		var lv := float(pose2.get("level", 1.0))
		if have_l:
			level_step = maxf(level_step, absf(lv - prev_level))
		have_l = true
		prev_level = lv
		if tt2 < 0.58:
			early_blob = maxf(early_blob, blob)
		if tt2 > 0.70 and tt2 < 0.82:
			drag_blob = maxf(drag_blob, blob)
		if tt2 > 1.00 and tt2 < 1.10:
			lift_blob = maxf(lift_blob, blob)
		if tt2 >= 1.12 and at_first > 0.9:
			at_first = lv
		if tt2 >= 1.93:
			at_second = lv
	check(early_blob < 0.05, "mound stays empty until the bowl is in the material, blob %s" % early_blob)
	check(drag_blob > 0.25, "mound grows while the spoon drags, blob %s" % drag_blob)
	check(lift_blob > 0.8, "mound is loaded as the spoon rises, blob %s" % lift_blob)
	check(level_step < 0.03, "level moves continuously, step %s" % level_step)
	check(absf(at_first - 0.54) < 0.04, "first scoop drops 0.46, level %s" % at_first)
	check(absf(at_second - 0.08) < 0.04, "second scoop drops 0.46, level %s" % at_second)
	check(ang30 <= 250.0, "angular speed at 30 Hz got %s" % ang30)
	print("ROUND15 curve=%.3f max_step=%.2f max_accel=%.2f max_ang=%.1f ang_acc=%.0f ang30=%.1f carry_ang=%.1f carry_rot=%.2f level=%.3f drop=%.3f exit=%.2f norm=%.3f deep=%.3f scoop=%s lip=%.1f rise=%.3f blob_step=%.3f" % [curve, max_step, max_accel, max_ang, max_ang_acc, ang30, carry_ang, carry_abs, level, drop_sum, exit_rot, worst_norm, deep_norm, scoop, lip_y, dip_rise, max_blob_step])
	_clip_square()


func _clip_square() -> void:
	var square := PackedVector2Array([
		Vector2(0, 0), Vector2(10, 0), Vector2(10, 10), Vector2(0, 10),
	])
	var kept: PackedVector2Array = SpoonTransfer.clip_above(square, 4.0)
	var above := true
	var below := false
	for p in kept:
		if p.y > 4.05:
			above = false
		if p.y < 3.5:
			below = true
	check(kept.size() >= 3 and above and below, "clip_above keeps the top of a square, n %s" % kept.size())
	var area := 0.0
	for i in kept.size():
		var a: Vector2 = kept[i]
		var b: Vector2 = kept[(i + 1) % kept.size()]
		area += a.x * b.y - b.x * a.y
	area = absf(area) * 0.5
	check(area > 35.0 and area < 45.0, "clip_above area %s" % area)


func _spoon_pile() -> void:
	var pile: MortarPile = MortarPile.new()
	pile.sync({"ingredientId": "chamomile", "quantity": 1.0, "grindWork": 1.2, "grinding": false})
	var before: Color = pile.mean_color()
	var spoon: GDScript = load("res://scripts/fx/spoon_transfer.gd")
	var s = spoon.new()
	s.begin(Vector2(900, 640), Vector2(180, 70))
	var matched := false
	var bottom := 1.0
	var saw_hollow := false
	var saw_spill := false
	while s.active():
		var pose: Dictionary = s.update(1.0 / 60.0, pile)
		if not bool(pose.get("alive", false)):
			break
		if float(s.t) > 1.2 and float(s.t) < 1.9 and float(pose.get("blob", 0.0)) > 0.4:
			var col: Color = pose.get("color", Color(0, 0, 0))
			var err := maxf(absf(col.r - before.r), maxf(absf(col.g - before.g), absf(col.b - before.b)))
			matched = err < 0.04
		bottom = minf(bottom, pile.surface_level())
		var hollows: Array = pile.decor()["hollows"]
		if hollows.size() > 0:
			saw_hollow = true
		if (pile.decor()["spills"] as Array).size() > 0:
			saw_spill = true
	check(matched, "spoon mound matches the mortar colour %s" % before)
	check(bottom < 0.12, "mortar bottom shows when empty, fill %s" % bottom)
	check(saw_hollow, "the spoon leaves a hollow")
	check(saw_spill, "material spills beside the hollow")
	var spills: Array = pile.decor()["spills"]
	check(spills.is_empty(), "empty mortar hides leftover spills")
	var sfx_script: GDScript = load("res://scripts/autoload/sfx.gd")
	var names := ""
	for method_v in sfx_script.get_script_method_list():
		names += str(method_v.get("name", "")) + ","
	check(names.contains("spoon_dip") and names.contains("spoon_drag"), "dip and drag sounds")
	_spoon_kind_holds()
	_spoon_empty_carry()
	_spoon_sounds()
	_spoon_art_scale()


func _spoon_ang_at(dt: float) -> float:
	var spoon: GDScript = load("res://scripts/fx/spoon_transfer.gd")
	var s = spoon.new()
	s.begin(Vector2(900, 640), Vector2(180, 70))
	var prev := 0.0
	var have := false
	var peak := 0.0
	while s.active():
		var pose: Dictionary = s.update(dt, null)
		if not bool(pose.get("alive", false)):
			break
		if have:
			peak = maxf(peak, absf(float(pose["rot"]) - prev) / dt)
		have = true
		prev = float(pose["rot"])
	return peak


func _spoon_kind_holds() -> void:
	var pile: MortarPile = MortarPile.new()
	pile.sync({"ingredientId": "ginger", "quantity": 1.0, "grindWork": 1.2, "grinding": false})
	var spoon: GDScript = load("res://scripts/fx/spoon_transfer.gd")
	var s = spoon.new()
	s.begin(Vector2(900, 640), Vector2(180, 70))
	s.update(0.02, pile)
	pile.scoop_rest()
	var bad := false
	var seen := 0
	while s.active():
		var pose: Dictionary = s.update(1.0 / 60.0, pile)
		if not bool(pose.get("alive", false)):
			break
		var cue := str(pose.get("cue", ""))
		if cue == "dip" or cue == "drag":
			seen += 1
			if str(pose.get("kind", "")) != "powder":
				bad = true
	check(seen >= 2 and not bad, "powder cues stay powder after the bowl is empty, seen %s" % seen)
	var grain: MortarPile = MortarPile.new()
	grain.sync({"ingredientId": "poppy", "quantity": 1.0, "grindWork": 1.2, "grinding": false})
	var g = spoon.new()
	g.begin(Vector2(900, 640), Vector2(180, 70))
	g.update(0.02, grain)
	grain.scoop_rest()
	var gbad := false
	var gseen := 0
	while g.active():
		var pose2: Dictionary = g.update(1.0 / 60.0, grain)
		if not bool(pose2.get("alive", false)):
			break
		var cue2 := str(pose2.get("cue", ""))
		if cue2 == "dip" or cue2 == "drag":
			gseen += 1
			if str(pose2.get("kind", "")) != "grain":
				gbad = true
	check(gseen >= 2 and not gbad, "grain cues stay grain after the bowl is empty, seen %s" % gseen)


func _spoon_empty_carry() -> void:
	var pile: MortarPile = MortarPile.new()
	var spoon: GDScript = load("res://scripts/fx/spoon_transfer.gd")
	var s = spoon.new()
	s.begin(Vector2(900, 640), Vector2(180, 70))
	var carry_blob := 0.0
	while s.active():
		var pose: Dictionary = s.update(1.0 / 60.0, pile)
		if not bool(pose.get("alive", false)):
			break
		if str(pose.get("phase", "")) == "carry":
			carry_blob = maxf(carry_blob, float(pose.get("blob", 0.0)))
	check(carry_blob < 0.05, "empty pile does not load the spoon, blob %s" % carry_blob)
	pile.note_hollow(400.0, 600.0)
	pile.set_visual_level(0.05)
	var marks: Array = pile.decor()["spills"]
	check(marks.is_empty(), "empty mortar hides spills")
	pile.set_visual_level(0.8)
	pile.update(3.4, false)
	check((pile.decor()["spills"] as Array).is_empty(), "spills fade out")


func _spoon_sounds() -> void:
	var sfx_script: GDScript = load("res://scripts/autoload/sfx.gd")
	var sfx = sfx_script.new()
	# The noise phase is random. Pin it so the peak check does not flake.
	sfx._rng.seed = 14015
	sfx._noise = PackedFloat32Array()
	sfx._build_noise()
	var peaks := {}
	for which in ["dip", "drag"]:
		for kind in ["powder", "grain", "leaf"]:
			var wave: PackedFloat32Array = sfx.render_spoon(which, kind)
			var peak := 0.0
			for i in wave.size():
				peak = maxf(peak, absf(wave[i]))
			peaks["%s-%s" % [which, kind]] = peak
			check(peak >= 0.24 and peak <= 0.36, "%s %s peak %s" % [kind, which, peak])
	var powder: PackedFloat32Array = sfx.render_spoon("drag", "powder")
	var grain: PackedFloat32Array = sfx.render_spoon("drag", "grain")
	var corr := _spectrum_corr(powder, grain)
	check(corr < 0.4, "powder and grain drags differ, correlation %s" % corr)
	print("ROUND15 sound dip powder=%.3f grain=%.3f leaf=%.3f drag powder=%.3f grain=%.3f leaf=%.3f corr=%.3f" % [peaks["dip-powder"], peaks["dip-grain"], peaks["dip-leaf"], peaks["drag-powder"], peaks["drag-grain"], peaks["drag-leaf"], corr])
	sfx.free()


func _spectrum_corr(a: PackedFloat32Array, b: PackedFloat32Array) -> float:
	# Magnitude at a few bands from the rumble up to the grain click.
	var bands: Array[float] = [90.0, 180.0, 360.0, 700.0, 1400.0, 2400.0, 3600.0, 5200.0, 7400.0]
	var rate := 44100.0
	var n := mini(a.size(), mini(b.size(), 4096))
	var ma: Array = []
	var mb: Array = []
	ma.resize(bands.size())
	mb.resize(bands.size())
	for k in bands.size():
		var re_a := 0.0
		var im_a := 0.0
		var re_b := 0.0
		var im_b := 0.0
		var freq: float = bands[k]
		for i in n:
			var win := 0.5 - 0.5 * cos(TAU * float(i) / float(maxi(n - 1, 1)))
			var ang := TAU * freq * float(i) / rate
			var c := cos(ang)
			var s := sin(ang)
			re_a += a[i] * win * c
			im_a += a[i] * win * s
			re_b += b[i] * win * c
			im_b += b[i] * win * s
		ma[k] = sqrt(re_a * re_a + im_a * im_a)
		mb[k] = sqrt(re_b * re_b + im_b * im_b)
	var bins := bands.size()
	var mean_a := 0.0
	var mean_b := 0.0
	for k in bins:
		mean_a += float(ma[k])
		mean_b += float(mb[k])
	mean_a /= float(bins)
	mean_b /= float(bins)
	var num := 0.0
	var da := 0.0
	var db := 0.0
	for k in bins:
		var xa := float(ma[k]) - mean_a
		var xb := float(mb[k]) - mean_b
		num += xa * xb
		da += xa * xa
		db += xb * xb
	if da < 1e-8 or db < 1e-8:
		return 1.0
	return num / sqrt(da * db)


func _spoon_art_scale() -> void:
	var img: Image = Image.load_from_file(ProjectSettings.globalize_path("res://assets/art/workshop/wooden_spoon.png"))
	if img == null or img.is_empty():
		var tex: Texture2D = load("res://assets/art/workshop/wooden_spoon.png")
		check(tex != null, "spoon texture loads")
		img = tex.get_image()
	check(img != null and img.get_width() == 512, "spoon sheet is 512 wide")
	img.resize(102, 255, Image.INTERPOLATE_LANCZOS)
	var luma := PackedFloat32Array()
	luma.resize(102 * 255)
	var mask := PackedByteArray()
	mask.resize(102 * 255)
	var count := 0
	var sum := 0.0
	for y in 255:
		for x in 102:
			var col := img.get_pixel(x, y)
			var i := y * 102 + x
			var yv := 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b
			luma[i] = yv
			mask[i] = 1 if col.a > 0.4 else 0
			if mask[i] == 1:
				count += 1
				sum += yv
	var mean := sum / float(maxi(count, 1))
	var local := 0.0
	var hp := 0.0
	var nwin := 0
	for y in range(4, 251):
		for x in range(4, 98):
			if mask[y * 102 + x] == 0:
				continue
			var acc := 0.0
			var acc2 := 0.0
			for dy in range(-4, 5):
				for dx in range(-4, 5):
					var v: float = luma[(y + dy) * 102 + (x + dx)]
					acc += v
					acc2 += v * v
			var mu := acc / 81.0
			local += maxf(0.0, acc2 / 81.0 - mu * mu)
			hp += (luma[y * 102 + x] - mu) * (luma[y * 102 + x] - mu)
			nwin += 1
	local /= float(maxi(nwin, 1))
	hp /= float(maxi(nwin, 1))
	var grip := 0
	for y2 in range(40, 90):
		var span := 0
		var on := false
		var left := 0
		for x2 in 102:
			if mask[y2 * 102 + x2] == 1:
				if not on:
					left = x2
					on = true
				span = x2 - left + 1
		grip = maxi(grip, span)
	check(mean >= 0.34, "spoon luma at game scale %s" % mean)
	check(local >= 0.029, "spoon local variance at game scale %s" % local)
	check(hp >= 0.0135, "spoon high-pass energy at game scale %s" % hp)
	check(grip >= 13, "handle width at game scale %s" % grip)
	print("ROUND14 art luma=%.3f var=%.4f hp=%.4f grip=%s" % [mean, local, hp, grip])


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
	check(overlays.find_child("WaxSeal", true, false) != null, "the notebook page has a wax seal")
	game.open_overlay = null
	root.remove_child(main)
	main.free()


func _round5() -> void:
	var glass: GDScript = load("res://scripts/fx/bottle_glass.gd")
	var cork_tex: Texture2D = load("res://assets/art/bottles/glass_cork.webp")
	var cork_img := cork_tex.get_image()
	if cork_img.get_format() != Image.FORMAT_RGBA8:
		cork_img.convert(Image.FORMAT_RGBA8)
	var warm := 0
	var opaque := 0
	for y in range(0, cork_img.get_height(), 3):
		for x in range(0, cork_img.get_width(), 3):
			var px: Color = cork_img.get_pixel(x, y)
			if px.a < 0.75:
				continue
			opaque += 1
			if px.r > px.b + 0.12 and px.r > 0.35:
				warm += 1
	check(opaque > 40, "the corked bottle has a solid rim")
	check(warm * 2 > opaque, "the bottle is brass, copper and wood, warm %s of %s" % [warm, opaque])
	check(not FileAccess.file_exists("res://assets/art/bottles/bottle_open.png"), "old bottle art is gone")
	check(not FileAccess.file_exists("res://assets/art/bottles/bottle_full.png"), "old full bottle art is gone")
	var packed: PackedScene = load("res://scenes/main.tscn")
	var main: Node = packed.instantiate()
	root.add_child(main)
	var workshop: Node = main.get_node("WorkshopPlate/WorkshopViewport/Workshop")
	var overlays: Node = main.get_node("ChromeLayer/Overlays")
	var settings: Node = root.get_node("Settings")
	var sfx: Node = root.get_node("Sfx")
	check(sfx.has_method("page_turn") and sfx.has_method("pen_scratch"), "paper sounds are synthesized")
	sfx.page_turn()
	sfx.pen_scratch()
	var water := Color("#3f6f8f")
	var paint := func(tag: String, want_blue: bool) -> void:
		workshop._sync_liquid()
		var key := str(workshop._water_draw_key)
		check(key.begins_with("show"), "%s refreshes the water (%s)" % [tag, key])
		check(float(workshop._brew.fill) > 0.5, "%s fill %s" % [tag, workshop._brew.fill])
		workshop._brew_painter.present_water(workshop._brew, workshop._mouth, workshop._mouth_r.x, workshop._mouth_r.y)
		var disc: ColorRect = workshop._brew_painter.disc_liquid
		check(disc != null and disc.visible, "%s water is visible" % tag)
		if disc == null:
			return
		var mat := disc.material as ShaderMaterial
		var stop0: Color = mat.get_shader_parameter("stop0")
		check(stop0.a > 0.4, "%s water alpha %s" % [tag, stop0.a])
		check(float(mat.get_shader_parameter("grad_radius")) > 1.0, "%s grad radius" % tag)
		var rect: Vector2 = mat.get_shader_parameter("rect_size")
		check(rect.x > 1.0 and rect.y > 1.0, "%s rect %s" % [tag, rect])
		var mouth: Vector2 = mat.get_shader_parameter("mouth_radii")
		check(mouth.x > 1.0 and mouth.y > 1.0, "%s mouth %s" % [tag, mouth])
		if want_blue:
			var col: Color = workshop._brew.mix_liquid()
			check(absf(col.r - water.r) < 0.08 and absf(col.g - water.g) < 0.08 and absf(col.b - water.b) < 0.08, "%s is clean blue %s" % [tag, col])
	game.start_fresh()
	paint.call("new cauldron", true)
	game.next_customer()
	workshop._sync_brew(0.2)
	paint.call("new customer", true)
	game.reset_brew()
	workshop._sync_brew(0.2)
	paint.call("reset", true)
	var brew: Dictionary = Alchemy.create_brew()
	brew = Alchemy.add_ingredient(brew, "chamomile", 1.0, "fine", game.defs)
	brew = Alchemy.add_ingredient(brew, "saffron", 1.0, "fine", game.defs)
	brew = Alchemy.advance_time(brew, 16.0, game.defs)
	brew = Alchemy.stir(brew, game.defs)
	game.brew = brew
	for _i in 8:
		workshop._sync_brew(0.05)
	workshop._sync_liquid()
	workshop._brew_painter.present_water(workshop._brew, workshop._mouth, workshop._mouth_r.x, workshop._mouth_r.y)
	check(workshop._brew_painter.disc_liquid.visible, "brew keeps the water visible")
	check(float(mat_stop_a(workshop)) > 0.4, "brew water alpha")
	game.bottle_brew()
	workshop.jump_pour("stream", 1.1)
	workshop._sync_liquid()
	workshop._brew_painter.present_water(workshop._brew, workshop._mouth, workshop._mouth_r.x, workshop._mouth_r.y)
	check(workshop._brew_painter.disc_liquid.visible, "pour keeps the water visible")
	workshop.pour = "deliver"
	workshop.pour_t = 2.65
	workshop._cust_phase = "idle"
	workshop._cust_hold = false
	workshop._tick_pour(0.2)
	check(workshop._carry == "desk", "delivery parks an intact bottle, carry %s" % workshop._carry)
	check(workshop._pour_bottle.visible and workshop._pour_bottle.modulate.a > 0.9, "the desk bottle is intact")
	check(str(workshop._pour_bottle.texture.resource_path).find("glass_cork") >= 0, "the desk bottle is corked")
	check(workshop._bottle.visible, "an empty bottle returns to the shelf")
	check(str(workshop._bottle.texture.resource_path).find("glass_open") >= 0, "the shelf bottle is open")
	workshop._sync_liquid()
	check(not str(workshop._bottle_draw_key).begins_with("rest:"), "the shelf bottle is not drawn full, key %s" % workshop._bottle_draw_key)
	workshop._brew_painter.present_water(workshop._brew, workshop._mouth, workshop._mouth_r.x, workshop._mouth_r.y)
	check(workshop._brew_painter.disc_liquid.visible, "delivery leaves water in the cauldron")
	var spot: Vector2 = workshop._counter_spot()
	check(workshop._pour_bottle.position.distance_to(spot) < 3.0, "the bottle sits on the desk")
	workshop._cust_index = game.customer_index
	workshop._cust_phase = "idle"
	workshop._cust_hold = false
	workshop._tick_customer(0.25)
	check(workshop._carry == "hand", "the customer picks the bottle up")
	var happy := str(game.evaluation.get("band", "")) == "excellent" or str(game.evaluation.get("band", "")) == "good"
	check(workshop._cust_emo == ("_happy" if happy else "_sad"), "delivery mood matches the result")
	workshop._tick_customer(0.35)
	check(workshop._pour_bottle.position.distance_to(spot) > 12.0, "the bottle leaves the desk in their hands")
	workshop._carry = "desk"
	workshop._carry_t = 0.0
	workshop._pour_bottle.position = spot
	workshop._pour_bottle.visible = true
	workshop._pour_bottle.modulate.a = 1.0
	workshop._cust_phase = "idle"
	game.evaluation["band"] = "poor"
	workshop._tick_customer(0.16)
	check(workshop._carry == "hand" and workshop._cust_emo == "_sad", "a disappointed customer still takes the bottle")
	workshop._carry = "desk"
	workshop._pour_bottle.visible = true
	workshop._pour_bottle.modulate.a = 1.0
	workshop._pour_bottle.position = spot
	workshop._cust_phase = "idle"
	game.customer_index += 1
	workshop._tick_customer(0.5)
	check(workshop._carry == "hand", "a new customer takes the bottle off the desk")
	check(workshop._pour_bottle.modulate.a < 0.95, "the bottle starts to fade as they leave")
	workshop._tick_customer(0.6)
	check(workshop._carry == "" and not workshop._pour_bottle.visible, "the bottle is gone when the customer has left")
	workshop._carry = "desk"
	workshop._pour_bottle.visible = true
	workshop._pour_bottle.modulate.a = 1.0
	workshop._cust_phase = "idle"
	game.customer_index = workshop._cust_index
	game.reset_brew()
	workshop._sync_liquid()
	check(workshop._carry == "" and not workshop._pour_bottle.visible, "reset removes a leftover bottle")
	workshop._sync_brew(0.2)
	paint.call("reset after delivery", true)
	var again: Dictionary = Alchemy.create_brew()
	again = Alchemy.add_ingredient(again, "ginger", 1.0, "crushed", game.defs)
	game.brew = again
	for _j in 4:
		workshop._sync_brew(0.05)
	workshop.begin_discard()
	workshop._sync_liquid()
	check(workshop._carry == "", "a throw clears a carried bottle")
	check(str(workshop._water_draw_key) == "hidden", "water hides while the cauldron is in the air")
	workshop._tick_discard(5.0)
	for _k in 45:
		workshop._sync_brew(0.1)
	paint.call("respawn", true)
	var customers: Array = game.defs["customers"]
	var best_i := 0
	var best_n := 0
	for i in customers.size():
		var n := str(customers[i].get("requestFa", "")).length()
		if n > best_n:
			best_n = n
			best_i = i
	game.start_fresh()
	game.customer_index = best_i
	var used: Array = []
	for ing in game.defs["ingredients"]:
		used.append(ing["id"])
	game.used_ingredient_ids = used
	overlays.force_reveal = true
	settings.effects_enabled = true
	game.open_overlay = "customer_request"
	overlays._built = ""
	overlays.advance(0.0)
	_assert_text_inside(overlays.get_node("Paper"), "request")
	game.open_overlay = "notebook"
	overlays._built = ""
	overlays.advance(0.0)
	_assert_text_inside(overlays.get_node("Paper"), "notebook")
	check(overlays.find_child("WaxSeal", true, false) != null, "notebook seal still stamps")
	var long_text := str(customers[best_i].get("requestFa", "")) + " " + str(customers[best_i].get("requestFa", ""))
	game.result = {"effectProfile": {}, "stabilityLabel": "stable"}
	game.evaluation = {"band": "good", "reactionFa": long_text, "score": 1}
	game.open_overlay = "result"
	overlays._built = ""
	overlays.advance(0.0)
	_assert_text_inside(overlays.get_node("Paper"), "result")
	overlays.force_reveal = false
	overlays._reveal = 0.4
	overlays._built = ""
	overlays.advance(0.0)
	var bubble := overlays.get_node("ReactionBubble")
	_assert_text_inside(bubble, "dialogue")
	var note := workshop.find_child("CustomerNote", true, false) as Control
	workshop._sync_note()
	_assert_text_inside(note, "customer card")
	settings.effects_enabled = false
	overlays.force_reveal = false
	game.open_overlay = "notebook"
	overlays._built = ""
	overlays.advance(0.0)
	var paper: Control = overlays.get_node("Paper")
	near(paper.scale.y, 1.0, "effects off opens the notebook at once", 0.02)
	var ink: Array = overlays._ink_labels(paper)
	check(ink.size() > 2, "notebook lines are revealed as ink")
	check(float(ink[0].visible_ratio) > 0.99, "effects off shows the writing immediately")
	settings.effects_enabled = true
	overlays._built = ""
	overlays.advance(0.0)
	paper = overlays.get_node("Paper")
	check(paper.scale.y < 0.92, "the notebook opens with a page turn")
	overlays.advance(0.12)
	ink = overlays._ink_labels(paper)
	check(float(ink[ink.size() - 1].visible_ratio) < 0.99, "the pen is still writing")
	overlays._seal_t = 0.32
	overlays._seal_hit = true
	overlays._tick_seal(0.0)
	var seal := overlays.find_child("WaxSeal", true, false) as Control
	check(seal.scale.y < seal.scale.x - 0.04, "the seal squishes as it stamps")
	overlays.advance(1.6)
	paper = overlays.get_node("Paper")
	near(paper.scale.y, 1.0, "the notebook settles open", 0.05)
	ink = overlays._ink_labels(paper)
	check(float(ink[0].visible_ratio) > 0.99, "the writing finishes")
	settings.effects_enabled = true
	overlays.force_reveal = false
	game.open_overlay = null
	overlays.advance(0.0)
	root.remove_child(main)
	main.free()


func _round6() -> void:
	var poly = load("res://scripts/fx/poly_draw.gd")
	var two := PackedVector2Array([Vector2.ZERO, Vector2(4, 0)])
	check(poly.kept_polygon(two).is_empty(), "a two-point polygon is not drawn")
	var flat := PackedVector2Array([Vector2.ZERO, Vector2(3, 0), Vector2(8, 0)])
	check(poly.kept_polygon(flat).is_empty(), "a collinear polygon is not drawn")
	var bow := PackedVector2Array([Vector2(0, 0), Vector2(12, 10), Vector2(0, 10), Vector2(12, 0)])
	check(poly.kept_polygon(bow).is_empty(), "a self-intersecting polygon is not drawn")
	var tri := PackedVector2Array([Vector2(0, 0), Vector2(20, 0), Vector2(0, 16)])
	check(poly.kept_polygon(tri).size() == 3, "a real triangle is kept")
	var host := Node2D.new()
	root.add_child(host)
	var motion = load("res://scripts/fx/discard_motion.gd")
	motion._spatter(host, {"r": 0.0, "stretch": 2.4, "ang": 0.3, "x": 4.0, "y": 6.0}, 0.0, Color(0.45, 0.2, 0.1))
	motion._tendril(host, {"len": 0.0, "width": 0.0, "x": 2.0, "y": 2.0, "ang": 0.4}, 0.0, Color(0.4, 0.15, 0.08))
	var glass = load("res://scripts/fx/bottle_glass.gd")
	glass.draw(host, Rect2(0, 0, 1.0, 1.0), "tilt", 0.0, [], Callable(self, "_round6_tint"), 0.0)
	var painter = load("res://scripts/fx/classic_brew_painter.gd").new()
	painter._c = host
	painter._paint(PackedVector2Array([Vector2.ZERO, Vector2(1, 0), Vector2(2, 0)]), Color(0.25, 0.45, 0.55))
	var chip := Image.create(4, 4, false, Image.FORMAT_RGBA8)
	chip.fill(Color.WHITE)
	var chip_tex := ImageTexture.create_from_image(chip)
	painter._paint_tex(
		PackedVector2Array([Vector2.ZERO, Vector2(0.3, 0.0), Vector2(0.6, 0.01)]),
		PackedVector2Array([Vector2.ZERO, Vector2.ONE, Vector2(0, 1)]),
		chip_tex,
		Color.WHITE
	)
	painter._c = null
	root.remove_child(host)
	host.free()
	var emo_tex: Texture2D = load("res://assets/art/customer/customer_woman_cloth_happy.png") as Texture2D
	var idle_tex: Texture2D = load("res://assets/art/customer/customer_woman_cloth.png") as Texture2D
	var emo_img: Image = emo_tex.get_image()
	var idle_img: Image = idle_tex.get_image()
	var mask_script = load("res://scripts/view/workshop_view.gd")
	var holder: Node = mask_script.new()
	var masked: Image = holder._mask_hand_image(emo_img, idle_img)
	holder.free()
	var hand_at := _far_pixel(emo_img, idle_img, 0.55, 0.82)
	var face_at := _far_pixel(emo_img, idle_img, 0.08, 0.22)
	check(hand_at.x >= 0, "the happy portrait differs from idle in the hands")
	var hand_m: Color = masked.get_pixel(hand_at.x, hand_at.y)
	var hand_i: Color = idle_img.get_pixel(hand_at.x, hand_at.y)
	var hand_e: Color = emo_img.get_pixel(hand_at.x, hand_at.y)
	check(absf(hand_m.r - hand_i.r) + absf(hand_m.g - hand_i.g) + absf(hand_m.b - hand_i.b) < 0.02, "the painted hand bottle is replaced by the idle hands")
	check(absf(hand_e.r - hand_i.r) + absf(hand_e.g - hand_i.g) + absf(hand_e.b - hand_i.b) > 0.15, "that hand pixel was the baked bottle, not idle")
	check(face_at.x >= 0, "the happy face differs from idle")
	var face_m: Color = masked.get_pixel(face_at.x, face_at.y)
	var face_e: Color = emo_img.get_pixel(face_at.x, face_at.y)
	check(absf(face_m.r - face_e.r) + absf(face_m.g - face_e.g) + absf(face_m.b - face_e.b) < 0.02, "the reaction face stays on the portrait")
	var packed: PackedScene = load("res://scenes/main.tscn")
	var main: Node = packed.instantiate()
	root.add_child(main)
	var workshop: Node = main.get_node("WorkshopPlate/WorkshopViewport/Workshop")
	var water := Color("#3f6f8f")
	game.start_fresh()
	var coloured: Dictionary = Alchemy.create_brew()
	coloured = Alchemy.add_ingredient(coloured, "chamomile", 1.0, "fine", game.defs)
	coloured = Alchemy.add_ingredient(coloured, "saffron", 1.0, "fine", game.defs)
	coloured = Alchemy.advance_time(coloured, 16.0, game.defs)
	coloured = Alchemy.stir(coloured, game.defs)
	game.brew = coloured
	game.bottle_brew()
	workshop._cust_index = game.customer_index
	workshop._cust_phase = "idle"
	workshop.pour = "deliver"
	workshop.pour_t = 2.65
	workshop._tick_pour(0.2)
	var ink: Color = workshop._carry_ink
	var ink_far := absf(ink.r - water.r) + absf(ink.g - water.g) + absf(ink.b - water.b)
	check(ink_far > 0.25, "the parked bottle keeps the potion colour %s" % ink)
	workshop._carry_level = 0.55
	workshop._cust_phase = "leave"
	game.next_customer()
	workshop._sync_liquid()
	workshop._tick_carry(0.3)
	var after: Color = workshop._carry_ink
	check(absf(after.r - ink.r) < 0.001 and absf(after.g - ink.g) < 0.001 and absf(after.b - ink.b) < 0.001, "leaving does not recolour the bottle")
	check(absf(float(workshop._carry_level) - 0.55) < 0.001, "leaving does not change the carried level")
	var carry_key := str(workshop._bottle_paint_key())
	check(carry_key.begins_with("carry:"), "the carried bottle still paints, key %s" % carry_key)
	check(carry_key.find("%.3f" % ink.r) >= 0, "the paint key keeps the potion red %s" % carry_key)
	check(carry_key.find("0.55") >= 0, "the paint key keeps the carried level %s" % carry_key)
	var emptied: Color = glass.blend_color([], Callable(self, "_round6_tint"), 1.0)
	check(absf(emptied.r - water.r) < 0.02 and absf(workshop._carry_ink.r - emptied.r) > 0.05, "an empty brew would be water, the bottle is not")
	game.customer_index = 0
	game.evaluation = {"band": "good", "reactionFa": "خوب", "score": 1}
	workshop.jump_customer("react", 0.15)
	check(workshop._customer.material == null, "the reaction portrait is a picture, not a second glass")
	var shown: Image = (workshop._customer.texture as Texture2D).get_image()
	var shown_hand: Color = shown.get_pixel(hand_at.x, hand_at.y)
	var shown_face: Color = shown.get_pixel(face_at.x, face_at.y)
	check(absf(shown_hand.r - hand_i.r) + absf(shown_hand.g - hand_i.g) + absf(shown_hand.b - hand_i.b) < 0.02, "the customer on screen has no baked bottle")
	check(absf(shown_face.r - face_e.r) + absf(shown_face.g - face_e.g) + absf(shown_face.b - face_e.b) < 0.02, "the customer on screen keeps the happy face")
	workshop.jump_customer("idle", 0.2)
	check(workshop._customer.material == null, "the idle portrait is not masked")
	check(str(workshop._customer.texture.resource_path).find("customer_woman_cloth.png") >= 0, "idle uses the plain portrait")
	game.start_fresh()
	var thrown: Dictionary = Alchemy.create_brew()
	thrown = Alchemy.add_ingredient(thrown, "ginger", 1.0, "crushed", game.defs)
	game.brew = thrown
	workshop.begin_discard()
	var saw_flight := false
	var saw_rise := false
	var rose_fill := 0.0
	var saw_more := false
	var min_drop := 0.0
	var dt := 1.0 / 60.0
	for _n in 320:
		workshop._sync_brew(dt)
		workshop._tick_discard(dt)
		workshop._sync_liquid()
		workshop._sync_pot_spin()
		var t := float(workshop.discard_t)
		var phase := str(workshop._brew.spawn_phase)
		if t >= 0.0 and phase == "fall":
			if not saw_flight:
				check(str(workshop._water_draw_key) == "hidden", "water stays hidden while the new pot is still falling")
			saw_flight = true
			min_drop = minf(min_drop, float(workshop._brew.spawn_y))
		if t < 0.0:
			continue
		var fill := float(workshop._brew.fill)
		if phase == "settle" and fill > 0.12 and fill < 0.82 and not saw_rise:
			saw_rise = true
			rose_fill = fill
			check(str(workshop._water_draw_key).begins_with("show"), "water is drawn once the pot has landed")
			workshop._brew_painter.present_water(workshop._brew, workshop._mouth, workshop._mouth_r.x, workshop._mouth_r.y)
			var disc: ColorRect = workshop._brew_painter.disc_liquid
			check(disc != null and disc.visible, "the rising water is visible")
			if disc != null:
				var mat := disc.material as ShaderMaterial
				var stop0: Color = mat.get_shader_parameter("stop0")
				check(stop0.a > 0.4, "rising water alpha %s" % stop0.a)
				check(float(mat.get_shader_parameter("grad_radius")) > 1.0, "rising water gradient")
			var col: Color = workshop._brew.mix_liquid()
			check(absf(col.r - water.r) < 0.08 and absf(col.g - water.g) < 0.08 and absf(col.b - water.b) < 0.08, "the new pot fills with clean blue %s" % col)
			check(t < 4.8, "the fill is underway before the throw animation ends")
		elif saw_rise and not saw_more and phase != "fall" and fill > rose_fill + 0.18 and t >= 0.0:
			saw_more = true
			check(str(workshop._water_draw_key).begins_with("show"), "water stays up as the level rises")
			workshop._brew_painter.present_water(workshop._brew, workshop._mouth, workshop._mouth_r.x, workshop._mouth_r.y)
			check(workshop._brew_painter.disc_liquid.visible, "the fuller water is still visible")
	check(saw_flight, "the new pot falls back in")
	check(min_drop < -200.0, "the new pot drops from above the frame, y %s" % min_drop)
	check(saw_rise, "water rises from the bottom after landing")
	check(saw_more, "the water keeps rising during the throw")
	root.remove_child(main)
	main.free()


func _round7() -> void:
	var glass = load("res://scripts/fx/bottle_glass.gd")
	check(glass.half_width(0.62) > 0.30, "the flask belly is round")
	check(glass.half_width(0.62) > glass.half_width(0.24) * 4.0, "the belly is much wider than the neck")
	check(glass.half_width(0.96) < 0.04, "the flask has no stand")
	var open_tex: Texture2D = load("res://assets/art/bottles/glass_open.webp")
	var img: Image = open_tex.get_image()
	if img.get_format() != Image.FORMAT_RGBA8:
		img.convert(Image.FORMAT_RGBA8)
	check(img.get_width() == glass.TEX_W and img.get_height() == glass.TEX_H, "flask texture %s" % img.get_size())
	var belly: Color = img.get_pixel(glass.SAMPLE_X, glass.SAMPLE_Y)
	check(belly.a < 0.12, "the upper belly stays clear for the liquor %s" % belly.a)
	var hi_a := 0.0
	var hy := int(0.54 * float(img.get_height()))
	for x in range(0, int(img.get_width() / 2)):
		var px: Color = img.get_pixel(x, hy)
		if px.r > 0.92 and px.g > 0.90:
			hi_a = maxf(hi_a, px.a)
	check(hi_a > 0.08, "a crescent highlight sits on the glass %s" % hi_a)
	var contact := 0
	for y in range(img.get_height() - 1, int(0.5 * float(img.get_height())), -1):
		var glass_row := false
		var x := int(float(img.get_width()) * 0.35)
		while x < int(float(img.get_width()) * 0.65):
			var row_px: Color = img.get_pixel(x, y)
			if row_px.a > 0.35 and row_px.g + 0.02 > row_px.r:
				glass_row = true
				break
			x += 3
		if glass_row:
			contact = y
			break
	var shade: Color = img.get_pixel(int(img.get_width() / 2), mini(contact + 10, img.get_height() - 1))
	check(shade.a > 0.04 and shade.a < 0.7, "a soft shadow sits under the flask %s" % shade.a)
	var feet := 0
	for y in range(contact + 4, img.get_height(), 3):
		for x in range(0, img.get_width(), 6):
			if img.get_pixel(x, y).a > 0.8:
				feet += 1
	check(feet == 0, "nothing opaque stands under the round bottom")
	var poly: PackedVector2Array = glass.liquid_polygon(Rect2(0, 0, 120, 220), 0.35, 0.0)
	var span := 0.0
	if poly.size() > 0:
		var lo := poly[0].x
		var hi_x := poly[0].x
		for p in poly:
			lo = minf(lo, p.x)
			hi_x = maxf(hi_x, p.x)
		span = hi_x - lo
	check(poly.size() >= 20 and span > 40.0, "a low fill still follows the round belly, span %s" % span)


func _round8() -> void:
	var glass = load("res://scripts/fx/bottle_glass.gd")
	var open_tex: Texture2D = load("res://assets/art/bottles/glass_open.webp")
	var cork_tex: Texture2D = load("res://assets/art/bottles/glass_cork.webp")
	var img: Image = open_tex.get_image()
	var cork: Image = cork_tex.get_image()
	if img.get_format() != Image.FORMAT_RGBA8:
		img.convert(Image.FORMAT_RGBA8)
	if cork.get_format() != Image.FORMAT_RGBA8:
		cork.convert(Image.FORMAT_RGBA8)
	var w := img.get_width()
	var h := img.get_height()
	var rows: Array[float] = []
	rows.resize(h)
	var best := 0.0
	for y in h:
		var left := -1
		var right := -1
		for x in w:
			if img.get_pixel(x, y).a > 0.20:
				if left < 0:
					left = x
				right = x
		var half := 0.0 if left < 0 else float(right - left) * 0.5
		rows[y] = half
		best = maxf(best, half)
	var y_lo := -1
	var y_hi := -1
	for y in h:
		if rows[y] >= best - 2.0:
			if y_lo < 0:
				y_lo = y
			y_hi = y
	var mid := float(y_lo + y_hi) * 0.5 / float(h)
	check(mid > 0.55 and mid < 0.60, "the widest row sits in the lower middle, got %s" % mid)
	var rms_best := 1.0
	var cy := y_lo
	while cy <= y_hi:
		var acc := 0.0
		var n := 0
		var y := int(0.48 * float(h))
		var y_end := mini(int(float(cy) + best * 0.70), h)
		while y < y_end:
			var dy := float(y - cy)
			var pred := sqrt(maxf(best * best - dy * dy, 0.0))
			var err := rows[y] - pred
			acc += err * err
			n += 1
			y += 1
		if n > 10:
			rms_best = minf(rms_best, sqrt(acc / float(n)) / best)
		cy += 1
	check(rms_best < 0.03, "belly circle-fit residual %s of the radius" % rms_best)
	var contact_half := 0.0
	for y in range(h - 1, int(0.55 * float(h)), -1):
		var left := -1
		var right := -1
		var x := 0
		while x < w:
			var px: Color = img.get_pixel(x, y)
			if px.a > 0.35 and px.g + 0.02 > px.r:
				if left < 0:
					left = x
				right = x
			x += 2
		if left >= 0:
			var half := float(right - left) * 0.5
			if half > best * 0.18:
				contact_half = half
				break
	check(contact_half > best * 0.18, "the base is a flat chord, half %s" % contact_half)
	var wax := 0
	var outside := 0
	for y in range(int(0.08 * float(h)), int(0.26 * float(h))):
		var edge_l := -1
		var edge_r := -1
		for x in w:
			if img.get_pixel(x, y).a > 0.20:
				if edge_l < 0:
					edge_l = x
				edge_r = x
		if edge_l < 0:
			continue
		for x in range(edge_l, edge_r + 1):
			var px: Color = cork.get_pixel(x, y)
			if px.a > 0.70 and px.r > 0.48 and px.g < 0.34 and px.b < 0.24 and px.r > px.g + 0.25:
				wax += 1
				if x <= edge_l + 1 or x >= edge_r - 1:
					outside += 1
	check(wax > 80, "the wax seal is visible, %s px" % wax)
	check(outside == 0, "wax stays inside the neck, %s px outside" % outside)
	var dark := 0
	var dark_l := 0.0
	var paper := 0
	var paper_l := 0.0
	for y in range(int(0.58 * float(h)), int(0.78 * float(h))):
		for x in range(int(0.30 * float(w)), int(0.75 * float(w))):
			var px: Color = img.get_pixel(x, y)
			if px.a < 0.85:
				continue
			var luma := 0.299 * px.r + 0.587 * px.g + 0.114 * px.b
			if luma < 60.0 / 255.0 and px.r > px.b:
				dark += 1
				dark_l += luma
			elif luma > 0.45 and px.r > 0.55 and px.g > 0.40:
				paper += 1
				paper_l += luma
	check(dark > 200, "the label carries ink, %s px" % dark)
	check(paper > 200, "the label card is there, %s px" % paper)
	var ink_luma := dark_l / float(maxi(dark, 1))
	var card_luma := paper_l / float(maxi(paper, 1))
	check(ink_luma * 255.0 < 60.0, "ink luma %s" % (ink_luma * 255.0))
	check(card_luma - ink_luma > 0.25, "ink contrast against the card %s" % (card_luma - ink_luma))
	var crest: Array[int] = []
	for vf in [0.46, 0.57, 0.70]:
		var y := int(vf * float(h))
		var best_x := 0
		var best_s := 0.0
		for x in range(0, int(w / 2)):
			var px: Color = img.get_pixel(x, y)
			var s := px.r if px.a > 0.08 else 0.0
			if s > best_s:
				best_s = s
				best_x = x
		crest.append(best_x)
	check(absi(crest[0] - crest[1]) > 8 and absi(crest[2] - crest[1]) > 8, "the highlight bends with the belly %s %s %s" % [crest[0], crest[1], crest[2]])
	var wall := 0.0
	var wall_n := 0
	var wy := int(0.52 * float(h))
	var edge := 0
	for x in range(0, int(w / 2)):
		if img.get_pixel(x, wy).a > 0.20:
			edge = x
			break
	for x in range(edge, mini(edge + 28, w)):
		wall += img.get_pixel(x, wy).a
		wall_n += 1
	check(wall_n > 0 and wall / float(wall_n) > 0.35, "the glass wall reads at desk size %s" % (wall / float(maxi(wall_n, 1))))


func _round9() -> void:
	var open_tex: Texture2D = load("res://assets/art/bottles/glass_open.webp")
	var img: Image = open_tex.get_image()
	if img.get_format() != Image.FORMAT_RGBA8:
		img.convert(Image.FORMAT_RGBA8)
	var w := img.get_width()
	var h := img.get_height()
	var y0 := int(0.52 * float(h))
	var y1 := int(0.80 * float(h))
	var x0 := int(0.15 * float(w))
	var x1 := int(0.82 * float(w))
	var bw := x1 - x0
	var bh := y1 - y0
	var mask := PackedByteArray()
	mask.resize(bw * bh)
	var ink_l := x1
	var ink_r := x0
	var ink_n := 0
	for y in range(y0, y1):
		for x in range(x0, x1):
			var px: Color = img.get_pixel(x, y)
			var luma := 0.299 * px.r + 0.587 * px.g + 0.114 * px.b
			if px.a > 0.85 and luma < 60.0 / 255.0 and px.r < 0.30 and px.r > px.b:
				mask[(y - y0) * bw + (x - x0)] = 1
				ink_n += 1
				ink_l = mini(ink_l, x)
				ink_r = maxi(ink_r, x)
	check(ink_n > 400, "the word has a body of ink, %s px" % ink_n)
	var seen := PackedByteArray()
	seen.resize(bw * bh)
	var best_n := 0
	var best_w := 0
	var second_n := 0
	var stack: Array[int] = []
	for y in bh:
		for x in bw:
			var start := y * bw + x
			if mask[start] == 0 or seen[start] != 0:
				continue
			stack.clear()
			stack.append(start)
			seen[start] = 1
			var n := 0
			var xa := x
			var xb := x
			var sp := 0
			while sp < stack.size():
				var cur: int = stack[sp]
				sp += 1
				n += 1
				var cx := cur % bw
				var cy := int(cur / bw)
				xa = mini(xa, cx)
				xb = maxi(xb, cx)
				for nb in [cur - 1, cur + 1, cur - bw, cur + bw]:
					if nb < 0 or nb >= bw * bh:
						continue
					if cur % bw == 0 and nb == cur - 1:
						continue
					if cur % bw == bw - 1 and nb == cur + 1:
						continue
					if mask[nb] == 1 and seen[nb] == 0:
						seen[nb] = 1
						stack.append(nb)
			var width := xb - xa + 1
			if n > best_n:
				second_n = best_n
				best_n = n
				best_w = width
			elif n > second_n:
				second_n = n
	var span := ink_r - ink_l + 1
	check(best_w > int(float(span) * 0.62), "the ink is one word across the label, width %s of %s" % [best_w, span])
	check(second_n * 2 < best_n, "the word is not three separate boxes, %s vs %s" % [best_n, second_n])


func _round11() -> void:
	var open_tex: Texture2D = load("res://assets/art/bottles/glass_open.webp")
	var img: Image = open_tex.get_image()
	if img.get_format() != Image.FORMAT_RGBA8:
		img.convert(Image.FORMAT_RGBA8)
	var w := img.get_width()
	var h := img.get_height()
	var y0 := int(0.55 * float(h))
	var y1 := int(0.82 * float(h))
	var x0 := int(0.18 * float(w))
	var x1 := int(0.82 * float(w))
	var bw := x1 - x0
	var bh := y1 - y0
	var mask := PackedByteArray()
	mask.resize(bw * bh)
	var ink_n := 0
	for y in range(y0, y1):
		for x in range(x0, x1):
			var px: Color = img.get_pixel(x, y)
			var luma := 0.299 * px.r + 0.587 * px.g + 0.114 * px.b
			if px.a > 0.85 and luma < 70.0 / 255.0 and px.r < 0.28 and px.r > px.b:
				mask[(y - y0) * bw + (x - x0)] = 1
				ink_n += 1
	check(ink_n > 400, "the word still has a body of ink, %s px" % ink_n)
	var sizes := _eight_sizes(mask, bw, bh)
	var best_n := 0
	var second_n := 0
	if sizes.size() > 0:
		best_n = sizes[0]
	if sizes.size() > 1:
		second_n = sizes[1]
	var big := 0
	for n in sizes:
		if n >= 12:
			big += 1
	check(best_n >= int(float(ink_n) * 0.85), "the ink is one 8-connected stroke, %s of %s" % [best_n, ink_n])
	check(second_n == 0 and big == 1, "the label has no stray ink, %s px second, %s pieces" % [second_n, big])
	var iou_d := _mask_iou(mask, bw, bh, "res://tests/ref/dawa_ref.png")
	var iou_w := _mask_iou(mask, bw, bh, "res://tests/ref/wa_ref.png")
	check(iou_d >= 0.65 and iou_w < 0.15, "the label reads دوا, IoU %.3f vs وا %.3f" % [iou_d, iou_w])


func _round12() -> void:
	var names := ["amber", "mint", "borage", "saffron"]
	var bodies: Array[Color] = [
		_liquor_body(["chamomile", "saffron"]),
		_liquor_body(["mint"]),
		_liquor_body(["borage"]),
		_liquor_body(["saffron"]),
	]
	for i in bodies.size():
		var body: Color = bodies[i]
		var img := BottleGlass.gradient_image(body)
		var w := img.get_width()
		var h := img.get_height()
		var x0 := int(float(w) * 0.30)
		var x1 := int(float(w) * 0.70)
		var max_step := 0.0
		var prev := _row_luma(img, 0, x0, x1)
		for y in range(1, h):
			var cur := _row_luma(img, y, x0, x1)
			max_step = maxf(max_step, absf(cur - prev))
			prev = cur
		check(max_step < 3.0, "%s adjacent-row luma step %.2f" % [names[i], max_step])
		var top := _row_luma(img, 1, x0, x1)
		var bot := _row_luma(img, h - 2, x0, x1)
		check(top > bot + 30.0, "%s keeps a top-to-base gradient %.1f -> %.1f" % [names[i], top, bot])
		var mid_y := int(round(0.24 * float(h - 1)))
		var mid := Color(0, 0, 0)
		var n := 0
		for x in range(x0, x1):
			mid += img.get_pixel(x, mid_y)
			n += 1
		mid /= float(maxi(n, 1))
		var worst := maxf(absf(mid.r - body.r), maxf(absf(mid.g - body.g), absf(mid.b - body.b))) * 255.0
		check(worst < 15.0, "%s plateau stays on the snapshot, %.1f RGB" % [names[i], worst])
		if names[i] == "amber":
			check(top > 120.0 and top < 175.0 and bot > 60.0 and bot < 95.0, "amber luma %.1f -> %.1f" % [top, bot])


func _liquor_body(ids: Array) -> Color:
	var entries: Array = []
	for id in ids:
		entries.append({"ingredientId": id, "quantity": 1.0})
	return BottleGlass.blend_color(entries, Callable(self, "_flat_tint"), 1.0)


func _flat_tint(id: String) -> Color:
	return Color(ClassicBrewSim.flat_tint(id))


func _row_luma(img: Image, y: int, x0: int, x1: int) -> float:
	var acc := 0.0
	var n := 0
	for x in range(x0, x1):
		var px := img.get_pixel(x, y)
		acc += (0.299 * px.r + 0.587 * px.g + 0.114 * px.b) * 255.0
		n += 1
	return acc / float(maxi(n, 1))


func _eight_sizes(mask: PackedByteArray, bw: int, bh: int) -> Array:
	var seen := PackedByteArray()
	seen.resize(mask.size())
	var sizes: Array = []
	var stack: Array[int] = []
	for i in mask.size():
		if mask[i] == 0 or seen[i] != 0:
			continue
		stack.clear()
		stack.append(i)
		seen[i] = 1
		var n := 0
		var sp := 0
		while sp < stack.size():
			var cur: int = stack[sp]
			sp += 1
			n += 1
			var cx := cur % bw
			var cy := int(cur / float(bw))
			for dy in range(-1, 2):
				for dx in range(-1, 2):
					if dx == 0 and dy == 0:
						continue
					var nx := cx + dx
					var ny := cy + dy
					if nx < 0 or ny < 0 or nx >= bw or ny >= bh:
						continue
					var nb: int = ny * bw + nx
					if mask[nb] == 1 and seen[nb] == 0:
						seen[nb] = 1
						stack.append(nb)
		sizes.append(n)
	sizes.sort()
	sizes.reverse()
	return sizes


func _mask_iou(mask: PackedByteArray, bw: int, bh: int, ref_path: String) -> float:
	var minx := bw
	var maxx := 0
	var miny := bh
	var maxy := 0
	var any := false
	for y in bh:
		for x in bw:
			if mask[y * bw + x] == 0:
				continue
			any = true
			minx = mini(minx, x)
			maxx = maxi(maxx, x)
			miny = mini(miny, y)
			maxy = maxi(maxy, y)
	if not any:
		return 0.0
	var cw := maxx - minx + 1
	var ch := maxy - miny + 1
	var baked := Image.create(cw, ch, false, Image.FORMAT_L8)
	baked.fill(Color(0, 0, 0))
	for y in ch:
		for x in cw:
			if mask[(y + miny) * bw + (x + minx)] == 1:
				baked.set_pixel(x, y, Color(1, 1, 1))
	var ref := Image.new()
	var err := ref.load(ProjectSettings.globalize_path(ref_path))
	if err != OK:
		return 0.0
	ref.convert(Image.FORMAT_L8)
	var rminx := ref.get_width()
	var rmaxx := 0
	var rminy := ref.get_height()
	var rmaxy := 0
	for y in ref.get_height():
		for x in ref.get_width():
			if ref.get_pixel(x, y).r < 0.45:
				continue
			rminx = mini(rminx, x)
			rmaxx = maxi(rmaxx, x)
			rminy = mini(rminy, y)
			rmaxy = maxi(rmaxy, y)
	if rmaxx < rminx:
		return 0.0
	var rw := rmaxx - rminx + 1
	var rh := rmaxy - rminy + 1
	var ref_c := Image.create(rw, rh, false, Image.FORMAT_L8)
	ref_c.fill(Color(0, 0, 0))
	for y in rh:
		for x in rw:
			if ref.get_pixel(x + rminx, y + rminy).r >= 0.45:
				ref_c.set_pixel(x, y, Color(1, 1, 1))
	var tw := maxi(1, int(round(float(cw) * float(rh) / float(ch))))
	baked.resize(tw, rh, Image.INTERPOLATE_BILINEAR)
	var rad := 5
	var pad := rad + 2
	var canvas_w := maxi(tw, rw) + pad * 2
	var canvas_h := rh + pad * 2
	var A := PackedByteArray()
	var B := PackedByteArray()
	A.resize(canvas_w * canvas_h)
	B.resize(canvas_w * canvas_h)
	var ax := pad + int((maxi(tw, rw) - tw) / 2.0)
	var bx := pad + int((maxi(tw, rw) - rw) / 2.0)
	for y in rh:
		for x in tw:
			if baked.get_pixel(x, y).r > 0.45:
				A[(y + pad) * canvas_w + (x + ax)] = 1
		for x2 in rw:
			if ref_c.get_pixel(x2, y).r > 0.45:
				B[(y + pad) * canvas_w + (x2 + bx)] = 1
	A = _dilate_mask(A, canvas_w, canvas_h, rad)
	B = _dilate_mask(B, canvas_w, canvas_h, rad)
	var inter := 0
	var union := 0
	for i in A.size():
		var a := A[i] == 1
		var b := B[i] == 1
		if a and b:
			inter += 1
		if a or b:
			union += 1
	if union == 0:
		return 0.0
	return float(inter) / float(union)


func _dilate_mask(mask: PackedByteArray, w: int, h: int, rad: int) -> PackedByteArray:
	var out := PackedByteArray()
	out.resize(mask.size())
	var r2 := rad * rad
	for y in h:
		for x in w:
			if mask[y * w + x] == 0:
				continue
			for dy in range(-rad, rad + 1):
				for dx in range(-rad, rad + 1):
					if dx * dx + dy * dy > r2:
						continue
					var nx := x + dx
					var ny := y + dy
					if nx < 0 or ny < 0 or nx >= w or ny >= h:
						continue
					out[ny * w + nx] = 1
	return out


func _far_pixel(a: Image, b: Image, y0: float, y1: float) -> Vector2i:
	var w := mini(a.get_width(), b.get_width())
	var y_start := int(float(a.get_height()) * y0)
	var y_end := int(float(a.get_height()) * y1)
	var best := Vector2i(-1, -1)
	var best_d := 0.12
	var step := 5
	for y in range(y_start, y_end, step):
		if y >= b.get_height():
			break
		for x in range(0, w, step):
			var ca: Color = a.get_pixel(x, y)
			var cb: Color = b.get_pixel(x, y)
			if ca.a < 0.5 or cb.a < 0.5:
				continue
			var d := absf(ca.r - cb.r) + absf(ca.g - cb.g) + absf(ca.b - cb.b)
			if d > best_d:
				best_d = d
				best = Vector2i(x, y)
	return best


func _round6_tint(_id: String) -> Color:
	return Color("#c45a12")


func mat_stop_a(workshop: Node) -> float:
	var disc: ColorRect = workshop._brew_painter.disc_liquid
	var mat := disc.material as ShaderMaterial
	var stop0: Color = mat.get_shader_parameter("stop0")
	return stop0.a


func _assert_text_inside(host: Control, tag: String) -> void:
	check(host != null, tag + " container")
	if host == null:
		return
	var bounds := Rect2(Vector2(-1, -1), host.size + Vector2(2, 2))
	var labels := _collect_labels(host)
	check(not labels.is_empty(), tag + " has text")
	for node in labels:
		var l: Label = node
		if not l.visible:
			continue
		var local := _rect_in(host, l)
		check(bounds.encloses(local), "%s stays on the page (%s) %s" % [tag, l.text.substr(0, 24), local])
		var font: Font = l.get_theme_font("font")
		var path := ""
		if font != null:
			path = str(font.resource_path)
		check(path.find("Vazirmatn") >= 0, "%s uses Vazirmatn (%s)" % [tag, path])
		var sz := int(l.get_theme_font_size("font_size"))
		check(sz >= 11 and sz <= 20, "%s size %s" % [tag, sz])
		check(l.text_direction == Control.TEXT_DIRECTION_RTL, tag + " is RTL")
		check(l.horizontal_alignment == HORIZONTAL_ALIGNMENT_RIGHT, tag + " is right aligned")
		if font != null and l.text != "":
			var need := font.get_multiline_string_size(l.text, HORIZONTAL_ALIGNMENT_RIGHT, l.size.x, sz, -1, 3, 3, TextServer.DIRECTION_RTL).y
			check(need <= l.size.y + 3.0, "%s text fits in its line (%s in %s)" % [tag, need, l.size.y])


func _rect_in(host: Control, node: Control) -> Rect2:
	var inv := host.get_global_transform().affine_inverse()
	var gr := node.get_global_rect()
	var rect := Rect2(inv * gr.position, Vector2.ZERO)
	rect = rect.expand(inv * (gr.position + Vector2(gr.size.x, 0)))
	rect = rect.expand(inv * (gr.position + gr.size))
	rect = rect.expand(inv * (gr.position + Vector2(0, gr.size.y)))
	return rect


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


func _round16() -> void:
	_grind_progress_bed()
	_interior_clip()
	_effects_puff()


func _grind_progress_bed() -> void:
	var works: Array[float] = [0.0, 0.6, 1.2, 1.8, 2.4, 3.0, 3.6]
	var medians: Array[float] = []
	var maxes: Array[float] = []
	var area_med: Array[float] = []
	var area_max: Array[float] = []
	var coarses: Array[int] = []
	var covers: Array[float] = []
	var counts: Array[int] = []
	for w in works:
		var pile := MortarPile.new()
		pile.sync({"ingredientId": "chamomile", "quantity": 1.0, "grindWork": w, "grinding": false})
		var st: Dictionary = pile.chunk_stats()
		medians.append(float(st["median"]))
		maxes.append(float(st["max"]))
		area_med.append(float(st["median_area"]))
		area_max.append(float(st["max_area"]))
		coarses.append(int(st["coarse"]))
		covers.append(pile.bed_coverage())
		counts.append(int(st["n"]))
		var outside := _outside_verts(pile.material_polygons())
		check(outside == 0, "material stays in the bowl at work %s, outside %s" % [w, outside])
	check(covers[0] < 0.01, "progress 0 ground bed covers %s" % covers[0])
	check(counts[0] > 0, "drop leaves chunks")
	var fresh := MortarPile.new()
	fresh.sync({"ingredientId": "chamomile", "quantity": 1.0, "grindWork": 0.0, "grinding": false})
	var dust0 := 0
	var whole := true
	for chip in fresh.chips():
		if str(chip["kind"]) == "dust":
			dust0 += 1
		if int(chip["generation"]) != 0:
			whole = false
	check(whole, "fresh pieces are whole")
	check(dust0 == 0, "fresh drop has no powder grains")
	var mono := true
	for i in range(1, medians.size()):
		if area_med[i] > area_med[i - 1] + 0.05:
			mono = false
		if area_max[i] > area_max[i - 1] + 0.05:
			mono = false
		if coarses[i] > coarses[i - 1]:
			mono = false
		if covers[i] + 0.0001 < covers[i - 1]:
			mono = false
	check(mono, "size, coarse count, and bed move with progress")
	check(area_max[area_max.size() - 1] < area_max[0] * 0.55, "fine pieces are smaller than the drop")
	check(coarses[coarses.size() - 1] < coarses[0], "coarse chunk count falls")
	check(covers[covers.size() - 1] > covers[0] + 0.04, "ground bed grows")
	var full := MortarPile.new()
	full.sync({"ingredientId": "chamomile", "quantity": 1.0, "grindWork": 3.6, "grinding": false})
	var full_cover := full.bed_coverage()
	for level in [1.0, 0.54, 0.08]:
		full.set_visual_level(level)
		var bad := _outside_verts(full.material_polygons())
		check(bad == 0, "level %s material stays inside, outside %s" % [level, bad])
	full.clear_visual_level()
	var clamped := MortarPile.new()
	clamped.sync({"ingredientId": "chamomile", "quantity": 1.0, "grindWork": maxf(0.2, MortarPile.WORK_COARSE), "grinding": false})
	near(clamped.grind_progress(), MortarPile.WORK_COARSE / 3.6, "early scoop clamps to coarse", 0.001)
	check(int(clamped.chunk_stats()["dust"]) == 0, "coarse clamp is not powder")
	check(clamped.bed_coverage() < full_cover, "mid grind bed is smaller than fine, %s vs %s" % [clamped.bed_coverage(), full_cover])
	full.force_refill()
	full.sync({})
	check(full.chips().is_empty(), "reset clears the mortar")
	near(full.grind_progress(), 0.0, "reset progress")
	near(full.bed_coverage(), 0.0, "reset bowl has no ground bed")
	full.sync({"ingredientId": "mint", "quantity": 1.0, "grindWork": 0.0, "grinding": false})
	check(full.bed_coverage() < 0.01, "refill starts as chunks, cover %s" % full.bed_coverage())
	check(int(full.chunk_stats()["dust"]) == 0, "refill has no powder")
	print("ROUND16 progress0_bed=%.4f n=%s median=%s max=%s area_med=%s area_max=%s coarse=%s cover=%s" % [covers[0], str(counts), str(medians), str(maxes), str(area_med), str(area_max), str(coarses), str(covers)])


func _outside_verts(polys: Array) -> int:
	var n := 0
	for poly_v in polys:
		var poly: PackedVector2Array = poly_v
		for p in poly:
			if MortarPile.interior_norm(p) > 1.01:
				n += 1
	return n


func _interior_clip() -> void:
	var wide := MortarPile.oval_at(MortarPile.interior_center(), 200.0, 80.0, 24)
	var saw_out := false
	for p in wide:
		if MortarPile.interior_norm(p) > 1.05:
			saw_out = true
	check(saw_out, "unclipped oval crosses the opening")
	var clipped := MortarPile.clip_to_interior(wide)
	check(_outside_verts([clipped]) == 0, "clipped oval stays inside")
	var area := MortarPile.polygon_area(clipped)
	var bowl := MortarPile.polygon_area(MortarPile.interior_polygon())
	check(area > bowl * 0.45 and area < bowl * 1.05, "clipped oval fills the bowl, area %s bowl %s" % [area, bowl])
	var uvs := PackedVector2Array()
	uvs.resize(wide.size())
	for i in wide.size():
		uvs[i] = Vector2(float(i) / float(wide.size()), 0.2)
	var pair: Array = MortarPile.clip_poly_uv(wide, uvs)
	var uv_poly: PackedVector2Array = pair[0]
	check(uv_poly.size() >= 3 and _outside_verts([uv_poly]) == 0, "uv clip stays inside, n %s" % uv_poly.size())


func _effects_puff() -> void:
	var settings: Node = root.get_node("Settings")
	var prev: bool = settings.effects_enabled
	var parts := MortarParticles.new()
	settings.effects_enabled = false
	parts.set_effects(false)
	parts.burst("strike", Vector2(50, 70), {"fineness": 1.0, "hits": 3, "colors": ["#c4a15a"]})
	check(not parts.busy(), "effects off skips the grind puff")
	settings.effects_enabled = true
	parts.set_effects(true)
	parts.burst("strike", Vector2(50, 70), {"fineness": 1.0, "hits": 3, "colors": ["#c4a15a"]})
	check(parts.busy(), "effects on emits the grind puff")
	settings.effects_enabled = prev


func _round17() -> void:
	_piece_mask()
	_bed_margin()
	_grind_continuity()
	_redrop_ease()
	var land := MortarParticles.new()
	land.set_effects(true)
	land.burst("land", Vector2.ZERO, {"color": "#e6c15a"})
	check(not land.busy(), "a drop does not puff haze")
	var fine := MortarParticles.new()
	fine.set_effects(true)
	fine.burst("fine", Vector2.ZERO, {"color": "#e6c15a"})
	check(fine.busy(), "fine still emits strike dust")
	for _i in 130:
		fine.update(1.0 / 60.0)
	fine.settle(2.0)
	for _j in 130:
		fine.update(1.0 / 60.0)
	check(not fine.busy(), "effect leftovers are gone within 2s")


func _piece_mask() -> void:
	var src := FileAccess.get_file_as_string("res://scripts/view/workshop_view.gd")
	check(src.find("draw_rect(Rect2(-w") < 0, "raw pieces are not tinted rectangles")
	for kind in ["flower", "leaf", "thread", "root", "seed", "star", "petal"]:
		var img := Image.new()
		var err := img.load("res://assets/art/mortar/v3/pieces/%s_1.png" % kind)
		check(err == OK, "piece sprite %s loads" % kind)
		if err != OK:
			continue
		var w := img.get_width() - 1
		var h := img.get_height() - 1
		var clear := true
		for corner in [Vector2i(0, 0), Vector2i(w, 0), Vector2i(0, h), Vector2i(w, h)]:
			if img.get_pixelv(corner).a > 0.01:
				clear = false
		check(clear, "%s sprite corners are transparent" % kind)


func _bed_margin() -> void:
	var c := MortarPile.interior_center()
	check(not MortarPile.within_margin(c + Vector2(MortarPile.VIS_RX, 0.0)), "painted edge is outside the margin")
	check(not MortarPile.within_margin(c + Vector2(MortarPile.VIS_RX - 2.0, 0.0)), "2px inside the side wall is still outside")
	check(not MortarPile.within_margin(c + Vector2(0.0, MortarPile.VIS_RY - 2.0)), "2px inside the lip is still outside")
	check(MortarPile.within_margin(c + Vector2(MortarPile.VIS_RX - MortarPile.EDGE_MARGIN, 0.0)), "3px side gap is inside")
	check(MortarPile.within_margin(c + Vector2(0.0, MortarPile.VIS_RY - MortarPile.EDGE_MARGIN)), "3px lip gap is inside")
	var pile := MortarPile.new()
	pile.sync({"ingredientId": "chamomile", "quantity": 1.0, "grindWork": 2.0, "grinding": false})
	var fan: Dictionary = pile.drawn_bed_fan()
	check(not fan.is_empty(), "ground bed draws at mid grind")
	var pts: PackedVector2Array = fan["points"]
	var radii: Array[float] = []
	var acc := Vector2.ZERO
	for p in pts:
		acc += p
	var mid := acc / float(pts.size())
	var outside := 0
	for p in pts:
		radii.append(p.distance_to(mid))
		if not MortarPile.within_margin(p, 0.4):
			outside += 1
	radii.sort()
	check(outside == 0, "bed contour stays inside the margin, outside %s" % outside)
	check(radii[radii.size() - 1] - radii[0] > 1.0, "bed edge is irregular, spread %s" % (radii[radii.size() - 1] - radii[0]))
	var fresh := MortarPile.new()
	fresh.sync({"ingredientId": "chamomile", "quantity": 1.0, "grindWork": 0.0, "grinding": false})
	check(fresh.visual_progress() < 0.001, "progress 0 visual bed is off")
	check(fresh.drawn_bed_coverage() < 0.001, "progress 0 draws no bed")
	check(fresh.drawn_bed_fan().is_empty(), "progress 0 has no mound")


func _grind_continuity() -> void:
	var names: Array[String] = ["chamomile", "mint", "poppy", "ginger", "borage", "saffron"]
	var dw := (3.6 / 3.5) / 60.0
	var worst_pos := 0.0
	var worst_size := 0.0
	var worst_rot := 0.0
	var worst_name := ""
	for id in names:
		var pile := MortarPile.new()
		pile.motion_reset()
		var work := 0.0
		pile.sync(_portion_state(id, work, true))
		for _frame in 220:
			work = minf(3.6, work + dw)
			pile.sync(_portion_state(id, work, work < 3.59))
			pile.update(1.0 / 60.0, work < 3.59)
			var lay_out := _presented_outside(pile)
			if lay_out > 0:
				check(false, "%s material left the margin at work %.2f, verts %s" % [id, work, lay_out])
				break
		var report: Dictionary = pile.motion_report()
		var pos := float(report["pos"])
		var size := float(report["size"])
		var rot := float(report["rot"])
		if pos > worst_pos:
			worst_pos = pos
			worst_name = id
		worst_size = maxf(worst_size, size)
		worst_rot = maxf(worst_rot, rot)
		check(pos <= 3.05, "%s per-frame move %s bowl-percent" % [id, pos])
		check(size <= 0.08, "%s per-frame size %s" % [id, size])
		check(rot <= 6.05, "%s per-frame rotation %s" % [id, rot])
		check(float(report["ghost"]) >= 0.4, "%s grain crossfade %ss" % [id, report["ghost"]])
		check(float(report["bed"]) < 0.03, "%s bed step %s" % [id, report["bed"]])
	print("ROUND17 continuity pos=%.3f size=%.4f rot=%.2f worst=%s" % [worst_pos, worst_size, worst_rot, worst_name])


func _presented_outside(pile: MortarPile) -> int:
	var n := 0
	for chip_v in pile.presentation():
		var chip: Dictionary = chip_v
		if float(chip.get("vis_alpha", 1.0)) <= 0.02:
			continue
		var lay: Dictionary = pile.layout_chip(chip)
		var poly: PackedVector2Array = lay["poly"]
		if not MortarPile.polygon_inside(poly, 0.5):
			poly = MortarPile.clip_to_interior(poly)
		for p in poly:
			if not MortarPile.within_margin(p, 0.75):
				n += 1
	var fan: Dictionary = pile.drawn_bed_fan()
	if not fan.is_empty():
		var pts: PackedVector2Array = fan["points"]
		for p2 in pts:
			if not MortarPile.within_margin(p2, 0.75):
				n += 1
	return n


func _portion_state(id: String, work: float, grinding: bool) -> Dictionary:
	return {
		"ingredientId": id,
		"quantity": 1.0,
		"grindWork": work,
		"grinding": grinding,
		"portions": [{"ingredientId": id, "quantity": 1.0, "grindWork": work}],
	}


func _redrop_ease() -> void:
	var pile := MortarPile.new()
	pile.motion_reset()
	pile.sync(_portion_state("chamomile", 2.0, true))
	pile.update(1.0 / 60.0, true)
	var before := pile.visual_progress()
	var cover := pile.drawn_bed_coverage()
	check(before > 0.4, "re-drop starts from a ground bed, progress %s" % before)
	pile.sync({
		"ingredientId": "mint",
		"quantity": 2.0,
		"grindWork": 0.0,
		"grinding": true,
		"portions": [
			{"ingredientId": "chamomile", "quantity": 1.0, "grindWork": 2.0},
			{"ingredientId": "mint", "quantity": 1.0, "grindWork": 0.0},
		],
	})
	pile.update(1.0 / 60.0, true)
	var stepped := pile.visual_progress()
	check(absf(before - stepped) < 0.05, "re-drop bed step %s" % absf(before - stepped))
	check(pile.drawn_bed_coverage() > cover * 0.45, "re-drop bed is still visible, %s -> %s" % [cover, pile.drawn_bed_coverage()])
	var old_n := 0
	var new_n := 0
	for chip_v in pile.presentation():
		var chip: Dictionary = chip_v
		var a := float(chip.get("vis_alpha", 1.0))
		if a > 0.8:
			old_n += 1
		elif a < 0.2:
			new_n += 1
	check(old_n > 0 and new_n > 0, "re-drop crossfades, old %s new %s" % [old_n, new_n])
	for _i in 22:
		pile.update(1.0 / 60.0, true)
	check(pile.visual_progress() < 0.02, "re-drop bed is gone after 0.3s, %s" % pile.visual_progress())
	var clamp := MortarPile.new()
	clamp.sync(_portion_state("ginger", 0.2, true))
	clamp.update(1.0 / 60.0, true)
	var low := clamp.visual_progress()
	clamp.sync(_portion_state("ginger", 1.0, false))
	clamp.update(1.0 / 60.0, false)
	var high := clamp.visual_progress()
	check(high - low < 0.05, "clamp bed step %s" % (high - low))
	check(high > low, "clamp bed moves toward coarse")
	for _j in 20:
		clamp.update(1.0 / 60.0, false)
	near(clamp.visual_progress(), 1.0 / 3.6, "clamp bed arrives", 0.03)
	print("ROUND17 redrop_step=%.4f clamp_step=%.4f" % [absf(before - stepped), high - low])
