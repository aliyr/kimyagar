extends Node
## Sound, haptics, intro-seen, quality tier. user://settings.cfg

const PATH := "user://settings.cfg"

var sfx_enabled := true
var haptics_enabled := true
var intro_seen := false
var quality_tier := ""
var hour_override = null


func _ready() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(PATH) != OK:
		return
	sfx_enabled = bool(cfg.get_value("audio", "enabled", true))
	haptics_enabled = bool(cfg.get_value("haptics", "enabled", true))
	intro_seen = bool(cfg.get_value("intro", "seen", false))
	quality_tier = str(cfg.get_value("quality", "tier", ""))


func save() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("audio", "enabled", sfx_enabled)
	cfg.set_value("haptics", "enabled", haptics_enabled)
	cfg.set_value("intro", "seen", intro_seen)
	cfg.set_value("quality", "tier", quality_tier)
	cfg.save(PATH)


func set_sfx(on: bool) -> void:
	sfx_enabled = on
	save()


func set_haptics(on: bool) -> void:
	haptics_enabled = on
	save()


func mark_intro_seen() -> void:
	intro_seen = true
	save()
