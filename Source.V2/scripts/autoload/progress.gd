extends Node
## user:// progress. Schema matches the web JSON (no localStorage migration).

const PATH := "user://progress.json"

var data: Dictionary = ProgressLogic.empty()


func _ready() -> void:
	data = _read()


func _read() -> Dictionary:
	if not FileAccess.file_exists(PATH):
		return ProgressLogic.empty()
	var f := FileAccess.open(PATH, FileAccess.READ)
	if f == null:
		return ProgressLogic.empty()
	return ProgressLogic.parse(f.get_as_text())


func _write() -> void:
	var f := FileAccess.open(PATH, FileAccess.WRITE)
	if f == null:
		return
	f.store_string(ProgressLogic.serialize(data))


func record_score(entry: Dictionary) -> void:
	data = ProgressLogic.with_score(data, entry)
	_write()


func set_customer_index(index: int, at_ms: int) -> void:
	data = data.duplicate(true)
	data["customerIndex"] = index
	data["lastPlayedAt"] = at_ms
	_write()


func set_discoveries(tags: Array, used: Array) -> void:
	data = data.duplicate(true)
	data["discoveredTagIds"] = tags.duplicate()
	data["usedIngredientIds"] = used.duplicate()
	_write()


func reset_progress() -> void:
	data = ProgressLogic.empty()
	_write()
