# Deferral Ledger

A single tracked home for everything deliberately put off. A deferral in prose with no owner and no
destination vanishes; this ledger gives every one an **id**, an **owner phase** and a **status**.

**Status legend:** `open` (owed) -> `scheduled` (a phase owns it; the normal state) -> `doing` -> `done` ->
`dropped` (with a reason).

**Rules:** any "later", "for now", "post-v1" or "deferred" in a doc adds or cites a row here in the same
change. A row has an owner or it is a bug. An owner phase cannot be called done while its rows are
`open`. A landed row is marked `done` with the revision; a dropped row says why. `npm run deferrals`
fails on a malformed or ownerless row; `npm run deferral-scan` reports prose deferrals with no id.

---

## E. Editor

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-001 | Bulk find and replace across entries with a preview diff | `replace.js` + dialog; preview reuses the diff engine, scoped to the selection | P4 | done |
| DEF-002 | Richer empty and search states | - | P5 | scheduled |
| DEF-003 | A lorebook properties dropdown holding description, tags and budget | folded: those fields already have one editing surface, the Lorebook info section; a second dropdown would be a duplicate owner | P5 | dropped |
| DEF-004 | Author custom templates and "duplicate as template" | templates persist on the project; save/delete from the template dialog | P5 | done |
| DEF-005 | Per-entry word/character/token limits | token and character limits with validation | P5 | done |
| DEF-006 | Undo history that survives reload | E-5; 20-step bounded history in `history.js` | P4 | done |
| DEF-007 | Entry links (`[[Title]]`) with broken-link validation | `entryLinks.js`, folded into validation | P5 | done |
| DEF-008 | Suggested trigger keys from title and content | `suggestKeys.js` with a Suggest keys button | P5 | done |
| DEF-009 | Bulk tag assignment for selected entries | bulk tag dialog, add and remove | P5 | done |
| DEF-108 | A configurable default for new-entry flags (always on, selective, case sensitive, whole words) | defaults disclosure in Lorebook info; applies to later entries | P5 | done |
| DEF-109 | An inject-peek preview of an entry's rendered text | peek dialog with token cost | P5 | done |
| DEF-110 | Markdown preview for content | only if the target frontends read it consistently | P5 | scheduled |
| DEF-113 | Per-entry colour labels for visual grouping | six colour dots on cards and a picker under notes | P5 | done |


## I. Interop

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-012 | Character card containers (PNG/CHARX) and embedded books | delivered by the K series | P5 | done |
| DEF-013 | Chub wrapper variants beyond `lorebook_v3` | wrapped `data` block fixture imports with wrapper fields preserved | P4 | done |
| DEF-014 | RisuAI-native export | export-only adapter with array entries (`formats/risu.js`) | P5 | done |
| DEF-015 | Editable advanced SillyTavern and Chub fields | Advanced section reads/writes `extensions.sourceFields`, role numeric mapping preserved (`advanced.js`) | P5 | done |
| DEF-016 | Lossy-field warning coverage across serializers | tags and notes warn on every interchange export (`buildLossyWarnings`); native stays silent | P4 | done |
| DEF-017 | JSON/YAML plain export for scripting | - | P5 | scheduled |
| DEF-019 | Drag-and-drop file import onto the window | drop overlay over the whole window, first file imports | P5 | done |
| DEF-111 | An import audit log of detected format, warnings and skipped fields | last 10 imports in the About panel (`auditLog.js`) | P5 | done |


## K. Character cards

