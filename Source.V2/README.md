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

`ALL TESTS PASSED` is the success line. Golden numbers were dumped from the web engine. Godot `float` matches those quotients within `1e-12` for the RNG and `5e-4` / `5e-3` for stability and score. The FNV customer seed is an exact `uint32`.

Android, from the Godot editor: export the **Android** preset. A headless `--export-pack "Android"` pack includes the imported art (`door_west`, `customer_woman_cloth`, `mortar_back`, `cauldron_body`, piece sprites). This environment does not have the Android export templates installed, so a debug APK was not produced here. The pack is the check that the phone build will contain the textures. Windows git will check these files out as real files; there are no symlinks and no `.gdignore` on the art folder.

## Customer queue

Commit `8e46647` (“Shuffle the customer queue…”) only reordered `customers.json` so similar faces and requests are not adjacent, the first order is simple, and the impossible request sits near the end. `gameStore.currentCustomer()` is still `defs.customers[customerIndex % length]`. There is no runtime shuffle. This port uses that same file and the same index.

## What now matches the web

- **Art.** Real files, imported, loaded as resources, present in the Android pack.
- **Cauldron.** `ClassicBrewSim` steps chips, blooms, vortex, spoon follow, splashes (the classic splash table), chip-depth dissolve (`SINK_EASE`), steam, bubbles, soot, respawn squash, and liquid color (`strengthFor`, saturate 1.35, water blend, heat darken, ready glint, `burntLiquid`). The goat-head spoon uses the `classicSpoon.ts` geometry and stays in the pot until bottling. The painter draws those layers, clipped to the mouth.
- **Mortar.** `MortarPile` is the constraint pile (spawn, contain, strike split, hold volume, dust, pestle beat and aim). Strikes call `grindStrike` with that strike’s fineness and hit count. `MortarParticles` draws dust, sparks, puffs, spills, aroma, residue, and the powder mound. Scooping the pile is what drops into the pot; `bake_chips_for` is only the fallback when there is no scoop.
- **Audio.** `sfx.gd` and the gate bed follow `sfx.ts` / `ambience.ts`: oscillator type, frequencies, exponential envelopes, noise bursts, biquad type / frequency / Q, durations, bubble and crackle rates, meow sawtooth, sparkle and success notes, rumble 150 Hz Q 0.9 and roar 300 Hz. Master gain is 0.55.
- **Doors and tilt.** Door leaves use an inverse `rotateY` shader (perspective 1500, ±76°). The gate rig and the workshop backdrop use the CSS order `scale(1.06) rotateX rotateY` at perspective 1400, with depths 18 / 36 / 60 on the gate and 18 / 2 / 12 on the workshop backdrop, work, and near layers. Flat mode keeps the scale and the 2D parallax and drops the 3D angles. Off is identity.
- **Other FX that are in.** Furnace fire automaton, contact-shadow ellipses, burnt-smoke puff timing, ingredient flight into the mortar (lands, then `addClassicUnit`), brush sweep when residue or a pile is present, jar-full spill, bottling tilt and a stream into the bottle.

## What is still different

These are the remaining gaps. They are listed so a 98% claim stays honest.

- **Spoon transfer.** The wait before the ingredients hit the pot matches `SpoonTransfer` (`0.32 + 1.6 + 0.7 + 0.88 * 0.46`). The flying goat-head spoon, the chips sitting in its bowl, and the pour-out of that bowl are not drawn. The pestle hides during the transfer.
- **Discard.** The cauldron still follows a bezier off the top of the frame. `DiscardWallFx` / `discardMotion.ts` (wall blobs, drips, gloss) are not ported.
- **Bottling stream.** The pour is a straight line from the tilted rim to the bottle mouth, not the shaped stream in `BottlingSequence`.
- **Mortar chips.** Solved positions, sprites, dust dots, hop, and a soft tint are drawn. The web `clip-path` nick on cracked chips is not applied, so a cracked piece stays a full sprite.
- **Ingredient flight.** Five pieces, 300 ms, 22 ms stagger, land then add. The web path is a quadratic bezier with 4–7 pieces and a small landing scatter.
- **Cinematic camera.** The grind zoom (`setCamera` on the mortar) is not ported.
- **Shadows, smoke, intro.** Contact shadows are stacked ellipses, not a 6 px blur. Burnt smoke uses the CSS timing but circles instead of the blob `clip-path`. Intro fireflies, dust, sign swing, and the stove hole are not matched.
- **Tilt hits.** The perspective shader moves the gate picture. The click controls stay on the unprojected layout, so during a strong tilt a tap and the art can disagree. Screenshots are taken at rest.
- **Bucket parallax.** The bucket is in the work layer (depth 2). On the web it is pinned, with no parallax.
- **Audio residuals.** Noise is white, generated per sample; the web plays a short buffer at `playbackRate` 0.8–1.2 and lets the filter shape it. Loop biquads and the meow filter update per frame, not per sample. Godot has no autoplay lock, so the gate bed can start as soon as the scene does. A machine with only the dummy audio driver stays silent.
- **Painter residuals.** Radial fills are banded ellipses. Bubbles and flying drops are not the web’s glass dome and teardrop beziers. That is visible if you compare a frame of the pot side by side.

## Out of scope

The v2 scene, the style switcher, and `public/art/{flat,pixel,engraved}` are not in this project. Saves are `user://` only; web `localStorage` is not imported.
