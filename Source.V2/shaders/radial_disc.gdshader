shader_type canvas_item;

// Circular pixel-space radial gradient, clipped to this rect's inscribed ellipse
// and optionally to the cauldron mouth. Matches canvas createRadialGradient.

uniform vec2 rect_size = vec2(100.0, 40.0);
uniform vec2 grad_center = vec2(50.0, 16.0);
uniform float grad_radius = 50.0;
uniform bool clip_mouth = false;
uniform vec2 mouth_center = vec2(0.0);
uniform vec2 mouth_radii = vec2(1.0);
uniform int stop_count = 2;
uniform vec4 stop0 = vec4(1.0);
uniform vec4 stop1 = vec4(1.0);
uniform vec4 stop2 = vec4(0.0);
uniform vec4 stop3 = vec4(0.0);
uniform float t0 = 0.0;
uniform float t1 = 1.0;
uniform float t2 = 1.0;
uniform float t3 = 1.0;

vec4 sample_stop(float d) {
	vec4 cols[4] = { stop0, stop1, stop2, stop3 };
	float ts[4] = { t0, t1, t2, t3 };
	int n = clamp(stop_count, 1, 4);
	if (d <= ts[0]) {
		return cols[0];
	}
	for (int i = 1; i < 4; i++) {
		if (i >= n) {
			break;
		}
		if (d <= ts[i]) {
			float span = max(ts[i] - ts[i - 1], 0.0001);
			float u = clamp((d - ts[i - 1]) / span, 0.0, 1.0);
			return mix(cols[i - 1], cols[i], u);
		}
	}
	return cols[n - 1];
}

void fragment() {
	vec2 p = UV * rect_size;
	vec2 e = (p - rect_size * 0.5) / max(rect_size * 0.5, vec2(0.001));
	if (dot(e, e) > 1.0) {
		discard;
	}
	if (clip_mouth) {
		vec2 m = (p - mouth_center) / max(mouth_radii, vec2(0.001));
		if (dot(m, m) > 1.0) {
			discard;
		}
	}
	float d = length(p - grad_center) / max(grad_radius, 0.001);
	COLOR = sample_stop(d);
}
