# ARCHITECTURE - shape, data flow, canonical model

> **Scope.** This document owns the application shape, data flow, the canonical project/book/entry
> model, module boundaries and the native container. Authoring behavior is `docs/EDITOR.md`; adapters
> are `docs/INTEROP.md`; storage is `docs/PERSISTENCE.md`.

**Status:** built. Every module below exists and is gated.


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
       -> cardCodec.js, cardTokens.js, cardValidation.js (pure card logic) -> formats/card.js -> cardPng.js, zip.js
       -> tabGuard.js (cross-tab save guard)
       -> views.js (pages and hash routing)
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

## 2.1 Pages and routes

The app is a library hub plus editors. `src/views.js` is the pure route table: `#/library` (home),
`#/data`, `#/settings`, `#/book/<id>`, `#/book/<id>/settings`, `#/book/<id>/review`, `#/card/<id>` and `#/card/<id>/review`. The location hash is the
only view state, so the UI still holds none (A-2). `main.js` parses the hash, resolves it against the project
(a missing id falls back to the library), shows the matching page, activates the book or card in the store,
and shows the editor menu only for editor routes. `src/projects.js` is the pure library model: it turns books
and cards into one item shape and filters and sorts them. See `docs/UI.md` 1.

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
  books: Book[],
  cards: Card[],
  activeCardId,
  customTemplates: Template[]
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

### Card

A character card is a sibling record to a book (G-16), never a book variant. Section 9 owns its behaviour.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | `card_` prefix, never reused |
| `name`, `nickname` | string | `nickname` is V3 only |
| `description` | string | The main character definition; sent every turn |
| `personality`, `scenario` | string | Sent every turn |
| `firstMessage` | string | The opening greeting |
| `alternateGreetings` | string[] | Swipeable greetings, ordered |
| `groupOnlyGreetings` | string[] | V3 only; used in group chats |
| `exampleMessages` | string | Dialogue examples, `<START>`-separated |
| `systemPrompt`, `postHistoryInstructions` | string | Frontend prompt overrides |
| `creator`, `creatorNotes`, `characterVersion` | string | Authorship metadata |
| `tags` | string[] | Normalized, case-insensitive unique |
| `depthPrompt` | { prompt, depth, role } | SillyTavern depth prompt, kept in `extensions.depth_prompt` on the wire |
| `talkativeness` | number 0-1 | Group chat reply rate, kept in `extensions.talkativeness` on the wire |
| `avatarDataUrl` | string | Container image as a `data:image/*;base64` URL; stored, never edited |
| `bookId` | string or null | Link to a lorebook; the book lives once in `books` |
| `extensions.cardExtensions` | object | The card's `data.extensions`, preserved verbatim (world, regex scripts, vendor keys) |
| `extensions.sourceFields` | object | Unknown `data` keys (V3 `assets`, `source`, dates, vendor keys), preserved verbatim |
| `createdAt`, `updatedAt` | number | Internal metadata |

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
  version: 4,
  exportedAt,
  activeBookId,
  activeEntryId,
  books: Book[],
  cards: Card[]
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
| `src/cardCodec.js` | Pure card parse and serialize for the V1/V2/V3 specs, spec detection, V2 loss warnings |
| `src/cardTokens.js` | Pure card token report split into always-sent, examples and opening |
| `src/cardValidation.js` | Pure card issue detection (name, description, greetings, macros, link, weight) |
| `src/cardPng.js` | PNG chunk reader and writer for the `ccv3` and `chara` text chunks |
| `src/zip.js` | Minimal zip reader and writer for CHARX |
| `src/formats/card.js` | The card adapter: PNG, CHARX and JSON import, `exportCard` for every target |
| `src/tabGuard.js` | Pure cross-tab presence and save notifications over `BroadcastChannel` |
| `src/ui/cards.js` | Card editor form, greeting lists, token and issue summary |
| `src/ui/projects.js` | Library tiles for lorebooks and cards |
| `src/windowing.js` | Pure row-window math for the virtualized entry list |
| `src/overview.js` | Book metrics, token summaries, key coverage |
| `src/templates.js` | Built-in entry templates and patch builders |
| `src/keys.js` | Regex-key detection and parsing with plain-text fallback |
| `src/commands.js` | Pure command-palette filtering |
| `src/search.js` | Entry query analysis and cross-lorebook search |
| `src/review.js` | Pure Review page models for books and cards |
| `src/settings.js` | Tokenizer and context window presets |
| `src/simulation.js` | Pure context activation simulation |
| `src/migrations.js` | Append-only project schema migrations |
| `src/integrity.js` | Project integrity checks and repair |
| `src/diff.js`, `src/merge.js` | Diff engine and import strategies |
| `src/tokenizer/*` | BPE encoder, worker, client, vendored ranks |
| `src/views.js` | Pure route table and location-hash parsing for the hub and editor pages |
| `src/projects.js` | Pure library model: one item shape for lorebooks and cards, filter and sort |
| `src/ui/*` | Sidebar, editor, library, card and overlay renderers |
| `src/formats/*` | Detection, normalization, serialization, adapters |
| `src/limits.js` | Import size and schema limits |
| `src/sample.js` | First-run demo project |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA shell: network-first with a hashed cache and full precache, installed-app metadata |

