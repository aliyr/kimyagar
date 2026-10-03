shader_type canvas_item;

// classic-ambience.css .amb-vignette — clear through the middle, only the corners.
// pause is .scene-vignette. During the reaction window the web drops that
// overlay to opacity 0.16 (body.amb-reaction .scene.is-paused .scene-vignette).
// grind is .cst-focus: an ellipse over the mortar, clear in the middle.
uniform float pause = 0.0;
uniform float grind = 0.0;
uniform vec2 grind_at = vec2(0.21615, 0.58227);
uniform vec2 grind_rad = vec2(0.21875, 0.33333);

void fragment() {
	vec2 p = (UV - vec2(0.5, 0.48)) / vec2(0.88, 0.78);
	float d = length(p);
	float a = smoothstep(0.54, 0.82, d) * 0.18;
	a = max(a, smoothstep(0.82, 1.0, d) * 0.42);
	a = max(a, pause * (smoothstep(0.38, 1.0, d) * 0.6 + 0.32));
	float gd = length((UV - grind_at) / grind_rad);
	a = max(a, grind * 0.28 * smoothstep(0.4, 1.0, gd));
	COLOR = vec4(0.039, 0.024, 0.012, a);
}
