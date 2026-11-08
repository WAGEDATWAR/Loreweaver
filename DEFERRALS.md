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
| DEF-001 | Bulk find and replace across entries with a preview diff | reuses the diff engine | P4 | scheduled |
| DEF-002 | Richer empty and search states | - | P5 | scheduled |
| DEF-003 | A lorebook properties dropdown holding description, tags and budget | - | P5 | scheduled |
| DEF-004 | Author custom templates and "duplicate as template" | - | P5 | scheduled |
| DEF-005 | Per-entry word/character/token limits | - | P5 | scheduled |
| DEF-006 | Undo history that survives reload | E-5 | P4 | scheduled |
| DEF-007 | Entry links (`[[Title]]`) with broken-link validation | - | P5 | scheduled |
| DEF-008 | Suggested trigger keys from title and content | - | P5 | scheduled |
| DEF-009 | Bulk tag assignment for selected entries | - | P5 | scheduled |

## I. Interop

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-012 | Character card containers (PNG/CHARX) and embedded books | - | P5 | scheduled |
| DEF-013 | Chub wrapper variants beyond `lorebook_v3` | - | P4 | scheduled |
| DEF-014 | RisuAI-native export | - | P5 | scheduled |
| DEF-015 | Editable advanced SillyTavern and Chub fields | - | P5 | scheduled |
| DEF-016 | Lossy-field warning coverage across serializers | G-5 | P4 | scheduled |
| DEF-017 | JSON/YAML plain export for scripting | - | P5 | scheduled |
| DEF-019 | Drag-and-drop file import onto the window | - | P5 | scheduled |

## P. Persistence

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-010 | Encrypted local projects | - | P5 | scheduled |
| DEF-011 | Opt-in cloud sync | G-12 | post-v1 | open |
| DEF-018 | Better fallback where File System Access is missing | - | P4 | scheduled |
| DEF-024 | A "what changed since your last session" summary | - | P5 | scheduled |
| DEF-025 | A custom `.lwproj` extension for project files | - | P4 | scheduled |

## C. Context

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-020 | Cache tokenization per entry revision | - | P4 | scheduled |
| DEF-021 | Bulk operations by token size | - | P4 | scheduled |
| DEF-022 | A visual activation graph for the simulation | - | P4 | scheduled |
| DEF-023 | A large-book performance benchmark and virtualization | windowing and the 2,000-entry benchmark landed v0.7.4+; the 500,000-character content profile is DEF-054 | P4 | done |

## U. Surface

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-030 | A mobile library drawer | - | P5 | scheduled |
| DEF-031 | A light theme or theme tokens | G-7 | P5 | scheduled |
| DEF-032 | Density options for compact lists | - | P5 | scheduled |
| DEF-033 | Resizable text areas with remembered heights | - | P5 | scheduled |
| DEF-034 | A keyboard shortcuts reference dialog | - | P5 | scheduled |
| DEF-035 | A focus mode that hides the sidebar | - | P5 | scheduled |
| DEF-036 | Hover hint popups for long field explanations | - | P5 | scheduled |
| DEF-037 | `aria-keyshortcuts` on shortcut buttons | - | P5 | scheduled |
| DEF-038 | A changelog link in the About panel | - | P5 | scheduled |

## Q. Engineering

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-040 | TypeScript or JSDoc types if schema complexity grows | - | P5 | scheduled |
| DEF-041 | Offline support as a PWA | - | P5 | scheduled |
| DEF-042 | Deployment automation to a static host | - | P5 | scheduled |
| DEF-043 | A manual screen-reader pass on top of axe | U-3 | P5 | scheduled |
| DEF-044 | Browser coverage for export downloads and shortcuts | - | P4 | scheduled |
| DEF-054 | Benchmark a 500,000-character single book | content-size profile, separate from the 2,000-entry row benchmark (DEF-023) | P4 | scheduled |
| DEF-055 | Jump to the offending field from a validation issue | today the issue jumps to the entry, not the field | P4 | scheduled |
| DEF-056 | A 5,000-entry profile for `npm run benchmark` | consumer ask B-14; 2,000 is bounded (DEF-023) | P4 | scheduled |

## R. Product and release

| # | Item | Notes | Owner | Status |
|---|---|---|---|---|
| DEF-050 | Decide the primary v1 export target | A-4 | P4 | scheduled |
| DEF-051 | An app icon set and social preview assets | - | P5 | scheduled |
| DEF-052 | A small beta with real SillyTavern and Chub users | - | P5 | scheduled |
| DEF-053 | Collect real round-trip failures as fixtures | - | post-v1 | open |
| DEF-057 | Three-way merge over a common ancestor | consumer ask B-16; `diff.js` is the base | P5 | scheduled |
| DEF-060 | Decide the Windows build story | consumer ask C-1; Chrysalis S70 needs an answer | P5 | scheduled |
| DEF-064 | Multi-book attach with per-book weights and a set-level priority order | consumer ask B-8; today one active book | P5 | scheduled |

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
