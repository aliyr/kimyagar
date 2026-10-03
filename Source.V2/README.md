# کیمیاگر — Source.V2

Godot 4.7 port of the web game’s **gate** (`#/`, `#/gate`) and **classic workshop** (`#/classic`). The web app in `Web/` is the reference and is not modified. The older Godot tree in `Source/` is also left untouched.

Checked with Godot 4.7.2 stable. The logical stage is 1920×1080, `canvas_items` + `keep`, GL Compatibility, landscape. Android preset: arm64, package `com.kimyagar.game`.

## Layout

- `scripts/engine/` — alchemy, mulberry32 / FNV seed, catalog, progress, tilt math. Same inputs as `Web/src/engine` and `art/flat/kit/rng.ts`.
- `scripts/autoload/` — game store, `user://` progress and settings, synthesized audio, haptics (8 / 18 / 32 ms).
- `scripts/view/` — gate, classic workshop, parchment overlays, debug drawer (Shift+D or `dbg`).
- `scripts/fx/` — furnace fire, `ClassicBrewSim` / `ClassicBrewPainter` / goat-head spoon, mortar constraint pile and particles.
- `shaders/` — door `rotateY` and the scene perspective rig.
- `assets/data/` — the same JSON the web game loads, including `customers.json`.
- `assets/fonts/` — Vazirmatn.
- `assets/art/` — real PNG copies of the classic, gate, and customer sets the workshop actually uses (not symlinks). Godot imports them lossless, without mipmaps. `UiKit.tex` loads them with `load()` / `ResourceLoader`.

## Run and test

```bash
godot --path Source.V2
godot --headless --path Source.V2 -s res://tests/run_tests.gd
godot --headless --path Source.V2 --quit-after 2
```

`ALL TESTS PASSED` is the success line, including the check that a workshop sprite with `z_as_relative = false` and `z_index = 4096` still cannot draw on the gate's canvas layer. Golden numbers were dumped from the web engine. Godot `float` matches those quotients within `1e-12` for the RNG and `5e-4` / `5e-3` for stability and score. The FNV customer seed is an exact `uint32`.

Sprite rectangles are the web logical boxes (`SCENE_ZONES`, `layout.ts`, `intro.css`, `scene.css`), not the PNG pixel size. `UiKit.sprite` sets `EXPAND_IGNORE_SIZE` before assigning the texture, then sets that layout size again. Full-screen layers use top-left anchors and an explicit 1920×1080. Stretched anchors (left ≠ right) were discarding a size set in `_ready` — the "non-equal opposite anchors" warning — so the gate plate collapsed and the workshop drew through it.

The gate rig is drawn once, on its own canvas layer, scaled 1.06 from the stage centre and clipped to 1920×1080. Facade colour is the CSS grade baked into an RGBA8 image (same path as the sign PNG). The workshop is a SubViewport drawn underneath that layer, so a workshop sprite — including one with `z_as_relative = false` and a huge `z_index` — cannot paint over the facade. While the doors are shut the workshop viewport is not redrawn; the last interior stays visible through the window and door holes. Chrome (the gear, the return pill, the «نسخه ۲» chip, overlays) sits on a layer above the gate. Hue-rotate is the CSS rows, multiplied in GDScript, for dawn (hours 4–10), dusk (11–18), and night (otherwise). A cool blue-violet gate is the dawn palette, which is what the system clock shows around 06:00; it is the same grade the web uses for `?hour=6`. Pass `-- --hour=N` (also accepted without the extra `--`) to pin the hour. The log line `grade adapter=...` prints that hour, `dawn` / `dusk` / `night`, and a sky pixel plus a brick pixel. Closed door leaves are the PNG; the hinge shader is attached only while they swing, and it writes alpha 0 instead of `discard` (a discarded fragment leaves a black streak on ANGLE). Pass `-- --workshop` to record the classic workshop.

On OpenGL ES (llvmpipe, 1920×1080) the idle gate went from 113 ms / 138 draw calls / 88 ms of main-thread audio to 29 ms / 48 draw calls / 1.1 ms of audio. The same run's pour went from 94 ms and 59 ms of audio to 57 ms and 2.8 ms. `-- --profile` prints those `PROFILE` lines. A real run does not use `--shot` and does not need a warm `.godot/` cache. Delete `.godot/` if you want the same import a fresh checkout gets, then:

