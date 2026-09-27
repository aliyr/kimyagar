class_name Catalog
extends RefCounted

static var defs: Dictionary = {}


static func load_defs() -> Dictionary:
	if not defs.is_empty():
		return defs
	var props: Dictionary = _json("res://assets/data/properties.json")
	defs = {
		"properties": props["properties"],
		"axes": props["axes"],
		"ingredients": _json("res://assets/data/ingredients.json"),
		"customers": _json("res://assets/data/customers.json"),
		"qualityTags": _json("res://assets/data/qualityTags.json"),
		"tuning": _json("res://assets/data/tuning.json"),
	}
	return defs


static func _json(path: String):
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		push_error("missing data %s" % path)
		return {}
	return JSON.parse_string(f.get_as_text())
