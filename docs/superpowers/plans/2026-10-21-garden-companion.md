# Garden companion implementation plan

**Goal:** Populate the existing royal frame with a fine-pixel-style companion based on the user's reference, in a Byzantine garden, with continuous idle activities and gentle click greetings.

**Architecture:** Keep generated garden and transparent 8-column × 6-row character atlas as separate local assets. An SVG viewport selects exactly one square cell with uniform scaling; its custom element schedules registered frames, observes the portrait's curtain/flip state, and pauses when hidden. Preserve the royal frame, drag rope and 64-piece confetti. Flip back only after the curtain has completely closed.

**Tech stack:** Astro asset optimization, CSS pixelated image rendering, native custom element, MutationObserver and IntersectionObserver. No new dependencies.

## Design and constraints

- Reference identity: very long pale-blue hair, pointed ears, amber-gray eyes, navy clothing with gold edging and blue gemstone headband. Cute, calm proportions.
- Garden: Byzantine ivory arcade, blue/gold mosaics, fountain, flowers, terrace. Scene fills only the existing inner aperture. Same garden art in light/dark modes.
- Current atlas rows: idle, bubbles, seated tea, resting on the table, eight-frame sitting transition, eight-frame lying-down transition. Each row's expression/gesture columns preserve its posture and props. No jump or whole-body bounce.
- Automatic sequence: idle → bubbles → idle → sit → tea → lie down → nap → wake → tea → stand. Transitions can play in reverse. Clicking selects a small smile/head tilt/wave in the current activity's row, then resumes the exact previous frame. Hover never triggers a greeting.
- Pause frame timers and ambient CSS motion while curtain is closed, card faces front, page is hidden, portrait is offscreen, or reduced motion is enabled. Clear observers/listeners/timers on removal.
- Backside whole-image click flips only while fully closed. With the curtain fully open, only clicks in the character region (or keyboard activation) request a greeting. Opening and closing lock both interactions; Escape cannot bypass closing the curtain. Rope remains its own drag target.

## Tasks

- [x] Generate a transparent 1024 × 1536 character atlas and 1217 × 1293 garden with the built-in image tool. Copy unchanged PNGs into `src/assets/images/profile/`; inspect transparency and regular cell layout.
- [x] Create `src/components/widget/GardenCompanion.astro`: optimize both PNGs, render scene, clipped sprite and small bubble effects, with scoped CSS and reduced-motion support.
- [x] Create `src/scripts/garden-companion.ts`: image readiness, action/frame timing, hover selection and visibility lifecycle.
- [x] Embed companion inside `ProfilePortrait.astro` beneath the curtains, replacing the empty backing placeholder. Preserve all frame/rope/flip controls.
- [x] Verify all six atlas rows, hover choices, background stability, curtain masking, flip/drag/confetti, image decoding, quick close/reopen, mobile fit, reduced motion, and Swup navigation. Review screenshots of idle, bubbles, tea, nap and greeting.
- [x] Run Astro check, Biome and diff checks; record results. Leave local preview running; no push requested.

## Generated assets and prompts

Built-in `image_gen` used with the supplied reference as character identity input; no CLI/API fallback or Python image editing. Final local sources:

- `src/assets/images/profile/garden-companion-pixel-sprites.png`
- `src/assets/images/profile/byzantine-pixel-garden.png`

Character prompt: Produce a genuinely transparent sprite atlas, exactly four columns by six rows of equal square cells, fine-grained pixel game art. Preserve reference woman's long ice-blue hair, pointed ears, amber-gray eyes, blue-gem gold headband and dark navy full-length high-collared gold-trim clothing; calm cute 3.5-head proportions. Same camera, scale, palette and registration in every cell, center at 50%, feet at 90%. Four consecutive frames per row: idle breathing/blink; bubble wand lifting/blowing/bubbles/lowering; seated afternoon tea cup lowered/raised/sipping/lowered with small Byzantine table; sleeping with head on folded arms on same table; curious head tilt and back; friendly waving. No scene, labels, cell borders or painted checkerboard. All sprites and props stay within their cells.

