class_name QualityProbe
extends RefCounted
## Adaptive quality — Web/src/platform/quality.ts

const BUDGETS := {
	"high": {"tier": "high", "particleScale": 1.0, "dprCap": 1.5, "specular": true, "liveShadow": true},
	"medium": {"tier": "medium", "particleScale": 0.6, "dprCap": 1.0, "specular": true, "liveShadow": true},
	"low": {"tier": "low", "particleScale": 0.3, "dprCap": 0.75, "specular": false, "liveShadow": false},
}
const RANK := {"low": 0, "medium": 1, "high": 2}
const PROBE_SAMPLES := 90
const COOLDOWN_MS := 1500.0

var ceiling := "high"
var tier := "high"
var reduced_motion := false
var quality_source := "auto"
var auto_dropped := false
var frame_samples: Array = []
var cooldown_until := 0.0
var now_ms := 0.0
var listeners: Array = []


func get_quality() -> Dictionary:
	var b: Dictionary = BUDGETS[tier].duplicate()
	b["reducedMotion"] = reduced_motion
	return b


func subscribe(cb: Callable) -> Callable:
	listeners.append(cb)
	return func():
		listeners.erase(cb)


func set_tier(next: String) -> void:
	ceiling = next
	quality_source = "stored"
	auto_dropped = false
	frame_samples.clear()
	cooldown_until = 0.0
	if tier == next:
		return
	tier = next
	_emit()


func set_reduced_motion(next: bool) -> void:
	if reduced_motion == next:
		return
	reduced_motion = next
	_emit()


func report_frame_time(ms: float) -> void:
	if not (ms > 0.0) or ms > 250.0:
		return
	if now_ms < cooldown_until:
		return
	frame_samples.append(ms)
	if frame_samples.size() < PROBE_SAMPLES:
		return
	var sum := 0.0
	for s in frame_samples:
		sum += float(s)
	var mean := sum / float(frame_samples.size())
	frame_samples.clear()
	cooldown_until = now_ms + COOLDOWN_MS
	var next := tier
	if mean > 20.0:
		next = _drop(tier)
		if RANK[next] < RANK[tier]:
			auto_dropped = true
	elif mean < 9.0 and auto_dropped:
		next = _climb(tier)
		if RANK[next] > RANK[ceiling]:
			next = ceiling
		if next == ceiling:
			auto_dropped = false
	if next == tier:
		return
	tier = next
	quality_source = "auto"
	_emit()


func describe() -> String:
	return "%s (%s)" % [tier, quality_source]


func _emit() -> void:
	for cb in listeners:
		cb.call()


static func _drop(t: String) -> String:
	if t == "high":
		return "medium"
	if t == "medium":
		return "low"
	return "low"


static func _climb(t: String) -> String:
	if t == "low":
		return "medium"
	if t == "medium":
		return "high"
	return "high"


static func detect_ceiling(cores: int, device_memory: float, dpr: float, native_mobile: bool) -> String:
	var t := "high"
	if cores > 0:
		if cores <= 2:
			t = _at_most(t, "low")
		elif cores <= 4:
			t = _at_most(t, "medium")
	if device_memory > 0.0:
		if device_memory <= 2.0:
			t = _at_most(t, "low")
		elif device_memory <= 4.0:
			t = _at_most(t, "medium")
	if dpr >= 3.0 and (cores <= 0 or cores <= 6):
		t = _at_most(t, "medium")
	if native_mobile:
		t = _at_most(t, "medium")
	return t


static func _at_most(current: String, max_tier: String) -> String:
	return current if RANK[current] <= RANK[max_tier] else max_tier
