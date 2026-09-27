extends Node
## Live synthesis of the web Audio graph (sfx.ts + ambience.ts). No audio files.

const RATE := 44100
const MASTER := 0.55

var _player: AudioStreamPlayer
var _play: AudioStreamGeneratorPlayback
var _voices: Array = []
var _noise_phase := 0
var _rng := RandomNumberGenerator.new()
var _unlocked := false
var _ambience := false
var _simmer := 0.0
var _fire := 0.0
var _bubble_wait := 0.0
var _crackle_wait := 0.0
var _chime_wait := 4.0
var _time := 0.0
var _master := 0.0
var _master_target := 0.0
var _rumble: Dictionary
var _roar: Dictionary
var _murmur: Dictionary
var _wind: Dictionary


func _ready() -> void:
	_rng.randomize()
	if DisplayServer.get_name() == "headless":
		return
	var gen := AudioStreamGenerator.new()
	gen.mix_rate = RATE
	gen.buffer_length = 0.2
	_player = AudioStreamPlayer.new()
	_player.stream = gen
	add_child(_player)
	_player.play()
	_play = _player.get_stream_playback()
	_rumble = _loop_voice(180.0, 0.7, 0.0)
	_roar = _loop_voice(140.0, 0.6, 0.0)
	_murmur = _loop_voice(420.0, 0.7, 0.0)
	_wind = _loop_voice(760.0, 0.9, 0.0)
	_voices.append(_rumble)
	_voices.append(_roar)
	_voices.append(_murmur)
	_voices.append(_wind)
	_master_target = MASTER if Settings.sfx_enabled else 0.0
	_master = _master_target


func unlock() -> void:
	_unlocked = true
	_apply_levels()


func set_enabled(on: bool) -> void:
	Settings.set_sfx(on)
	_master_target = MASTER if on else 0.0
	if on:
		unlock()


func start_ambience() -> void:
	_ambience = true
	_apply_levels()


func stop_ambience() -> void:
	_ambience = false
	_apply_levels()


func set_simmer(level: float) -> void:
	_simmer = clampf(level, 0.0, 1.0)
	_apply_levels()


func set_fire(level: float) -> void:
	_fire = clampf(level, 0.0, 1.0)
	_apply_levels()


func _apply_levels() -> void:
	if _rumble.is_empty():
		return
	var on := _unlocked and Settings.sfx_enabled
	_rumble["gain"] = (0.05 + 0.08 * _simmer) if on and _simmer > 0.0 else 0.0
	_roar["gain"] = (0.04 + 0.1 * _fire) if on and _fire > 0.0 else 0.0
	_murmur["gain"] = 0.16 if on and _ambience else 0.0
	_wind["gain"] = 0.06 if on and _ambience else 0.0


func _loop_voice(freq: float, q: float, gain: float) -> Dictionary:
	return {
		"kind": "noise", "loop": true, "age": 0.0, "dur": 1e9,
		"gain": gain, "gain0": gain, "freq": freq, "freq0": freq, "freq1": freq,
		"q": q, "filter": "lowpass" if freq < 500.0 else "bandpass",
		"rate": 0.9 + _rng.randf() * 0.2, "z1": 0.0, "z2": 0.0,
		"b0": 0.0, "b1": 0.0, "b2": 0.0, "a1": 0.0, "a2": 0.0, "ready": false,
		"osc": "sine", "phase": 0.0, "f0": freq, "f1": freq,
	}


func _process(delta: float) -> void:
	if _play == null:
		return
	_time += delta
	var k := 1.0 - exp(-delta * 8.0)
	_master += (_master_target - _master) * k
	if _unlocked and Settings.sfx_enabled:
		_ambience_mod()
		_bubble_wait -= delta
		_crackle_wait -= delta
		_chime_wait -= delta
		if _simmer > 0.0 and _bubble_wait <= 0.0:
			_bubble()
			var per := 2.0 + _simmer * 8.0
			_bubble_wait = (1.0 / per) * (0.35 + _rng.randf() * 1.3)
		if _fire > 0.0 and _crackle_wait <= 0.0:
			_crackle()
			var per_f := 3.0 + _fire * 10.0
			_crackle_wait = (1.0 / per_f) * (0.3 + _rng.randf() * 1.4)
		if _ambience and _chime_wait <= 0.0:
			_chime()
			_chime_wait = 7.0 + _rng.randf() * 12.0
	var need := _play.get_frames_available()
	if need <= 0:
		return
	for _i in need:
		var s := 0.0
		var alive: Array = []
		for v in _voices:
			v["age"] = float(v["age"]) + 1.0 / float(RATE)
			if not v.get("loop", false) and float(v["age"]) >= float(v["dur"]):
				continue
			s += _sample(v)
			alive.append(v)
		_voices = alive
		s *= _master
		s = clampf(s, -1.0, 1.0)
		_play.push_frame(Vector2(s, s))


