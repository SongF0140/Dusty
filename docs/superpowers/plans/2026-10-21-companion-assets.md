# Seven portrait scenes: image assets and verification

Built-in `image_gen` mode was used; no CLI/API fallback. Selected PNGs are stored in `src/assets/images/profile/scenes/`, copied unchanged with their alpha channel. Astro creates local WebP variants; no remote image service is needed at runtime.

## Selected sprite sources

All atlases are 1774 × 887 PNGs, four columns × two rows. They are uniformly optimized to 1536 × 768; native SVG crops one 384 × 384 cell without stretching either axis.

| File in scenes/ | Generated source filename | Activity / props |
| --- | --- | --- |
| bubbles.png | exec-497601c9-8692-4fb9-b313-80500f4970de.png | Standing with a bubble wand; no furniture |
| tea.png | exec-4ca8d353-dabc-451f-a695-7063423c2d3d.png | Seated tea; the only table and chair |
| cooking.png | exec-8d9b9d04-9645-42fe-b1ae-b1ab22b36539.png | Stirring a copper pot on a small stove |
| moon.png | exec-30d93907-0afb-44a2-a145-a37d283de86d.png | Seated on a floor cushion under the moon |
| sleep.png | exec-cd35d3cd-2f46-47c1-9a65-3e47fefd385d.png | Curled on a floor cushion and pillow; no table |
| gardening.png | exec-b6b5bb18-8c26-429a-8639-92ad4bc35d68.png | **Standing**, pruning extra vines on an ivory flower-covered column |
| flute.png | exec-17242015-a331-4ed6-9ac8-cc702a4ea430.png | Standing with both hands holding a horizontal bamboo flute |

The kneeling planter variant was rejected and is not used.

## Sprite prompt set

Identity reference: the user's blue-haired, pointed-ear character image (`codex-clipboard-369e0447-504c-4a4d-9f18-3337b78c3369.png`). Pixel scale/style reference: `artifacts/garden-single-frame-fixed.png`.

Shared production specification for the seven generation calls:
> Fine-grained 16-bit RPG pixel art with visible square clusters and stepped outlines. Calm three-head chibi proportions, long pale-blue hair, pointed ears, amber-gray eyes, navy robes with gold trim, blue-gem headband. Exactly four columns × two rows of equal square cells, one whole character per cell, fixed camera, scale, props and registration, feet near 92%, generous transparent margins. Exactly two arms and two hands: raising a hand replaces its resting position; no ghost hand, extra arm or overlaid limb. First row: neutral, blink, a small activity motion, neutral. Second row: gentle smile, approximately four-degree head tilt, two small wave frames only if a hand is free. Busy-hand scenes use quiet expressions instead. No background, labels, grid, border or text.

Scene additions:
- **Bubbles:** stand with a bubble wand in one hand; a genuine free-arm wave replaces the hanging arm. No furniture.
- **Tea:** sit beside a small tea table; one hand holds the cup, the other rests on a thigh. A wave removes that thigh hand. No spare resting hand.
- **Cooking:** ivory apron over navy robes; one hand holds the spoon, the other the copper pot handle on a small stove. No wave, dining table or chair.
- **Moon:** sit on a navy cushion with hands resting on knees. For a wave, replace one knee hand with the raised arm. No table or tea set.
- **Sleep:** curl on one side on a navy/ivory floor cushion, head on a pillow, hands under the cheek. Smile/head tilt stays lying down; no wave, chair, table or bed frame.
- **Gardening (final correction):** stand in a Byzantine garden arcade, turned slightly toward an ivory marble column at the right edge of the cell, covered in vines and small white/pink flowers. One hand holds pruning shears; the other steadies an excess tendril at shoulder height. Frames bring the shears close, blink, snip the stray tendril, return to ready. Keep the flowering vine intact. No kneeling, planter, trowel, table, chair, spare hand or wave.
- **Flute:** stand playing a horizontal bamboo flute at the lips; both hands remain on it, with tiny breath/blink/finger changes. No wave, furniture or music stand.

## Background prompt set (verbatim)

The existing `byzantine-pixel-garden.png` supplies the daylight garden. New opaque backgrounds:

### kitchen-background

Authentic fine-grained 16-bit PIXEL ART background for a tiny character diorama, portrait aspect ratio 384:408, approximately 1217x1293. Clearly visible crisp tiny square pixel clusters and stepped outlines, restrained palette, no photorealistic or smooth anime painting. An intimate BYZANTINE KITCHEN alcove, ivory stone rounded arch, blue-and-gold mosaic border, copper pots hanging neatly on the back wall, a few dried herb bundles, warm amber window light and a quiet cozy atmosphere. Empty stone-paved lower central 65% for a separately animated cook and her small brazier stove. Background must contain NO PEOPLE, NO CHARACTER, NO STOVE OR FIREPLACE in foreground (the sprite supplies its stove), NO DINING TABLE, NO TEA TABLE, NO CHAIR, no cups, no kitchen island. Keep props on background wall at upper sides so the character remains clear. Palette ivory, sand, navy tiles, muted gold, copper, olive herb greens. Full image edge to edge, no frame, no text, no logo.

### moon-background

