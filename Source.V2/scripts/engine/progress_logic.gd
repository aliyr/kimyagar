class_name ProgressLogic
extends RefCounted
## Pure progress serialize/parse — Web/src/store/progressStore.ts

const VERSION := 1
const MAX_SCORE_HISTORY := 60
const BANDS := ["excellent", "good", "partial", "failure"]


static func empty() -> Dictionary:
	return {
		"version": VERSION,
		"customerIndex": 0,
		"discoveredTagIds": [],
		"usedIngredientIds": [],
		"scoreHistory": [],
		"bestScore": null,
		"lastPlayedAt": null,
	}


static func has_progress(p: Dictionary) -> bool:
	return int(p["customerIndex"]) > 0 or (p["scoreHistory"] as Array).size() > 0 or (p["discoveredTagIds"] as Array).size() > 0


static func parse(raw) -> Dictionary:
	var base := empty()
	if raw == null:
		return base
	var text := str(raw).strip_edges()
	if text.is_empty() or not text.begins_with("{"):
		return base
	var json = JSON.parse_string(text)
	if typeof(json) != TYPE_DICTIONARY:
		return base
	var version := int(json.get("version", 0)) if typeof(json.get("version")) in [TYPE_FLOAT, TYPE_INT] else 0
	if version > VERSION:
		return base
	var score_history: Array = []
	if typeof(json.get("scoreHistory")) == TYPE_ARRAY:
		for item in json["scoreHistory"]:
			var entry = _parse_entry(item)
			if entry != null:
				score_history.append(entry)
		if score_history.size() > MAX_SCORE_HISTORY:
			score_history = score_history.slice(score_history.size() - MAX_SCORE_HISTORY)
	var customer_index := 0
	var raw_index = json.get("customerIndex")
	if typeof(raw_index) in [TYPE_FLOAT, TYPE_INT] and float(raw_index) == floor(float(raw_index)) and float(raw_index) >= 0.0:
		customer_index = int(raw_index)
	var best = null
	for e in score_history:
		if best == null or float(e["score"]) > float(best):
			best = e["score"]
	return {
		"version": VERSION,
		"customerIndex": customer_index,
		"discoveredTagIds": json["discoveredTagIds"] if _is_string_array(json.get("discoveredTagIds")) else [],
		"usedIngredientIds": json["usedIngredientIds"] if _is_string_array(json.get("usedIngredientIds")) else [],
		"scoreHistory": score_history,
		"bestScore": best,
		"lastPlayedAt": json["lastPlayedAt"] if typeof(json.get("lastPlayedAt")) in [TYPE_FLOAT, TYPE_INT] else null,
	}


static func serialize(p: Dictionary) -> String:
	var copy := p.duplicate(true)
	copy["version"] = VERSION
	return JSON.stringify(copy)


static func with_score(p: Dictionary, entry: Dictionary) -> Dictionary:
	var history: Array = (p["scoreHistory"] as Array).duplicate()
	history.append(entry)
	if history.size() > MAX_SCORE_HISTORY:
		history = history.slice(history.size() - MAX_SCORE_HISTORY)
	var best = p["bestScore"]
	if best == null:
		best = entry["score"]
	else:
		best = maxf(float(best), float(entry["score"]))
	var next := p.duplicate(true)
	next["scoreHistory"] = history
	next["bestScore"] = best
	next["lastPlayedAt"] = entry["at"]
	return next


static func _parse_entry(v) -> Variant:
	if typeof(v) != TYPE_DICTIONARY:
		return null
	if typeof(v.get("customerId")) != TYPE_STRING:
		return null
	if typeof(v.get("score")) not in [TYPE_FLOAT, TYPE_INT] or not is_finite(float(v["score"])):
		return null
	if typeof(v.get("band")) != TYPE_STRING or not BANDS.has(v["band"]):
		return null
	var at := 0
	if typeof(v.get("at")) in [TYPE_FLOAT, TYPE_INT] and is_finite(float(v["at"])):
		at = int(v["at"])
	return {"customerId": v["customerId"], "score": float(v["score"]), "band": v["band"], "at": at}


static func _is_string_array(v) -> bool:
	if typeof(v) != TYPE_ARRAY:
		return false
	for x in v:
		if typeof(x) != TYPE_STRING:
			return false
	return true
