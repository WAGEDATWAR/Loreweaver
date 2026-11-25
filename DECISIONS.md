# Decisions

Locked choices and provisional answers, so design and code stay in sync. A guess is recorded only when
cheap to reverse.

**Status legend:** `locked` (not reversed without a new decision) -> `provisional` (cheap to reverse) ->
`open`.

**Series:** G = governance (product intent), A = architecture, E = editor, I = interop, P = persistence,
C = context, U = surface.

---

## Product (G-series)

| # | Decision | Status |
|---|---|---|
| G-1 | **The canonical schema is the hub.** Every frontend format is an isolated adapter at the rim. | locked |
| G-2 | **Local-first, static hosting, no backend.** The browser is the database. | locked |
| G-3 | **`textContent` only.** A lint rule forbids `innerHTML`, `insertAdjacentHTML` and `document.write`. | locked |
| G-4 | **No runtime dependencies.** Dev dependencies are `axe-core` and `gpt-tokenizer` only. | locked |
| G-5 | **An adapter round-trips its fixture unknown-fields-intact or it does not ship.** | locked |
| G-6 | **Every destructive path is confirmation-gated**, and every import is backup-gated. | locked |
| G-7 | **Dark default, light opt-in.** A full light token set ships behind a persisted toggle (DEF-031); both themes pass the contrast gate (DEF-112). | locked |
| G-8 | **Vanilla modules, no framework, no build step.** A framework migration is not a goal. | locked |
| G-9 | **The product is Loreweaver.** The former name Lorebook Studio stays as the legacy namespace. | locked |
| G-10 | **Pre-1.0 semver, changelog per release, `vX.Y.Z` tags.** | locked |
| G-11 | **The editor captures settings; it does not emulate activation at runtime.** | locked |
| G-12 | **No account, cloud sync, telemetry or collaboration in v1.** | locked |
| G-13 | **Content-agnostic.** No explicitness policy; an entry carries what it carries. | locked |
| G-14 | **The standalone tool is the first and only v1 target.** A reusable component is a separate repository, extracted **after** v1 ships. No ask from a consumer delays a standalone phase. | locked |
| G-15 | **The pure core is the extraction seam.** `schema`, `books`, `validation`, `overview`, `keys`, `simulation`, `search`, `diff`, `merge`, `integrity` and `windowing` stay DOM-, storage- and `main.js`-free (A-1) so the component can lift them without a rewrite. Extraction never required a second source of truth. | locked |
| G-16 | **A character card is a first-class record, not a lorebook variant.** A card is a sibling record to a book and may own or link one. Card support lands before v1; card art editing stays a non-goal. | locked |

## Architecture (A-series)

| # | Decision | Status |
|---|---|---|
| A-1 | **Pure core.** `schema`, `books`, `validation`, `overview`, `keys`, `simulation`, `search`, `diff`, `merge`, `integrity` never import the DOM or storage (see `docs/ARCHITECTURE.md` 4). | locked |
| A-2 | **The UI never holds state.** It renders the store projection; a formula in a renderer is a bug. | locked |
| A-3 | **Native JSON container for project backups**; frontend adapters for single-book exchange. | locked |
| A-4 | **Single-book export is the primary flow**; a full project export is a backup. | locked |
| A-5 | **Internal ids are stable and opaque**; `entry_`/`book_` prefixes, never reused. | locked |
| A-6 | **Frontend quirks belong in adapters**, never in the canonical model. | locked |
| A-7 | **SillyTavern World Info v2 is the primary v1 export target.** It sorts first, is marked primary, and carries the most complete round-trip. | locked |
| A-8 | **A card container is an adapter, not a model change.** PNG text chunks and CHARX live at the rim; the card record and its book stay canonical. | locked |
| A-9 | **Cards get the same care as books**: store-owned mutations with undo, pure validation and token reports, and an autosaving editor page like a lorebook's. | locked |
| A-10 | **One writer tab.** A cross-tab guard pauses saving in a tab another tab has outdated and asks the user; it never overwrites silently. | locked |

## Editor (E-series)

| # | Decision | Status |
|---|---|---|
| E-1 | **Keys are chips, not comma strings.** Enter/comma adds, paste splits, Backspace removes. | locked |
| E-2 | **A slash-delimited key is a regex** and validates with a plain-text fallback. | locked |
| E-3 | **Duplication never reuses a source id or source UID.** | locked |
| E-4 | **Book split and merge preserve entry count**; merge remaps colliding ids and source UIDs. | locked |
| E-5 | **Undo/redo is bounded and session-only** (DEF-006). | provisional |
| E-6 | **A search or filter that hides the active entry pins it as a "Current" card.** | locked |
| E-7 | **Drag reordering is manual-order only**, because a filtered subset is ambiguous. | provisional |

## Interop (I-series)

