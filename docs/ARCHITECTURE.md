# ARCHITECTURE - shape, data flow, canonical model

> **Scope.** This document owns the application shape, data flow, the canonical project/book/entry
> model, module boundaries and the native container. Authoring behavior is `docs/EDITOR.md`; adapters
> are `docs/INTEROP.md`; storage is `docs/PERSISTENCE.md`.

**Status:** built. Every module below exists and is gated.

**Planned (P5):** a `cards` collection beside `books` (G-16). A card is a sibling record, not a book
variant, and its PNG/CHARX containers are adapters (A-8, `docs/INTEROP.md` 1.1). The shape below gains
`cards: Card[]` and `activeCardId`; no book field changes for it.

---

## 1. Shape

Static single-page application using native ES modules. No framework, no bundler, no backend. The
browser is the source of truth during a session; IndexedDB is the primary persistence layer, with a
localStorage fallback and a one-time migration.

```text
index.html
  -> src/main.js (orchestration + events)
       -> store.js (mutations + active selection)
            -> schema.js (normalization + factories)
       -> validation.js (book-level issue checks)
       -> overview.js (book metrics)
       -> books.js (pure book duplicate/split/merge)
       -> templates.js (built-in starting points)
       -> storage.js -> storage/idb.js -> format.js -> formats/ (detection + adapters)
       -> ui/{sidebar,editor,overlays}.js (targeted rendering)
```

## 2. Data flow

1. User input updates the active entry or book through `store.js`.
2. Mutating actions capture a bounded project snapshot; rapid edits to the same field group coalesce
   into one history step.
3. The UI re-renders only the affected regions. Typing in the editor avoids replacing editor inputs.
4. A 400 ms debounced save writes the normalized project to IndexedDB and updates the header state.
   Successful saves also create an initial snapshot and at most one automatic revision every five
   minutes when the project has changed.
5. Import parses, detects, and normalizes the file; the preview reports format and warnings.
   Confirmation snapshots and backs up the current project, then replaces state, captures a history
   step, and re-renders.
6. Export chooses either the full project backup or one active-book adapter, serializes it, and
   downloads it. Backup restore is available from the export dialog and is undoable through project
   replacement.
7. Revision restore snapshots the current project, confirms the replacement, restores the selected
   snapshot through the same project parser, and refreshes the editor through normal project
   replacement.

## 3. Why vanilla

- Zero install friction and simple deployment.
- Every behavior is auditable in a small codebase.
- The canonical model is independent of rendering.

The main risk is state/rendering complexity as the feature set grows. Revisit only if the editor grows
interactions that are hard to express with targeted DOM updates. A framework migration is not a goal.

## 4. Boundaries

| Layer | May import | Must not |
|---|---|---|
| `schema.js`, `books.js`, `validation.js`, `overview.js`, `keys.js`, `simulation.js`, `search.js`, `diff.js`, `merge.js`, `integrity.js`, `windowing.js` | `utils.js`, each other where noted | DOM, storage, `main.js` |
| `formats/*` | `schema.js`, `formats/helpers.js` | DOM, storage, `main.js` |
| `storage/*` | `format.js`, `schema.js` | DOM |
| `ui/*` | `store.js` reads, `refs` | own state |
| `main.js` | everything | - |

The pure modules are unit-testable under `node` with no DOM shim; `test/` does exactly that.

## 5. Canonical data model

### Project

```text
{
  version,
  activeBookId,
  activeEntryId,
  ui: { searchQuery, sortMode },
  books: Book[]
}
```

`ui` is session state and is not part of exported interchange formats. `sortMode` belongs to the
current session state, while the chosen preference is also stored separately in localStorage.
Selection state is session-only and lives in the store module.

`version` is the schema version. `src/migrations.js` holds an append-only list of migrations and
upgrades stored or imported projects to the current version on load. Migrations are never edited after
release; a new migration is appended and `SCHEMA_VERSION` is bumped.

### Book

```text
{
  id, name, description,
  tags: string[],
  tokenBudget: number,
  entries: Entry[],
  extensions,
  createdAt, updatedAt
}
```

