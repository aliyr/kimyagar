class_name Alchemy
extends RefCounted
## 1:1 port of Web/src/engine (curves, extraction, brew, bottle, evaluation, labels).

const EPS := 1e-9
const AT_LEAST_RAMP_START := 0.6
const AT_MOST_RAMP_END := 1.6
const ZERO_THRESHOLD_RAMP := 0.8


static func clone(v):
	match typeof(v):
		TYPE_DICTIONARY:
			var o := {}
			for k in v.keys():
				o[k] = clone(v[k])
			return o
		TYPE_ARRAY:
			var a := []
			for x in v:
				a.append(clone(x))
			return a
		_:
			return v


static func clamp_v(value: float, min_v: float, max_v: float) -> float:
	return minf(max_v, maxf(min_v, value))


static func clamp01(value: float) -> float:
	return clamp_v(value, 0.0, 1.0)


static func smoothstep01(t: float) -> float:
	var c := clamp01(t)
	return c * c * (3.0 - 2.0 * c)


static func interpolate_curve(points: Array, x: float) -> float:
	var sorted: Array = points.duplicate()
	sorted.sort_custom(func(a, b): return float(a["x"]) < float(b["x"]))
	if sorted.is_empty():
		return 1.0
	if x <= float(sorted[0]["x"]):
		return float(sorted[0]["y"])
	var last: Dictionary = sorted[sorted.size() - 1]
	if x >= float(last["x"]):
		return float(last["y"])
	for i in range(1, sorted.size()):
		if x <= float(sorted[i]["x"]):
			var a: Dictionary = sorted[i - 1]
			var b: Dictionary = sorted[i]
			var t := (x - float(a["x"])) / (float(b["x"]) - float(a["x"]))
			return float(a["y"]) + t * (float(b["y"]) - float(a["y"]))
	return float(last["y"])


static func quantity_factor_for(quantity: float, tuning: Dictionary) -> float:
	var pts: Array = []
	for p in tuning["quantityCurve"]:
		pts.append({"x": p["quantity"], "y": p["factor"]})
	return interpolate_curve(pts, quantity)


static func stage_of(exposure: float, tuning: Dictionary) -> String:
	var t: Dictionary = tuning["stageThresholds"]
	if exposure < float(t["extracting"]):
		return "fresh"
	if exposure < float(t["ready"]):
		return "extracting"
	if exposure < float(t["overprocessed"]):
		return "ready"
	return "overprocessed"


static func extraction_fraction_at(exposure: float, tuning: Dictionary) -> float:
	var t: Dictionary = tuning["stageThresholds"]
	var f: Dictionary = tuning["extractionFraction"]
	return interpolate_curve([
		{"x": 0.0, "y": f["fresh"]},
		{"x": t["extracting"], "y": f["extracting"]},
		{"x": t["ready"], "y": f["ready"]},
	], exposure)


static func stability_modifier_for(stability: float, tuning: Dictionary) -> float:
	var pts: Array = []
	for p in tuning["stabilityQualityCurve"]:
		pts.append({"x": p["stability"], "y": p["modifier"]})
	return interpolate_curve(pts, stability)


static func ingredient_def(defs: Dictionary, ingredient_id: String) -> Dictionary:
	for ing in defs["ingredients"]:
		if ing["id"] == ingredient_id:
			return ing
	push_error("Unknown ingredient: %s" % ingredient_id)
	return {}


static func grinding_factor_of(def: Dictionary, grind_state: String, property_id: String) -> float:
	var mods: Dictionary = def.get("grindingModifiers", {})
	var row = mods.get(grind_state, {})
	if typeof(row) != TYPE_DICTIONARY:
		return 1.0
	return float(row.get(property_id, 1.0))


static func heat_modifier_of(def: Dictionary, heat: String, property_id: String) -> float:
	var mods: Dictionary = def.get("heatModifiers", {})
	var row = mods.get(heat, {})
	if typeof(row) != TYPE_DICTIONARY:
		return 1.0
	return float(row.get(property_id, 1.0))


static func static_factors_of(def: Dictionary, quantity: float, grind_state: String, tuning: Dictionary) -> Array:
	var quantity_factor := quantity_factor_for(quantity, tuning)
	var out: Array = []
	var bases: Dictionary = def.get("baseProperties", {})
	for property_id in bases.keys():
		var base := float(bases[property_id])
		if base == 0.0:
			continue
		out.append({
			"propertyId": property_id,
			"base": base,
			"quantityFactor": quantity_factor,
			"grindingFactor": grinding_factor_of(def, grind_state, property_id),
		})
	return out