```bash
godot --path Source.V2 --resolution 1920x1080 --write-movie f.png --fixed-fps 10 --quit-after 40
```

Frame 39 is the idle gate (the 2.6 s boot has finished). The same command at `1280x720` and `2400x1080` keeps the logical viewport at 1920×1080 (`canvas_items` + `keep`) and scales it into the window, matching the web `fitStage`. `--write-movie` records that viewport, so the png sequence is 1920×1080 at every window size. Movie Maker stops the live generator on frame 2. A normal `--quit-after N` run stops and frees it eight frames before that quit, and a window close does the same, so the audio server does not report a leftover `AudioStreamGeneratorPlayback`. Godot removes `--quit-after` from `OS.get_cmdline_args()`, so the port reads the process command line to see the frame count.

Android, from the Godot editor: export the **Android** preset. A headless `--export-pack "Android"` pack includes the imported art (`door_west`, `customer_woman_cloth`, `mortar_back`, `cauldron_body`, piece sprites). This environment does not have the Android export templates installed, so a debug APK was not produced here. The pack is the check that the phone build will contain the textures. Windows git will check these files out as real files; there are no symlinks and no `.gdignore` on the art folder.

## Customer queue

Commit `8e46647` (“Shuffle the customer queue…”) only reordered `customers.json` so similar faces and requests are not adjacent, the first order is simple, and the impossible request sits near the end. `gameStore.currentCustomer()` is still `defs.customers[customerIndex % length]`. There is no runtime shuffle. This port uses that same file and the same index.

## What now matches the web

- **Art.** Real files, imported, loaded as resources, present in the Android pack.
- **Cauldron.** `ClassicBrewSim` steps chips, blooms, vortex, spoon follow, splashes (the classic splash table), chip-depth dissolve (`SINK_EASE`), steam, bubbles, soot, respawn squash, and liquid color (`strengthFor`, saturate 1.35, water blend, heat darken, ready glint, `burntLiquid`). The goat-head spoon uses the `classicSpoon.ts` geometry and stays in the pot until bottling. The painter draws those layers, clipped to the mouth.
- **Mortar.** `MortarPile` is the constraint pile (spawn, contain, strike split, hold volume, dust, pestle beat and aim). Strikes call `grindStrike` with that strike’s fineness and hit count. `MortarParticles` draws dust, sparks, puffs, spills, aroma, residue, and the powder mound. Scooping the pile is what drops into the pot; `bake_chips_for` is only the fallback when there is no scoop.
- **Audio.** `sfx.gd` and the gate bed follow `sfx.ts` / `ambience.ts`: oscillator type, frequencies, exponential envelopes, noise bursts, biquad type / frequency / Q, durations, bubble and crackle rates, meow sawtooth, sparkle and success notes, rumble 150 Hz Q 0.9 and roar 300 Hz. Master gain is 0.55. Noise voices play one 1.5 s white-noise buffer. Bursts use playback rate 0.8–1.2 and loops 0.9–1.1. Loop LFOs, sweeping noise, and the meow cutoff retune the biquad once per 128-sample block (the Web Audio render quantum). A frame mixes at most 4096 samples so a hitch cannot synthesize the whole buffer on the main thread.
- **Doors and tilt.** Door leaves use an inverse `rotateY` shader (perspective 1500, ±76°). The gate rig and the workshop backdrop use the CSS order `scale(1.06) rotateX rotateY` at perspective 1400, with depths 18 / 36 / 60 on the gate and 18 / 2 / 12 on the workshop backdrop, work, and near layers. Flat mode keeps the scale and the 2D parallax and drops the 3D angles. Off is identity. Gate taps go through `unproject_layer` at the same depth as the art (the cat, knocker, and settings lantern). Pin controls stay on normal picking.
- **Spoon transfer.** The goat-head spoon flies the web quadratic from the mortar, through the stir and scoop, and pours into the mouth. Chips ride in the bowl (`scoop_under` / `scoop_rest`) and fall on the pour. The ingredients are added when the pour lands, which is the web `onDrop`, not at the start of the tilt.
- **Discard.** `DiscardMotion` flies the pot, spills the gobs, and paints the wall blobs, drips, and gloss from `discardMotion.ts` / `DiscardWallFx`.
- **Bottling stream.** The pour is the web path: quadratic from the rim through `(rim.x + 22, rim.y + 4)` to the midpoint, then the reflected control into the bottle mouth. Glow, core, and sheen are 16 / 7 / 2 px.
- **Camera.** Customer enter (1.16), pour (1.22), deliver (1.14), and grind (1.3, 650 ms, return 500 ms after grinding stops) match `Cinematic.tsx` and `MortarStation`. Letterbox is only on the cinematic shots. The first time the workshop appears, the enter shot is skipped so a cold open stays wide. A later customer change does zoom.
- **Ingredient flight.** Quadratic bezier, 4–7 pieces, the web sine-hash scatter, 300 ms with a 22 ms stagger, then the land.
- **Cracked chips.** A cracked piece, or any piece with generation above 0, is drawn with `MortarPile.clip_polygon` so the nick is missing from the sprite.
- **Bucket.** It sits on the pin layer, so it does not parallax. It still zooms with the camera, same as the web pins inside `.scene-camera`.
- **Painter.** The interior, liquid, highlight, and fire glow are `radial_disc.gdshader` fills. Bubbles keep the glass-dome profile and a smooth radial texture. Drops sample the teardrop cubics.
- **Other FX.** Contact shadows are baked radials with a small box blur. Burnt smoke uses the CSS puff polygon. The gate sign swings on the 12 s ease-in-out cycle unless a screenshot freezes it. Night skies get fireflies; the lantern gets dust. The stove has a hole under the pot and a front lip.

