shader_type canvas_item;

// CSS perspective 1400 on a plane: scale(rig) rotateX(ax) rotateY(ay).
// Rightmost transform is applied first. Inverse matches TiltMath.unproject_mid
// without the mid-layer parallax subtract. depth_offset is the layer's
// translate3d, applied in the plane before the rig rotation.

uniform float ax = 0.0;
uniform float ay = 0.0;
uniform float rig_scale = 1.06;
uniform float perspective = 1400.0;
uniform vec2 scene_size = vec2(1920.0, 1080.0);
uniform vec2 depth_offset = vec2(0.0);

vec3 rot_x(float a, vec3 p) {
	float c = cos(a);
	float s = sin(a);
	return vec3(p.x, c * p.y + s * p.z, -s * p.y + c * p.z);
}

vec3 rot_y(float a, vec3 p) {
	float c = cos(a);
	float s = sin(a);
	return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
}

vec3 invert_rig(vec3 p) {
	return rot_y(-ay, rot_x(-ax, p));
}

void fragment() {
	vec4 tint = COLOR;
	vec2 center = scene_size * 0.5;
	vec2 screen = UV * scene_size;
	float sx = screen.x - center.x;
	float sy = screen.y - center.y;
	float s = max(rig_scale, 0.001);
	vec3 p0 = invert_rig(vec3(0.0, 0.0, perspective));
	vec3 p1 = invert_rig(vec3(sx / s, sy / s, 0.0));
	float dz = p1.z - p0.z;
	float t = abs(dz) < 1e-6 ? 1.0 : -p0.z / dz;
	vec3 hit = invert_rig(vec3((t * sx) / s, (t * sy) / s, perspective * (1.0 - t)));
	vec2 local = vec2(hit.x, hit.y) + center - depth_offset;
	vec2 uv = local / scene_size;
	if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
		discard;
	}
	vec4 tex = texture(TEXTURE, uv);
	// ANGLE's ViewportTexture is premultiplied. Blending it as straight alpha
	// lets the workshop show through pixels the facade painted solid.
	if (tex.a > 0.001) {
		tex.rgb /= tex.a;
	}
	tex.a = tex.a >= 0.5 ? 1.0 : 0.0;
	COLOR = vec4(tex.rgb, tex.a) * tint;
}
