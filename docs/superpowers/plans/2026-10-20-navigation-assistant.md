# Navigation assistant implementation plan

> Execute inline in this session using the confirmed design. User approved implementation on 2026-10-20.

**Goal:** Add the angel shell / devil Haiwenxiang workspace to the existing navigation drawer.

**Architecture:** Keep the shell DOM and controller intact inside a tab panel. A small workspace controller switches accessible panels; an independent custom element owns the assistant draft and local conversation storage. No network adapter is enabled.

**Tech Stack:** Astro, browser TypeScript, CSS, Node test runner.

## Constraints

Preserve unrelated working-tree edits. No added dependency, model API, fabricated reply, floating character or image. Preserve the existing terminal. Browser storage must fail safely. Current design is recorded in `../specs/2026-10-20-navigation-assistant-design.md`.

## Task 1: Browser state contract

- [x] Create `src/utils/navigation-assistant-state.test.mjs`: check default mode, valid transcript/draft round trip, malformed data, size limits, blocked storage, and clear without touching unrelated keys.
- [x] Run `node --test --test-isolation=none src/utils/navigation-assistant-state.test.mjs` and observe failure before implementation.
- [x] Create `src/utils/navigation-assistant-state.ts`: `readNavigationMode(storage)`, `saveNavigationMode(storage, mode)`, `loadAssistantState(storage)`, `saveAssistantState(storage, state)`, `clearAssistantState(storage)`; `NavigationMode = 'terminal' | 'assistant'`; `AssistantState = {version: 1, draft: string, messages: {id: string, role: 'user' | 'assistant', content: string}[]}`. Default to terminal and an empty transcript. Cap drafts/messages at 12,000 characters and transcripts at 100 messages; validate before rendering.
- [x] Re-run state tests.

## Task 2: Accessible dual workspace

- [x] Modify `src/components/common/TerminalCompanions.astro`: turn existing icons into labelled tabs with stable IDs, controls and keyboard focus state.
- [x] Add `src/components/features/NavigationAssistant.astro`: empty view, transcript region, editable draft, disabled send, local-save status, clear confirmation. Use textContent for restored messages. Custom-element connect/disconnect owns storage listeners.
- [x] Add `src/scripts/navigation-workspace.ts`: switch panels using `hidden`, update `aria-selected`, roving tabindex, title and mode, save selection, expose active-input focus for drawer opening. Arrow/Home/End keys select tabs without destroying either panel.
- [x] Modify `src/components/features/CommandNavigation.astro`: wrap existing shell in a labelled panel, mount assistant, initialize workspace and focus active input on open. Preserve shell execution and Swup handling.
- [x] Add `src/styles/navigation-assistant.css`: scoped marine palette, restrained wave mark, independent panel scrolling, viewport fit and reduced-motion behavior. Keep hidden panels hidden despite global display rules.

## Task 3: Validation

- [x] Run state tests with existing shell/command-navigation tests.
- [x] Run Astro check directly, avoiding content-sync mutations outside this change.
- [x] Start the local server and verify shell → assistant → shell state preservation, draft persistence on reload, clear/cancel, keyboard tabs, close/Esc, Swup, mobile and reduced motion. Capture desktop/mobile evidence if browser runtime is available.
- [x] Review diff for unrelated edits, unexpected endpoints, unsafe HTML and broken layout. Report actual verification and any limits; do not push without a user request.

## Completed verification

- State tests first failed before implementation, then passed. Combined assistant, shell and navigation suite: 14 passed.
- Astro check: 170 files, zero errors, warnings or hints. Biome: three state/controller files clean.
- Production build: 147 pages, completed successfully.
- Browser: mode and shell history retention, draft reload, clear/cancel/Esc, keyboard tabs and completion, Swup navigation, theme switching, reduced motion, mobile and short viewport, malformed/blocked storage all checked.
- Fixed floating page controls overlapping the drawer; final desktop and mobile screenshots saved under ignored artifacts/.
- No PI/RAG request, fabricated answer, dependency or floating character added. Changes remain local; no push performed.
