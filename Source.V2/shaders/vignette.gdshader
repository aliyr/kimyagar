shader_type canvas_item;

// classic-ambience.css .amb-vignette — clear through the middle, only the corners.
// pause adds the darker .scene-vignette used while an overlay is open.
uniform float pause = 0.0;

void fragment() {
	vec2 p = (UV - vec2(0.5, 0.48)) / vec2(0.88, 0.78);
	float d = length(p);
	float a = smoothstep(0.54, 0.82, d) * 0.18;
	a = max(a, smoothstep(0.82, 1.0, d) * 0.42);
	a = max(a, pause * (smoothstep(0.38, 1.0, d) * 0.6 + 0.32));
	COLOR = vec4(0.039, 0.024, 0.012, a);
}
