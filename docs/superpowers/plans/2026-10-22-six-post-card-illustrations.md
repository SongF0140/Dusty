# Six additional article illustrations — 2026-10-22

Generated using built-in image_gen with the existing wide atlas as a style reference. Six new full-body scenes: greenhouse gardener, postal courier, moonlit violinist, baker, harbor navigator and garden painter. Each scene retains a 1:2 portrait ratio, warm paper/halftone texture and the existing cream/sage/navy/mustard palette.

Saved project assets:
- `src/assets/images/post-cards/rubber-hose-scenes-20261022-a.png` (source `exec-7fd9b6b8-47b5-4ea7-96ac-5f82de182688.png`).
- `src/assets/images/post-cards/rubber-hose-scenes-20261022-b.png` (source `exec-97ba3b4d-7134-4b24-8d0b-c734185b19a8.png`).

The pool now has13pictures across four atlases (4+3+3+3). Server and browser share a tested atlas-index resolver. Each shuffle batch uses all13pictures and avoids adjacent repeats; opening pictures still avoid repeating the previous visit when storage is available. Frame sizing is unchanged.

## Final prompts

Atlas A:
> Use case: stylized-concept. Reference image is STYLE ONLY. Create an original illustration atlas matching its warm vintage anime-inspired 1970s American rubber-hose cartoon art: round expressive pie-cut eyes, flexible black noodle limbs, white gloves, oversized shoes, muted cel ink, cream paper, fine halftone newsprint grain. EXACTLY THREE equal-width full-height panels side by side, no gaps or borders, overall landscape3:2 ideally1536x1024. Each individual scene is a roomy1:2 portrait. ONE original cute character per panel, FULL body including complete hair/hat and both shoes with breathing room, natural proportions, exactly two arms, centered with rich scenery on both sides. Cohesive sage/cream/navy/mustard/coral palette, no text/letters/watermark/frame. Do not reuse reference characters or poses. LEFT: auburn-haired bunny-eared fantasy botanist in sage overalls carrying a small flowerpot in an ivy greenhouse with terracotta pots. MIDDLE: mint-haired pointed-ear little postal courier in a teal cape holding a sealed envelope beside a brass mailbox on a cozy cobblestone village street. RIGHT: dark purple-haired violinist in a star-patterned navy outfit playing violin under a moonlit stone arcade, warm lantern and flowering vines.

Atlas A anatomy refinement:
> Use case: precise-object-edit. Fix ONLY the anatomy of the violinist in the RIGHT third of this three-panel illustration atlas. She currently appears to have an extra small flesh-colored hand below the violin near her chest, behind her bow hand. Remove that extra hand/fingers and replace the area with her navy dress/cream collar. She must have EXACTLY TWO arms and TWO hands: one hand at the far right supporting/fingering the violin neck, the other at center holding the bow. Make the bow grip and two arm paths completely clear. Preserve the other two panels unchanged, the violinist's identity/pose, full-body framing, three equal 1:2 portrait panels, overall3:2 landscape1536x1024, all colors, vintage paper/halftone texture, background and composition. No new objects or text.

Atlas B:
> Use case: stylized-concept. Reference image is STYLE ONLY. Create an original illustration atlas matching its warm vintage anime-inspired 1970s American rubber-hose cartoon art: round expressive pie-cut eyes, flexible black noodle limbs, white gloves, oversized shoes, muted cel ink, cream paper, fine halftone newsprint grain. EXACTLY THREE equal-width full-height panels side by side, no gaps or borders, overall landscape3:2 ideally1536x1024. Each individual scene is a roomy1:2 portrait. ONE original cute character per panel, FULL body including complete hair/hat and both shoes with breathing room, natural proportions, exactly two arms, centered with rich scenery on both sides. Cohesive sage/cream/navy/mustard/coral palette, no text/letters/watermark/frame. Do not reuse reference characters or poses. LEFT: cream-blond little baker in an ivory apron and mustard beret holding a basket of croissants outside an old bakery with trailing roses. MIDDLE: sea-blue-haired fantasy sailor in a cream/navy coat looking at an unfolded map near a harbor lighthouse and little sailboats. RIGHT: coral-pink-haired painter in a sage smock holding a palette and brush beside an easel in a sunny Mediterranean garden; easel stays to one side and never covers the full figure.

## Verification

Six regression tests pass, including all13atlas/column mappings and invalid-index rejection, full shuffle coverage, adjacent repeats, visit persistence and blocked browser storage.

Astro check:190files,zero errors/warnings/hints. Browser verification: a complete13-card batch shows indices0–12 exactly once, all four optimized atlases load successfully, no page script errors and no horizontal overflow. Screenshot: `artifacts/thirteen-post-art-desktop.png`.
