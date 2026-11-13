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

**Next:** P5 release. The authoring, interop, card and surface work has landed; what remains is polish,
merge and encryption depth, accessibility, and distribution (icons, signed APK, beta).

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
- [~] **P5 - Release.** Character cards, onboarding, themes, guide, icon set, beta, deployment. Gate: a
      new user creates and exports a first lorebook unaided, and a card round-trips. (DEF-002, DEF-010,
      DEF-017, DEF-038, DEF-040, DEF-043, DEF-051, DEF-052, DEF-057, DEF-060, DEF-064, DEF-067,
      DEF-095, DEF-104, DEF-105, DEF-110)
- [ ] **v1.** Standalone.
- [ ] **P6 - Component (post-v1, new repository, DEF-063).** Extract the pure core and a headless
      surface so a consumer can embed the editor. Gate: the extracted component passes the same unit and
      round-trip gates with no DOM imports in its core, and a consumer embeds it without forking.
      (DEF-058, DEF-059, DEF-061, DEF-062, DEF-063, DEF-065, DEF-066)

## Next Up

Ordered by value per effort; every open ledger row, nothing outside the current phase. Done items live in
`DEFERRALS.md` and Recently landed.

- [ ] `L` `P5` Hide field hints while a field has content (DEF-095).
- [ ] `L` `P5` A changelog link in the About panel (DEF-038).
- [ ] `L` `P5` Richer empty and search states, and loading/error states for async actions (DEF-002, DEF-104).
- [ ] `M` `P5` JSON/YAML plain export for scripting (DEF-017).
- [ ] `M` `P5` An optional UI-state block in project files (DEF-105).
- [ ] `M` `P5` Markdown preview, only if frontends read it consistently (DEF-110).
- [ ] `M` `P5` An app icon set and social preview assets (DEF-051).
- [ ] `M` `P5` Three-way merge over a common ancestor (DEF-057).
- [ ] `M` `P5` Multi-book attach with per-book weights (DEF-064).
- [ ] `M` `P5` Encrypted local projects (DEF-010).
- [ ] `M` `P5` A manual screen-reader pass on top of axe (DEF-043).
- [ ] `M` `P5` A signed release APK and keystore (DEF-067).
- [ ] `M` `P5` Decide the Windows build story (DEF-060).
- [ ] `M` `P5` A small beta with real SillyTavern and Chub users (DEF-052).
- [ ] `VH` `P5` TypeScript or JSDoc types if schema complexity grows (DEF-040).

## Housekeeping (found at the Claude Code handoff, 2026-11-12)

- [ ] `L` CHANGELOG: the light-theme/contrast line is listed twice under Unreleased; dedupe and cut 0.9.0.
- [ ] `L` CI: add `npm run deferral-scan` and `npm run release:check` steps (RELEASING.md lists both).
- [ ] `L` Delete stale scratch files in the repo root (`dbg-a*.mjs`, `a11y-out.txt`; gitignored, out of date).
- [ ] `M` `src/main.js` is ~5,500 lines and `index.html` ~1,200: split by surface into `src/ui/` modules
      without breaking one-writer (a layering decision first, in DECISIONS.md).
- [x] Service worker: stale cache-first and a fixed cache name; fixed (network-first, hashed cache, full precache).

## Review findings (deep review, 2026-11-12)

Raw findings from the Claude Code handoff review. Each needs a `DEFERRALS.md` row (or a fix) before its
phase can close; none is tracked there yet. Severity: **S1** data loss or broken core flow, **S2** real
defect or risk, **S3** improvement.

### Data safety and robustness
- [x] **S1** No multi-tab protection: two tabs on one project overwrite each other's saves (no
      `BroadcastChannel`, Web Lock or `storage` listener). Detect another live tab, warn, and go read-only
      or reload on its save.
- [x] **S1** `navigator.storage.persist()` is never requested; for a local-first app the browser may
      evict IndexedDB under storage pressure. Request it and surface the result in the storage panel.
- [ ] **S2** User regexes (trigger keys, regex search, bulk replace) run on the main thread; a
      catastrophic pattern such as `/(a+)+$/` can freeze the tab. Add a match budget or run in the worker.
- [ ] **S2** `zip.js` inflates with no output cap (zip bomb via CHARX or `zTXt`); the 32 MB limit applies
      to the input only. Cap the inflated size and entry count.
- [ ] **S3** Import limits are scattered (25 MB in `limits.js`, a hard-coded "25 MB" toast and an 8 MB
      avatar limit in `main.js`, 32 MB in `cardPng.js`); centralise in `limits.js`.

### UI and UX
- [ ] **S1** The entry list, the core navigation, is buried: at 1440x900 it starts at y=919 and is 16px
      tall, below the lorebook info, defaults, Overview/Simulate/Issues, cards, recent list, search and
      footer. A user must scroll the sidebar to find entries. Give the entry list the flexible height,
      collapse lorebook info/cards/recent into collapsible groups, and move Overview/Simulate/Issues to the
      header or a tool rail.
- [ ] **S2** The sidebar carries too many jobs (book picker, book meta, entry defaults, tools, cards,
      recent, search, filters, entries, create actions). Split into Library (books/cards) and Entries.
- [ ] **S2** The Export dialog mixes export formats, backup restore and storage diagnostics; storage and
      backup belong in a Data/Settings dialog. "Loreweaver book" vs "Interchange lorebook" vs "Character
      book" needs plain-language naming or grouping (primary / compatibility / advanced). Card export lives
      elsewhere; surface it.
