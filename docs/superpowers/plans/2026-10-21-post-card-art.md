# Random article-card illustrations

## Result

The narrow right-hand links on article cards now show four original anime-inspired rubber-hose cartoon illustrations: a blue-haired reader, a green-haired scholar, a coral-haired explorer, and a lavender-haired stargazer. Their faded ink, cream paper, sage, teal and mustard palette matches the newspaper theme. The homepage **文章列表** heading is centered in its section.

## Saved image and prompt

Mode: built-in `image_gen`, opaque image generation; no CLI fallback.
- Project asset: `src/assets/images/post-cards/rubber-hose-strips.png`.
- Generated source: `exec-e8cda341-a53e-4770-a76a-d7636d3e23fc.png`.
- Four equal vertical panels in one atlas. Astro optimizes one shared 1024px WebP; each native SVG crops a single panel with uniform scale. Source raster remains unchanged.

Final prompt (verbatim):
> Use case: stylized-concept. Asset type: production illustration atlas for four narrow vertical article-card thumbnails on a vintage newspaper blog. Create ONE SQUARE image divided into EXACTLY FOUR equal-width vertical illustrations, side by side, with NO GAPS and NO drawn panel borders. Each illustration is one quarter of the image width and full image height, so each independent picture has a very slender 1:4 portrait aspect ratio. Total canvas ideally 1536x1536. The four columns will be cropped individually by code; keep every character entirely inside its own quarter and comfortably within the middle 75% of that strip's width. All four panels use the SAME cohesive art direction: original anime-inspired cute characters reimagined as 1970s American vintage printed rubber-hose cartoons, rounded pie-cut expressive eyes, bendy noodle arms and legs, white cartoon gloves, oversized shoes, thick warm charcoal outlines, simple flat cel colors, subtle halftone newsprint dots and faded ink on cream paper. Cute, playful, tasteful and calm, not horror, not realistic anime, no 3D, no glossy rendering. Palette should blend into an ivory newspaper website: cream, sage, sea teal, pale blue, mustard gold and restrained coral. Full-body vertical compositions with elongated flexible limbs suit the slender panels. Four distinct pictures, left to right: (1) pale-blue-haired pointed-ear girl in navy-and-gold outfit quietly reading a little book, tiny stars and a soft cream/blue backdrop; (2) long fresh-green-haired gentle character in an ivory robe holding a rolled page, trailing flexible legs, warm sage backdrop and a few leaf shapes; (3) short coral-haired adventurous cartoon girl with round goggles and a tiny satchel, cheerful walking pose, cream/mustard backdrop; (4) lavender-haired little stargazer in a floppy midnight-blue cap with a tiny crescent, bending to look through a small handheld telescope, muted teal/cream backdrop. Keep all hands and props anatomically clear, exactly two arms, no duplicated people. No text, no captions, no lettering, no watermark, no logos. Fill all four strips top to bottom with a quiet balanced composition; do not add an outer frame.

## Implementation

- `src/components/common/PostCardArtwork.astro`: source-derived SVG viewport and a static fallback.
- `src/scripts/post-card-art.ts`: assigns an illustration once per element, preserving it when an existing card is reconnected.
- `src/utils/post-card-art.ts`: shuffled batches of four cover all designs and avoid adjacent duplicates, including batch boundaries.
- Existing right-hand article links remain clickable and keep their accessible title. Existing article covers use their original rendering.
- `src/pages/[...page].astro`: section header uses centered flex alignment.

## Verification

- Two regression tests pass, including 250 selections with three deterministic random samples and eight complete four-picture batches.
- Desktop: all four illustrations appear, native SVG X/Y scale is equal, and each frame contains one atlas image. Refresh changes the sequence (observed `0,1,2,3,2` → `2,3,0,1,2`).
- Clicking the first illustrated link opens the correct article.
- Desktop and 390px mobile: heading center equals its parent's center; mobile has no horizontal overflow, and the image frame is visible at 48 × 156px.
- No page script errors.
- Screenshots: `artifacts/random-post-art-heading.png` and `artifacts/random-post-art-mobile.png`.

## Seven wider illustrations — 2026-10-21

The final artwork pool contains seven illustrations. Three additions depict a pink-haired tea witch, a navy-haired inventor and a silver-haired flute elf. Every visit shuffles all seven; the first card avoids repeating the previous visit's opening image via localStorage, with a safe fallback if browser storage is unavailable. Reconnected cards retain their current image.