static func accumulate_contributions(prev: Dictionary, def: Dictionary, quantity: float, grind_state: String, heat: String, delta_fraction: float, tuning: Dictionary) -> Dictionary:
	var next: Dictionary = prev.duplicate()
	if delta_fraction <= 0.0:
		return next
	for f in static_factors_of(def, quantity, grind_state, tuning):
		var heat_mod := heat_modifier_of(def, heat, f["propertyId"])
		var delta := float(f["base"]) * float(f["quantityFactor"]) * float(f["grindingFactor"]) * heat_mod * delta_fraction
		next[f["propertyId"]] = float(next.get(f["propertyId"], 0.0)) + delta
	return next


static func create_brew() -> Dictionary:
	return {
		"entries": [],
		"currentHeat": "medium",
		"elapsedTime": 0.0,
		"stirCount": 0,
		"stirCorrection": 0.0,
		"history": [],
		"bottled": false,
	}


static func add_ingredient(state: Dictionary, ingredient_id: String, quantity: float, grind_state: String, defs: Dictionary) -> Dictionary:
	var def := ingredient_def(defs, ingredient_id)
	var entry_order: int = (state["entries"] as Array).size() + 1
	var contributions := accumulate_contributions({}, def, quantity, grind_state, state["currentHeat"], float(defs["tuning"]["extractionFraction"]["fresh"]), defs["tuning"])
	var entry := {
		"id": "entry_%d" % entry_order,
		"ingredientId": ingredient_id,
		"quantity": quantity,
		"grindState": grind_state,
		"entryOrder": entry_order,
		"heatAtEntry": state["currentHeat"],
		"exposure": 0.0,
		"stage": stage_of(0.0, defs["tuning"]),
		"contributions": contributions,
	}
	var next: Dictionary = clone(state)
	(next["entries"] as Array).append(entry)
	(next["history"] as Array).append({
		"type": "ingredient_added",
		"atTime": state["elapsedTime"],
		"payload": {"ingredientId": ingredient_id, "quantity": quantity, "grindState": grind_state},
	})
	return next


static func set_heat(state: Dictionary, heat: String, _defs: Dictionary) -> Dictionary:
	if state["currentHeat"] == heat:
		return state
	var next: Dictionary = clone(state)
	next["currentHeat"] = heat
	(next["history"] as Array).append({
		"type": "heat_changed",
		"atTime": state["elapsedTime"],
		"payload": {"heat": heat},
	})
	return next


static func stir(state: Dictionary, defs: Dictionary) -> Dictionary:
	var corrections: Array = defs["tuning"]["stirCorrections"]
	var gained := 0.0
	if int(state["stirCount"]) < corrections.size():
		gained = float(corrections[int(state["stirCount"])])
	var next: Dictionary = clone(state)
	next["stirCount"] = int(state["stirCount"]) + 1
	next["stirCorrection"] = float(state["stirCorrection"]) + gained
	(next["history"] as Array).append({"type": "stirred", "atTime": state["elapsedTime"]})
	return next


static func advance_time(state: Dictionary, dt_seconds: float, defs: Dictionary) -> Dictionary:
	if dt_seconds <= 0.0:
		return state
	var rate := float(defs["tuning"]["heatExposureRate"][state["currentHeat"]])
	var entries: Array = []
	for entry in state["entries"]:
		var def := ingredient_def(defs, entry["ingredientId"])
		var speed := float(def.get("extractionSpeed", 1.0))
		var exposure := float(entry["exposure"]) + dt_seconds * rate * speed
		var delta_fraction := extraction_fraction_at(exposure, defs["tuning"]) - extraction_fraction_at(float(entry["exposure"]), defs["tuning"])
		var copy: Dictionary = entry.duplicate(true)
		copy["exposure"] = exposure
		copy["stage"] = stage_of(exposure, defs["tuning"])
		copy["contributions"] = accumulate_contributions(entry["contributions"], def, float(entry["quantity"]), entry["grindState"], state["currentHeat"], delta_fraction, defs["tuning"])
		entries.append(copy)
	var next: Dictionary = clone(state)
	next["elapsedTime"] = float(state["elapsedTime"]) + dt_seconds
	next["entries"] = entries
	return next


