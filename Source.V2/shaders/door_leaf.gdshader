shader_type canvas_item;

// CSS rotateY about the hinge, perspective 1500px on the 608×543 doorway.
// West: hinge 0, positive angle. East: hinge 1, negative angle.

uniform float angle_deg = 0.0;
uniform float hinge = 0.0;
uniform float perspective = 1500.0;
uniform vec2 leaf_size = vec2(304.0, 543.0);
uniform vec2 leaf_origin = vec2(0.0);
uniform vec2 persp_origin = vec2(304.0, 271.5);

void fragment() {
	vec4 tint = COLOR;
	highp float th = radians(angle_deg);
	highp float c = cos(th);
	highp float s = sin(th);
	vec2 screen = leaf_origin + UV * leaf_size;
	float hinge_x = leaf_origin.x + hinge * leaf_size.x;
	float relx = screen.x - persp_origin.x;
	float rely = screen.y - persp_origin.y;
	float denom = relx * s - perspective * c;
	float numer = (hinge_x - persp_origin.x) * s - perspective * c;
	float ok = 1.0;
	if (c < 0.02 || abs(denom) < 1e-5) {
		ok = 0.0;
	}
	float t = numer / denom;
	float x = persp_origin.x + t * relx;
	float y = persp_origin.y + t * rely;
	float px = (x - hinge_x) / max(c, 0.02);
	float u = hinge < 0.5 ? px / leaf_size.x : 1.0 + px / leaf_size.x;
	float v = (y - leaf_origin.y) / leaf_size.y;
	if (ok < 0.5 || u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0) {
		COLOR = vec4(0.0);
	} else {
		COLOR = texture(TEXTURE, vec2(u, v)) * tint;
	}
}
