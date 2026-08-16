extends Control

enum Stage { PICK_HERB, READY, FINISHED }

const TOTAL_HITS := 5
const TABLE_X_OFFSET := 0.0
const TABLE_Y_OFFSET := -72.0
const INGREDIENT_HOME := Vector2(210, 493)
const MORTAR_CENTER := Vector2(640, 427)
const MORTAR_MOUTH := Vector2(640, 323)
const RESULT_HOME := Vector2(1070, 493)
const PESTLE_READY := Vector2(300, -670)

const TEX_BACKGROUND := preload("res://assets/environment/attar_shop_background.png")
const TEX_TABLE := preload("res://assets/environment/attar_workbench_table.png")
const TEX_BODY := preload("res://assets/mortar/mortar_body.png")
const TEX_INNER := preload("res://assets/mortar/mortar_inner_shadow.png")
const TEX_RAW := preload("res://assets/mortar/mortar_contents_base.png")
const TEX_CRUSHED := preload("res://assets/mortar/mortar_contents_crushed.png")
const TEX_PESTLE := preload("res://assets/mortar/mortar_pestle.png")
const TEX_PIECE_1 := preload("res://assets/mortar/mortar_piece_01.png")
const TEX_PIECE_2 := preload("res://assets/mortar/mortar_piece_02.png")
const TEX_PIECE_3 := preload("res://assets/mortar/mortar_piece_03.png")
const TEX_DUST_1 := preload("res://assets/mortar/mortar_dust_01.png")
const TEX_DUST_2 := preload("res://assets/mortar/mortar_dust_02.png")
const TEX_SHADOW := preload("res://assets/mortar/mortar_shadow.png")
const TEX_GLOW := preload("res://assets/mortar/mortar_glow.png")

var stage := Stage.PICK_HERB
var hit_count := 0
var dragging := false
var busy := false
var pestle_hint_tween: Tween

var ingredient: Node2D
var mortar: Node2D
var pestle_pivot: Node2D
var raw_contents: Sprite2D
var crushed_contents: Sprite2D
var raw_front_pieces: Node2D
var dust_1: Sprite2D
var dust_2: Sprite2D
var glow: Sprite2D
var result: Node2D
var instruction: Label
var progress_fill: ColorRect
var progress_text: Label
var result_title: Label
var result_hint: Label
var replay_button: Button
var drop_ring: Control


func _ready() -> void:
	set_process_unhandled_input(true)
	_build_interface()
	reset_game()


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color("17131b"))


func _build_interface() -> void:
	var background := TextureRect.new()
	background.name = "AttarShopBackground"
	background.texture = TEX_BACKGROUND
	background.position = Vector2.ZERO
	background.size = Vector2(1280, 720)
	background.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	background.stretch_mode = TextureRect.STRETCH_SCALE
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(background)

	var table := TextureRect.new()
	table.name = "AttarWorkbenchTable"
	table.texture = TEX_TABLE
	table.position = Vector2(TABLE_X_OFFSET, TABLE_Y_OFFSET)
	table.size = Vector2(1280, 720)
	table.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	table.stretch_mode = TextureRect.STRETCH_SCALE
	table.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(table)

	var atmosphere := ColorRect.new()
	atmosphere.position = Vector2.ZERO
	atmosphere.size = Vector2(1280, 720)
	atmosphere.color = Color(0.08, 0.045, 0.055, 0.12)
	atmosphere.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(atmosphere)

	var header := Panel.new()
	header.position = Vector2(286, 10)
	header.size = Vector2(708, 92)
	header.mouse_filter = Control.MOUSE_FILTER_IGNORE
	header.add_theme_stylebox_override("panel", _panel_style(Color(0.07, 0.045, 0.055, 0.78), Color(0.62, 0.40, 0.19, 0.72), 1, 30))
	add_child(header)

	var title := _make_label("کارگاه عطاری کیمیاگر", 28, Color("f7dfa9"))
	title.position = Vector2(0, 18)
	title.size = Vector2(1280, 40)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.z_index = 30
	add_child(title)

	instruction = _make_label("", 20, Color("ead5b1"))
	instruction.position = Vector2(220, 57)
	instruction.size = Vector2(840, 36)
	instruction.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	instruction.z_index = 30
	add_child(instruction)

	drop_ring = Control.new()
	drop_ring.position = Vector2(490, 268)
	drop_ring.size = Vector2(300, 218)
	drop_ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
	drop_ring.modulate.a = 0.0
	drop_ring.add_theme_stylebox_override("panel", _panel_style(Color(0.42, 0.27, 0.13, 0.26), Color("d5a54d"), 3, 48))
	var ring_panel := Panel.new()
	ring_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ring_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ring_panel.add_theme_stylebox_override("panel", _panel_style(Color(0.42, 0.27, 0.13, 0.16), Color("d5a54d"), 3, 48))
	drop_ring.add_child(ring_panel)
	add_child(drop_ring)

	_build_ingredient()
	_build_mortar()
	_build_result()
	_build_progress()

	var footer := _make_label("با ماوس یا لمس بازی کن  •  Space: ضربه", 13, Color("d1b994"))
	footer.position = Vector2(0, 692)
	footer.size = Vector2(1280, 22)
	footer.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	footer.z_index = 30
	add_child(footer)