func _ambience_mod() -> void:
	if _murmur.is_empty():
		return
	_murmur["gain"] = (0.16 + 0.05 * sin(_time * TAU * 0.11) + 0.04 * sin(_time * TAU * 0.047)) if _ambience and _unlocked else 0.0
	_murmur["freq"] = 420.0 + 90.0 * sin(_time * TAU * 0.19)
	_murmur["ready"] = false
	_wind["gain"] = (0.06 + 0.05 * sin(_time * TAU * 0.07) + 0.03 * sin(_time * TAU * 0.031)) if _ambience and _unlocked else 0.0
	_wind["freq"] = 760.0 + 260.0 * sin(_time * TAU * 0.09)
	_wind["ready"] = false
	if _fire > 0.0:
		_roar["freq"] = 140.0 + 30.0 * sin(_time * TAU * 6.0)
		_roar["ready"] = false


func _sample(v: Dictionary) -> float:
	var env := float(v["gain"])
	if not v.get("loop", false):
		var dur := maxf(float(v["dur"]), 0.001)
		var age := float(v["age"])
		var atk := minf(0.012, dur * 0.3)
		var a := 1.0 if age >= atk else age / atk
		var rel := clampf((dur - age) / maxf(dur - atk, 0.001), 0.0, 1.0)
		env *= a * (rel * rel)
	var x := 0.0
	if v["kind"] == "noise":
		if _rng.randf() < float(v.get("rate", 1.0)):
			v["hold"] = _rng.randf() * 2.0 - 1.0
		x = float(v.get("hold", 0.0))
	else:
		var f0 := float(v["f0"])
		var f1 := float(v["f1"])
		var dur := maxf(float(v["dur"]), 0.0001)
		var u := clampf(float(v["age"]) / dur, 0.0, 1.0)
		var freq := f0 * pow(f1 / maxf(f0, 1.0), u) if f1 != f0 else f0
		v["phase"] = float(v["phase"]) + freq / float(RATE)
		var ph := float(v["phase"])
		match str(v["osc"]):
			"triangle":
				x = 1.0 - 4.0 * absf(fmod(ph, 1.0) - 0.5)
			"sawtooth":
				x = 2.0 * fmod(ph, 1.0) - 1.0
			_:
				x = sin(ph * TAU)
	if not v.get("ready", false):
		_design(v)
	var y := float(v["b0"]) * x + float(v["z1"])
	v["z1"] = float(v["b1"]) * x - float(v["a1"]) * y + float(v["z2"])
	v["z2"] = float(v["b2"]) * x - float(v["a2"]) * y
	return y * env


func _design(v: Dictionary) -> void:
	var freq := clampf(float(v["freq"]), 20.0, 18000.0)
	var q := maxf(float(v.get("q", 0.7)), 0.05)
	var w0 := TAU * freq / float(RATE)
	var alpha := sin(w0) / (2.0 * q)
	var cw := cos(w0)
	var b0: float
	var b1: float
	var b2: float
	var a0: float
	var a1: float
	var a2: float
	match str(v.get("filter", "lowpass")):
		"highpass":
			b0 = (1.0 + cw) * 0.5
			b1 = -(1.0 + cw)
			b2 = (1.0 + cw) * 0.5
			a0 = 1.0 + alpha
			a1 = -2.0 * cw
			a2 = 1.0 - alpha
		"bandpass":
			b0 = alpha
			b1 = 0.0
			b2 = -alpha
			a0 = 1.0 + alpha
			a1 = -2.0 * cw
			a2 = 1.0 - alpha
		_:
			b0 = (1.0 - cw) * 0.5
			b1 = 1.0 - cw
			b2 = (1.0 - cw) * 0.5
			a0 = 1.0 + alpha
			a1 = -2.0 * cw
			a2 = 1.0 - alpha
	v["b0"] = b0 / a0
	v["b1"] = b1 / a0
	v["b2"] = b2 / a0
	v["a1"] = a1 / a0
	v["a2"] = a2 / a0
	v["ready"] = true


