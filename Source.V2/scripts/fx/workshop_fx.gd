extends RefCounted
## Cheap workshop extras. Pure functions so tests can pin them.
## Candle pose is the identity at t = 0: glow scale 1, shadow offset 0.


const HIT_SHAKE: Array[Vector3] = [
	Vector3(0.00, 0.0, 0.0),
	Vector3(0.07, -18.0, 12.0),
	Vector3(0.16, 16.0, -9.0),
	Vector3(0.26, -12.0, 7.0),
	Vector3(0.38, 9.0, -5.0),
	Vector3(0.52, -6.0, 3.0),
	Vector3(0.68, 3.0, -2.0),
	Vector3(0.84, -1.0, 1.0),
	Vector3(1.00, 0.0, 0.0),
]
const DROP_SHAKE: Array[Vector3] = [
	Vector3(0.00, 0.0, 0.0),
	Vector3(0.14, 2.0, 8.0),
	Vector3(0.32, -2.0, -3.0),
	Vector3(0.52, 1.0, 2.0),
	Vector3(0.74, 0.0, -1.0),
	Vector3(1.00, 0.0, 0.0),
]


static func candle_pose(t: float) -> Vector3:
	# Two slow sines. Both are 0 at t = 0, so a frozen clock does not move
	# the hour-17 bake. x is glow scale, y/z are shadow pixels.
	var a := sin(t * 2.15)
	var b := sin(t * 5.7)
	return Vector3(1.0 + 0.06 * a + 0.03 * b, 1.2 * a, 0.8 * b)


static func shake_duration(kind: String) -> float:
	return 0.42 if kind == "drop" else 0.62


static func shake_offset(kind: String, elapsed: float) -> Vector2:
	var dur := shake_duration(kind)
	var u := clampf(elapsed / dur, 0.0, 1.0)
	var keys: Array[Vector3] = DROP_SHAKE if kind == "drop" else HIT_SHAKE
	return _along(u, keys)


static func steam_color(potion: Color, smoke: bool) -> Color:
	# Keep the potion hue. Steam is lightened; smoke is pulled toward ash
	# without becoming the flat grey of the old burnt haze.
	if smoke:
		var ash := Color(0.416, 0.384, 0.361, 1.0)
		return Color(
			lerpf(potion.r, ash.r, 0.35),
			lerpf(potion.g, ash.g, 0.35),
			lerpf(potion.b, ash.b, 0.35),
			1.0
		)
	var cream := Color(0.957, 0.937, 0.902, 1.0)
	return Color(
		lerpf(potion.r, cream.r, 0.28),
		lerpf(potion.g, cream.g, 0.28),
		lerpf(potion.b, cream.b, 0.28),
		1.0
	)


static func plume(index: int, t: float) -> Dictionary:
	# kg-steam, 5.4s, three wisps. Alpha is 0 at the loop point.
	var delay := float(index) * 1.6
	var local := fposmod(t - delay, 5.4)
	var u := local / 5.4
	var alpha := 0.0
	if u < 0.22:
		alpha = lerpf(0.0, 0.55, u / 0.22)
	else:
		alpha = lerpf(0.55, 0.0, (u - 0.22) / 0.78)
	var side := float(index) - 1.0
	return {
		"a": alpha,
		"x": side * 36.0 + sin(u * TAU + float(index)) * 10.0,
		"y": lerpf(-8.0, -210.0, u),
		"s": lerpf(16.0, 46.0, u),
	}


static func _along(u: float, keys: Array[Vector3]) -> Vector2:
	var n := keys.size()
	if n == 0:
		return Vector2.ZERO
	var first := keys[0]
	if u <= first.x:
		return Vector2(first.y, first.z)
	for i in range(1, n):
		var b := keys[i]
		var a := keys[i - 1]
		if u <= b.x:
			var span := maxf(0.0001, b.x - a.x)
			var k := (u - a.x) / span
			return Vector2(lerpf(a.y, b.y, k), lerpf(a.z, b.z, k))
	var last := keys[n - 1]
	return Vector2(last.y, last.z)