func _build_ingredient() -> void:
	var zone_shadow := Polygon2D.new()
	zone_shadow.polygon = _oval_polygon(128.0, 63.0, 20)
	zone_shadow.position = INGREDIENT_HOME + Vector2(7, 11)
	zone_shadow.color = Color(0.08, 0.035, 0.025, 0.65)
	add_child(zone_shadow)
	var tray := Polygon2D.new()
	tray.polygon = _oval_polygon(124.0, 60.0, 20)
	tray.position = INGREDIENT_HOME
	tray.color = Color("9a6b32")
	add_child(tray)
	var tray_inner := Polygon2D.new()
	tray_inner.polygon = _oval_polygon(110.0, 47.0, 20)
	tray_inner.position = INGREDIENT_HOME
	tray_inner.color = Color("39231c")
	add_child(tray_inner)

	var name_label := _make_label("گیاه خشک", 20, Color("f4d79a"))
	name_label.position = Vector2(90, 559)
	name_label.size = Vector2(240, 34)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.z_index = 30
	add_child(name_label)

	var hint := _make_label("بردار و داخل هاون بینداز", 13, Color("d2b995"))
	hint.position = Vector2(80, 587)
	hint.size = Vector2(260, 28)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.z_index = 30
	add_child(hint)

	ingredient = Node2D.new()
	ingredient.name = "Ingredient"
	ingredient.position = INGREDIENT_HOME
	add_child(ingredient)

	_add_sprite(ingredient, TEX_PIECE_1, Vector2(-42, -15), Vector2(0.65, 0.65), -0.38, 2)
	_add_sprite(ingredient, TEX_PIECE_2, Vector2(38, 8), Vector2(0.61, 0.61), 0.34, 2)
	_add_sprite(ingredient, TEX_PIECE_3, Vector2(-4, 27), Vector2(0.76, 0.76), 0.08, 3)
	_add_sprite(ingredient, TEX_PIECE_1, Vector2(34, -38), Vector2(0.50, 0.50), 0.74, 1)


