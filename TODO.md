# Loreweaver - Live Status

**P0-P4 are done; the editor, every format, the context tools and the scale work run.** The charter is
`docs/LOREWEAVER.md`; this file is reality.

---

## Where we are

Loreweaver is a local-first lorebook editor. The canonical schema, the adapter layer, local recovery and
the real tokenizer are built and gated, and the app boots, imports, edits and exports.

**Next:** P5 release - onboarding polish, themes, the guide, the icon set, deployment, the Windows
story, multi-book weights and signed release builds.

**The plan is standalone first.** v1 is the standalone tool. A reusable component is a **new repository
extracted after v1** (G-14); the post-v1 phase P6 owns it and no consumer ask moves a v1 gate. The pure
core stays DOM-, storage- and `main.js`-free so P6 stays a lift, not a rewrite (G-15).

**Storage is local only** (P-1, P-3): IndexedDB primary, `localStorage` fallback, a one-time migration
from the pre-rename `lorebook-studio` namespace. Keys never leave the device.

## Phases

Planned in `docs/LOREWEAVER.md` 7. Each gate is measured; a regression blocks the next phase.

- [x] **P0 - Foundation.** Shell, design system, canonical schema, persistence, native CRUD, responsive
      layout, sample project. Gate: the app loads with no build step and native export re-imports.
- [x] **P1 - Authoring depth.** Duplication, ordering, multi-select, undo, templates, validation,
      filters, book actions, pinned current entry. Gate: a 100-entry book is maintainable from the
      keyboard.
- [x] **P2 - Interoperability.** Adapter contract, SillyTavern World Info v2, Chub, character books,
      preview, merge, pre-import backup, round-trip fixtures. Gate: every adapter round-trips its fixture
      with unknown fields intact.
- [x] **P3 - Context intelligence.** Real cl100k/o200k tokenizer, budget, collision and coverage
      detection, simulation, regex keys. Gate: token counts match `gpt-tokenizer`; a book warns before
      it overruns budget.
- [x] **P4 - Scale and durability.** IndexedDB retention, project files, export diff, token cache, bulk
      find/replace. Gate: a 2,000-entry book stays responsive and an accidental import is recoverable.
- [ ] **P5 - Release.** Themes, guide, icon set, beta, deployment. Gate: a new user creates and exports
      a first lorebook unaided. (DEF-057, DEF-060, DEF-064, DEF-067)
- [ ] **v1.** Standalone.
- [ ] **P6 - Component (post-v1, new repository, DEF-063).** Extract the pure core and a headless
      surface so a consumer can embed the editor. Gate: the extracted component passes the same unit and
      round-trip gates with no DOM imports in its core, and a consumer embeds it without forking.
      (DEF-058, DEF-059, DEF-061, DEF-062, DEF-063, DEF-065)

## Known gaps

- Character card containers and RisuAI are unsupported (DEF-012, DEF-014).
- No share-sheet wiring on Android yet; preview builds use the picker and downloads (DEF-066).
- Preview APKs are debug-signed only; a keystore and signed release build are owed (DEF-067).

## Recently landed

- P4 closed: virtualized list, three benchmark profiles, persisted undo, bulk find/replace, select-by-size,
  the activation graph, `.lwproj` files, lossy-export warnings and the no-FSA fallback (v0.8.0).
- Milestone preview APKs (`npm run apk`) and a mobile safe-area pass (v0.8.0).
- Virtualized entry list above 120 rows, a 2,000-entry scale benchmark (`npm run benchmark`, wired into
  CI) and its browser scenario (v0.7.4+).
- The product rename to Loreweaver, with a namespace migration and legacy-file import (v0.7.4+).
- Book duplicate, split and merge with id and source-UID remapping.
- The documentation set reshaped to the topic-owner standard.

