# Loreweaver - Live Status

**P0-P3 are done; the editor, every format and the context tools run.** The charter is
`docs/LOREWEAVER.md`; this file is reality.

---

## Where we are

Loreweaver is a local-first lorebook editor. The canonical schema, the adapter layer, local recovery and
the real tokenizer are built and gated, and the app boots, imports, edits and exports.

**Next:** P4 scale and durability - the large-book benchmark and virtualization, token cache, bulk
find/replace, and undo across reload.

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
- [ ] **P4 - Scale and durability.** IndexedDB retention, project files, virtualization, export diff,
      token cache, bulk find/replace. Gate: a 2,000-entry book stays responsive and an accidental import
      is recoverable. (DEF-001, DEF-006, DEF-016, DEF-018, DEF-020 to DEF-025, DEF-044, DEF-050)
- [ ] **P5 - Release.** Themes, guide, icon set, beta, deployment. Gate: a new user creates and exports
      a first lorebook unaided.
- [ ] **v1.** Standalone.

## Known gaps

- No virtualization or 2,000-entry benchmark (DEF-023).
- Character card containers and RisuAI are unsupported (DEF-012, DEF-014).
- Undo does not survive reload (DEF-006).
- The rename is complete; the remote repository still carries the old name.

## Recently landed

- The product rename to Loreweaver, with a namespace migration and legacy-file import (v0.7.4+).
- Book duplicate, split and merge with id and source-UID remapping.
- The documentation set reshaped to the topic-owner standard.