- [ ] **S2** The About dialog doubles as a settings panel (theme, density, audit log, shortcuts, guide).
      Create a real Settings dialog and keep About for version and links.
- [ ] **S3** The collapsed "New-entry defaults" disclosure shows a bare triangle and an orphan label.
- [ ] **S3** The header has many icon-only buttons (palette, undo, redo, history); add visible labels or
      tooltips with shortcuts, and consider an overflow menu at narrow widths.
- [ ] **S3** The empty right details rail takes 50px when collapsed; default it hidden below 1280px.

### Code structure
- [ ] **S2** `src/main.js` is 5,462 lines with ~190 functions and ~270 `querySelector` calls; one
      121-line `handleImport`, a 100-line `renderSimulationResults`. Split by surface (import/export,
      cards, simulation, dialogs, shortcuts, drawer) into `src/ui/` or `src/controllers/`, with the
      `refs` map moved out. A DECISIONS.md entry first.
- [ ] **S2** `main.js` owns ~25 module-level mutable variables (timers, drag state, `editingCardId`,
      `tokenSettings`, `validationFilters`) against A-2 ("the UI never holds state"); move session UI state
      into a small `uiState` store.
- [ ] **S3** `integrity.js` imports `formats/helpers.js` although A-1 lets pure modules import only
      `utils.js`; move the helper to the pure core or amend A-1.
- [ ] **S3** `docs/ARCHITECTURE.md` still says cards are "Planned (P5)" and its module diagram omits
      about 35 modules (cards, content-format, tokenizer, windowing, templates, history...). Refresh it.
- [ ] **S3** `src/content-format/` is shared with Synthesis by copying; add a sync check (hash or
      version) so the two copies cannot drift.
- [ ] **S3** `styles.css` is 4,872 lines in one file; split by area (tokens, layout, dialogs, editor).

### Test and gate gaps
- [ ] **S3** E2E gates exist but there is no scenario for multi-tab, storage eviction, a zip bomb or a
      catastrophic regex; add them with the fixes above.
- [ ] **S3** The service worker has a scenario for registration but none for update flow (new version
      replaces the old cache) or offline reload; add both.

## Post-v1

- [ ] `M` Editors for world, regex scripts and V3 assets on cards (DEF-123).
- [ ] `VH` `post-v1` Opt-in cloud sync, only if private and simple (DEF-011).
- [ ] `M` Collect round-trip failures as fixtures (DEF-053).
- [ ] `M` Share-sheet import and export on Android (DEF-066).
- [ ] `H` P6 component (new repository): extract the pure core (DEF-063), headless API (DEF-061),
      embedding guide (DEF-062), descriptor registry (DEF-059), canon-ledger tab (DEF-058), run-level
      budget arbitration (DEF-065).

## Character cards (P5)

Cards are a first-class record (G-16); the container is an adapter (A-8). Record, PNG/CHARX/JSON
adapters, extraction, linking, the library, the full field set, token report, checks and V2/V3 export have
shipped (v0.8.0+). Open parity work: library search and filters (DEF-117), diff on re-import (DEF-118),
templates (DEF-119), a prompt-assembly preview (DEF-120), bulk operations (DEF-121), schema/print/search
coverage (DEF-122), extension editors (DEF-123) and a full-page workspace (DEF-124).

- [ ] `M` `P5` Card library search, tag filter and sort (DEF-117).
- [ ] `M` `P5` Card diff and merge on re-import, card revisions (DEF-118).
- [ ] `M` `P5` Card templates (DEF-119).
- [ ] `H` `P5` A prompt-assembly preview of card plus book (DEF-120).
- [ ] `M` `P5` Card bulk operations (DEF-121).
- [ ] `L` `P5` Cards in the schema page, print export and global search (DEF-122).
- [ ] `H` `P5` A full-page card workspace (DEF-124).

## Known gaps

- No share-sheet wiring on Android yet; preview builds use the picker and downloads (DEF-066).
- Preview APKs are debug-signed only; a keystore and signed release build are owed (DEF-067).

## Recently landed

- PWA support (manifest, maskable icons, cache-first service worker) and a GitHub Pages deploy workflow
  that runs the gates on `v*` tags (v0.8.0+).
- The mobile library drawer, hover hint popups, compact density and resizable text areas (v0.8.0+).
- A light theme with a persisted toggle and `npm run contrast`, a two-theme WCAG AA gate in CI (v0.8.0+).
- Organization pass: user-pinned entries (`Alt+P`), a recent-entries list, a regex search mode on both
  search inputs, and custom templates that persist on the project (v0.8.0+).
- P5 authoring polish: limits, entry links, suggested keys, bulk tags, inject-peek, shortcuts (v0.8.0+).
- Character cards end to end: record, PNG `ccv3` chunks, CHARX, detection and validation, book
  extraction and linking, the card library and editor, and card export with its book (v0.8.0+).
- P4 closed: virtualized list, three benchmark profiles, persisted undo, bulk find/replace, select-by-size,
  the activation graph, `.lwproj` files, lossy-export warnings and the no-FSA fallback (v0.8.0).
- Milestone preview APKs (`npm run apk`) and a mobile safe-area pass (v0.8.0).
- Virtualized entry list above 120 rows, a 2,000-entry scale benchmark (`npm run benchmark`, wired into
  CI) and its browser scenario (v0.7.4+).
- The product rename to Loreweaver, with a namespace migration and legacy-file import (v0.7.4+).
- Book duplicate, split and merge with id and source-UID remapping.
- The documentation set reshaped to the topic-owner standard.




