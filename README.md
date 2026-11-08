# Loreweaver

A local-first web tool for writing, organizing, and exchanging lorebooks used by LLM roleplay
frontends such as SillyTavern and Chub.

You open it, the sample loads, and you start writing an entry. No account, no backend, no build step,
and no ceremony between the tool and the edit. Books and entries are structured records, not blobs, so
a key collision, an invalid regex, a dead entry or a blown token budget is caught before play rather
than discovered in a lost scene.

A lorebook is a portable file and a first-class document. That is the whole idea.

**Status:** built and gated (v0.7.x). Foundation, editor depth, interoperability, local recovery and
context intelligence are complete; scale work (Phase 4) is next. The app is a static module bundle and
the browser's own storage is the database.

## The one idea

> Structure the book now, so it survives the frontend later.

Everything here serves that split. Every entry is a typed record with stable identity, so import,
export, duplicate, split, merge and repair all operate on meaning instead of text. A serializer can be
audited; a blob cannot.

## Docs

- `DOCUMENTATION-INDEX.md` - topic ownership, precedence, reading order.
- `docs/LOREWEAVER.md` - **the charter.** Pillars, constraints, non-goals, phases P0-P5.
- `docs/ARCHITECTURE.md` - shape, data flow, canonical model, module boundaries.
- `docs/EDITOR.md` - authoring, keys, templates, selection, bulk and book actions, history.
- `docs/INTEROP.md` - adapters, detection, field mapping, round-trip, limits.
- `docs/PERSISTENCE.md` - storage, migration, integrity, backups, revisions, recovery.
- `docs/CONTEXT.md` - tokenizer, budgets, overview, simulation.
- `docs/UI.md` - layout, tokens, interaction, accessibility, responsive rules.
- `PLAN.md`, `DECISIONS.md`, `TODO.md`, `DEFERRALS.md`, `CHANGELOG.md`, `AGENTS.md` - how work happens.

## What it does

- Hold multiple lorebooks in one project, with rename, duplicate, split and merge.
- Author entries with typed fields, chip keys (plain or regex), tags, author-only notes and full
  injection settings.
- Catch empty content, duplicate and colliding keys, invalid regex, missing keys, unreachable entries
  and insertion-order collisions in one Issues panel.
- Count real cl100k and o200k tokens in a worker, set a per-book budget, and simulate activation
  against a pasted scene.
- Import and export SillyTavern World Info v2, Chub, `lorebook_v3` character books and native
  projects, preserving unknown fields per source format.
- Preview every import as a diff, then replace, append or merge by title, with an automatic pre-import
  backup.
- Recover: undo/redo, snapshots, integrity repair, IndexedDB autosave, a storage-failure banner and
  in-place project files where the browser allows it.

## What it is not

- Not a chat client and not a model runner. It captures settings; consumers apply them.
- Not a hosted service. No account, no cloud sync, no collaboration, no telemetry.
- Not a framework showcase. Vanilla modules, zero runtime dependencies, no build step.
- Not a character-card editor. Standalone lorebook files only until containers land.

## Running it

```
npm install   # dev dependencies only (axe-core, gpt-tokenizer)
npm start     # static server on http://localhost:4173
```

```
npm run check         # syntax every module
npm run lint          # whitespace, indentation, innerHTML ban
npm test              # unit gate
npm run test:e2e      # committed browser scenarios
npm run a11y          # axe audit over the workspace and every dialog
npm run deferrals     # deferral ledger check
npm run release:check # version, changelog and tag agree
```

Everything is local: the app is static files and the browser's own storage is the database.

## Rules that hold here

- Imported strings render with `textContent`; `innerHTML` is a lint error.
- The canonical schema is the hub; every format is an isolated adapter.
- An adapter round-trips its fixture, unknown fields intact, or it does not ship.
- A destructive action is behind a confirmation and a pre-import backup.
- Released migrations are never edited; a schema change appends one.
- No commit unless asked.

## Former name

Loreweaver was previously **Lorebook Studio** (the GitHub repository was `Simple-Lorebook-Studio`, which
still redirects). Projects, backups, revisions and UI preferences written under the old
`lorebook-studio` storage namespace migrate automatically on load, and old native project files with the
`app: "lorebook-studio"` id still import unchanged. See `DECISIONS.md` I-4 and P-3.