func _build_mortar() -> void:
	mortar = Node2D.new()
	mortar.name = "Mortar"
	mortar.position = MORTAR_CENTER
	mortar.scale = Vector2(0.42, 0.42)
	add_child(mortar)

	_add_sprite(mortar, TEX_SHADOW, Vector2(0, 320), Vector2.ONE, 0.0, 0)
	var body_back := _add_sprite(mortar, TEX_BODY, Vector2.ZERO, Vector2.ONE, 0.0, 2)
	body_back.name = "MortarBodyBack"
	_add_sprite(mortar, TEX_INNER, Vector2(0, -240), Vector2.ONE, 0.0, 3)

	raw_contents = _add_sprite(mortar, TEX_RAW, Vector2(0, -238), Vector2.ONE, 0.0, 4)
	crushed_contents = _add_sprite(mortar, TEX_CRUSHED, Vector2(0, -234), Vector2.ONE, 0.0, 5)
	glow = _add_sprite(mortar, TEX_GLOW, Vector2(0, -170), Vector2.ONE, 0.0, 4)
	glow.modulate = Color(1.0, 0.77, 0.32, 0.0)

	dust_1 = _add_sprite(mortar, TEX_DUST_1, Vector2(-50, -280), Vector2.ONE, 0.0, 9)
	dust_2 = _add_sprite(mortar, TEX_DUST_2, Vector2(40, -278), Vector2.ONE, 0.0, 9)
	dust_1.modulate.a = 0.0
	dust_2.modulate.a = 0.0

	pestle_pivot = Node2D.new()
	pestle_pivot.name = "PestlePivot"
	pestle_pivot.position = PESTLE_READY
	pestle_pivot.rotation_degrees = -3.0
	pestle_pivot.z_index = 6
	mortar.add_child(pestle_pivot)
	# The image center is offset so rotation happens around the grip, using
	# the production pivot recorded in mortar_manifest.json (402, 39).
	_add_sprite(pestle_pivot, TEX_PESTLE, Vector2(-159, 285), Vector2.ONE, 0.0, 0)

	# A few loose pieces sit above the pestle while the main herb bed stays
	# behind it. Together they make the pestle visibly pass between the herbs.
	raw_front_pieces = Node2D.new()
	raw_front_pieces.name = "HerbsInFrontOfPestle"
	raw_front_pieces.z_index = 7
	mortar.add_child(raw_front_pieces)
	_add_sprite(raw_front_pieces, TEX_PIECE_1, Vector2(-104, -202), Vector2(0.72, 0.72), -0.48, 0)
	_add_sprite(raw_front_pieces, TEX_PIECE_2, Vector2(82, -205), Vector2(0.68, 0.68), 0.44, 0)
	_add_sprite(raw_front_pieces, TEX_PIECE_3, Vector2(12, -185), Vector2(0.60, 0.60), 0.12, 1)

	# Re-draw only the curved front half of the body above the pestle. This
	# gives the mortar a real front/back depth split without changing its art.
	var body_front := _add_sprite(mortar, TEX_BODY, Vector2.ZERO, Vector2.ONE, 0.0, 8)
	body_front.name = "MortarBodyFront"
	var front_shader := Shader.new()
	front_shader.code = """
		shader_type canvas_item;
		void fragment() {
			vec4 pixel = texture(TEXTURE, UV);
			float side = abs(UV.x - 0.5) * 2.0;
			float front_curve = mix(0.285, 0.135, side * side);
			if (UV.y < front_curve) {
				pixel.a = 0.0;
			}
			COLOR = pixel;
		}
	"""
	var front_material := ShaderMaterial.new()
	front_material.shader = front_shader
	body_front.material = front_material


func _build_result() -> void:
	result = Node2D.new()
	result.name = "CrushedResult"
	result.position = RESULT_HOME
	result.visible = false
	add_child(result)

	var saucer := Polygon2D.new()
	saucer.polygon = PackedVector2Array([
		Vector2(-105, -12), Vector2(-88, -50), Vector2(-38, -70),
		Vector2(38, -70), Vector2(88, -50), Vector2(105, -12),
		Vector2(91, 28), Vector2(42, 51), Vector2(-42, 51), Vector2(-91, 28)
	])
	saucer.color = Color("8b6338")
	result.add_child(saucer)
	_add_sprite(result, TEX_CRUSHED, Vector2(0, -17), Vector2(0.43, 0.43), 0.0, 2)

	result_title = _make_label("گیاه خردشده", 21, Color("f0d39a"))
	result_title.position = Vector2(948, 559)
	result_title.size = Vector2(234, 34)
	result_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	result_title.modulate.a = 0.0
	add_child(result_title)

	result_hint = _make_label("آماده‌ی مرحله‌ی بعد", 14, Color("bda68e"))
	result_hint.position = Vector2(948, 587)
	result_hint.size = Vector2(234, 28)
	result_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	result_hint.modulate.a = 0.0
	add_child(result_hint)

	replay_button = Button.new()
	replay_button.text = "شروع دوباره"
	replay_button.position = Vector2(1015, 633)
	replay_button.size = Vector2(110, 42)
	replay_button.add_theme_font_size_override("font_size", 16)
	replay_button.add_theme_color_override("font_color", Color("2a1b1b"))
	replay_button.add_theme_stylebox_override("normal", _panel_style(Color("d7aa59"), Color("f2d393"), 2, 16))
	replay_button.add_theme_stylebox_override("hover", _panel_style(Color("efc777"), Color("ffe4a9"), 2, 16))
	replay_button.add_theme_stylebox_override("pressed", _panel_style(Color("b98342"), Color("e9c477"), 2, 16))
	replay_button.pressed.connect(reset_game)
	replay_button.visible = false
	add_child(replay_button)


