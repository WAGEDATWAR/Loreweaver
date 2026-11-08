# EDITOR - authoring, keys, actions, history

> **Scope.** This document owns entry authoring: fields, key chips, templates, selection, bulk actions,
> validation presentation, book actions, undo/redo and revision restore. The model is
> `docs/ARCHITECTURE.md` 5; the surface is `docs/UI.md`; storage durability is `docs/PERSISTENCE.md`.

**Status:** built. Entry and book actions are gated by `test/store.test.js`, `test/books.test.js` and
the browser suite.

---

## 1. What works

- One local project containing multiple lorebooks.
- Lorebook create, rename, switch, duplicate, split, merge and delete.
- Editable book descriptions stored with each lorebook and previewed in the sidebar.
- Lorebook information section with the description, overview, and validation controls above entry
  search.
- Entry create, select, edit, duplicate, and delete.
- Reusable built-in entry templates for characters, locations, factions, items, and events.
- Search across title, content, trigger keys, secondary keys, author notes, and tags, with matched text
  highlighted and a per-card note explaining which fields matched.
- Global search across every lorebook (`Ctrl/Cmd+Shift+F`), grouped by lorebook, with a jump to the
  matching entry.
- Entry fields: title, trigger keys, secondary keys, tags, content, author-only notes, enabled state,
  always-on, selective, case sensitivity, whole-word matching, insertion order, position, and trigger
  probability.
- Lorebooks and entries carry optional tags, edited as chips. Entry tags drive a tag-filter row in the
  sidebar and appear as badges on entry cards.
- Trigger and secondary keys are edited as chips: add with Enter/comma, paste comma- or
  newline-separated lists, remove with the chip button or Backspace, and double-click a chip to edit it.
- Slash-delimited keys are treated as regular expressions, highlighted in the editor, and validated
  with a plain-text fallback when the pattern is invalid.
- Bulk insertion-order controls set or shift the order of selected entries.
- Multi-select with `Ctrl/Cmd+click` and `Shift+click`, plus bulk enable, disable, delete, and clear.
- Sort modes: manual order, title, insertion order, last edited, and enabled first. The preference
  persists locally.
- Book-level validation for empty content, repeated keys, key collisions across entries, invalid regex
  keys, missing keys, unreachable enabled entries, and insertion-order collisions, with clickable
  category counts that filter the issue list and jump-to-entry issue links.
- Entry filters for enabled, disabled, always-on, and missing keys. The enabled/disabled filters are
  mutually exclusive and the selection persists locally. Entry tags add a dynamic tag-filter row.
- When a search or filter hides the active entry, it stays visible as a pinned "Current" card.
- Session undo/redo for edits, structural changes, bulk actions, reordering, duplication, book actions,
  project replacement, import, and backup restore.
- Drag reordering in manual order plus keyboard reordering with `Alt+ArrowUp`/`Alt+ArrowDown`.
- Entry-list keyboard navigation with `ArrowUp`/`ArrowDown`/`Home`/`End`, `Enter`/`Space` activation,
  and `Ctrl`/`Shift` selection modifiers.
- Destructive actions behind a styled confirmation dialog.

## 2. Book actions

The lorebook actions dialog (`#book-actions-dialog`) duplicates, splits or merges the active lorebook.

- **Duplicate** clones the book and every entry with fresh ids and a `(copy)` name.
- **Split** moves either the selected entries or the second half of the list into a new `(split)`
  book. It needs at least one entry left behind.
- **Merge into another book** appends the active book's entries to a chosen target, remapping colliding
  entry ids and source UIDs, then removes the source book.

All three are pure (`src/books.js`), undoable, and available from the command palette. Merge records
`extensions.sourceIdRemappedFrom` when it has to renumber a source UID, so the original stays traceable.

## 3. History and restore

- Local revision history holds manual snapshots, automatic snapshots and restore. The newest 12
  snapshots are retained within a local size budget.
- History comparison reports per-snapshot change counts and a diff against the previous snapshot,
  including line-level content changes.
- A restore snapshots the current state first, so a restore is itself undoable.
- Undo history is session-only and is not restored after reload.

## 4. Authoring rules

- Title and content are free text; keys are chips, never a comma string.
- A regex key is slash-delimited and validated; an invalid pattern falls back to plain text with a note.
- New entries take the next manual order unless a template or bulk action says otherwise.
- Duplication never reuses a source id or source UID.
- A split or merge never drops an entry; the count before equals the count after.
- Templates are built-in only; editing a custom template is deferred (DEF-004).

## 5. Known gaps

- Templates cannot be authored or saved; "duplicate as template" is deferred (DEF-004).
- Drag reordering is limited to manual order with no active search or filter, because reordering a
  filtered subset is ambiguous.
- Undo does not survive reload (DEF-006).

## 6. Definition of done

A field or action ships with: its store mutation and a unit test, a keyboard path, a visible focus
target, focus restoration where it destroys something, and a browser scenario if it touches the
surface.
