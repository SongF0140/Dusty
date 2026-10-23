# Newspaper companions and reading fixes

**Goal:** Add the supplied friend link, animate two seated frame companions on a four-second cycle, ease ropes with scroll direction, fix article fonts and mobile categories, and keep loading placeholders free of characters. Publish after verification.

**Design:** Keep the existing ink-and-paper palette and SVG character vocabulary. A chip and a bottle sit on the portrait's top rail; they chat, briefly lift off with surprised faces during the shake, then settle. Direction changes use a small angle with a slow transition, without scroll interception. Reduced-motion users see seated, still characters.

- [x] Commit Zaixi Personal Blog separately.
- [x] Correct font-family serialization and verify actual system-stack output.
- [x] Compact mobile category cards into a two-column index without changing desktop cards.
- [x] Add frame companions with a shared four-second clock and scrolling rope lean.
- [x] Hide body-mounted drawings and frame decorations throughout navigation/theme loading; restore after loading ends.
- [x] Run type checks, static build and browser checks for desktop/mobile, animation phases, scroll reversal, loading and reduced motion.
- [ ] Commit only this request's files, push, and confirm Vercel Ready.

**Isolation:** Preserve existing uncommitted reading guide, theme, TOC and transition work; do not stage those files. Loading suppression belongs in its own decoration stylesheet.

**Validation:** Astro check: 217 files, zero errors/warnings, one existing keyCode deprecation hint. Astro build: 147 pages. Three unit tests pass (font lists, quoted names, overlapping skeleton reasons). Browser checks cover actual article system font and preserved heading lettering; 320/390/640px two-column category layout; both SVG characters' seated/airborne/landed positions and facial changes; four-second synchronization; eased scroll reversal; all 15 existing margin actors; hiding and restoration during skeleton/navigation/theme states; portrait flip; reduced motion. Screenshots and browser runner are retained under ignored artifacts/.
