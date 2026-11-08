# Loreweaver - Live Status

**P0-P4 are done; the editor, every format, the context tools and the scale work run.** The charter is
`docs/LOREWEAVER.md`; this file is reality.

**How to read this file.** Status is `[ ]` open, `[~]` in progress, `[x]` done. Every open item carries
an effort (`L`, `M`, `H`, `VH`), its phase (`P4`-`P6`), and its `DEF-ID`; the ledger (`DEFERRALS.md`) is
authoritative for ownership and status. The area sections below are the full catalogue. **Next Up** is
the ordered slice of that catalogue to work top-down; a finished item is removed from Next Up and
reported under Recently landed with its revision.

---

## Where we are

Loreweaver is a local-first lorebook editor. The canonical schema, the adapter layer, local recovery and
the real tokenizer are built and gated, and the app boots, imports, edits and exports.

**Next:** P5 release. Character cards come first, then the surface and distribution work.

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
- [ ] **P5 - Release.** Character cards, onboarding, themes, guide, icon set, beta, deployment. Gate: a
      new user creates and exports a first lorebook unaided, and a card round-trips. (DEF-002 to
      DEF-014, DEF-019, DEF-030 to DEF-038, DEF-040 to DEF-043, DEF-051 to DEF-052, DEF-057, DEF-060,
      DEF-064, DEF-067, DEF-084 to DEF-116)
- [ ] **v1.** Standalone.
- [ ] **P6 - Component (post-v1, new repository, DEF-063).** Extract the pure core and a headless
      surface so a consumer can embed the editor. Gate: the extracted component passes the same unit and
      round-trip gates with no DOM imports in its core, and a consumer embeds it without forking.
      (DEF-058, DEF-059, DEF-061, DEF-062, DEF-063, DEF-065, DEF-066)

## Next Up

Ordered by value per effort. Nothing here is outside the current phase.

- [ ] `M` `P5` **Cards: the metadata record** — the hub the container adapters project onto (DEF-084).
- [ ] `H` `P5` **Cards: PNG text-chunk read/write** (DEF-085).
- [ ] `M` `P5` **Cards: extract an embedded book on import** (DEF-088).
- [ ] `M` `P5` **Cards: bind a book to a card and export together** (DEF-089).
- [ ] `H` `P5` **Cards: CHARX container** (DEF-086).
- [ ] `M` `P5` **Cards: V2/V3 detection and validation** (DEF-087).
- [ ] `M` `P5` **Cards: the card library and avatar preview** (DEF-090).
- [ ] `L` `P5` Card field parity checklist (DEF-091).
- [ ] `M` `P5` Entry links `[[Title]]` with broken-link validation (DEF-007).
- [ ] `L` `P5` Suggested trigger keys from title and content (DEF-008).
- [ ] `M` `P5` Per-entry token/word/character limits (DEF-005).
- [ ] `M` `P5` Bulk tag assignment for the selection (DEF-009).
- [ ] `M` `P5` An inject-peek preview for one entry (DEF-109).
- [ ] `L` `P5` A "Copy entry" action (DEF-101).
- [ ] `L` `P5` Ctrl/Cmd+D duplicates the active entry (DEF-103).
- [ ] `L` `P5` Ctrl/Cmd+Enter runs the simulation from its input (DEF-102).
- [ ] `L` `P5` A "Reset filters" action and a "Clear search" affordance (DEF-115, DEF-116).
- [ ] `L` `P5` Remember the last active entry per lorebook (DEF-114).

## Character cards (P5)

Cards are a first-class record (G-16); the container is an adapter (A-8). See `DEFERRALS.md` K.

- [ ] `M` `P5` The card metadata record: name, personality, scenario, greetings, examples, creator
      notes, tags, avatar (DEF-084).
- [ ] `H` `P5` Read and write PNG `tEXt`/`zTXt` card chunks (DEF-085).
- [ ] `M` `P5` Extract an embedded character book into a lorebook on import, previewed (DEF-088).
- [ ] `M` `P5` Bind a lorebook to a card and export both together (DEF-089).
- [ ] `H` `P5` Import and export the CHARX zip container (DEF-086).
- [ ] `M` `P5` Detect and validate card spec V2/V3, warning instead of guessing (DEF-087).
- [ ] `M` `P5` A card library with preview and avatar (DEF-090).
- [ ] `L` `P5` Extend the parity checklist to card fields (DEF-091).

## Editor and authoring

- [ ] `M` `P5` A lorebook properties dropdown: description, tags, budget (DEF-003).
- [ ] `M` `P5` Author custom templates and "duplicate as template" (DEF-004).
- [ ] `M` `P5` Per-entry colour labels for grouping (DEF-113).
- [ ] `M` `P5` Markdown preview, only if frontends read it consistently (DEF-110).
- [ ] `M` `P5` Configurable new-entry defaults: always on, selective, case, whole words (DEF-108).
- [ ] `L` `P5` Hide field hints while a field has content (DEF-095).
- [ ] `M` `P5` Loading and error states for every async action (DEF-104).
- [ ] `M` `P5` Richer empty and search states (DEF-002).

