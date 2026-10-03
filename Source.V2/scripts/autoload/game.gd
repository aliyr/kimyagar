extends Node
## Zustand game store — Web/src/store/gameStore.ts (classic path).

const MAX_MORTAR_UNITS := 3
const CLASSIC_MAX_MORTAR_UNITS := 6
const GRIND_THRESHOLDS: Array = [
	{"state": "coarse", "work": 1.0},
	{"state": "crushed", "work": 2.2},
	{"state": "fine", "work": 3.6},
]
const FINE_WORK := 3.6
const GRIND_RATE := 3.6 / 3.5

var defs: Dictionary = {}
var brew: Dictionary = {}
var customer_index := 0
var mortar = null
var open_overlay = null
var inspected_id = null
var result = null
var evaluation = null
var discovery_queue: Array = []
var discovered_tag_ids: Array = []
var used_ingredient_ids: Array = []
var last_recipe = null
var debug_open := false
var clock_ms := 0

signal changed


func _ready() -> void:
	defs = Catalog.load_defs()
	_load_persisted()
	brew = Alchemy.create_brew()


func _load_persisted() -> void:
	var p: Dictionary = Progress.data
	customer_index = int(p["customerIndex"])
	discovered_tag_ids = (p["discoveredTagIds"] as Array).duplicate()
	used_ingredient_ids = (p["usedIngredientIds"] as Array).duplicate()


func now_ms() -> int:
	if clock_ms > 0:
		return clock_ms
	return int(Time.get_unix_time_from_system() * 1000.0)


func current_customer() -> Dictionary:
	var list: Array = defs["customers"]
	return list[customer_index % list.size()]


func ingredient_by_id(id: String):
	for ing in defs["ingredients"]:
		if ing["id"] == id:
			return ing
	return null


func is_paused() -> bool:
	return open_overlay != null or result != null


func emit_change() -> void:
	changed.emit()


func toggle_debug() -> void:
	debug_open = not debug_open
	emit_change()


func open_overlay_action(id: String, inspected = null) -> void:
	open_overlay = id
	if inspected != null:
		inspected_id = inspected
	emit_change()


func close_overlay() -> void:
	if open_overlay == "ingredient_detail":
		inspected_id = null
	open_overlay = null
	emit_change()


func pop_discovery() -> void:
	if discovery_queue.is_empty():
		return
	discovery_queue = discovery_queue.slice(1)
	emit_change()


func grind_state_for_work(work: float):
	var result_state = null
	for t in GRIND_THRESHOLDS:
		if work >= float(t["work"]):
			result_state = t["state"]
	return result_state


func _portion_fine(quantity: float) -> float:
	return FINE_WORK * quantity


func _portion_reached_fine(portion: Dictionary) -> bool:
	return float(portion["grindWork"]) >= _portion_fine(float(portion["quantity"])) - 1e-4


func portion_grind_state(portion: Dictionary):
	if _portion_reached_fine(portion):
		return "fine"
	return grind_state_for_work(float(portion["grindWork"]) / float(portion["quantity"]))


func _portion_norm(portion: Dictionary) -> float:
	if _portion_reached_fine(portion):
		return FINE_WORK
	return float(portion["grindWork"]) / float(portion["quantity"])


func _classic_mortar(portions: Array, grinding: bool) -> Dictionary:
	var active: Array = []
	for p in portions:
		if not _portion_reached_fine(p):
			active.append(p)
	var focus: Dictionary = portions[0]
	if not active.is_empty():
		focus = active[0]
		for portion in active:
			if _portion_norm(portion) < _portion_norm(focus):
				focus = portion
	var total := 0.0
	for portion in portions:
		total += float(portion["quantity"])
	var norm := minf(FINE_WORK, _portion_norm(focus))
	return {
		"ingredientId": focus["ingredientId"],
		"quantity": total,
		"grindState": portion_grind_state(focus),
		"grindWork": norm,
		"grinding": grinding and not active.is_empty(),
		"portions": portions,
	}


func add_classic_unit(id: String) -> void:
	var existing: Array = []
	if mortar != null and mortar.get("portions") != null:
		existing = Alchemy.clone(mortar["portions"])
	elif mortar != null:
		existing = [{
			"ingredientId": mortar["ingredientId"],
			"quantity": mortar["quantity"],
			"grindWork": float(mortar["grindWork"]) * float(mortar["quantity"]),
		}]
	var total := 0.0
	for portion in existing:
		total += float(portion["quantity"])
	if total >= CLASSIC_MAX_MORTAR_UNITS:
		return
	var portions: Array = Alchemy.clone(existing)
	var found = null
	for portion in portions:
		if portion["ingredientId"] == id:
			found = portion
			break
	if found != null:
		found["quantity"] = float(found["quantity"]) + 1.0
		found["grindWork"] = 0.0
	else:
		portions.append({"ingredientId": id, "quantity": 1.0, "grindWork": 0.0})
	var grinding := false
	if mortar != null:
		grinding = bool(mortar.get("grinding", false))
	mortar = _classic_mortar(portions, grinding)
	emit_change()


