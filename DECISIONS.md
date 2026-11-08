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
| G-7 | **Dark-only v1.** A light theme waits until tokens and components are stable (DEF-031). | locked |
| G-8 | **Vanilla modules, no framework, no build step.** A framework migration is not a goal. | locked |
| G-9 | **The product is Loreweaver.** The former name Lorebook Studio stays as the legacy namespace. | locked |
| G-10 | **Pre-1.0 semver, changelog per release, `vX.Y.Z` tags.** | locked |
| G-11 | **The editor captures settings; it does not emulate activation at runtime.** | locked |
| G-12 | **No account, cloud sync, telemetry or collaboration in v1.** | locked |
| G-13 | **Content-agnostic.** No explicitness policy; an entry carries what it carries. | locked |

## Architecture (A-series)

| # | Decision | Status |
|---|---|---|
| A-1 | **Pure core.** `schema`, `books`, `validation`, `overview`, `keys`, `simulation`, `search`, `diff`, `merge`, `integrity` never import the DOM or storage (see `docs/ARCHITECTURE.md` 4). | locked |
| A-2 | **The UI never holds state.** It renders the store projection; a formula in a renderer is a bug. | locked |
| A-3 | **Native JSON container for project backups**; frontend adapters for single-book exchange. | locked |
| A-4 | **Single-book export is the primary flow**; a full project export is a backup. | locked |
| A-5 | **Internal ids are stable and opaque**; `entry_`/`book_` prefixes, never reused. | locked |
| A-6 | **Frontend quirks belong in adapters**, never in the canonical model. | locked |

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

## Surface (U-series)

| # | Decision | Status |
|---|---|---|
| U-1 | **Dark tokens with AA contrast at intended size.** | locked |
| U-2 | **Native `<dialog>` for every dialog**, giving focus containment for free. | locked |
| U-3 | **Every new dialog joins `e2e/a11y.mjs` in the same change.** | locked |
| U-4 | **The library auto-fits 200-460 px and collapses to a 50 px rail**; width persists. | locked |
| U-5 | **`prefers-reduced-motion` disables animation.** | locked |
| U-6 | **Icon-only buttons carry `aria-label` and `title`.** | locked |
