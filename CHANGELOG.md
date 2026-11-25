# Changelog

All notable changes to Loreweaver are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to the version in `package.json`.

## [Unreleased]

### Added

- Card extension editors: a "Frontend extensions" section on the card page edits the attached world name, favourite flag, regex scripts, V3 assets, source links and multilingual creator notes, keeps every field it does not show, and flags broken regex patterns and assets.
- Library thumbnails: lorebooks get a book glyph tinted by a stable colour from their name, and cards without art show their initial.

## [0.8.2] - 2026-11-25

### Fixed

- The GitHub Pages deploy now builds the bundle in one job and publishes it from another, which fixes the "no artifacts named github-pages" failure; it also reads workflow artifacts (`actions: read`). The deploy runs on `v*` tags and can be started by hand.
- Two CI-only test races: the editor-width check waits for the sidebar to settle after a resize, and the accessibility audit waits for toasts to finish fading in before it measures contrast.

## [0.8.1] - 2026-11-25

### Fixed

- The entries sidebar no longer squeezes the editor at mid widths: its maximum width now leaves at least 640 px of the window for the editor, so wide fonts cannot push the editor below a usable width at about 1024 px. This was caught by CI on the v0.8.0 push.

## [0.8.0] - 2026-11-25

Mobile preview builds, bulk authoring tools and the completed scale phase, plus the Library hub, character-card parity and the UI redesign.

**Earlier milestone preview APK (before the Library hub and UI redesign):** `android/dist/loreweaver-preview_debug_20261108-032416_375066a.apk`
(build 26, version 0.8.0).

### Added

- The Library has a Grid or List layout toggle; the choice is remembered in this browser.

- Cards in the schema reference (every card field), global search (the dialog is now "Search lorebooks and cards") and print (Print on the card page).

- Prompt preview on the card Review page: the assembled prompt for a card, its linked lorebook and a pasted chat excerpt, with tokens per part, the context window and the lorebook budget, and a copy button.

- Card history: a History dialog on the card page lists earlier versions from your snapshots, shows what differs, compares and restores one. Snapshots now also count cards.
- Card templates: three built-in starters and your own, from the Library, the card page and the palette; "Save this card as a template" keeps its text and settings.

- The command palette is scoped to the current page (entry commands on the entries page, lorebook commands on lorebook pages) and lists the five most recent commands first. Typing still searches everything.
- Settings now holds real controls: theme and density choices, and the tokenizer and context window selects, replacing the Token settings dialog.

- Re-importing a character card diffs it against the existing one and, by default, updates it in place instead of adding a duplicate. Cards now appear in the import review, the session summary and revision deltas.

- Library multi-select: pick lorebooks and cards, then add or remove a tag, export the selection as a project file, or delete them with one confirmation.
- A header File menu groups Open, Save, Import and Export; Open and Save still appear only where the browser supports them.

- A Review page for lorebooks and cards (`#/book/<id>/review`, `#/card/<id>/review`): size, checks that jump to the entry or field, and a simulation shortcut.

- Library: a tag filter and pinned projects (pins stay in this browser and lead every sort).

- The Library is now the home page and a hub of projects. Lorebooks and character cards appear as tiles
  with size, tags, linked lorebook and an issue count, with search, a kind filter and a sort, and open
  into their own editor. The left menu now exists only in the editor (Library link, project name,
  Entries, Lorebook settings and the Tools for a lorebook; section jump links for a card); the brand opens
  an app menu with Library, Data, Settings, the command palette, shortcuts and About. Routes are
  `#/library`, `#/book/<id>`, `#/book/<id>/settings`, `#/card/<id>`, `#/data` and `#/settings`, with
  `Alt+1`-`Alt+3` and palette commands to open any project. Decision U-12.
- Character cards have a full editor page that autosaves like a lorebook (DEF-124); a blank card is
  discarded when you leave it. Lorebook settings moved to their own page.

- A UI evaluation (DEF-125): `npm run ui:review` captures 24 states at four widths with layout metrics,
  `npm run ui:keyboard` walks focus and dialogs, and `docs/reference/ui-review/REVIEW.md` ranks 15
  findings and holds a lorebook and card parity matrix. New ledger rows DEF-128 to DEF-134; decision U-11.

- A navigation menu and pages. The logo and name in the header now open an expandable and collapsible
  menu (a 54 px rail when collapsed, an overlay on phones) that switches between Entries, Library, Data and
  Settings, with the Overview, Simulate, Issues, Search and Replace tools and About below. Pages are
  routed by the location hash and have `Alt+1`-`Alt+4` shortcuts and `Go to` palette commands.
