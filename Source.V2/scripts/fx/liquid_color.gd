class_name LiquidColor
extends RefCounted
## mixLiquid from ClassicBrewSim, with dissolve taken from the engine stage.

const WATER := Color("3f6f8f")
const TINT := {
	"saffron": ["#d4891c", 1.0],
	"poppy": ["#4a3d5c", 0.35],
	"borage": ["#6b4fb0", 1.0],
	"chamomile": ["#e0c85a", 0.7],
	"mint": ["#3d8f5a", 0.8],
	"ginger": ["#c17a2a", 0.9],
}
const HEAT := {"low": 0.35, "medium": 0.7, "high": 1.0}


static func dissolved(stage: String) -> float:
	match stage:
		"fresh":
			return 0.22
		"extracting":
			return 0.62
		"ready", "overprocessed":
			return 1.0
	return 0.2


static func mix(entries: Array, heat_name: String, time_sec: float) -> Color:
	var weight := 0.0
	var mixed := Color(0, 0, 0, 1)
	var burnt := false
	var ready := not entries.is_empty()
	for e in entries:
		if str(e["stage"]) == "overprocessed":
			burnt = true
		if str(e["stage"]) != "ready":
			ready = false
		var spec: Array = TINT.get(str(e["ingredientId"]), ["#8a7a55", 0.75])
		var amount := dissolved(str(e["stage"])) * float(spec[1]) * minf(2.0, float(e["quantity"]))
		if amount <= 0.0:
			continue
		var tint := Color(str(spec[0]))
		mixed.r += tint.r * amount
		mixed.g += tint.g * amount
		mixed.b += tint.b * amount
		weight += amount
	var color := WATER
	if weight > 0.0:
		var avg := Color(mixed.r / weight, mixed.g / weight, mixed.b / weight)
		avg = _saturate(avg, 1.35)
		var k := weight / (weight + 0.55)
		color = WATER.lerp(avg, k)
	var heat := float(HEAT.get(heat_name, 0.7))
	var dim := 1.0 - minf(0.18, heat * 0.12)
	color = Color(color.r * dim, color.g * dim, color.b * dim)
	if ready and not burnt:
		var w := 0.06 + 0.05 * sin(time_sec * 3.0)
		color = color.lerp(Color.WHITE, w)
	if burnt:
		color = _burnt(color)
	color.a = 0.92
	return color


static func _saturate(c: Color, s: float) -> Color:
	var l := 0.299 * c.r + 0.587 * c.g + 0.114 * c.b
	return Color(l + (c.r - l) * s, l + (c.g - l) * s, l + (c.b - l) * s)


static func _burnt(c: Color) -> Color:
	var grey := 0.299 * c.r + 0.587 * c.g + 0.114 * c.b
	var k := 0.55
	var dim := 0.7
	return Color((grey + (c.r - grey) * k) * dim, (grey + (c.g - grey) * k) * dim, (grey + (c.b - grey) * k) * dim, c.a)
