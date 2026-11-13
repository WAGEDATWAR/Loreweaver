# Changelog

All notable changes to Loreweaver are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to the version in `package.json`.

## [Unreleased]

### Changed

- **One interchange model, shared with Synthesis (Y-17).** The canonical entry/book model and the
  SillyTavern, Chub, character-book and interchange adapters now live once in `src/content-format/`;
  `src/formats/*` adapt them to a project. Synthesis vendors the same modules, so a lorebook authored
  in either app opens in the other. Fixed: an entry's `title` was ignored when no `name`/`comment` was
  present (the first key became the title), and canonical `secondaryKeys` did not read back on a
  round trip.
- New export target: **Interchange lorebook** (the canonical file any frontend can read).

### Added

- `docs/CARDS.md` and `docs/reference/LEGACY-BACKLOG.md`. The retired `Lorebook Tool` backlog is audited
  item by item and every open entry either ships, gains a ledger row, or is folded.
- Character cards as a first-class P5 workstream: decisions G-16 (a card is a record) and A-8 (a
  container is an adapter), plus ledger series K (DEF-084 to DEF-091).
- Ledger series O (pinned/recent entries, regex search) and N (fine polish), and DEF-106 to DEF-116.
- `TODO.md` restructured into phase-tagged area sections with an ordered Next Up slice.
- A keyboard shortcuts reference dialog and a focus mode (`Ctrl+\\` collapses the sidebar) (DEF-034, DEF-035).
- Compact density and resizable text areas with remembered heights (DEF-032, DEF-033).
- A schema reference dialog generated from the canonical model and held to it by a test, plus a
  print/PDF view of the active lorebook from the command palette (DEF-106, DEF-107).
- RisuAI lorebook export, editable advanced SillyTavern/Chub fields (depth, role, groups, recursion,
  sticky, cooldown, scan depth) through the Advanced section, configurable new-entry defaults, and
  per-entry colour labels (DEF-014, DEF-015, DEF-108, DEF-113).
- Drag-and-drop import with a drop overlay, plus an import audit log (the last ten imports, with format,
  counts and warnings) shown in the About panel (DEF-019, DEF-111).
- A light theme with a persisted toggle plus `npm run contrast` as a two-theme WCAG AA gate in CI (DEF-031, DEF-112).
- Organization and authoring depth: user-pinned entries (`Alt+P`), a recent-entries list, a regex search
  mode on both search inputs, and custom templates that persist on the project with save and delete
  (DEF-004, DEF-092 to DEF-094). DEF-003 is dropped as a duplicate of the existing Lorebook info section.
- A light theme with a persisted toggle, plus `npm run contrast` as a two-theme WCAG AA gate in CI (DEF-031, DEF-112).
- P5 authoring polish: per-entry token and character limits with validation, entry links `[[Title]]` with
  broken-link detection, a Suggest keys button, bulk tag add/remove, an inject-peek dialog, `Ctrl+D`
  duplicate, `Ctrl+Enter` simulation, a Copy entry command, `aria-keyshortcuts`, and reset-filters and
  clear-search actions in the empty list state (DEF-005, DEF-007 to DEF-009, DEF-037, DEF-096 to DEF-103,
  DEF-109, DEF-114 to DEF-116).
- The mobile library drawer and CSS hover/focus hint popups for long field explanations (DEF-030, DEF-036).
- PWA support: a web manifest with maskable icons and a cache-first service worker that precaches the
  shell, so the app installs and opens offline (DEF-041). Deployment automation: `deploy.yml` runs the
  gates on `v*` tags and publishes the `www/` bundle to GitHub Pages (DEF-042).

## [0.8.0] - 2026-11-08

Mobile preview builds, bulk authoring tools and the completed scale phase.

**Milestone preview APK:** `android/dist/loreweaver-preview_debug_20261108-032416_375066a.apk`
(build 26, version 0.8.0).

### Added

- A virtualized entry list above 120 rows: only the visible window plus an overscan renders, with a
  pure `src/windowing.js` module and `test/windowing.test.js`. Focus, keyboard navigation and reordering
  still work across the full list.