func add_unit_to_mortar(id: String) -> void:
	if mortar == null or mortar["ingredientId"] != id or mortar.get("portions") != null:
		mortar = {"ingredientId": id, "quantity": 1.0, "grindState": null, "grindWork": 0.0, "grinding": false}
		emit_change()
		return
	if float(mortar["quantity"]) >= MAX_MORTAR_UNITS:
		return
	var quantity := minf(float(mortar["quantity"]) + 1.0, float(MAX_MORTAR_UNITS))
	mortar = {
		"ingredientId": id,
		"quantity": quantity,
		"grindState": null,
		"grindWork": 0.0,
		"grinding": mortar["grinding"],
	}
	emit_change()


func apply_grind_work(amount: float) -> void:
	if mortar == null:
		return
	if mortar.get("portions") != null:
		var active: Array = []
		for portion in mortar["portions"]:
			if not _portion_reached_fine(portion):
				active.append(portion)
		if active.is_empty():
			mortar = _classic_mortar(mortar["portions"], false)
			emit_change()
			return
		var active_qty := 0.0
		for portion in active:
			active_qty += float(portion["quantity"])
		var portions: Array = []
		for portion in mortar["portions"]:
			if _portion_reached_fine(portion):
				portions.append(portion)
				continue
			var cap := _portion_fine(float(portion["quantity"]))
			var next := float(portion["grindWork"]) + amount * (float(portion["quantity"]) / active_qty)
			var copy: Dictionary = portion.duplicate(true)
			copy["grindWork"] = cap if next >= cap - 1e-4 else next
			portions.append(copy)
		mortar = _classic_mortar(portions, bool(mortar["grinding"]))
		emit_change()
		return
	var grind_work := minf(float(mortar["grindWork"]) + amount, FINE_WORK)
	mortar = {
		"ingredientId": mortar["ingredientId"],
		"quantity": mortar["quantity"],
		"grindWork": grind_work,
		"grindState": grind_state_for_work(grind_work),
		"grinding": bool(mortar["grinding"]) and grind_work < FINE_WORK,
	}
	if mortar.get("portions") == null and mortar_has_portions_key():
		pass
	emit_change()


func mortar_has_portions_key() -> bool:
	return false


func start_grinding() -> void:
	if mortar == null:
		return
	if mortar.get("portions") != null:
		var pending := false
		for portion in mortar["portions"]:
			if not _portion_reached_fine(portion):
				pending = true
		if not pending:
			mortar = _classic_mortar(mortar["portions"], false)
		else:
			mortar = _classic_mortar(mortar["portions"], true)
			mortar["grinding"] = true
		emit_change()
		return
	if float(mortar["grindWork"]) >= FINE_WORK:
		return
	mortar["grinding"] = true
	emit_change()


func transfer_mortar() -> bool:
	if mortar == null or brew["bottled"]:
		return false
	if mortar.get("portions") != null:
		var coarse := float(GRIND_THRESHOLDS[0]["work"])
		var portions: Array = []
		for portion in mortar["portions"]:
			var copy: Dictionary = portion.duplicate(true)
			copy["grindWork"] = maxf(float(portion["grindWork"]), coarse * float(portion["quantity"]))
			portions.append(copy)
		mortar = _classic_mortar(portions, false)
		emit_change()
		return true
	mortar = {
		"ingredientId": mortar["ingredientId"],
		"quantity": mortar["quantity"],
		"grinding": false,
		"grindState": mortar["grindState"] if mortar["grindState"] != null else GRIND_THRESHOLDS[0]["state"],
		"grindWork": maxf(float(mortar["grindWork"]), float(GRIND_THRESHOLDS[0]["work"])),
	}
	emit_change()
	return true


func clear_mortar() -> void:
	mortar = null
	emit_change()