Cards are a first-class record (G-16). The container is an adapter (A-8), so the canonical book model
never learns a card quirk.

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-084 | A card metadata record | `createCard`, schema v3 and migration | P5 | done |
| DEF-085 | Read PNG tEXt/zTXt card chunks | `cardPng.js`; ccv3 wins over chara, stale key removed on write | P5 | done |
| DEF-086 | CHARX (zip) card import and export | `zip.js` stored read/write, avatar carried | P5 | done |
| DEF-087 | Card spec V2/V3 detection and validation | `cardCodec.js`; unknown spec rejected, missing name/first message warned | P5 | done |
| DEF-088 | Extract an embedded character book on card import | previewed in the import dialog, linked on confirm | P5 | done |
| DEF-089 | Bind a lorebook to a card and export them together | card dialog book select; PNG and CHARX write the book | P5 | done |
| DEF-090 | A card library with preview and avatar | sidebar card list, avatar thumbnails, editor dialog | P5 | done |
| DEF-091 | Card field parity checklist | `docs/reference/PARITY.md` C section | P5 | done |


## O. Organization

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-092 | User-pinned entries per book | Alt+P and a palette action; pinned entries survive filters and sort first in manual order | P5 | done |
| DEF-093 | A recent-entries list | last five edited entries in the sidebar, click to jump | P5 | done |
| DEF-094 | A regex search mode in the entry list | `.*` toggle on both search inputs; invalid patterns match nothing | P5 | done |


## C. Context

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-020 | Cache tokenization per entry revision | content-keyed LRU in `tokenCache.js`; survives re-render, clears on encoding change | P4 | done |
| DEF-021 | Bulk operations by token size | select-by-size dialog feeds the bulk bar (`bulk.js`) | P4 | done |
| DEF-022 | A visual activation graph for the simulation | ranked bars, legend and inactive rows in the simulator (`activationGraph.js`) | P4 | done |
| DEF-023 | A large-book performance benchmark and virtualization | windowing plus 2,000/5,000-entry and 500,000-character benchmark profiles | P4 | done |


## P. Persistence

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-010 | Encrypted local projects | - | P5 | scheduled |
| DEF-011 | Opt-in cloud sync | G-12 | post-v1 | open |
| DEF-018 | Better fallback where File System Access is missing | save and open fall back to a download and the file picker | P4 | done |
| DEF-024 | A "what changed since your last session" summary | session-start diff banner on next load | P4 | done |
| DEF-025 | A custom `.lwproj` extension for project files | project save and backup write `.lwproj`; `.json` still imports | P4 | done |


## U. Surface

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-030 | A mobile library drawer | - | P5 | scheduled |
| DEF-031 | A light theme or theme tokens | full light token set, toggle in About and the palette, persisted | P5 | done |
| DEF-112 | A pre-commit contrast check over the token set | `npm run contrast` (scripts/contrast.mjs), wired into CI | P5 | done |
| DEF-032 | Density options for compact lists | compact density toggle in About, persisted, tighter virtual rows | P5 | done |
| DEF-033 | Resizable text areas with remembered heights | content, notes and description resize vertically; heights persist | P5 | done |
| DEF-034 | A keyboard shortcuts reference dialog | About panel button, palette entry, `aria-keyshortcuts` per row | P5 | done |
| DEF-035 | A focus mode that hides the sidebar | `Ctrl+\\` reuses the collapsed rail | P5 | done |
| DEF-036 | Hover hint popups for long field explanations | - | P5 | scheduled |
| DEF-037 | `aria-keyshortcuts` on shortcut buttons | undo, redo, export, add entry | P5 | done |
| DEF-038 | A changelog link in the About panel | - | P5 | scheduled |


## N. Fine polish

