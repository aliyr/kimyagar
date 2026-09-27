shader_type canvas_item;

uniform float brightness = 1.0;
uniform float saturate_amt = 1.0;
uniform float sepia_amt = 0.0;
uniform float hue_deg = 0.0;
uniform float tint_brightness = 1.0;
uniform float tint_sat = 1.0;
uniform float tint_opacity = 0.0;

vec3 _sat(vec3 c, float s) {
	float l = dot(c, vec3(0.299, 0.587, 0.114));
	return mix(vec3(l), c, s);
}

vec3 _sepia(vec3 c) {
	return vec3(
		dot(c, vec3(0.393, 0.769, 0.189)),
		dot(c, vec3(0.349, 0.686, 0.168)),
		dot(c, vec3(0.272, 0.534, 0.131))
	);
}

vec3 _hue(vec3 c, float deg) {
	float a = radians(deg);
	float si = sin(a);
	float co = cos(a);
	mat3 m = mat3(
		vec3(0.213 + co * 0.787 - si * 0.213, 0.715 - co * 0.715 - si * 0.715, 0.072 - co * 0.072 + si * 0.928),
		vec3(0.213 - co * 0.213 + si * 0.143, 0.715 + co * 0.285 + si * 0.140, 0.072 - co * 0.072 - si * 0.283),
		vec3(0.213 - co * 0.213 - si * 0.787, 0.715 - co * 0.715 + si * 0.715, 0.072 + co * 0.928 + si * 0.072)
	);
	return clamp(m * c, vec3(0.0), vec3(1.0));
}

void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	vec3 base = _sat(tex.rgb, saturate_amt) * brightness;
	vec3 tinted = _sat(_hue(mix(tex.rgb, _sepia(tex.rgb), sepia_amt), hue_deg), tint_sat) * tint_brightness;
	COLOR = vec4(mix(base, tinted, tint_opacity), tex.a);
}
