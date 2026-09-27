class_name TiltMath
extends RefCounted
## Web/src/scene/tilt/tiltMath.ts

const PERSPECTIVE := 1400.0
const ROTATE_X_AT_FULL := 2.0
const ROTATE_Y_AT_FULL := 2.2
const DEPTH_BACK := 18.0
const DEPTH_MID := 36.0
const DEPTH_FRONT := 60.0
const DEPTH_WORK := 2.0
const DEPTH_NEAR := 12.0
const DEADZONE_DEG := 1.5
const RANGE_DEG := 18.0
const RIG_SCALE := 1.06
const SCENE_W := 1920.0
const SCENE_H := 1080.0
const D2R := PI / 180.0


static func constants() -> Dictionary:
	return {
		"perspective": PERSPECTIVE,
		"rotateXAtFull": ROTATE_X_AT_FULL,
		"rotateYAtFull": ROTATE_Y_AT_FULL,
		"depthBack": DEPTH_BACK,
		"depthMid": DEPTH_MID,
		"depthFront": DEPTH_FRONT,
		"depthWork": DEPTH_WORK,
		"depthNear": DEPTH_NEAR,
		"deadzoneDeg": DEADZONE_DEG,
		"rangeDeg": RANGE_DEG,
		"rigScale": RIG_SCALE,
		"sceneW": SCENE_W,
		"sceneH": SCENE_H,
	}


static func tilt_mode_for(tier: String, reduced_motion: bool, latched_off: bool) -> String:
	if reduced_motion or latched_off:
		return "off"
	if tier == "high":
		return "full"
	if tier == "medium":
		return "lite"
	return "flat"


static func _num(v: float) -> String:
	var r: float = round(v * 1000.0) / 1000.0
	if is_zero_approx(r):
		return "0"
	var s := "%0.3f" % r
	while s.ends_with("0"):
		s = s.substr(0, s.length() - 1)
	if s.ends_with("."):
		s = s.substr(0, s.length() - 1)
	return s


static func rig_transform(pose: Dictionary, mode: String) -> String:
	if mode == "off":
		return ""
	var scale := "scale(%s)" % _num(RIG_SCALE)
	if mode == "flat":
		return scale
	var ax := -float(pose["py"]) * ROTATE_X_AT_FULL
	var ay := float(pose["px"]) * ROTATE_Y_AT_FULL
	return "%s rotateX(%sdeg) rotateY(%sdeg)" % [scale, _num(ax), _num(ay)]


static func depth_transform(pose: Dictionary, depth: float, mode: String) -> String:
	if mode == "off":
		return ""
	return "translate3d(%spx, %spx, 0)" % [_num(float(pose["px"]) * depth), _num(float(pose["py"]) * depth)]


static func clamp_unit(v: float) -> float:
	if v > 1.0:
		return 1.0
	if v < -1.0:
		return -1.0
	return v


static func apply_deadzone(delta_deg: float, dead: float = DEADZONE_DEG) -> float:
	var a := absf(delta_deg)
	if a <= dead:
		return 0.0
	return signf(delta_deg) * (a - dead)


static func angle_delta(value: float, base: float, wrap: float) -> float:
	var d := value - base
	var half := wrap / 2.0
	while d > half:
		d -= wrap
	while d < -half:
		d += wrap
	return d


static func screen_tilt(beta: float, gamma: float, base_beta: float, base_gamma: float, orientation_angle: float) -> Dictionary:
	var d_beta := angle_delta(beta, base_beta, 360.0)
	var d_gamma := angle_delta(gamma, base_gamma, 180.0)
	var angle := fmod(fmod(orientation_angle, 360.0) + 360.0, 360.0)
	var dx: float
	var dy: float
	if is_equal_approx(angle, 90.0):
		dx = d_beta
		dy = -d_gamma
	elif is_equal_approx(angle, 270.0):
		dx = -d_beta
		dy = d_gamma
	elif is_equal_approx(angle, 180.0):
		dx = -d_gamma
		dy = -d_beta
	else:
		dx = d_gamma
		dy = d_beta
	return {
		"px": clamp_unit(apply_deadzone(dx) / RANGE_DEG),
		"py": clamp_unit(apply_deadzone(dy) / RANGE_DEG),
	}


static func pointer_tilt(client_x: float, client_y: float, width: float, height: float) -> Dictionary:
	var w := width if width > 0.0 else 1.0
	var h := height if height > 0.0 else 1.0
	return {
		"px": clamp_unit((client_x / w) * 2.0 - 1.0),
		"py": clamp_unit((client_y / h) * 2.0 - 1.0),
	}


static func _rot_x(a: float, x: float, y: float, z: float) -> Vector3:
	var c := cos(a)
	var s := sin(a)
	return Vector3(x, c * y + s * z, -s * y + c * z)


static func _rot_y(a: float, x: float, y: float, z: float) -> Vector3:
	var c := cos(a)
	var s := sin(a)
	return Vector3(c * x - s * z, y, s * x + c * z)


static func _apply_rig(ax: float, ay: float, x: float, y: float, z: float) -> Vector3:
	var p := _rot_y(ay, x, y, z)
	return _rot_x(ax, p.x, p.y, p.z)


static func _invert_rig(ax: float, ay: float, x: float, y: float, z: float) -> Vector3:
	var p := _rot_x(-ax, x, y, z)
	return _rot_y(-ay, p.x, p.y, p.z)


static func _rig_angles(pose: Dictionary) -> Vector2:
	return Vector2(-float(pose["py"]) * ROTATE_X_AT_FULL * D2R, float(pose["px"]) * ROTATE_Y_AT_FULL * D2R)


static func project_mid(pose: Dictionary, u: float, v: float) -> Vector2:
	var ang := _rig_angles(pose)
	var lx := u + float(pose["px"]) * DEPTH_MID - SCENE_W / 2.0
	var ly := v + float(pose["py"]) * DEPTH_MID - SCENE_H / 2.0
	var p := _apply_rig(ang.x, ang.y, lx, ly, 0.0)
	var w := 1.0 - p.z / PERSPECTIVE
	return Vector2((p.x * RIG_SCALE) / w + SCENE_W / 2.0, (p.y * RIG_SCALE) / w + SCENE_H / 2.0)


static func unproject_work(pose: Dictionary, sx: float, sy: float) -> Vector2:
	return Vector2(sx - float(pose["px"]) * DEPTH_WORK, sy - float(pose["py"]) * DEPTH_WORK)


static func unproject_mid(pose: Dictionary, sx: float, sy: float) -> Vector2:
	var ang := _rig_angles(pose)
	var cx := sx - SCENE_W / 2.0
	var cy := sy - SCENE_H / 2.0
	var s := RIG_SCALE
	var d := PERSPECTIVE
	var p0 := _invert_rig(ang.x, ang.y, 0.0, 0.0, d)
	var p1 := _invert_rig(ang.x, ang.y, cx / s, cy / s, 0.0)
	var dz := p1.z - p0.z
	var t := 1.0 if absf(dz) < 1e-8 else -p0.z / dz
	var hit := _invert_rig(ang.x, ang.y, (t * cx) / s, (t * cy) / s, d * (1.0 - t))
	return Vector2(hit.x + SCENE_W / 2.0 - float(pose["px"]) * DEPTH_MID, hit.y + SCENE_H / 2.0 - float(pose["py"]) * DEPTH_MID)
