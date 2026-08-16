extends Sprite2D

func _input(event):
	if event is InputEventMouseButton:
		if event.pressed:
			position.y -= 20