static func bottle(state: Dictionary, defs: Dictionary) -> Dictionary:
	var tuning: Dictionary = defs["tuning"]
	var debug_contributions: Array = []
	var raw: Dictionary = {}
	for entry in state["entries"]:
		var def := ingredient_def(defs, entry["ingredientId"])
		for f in static_factors_of(def, float(entry["quantity"]), entry["grindState"], tuning):
			var final := float((entry["contributions"] as Dictionary).get(f["propertyId"], 0.0))
			var static_part := float(f["base"]) * float(f["quantityFactor"]) * float(f["grindingFactor"])
			debug_contributions.append({
				"entryId": entry["id"],
				"ingredientId": entry["ingredientId"],
				"propertyId": f["propertyId"],
				"base": f["base"],
				"quantityFactor": f["quantityFactor"],
				"grindingFactor": f["grindingFactor"],
				"heatExposureFactor": (final / static_part) if static_part > EPS else 0.0,
				"final": final,
			})
			raw[f["propertyId"]] = float(raw.get(f["propertyId"], 0.0)) + final
	var resolved_axes: Array = []
	for axis in defs["axes"]:
		var side_a := float(raw.get(axis["positiveProperty"], 0.0))
		var side_b := float(raw.get(axis["negativeProperty"], 0.0))
		var resolved := side_a - side_b
		var dominant = null
		if resolved > EPS:
			dominant = axis["positiveProperty"]
		elif resolved < -EPS:
			dominant = axis["negativeProperty"]
		resolved_axes.append({
			"axisId": axis["id"],
			"sideAProperty": axis["positiveProperty"],
			"sideBProperty": axis["negativeProperty"],
			"sideA": side_a,
			"sideB": side_b,
			"resolved": resolved,
			"dominantProperty": dominant,
			"tension": minf(side_a, side_b),
		})
	var axis_properties := {}
	for axis in defs["axes"]:
		axis_properties[axis["positiveProperty"]] = true
		axis_properties[axis["negativeProperty"]] = true
	var effect: Dictionary = {}
	for axis in resolved_axes:
		if axis["dominantProperty"] != null:
			effect[axis["dominantProperty"]] = absf(float(axis["resolved"]))
	for property_id in raw.keys():
		var value := float(raw[property_id])
		if not axis_properties.has(property_id) and value > EPS:
			effect[property_id] = value
	var total_tension := 0.0
	for axis in resolved_axes:
		total_tension += float(axis["tension"])
	var complexity := 0.0
	for e in state["entries"]:
		complexity += float(ingredient_def(defs, e["ingredientId"]).get("complexity", 0.0))
	var tension_cost := total_tension * float(tuning["tensionCostFactor"])
	var process_error := 0.0
	var penalties: Dictionary = tuning["processErrorPenalty"]
	for e in state["entries"]:
		if e["stage"] == "ready":
			continue
		process_error += float(penalties[e["stage"]])
	var base_instability := complexity + tension_cost + process_error
	var final_instability := maxf(0.0, base_instability - float(state["stirCorrection"]))
	var stability := clamp01(1.0 - final_instability / float(tuning["instabilityNormalization"]))
	var triggered: Array = []
	for rule in defs["qualityTags"]:
		var ok := true
		for c in rule["conditions"]:
			if float(effect.get(c["propertyId"], 0.0)) < float(c["atLeast"]) - EPS:
				ok = false
				break
		if ok:
			triggered.append(rule)
	var discoveries: Array = []
	for rule in triggered:
		discoveries.append({"id": rule["id"], "kind": "quality_tag", "textFa": rule["discoveryFa"]})
	var snap_entries: Array = []
	for e in state["entries"]:
		var copy: Dictionary = e.duplicate(true)
		snap_entries.append(copy)
	var history: Array = (state["history"] as Array).duplicate(true)
	history.append({"type": "bottled", "atTime": state["elapsedTime"]})
	var tag_ids: Array = []
	for rule in triggered:
		tag_ids.append(rule["id"])
	return {
		"entries": snap_entries,
		"history": history,
		"rawContributions": raw,
		"effectProfile": effect,
		"resolvedAxes": resolved_axes,
		"totalTension": total_tension,
		"stability": stability,
		"stabilityLabel": stability_label_of(stability),
		"qualityTags": tag_ids,
		"discoveries": discoveries,
		"debug": {
			"contributions": debug_contributions,
			"rawAxes": resolved_axes,
			"totalTension": total_tension,
			"complexity": complexity,
			"tensionCost": tension_cost,
			"processError": process_error,
			"stirCorrection": state["stirCorrection"],
			"baseInstability": base_instability,
			"finalInstability": final_instability,
			"stability": stability,
		},
	}