| # | Decision | Status |
|---|---|---|
| I-1 | **Detection returns a confidence score; highest wins, adapter order breaks ties.** | locked |
| I-2 | **Unknown fields are preserved per source format** and restored only to that format. | locked |
| I-3 | **Import limits are 25 MB, 1000 lorebooks, 50,000 entries**, checked before parsing. | locked |
| I-4 | **The native adapter accepts both `loreweaver` and `lorebook-studio` app ids.** | locked |
| I-5 | **Exported UIDs are collision-free**, retaining numeric source ids when possible. | locked |
| I-6 | **Duplicate source UIDs are remapped on import.** | locked |
| I-7 | **Import strategies are replace, append-by-name and merge-by-title**, previewed as a diff. | locked |
| I-8 | **A PNG card writes both `ccv3` (V3) and `chara` (V2)**, and V3 is the default JSON export; V2 export warns about the V3-only fields it drops. | locked |
| I-9 | **A card's `data.extensions` and unknown keys are preserved verbatim**, and an embedded book is serialized by the shared character-book adapter, never a private snapshot. | locked |

## Persistence (P-series)

| # | Decision | Status |
|---|---|---|
| P-1 | **IndexedDB primary, localStorage fallback**, async behind a serialized write queue. | locked |
| P-2 | **Schema migrations are append-only**; a released migration is never edited. | locked |
| P-3 | **Storage keys and the IndexedDB name use the `loreweaver` namespace**, with a one-time
migration of the `lorebook-studio` namespace on load. | locked |
| P-4 | **Autosave with explicit status**, never manual-save-only. | locked |
| P-5 | **Pre-import backups use the native container** and stay restorable. | locked |
| P-6 | **Revisions cap at 12 snapshots and a 1.5M-character budget**, deduplicated by signature. | locked |
| P-7 | **A restore snapshots the current state first**, so it is undoable. | locked |
| P-8 | **A failed revision write removes its own partial payload.** | locked |
| P-9 | **The data-integrity dialog can repair** duplicates, dangling refs and orphaned payloads. | locked |

## Context (C-series)

| # | Decision | Status |
|---|---|---|
| C-1 | **Token counts use a real vendored BPE encoder in a worker**, not a character estimate. | locked |
| C-2 | **The `ceil(chars / 4)` estimate is only a fallback**, prefixed `~`. | locked |
| C-3 | **Both encoders are validated against `gpt-tokenizer` in tests.** | locked |
| C-4 | **The simulation shares matching rules with validation**; a change updates both and both tests. | locked |
| C-5 | **The simulation is a preview**, not a runtime; recursion and groups stay consumer-side. | locked |
| C-6 | **A per-book token budget drives a visible over-budget warning.** | locked |
| C-7 | **A card's tokens are reported by when a frontend sends them**: always-sent (description, personality, scenario, prompts, depth prompt), examples, opening. Always-sent text over 1,500 tokens warns. | provisional |

## Surface (U-series)

| # | Decision | Status |
|---|---|---|
| U-1 | **Dark tokens with AA contrast at intended size.** | locked |
| U-2 | **Native `<dialog>` for every dialog**, giving focus containment for free. | locked |
| U-3 | **Every new dialog joins `e2e/a11y.mjs` in the same change.** | locked |
| U-4 | **The library auto-fits 200-460 px and collapses to a 50 px rail**; width persists. | locked |
| U-5 | **`prefers-reduced-motion` disables animation.** | locked |
| U-6 | **Icon-only buttons carry `aria-label` and `title`.** | locked |
| U-7 | **Two modes, two menus.** Hub pages (Library, Data, Settings) have no side menu and are reached from the brand's app menu; editor routes show an editor menu that carries only that project's pages and tools, collapsible to a 54 px rail (an overlay on phones). | locked |
| U-8 | **Routes are the location hash** (`#/library`, `#/data`, `#/settings`, `#/book/<id>`, `#/book/<id>/settings`, `#/card/<id>`), owned by `src/views.js`; the hash is the only view state. Hub pages have `Alt+1`-`Alt+3`; every page and project has a palette command. | locked |
| U-9 | **The entries sidebar holds only entry navigation.** Lorebook settings live on their own editor page; backup, storage and import/export live on the Data page; creating, finding, duplicating and deleting projects lives on the Library. | locked |
| U-13 | **Overview, Simulate and Issues are pages of a lorebook** (`#/book/<id>/overview`, `/simulate`, `/issues`), reached from the editor menu and the palette. History stays a dialog because it is project-wide and opens from every page. | locked |
| U-12 | **The Library is the home page and a hub of projects.** A project is a lorebook or a character card; both appear as one kind of tile and open their own editor. The app still holds one saved workspace (G-12 keeps accounts and sync out of v1). | locked |
| U-11 | **Cards and lorebooks are presented with the same care.** The redesign builds both from one page anatomy and component set, and the review's parity matrix is the checklist. | locked |
| U-10 | **A UI evaluation and redesign precedes v1** (DEF-125, DEF-126); it may change layout and style but not the model, adapters or pure core. | provisional |


