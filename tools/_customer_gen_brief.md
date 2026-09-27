# Customer portrait generation brief

Source of truth for every identity: `d:\Source\Kimiagar\Art\UI Layers\70_Customer_Counter\cast.md`.
Find the row and the English paragraph `**<id>**: ...` for your id and use it word for word as the identity.

For each id you produce three images with the GenerateImage tool (aspect_ratio "3:4"):

1. IDLE, filename `customer_<id>.png`, no reference image. Description =

   "Game character asset, single isolated character on a flat solid plain light background (uniform color, no vignette, no gradient, no floor, no shadow on the background), seen from the waist up facing slightly left, painterly cozy Persian fantasy game-art style, warm lighting, 3:4 portrait. Character fully inside the frame with a margin above the head. " + the identity paragraph + " Standing behind a shop counter (counter not shown), hands low near the waist."

   For young women always append: "Very beautiful modern Iranian glamour look. HIGH CLOSED NECKLINE up to the throat, chest fully covered, no cleavage, no off-shoulder. Loose decorative headscarf slipped far back, most of the hair and the neck above the collar visible."
   For young men always append: "Very handsome, athletic, fit. Chest covered by period clothing, no modern sportswear."
   For elders: "Dignified, warm, chest covered."

2. HAPPY, filename `customer_<id>_happy.png`, reference_image_paths = [the IDLE file path]. Description =

   "Edit the reference image. Keep EXACTLY the same person (same face, same face marks, same eyes, same hair, same age), same clothes, same headscarf or headwear, same flat plain background color, same framing, same scale and same position of the head in the frame. Change only the hands and expression: the trade prop is put away and one hand reaches forward and slightly down toward the viewer, holding a small corked glass potion bottle with softly glowing liquid, as if taking it from the shop counter. Expression: delighted, big warm smile, bright happy eyes. Chest stays fully covered. Painterly Persian fantasy game-art style."

3. SAD, filename `customer_<id>_sad.png`, reference_image_paths = [the IDLE file path]. Description =

   "Edit the reference image. Keep EXACTLY the same person (same face, same face marks, same eyes, same hair, same age), same clothes, same headscarf or headwear, same flat plain background color, same framing, same scale and same position of the head in the frame. Change only the hands and expression: holding the small corked glass potion bottle in one hand, lowered a little in front of the body, looking at it disappointed: closed mouth, lowered brows, slight frown, sad eyes. Chest stays fully covered. Painterly Persian fantasy game-art style."

## Quality gate (look at every image the tool returns)

Reject and regenerate (up to 2 retries per image, adjust wording to fix the problem) if ANY is true:
- Young woman: open neckline, cleavage, off-shoulder, or low collar. Headscarf fully covering all hair like a strict hijab (it must be loose and pushed back, hair visible).
- Face does not match the cast row (wrong age, wrong skin tone, missing the unique face mark, wrong hair color/style).
- HAPPY/SAD: face is not clearly the same person as IDLE, clothes changed, framing/scale changed a lot, no bottle in hand.
- Background not flat and plain, or has a floor/shadow/scenery. Head or hair cropped by the top edge. Extra people, text, watermark, frame.
- Clothing color almost identical to the background color everywhere along the silhouette (e.g. cream robe on cream background) - then regenerate the IDLE asking for a clearly contrasting background tone.

## After all three are accepted

The tool saves files to `C:\Users\mkfar\.cursor\projects\d-Source-Kimiagar\assets\`. Copy each accepted file (PowerShell `Copy-Item -Force`) to `d:\Source\Kimiagar\tools\_customer_src\` with the same filename (overwrite allowed).

Do not edit any other file. Do not run git. Do not run build scripts.

Report back: for each id, the three final filenames copied, how many retries, and one line describing the face so the lead can check that faces are different.
