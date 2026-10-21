# Royal portrait implementation plan

User approved the supplied three-state visual and implementation on 2026-10-20.

## Design

Use the approved, unchanged 2172 × 724 raster as the material source. Native SVG viewports and clipping split its frame, empty blue backing, closed blue/yellow cloth and tassel into independently rendered layers. This preserves the supplied material rather than approximating its detail with CSS drawings. The local source is `src/assets/images/profile/royal-portrait-reference.png`; Astro's image pipeline serves a compressed WebP version.

The front remains the existing portrait. Clicking flips to the royal frame. The exterior tassel toggles both curtains up/down; the half-open pose is transitional. At the endpoint all cloth/lace clears the full rectangular inner opening, which stays empty for the future Haiwenxiang character. The same raster preserves day/night blue and yellow. Keep the existing three native social links and confirmed email.

## Work and verification

- [x] Record the existing missing raster layers before implementation.
- [x] Add `RoyalPortraitArtwork.astro` for source viewports and masks with unique SVG IDs; update `ProfilePortrait.astro` to compose and animate those layers, retaining keyboard, reduced motion and particle cleanup.
- [x] Verify the source masks against the supplied image at desktop size. Inspect frame silhouette, crown, aperture edges, rope, cloth/lace edges and intermediate animation.
- [x] Check open/close/rapid reversal, completely clear final aperture, frame-exterior handle, flip/Escape/focus, empty character area, contacts, day/night invariant colors, 390px viewport, reduced motion, Swup remount and bounded/cleaned ribbon effects.
- [x] Run Astro check and review the diff; preserve unrelated working-tree edits and do not push.

No generation service or external image request is needed for the approved artwork. The source bitmap is copied unchanged, with code-native clipping done by the browser.

## Verification results

- Before implementation: zero SVG raster image layers; after: independent frame, backing, upper/lower cloth and tassel viewports.
- Astro check: 172 files, 0 errors, 0 warnings, 0 hints.
- Production build: 147 pages, successful. Full-width royal texture WebP approximately 349 kB from 3049 kB source.
- Browser assertions passed: entire curtain rectangles leave aperture, empty character area, unique SVG IDs, rapid open/close reversal, particle cleanup, keyboard/Escape/focus, confirmed contact hrefs, local portrait decoding, day/night identical texture URL, 390px touch and reduced-motion behavior, no horizontal overflow, and remount after Swup navigation.
- Screenshots: artifacts/royal-raster-closed-final.png, royal-raster-middle.png, royal-raster-open-final.png, royal-raster-mobile.png, royal-portrait-front.png.
- Existing remote avatar failed to load in preview; replaced with the same portrait supplied by the user as a local optimized image.
- No new generation call or Python image editing. Source art stays unchanged; SVG viewports, paper masks and CSS transforms perform rendering. No push.

## 2026-10-21 interaction correction

- Removed the visible flip and return badges. The entire front and rear image surfaces now flip the card; the rear surface remains below the rope hit target.
- A shared cord-axis variable aligns pulley, cord and tassel. The line ends exactly at the fixed-size tassel viewport instead of crossing its ornament; the pulley has an attachment to the frame.
- Pointer capture implements real mouse/touch pulling, bounded cord stretch, a 12px directional threshold, cancellation and post-drag click suppression. Tap and keyboard activation remain available.
- Blue/yellow ribbons increased from 14 to 21 (+50%); cleanup and reduced-motion behavior remain in place.
- Browser assertions passed for matching pulley/cord centers and cord-end/tassel-top, full-surface flips, down/up dragging, short and wrong-direction pulls, no accidental flip/double toggle, 21 particles, keyboard/Escape, real mobile touch dragging, no horizontal overflow and dragging after Swup navigation.
- Latest Astro check: 173 files, 0 errors, warnings or hints. Biome controller check and git diff --check passed.
- Drag interaction references reviewed: https://motion.dev/docs/drag and https://interactjs.io/docs/ . The small native controller adds no dependency.

## 2026-10-21 expanded ribbon burst

- User requested exactly 64 ribbons, more colors, a wider outward and more scattered burst. Replaced the previous 21 blue/yellow particles with 64 ribbons in ten colors; frame and curtain artwork remain unchanged.
- Emit around a full circle with varied distances, sizes, rotation and flutter, followed by gravity and a fade. A fixed, non-interactive viewport layer lets ribbons leave the frame without introducing horizontal page overflow.
- Browser checks: 64 particles, ten colors, particles visibly outside the frame, natural completion cleanup, immediate cleanup on closing/flipping, rapid toggling, keyboard activation, real mobile touch pulling, no horizontal overflow at 390px, and no burst with reduced motion. No browser script errors.
- Visual evidence: `artifacts/royal-confetti-64.png` and `artifacts/royal-confetti-64-mobile.png`.