## Interoperability

- [ ] `M` `P5` JSON/YAML plain export for scripting (DEF-017).
- [ ] `L` `P5` Drag-and-drop file import onto the window (DEF-019).
- [ ] `L` `P5` An import audit log of format, warnings and skipped fields (DEF-111).
- [ ] `M` `P5` Editable advanced SillyTavern and Chub fields (DEF-015).
- [ ] `M` `P5` RisuAI-native export (DEF-014).
- [ ] `M` `P5` A schema reference page generated from the canonical model (DEF-106).
- [ ] `L` `P5` Print/PDF export for offline review passes (DEF-107).

## Organization and search

- [ ] `L` `P5` User-pinned entries per book (DEF-092).
- [ ] `L` `P5` A recent-entries list (DEF-093).
- [ ] `M` `P5` A regex search mode in the entry list (DEF-094).

## Data and persistence

- [ ] `M` `P5` Encrypted local projects (DEF-010).
- [ ] `M` `P5` An optional UI-state block in project files (DEF-105).
- [ ] `VH` `post-v1` Opt-in cloud sync, only if private and simple (DEF-011).

## UI, UX and accessibility

- [ ] `M` `P5` A mobile library drawer (DEF-030).
- [ ] `H` `P5` A light theme over stable tokens (DEF-031, G-7).
- [ ] `L` `P5` A pre-commit contrast check over the token set (DEF-112).
- [ ] `L` `P5` Density options for compact lists (DEF-032).
- [ ] `L` `P5` Resizable text areas with remembered heights (DEF-033).
- [ ] `L` `P5` A keyboard shortcuts reference dialog (DEF-034).
- [ ] `L` `P5` A focus mode that hides the sidebar (DEF-035).
- [ ] `L` `P5` Hover hint popups for long field explanations (DEF-036).
- [ ] `L` `P5` `aria-keyshortcuts` on shortcut buttons (DEF-037).
- [ ] `L` `P5` A changelog link in the About panel (DEF-038).
- [ ] `L` `P5` Truncate long lorebook names with a full-name tooltip (DEF-099).
- [ ] `L` `P5` Show the app version in the tab title (DEF-100).

## QoL and polish

- [ ] `L` `P5` Multi-select validation issue-type filters (DEF-096).
- [ ] `L` `P5` Hide the Repair button when the integrity check is clean (DEF-097).
- [ ] `L` `P5` Toast timing and duplicate-failure suppression (DEF-098).

## Engineering and QA

- [ ] `VH` `P5` TypeScript or JSDoc types if schema complexity grows (DEF-040).
- [ ] `M` `P5` Offline support as a PWA (DEF-041).
- [ ] `L` `P5` Deployment automation to a static host (DEF-042).
- [ ] `M` `P5` A manual screen-reader pass on top of axe (DEF-043).
- [ ] `M` `P5` Three-way merge over a common ancestor (DEF-057).
- [ ] `M` `P5` Decide the Windows build story (DEF-060).
- [ ] `M` `P5` Multi-book attach with per-book weights (DEF-064).
- [ ] `M` `P5` A signed release APK and keystore (DEF-067).

## Product and release

- [ ] `M` `P5` An app icon set and social preview assets (DEF-051).
- [ ] `M` `P5` A small beta with real SillyTavern and Chub users (DEF-052).
- [ ] `M` `post-v1` Collect round-trip failures as fixtures (DEF-053).

## Component (post-v1, new repository)

- [ ] `H` `post-v1` Extract the pure core into a new component repository (DEF-063).
- [ ] `M` `post-v1` A supported headless API surface (DEF-061).
- [ ] `L` `post-v1` An embedding and vendoring guide with the licence note (DEF-062).
- [ ] `H` `post-v1` A descriptor registry generating forms, validation and JSON Schema (DEF-059).
- [ ] `H` `post-v1` A canon-ledger facts tab and conflict report (DEF-058).
- [ ] `M` `post-v1` Run-level budget arbitration across attached books (DEF-065).
- [ ] `M` `post-v1` Share-sheet import and export on Android (DEF-066).

## Known gaps

- RisuAI-native export is unsupported (DEF-014).
- No share-sheet wiring on Android yet; preview builds use the picker and downloads (DEF-066).
- Preview APKs are debug-signed only; a keystore and signed release build are owed (DEF-067).

## Recently landed

- P5 opened with character cards as its first workstream (v0.8.0).
- P4 closed: virtualized list, three benchmark profiles, persisted undo, bulk find/replace, select-by-size,
  the activation graph, `.lwproj` files, lossy-export warnings and the no-FSA fallback (v0.8.0).
- Milestone preview APKs (`npm run apk`) and a mobile safe-area pass (v0.8.0).
- Virtualized entry list above 120 rows, a 2,000-entry scale benchmark (`npm run benchmark`, wired into
  CI) and its browser scenario (v0.7.4+).
- The product rename to Loreweaver, with a namespace migration and legacy-file import (v0.7.4+).
- Book duplicate, split and merge with id and source-UID remapping.
- The documentation set reshaped to the topic-owner standard.