- A Library page (lorebook list, active lorebook settings, entry defaults, character cards), a Data
  page (import, export, project files, backup and restore, storage and persistence, integrity, import
  log) and a Settings page (theme, density, tokenizer, shortcuts, schema reference, guide).
- The export dialog groups targets (Recommended, Other frontends, Loreweaver files, Character card); the
  About dialog links to the changelog (DEF-038).
- A UI evaluation and redesign on the roadmap before v1 (DEF-125, DEF-126, DEF-127; decision U-10).

- Character card parity with lorebooks: a full editor (description, nickname, alternate and group-only
  greetings, tags, depth prompt, talkativeness), a live token report split into always-sent, examples
  and opening, a card checks panel, duplicate, a discard-changes guard, image conversion to PNG, and
  export as PNG (V3 + V2 chunks), CHARX, JSON V3 or JSON V2 with loss warnings. Schema version 4
  upgrades stored cards. Decisions A-9, I-8, I-9 and C-7; deferrals DEF-117 to DEF-124.
- `docs/ARCHITECTURE.md` gains a full Character cards section and an updated module map.

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

- Overview, Simulate and Issues are now pages of a lorebook (`#/book/<id>/overview`, `/simulate`, `/issues`) instead of dialogs; the editor menu links to them. History stays a dialog.

- **One interchange model, shared with Synthesis (Y-17).** The canonical entry/book model and the
  SillyTavern, Chub, character-book and interchange adapters now live once in `src/content-format/`;
  `src/formats/*` adapt them to a project. Synthesis vendors the same modules, so a lorebook authored
  in either app opens in the other. Fixed: an entry's `title` was ignored when no `name`/`comment` was
  present (the first key became the title), and canonical `secondaryKeys` did not read back on a
  round trip.
- New export target: **Interchange lorebook** (the canonical file any frontend can read).

- Token counts are cached by content in a bounded LRU (`src/tokenCache.js`) and survive re-renders.
- SillyTavern World Info v2 is the primary export target and sorts first in the export dialog.
- Validation issues focus the offending field, not only the entry.
- Saving and opening fall back to a download and the file picker without File System Access.
- Renamed the product from Lorebook Studio to Loreweaver across the UI, docs, package metadata, and export filenames. Stored projects, backups, revisions, UI preferences, and IndexedDB data migrate from the old `lorebook-studio` namespace on load, and legacy native files still import.
- Reshaped `PLAN.md` to workflow and gate discipline; the charter, architecture, and topic detail moved into their owning docs.
- Reorganized `TODO.md` around phases with gates and a deferral cross-reference.

## [0.7.4] - 2026-10-22

### Fixed

- Responsive layout: below 1180 px the details panel is an overlay opened from a Details button, so the
  editor keeps its width, and on phones the entry list and the entry editor are separate full screens
  (DEF-128, DEF-129).

- UI foundation: text is no smaller than 12 px (11 px for uppercase micro-labels and count badges), touch
  targets are 44 px on phones and touch devices, focus rings are consistent, and the light theme now
  covers the details panel, chip inputs and diff views (DEF-130, DEF-131).

- The command palette interleaved entry commands with the page commands, a stray marker sat above the
  Recent list, and the card dialog's token panel overlapped its form on phones.

- The entry list was buried at the bottom of a scrolling sidebar and only 16 px tall at 1440x900; the
  sidebar now holds only entry navigation and the list takes the remaining height.
- `.btn-danger` text failed contrast in the light theme.

- Character cards: the V2/V3 `description` field was missing (it sat unseen in the unknown-fields bucket),
  a card's `data.extensions` (world, depth prompt, talkativeness, regex scripts) was dropped on import,
  an embedded lorebook was exported through a lossy private snapshot, a PNG card was written with only
  `ccv3`, and a V3 card with no first message or personality failed to import. All fixed with fixtures.
- Two tabs on one project no longer overwrite each other: a cross-tab guard pauses saving in a stale
  tab and offers Load latest or Keep this version. The app also requests persistent storage and shows
  the result in the storage panel.
- Service worker: network-first with a cache fallback (no more stale or mixed-version modules after a
  deploy), and `npm run bundle` stamps a content-hash cache name and precaches every shipped file so the
  first offline visit works and old caches are dropped.

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












