class_name KimRng
extends RefCounted
## mulberry32 — same as Web/src/art/flat/kit/rng.ts (Math.imul, unsigned 32-bit).

var state: int


func _init(seed: int = 1) -> void:
	state = _u32(seed)
	if state == 0:
		state = 1


func next() -> float:
	state = _u32(state + 0x6D2B79F5)
	var t := state
	t = _imul(t ^ _ushr(t, 15), t | 1)
	t = _u32(t ^ _u32(t + _imul(t ^ _ushr(t, 7), t | 61)))
	return float(_u32(t ^ _ushr(t, 14))) / 4294967296.0


func range(min_v: float, max_v: float) -> float:
	return min_v + (max_v - min_v) * next()


func int_range(min_v: int, max_inclusive: int) -> int:
	return int(floor(range(float(min_v), float(max_inclusive) + 1.0)))


func pick(items: Array):
	if items.is_empty():
		return null
	return items[mini(items.size() - 1, int(floor(next() * float(items.size()))))]


func chance(probability: float) -> bool:
	return next() < probability


static func _u32(x: int) -> int:
	return x & 0xFFFFFFFF


static func _ushr(x: int, n: int) -> int:
	return (x & 0xFFFFFFFF) >> n


## JS Math.imul: low 32 bits of the signed 32-bit product, returned as unsigned.
static func _imul(a: int, b: int) -> int:
	var aa := a & 0xFFFFFFFF
	var bb := b & 0xFFFFFFFF
	if aa >= 0x80000000:
		aa -= 0x100000000
	if bb >= 0x80000000:
		bb -= 0x100000000
	return (aa * bb) & 0xFFFFFFFF


## FNV-1a 32-bit. Zero becomes 1, matching seedForCustomer.
static func seed_for_customer(customer_id: String, round: int = 0) -> int:
	var h := 0x811C9DC5
	var text := "%s#%d" % [customer_id, round]
	for i in text.length():
		h = _u32(h ^ text.unicode_at(i))
		h = _imul(h, 0x01000193)
	if h == 0:
		return 1
	return h