Garden prompt: Background-only Byzantine garden for an existing royal picture frame, portrait aspect 384:408, fine detailed 2D pixel game art. Ivory marble arcade with rounded arches and small blue/gold mosaic half-dome, turquoise tesserae, distant cypresses, climbing roses and white jasmine, small fountain in middle distance, warm afternoon sunlight. Sea blue, blue-green foliage, cornflower blue, ivory, muted gold, soft rose flowers. Empty lower central terrace for separately animated character and tea table; front-facing slight three-quarter view, intimate garden diorama. Edge-to-edge scene, no person, chair, table, cup, frame, curtains, text or watermark.

## Pixel-style correction

The user rejected the first smooth illustration. Both assets were regenerated with the built-in tool using explicit low-resolution pixel-cluster constraints. The rejected versions were moved to ignored `artifacts/`; only the second versions are referenced by the component. No generated pixels were edited with Python or replaced with vector stand-ins.

Final character prompt:

```text
Generate an AUTHENTIC PIXEL ART GAME SPRITE SHEET. The attached image is ONLY a character identity reference; completely REPLACE its smooth anime rendering with genuine hand-drawn LOW-RESOLUTION PIXELS. This is a correction: the previous output was smooth anime illustration and the user rejected it. PIXEL STYLE IS THE HIGHEST PRIORITY. Every line MUST be a staircase of tiny square pixels. Every curve, hair strand, eye, fabric fold, teacup and table MUST be built from hard-edged square pixel clusters. NO smooth line art, NO antialiasing, NO airbrush, NO gradients, NO painted/detailed anime shading, NO vector art, NO 3D. A classic beautifully drawn 16-bit/32-bit RPG character sprite with a relatively fine pixel grid: each frame is drawn as about 96 by 96 logical pixels, nearest-neighbor enlarged, so the little rectangular pixels remain clearly visible rather than coarse chunky blocks. Limited 32-color palette shared by all frames; 3 or 4 tones per material, deliberate pixel dithering. Cute 3-head-tall chibi woman with very long icy pale-blue hair, long pointed ears, amber eyes, blue gemstone gold headband, dark navy high-collared long gold-trimmed robes and blue boots, same identity as reference, friendly and tranquil. TRANSPARENT PNG ATLAS, exactly FOUR columns and SIX rows of equal SQUARE cells, 24 frames total, rectangular 2:3 aspect ratio, ideally 1536 by 2304 or 1024 by 1536. NO labels, NO grid lines, NO scenery. Equal registration per cell: centered, same character scale, ample transparent margin, baseline at 90%. Four consecutive frames across each row: ROW 1 idle standing and blinking; ROW 2 lifting a bubble wand and blowing a couple of pixel-art bubbles then lowering wand; ROW 3 seated at a tiny ornate round tea table, lifting white/gold cup, sipping afternoon tea, lowering cup; ROW 4 sleeping with face on folded arms on the same tea table, eyes closed with subtle breathing; ROW 5 curious HEAD tilt left/right then neutral; ROW 6 friendly waving arm greeting. Tea table appears only in rows 3 and 4. Every prop is pixel art too, all sprites fully inside cells. Again: visible fine square pixels, jagged pixel outlines, controlled clusters, tiny sharp pixel highlights, actual game-ready pixel sprites. This is NOT a polished anime sticker sheet.
```

Final garden prompt:

```text
AUTHENTIC LOW-RESOLUTION PIXEL ART VIDEO GAME BACKGROUND. Highest priority: unmistakable square pixel grid, step-shaped jagged pixel outlines and hard pixel clusters. Draw the entire scene on a 192 by 204 logical pixel grid, then enlarge with nearest neighbor to approximately 1152 by 1224. Every pixel should read as a little sharp square. This must look like a beautifully crafted 16-bit RPG garden screen, NOT a painting, NOT realistic architecture, NOT an anime background illustration. Limited 40-color palette, 3–4 discrete shade bands per material, tiny checkered pixel dithering, absolutely NO smooth gradients or antialiased lines or blur. Scene: an intimate BYZANTINE GARDEN TERRACE for a character diorama. Ivory pillars and a rounded Byzantine arch around the upper corners, a modest blue-and-gold mosaic dome in the background, tiny mosaic fountain in middle distance, cypress silhouettes, blue-green leafy shrubs, roses and white flowers at edges, sunny sky through the arch. A front-facing slightly three-quarter camera, cozy and quiet afternoon. Give the LOWER CENTER a generous EMPTY paved terrace for a separately animated blue-haired sprite and her tea table, with a little circular gold/blue floor mosaic under where her feet will stand at 50% x, 92% y. Foreground should be simple cream stone tiles with pixel shadows from leaves, so the character is readable. Palette: ivory, sand, navy, cornflower blue, turquoise, olive-green, muted gold, a few pink and white flower pixels. Deliberately simplified graphic shapes and small crisp details, not intricately rendered photographic detail. Entire image fills the portrait 384:408 aspect ratio. No person, no character, no table or chairs, no picture frame, no border, no text, no logo. Real pixel art with clear square pixels is essential, as the user rejected a smooth illustration.
```

