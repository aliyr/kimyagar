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
var _chime_wait := 0.0
var _time := 0.0
var _master := 0.0
var _master_target := 0.0
var _rumble: Dictionary
var _roar: Dictionary
var _murmur: Dictionary
var _wind: Dictionary
var _later: Array = []
var _noise: PackedFloat32Array = PackedFloat32Array()
var _audio_n := 0


func _ready() -> void:
	_rng.randomize()
	_build_noise()
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
	_rumble = _loop_voice(150.0, 0.9, 0.0)
	_roar = _loop_voice(300.0, 0.6, 0.0)
	_murmur = _loop_voice(420.0, 0.7, 0.0)
	_wind = _band_voice(760.0, 0.9, 0.0)
	_rumble["lfo_hz"] = 2.3
	_rumble["lfo_depth"] = 45.0
	_roar["lfo_hz"] = 0.45
	_roar["lfo_depth"] = 120.0
	_murmur["lfo_hz"] = 0.19
	_murmur["lfo_depth"] = 90.0
	_wind["lfo_hz"] = 0.09
	_wind["lfo_depth"] = 260.0
	_chime_wait = 2.5 + _rng.randf() * 4.0
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
	_rumble["target"] = (_simmer * 0.11) if on else 0.0
	_roar["target"] = (_fire * 0.1) if on else 0.0
	_murmur["target"] = 0.16 if on and _ambience else 0.0
	_wind["target"] = 0.06 if on and _ambience else 0.0


func _loop_voice(freq: float, q: float, gain: float) -> Dictionary:
	return {
		"kind": "noise", "loop": true, "age": 0.0, "dur": 1e9,
		"gain": gain, "gain0": gain, "freq": freq, "freq0": freq, "freq1": freq,
		"q": q, "filter": "lowpass" if freq < 500.0 else "bandpass",
		"rate": 0.9 + _rng.randf() * 0.2, "cursor": _rng.randf() * 4000.0, "z1": 0.0, "z2": 0.0,
		"lfo_hz": 0.0, "lfo_depth": 0.0,
		"b0": 0.0, "b1": 0.0, "b2": 0.0, "a1": 0.0, "a2": 0.0, "ready": false,
		"osc": "sine", "phase": 0.0, "f0": freq, "f1": freq, "target": gain,
	}


func _band_voice(freq: float, q: float, gain: float) -> Dictionary:
	var v := _loop_voice(freq, q, gain)
	v["filter"] = "bandpass"
	return v


func _process(delta: float) -> void:
	if _play == null:
		return
	_time += delta
	var k := 1.0 - exp(-delta * 8.0)
	_master += (_master_target - _master) * k
	_approach(_rumble, delta, 0.3)
	_approach(_roar, delta, 0.4)
	_approach(_murmur, delta, 0.6)
	_approach(_wind, delta, 0.4)
	_fire_due()
	if _unlocked and Settings.sfx_enabled:
		_ambience_mod()
		_bubble_wait -= delta
		_crackle_wait -= delta
		_chime_wait -= delta
		if _simmer > 0.0 and _bubble_wait <= 0.0:
			_bubble(_simmer)
			if _rng.randf() < _simmer * 0.55:
				var level := _simmer * 0.7
				_later_call(0.035 + _rng.randf() * 0.07, func() -> void: _bubble(level))
			var per := 1.4 + _simmer * 7.5
			_bubble_wait = (1.0 / per) * (0.35 + _rng.randf() * 1.3)
		if _fire > 0.0 and _crackle_wait <= 0.0:
			_crackle(_fire)
			if _rng.randf() < _fire * 0.45:
				var n := 1 + int(floor(_rng.randf() * 3.0))
				var delay := 0.0
				for i in n:
					delay += 0.018 + float(i) * (0.014 + _rng.randf() * 0.04)
					_schedule_crackle(delay, _fire * 0.8)
			var per_f := 0.9 + _fire * 5.5
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


func _approach(v: Dictionary, delta: float, tau: float) -> void:
	if v.is_empty() or not v.has("target"):
		return
	var k := 1.0 - exp(-delta / tau)
	v["gain"] = float(v["gain"]) + (float(v["target"]) - float(v["gain"])) * k


func _later_call(delay: float, cb: Callable) -> void:
	_later.append({"t": _time + delay, "cb": cb})


func _fire_due() -> void:
	if _later.is_empty():
		return
	var pending: Array = _later
	_later = []
	for item in pending:
		if float(item["t"]) <= _time:
			(item["cb"] as Callable).call()
		else:
			_later.append(item)


