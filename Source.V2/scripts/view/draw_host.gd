extends Control
## Draws during NOTIFICATION_DRAW. `paint` receives this canvas.

var paint: Callable


func _draw() -> void:
	if paint.is_valid():
		paint.call(self)