Small, low-risk surface fixes carried from the old backlog.

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-095 | Hide field hints while the field has content | show again on focus or when empty | P5 | scheduled |
| DEF-096 | Multi-select validation issue-type filters | filters are a toggleable set | P5 | done |
| DEF-097 | Hide the Repair button when the integrity check is clean | hidden, not just disabled | P5 | done |
| DEF-098 | Toast timing and duplicate-failure suppression | 1.2s dedupe window | P5 | done |
| DEF-099 | Truncate long lorebook names with a full-name tooltip | select and options carry the full title | P5 | done |
| DEF-100 | Show the app version in the tab title | - | P5 | done |
| DEF-101 | A "Copy entry" action | clipboard command and palette entry | P5 | done |
| DEF-102 | Ctrl/Cmd+Enter runs the simulation from its input | - | P5 | done |
| DEF-103 | Ctrl/Cmd+D duplicates the active entry | - | P5 | done |
| DEF-104 | Loading and error states for every async action | extends DEF-002 | P5 | scheduled |
| DEF-114 | Remember the last active entry per lorebook across a book switch | `ui.lastEntryByBook` | P5 | done |
| DEF-115 | A "Reset filters" action when a search or filter hides everything | empty-state button | P5 | done |
| DEF-116 | A "Clear search" affordance in the sidebar empty state | empty-state button | P5 | done |
| DEF-105 | An optional UI-state block in project files | session layout, opt-in | P5 | scheduled |
| DEF-106 | A schema reference page generated from the canonical model | `schemaPage.js` + dialog; `test/schemaPage.test.js` holds it to the model | P5 | done |
| DEF-107 | Print/PDF export for offline review passes | print stylesheet + `buildPrintRows`, from the palette | P5 | done |








## Q. Engineering

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-040 | TypeScript or JSDoc types if schema complexity grows | - | P5 | scheduled |
| DEF-041 | Offline support as a PWA | - | P5 | scheduled |
| DEF-042 | Deployment automation to a static host | - | P5 | scheduled |
| DEF-043 | A manual screen-reader pass on top of axe | U-3 | P5 | scheduled |
| DEF-044 | Browser coverage for export downloads and shortcuts | download filename/type and the undo, search, replace and palette shortcuts | P4 | done |
| DEF-054 | Benchmark a 500,000-character single book | `npm run benchmark` content-size profile | P4 | done |
| DEF-055 | Jump to the offending field from a validation issue | issues carry a `field` target and focus it on jump | P4 | done |
| DEF-056 | A 5,000-entry profile for `npm run benchmark` | consumer ask B-14; wide-scale profile lands 34.8ms | P4 | done |


## R. Product and release

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-050 | Decide the primary v1 export target | SillyTavern World Info v2, sorted first and marked primary (A-4) | P4 | done |
| DEF-051 | An app icon set and social preview assets | - | P5 | scheduled |
| DEF-052 | A small beta with real SillyTavern and Chub users | - | P5 | scheduled |
| DEF-053 | Collect real round-trip failures as fixtures | - | post-v1 | open |
| DEF-057 | Three-way merge over a common ancestor | consumer ask B-16; `diff.js` is the base | P5 | scheduled |
| DEF-060 | Decide the Windows build story | consumer ask C-1; Chrysalis S70 needs an answer | P5 | scheduled |
| DEF-064 | Multi-book attach with per-book weights and a set-level priority order | consumer ask B-8; today one active book | P5 | scheduled |


## M. Mobile

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-066 | Share-sheet import and export on Android | preview builds use the file picker and downloads | post-v1 | scheduled |
| DEF-067 | A signed release APK and keystore | previews are debug-signed only (docs/MOBILE-PREVIEW.md) | P5 | scheduled |


## X. Component (post-v1, separate repository)

Owned by the P6 phase; see `DECISIONS.md` G-14/G-15 and `docs/reference/EXTERNAL-ASKS.md`. Nothing here
may delay a v1 phase.

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-058 | A canon-ledger facts tab and conflict report | ask B-11; needs a ledger the app does not have | post-v1 | scheduled |
| DEF-059 | A descriptor registry generating forms, validation and JSON Schema | ask A-5/B-15; component hub, not the app hub | post-v1 | scheduled |
| DEF-061 | A supported headless API surface | ask A-6/C-4; composes the pure modules without `main.js` | post-v1 | scheduled |
| DEF-062 | An embedding and vendoring guide with the licence note | asks A-1/C-3 | post-v1 | scheduled |
| DEF-063 | Extract the pure core into a new component repository | asks A-1 to A-6; the v1 tag is the precondition | post-v1 | scheduled |
| DEF-065 | Run-level budget arbitration across attached books | ask B-9; the run budget is the outer bound | post-v1 | scheduled |
















