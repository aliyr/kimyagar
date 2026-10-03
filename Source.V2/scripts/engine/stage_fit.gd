extends RefCounted
## Where the 1920×1080 stage sits inside an expanded window.
##
## The web (Stage.tsx fitStage) letterboxes with min(scale), so a 20:9 phone
## keeps the 16:9 picture and paints .stage-letterbox in the margins. Chrome
## that is position:fixed (the settings gear, the corner pills) stays on the
## window edge. The gear also honours env(safe-area-inset-top/left).


const STAGE := Vector2(1920.0, 1080.0)


static func origin(vp: Vector2, safe: Vector4) -> Vector2:
	var x := floorf((vp.x - STAGE.x) * 0.5)
	var y := floorf((vp.y - STAGE.y) * 0.5)
	var right := vp.x - safe.z
	var bottom := vp.y - safe.w
	if right - safe.x >= STAGE.x:
		x = floorf(clampf(x, safe.x, right - STAGE.x))
	if bottom - safe.y >= STAGE.y:
		y = floorf(clampf(y, safe.y, bottom - STAGE.y))
	return Vector2(x, y)


## settings-button.css: the 40px disc is at max(12, inset-left), max(10, inset-top).
## The button texture is 56px with the disc inset by 8.
static func gear_position(safe: Vector4) -> Vector2:
	return Vector2(maxf(12.0, safe.x) - 8.0, maxf(10.0, safe.y) - 8.0)


## .classic-corner-links: 14px from the inline-end, 12px from the bottom, height 30.
static func pill_y(vp_h: float) -> float:
	return vp_h - 42.0
