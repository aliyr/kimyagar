extends Node
## Web/src/platform/haptics.ts — light/medium/heavy = 8/18/32 ms.

const MS := {"light": 8, "medium": 18, "heavy": 32}
const AMP := {"light": 0.35, "medium": 0.65, "heavy": 1.0}


func pulse(style: String) -> void:
	if not Settings.haptics_enabled:
		return
	var duration := int(MS.get(style, 8))
	var amp := float(AMP.get(style, 0.5))
	Input.vibrate_handheld(duration, amp)