Authentic fine-grained 16-bit PIXEL ART background, portrait aspect ratio 384:408, approximately 1217x1293. Crisp tiny square pixels, stepped outlines, hard palette clusters, delicate pixel dithering, no smooth painting, no vector gradients. A quiet BYZANTINE GARDEN BALCONY AT NIGHT, ivory stone columns with ivy and small white flowers around the side edges, blue-and-gold mosaic arch overhead, a large luminous FULL MOON clearly visible in the upper-right open sky, a few tiny stars and a distant dark blue sea with small moon reflections. Peaceful navy, deep blue, sea teal, silver moonlight and muted warm gold. Keep lower-central 65% an EMPTY stone terrace for a separately rendered seated blue-haired character; no railing through that foreground region. NO PERSON, NO CHARACTER, NO TABLE, NO CHAIR, NO TEA SET, NO PICTURE FRAME, no text or logo. Scene should be readable inside a small ornate portrait frame, not an enormous panoramic city.

Saved outputs:
- `scenes/kitchen-background.png` ← `exec-907d4e69-23d6-4c3f-97fe-147cb0dcd462.png`.
- `scenes/moon-background.png` ← `exec-c4528468-2162-4078-847a-42f38fb8f9d3.png`.

## Behavior

Scene selection happens only when the closed-curtain card turns from back to front, excluding its current scene. Reopening the curtain alone resumes that scene. Activity frames never switch scenes or posture. A click pauses the activity, shows a registered reaction, then restores the exact activity frame. Occupied hands never wave.

Background and atlas decode before one synchronous commit. A revision token discards stale loads; a failed replacement retains the last complete scene. Detachment aborts listeners and invalidates pending loads.

## Verification evidence

- 31 motion/selection regression tests pass.
- Astro check: 183 files, zero errors, warnings and hints.
- Desktop: all seven scenes were opened through the actual card/rope controls and visually inspected. Tea wave has a cup hand plus one raised hand, with the lap hand removed. Gardening click keeps the shears, vine and standing posture.
- One native SVG image per viewport; desktop crop is square with equal X/Y scale (0.3672688802 each).
- A 60-second clock run stays in the same scene. Hover causes no greeting. Rope-only reopening preserves the scene. Escape cannot bypass the open curtain. Reduced motion freezes the current frame.
- 390px touch viewport: a real touch drag opens the curtain, emits exactly 64 ribbons, preserves equal X/Y scale and one image, with no horizontal page overflow. Screenshot: `artifacts/seven-scenes-mobile.png`.
- Production preview: closing rejects a click-to-flip until the curtain is fully shut; the next flip selects a different scene. All seven referenced atlas files decode at 1536 × 768 in the browser; all corresponding backgrounds decode. No page script errors. Production build completes with 147 pages.
- Visual evidence: `artifacts/seven-scenes-{bubbles,tea,cooking,moon,sleep,gardening,flute}.png`, plus tea-wave and gardening-response captures.

## Tea expression and metallic star/moon update

Current tea asset: `src/assets/images/profile/scenes/tea-sipping.png`, copied unchanged from built-in image editing output `exec-7a472579-cfa0-450a-b7c3-6ddfa1d63713.png`. It retains the transparent 1774 × 887, four-by-two atlas. The third activity frame now has the cup at the lips, gently closed eyes and a content expression; the fourth has a small after-sip smile. The sipping frame lasts 2200ms. The previous `tea.png` remains as the source reference.

Final edit prompt (built-in `image_gen`, input: `scenes/tea.png`):
> Use case: precise-object-edit. Edit the supplied transparent 4-column by 2-row pixel-art tea sprite sheet. Keep the SAME 8 square cells, exact same 2:1 sheet proportions, registration, camera, character scale, fine pixel-art grain, pale-blue hair, pointed ears, navy-and-gold robes, gold chair, tea table, tea pot and cup, and transparent background. Make ONLY the sipping expression and immediate after-sip expression clearer. TOP ROW THIRD CELL (zero-based frame 2): the held cup rim must touch her lips, her eyes close softly in a relaxed content expression, cheeks subtly rosy, shoulders relaxed; clearly enjoying a small sip of tea, with the head at the same position and the other hand still resting on her lap. TOP ROW FOURTH CELL (frame 3): cup lowered to chest as before, a small satisfied closed-mouth smile after sipping. Keep cells 0,1 and all four bottom-row greeting cells as close to the source as possible. In the last two greeting cells the raised hand REPLACES the lap hand: exactly two arms and two hands total, one cup hand plus one waving hand, never a third hand on the lap. No background, no halo, no labels, no new objects, no extra character, no extra frames. The output is an animation atlas for a native SVG crop, not a presentation illustration. Preserve genuine alpha transparency.

The curtain burst now contains 32 vector stars and 32 vector crescents, with both shapes evenly split between warm gold and silver-white. Small outlined silhouettes stay readable on light/dark surfaces. It retains outward spread, falling/fluttering motion, pointer-event passthrough and cleanup on closing/unmount. These simple code-native SVG glyphs require no generated raster asset.

Verified in the browser: all 64 particles are present (32 stars / 32 moons, 32 gold / 32 silver), use the six metallic palette colors, and have `pointer-events: none`. The layer removes itself after the burst. The tea scene uses the new atlas and visibly closes its eyes to sip. No page errors; 31 motion regression tests still pass. Evidence: `artifacts/tea-sipping-updated.png` and `artifacts/metallic-star-moon-burst.png`.
