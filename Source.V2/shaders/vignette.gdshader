shader_type canvas_item;

void fragment() {
	vec2 p = UV - vec2(0.5, 0.46);
	float d = length(p * vec2(1.15, 1.0));
	float edge = smoothstep(0.28, 0.72, d);
	float a = edge * 0.6 + 0.32;
	COLOR = vec4(0.04, 0.024, 0.012, a);
}
