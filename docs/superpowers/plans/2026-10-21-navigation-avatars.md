# Navigation chibi avatars

Replaced the old devil with **Haiwenxiang / Agent**, and the old angel with **Enkidu / Terminal**. The image buttons retain their existing tab IDs, panel controls, persisted modes and keyboard navigation. Visible labels, button titles and accessible tab names use English.

## Saved assets

Built-in `image_gen` mode, transparent PNG output, copied unchanged into the project:
- `src/assets/images/navigation/haiwenxiang-chibi.png` ← `exec-f6e3f3fa-ecf1-4057-8bbf-af1846bbc462.png`.
- `src/assets/images/navigation/enkidu-chibi.png` ← `exec-8fdf6aef-2b03-438b-895e-2e6e659c5498.png`.

Identity references: the user's original Haiwenxiang character photo (`codex-clipboard-369e0447-504c-4a4d-9f18-3337b78c3369.png`) and the existing Enkidu author portrait (`src/assets/images/profile/author-portrait.png`).

Astro makes 128px WebP variants, rendered with `object-fit: contain` at 36px. Both portraits use soft chibi shading, large round eyes, a gentle smile and a thin ivory silhouette rim. Selected styling and hover motion are adapted to the images; reduced-motion suppresses movement.

## Final prompt set (verbatim)

### haiwenxiang

Use case: stylized-concept. Asset type: one transparent square chibi head-and-shoulders avatar for a website mode-switch button, readable at 36-40 pixels. Create a SUPER CUTE polished Japanese chibi mascot portrait with oversized round head, tiny shoulders, large bright expressive eyes with two clear catchlights, small content closed-mouth smile and light pink blush. Soft clean cel shading, delicate colored outlines, smooth high-quality anime illustration, charming and warm, not flat geometric clipart, not pixel art. One centered head facing slightly toward the viewer, full hair silhouette and ears visible, tiny bust, face fills about 65% of image width. Consistent compact square framing, generous 6% transparent safety margin on all sides, a very subtle ivory silhouette rim to stay legible over dark backgrounds. Preserve identity details from the reference, simplify tiny details for an icon. No hands, no text, no labels, no letters, no circle background, no rectangular panel, no horns, no wings, no halo, no emoji, no extra characters. Genuine transparent alpha background. Reference image is the character identity, not the original realistic proportions. Draw HAIWENXIANG: long pale icy-blue hair, straight forehead fringe with long cheek strands, long pointed pink elf-like ears, large amber-gray/golden eyes, small navy-and-gold forehead band with a centered blue oval gemstone, tiny navy high-collar outfit with understated gold piping. Gentle serene but adorable expression. Preserve the reference outfit and hair; do not add red ribbons or unrelated accessories. Blue, navy, pearl and muted gold palette.

### enkidu

Use case: stylized-concept. Asset type: one transparent square chibi head-and-shoulders avatar for a website mode-switch button, readable at 36-40 pixels. Create a SUPER CUTE polished Japanese chibi mascot portrait with oversized round head, tiny shoulders, large bright expressive eyes with two clear catchlights, small content closed-mouth smile and light pink blush. Soft clean cel shading, delicate colored outlines, smooth high-quality anime illustration, charming and warm, not flat geometric clipart, not pixel art. One centered head facing slightly toward the viewer, full hair silhouette and ears visible, tiny bust, face fills about 65% of image width. Consistent compact square framing, generous 6% transparent safety margin on all sides, a very subtle ivory silhouette rim to stay legible over dark backgrounds. Preserve identity details from the reference, simplify tiny details for an icon. No hands, no text, no labels, no letters, no circle background, no rectangular panel, no horns, no wings, no halo, no emoji, no extra characters. Genuine transparent alpha background. Reference image is the character identity, not the original painterly composition. Draw ENKIDU from this reference: very long flowing fresh leaf-green hair, green curtain bangs framing a round little face, softly luminous jade-green eyes, fair skin, and a tiny loose ivory-white robe at the shoulders. A gentle innocent warm smile, cute and androgynous, recognizable green-haired Enkidu. The original reference chains and grand composition are not needed in this small face icon; do not include chains, weapons or background. Green, jade, ivory and restrained warm gold palette. Match the clean rounded big-eyed chibi website-avatar art direction specified above.

## Verification

- Desktop and 390px mobile: both images decode, labels read exactly `Agent` and `Terminal`.
- Haiwenxiang opens the assistant; Enkidu opens the shell. ArrowRight switches to the terminal and focuses its tab. Neither mode's panel is recreated.
- Mobile shell still accepts `pwd` and prints `/`.
- Header and buttons fit inside the 390px viewport with no horizontal overflow; no page script errors.
- Screenshot evidence in `artifacts/navigation-chibi-{terminal,agent,mobile}-header.png`.
