# PERSISTENCE - storage, migration, recovery

> **Scope.** This document owns storage backends, the legacy-namespace migration, schema migrations,
> integrity checking, backups, revision snapshots and failure recovery. The model is
> `docs/ARCHITECTURE.md` 5; the native container is 6.

**Status:** built. IndexedDB is primary with a localStorage fallback and a one-time migration.

---

## 1. Shape

Storage is async and serialized behind a write chain so two writes cannot race an index. The backend
interface is `get`, `set`, `remove`, `keys`. IndexedDB is preferred; localStorage is the fallback and the
migration source. If neither opens, the app still runs in memory and shows the failure banner.

Keys live under the `loreweaver:` prefix in one of four roles:

| Key | Holds |
| --- | --- |
| `loreweaver:project:v1` | The current project |
| `loreweaver:pre-import-backup:v1` | The single pre-import backup payload |
| `loreweaver:revisions:v1` | The revision index |
| `loreweaver:revision:v1:<id>` | One snapshot payload |

## 2. Save state

- Autosave is the default. A 400 ms debounce coalesces keystrokes; a visibility change flushes.
- The header is a live region reporting Saving, Saved, Unsaved or Error.
- A failed save raises a persistent banner with Export backup and Retry, and sets a `beforeunload`
  guard until a save succeeds.
- The first successful save creates an initial snapshot; automatic revisions are capped at one per five
  minutes when the project changed.

## 3. Migrations

Two independent migration paths exist:

**Schema migrations** (`src/migrations.js`) upgrade stored or imported project data to the current
`SCHEMA_VERSION`. They are append-only: a released migration is never edited, a new one is appended and
the version is bumped. A project from a newer version loads with a warning.

**Namespace migration** (`src/storage/legacy.js`) runs on startup before any preference reads. It renames
old `lorebook-studio:*` localStorage keys to `loreweaver:*`, copies the old IndexedDB database into the
new one, and then drops the old database. Current keys win; a legacy key is never written over one.

The native adapter still accepts `app: "lorebook-studio"`, so a file exported before the rename imports
unchanged.

## 4. Backups and revisions

- A pre-import backup is written before any replacement and is restorable from the export dialog.
- Revision history keeps the newest 12 snapshots within a 1.5M-character budget, deduplicated by content
  signature. A restore snapshots the current state first.
- Revisions are not included in project exports; they are local recovery only.
- Storage usage (backend, project bytes, snapshot count and size, browser quota) is reported in the
  export dialog.

## 5. Integrity

`src/integrity.js` and `getRevisionIntegrity` detect duplicate book or entry ids, duplicate source UIDs,
missing entry arrays, dangling active references, and missing or orphaned snapshot payloads. Repair
renumbers duplicates, drops dangling references and removes orphaned payloads while preserving content.

## 6. Recovery rules

- Every destructive path is confirmation-gated and, for imports, backup-gated.
- Storage failure never blocks export; the banner keeps the export shortcut in reach.
- A failed revision write removes its own partial payload before returning.
- The data-integrity dialog is reachable from About and from the command palette.

## 7. Multiple tabs and durability

- **One writer tab.** `src/tabGuard.js` talks over a `BroadcastChannel` named for the storage namespace. A
  tab that finds another open shows an advisory banner. When another tab saves, this tab pauses its own
  saves (state `paused`) and offers **Load latest** (reload from storage) or **Keep this tab's version**
  (resume and overwrite). Nothing is overwritten silently. Without `BroadcastChannel` the guard is a no-op.
- **Eviction.** On start the app calls `navigator.storage.persist()`; the storage panel reports whether
  the data is protected or best effort. A denial is not an error; backups remain the safety net.

## 8. Known gaps

- Undo is session-only (DEF-006).
- Revisions, backups and projects share one browser quota; the browser may refuse persistence, and the
  only mitigation is the exported backup.
- Project files need Chrome's File System Access API; elsewhere Import/Export is the path (DEF-018).
- Encrypted projects and cloud sync are deferred (DEF-010, DEF-011).