func _build_progress() -> void:
	var track := Panel.new()
	track.position = Vector2(500, 619)
	track.size = Vector2(280, 16)
	track.mouse_filter = Control.MOUSE_FILTER_IGNORE
	track.add_theme_stylebox_override("panel", _panel_style(Color("251a20"), Color("674630"), 2, 8))
	add_child(track)

	progress_fill = ColorRect.new()
	progress_fill.position = Vector2(504, 623)
	progress_fill.size = Vector2(0, 8)
	progress_fill.color = Color("d2a04e")
	progress_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(progress_fill)

	progress_text = _make_label("۰ / ۵", 14, Color("dbc69d"))
	progress_text.position = Vector2(500, 588)
	progress_text.size = Vector2(280, 28)
	progress_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(progress_text)


func _make_label(text_value: String, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text_value
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label


func _panel_style(fill: Color, border: Color, width: int, radius: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(width)
	style.set_corner_radius_all(radius)
	return style


func _oval_polygon(radius_x: float, radius_y: float, points: int) -> PackedVector2Array:
	var polygon := PackedVector2Array()
	for index in range(points):
		var angle := TAU * float(index) / float(points)
		polygon.append(Vector2(cos(angle) * radius_x, sin(angle) * radius_y))
	return polygon


func _add_sprite(parent: Node, texture: Texture2D, pos: Vector2, sprite_scale: Vector2, rotation: float, z: int) -> Sprite2D:
	var sprite := Sprite2D.new()
	sprite.texture = texture
	sprite.position = pos
	sprite.scale = sprite_scale
	sprite.rotation = rotation
	sprite.z_index = z
	parent.add_child(sprite)
	return sprite


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_SPACE or event.keycode == KEY_ENTER:
			if stage == Stage.PICK_HERB and not busy:
				_drop_ingredient()
			elif stage == Stage.READY and not busy:
				_perform_hit()
			elif stage == Stage.FINISHED:
				reset_game()
			get_viewport().set_input_as_handled()
		return

	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_pointer_pressed(event.position)
		else:
			_pointer_released(event.position)
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion and dragging:
		_move_ingredient(event.position)
		get_viewport().set_input_as_handled()
	elif event is InputEventScreenTouch:
		if event.pressed:
			_pointer_pressed(event.position)
		else:
			_pointer_released(event.position)
		get_viewport().set_input_as_handled()
	elif event is InputEventScreenDrag and dragging:
		_move_ingredient(event.position)
		get_viewport().set_input_as_handled()


func _pointer_pressed(pointer_position: Vector2) -> void:
	if busy:
		return
	if stage == Stage.PICK_HERB and pointer_position.distance_to(ingredient.position) < 125.0:
		dragging = true
		ingredient.z_index = 20
		var tween := create_tween().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tween.tween_property(ingredient, "scale", Vector2(1.08, 1.08), 0.12)
	elif stage == Stage.READY and pointer_position.distance_to(MORTAR_MOUTH) < 210.0:
		_perform_hit()


func _move_ingredient(pointer_position: Vector2) -> void:
	ingredient.position = pointer_position
	var over_mortar := pointer_position.distance_to(MORTAR_MOUTH) < 170.0
	var target_alpha := 1.0 if over_mortar else 0.42
	drop_ring.modulate.a = lerpf(drop_ring.modulate.a, target_alpha, 0.28)


func _pointer_released(pointer_position: Vector2) -> void:
	if not dragging:
		return
	dragging = false
	ingredient.z_index = 0
	if pointer_position.distance_to(MORTAR_MOUTH) < 170.0:
		_drop_ingredient()
	else:
		var tween := create_tween().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tween.set_parallel(true)
		tween.tween_property(ingredient, "position", INGREDIENT_HOME, 0.32)
		tween.tween_property(ingredient, "scale", Vector2.ONE, 0.2)
		tween.tween_property(drop_ring, "modulate:a", 0.0, 0.2)


func _drop_ingredient() -> void:
	if busy or stage != Stage.PICK_HERB:
		return
	busy = true
	dragging = false
	var tween := create_tween().set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	tween.set_parallel(true)
	tween.tween_property(ingredient, "position", MORTAR_MOUTH, 0.34)
	tween.tween_property(ingredient, "scale", Vector2(0.32, 0.32), 0.34)
	tween.tween_property(ingredient, "rotation", 0.22, 0.34)
	tween.tween_property(drop_ring, "modulate:a", 0.0, 0.2)
	await tween.finished
	var vanish := create_tween()
	vanish.tween_property(ingredient, "modulate:a", 0.0, 0.15)
	await vanish.finished
	ingredient.visible = false
	raw_contents.visible = true
	raw_front_pieces.visible = true
	raw_front_pieces.modulate.a = 0.0
	var appear := create_tween().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	appear.set_parallel(true)
	appear.tween_property(raw_contents, "modulate:a", 1.0, 0.24)
	appear.tween_property(raw_contents, "scale", Vector2.ONE, 0.24).from(Vector2(0.78, 0.78))
	appear.tween_property(raw_front_pieces, "modulate:a", 1.0, 0.24)
	stage = Stage.READY
	busy = false
	instruction.text = "روی هاون بزن تا گیاه کاملاً خرد شود"
	_pulse_pestle()


func _perform_hit() -> void:
	if busy or stage != Stage.READY:
		return
	if pestle_hint_tween != null and pestle_hint_tween.is_valid():
		pestle_hint_tween.kill()
	busy = true
	var lift := create_tween().set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	lift.set_parallel(true)
	lift.tween_property(pestle_pivot, "position", PESTLE_READY + Vector2(10, -88), 0.14)
	lift.tween_property(pestle_pivot, "rotation_degrees", -8.0, 0.14)
	await lift.finished

	var strike := create_tween().set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
	strike.set_parallel(true)
	strike.tween_property(pestle_pivot, "position", PESTLE_READY + Vector2(-8, 82), 0.14)
	strike.tween_property(pestle_pivot, "rotation_degrees", 5.0, 0.14)
	await strike.finished

	hit_count += 1
	_update_progress()
	_flash_impact()
	Input.vibrate_handheld(28)

	var settle := create_tween().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	settle.set_parallel(true)
	settle.tween_property(pestle_pivot, "position", PESTLE_READY, 0.17)
	settle.tween_property(pestle_pivot, "rotation_degrees", -3.0, 0.17)
	await settle.finished

	if hit_count >= TOTAL_HITS:
		await _finish_grinding()
	else:
		busy = false


func _flash_impact() -> void:
	var dust := dust_1 if hit_count % 2 == 1 else dust_2
	dust.rotation = randf_range(-0.08, 0.08)
	dust.scale = Vector2(0.76, 0.76)
	dust.modulate = Color(1, 1, 1, 0.8)
	var fx := create_tween().set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	fx.set_parallel(true)
	fx.tween_property(dust, "scale", Vector2(1.13, 1.13), 0.32)
	fx.tween_property(dust, "modulate:a", 0.0, 0.32)

	var shake := create_tween()
	shake.tween_property(mortar, "position:x", MORTAR_CENTER.x - 4, 0.035)
	shake.tween_property(mortar, "position:x", MORTAR_CENTER.x + 3, 0.04)
	shake.tween_property(mortar, "position:x", MORTAR_CENTER.x, 0.045)


func _update_progress() -> void:
	var ratio := float(hit_count) / float(TOTAL_HITS)
	var progress_tween := create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	progress_tween.tween_property(progress_fill, "size:x", 272.0 * ratio, 0.22)
	progress_text.text = "%s / ۵" % _persian_number(hit_count)
	crushed_contents.visible = true
	crushed_contents.modulate.a = ratio
	raw_contents.modulate.a = 1.0 - ratio * 0.88
	raw_front_pieces.modulate.a = 1.0 - ratio
	instruction.text = "کوبیدن گیاه  —  %s ضربه از ۵" % _persian_number(hit_count)


func _finish_grinding() -> void:
	stage = Stage.FINISHED
	instruction.text = "تمام شد! گیاه خردشده آماده است"
	raw_contents.modulate.a = 0.0
	crushed_contents.modulate.a = 1.0

	var pulse := create_tween().set_trans(Tween.TRANS_SINE)
	pulse.tween_property(glow, "modulate:a", 0.62, 0.18)
	pulse.tween_property(glow, "modulate:a", 0.0, 0.42)
	await get_tree().create_timer(0.32).timeout

	result.visible = true
	result.position = MORTAR_MOUTH
	result.scale = Vector2(0.14, 0.14)
	result.modulate.a = 0.0
	var fly := create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	fly.set_parallel(true)
	fly.tween_property(result, "position:x", RESULT_HOME.x, 0.72)
	fly.tween_property(result, "scale", Vector2.ONE, 0.72)
	fly.tween_property(result, "modulate:a", 1.0, 0.20)
	var arc := create_tween().set_trans(Tween.TRANS_SINE)
	arc.tween_property(result, "position:y", MORTAR_MOUTH.y - 92, 0.34).set_ease(Tween.EASE_OUT)
	arc.tween_property(result, "position:y", RESULT_HOME.y, 0.38).set_ease(Tween.EASE_IN)
	await fly.finished

	var reveal := create_tween()
	reveal.set_parallel(true)
	reveal.tween_property(result_title, "modulate:a", 1.0, 0.25)
	reveal.tween_property(result_hint, "modulate:a", 1.0, 0.32)
	replay_button.visible = true
	replay_button.modulate.a = 0.0
	reveal.tween_property(replay_button, "modulate:a", 1.0, 0.28)
	busy = false


func _pulse_pestle() -> void:
	pestle_hint_tween = create_tween().set_loops(2).set_trans(Tween.TRANS_SINE)
	pestle_hint_tween.tween_property(pestle_pivot, "rotation_degrees", -1.0, 0.16)
	pestle_hint_tween.tween_property(pestle_pivot, "rotation_degrees", -3.0, 0.16)


func reset_game() -> void:
	stage = Stage.PICK_HERB
	hit_count = 0
	dragging = false
	busy = false
	if ingredient == null:
		return
	if pestle_hint_tween != null and pestle_hint_tween.is_valid():
		pestle_hint_tween.kill()
	ingredient.visible = true
	ingredient.position = INGREDIENT_HOME
	ingredient.scale = Vector2.ONE
	ingredient.rotation = 0.0
	ingredient.modulate = Color.WHITE
	raw_contents.visible = false
	raw_contents.modulate = Color(1, 1, 1, 0)
	raw_contents.scale = Vector2.ONE
	raw_front_pieces.visible = false
	raw_front_pieces.modulate = Color.WHITE
	crushed_contents.visible = false
	crushed_contents.modulate = Color(1, 1, 1, 0)
	pestle_pivot.position = PESTLE_READY
	pestle_pivot.rotation_degrees = -3.0
	glow.modulate.a = 0.0
	dust_1.modulate.a = 0.0
	dust_2.modulate.a = 0.0
	drop_ring.modulate.a = 0.0
	result.visible = false
	result.position = RESULT_HOME
	result.scale = Vector2.ONE
	result_title.modulate.a = 0.0
	result_hint.modulate.a = 0.0
	replay_button.visible = false
	progress_fill.size.x = 0.0
	progress_text.text = "۰ / ۵"
	instruction.text = "گیاه را بردار و داخل هاون بینداز"


func _persian_number(value: int) -> String:
	var numbers := ["۰", "۱", "۲", "۳", "۴", "۵"]
	return numbers[clampi(value, 0, 5)]
