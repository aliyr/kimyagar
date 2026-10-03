class_name DebugPanel
extends Control
## Shift+D or typing dbg. LTR, like the web debug drawer.

var _label: Label
var _btn: Button


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	UiKit.fill(self)
	_btn = Button.new()
	_btn.text = "dbg"
	_btn.position = Vector2(1884, 1050)
	_btn.size = Vector2(28, 22)
	_btn.modulate.a = 0.4
	_btn.focus_mode = Control.FOCUS_NONE
	_btn.add_theme_font_size_override("font_size", 11)
	_btn.pressed.connect(func() -> void: Game.toggle_debug())
	add_child(_btn)
	_label = Label.new()
	_label.position = Vector2(24, 24)
	_label.size = Vector2(640, 520)
	_label.add_theme_font_size_override("font_size", 16)
	_label.add_theme_color_override("font_color", Color("d7eccf"))
	_label.text_direction = Control.TEXT_DIRECTION_LTR
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var bg := ColorRect.new()
	bg.color = Color(0.05, 0.07, 0.05, 0.88)
	bg.position = _label.position - Vector2(8, 8)
	bg.size = _label.size + Vector2(16, 16)
	bg.name = "Bg"
	add_child(bg)
	add_child(_label)
	_label.visible = false
	bg.visible = false


func refresh(extra: String) -> void:
	var open := Game.debug_open
	_label.visible = open
	var bg := get_node_or_null("Bg")
	if bg:
		bg.visible = open
	if not open:
		return
	var lines: Array = []
	lines.append(extra)
	var c: Dictionary = Game.current_customer()
	lines.append("customer %s %s" % [c.get("id", ""), c.get("nameFa", "")])
	lines.append("heat %s stir %s bottled %s" % [Game.brew.get("currentHeat"), Game.brew.get("stirCount"), Game.brew.get("bottled")])
	lines.append("entries %d mortar %s" % [(Game.brew["entries"] as Array).size(), str(Game.mortar)])
	lines.append("overlay %s result %s" % [str(Game.open_overlay), Game.result != null])
	_label.text = "\n".join(lines)
