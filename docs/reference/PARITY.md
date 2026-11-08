# Parity audit - SillyTavern and Chub

Reference only. The choke point: every field below is classified, and the class must match
`docs/INTEROP.md` 3. A field that is absent without a warning test is the defect this audit exists to
catch.

**Classes:** `edit` (editable in the UI), `keep` (preserved and re-emitted, not editable), `warn`
(reported as lossy on export), `absent` (no round-trip at all).

## SillyTavern World Info v2

| Field | Class | Note |
|---|---|---|
| `comment` | edit | maps to `title` |
| `key` / `keysecondary` | edit | maps to `keys` / `secondaryKeys` |
| `content` | edit | - |
| `disable` | edit | inverse of `enabled` |
| `constant` / `selective` | edit | - |
| `order` / `position` / `probability` | edit | - |
| `caseSensitive` / `matchWholeWords` | edit | - |
| `useProbability` | keep | re-emitted with `probability` |
| `depth` | keep | not editable (DEF-015) |
| `role` | keep | not editable (DEF-015) |
| `group` / `groupOverride` / `groupWeight` | keep | not editable (DEF-015) |
| `excludeRecursion` / `preventRecursion` / `delayUntilRecursion` | keep | (DEF-015) |
| `sticky` / `cooldown` / `scanDepth` | keep | (DEF-015) |
| `automationId` / `vectorized` | keep | (DEF-015) |
| unknown keys under `extensions` | keep | preserved per source |

## Chub lorebook

| Field | Class | Note |
|---|---|---|
| `comment` / `name` | edit | dual-written from `title` |
| `key` / `keys` / `keysecondary` / `secondary_keys` | edit | dual-written |
| `content` | edit | - |
| `disable` / `enabled` | edit | dual-written |
| `order` / `insertion_order` | edit | dual-written |
| `position` / `probability` / `useProbability` | edit | - |
| `caseSensitive` / `case_sensitive` | edit | - |
| `matchWholeWords` / `match_whole_words` | edit | - |
| `priority` | keep | re-emitted from `order` |
| unknown keys | keep | preserved per source |

## Gaps this audit tracks

- Container formats (PNG/CHARX) carry no class until implemented (DEF-012).
- Chub wrappers beyond `lorebook_v3` are absent (DEF-013).
- RisuAI has no adapter (DEF-014).
- `warn` coverage is thin in current serializers (DEF-016); closing it is a P4 gate item.
