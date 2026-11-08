# INTEROP - formats, adapters, round-trip

> **Scope.** This document owns the format adapter contract, detection, field mapping, unknown-field
> preservation, import limits, preview and merge strategies. The canonical model is
> `docs/ARCHITECTURE.md` 5; storage safety is `docs/PERSISTENCE.md`.

**Status:** P2 complete at v0.7.x. SillyTavern World Info v2, Chub, `lorebook_v3` character books and
native projects all round-trip their fixtures.

---

## 1. Implemented targets

1. SillyTavern World Info JSON (standalone lorebook import and export). **The primary v1 export target**,
   sorted first in the export dialog and marked primary.
2. Chub lorebook import and export.
3. `lorebook_v3` character-book import.
4. Native Loreweaver project backup plus single-book native export.
5. Standalone character-book export.

## 2. Adapter contract

Each adapter provides:

- `detect(input)` - confidence that a parsed file belongs to this format.
- `parse(input)` - normalize into the canonical project/book/entry shape.
- `serialize(book)` - produce a valid single-book target payload.
- `capabilities` - declared import/export support and unknown-field preservation.
- `warnings` - actionable notes when data cannot round-trip, surfaced in preview or export toasts.

Import pipeline:

```text
read file -> JSON parse -> detect -> adapter normalize -> validate -> preview/confirm -> backup -> canonical state
```

Export pipeline:

```text
canonical state -> choose project or active book -> map fields -> validate -> serialize -> download
```

Detection scores candidates; the highest score wins and ties fall back to adapter order. An adapter that
returns zero for everything is export-only (the character-book adapter).

## 3. Field mapping

| Canonical | SillyTavern World Info | Chub |
| --- | --- | --- |
| `title` | `comment` | `comment` + `name` |
| `keys` | `key` | `key` + `keys` |
| `secondaryKeys` | `keysecondary` | `keysecondary` + `secondary_keys` |
| `content` | `content` | `content` |
| `enabled` | inverse of `disable` | `disable` + `enabled` |
| `constant` | `constant` | `constant` |
| `selective` | `selective` | `selective` |
| `order` | `order` | `order` + `insertion_order` |
| `position` | numeric `position` | numeric `position` |
| `probability` | `probability` + `useProbability` | `probability` + `useProbability` |
| `caseSensitive` | `caseSensitive` | `caseSensitive` + `case_sensitive` |
| `matchWholeWords` | `matchWholeWords` | `matchWholeWords` + `match_whole_words` |

Exported UIDs are allocated without collisions while retaining numeric source IDs when available.
Unknown source fields are preserved in the canonical extension bucket and restored only when exporting
back to the same source format.

## 4. Round-trip requirements

- Export, re-import, and compare canonical snapshots for realistic SillyTavern and Chub fixtures.
- Keep format detection and unknown-field restoration covered by tests.
- Preview format, counts, and warnings before destructive replacement.
- Create a local pre-import backup before replacement, with recoverability if backup storage fails.
- Treat single-book export as the primary flow and project bundles as backups.
- Advanced SillyTavern fields such as depth, role, groups, recursion, sticky, cooldown, and scan depth
  are preserved, not editable.

A new adapter is not done until: the fixture round-trips unknown fields intact, detection beats the
other adapters for its file, a lossy field emits a warning, and `npm test` covers all three.

Tags and author notes never survive an interchange format, so every serializer emits those two warnings
(`buildLossyWarnings` in `formats/helpers.js`) and the export dialog confirms before the file downloads.
Native export stays silent because it drops nothing.

## 5. Import safety

- Size and schema limits (25 MB, 1000 lorebooks, 50,000 entries) reject oversized files before parsing.
- The preview lists detected format, file name, counts, adapter warnings and a diff of added, removed
  and changed books and entries.
- Merge strategies: replace the project, append to lorebooks matched by name, or merge entries matched
  by title. The diff and confirm label update live when the strategy changes.
- Duplicate source UIDs are remapped on import.
- Project files use the `.lwproj` extension and still accept `.json` (DEF-025).

## 6. Known gaps

- Character card containers (PNG/CHARX) and embedded character books are not supported (DEF-012).
- Chub wrapper variants beyond `lorebook_v3` are not covered (DEF-013).
- RisuAI-native export is not supported (DEF-014).
- Advanced Chub and SillyTavern fields are preserved but not editable (DEF-015).
- Import does not yet offer a JSON/YAML plain export for scripting (DEF-017).