func _ambience_mod() -> void:
	if _murmur.is_empty():
		return
	var amb := _ambience and _unlocked and Settings.sfx_enabled
	var base_m := 0.16 if amb else 0.0
	_murmur["target"] = base_m + (0.05 * sin(_time * TAU * 0.11) + 0.04 * sin(_time * TAU * 0.047)) * (1.0 if amb else 0.0)
	var base_w := 0.06 if amb else 0.0
	_wind["target"] = base_w + (0.05 * sin(_time * TAU * 0.07) + 0.03 * sin(_time * TAU * 0.031)) * (1.0 if amb else 0.0)


func _build_noise() -> void:
	var n := int(RATE * 1.5)
	_noise.resize(n)
	for i in n:
		_noise[i] = _rng.randf() * 2.0 - 1.0


func _noise_at(v: Dictionary) -> float:
	if _noise.is_empty():
		return _rng.randf() * 2.0 - 1.0
	var rate := float(v.get("rate", 1.0))
	var cursor := float(v.get("cursor", 0.0))
	var n := _noise.size()
	var i0 := int(floor(cursor)) % n
	var i1 := (i0 + 1) % n
	var frac: float = cursor - floor(cursor)
	v["cursor"] = fposmod(cursor + rate, float(n))
	return lerpf(_noise[i0], _noise[i1], frac)


func _sample(v: Dictionary) -> float:
	_audio_n += 1
	var sample_t := float(_audio_n) / float(RATE)
	var env := _env(v)
	var x := 0.0
	if v["kind"] == "noise":
		if not v.get("loop", false):
			var nf0 := float(v["freq0"])
			var nf1 := float(v["freq1"])
			if nf0 != nf1 and float(v["age"]) >= 0.0:
				var nu := clampf(float(v["age"]) / maxf(float(v["dur"]), 0.0001), 0.0, 1.0)
				v["freq"] = nf0 * pow(nf1 / maxf(nf0, 1.0), nu)
				_design(v)
		elif float(v.get("lfo_hz", 0.0)) > 0.0:
			v["freq"] = float(v["freq0"]) + float(v["lfo_depth"]) * sin(sample_t * TAU * float(v["lfo_hz"]))
			_design(v)
		x = _noise_at(v)
	else:
		var f0 := float(v["f0"])
		var f1 := float(v["f1"])
		var dur := maxf(float(v["dur"]), 0.0001)
		var age := maxf(float(v["age"]), 0.0)
		var freq := f0
		if str(v.get("env", "")) == "meow":
			var base := float(v.get("base", f0))
			var mid_t := dur * 0.35
			if age < mid_t:
				freq = (base * 0.8) * pow(1.35 / 0.8, clampf(age / mid_t, 0.0, 1.0))
			else:
				freq = (base * 1.35) * pow(0.7 / 1.35, clampf((age - mid_t) / maxf(dur - mid_t, 0.001), 0.0, 1.0))
			var fcut := 1400.0
			var cut_t := dur * 0.4
			if age < cut_t:
				fcut = 1400.0 * pow(2600.0 / 1400.0, age / cut_t)
			else:
				fcut = 2600.0 * pow(900.0 / 2600.0, clampf((age - cut_t) / maxf(dur - cut_t, 0.001), 0.0, 1.0))
			v["freq"] = fcut
			v["ready"] = false
		else:
			var u := clampf(age / dur, 0.0, 1.0)
			freq = f0 * pow(f1 / maxf(f0, 1.0), u) if f1 != f0 else f0
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
		"cursor": _rng.randf() * 4000.0,
		"phase": 0.0,
		"z1": 0.0, "z2": 0.0,
		"b0": 1.0, "b1": 0.0, "b2": 0.0, "a1": 0.0, "a2": 0.0,
		"ready": false,
		"hold": 0.0,
		"env": str(opts.get("env", "")),
		"base": float(opts.get("base", freq)),
	})


func _env(v: Dictionary) -> float:
	var g := float(v["gain"])
	if v.get("loop", false):
		return g
	var dur := maxf(float(v["dur"]), 0.001)
	var age := float(v["age"])
	if age < 0.0:
		return 0.0
	if str(v.get("kind")) == "noise":
		return g * pow(0.0001 / maxf(g, 0.0001), clampf(age / dur, 0.0, 1.0))
	if str(v.get("env", "")) == "meow":
		var a := dur
		var g1 := 0.11
		if age < 0.05:
			return 0.0001 * pow(g1 / 0.0001, age / 0.05)
		if age < a * 0.6:
			return g1
		var u := clampf((age - a * 0.6) / maxf(a * 0.4, 0.001), 0.0, 1.0)
		return g1 * pow(0.0001 / g1, u)
	var atk := 0.012
	if dur <= atk:
		return g * pow(0.0001 / maxf(g, 0.0001), clampf(age / dur, 0.0, 1.0))
	if age < atk:
		return 0.0001 * pow(maxf(g, 0.0001) / 0.0001, age / atk)
	var u2 := clampf((age - atk) / (dur - atk), 0.0, 1.0)
	return g * pow(0.0001 / maxf(g, 0.0001), u2)


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


