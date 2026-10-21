# Companion scene rotation implementation plan

**Goal:** Remove malformed waving arms, reserve the tea table for tea, and choose a different quiet scene whenever the royal card flips back to its front.

**Architecture:** Seven independent scene atlases, each 4 columns × 2 rows, share the character identity and the existing SVG single-frame renderer. Day garden, kitchen and moonlit garden backgrounds are separate assets. Scene selection occurs only on the back-to-front edge and excludes the previous scene; an open scene loops its own activity without switching posture or scene.

**Tech stack:** Astro getImage, native SVG viewport, custom element, small testable motion/selection model. No dependencies or remote runtime images.

## Requirements

- Scenes: bubbles, tea, cooking, moon, sleep on a cushion, gardening, flute.
- Only tea has a tea table/chair. Cooking has a stove, gardening is **standing to prune excess vines on a flower-covered stone column in the garden arcade**, moon/sleep a cushion, bubbles/flute no furniture. No kneeling planter scene.
- Exactly two arms/hands per sprite. A greeting replaces the free arm's resting position. Cooking, sleep, gardening and flute use smile/tilt only to keep occupied hands and posture intact.
- Keep the corrected single-cell SVG crop, uniform aspect ratio, curtain-before-flip lock, click-only greetings and 64-piece confetti.
- Closing and reopening the curtain without flipping preserves the scene. No automatic scene rotation while open. Offscreen/hidden/reduced-motion pause keeps the current frame.
- Decode new scene assets before committing background, sprite metadata, motion and label together. Ignore stale asynchronous completions.

## Tasks

- [x] Generate and inspect seven eight-frame atlases and kitchen/moon backgrounds with the built-in image tool. Save selected sources under `src/assets/images/profile/scenes/`.
- [x] Replace cross-posture timeline with a per-scene `GardenMotion`, non-repeating `chooseGardenScene`, and supported reaction lists. Add regression tests for stable scenes, props, frame restoration and busy-hand policies.
- [x] Add local asset manifest to `GardenCompanion.astro`; retain SVG pixel-coordinate viewport with source-derived frame dimensions.
- [x] Update custom element to randomize on flip-to-front, load atomically, and handle rapid changes/disconnection. Preserve other portrait controls.
- [x] Browser checks: seven scenes and proper props, exactly one proportionate character, no repeated consecutive scene on a flip, no scene change for rope-only open/close, click reactions, no hover reaction, motion pause, 390px fit, no script errors.
- [x] Run motion tests, Astro/Biome/diff checks and production build. Keep preview running; no push requested.

## QA evidence

Functional checks will use real card/rope/character controls. Visual checks will include neutral and greeting frames, with particular attention to the old third-hand location. Generated sprite PNGs stay unchanged; native SVG selects one cell. Staged scene views will cover all assets independently of random selection.

Completed evidence and image prompt/source log: [companion-assets](2026-10-21-companion-assets.md). The production build emits 147 pages; all seven referenced atlas WebPs decode at 1536 × 768, with their corresponding backgrounds. Phone controls also pass against the production preview. Build retains a large-chunk advisory and an image-service fallback for a separate generated variant; the seven referenced atlases are verified optimized WebPs.