## What is still different

These are the leftovers after the gap list above. They are small next to the scene, and they are visible if you look for them.

- **Discard shapes.** The impact gloss is a circle. The web ring is an ellipse (`60 + p * 150` by `34 + p * 80`) for the first 0.22 s. Spatter and tendrils are triangles, not the canvas teardrop curves. Blob outlines are sampled quadratics, and the first three blobs share one rotation range.
- **Contact shadow.** Three box-blur passes of radius 1 on a baked radial, not `filter: blur(6px)`. The shadow is softer than a hard ellipse and still a bit tighter than the CSS blur.
- **Bubbles and drops.** The dome and the teardrop controls match the web. Bubbles are a 96² radial texture, not a shader per bubble. Drops are an 18-step polyline of the cubics, not a true canvas bezier.
- **Liquid wall shadow.** It is drawn on the back canvas, then the interior disc covers it.
- **Mortar dust randomness.** `MortarParticles` still uses `KimRng`. The web particle sim uses its own LCG. Chip scatter and ingredient flight use the web sine hash.
- **Audio leftovers.** The noise buffer is generated once. The web builds a buffer per burst; playback rate and the filter still vary per voice here. Gain targets ease per frame. Biquad coefficients step every 128 samples instead of every sample. There is no browser autoplay lock, so the gate bed can start with the scene. The dummy audio driver in this environment stays silent (`ERR_CANT_OPEN`).
- **Gate interior.** With the doors shut, the workshop picture is the previous frame, not a live fire. It updates again as soon as the doors open.
- **Intro motion.** Fireflies follow `sky.fireflies`, which is night only. Hour 17 is dusk, so the gate shots do not show them. Dust and the sign swing are hidden or held at 0° while a screenshot freezes the gate.
- **Reduced motion.** Skipping cinematic shots follows tilt mode `off`. The web uses `prefers-reduced-motion`.
- **Enter camera.** It does not play for the first customer already on screen. It plays when the customer changes.
- **Gradients.** The radial shader and the bubble textures are smooth, and they are not pixel-identical to `createRadialGradient`.
- **Android.** `--export-pack "Android"` contains the art (`door_west`, `customer_woman_cloth`, `mortar_back`, `cauldron_body`, `pieces/flower`) plus the new scripts. This machine has no Android export templates, so there is no debug APK.

## Out of scope

The v2 scene, the style switcher, and `public/art/{flat,pixel,engraved}` are not in this project. The classic workshop still shows the web’s «نسخه ۲» chip beside «سردر»; it does not open a v2 scene. Saves are `user://` only; web `localStorage` is not imported.