## Verification results

- Astro check: 175 files, 0 errors/warnings/hints. Biome and `git diff --check` passed.
- Production Astro build: 147 pages, successful. Existing large-chunk advisory remains.
- Browser: all four frames observed in idle, bubbles, tea and sleep; all three hover greetings triggered; background stays fixed during greetings; 64 confetti pieces preserved; closed/front/offscreen states freeze the character; reduced motion freezes and resumes correctly.
- Native mobile touch drag opens the scene at 390px, with no horizontal overflow; dark-mode screenshot reviewed. Archive/home Swup navigation preserves working portrait and companion state.
- Screenshots in ignored `artifacts/`: `garden-pixel-idle.png`, `garden-pixel-bubbles.png`, `garden-pixel-tea.png`, `garden-pixel-sleep.png`, `garden-pixel-jump.png`, `garden-pixel-tilt.png`, `garden-pixel-wave.png`, `garden-pixel-mobile.png`.

## Final interaction and crop corrections

The results above describe the first version. The user's later corrections supersede its hover, jump and automatic pose-switch behavior.

- New source: `src/assets/images/profile/garden-companion-gentle-sprites.png`, generated with the built-in image tool from the previous pixel atlas, 1448 × 1086, 8 columns × 6 rows. The garden source remains unchanged.
- Generation brief: preserve the fine-pixel character identity, palette and ornate chair/tea table; keep furniture on the stage in every cell. Rows 1–4 preserve idle/bubbles/seated tea/resting postures, with neutral, smile, tiny head tilt and small free-hand wave variants. Row 5 has eight continuous walking/sitting frames; row 6 has eight continuous leaning/resting frames. Reverse these rows for waking and standing. No whole-body jump, exaggerated expressions or change of posture during a greeting. Transparent background, equal square cells, same registration throughout.
- Added `GardenMotion` with 14 regression tests covering every posture/reaction combination, exact frame restoration, continuous posture transitions and queued clicks during a transition. Closing, offscreen pause and reduced motion retain the current pose.
- Added opening/open/closing/closed curtain state. Versioned completion follows actual CSS transitions, so rapid reversal cannot release the flip lock early. Browser checks passed for opening/closing click locks, Escape lock, open-character click and closed-card flip.
- Reproduced duplicate and squeezed sprites by applying the old 4-column scaling to the new 8-column atlas: horizontal scale was exactly half the vertical scale. Replaced percentage-scaled HTML images with an SVG square `viewBox`, one logical cell per frame, `preserveAspectRatio="xMidYMid meet"`. Geometry lives in SVG attributes and cannot be changed by the old image CSS.
- Verified under the deliberately injected old CSS: one SVG image, one 1×1 cell, equal horizontal/vertical scale (desktop 141.03125 / 141.03125, mobile 152.21875 / 152.21875). Inspected idle, tea and sleeping crops; 390px mobile has no horizontal overflow. A seated click preserves its posture and restores its prior frame; hover does not trigger a greeting.
- Latest checks: 176 Astro files, zero errors/warnings/hints; 14 motion tests pass; Biome and diff checks pass.
- Final production Astro build after the SVG crop correction: 147 pages, successful (1m 14s).
- Current screenshots: `artifacts/garden-single-frame-fixed.png`, `garden-single-frame-tea.png`, `garden-single-frame-sleep.png`, `garden-single-frame-mobile.png`. Older screenshots show superseded behavior.