func grind_strike(fineness: float, hits: int) -> void:
	var f := clampf(fineness, 0.0, 1.0)
	var h := maxi(hits, 0)
	var mid := 1.0 - absf(f - 0.5) * 2.0
	var lp_p := 0.94 + _rng.randf() * 0.12
	noise_burst(0.09 + (0.22 - 0.09) * f, "lowpass", (900.0 + (1100.0 - 900.0) * f) * lp_p, 0.5 + (0.22 - 0.5) * f, 0.8, (220.0 + (450.0 - 220.0) * f) * lp_p)
	if mid > 0.02:
		var bp_p := 0.94 + _rng.randf() * 0.12
		noise_burst(0.16, "bandpass", 1400.0 * bp_p, 0.32 * mid, 1.1, 700.0 * bp_p)
	var tone_p := 0.94 + _rng.randf() * 0.12
	tone((170.0 + _rng.randf() * 40.0) * tone_p, 0.07, 0.18 + (0.06 - 0.18) * f, "triangle", 90.0 * tone_p)
	var coarse := mini(4, 1 + int(round(float(h) * 0.6)))
	var clicks := 0
	if f <= 0.5:
		clicks = int(round(float(coarse) + float(1 - coarse) * (f * 2.0)))
	else:
		clicks = int(round(1.0 - (f - 0.5) * 2.0))
	var delay := 0.0
	for _i in clicks:
		delay += 0.012 + _rng.randf() * 0.033
		_schedule_click(delay)


func _schedule_click(delay: float) -> void:
	_later_call(delay, func() -> void:
		var ck := 0.94 + _rng.randf() * 0.12
		noise_burst(0.008 + _rng.randf() * 0.012, "highpass", (1800.0 + _rng.randf() * 1800.0) * ck, 0.1 + _rng.randf() * 0.12, 0.5)
	)


func _schedule_crackle(delay: float, level: float) -> void:
	_later_call(delay, func() -> void: _crackle(level))


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


func spill() -> void:
	var n := 3 + int(floor(_rng.randf() * 3.0))
	var delay := 0.0
	for i in n:
		_schedule_spill(delay, i)
		delay += 0.04 + _rng.randf() * 0.07


func _schedule_spill(delay: float, index: int) -> void:
	_later_call(delay, func() -> void:
		var p := 0.94 + _rng.randf() * 0.12
		noise_burst(0.03 + _rng.randf() * 0.02, "lowpass", 600.0 * p, 0.12 + _rng.randf() * 0.08, 0.8, 250.0 * p)
		if index < 2:
			tone((110.0 + _rng.randf() * 40.0) * p, 0.05, 0.08, "triangle")
	)


func brush_sweep() -> void:
	var p1 := 0.94 + _rng.randf() * 0.12
	noise_burst(0.42, "highpass", 1200.0 * p1, 0.14, 0.8, 2600.0 * p1)
	_later_call(0.18, func() -> void:
		var p2 := 0.94 + _rng.randf() * 0.12
		noise_burst(0.26, "highpass", 1600.0 * p2, 0.08, 0.8, 3000.0 * p2)
	)


func meow() -> void:
	if not _unlocked or not Settings.sfx_enabled or _play == null:
		return
	var base := 520.0 + _rng.randf() * 90.0
	var dur := 0.42 + _rng.randf() * 0.12
	_voice({
		"kind": "tone", "osc": "sawtooth", "dur": dur, "freq": 1400.0,
		"freqEnd": 900.0, "gain": 0.11, "at": 0.0, "filter": "lowpass", "q": 3.0,
		"env": "meow", "base": base, "f0": base * 0.8, "f1": base * 0.7,
	})


func chain_creak() -> void:
	var n := 3 + int(floor(_rng.randf() * 3.0))
	var at := 0.0
	for _i in n:
		_schedule_creak(at)
		at += 0.05 + _rng.randf() * 0.07


func _schedule_creak(delay: float) -> void:
	_later_call(delay, func() -> void:
		noise_burst(0.02, "bandpass", 2400.0 + _rng.randf() * 1800.0, 0.05, 6.0)
		tone(3100.0 + _rng.randf() * 900.0, 0.12, 0.012)
	)


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
	var notes := [784.0, 988.0, 1175.0, 1568.0]
	for i in notes.size():
		tone(float(notes[i]), 0.35, 0.12, "sine", null, float(i) * 0.09)


