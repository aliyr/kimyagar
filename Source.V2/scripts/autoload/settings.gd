extends Node
## Sound, haptics, intro-seen, quality tier. user://settings.cfg

const PATH := "user://settings.cfg"

var sfx_enabled := true
var haptics_enabled := true
## Coloured steam, camera shake, candle flicker, and the extra room bed.
## Hour-17 shots pin the flicker separately so this can stay on.
## `--effects=` changes the live flag only. The saved preference stays put,
## so a profile run cannot turn the workshop extras off for the next launch.
var effects_enabled := true
var _effects_saved := true
var intro_seen := false
var quality_tier := ""
var hour_override = null


func _ready() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(PATH) != OK:
		return
	sfx_enabled = bool(cfg.get_value("audio", "enabled", true))
	haptics_enabled = bool(cfg.get_value("haptics", "enabled", true))
	effects_enabled = bool(cfg.get_value("effects", "enabled", true))
	_effects_saved = effects_enabled
	intro_seen = bool(cfg.get_value("intro", "seen", false))
	quality_tier = str(cfg.get_value("quality", "tier", ""))


func save() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("audio", "enabled", sfx_enabled)
	cfg.set_value("haptics", "enabled", haptics_enabled)
	cfg.set_value("effects", "enabled", _effects_saved)
	cfg.set_value("intro", "seen", intro_seen)
	cfg.set_value("quality", "tier", quality_tier)
	cfg.save(PATH)


func set_sfx(on: bool) -> void:
	sfx_enabled = on
	save()


func set_haptics(on: bool) -> void:
	haptics_enabled = on
	save()


func set_effects(on: bool) -> void:
	effects_enabled = on
	_effects_saved = on
	save()


func mark_intro_seen() -> void:
	intro_seen = true
	save()