## 8. Extension points

- A new format is one adapter plus its fixture (`docs/INTEROP.md`).
- A tokenizer preset is one entry in `settings.js` plus ranks.
- A view is a dialog in `index.html`, a handler in `main.js`, and pure logic in a module.
- Row windowing is decided by `windowing.js`; `ui/sidebar.js` renders only the window, so the store is
  untouched and the pure window math is unit-tested (`test/windowing.test.js`).
- Deployment ships the `www/` bundle (`.github/workflows/deploy.yml`); `scripts/bundle.mjs` is the one
  place that decides what a release contains.

## 9. Character cards

Cards are the second record kind in a project. This section owns how they flow through the app;
`docs/CARDS.md` owns the field-level detail and `docs/INTEROP.md` the container adapters.

### 9.1 Shape and ownership

- A project holds `cards: Card[]` beside `books`. A card links at most one book by `bookId`; the book
  lives once in `books` and the card never copies it (G-16). Deleting a card leaves its book, and
  deleting a book leaves the card with a visible "linked lorebook missing" check.
- The store owns every card mutation (`addCard`, `updateCard`, `duplicateCard`, `deleteCard`,
  `linkCardBook`) and each one captures an undo step, so cards share the book history, revisions,
  backups and integrity machinery. The card page edits the store directly with a short autosave debounce,
  the same model as a lorebook; a card left blank is dropped when you leave it.
- `schema.js` normalizes a card (`createCard`) the way it normalizes a book, and `migrations.js` upgrades
  stored cards (3 to 4 added description, nickname, group greetings, depth prompt and talkativeness).

### 9.2 Layers

| Layer | Modules | Rule |
| --- | --- | --- |
| Pure card logic | `cardCodec.js`, `cardTokens.js`, `cardValidation.js` | No DOM, storage or `main.js`; the tokenizer is injected as `count` |
| Containers | `cardPng.js`, `zip.js`, `formats/card.js` | Adapters at the rim; no card quirk reaches the book model (A-8) |
| Surface | `ui/cards.js`, the card page in `index.html`, card handlers in `main.js` | Renders the form; holds no derived state |

### 9.3 Data flow

1. **Import.** Any file is detected by confidence (`formats/card.js` scores PNG, ZIP and card JSON). The
   adapter reads the card payload (`ccv3` preferred over `chara`), validates the spec, parses the card
   (preserving `data.extensions` and unknown keys), and extracts an embedded `character_book` into a
   lorebook. The import dialog previews both; nothing is added until confirmed, and the current project
   is backed up first (G-6).
2. **Edit.** The card page (`#/card/<id>`) fills its form from the store. Every keystroke recomputes the token
   report (`cardTokens.js`) and the issue list (`cardValidation.js`) in an animation frame and, after a short
   debounce, writes the form through `updateCard`. There is no Save step.
3. **Export.** `CARD_ADAPTER.exportCard(card, { format, book })` serializes the active card for a target:
   PNG (V3 and V2 chunks), CHARX, JSON V3 or JSON V2. A linked book is serialized by the shared
   character-book adapter, so it carries every field that format supports and its own lossy warnings.
   Lossy results (V2 dropping V3-only fields, a JSON file without the image, no PNG image, no linked book)
   come back as warnings the user confirms.

### 9.4 What a frontend expects

- **The prompt split.** Frontends send description, personality, scenario, system prompt and post-history
  text every turn, example messages until the context fills, and a greeting once. The token report mirrors
  that split so authors can see what a card costs before the chat starts.
- **Both spec generations.** Many frontends still read only the V2 `chara` chunk; newer ones read `ccv3`.
  A PNG card carries both, with V3 winning on read, so it opens everywhere.
- **Macros.** `{{char}}` and `{{user}}` are the supported macros; `<USER>`, `<BOT>` and `<CHAR>` are
  flagged, and example messages without `<START>` are flagged.
- **Extensions survive.** SillyTavern keeps its own settings (world, depth prompt, talkativeness, regex
  scripts) under `data.extensions`. Loreweaver edits depth prompt and talkativeness and preserves every
  other extension key untouched.

### 9.5 Boundaries

Card artwork is never edited (G-16); images are stored and only converted to PNG so they can carry a card.
Card content is rendered as text only. A card never changes how a book matches or exports.