func _voice(opts: Dictionary) -> void:
	if not _unlocked or not Settings.sfx_enabled or _play == null:
		return
	var dur := float(opts.get("dur", 0.1))
	var freq := float(opts.get("freq", 440.0))
	var freq_end = opts.get("freqEnd", freq)
	_voices.append({
		"kind": opts.get("kind", "tone"),
		"osc": opts.get("osc", "sine"),
		"loop": false,
		"age": -float(opts.get("at", 0.0)),
		"dur": dur,
		"gain": float(opts.get("gain", 0.1)),
		"freq": freq,
		"freq0": freq,
		"freq1": float(freq_end),
		"f0": freq,
		"f1": float(freq_end),
		"q": float(opts.get("q", 0.8)),
		"filter": opts.get("filter", "lowpass"),
		"rate": float(opts.get("rate", 1.0)),
		"phase": 0.0,
		"z1": 0.0, "z2": 0.0,
		"b0": 1.0, "b1": 0.0, "b2": 0.0, "a1": 0.0, "a2": 0.0,
		"ready": false,
		"hold": 0.0,
	})


func noise_burst(dur: float, type: String, freq: float, gain: float, q: float = 0.8, freq_end = null) -> void:
	_voice({
		"kind": "noise", "dur": dur, "filter": type, "freq": freq,
		"freqEnd": freq if freq_end == null else freq_end,
		"q": q, "gain": gain, "rate": 0.8 + _rng.randf() * 0.4,
	})


func tone(freq: float, dur: float, gain: float, osc: String = "sine", freq_end = null, at: float = 0.0) -> void:
	if not _unlocked or not Settings.sfx_enabled or _play == null:
		return
	_voice({
		"kind": "tone", "osc": osc, "dur": dur, "freq": freq,
		"freqEnd": freq if freq_end == null else freq_end,
		"gain": gain, "at": at, "filter": "highpass", "q": 0.5,
	})
	if _voices.is_empty():
		return
	var v: Dictionary = _voices[_voices.size() - 1]
	v["freq"] = 20.0
	v["ready"] = false


func grind_tick() -> void:
	noise_burst(0.09, "lowpass", 900.0, 0.5, 0.8, 220.0)
	tone(180.0 + _rng.randf() * 40.0, 0.07, 0.18, "triangle", 90.0)


func grind_fine() -> void:
	noise_burst(0.02, "highpass", 3000.0, 0.05)
	tone(1318.0, 0.9, 0.12)
	tone(1976.0, 0.6, 0.05, "sine", null, 0.01)
	tone(659.0, 0.5, 0.06)


func splash() -> void:
	noise_burst(0.32, "lowpass", 2200.0, 0.45, 0.8, 300.0)
	tone(320.0, 0.28, 0.22, "sine", 110.0)


func stir_sfx() -> void:
	noise_burst(0.4, "bandpass", 600.0, 0.12, 0.6, 900.0)


func pour(duration_sec: float = 1.2) -> void:
	noise_burst(duration_sec, "bandpass", 700.0, 0.3, 1.4, 1900.0)
	tone(260.0, duration_sec, 0.08, "sine", 640.0)


func cork() -> void:
	noise_burst(0.05, "bandpass", 900.0, 0.35, 2.5)
	tone(520.0, 0.09, 0.2, "sine", 260.0)


func deliver_sfx() -> void:
	tone(1200.0, 0.12, 0.16, "triangle")
	noise_burst(0.08, "highpass", 3000.0, 0.12)


func shop_bell() -> void:
	noise_burst(0.03, "highpass", 3000.0, 0.06)
	tone(988.0, 1.35, 0.16)
	tone(1480.0, 0.9, 0.07, "sine", null, 0.01)
	tone(1976.0, 0.45, 0.035, "sine", null, 0.012)