- `npm run benchmark` now runs 2,000-entry, 500,000-character and 5,000-entry profiles against budgets,
  wired into CI, plus browser scenarios for the 2,000-entry window.
- Bulk find and replace (`Ctrl+H`) with field targets, a match preview through the diff dialog, and undo.
- Select-by-token-size dialog feeding the bulk bar, with the bulk size summary.
- A ranked activation graph, legend and inactive rows in the context simulation.
- Undo and redo history that survives a reload, bounded to 20 steps in `src/history.js`.
- A session summary banner listing what changed since the last session.
- `.lwproj` project files; `.json` projects still import.
- Lossy-export warnings for tags and author notes, confirmed before an interchange export downloads.
- A milestone preview APK pipeline (`npm run apk`, `docs/MOBILE-PREVIEW.md`), a share-targeted bundle
  script and a mobile safe-area pass.
- A lorebook actions dialog to duplicate, split, and merge lorebooks, with id and source-UID remapping on merge.
- `AGENTS.md`, `DOCUMENTATION-INDEX.md`, `DECISIONS.md`, and `DEFERRALS.md`, plus owned topic docs under `docs/` (`LOREWEAVER`, `ARCHITECTURE`, `EDITOR`, `INTEROP`, `PERSISTENCE`, `CONTEXT`, `UI`) and reference notes under `docs/reference/`.
- `npm run deferrals` (ledger check) and `npm run deferral-scan` (prose check), with the ledger gate wired into CI.

### Changed

- Token counts are cached by content in a bounded LRU (`src/tokenCache.js`) and survive re-renders.
- SillyTavern World Info v2 is the primary export target and sorts first in the export dialog.
- Validation issues focus the offending field, not only the entry.
- Saving and opening fall back to a download and the file picker without File System Access.
- Renamed the product from Lorebook Studio to Loreweaver across the UI, docs, package metadata, and export filenames. Stored projects, backups, revisions, UI preferences, and IndexedDB data migrate from the old `lorebook-studio` namespace on load, and legacy native files still import.
- Reshaped `PLAN.md` to workflow and gate discipline; the charter, architecture, and topic detail moved into their owning docs.
- Reorganized `TODO.md` around phases with gates and a deferral cross-reference.

## [0.7.4] - 2026-10-22

### Added

- Configurable tokenizer presets (cl100k_base and o200k_base) with a token settings dialog, plus context window presets used for context-window usage in the overview and simulation.

## [0.7.3] - 2026-10-22

### Added

- Global search across all lorebooks (`Ctrl/Cmd+Shift+F`), grouped by lorebook with a jump to the matching entry.
- A QoL and Polish backlog section in `TODO.md`.

## [0.7.2] - 2026-10-22

### Added

- Clickable validation category counts that filter the issue list by type.
- A data-integrity check and repair tool for duplicate IDs, duplicate source UIDs, dangling references, and missing or orphaned snapshot data.

## [0.7.1] - 2026-10-22

### Added

- An append-only schema migration framework that upgrades stored and imported projects to the current schema version on load, and warns about projects from a newer version.
- A first-run onboarding dialog plus a "Sample" badge that resets to the sample project or starts an empty one.

## [0.7.0] - 2026-10-22

### Added

- A context simulation view that previews which entries activate for pasted context, in insertion order, with matched keys, per-entry tokens, the combined injected text, and the reasons inactive entries stayed inactive.

## [0.6.2] - 2026-10-22

### Added

- Real cl100k_base tokenizer running in a web worker, replacing the `chars / 4` estimate for entry, book, and overview token counts, with an estimate fallback before the worker is ready.
- A per-book token budget with over-budget warnings in the lorebook-information section and the overview.

## [0.6.1] - 2026-10-22

### Added

- A repeatable axe-core accessibility audit (`npm run a11y`) covering the workspace and every dialog, wired into CI.

### Fixed

- Accessibility: removed invalid `list` roles from key and tag chip containers, gave the page a level-one heading, and corrected the Issues button accessible name.

## [0.6.0] - 2026-10-22

### Added

