extends SceneTree
## Headless mirror of the web Vitest logic tests.

var fails := 0
var ran := false
var game


func _process(_dt: float) -> bool:
	if ran:
		return false
	ran = true
	game = root.get_node("Game")
	_run()
	if fails == 0:
		print("ALL TESTS PASSED")
		quit(0)
	else:
		print("FAILED %d" % fails)
		quit(1)
	return true


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


func _customer(defs: Dictionary, id: String) -> Dictionary:
	for c in defs["customers"]:
		if c["id"] == id:
			return c
	return defs["customers"][0]


func _cmp_num(a, b, msg: String) -> void:
	near(float(a), float(b), msg, 5e-4)