The user clarified that the image content itself must widen. Both atlases were edited with built-in image_gen to expand each scene horizontally from 1:4 to 1:2, preserving character proportions and full-body composition rather than stretching or cropping them. Source files remain unchanged; new workspace assets are `src/assets/images/post-cards/rubber-hose-wide.png` and `src/assets/images/post-cards/rubber-hose-extra-wide.png`. Generated sources: `exec-a98bc02f-e331-44f4-bc7d-6f58f8788e6d.png` and `exec-6f887508-a7fb-426d-b954-8c4d366ee154.png`.

The article link frame is 104px wide (previously52px), with corresponding text-space reservation in list/grid views and a 232px minimum card height to retain full characters on mobile. Native SVG scaling remains uniform. Earlier screenshots and four-picture notes above describe the initial implementation.

Final edit prompt, atlas1:
> Use case: identity-preserve. Edit target: the attached four-panel illustration atlas. WIDEN EACH OF ITS FOUR INDIVIDUAL ILLUSTRATIONS to twice its former width by extending the backgrounds on BOTH sides of each character. Output a landscape 2:1 canvas, ideally 2048x1024, containing EXACTLY FOUR equal-width, full-height panels side by side with NO gaps or borders. Each panel must be a roomy 1:2 portrait, NOT the old skinny 1:4. Keep the same four characters, their faces, clothes, poses, props, vintage printed anime/rubber-hose cartoon style, paper halftone texture and muted cream/sage/navy/mustard palette. Left to right: blue-haired pointed-ear reader holding her book in a moonlit stone arcade; green-haired scholar holding scroll beneath foliage; coral-haired goggles adventurer in a sunny Mediterranean village; lavender-haired star-hat stargazer holding telescope at night. Preserve natural character proportions and FULL bodies from top of hair/hat through complete shoes, with a little breathing room above and below. Each character should occupy the central half to two thirds of its NEW wider panel; the ADDED width is expanded scenery, not a horizontally stretched person. Add coherent side scenery matching each existing scene. Do not crop heads, hands or shoes. Do not add characters, lettering, frames, dividing lines or watermarks. The critical change is horizontally expanded picture content for EACH panel, not just a wider outer canvas.

Final edit prompt, atlas2:
> Use case: identity-preserve. Edit target: the attached three-panel illustration atlas. Horizontally EXPAND EACH of the three existing pictures to TWICE its old width by drawing more scenery on either side of the character. Output ONE landscape 3:2 canvas, ideally1536x1024, with EXACTLY THREE equal-width full-height portrait panels, NO gaps or borders. Each individual panel is1:2 width:height, NOT1:4. Preserve all three original cute anime-inspired vintage rubber-hose characters, exact identity, pose, outfits, props, soft old newsprint halftone grain and cream/sage/navy/coral/mustard palette. LEFT: pink-haired floral tea witch holding cup and saucer, garden tea party. MIDDLE: navy-haired goggle inventor in ivory overalls holding the same tiny wind-up robot, cozy workshop. RIGHT: silver-haired pointed-ear elf playing flute, starry ivy-covered garden arcade. Show each entire figure including hat/hair and both shoes with breathing room; center each character within central half to two thirds of its NEW wider panel. Added width must be matching additional scenery, NOT stretched bodies. Extend rose garden/tea table, workshop shelves and stone arcade/foliage sideways naturally. Preserve natural character proportions, exactly two arms per character, one character per panel. Do not crop heads, hands or feet. No text, letters, captions, frames, dividers or watermark. The main requested edit is to widen EACH picture's actual scene content.

Randomization verification: five regression tests pass, covering seven-picture batches, neighboring repeats, previous-visit exclusion, first-card persistence and blocked/invalid browser storage. Three browser refreshes yielded [2,0,1,4,5], [1,2,0,4,6], [2,6,3,5,0]; returning from an article also changed the opening image.

Final wider-art verification: 104px frame on desktop and 390px mobile; text clears the illustration by 8px and 16px respectively; SVG scale is uniform and neither viewport overflows horizontally. Screenshots: `artifacts/wide-post-art-desktop.png` and `artifacts/wide-post-art-mobile.png`. Astro check:187files,zero errors/warnings/hints. All five randomization regression tests pass.