`description` is edited from a collapsible sidebar control and is included in native project backups.
`tags` are app-only organization labels that round-trip through native backups but are dropped by
interchange adapters.

### Entry

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Internal identity; must survive edits |
| `title` | string | Author-facing name, maps to ST `comment` / character book `name` |
| `keys` | string[] | Primary trigger keys |
| `secondaryKeys` | string[] | Optional secondary keys |
| `tags` | string[] | App-only organization labels; dropped by interchange adapters |
| `content` | string | Injected text |
| `notes` | string | Author-only notes; excluded from interchange exports |
| `enabled` | boolean | Inverse of ST `disable` |
| `constant` | boolean | Always-on entry |
| `selective` | boolean | Selective matching flag |
| `caseSensitive` | boolean | Matching option |
| `matchWholeWords` | boolean | Matching option |
| `order` | number | Insertion order, 0-9999 |
| `position` | enum | `before_char`, `after_char`, `before_an`, `after_an`, `at_depth` |
| `probability` | number | Trigger chance, 0-100 |
| `extensions` | object | Unknown-field bucket and source metadata |
| `createdAt` | number | Internal metadata |
| `updatedAt` | number | Internal metadata |

Internal names are intentionally readable and stable. Frontend quirks and numeric enums belong in
adapters, not in the editor.

## 6. Native container

The full-project backup uses a Loreweaver container:

```text
{
  app: "loreweaver",
  version: 2,
  exportedAt,
  activeBookId,
  activeEntryId,
  books: Book[]
}
```

Single-book native export uses the same container with one book and normalized active IDs. SillyTavern
and Chub exports are standalone exchange files rather than native containers. Labels and documentation
must stay explicit about the selected target.

Files written before the rename use `app: "lorebook-studio"` and still import; the adapter accepts both
ids (see `DECISIONS.md` I-4).

## 7. Module map

| Path | Purpose |
| --- | --- |
| `index.html` | Static application shell, icons, dialog, toast region |
| `src/main.js` | Event wiring, save orchestration, shortcuts, import/export flow |
| `src/schema.js` | Canonical factories, normalization, app identity |
| `src/store.js` | Project state, mutation actions, undo/redo, selection, sorting mode |
| `src/books.js` | Pure book duplicate, split and merge helpers |
| `src/storage.js` | Async project/backup/revision persistence with IndexedDB primary and fallback |
| `src/storage/idb.js` | IndexedDB open, key-value backend, store helpers |
| `src/storage/namespace.js` | Current and legacy storage key namespaces |
| `src/storage/legacy.js` | In-place migration of old `lorebook-studio` keys |
| `src/validation.js` | Book-level content, key and order issue detection |
| `src/windowing.js` | Pure row-window math for the virtualized entry list |
| `src/overview.js` | Book metrics, token summaries, key coverage |
| `src/templates.js` | Built-in entry templates and patch builders |
| `src/keys.js` | Regex-key detection and parsing with plain-text fallback |
| `src/commands.js` | Pure command-palette filtering |
| `src/search.js` | Entry query analysis and cross-lorebook search |
| `src/settings.js` | Tokenizer and context window presets |
| `src/simulation.js` | Pure context activation simulation |
| `src/migrations.js` | Append-only project schema migrations |
| `src/integrity.js` | Project integrity checks and repair |
| `src/diff.js`, `src/merge.js` | Diff engine and import strategies |
| `src/tokenizer/*` | BPE encoder, worker, client, vendored ranks |
| `src/ui/*` | Sidebar, editor and overlay renderers |
| `src/formats/*` | Detection, normalization, serialization, adapters |
| `src/limits.js` | Import size and schema limits |
| `src/sample.js` | First-run demo project |

## 8. Extension points

- A new format is one adapter plus its fixture (`docs/INTEROP.md`).
- A tokenizer preset is one entry in `settings.js` plus ranks.
- A view is a dialog in `index.html`, a handler in `main.js`, and pure logic in a module.
- Row windowing is decided by `windowing.js`; `ui/sidebar.js` renders only the window, so the store is
  untouched and the pure window math is unit-tested (`test/windowing.test.js`).