func success() -> void:
	var notes := [523.0, 659.0, 784.0, 1047.0]
	for i in notes.size():
		tone(float(notes[i]), 0.5, 0.16, "triangle", null, float(i) * 0.11)


func failure() -> void:
	tone(330.0, 0.5, 0.1, "sawtooth", 220.0)
	tone(247.0, 0.6, 0.1, "sawtooth", 150.0, 0.18)


func fire_whoosh() -> void:
	noise_burst(0.35, "lowpass", 500.0, 0.22, 0.8, 1800.0)
	var delay := 0.0
	for i in 4:
		delay = 0.06 + float(i) * (0.04 + _rng.randf() * 0.07)
		_schedule_crackle(delay, 1.0)


func cauldron_throw() -> void:
	noise_burst(0.45, "bandpass", 380.0, 0.34, 0.7, 1900.0)
	noise_burst(0.3, "lowpass", 500.0, 0.16, 0.8, 900.0)


func cauldron_splat() -> void:
	noise_burst(0.38, "lowpass", 2600.0, 0.55, 0.8, 260.0)
	tone(230.0, 0.26, 0.22, "sine", 75.0)
	noise_burst(0.22, "bandpass", 1400.0, 0.2, 0.9, 500.0)
	var delay := 0.0
	for i in 4:
		delay = 0.14 + float(i) * (0.07 + _rng.randf() * 0.12)
		_schedule_drip(delay)


func _schedule_drip(delay: float) -> void:
	_later_call(delay, func() -> void:
		var f0 := 700.0 + _rng.randf() * 500.0
		tone(f0, 0.06 + _rng.randf() * 0.05, 0.05, "sine", f0 * 1.8)
	)


func cauldron_clang() -> void:
	noise_burst(0.22, "highpass", 1100.0, 0.42, 0.6)
	noise_burst(0.12, "lowpass", 900.0, 0.55, 0.8, 180.0)
	tone(150.0, 0.16, 0.3, "triangle", 65.0)
	tone(610.0, 0.85, 0.2)
	tone(870.0, 0.6, 0.1, "sine", null, 0.005)
	tone(1290.0, 0.45, 0.06, "sine", null, 0.008)
	tone(2040.0, 0.3, 0.03, "sine", null, 0.01)


func cauldron_thud() -> void:
	noise_burst(0.2, "lowpass", 480.0, 0.34, 0.8, 110.0)
	tone(95.0, 0.22, 0.24, "triangle", 48.0)
	tone(420.0, 0.25, 0.04)


func cauldron_land(strength: float = 1.0) -> void:
	var s := clampf(strength, 0.15, 1.0)
	noise_burst(0.05, "bandpass", 3000.0, 0.5 * s, 1.4)
	noise_burst(0.13, "lowpass", 950.0, 0.55 * s, 0.8, 200.0)
	tone(165.0, 0.14, 0.32 * s, "triangle", 80.0)
	tone(740.0, 0.7 * (0.5 + 0.5 * s), 0.15 * s)
	tone(1120.0, 0.5 * (0.5 + 0.5 * s), 0.07 * s, "sine", null, 0.004)
	tone(1860.0, 0.32, 0.035 * s, "sine", null, 0.006)


func water_fill(duration_sec: float = 0.95) -> void:
	noise_burst(duration_sec, "bandpass", 520.0, 0.26, 1.1, 1500.0)
	tone(180.0, duration_sec, 0.05, "sine", 420.0)
	for i in 6:
		var at := 0.06 + (float(i) / 6.0) * duration_sec * 0.9 + _rng.randf() * 0.06
		_later_call(at, func() -> void: _bubble(0.5))


func _bubble(level: float) -> void:
	var f0 := 160.0 + _rng.randf() * 240.0
	var gain := 0.045 + _rng.randf() * 0.11 * (0.4 + level * 0.6)
	tone(f0, 0.045 + _rng.randf() * 0.085, gain, "sine", f0 * (1.9 + _rng.randf() * 1.3))


func _crackle(level: float) -> void:
	if _rng.randf() < 0.18:
		noise_burst(0.035 + _rng.randf() * 0.03, "lowpass", 700.0, 0.14 + 0.16 * level, 0.8, 250.0)
		return
	noise_burst(0.008 + _rng.randf() * 0.02, "highpass", 1600.0 + _rng.randf() * 3200.0, 0.07 + _rng.randf() * 0.2 * (0.35 + level * 0.65), 0.5)


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