static func satisfaction_of(value: float, req: Dictionary) -> float:
	var t := float(req["threshold"])
	if req["direction"] == "at_least":
		if t <= EPS:
			return 1.0
		return smoothstep01((value - AT_LEAST_RAMP_START * t) / ((1.0 - AT_LEAST_RAMP_START) * t))
	if t <= EPS:
		return smoothstep01((ZERO_THRESHOLD_RAMP - value) / ZERO_THRESHOLD_RAMP)
	return smoothstep01((AT_MOST_RAMP_END * t - value) / ((AT_MOST_RAMP_END - 1.0) * t))


static func _is_satisfied(value: float, req: Dictionary) -> bool:
	if req["direction"] == "at_least":
		return value >= float(req["threshold"]) - EPS
	return value <= float(req["threshold"]) + EPS


static func _band_of(score: float, tuning: Dictionary) -> String:
	var t: Dictionary = tuning["bandThresholds"]
	if score >= float(t["excellent"]):
		return "excellent"
	if score >= float(t["good"]):
		return "good"
	if score >= float(t["partial"]):
		return "partial"
	return "failure"


static func _margin_of(outcome: Dictionary) -> float:
	var req: Dictionary = outcome["requirement"]
	if req["direction"] == "at_least":
		return float(outcome["actualValue"]) - float(req["threshold"])
	return float(req["threshold"]) - float(outcome["actualValue"])


static func _severity_rank(outcome: Dictionary) -> int:
	var kind: String = outcome["requirement"]["kind"]
	var kind_rank := 3
	if kind == "avoid":
		kind_rank = 1
	elif kind == "must_have":
		kind_rank = 2
	var critical := 0 if outcome["requirement"].get("critical", false) == true else 10
	return critical + kind_rank