func knock() -> void:
	noise_burst(0.11, "lowpass", 700.0, 0.6, 0.8, 160.0)
	tone(150.0, 0.16, 0.28, "triangle", 70.0)
	tone(1840.0, 0.22, 0.05, "sine", null, 0.006)
	tone(2760.0, 0.14, 0.025, "sine", null, 0.008)


func meow() -> void:
	var base := 520.0 + _rng.randf() * 90.0
	var dur := 0.42 + _rng.randf() * 0.12
	tone(base, dur, 0.12, "triangle", base * 1.4)


func chain_creak() -> void:
	noise_burst(0.02, "bandpass", 2400.0 + _rng.randf() * 1800.0, 0.05, 6.0)
	tone(3100.0 + _rng.randf() * 900.0, 0.12, 0.012)


func paper() -> void:
	noise_burst(0.22, "highpass", 2600.0, 0.12)
	noise_burst(0.14, "bandpass", 3800.0, 0.08, 0.8)


func jar_drop() -> void:
	noise_burst(0.12, "bandpass", 1800.0, 0.25, 1.2)


func wood_bump() -> void:
	noise_burst(0.09, "lowpass", 240.0, 0.22)
	noise_burst(0.025, "highpass", 2200.0, 0.06)


func scoop() -> void:
	noise_burst(0.18, "highpass", 1400.0, 0.18)


func sparkle() -> void:
	tone(1568.0, 0.18, 0.06)
	tone(2093.0, 0.22, 0.05, "sine", null, 0.05)
	tone(2637.0, 0.28, 0.04, "sine", null, 0.1)


func success() -> void:
	tone(523.0, 0.16, 0.1)
	tone(659.0, 0.16, 0.1, "sine", null, 0.12)
	tone(784.0, 0.28, 0.12, "sine", null, 0.24)


func failure() -> void:
	tone(330.0, 0.5, 0.1, "sawtooth", 220.0)
	tone(247.0, 0.6, 0.1, "sawtooth", 150.0, 0.18)


func fire_whoosh() -> void:
	noise_burst(0.35, "lowpass", 500.0, 0.22, 0.8, 1800.0)


func cauldron_throw() -> void:
	noise_burst(0.45, "bandpass", 380.0, 0.34, 0.7, 1900.0)
	noise_burst(0.3, "lowpass", 500.0, 0.16, 0.8, 900.0)


func cauldron_splat() -> void:
	noise_burst(0.38, "lowpass", 2600.0, 0.55, 0.8, 260.0)
	tone(230.0, 0.26, 0.22, "sine", 75.0)


func cauldron_clang() -> void:
	noise_burst(0.22, "highpass", 1100.0, 0.42, 0.6)
	noise_burst(0.12, "lowpass", 900.0, 0.55, 0.8, 180.0)
	tone(610.0, 0.85, 0.2)
	tone(870.0, 0.6, 0.1, "sine", null, 0.005)


func cauldron_land(strength: float = 1.0) -> void:
	var s := strength
	noise_burst(0.05, "bandpass", 3000.0, 0.5 * s, 1.4)
	noise_burst(0.13, "lowpass", 950.0, 0.55 * s, 0.8, 200.0)
	tone(165.0, 0.14, 0.32 * s, "triangle", 80.0)
	tone(740.0, 0.7 * (0.5 + 0.5 * s), 0.15 * s)


func _bubble() -> void:
	var f0 := 160.0 + _rng.randf() * 240.0
	tone(f0, 0.045 + _rng.randf() * 0.085, 0.045 + _rng.randf() * 0.08, "sine", f0 * (1.9 + _rng.randf() * 1.3))


func _crackle() -> void:
	noise_burst(0.02, "highpass", 1800.0 + _rng.randf() * 2000.0, 0.08 + 0.08 * _fire)


func _chime() -> void:
	var scale := [587.0, 659.0, 698.0, 784.0, 880.0, 1047.0]
	var n := 2 + _rng.randi_range(0, 2)
	var at := 0.0
	for _i in n:
		var f: float = float(scale[_rng.randi_range(0, scale.size() - 1)])
		if _rng.randf() < 0.3:
			f *= 2.0
		tone(f, 1.6 + _rng.randf() * 0.8, 0.035 + _rng.randf() * 0.02, "sine", null, at)
		at += 0.08 + _rng.randf() * 0.22
