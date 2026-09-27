# کیمیاگر — Source.V2

Godot 4.7 port of the web game’s **gate** (`#/`, `#/gate`) and **classic workshop** (`#/classic`). The web app in `Web/` is the reference and is not modified. The older Godot tree in `Source/` is also left untouched.

## Layout

- `project.godot` — 1920×1080, `canvas_items` + `keep`, GL Compatibility, landscape. Autoloads: `Progress`, `Settings`, `Haptics`, `Sfx`, `Game`.
- `export_presets.cfg` — Android preset, arm64, package `com.kimyagar.game`, landscape, vibrate permission.
- `scripts/engine/` — alchemy, mulberry32 / FNV seed, catalog, progress, tilt math, quality probe. Same inputs as `Web/src/engine` and the flat-kit RNG.
- `scripts/autoload/` — game store, `user://` progress and settings, synthesized audio, haptics.
- `scripts/view/` — gate, classic workshop, parchment overlays, debug drawer.
- `scripts/fx/` — furnace fire automaton and cauldron liquid color.
- `scripts/tilt/tilt_driver.gd` — pointer on desktop, `Input.get_gravity` on device, plus the frame-time quality shed.
- `assets/data/` — the same JSON the web game loads.
- `assets/fonts/` — Vazirmatn (the web build’s face).
- `assets/art/` — symlinks to `../../Web/public/art/…` for the classic, gate, and customer sets. A `.gdignore` in that folder stops Godot from writing `.import` sidecars through the links into `Web/`.
- `tests/run_tests.gd` — headless mirror of the web logic tests, including golden brew and RNG fixtures.

## Run

Godot **4.7** (this tree was checked with 4.7.2 stable):

```bash
godot --path Source.V2
```

The window is the logical 1920×1080 stage. The gate is in front of the darkened workshop. Knock or press the plaque to enter. In the workshop: tap a jar to pour into the mortar (hold for the ingredient card, drag to scroll the cabinet), tap the mortar to carry the grind into the pot, circle the pot to stir, tap it to bottle, use the brass heat plates, the bucket to discard, the note for the order, the ledger for the process list, and the leather book for the notebook. Settings are the lantern on the gate and the gear in the workshop. Shift+D, the `dbg` key sequence, or the corner button opens the debug drawer.

Android: open the project in the Godot editor and export the **Android** preset. See the art note below before packing a phone build.

## Tests

```bash
godot --headless --path Source.V2 -s res://tests/run_tests.gd
```

`ALL TESTS PASSED` is the success line. Golden numbers were dumped from the web engine (`Web/src/engine` and `art/flat/kit/rng.ts`). Godot `float` matches those quotients within `1e-12` for the RNG and `5e-4` / `5e-3` for stability and score. The FNV customer seed is an exact `uint32`.

A normal open is:

```bash
godot --headless --path Source.V2 --quit-after 2
```

## What is not a pixel-identical copy

- **Customer order.** The web source does not shuffle the queue. The next customer is `customers.json` order, `customerIndex % length`. This port does the same.
- **Cauldron painting.** `ClassicBrewSim` / `ClassicBrewPainter` (chips, blooms, vortex, splashes, goat-head spoon mesh) are not a line-by-line canvas port. Liquid color uses that sim’s `mixLiquid` (flat-kit tints and strengths, saturate 1.35, water blend, heat darken, ready glint, `burntLiquid`). Dissolve is taken from the engine stage (`fresh` / `extracting` / `ready` / `overprocessed`) instead of the chip-depth solver. The spoon is a brass bowl and handle that follows the stir angle. Steam and bubbles are drawn in the mouth ellipse.
- **Mortar pile.** Pieces use the v3 sprites and `kindForIngredient`, placed in the bowl with the customer seed. They shrink as grind work rises. The web constraint pile (`mortarPile.ts`) is not reproduced particle by particle.
- **Fire.** The 24×12 cellular automaton from `art/flat/kit/fire.ts` is ported (15 Hz, same cooling and palette) and stretched into the furnace arch. The web also paints those cells as soft blobs; the Godot fire is the same field with linear filtering.
- **Doors.** `rotateY(±76°)` is drawn as a horizontal scale of `cos(angle)` about the hinge, which is the 2D silhouette of that swing.
- **Tilt.** Calibration, deadzone, clamps, smoothing (pointer 3.8, gyro 2.6), rig scale 1.06, and the quality shed match `tiltMath` / `useSceneTilt`. On a phone, gravity is turned into beta/gamma and passed through `screen_tilt`. A 2° `rotateX`/`rotateY` is a small 2D rotation plus parallax; the perspective matrices themselves are what the tests check. At rest the workshop background uses the 1.06 rig and the work layer does not, as in the CSS.
- **Audio.** There are still no audio files. `Sfx` is an `AudioStreamGenerator` mixer (master 0.55) with the same event names as `sfx.ts` and the gate ambience bed. Godot has no browser autoplay lock, so the gate bed starts immediately instead of on the first tap. If the dummy audio driver is all the machine has, the mixer stays silent and the game still runs.
- **Haptics.** `Input.vibrate_handheld` at 8 / 18 / 32 ms with amplitudes 0.35 / 0.65 / 1.0. Desktop builds no-op. The on/off flag is `user://settings.cfg`.
- **Saves.** `user://progress.json` and `user://settings.cfg`. Web `localStorage` is not imported.
- **Art packing.** Textures load at runtime with `Image.load_from_file` through the symlinks, so the repo does not duplicate the customer set. An Android export will not pack a `.gdignore`d folder. For a device build, remove `assets/art/.gdignore` (and accept editor sidecars) or copy `Web/public/art` into the project without links.
- **Out of scope.** The v2 scene, the style switcher, and `public/art/{flat,pixel,engraved}` are not in this project. Shared classic helpers that the web cauldron already depended on (mulberry32, flat tints, burnt-liquid mix, FNV seed) are inlined here.