func add_mortar_to_cauldron() -> void:
	if mortar == null or brew["bottled"]:
		return
	if mortar.get("portions") != null:
		var next := brew
		var ids := {}
		for id in used_ingredient_ids:
			ids[id] = true
		for portion in mortar["portions"]:
			var grind = portion_grind_state(portion)
			if grind == null:
				grind = GRIND_THRESHOLDS[0]["state"]
			next = Alchemy.add_ingredient(next, portion["ingredientId"], float(portion["quantity"]), grind, defs)
			ids[portion["ingredientId"]] = true
		brew = next
		mortar = null
		used_ingredient_ids = ids.keys()
		Progress.set_discoveries(discovered_tag_ids, used_ingredient_ids)
		emit_change()
		return
	if mortar["grindState"] == null:
		return
	brew = Alchemy.add_ingredient(brew, mortar["ingredientId"], float(mortar["quantity"]), mortar["grindState"], defs)
	if not used_ingredient_ids.has(mortar["ingredientId"]):
		used_ingredient_ids = used_ingredient_ids.duplicate()
		used_ingredient_ids.append(mortar["ingredientId"])
	mortar = null
	Progress.set_discoveries(discovered_tag_ids, used_ingredient_ids)
	emit_change()


func set_heat(h: String) -> void:
	brew = Alchemy.set_heat(brew, h, defs)
	emit_change()


func stir() -> void:
	if (brew["entries"] as Array).is_empty() or brew["bottled"]:
		return
	brew = Alchemy.stir(brew, defs)
	emit_change()


func bottle_brew() -> void:
	if (brew["entries"] as Array).is_empty() or brew["bottled"]:
		return
	var potion := Alchemy.bottle(brew, defs)
	var new_discoveries: Array = []
	for d in potion["discoveries"]:
		if not discovered_tag_ids.has(d["id"]):
			new_discoveries.append(d)
	var tags: Array = discovered_tag_ids.duplicate()
	for d in new_discoveries:
		if d["kind"] == "quality_tag":
			tags.append(d["id"])
	if tags.size() != discovered_tag_ids.size():
		Progress.set_discoveries(tags, used_ingredient_ids)
	var recipe_entries: Array = []
	for e in brew["entries"]:
		recipe_entries.append({
			"ingredientId": e["ingredientId"],
			"quantity": e["quantity"],
			"grindState": e["grindState"],
		})
	brew = brew.duplicate(true)
	brew["bottled"] = true
	result = potion
	evaluation = null
	discovery_queue = discovery_queue.duplicate()
	for d in new_discoveries:
		discovery_queue.append(d)
	discovered_tag_ids = tags
	last_recipe = {"entries": recipe_entries, "finalHeat": brew["currentHeat"]}
	emit_change()


func deliver() -> void:
	if result == null:
		return
	evaluation = Alchemy.evaluate(result, current_customer(), defs)
	Progress.record_score({
		"customerId": evaluation["customerId"],
		"score": evaluation["score"],
		"band": evaluation["band"],
		"at": now_ms(),
	})
	emit_change()


func next_customer() -> void:
	customer_index += 1
	brew = Alchemy.create_brew()
	result = null
	evaluation = null
	mortar = null
	open_overlay = null
	Progress.set_customer_index(customer_index, now_ms())
	emit_change()


func start_fresh() -> void:
	Progress.reset_progress()
	brew = Alchemy.create_brew()
	customer_index = 0
	mortar = null
	open_overlay = null
	inspected_id = null
	result = null
	evaluation = null
	discovery_queue = []
	discovered_tag_ids = []
	used_ingredient_ids = []
	last_recipe = null
	emit_change()


func reset_brew() -> void:
	brew = Alchemy.create_brew()
	result = null
	evaluation = null
	mortar = null
	open_overlay = null
	emit_change()


func repeat_last_brew() -> void:
	if last_recipe == null:
		return
	var next := Alchemy.create_brew()
	next = Alchemy.set_heat(next, last_recipe["finalHeat"], defs)
	for e in last_recipe["entries"]:
		next = Alchemy.add_ingredient(next, e["ingredientId"], float(e["quantity"]), e["grindState"], defs)
	brew = next
	result = null
	evaluation = null
	mortar = null
	open_overlay = null
	emit_change()


func tick(dt: float) -> void:
	if is_paused():
		return
	if mortar != null and bool(mortar.get("grinding", false)):
		apply_grind_work(dt * GRIND_RATE)
	if brew["bottled"] or (brew["entries"] as Array).is_empty():
		return
	brew = Alchemy.advance_time(brew, dt, defs)
	emit_change()


func mortar_total_units() -> float:
	if mortar == null:
		return 0.0
	if mortar.get("portions") != null:
		var t := 0.0
		for p in mortar["portions"]:
			t += float(p["quantity"])
		return t
	return float(mortar["quantity"])


func overprocessed() -> bool:
	for e in brew["entries"]:
		if e["stage"] == "overprocessed":
			return true
	return false


func all_ready() -> bool:
	if (brew["entries"] as Array).is_empty() or overprocessed():
		return false
	for e in brew["entries"]:
		if e["stage"] != "ready":
			return false
	return true