static func evaluate(result: Dictionary, customer: Dictionary, defs: Dictionary) -> Dictionary:
	var w: Dictionary = defs["tuning"]["evaluationWeights"]
	var per: Array = []
	for requirement in customer["requirements"]:
		var actual := float((result["effectProfile"] as Dictionary).get(requirement["propertyId"], 0.0))
		per.append({
			"requirement": requirement,
			"actualValue": actual,
			"satisfaction": satisfaction_of(actual, requirement),
			"satisfied": _is_satisfied(actual, requirement),
		})
	var musts: Array = []
	var avoids: Array = []
	var preferred: Array = []
	for o in per:
		match o["requirement"]["kind"]:
			"must_have":
				musts.append(o)
			"avoid":
				avoids.append(o)
			"preferred":
				preferred.append(o)
	var must_part := float(w["mustHave"]) * _avg_sat(musts)
	var avoid_part := (100.0 - float(w["mustHave"])) * _avg_sat(avoids)
	var avoid_penalty := 0.0
	for o in avoids:
		avoid_penalty += float(w["avoid"]) * (1.0 - float(o["satisfaction"]))
	var min_avoid := 1.0
	for o in avoids:
		min_avoid = minf(min_avoid, float(o["satisfaction"]))
	var preferred_part := 0.0
	if not preferred.is_empty():
		preferred_part = float(w["preferredBonus"]) * _avg_sat(preferred) * min_avoid
	var core := clamp_v(must_part + avoid_part - avoid_penalty + preferred_part, 0.0, 100.0)
	var requested := {}
	for r in customer["requirements"]:
		requested[r["propertyId"]] = true
	var side_penalty := 0.0
	var worst_side = null
	for property_id in (result["effectProfile"] as Dictionary).keys():
		if requested.has(property_id):
			continue
		var over := float(result["effectProfile"][property_id]) - float(w["sideEffectFreeThreshold"])
		if over > 0.0:
			side_penalty += float(w["sideEffectPenaltyPerUnit"]) * over
			if worst_side == null or over > float(worst_side["over"]):
				worst_side = {"propertyId": property_id, "over": over}
	var stability_modifier := stability_modifier_for(float(result["stability"]), defs["tuning"])
	var matched := 0
	for tag in customer.get("preferredTags", []):
		if (result["qualityTags"] as Array).has(tag):
			matched += 1
	var tag_bonus := float(matched) * float(w["tagBonus"])
	var quality := maxf(0.0, core - side_penalty) * stability_modifier + tag_bonus
	var score := clamp_v(quality, 0.0, 100.0)
	var band := _band_of(score, defs["tuning"])
	var critical_violated := false
	for o in per:
		if o["requirement"].get("critical", false) == true and float(o["satisfaction"]) < 0.5:
			critical_violated = true
	if critical_violated and (band == "excellent" or band == "good"):
		band = "partial"
	var success_pool: Array = []
	for o in musts:
		if o["satisfied"]:
			success_pool.append(o)
	var success_fallback: Array = []
	for o in preferred:
		if o["satisfied"]:
			success_fallback.append(o)
	var best_success = _pick_best(success_pool)
	if best_success == null:
		best_success = _pick_best(success_fallback)
	var violations: Array = []
	for o in per:
		if not o["satisfied"]:
			violations.append(o)
	violations.sort_custom(func(a, b):
		var ra := _severity_rank(a)
		var rb := _severity_rank(b)
		if ra != rb:
			return ra < rb
		return float(a["satisfaction"]) < float(b["satisfaction"])
	)
	var worst_violation = violations[0] if not violations.is_empty() else null
	var key_success = best_success["requirement"]["metFeedbackFa"] if best_success != null else null
	var key_problem = worst_violation["requirement"]["unmetFeedbackFa"] if worst_violation != null else null
	if key_problem == null and band != "excellent":
		var stability_loss := maxf(0.0, core - side_penalty) * (1.0 - stability_modifier)
		if worst_side != null and side_penalty >= stability_loss:
			var side_id: String = worst_side["propertyId"]
			var name_fa := side_id
			for p in defs["properties"]:
				if p["id"] == side_id:
					name_fa = p["nameFa"]
					break
			key_problem = "%s زیادی هم داشت که نخواسته بودم." % name_fa
		elif stability_modifier < 1.0:
			key_problem = "اثرش ناپایدار بود و زود از تنم رفت."
	var reaction := ""
	if key_success != null and key_problem != null:
		var joiner := "؛ " if _starts_with_but(key_problem) else "؛ ولی "
		reaction = "%s%s%s" % [_trim_end(key_success), joiner, key_problem]
	elif key_success != null:
		reaction = "%s. دقیقاً همان چیزی بود که می‌خواستم!" % _trim_end(key_success)
	elif key_problem != null:
		reaction = "%s. این آن چیزی نبود که می‌خواستم…" % _trim_end(key_problem)
	else:
		reaction = "چیز خاصی حس نکردم…"
	return {
		"customerId": customer["id"],
		"score": score,
		"band": band,
		"perRequirement": per,
		"sideEffectPenalty": side_penalty,
		"stabilityModifier": stability_modifier,
		"tagBonus": tag_bonus,
		"reactionFa": reaction,
		"keySuccessFa": key_success,
		"keyProblemFa": key_problem,
	}


static func qualitative_level(value: float, property: Dictionary) -> String:
	var t: Dictionary = property["thresholds"]
	if value >= float(t["veryHigh"]):
		return "very_high"
	if value >= float(t["high"]):
		return "high"
	if value >= float(t["medium"]):
		return "medium"
	if value >= float(t["low"]):
		return "low"
	return "none"


static func stability_label_of(stability: float) -> String:
	if stability >= 0.75:
		return "stable"
	if stability >= 0.55:
		return "slightly_unstable"
	if stability >= 0.3:
		return "unstable"
	return "very_unstable"


static func _avg_sat(xs: Array) -> float:
	if xs.is_empty():
		return 1.0
	var s := 0.0
	for o in xs:
		s += float(o["satisfaction"])
	return s / float(xs.size())


static func _pick_best(xs: Array):
	if xs.is_empty():
		return null
	var best = xs[0]
	for o in xs:
		if _margin_of(o) > _margin_of(best):
			best = o
	return best


static func _trim_end(s: String) -> String:
	var i := s.length()
	while i > 0:
		var c := s.substr(i - 1, 1)
		if c == "." or c == " " or c == "\t" or c == "\n" or c == "\r":
			i -= 1
		else:
			break
	return s.substr(0, i)


static func _starts_with_but(s: String) -> bool:
	return s.begins_with("ولی ") or s.begins_with("اما ")