- Command palette (`Ctrl/Cmd+K`) for entry, book, sort, filter, layout, file, and help actions.
- About panel with the app version, supported formats, local storage usage, and a local-first privacy statement.
- Getting-started guide dialog and `docs/getting-started.md`.
- An `app-version` meta tag in `index.html`, verified by `release:check`.

## [0.5.9] - 2026-10-22

### Added

- Standalone character-book export alongside the native, SillyTavern, and Chub targets.
- Import size and schema limits (25 MB, 1000 lorebooks, 50,000 entries) with clear rejection messages.

### Changed

- A lint rule now forbids `innerHTML`, `insertAdjacentHTML`, and `document.write` in source, guaranteeing imported data is rendered as text.
- Reorganized `TODO.md`: `Next Up` now tracks only active work with effort values, finished items are archived into topic sections, and a Suggestions section was added.

## [0.5.8] - 2026-10-22

### Added

- File System Access API support for opening and saving project files, with topbar Open/Save controls and `Ctrl+O`/`Ctrl+Shift+S`.
- A periodic backup reminder with an export shortcut and a three-day snooze.
- Storage usage reporting in the export dialog.

### Fixed

- The IndexedDB migration no longer clears unrelated `lorebook-studio:*` localStorage keys, so UI preferences, layout, and backup timestamps survive reloads.

## [0.5.7] - 2026-10-22

### Added

- Tags for entries and lorebooks, edited as chips, shown as card badges, and filterable from the sidebar.
- Search match highlighting plus a per-card note explaining which fields matched.
- A pinned "Current" card that keeps the active entry visible when search or filters hide it.

## [0.5.6] - 2026-10-22

### Added

- Editable key chips for trigger and secondary keys, with paste support, Backspace removal, and double-click editing.
- Regex-key support with editor highlighting, validation, and a plain-text fallback for invalid patterns.
- Bulk insertion-order controls for selected entries.

## [0.5.5] - 2026-10-22

### Changed

- Moved project, backup, and revision persistence to IndexedDB with a one-time migration from localStorage and a localStorage fallback.

## [0.5.4] - 2026-10-22

### Added

- Entry-list keyboard navigation with arrow keys, Home, End, and Enter/Space.
- Focus restoration after entry/book deletion and dialog dismissal, plus scroll and focus preservation across re-renders.
- A storage-failure banner with export and retry actions.
- A beforeunload warning and unsaved-state tracking when local saves fail.

## [0.5.3] - 2026-10-22

### Added

- Committed browser end-to-end test harness with Chrome DevTools Protocol and a CI job.
- Dependency-free syntax, lint, and format scripts.
- Release/versioning convention and changelog.
- Sidebar filters for enabled, disabled, always-on, and missing-key entries.
- Key collision detection and unreachable enabled-entry detection in the validation panel.

## [0.5.2] - 2026-10-22

### Added

- Reusable project, book, entry, and line diff engine.
- Diff review dialog for imports and revision snapshots.
- Import merge strategies: replace, append to matching lorebooks, and merge by title.
- Live import strategy selector with diff, message, and confirm-label updates.
- Inline revision delta chips and per-snapshot comparison.

### Changed

- Import preview now reviews the resulting project state before applying it.
- Revision history compares each snapshot against the previous one.

## [0.5.0] - 2026-10-22

### Added

- SillyTavern World Info v2 and Chub lorebook import/export with lossless unknown-field preservation.
- `lorebook_v3` character-book import.
- Collision-free UID allocation on export and duplicate source-UID remapping on import.
- Import preview with warnings and an automatic pre-import backup.
- Book descriptions, validation panel, and overview metrics.
- Local revision history with manual and automatic snapshots.
- Undo/redo, duplication, multi-select, bulk actions, and drag/keyboard reordering.
- Library sidebar resize, collapse, and persisted layout.
- GitHub Actions CI running syntax checks and unit tests.

## [0.4.0] - 2026-10-22

### Added

- Canonical project, book, and entry schema.
- Native project import/export, single-book export, and pre-import backups.
- Search, autosave, sample project, and the dark application shell.












