# Legacy backlog coverage

> **Scope.** Reference only. The retired `Lorebook Tool/TODO.md` held 57 open items; this table proves
> every one is either shipped, owned by a ledger row, or deliberately dropped. The ledger is
> authoritative; this is the trace.

**Status:** audited, v0.8.0. Regenerate by hand if the legacy backlog is ever reopened.

---

## Rule

An old item could resolve four ways:

- **shipped** - built before or during the audit (cite the revision).
- **owned** - mapped to a `DEFERRALS.md` row (cite the id).
- **folded** - absorbed by a newer decision or a split series.
- **dropped** - refused with a reason.

An unlisted old item is the bug this audit exists to catch.

## Coverage

| Old item | Resolution |
|---|---|
| Visual activation graph | shipped, `DEF-022` |
| Bulk operations by token size | shipped, `DEF-021` |
| Cache tokenization per revision | shipped, `DEF-020` |
| Per-entry word/character/token limits | owned, `DEF-005` |
| Bulk find and replace with a diff | shipped, `DEF-001` |
| Large-book benchmark and virtualization | shipped, `DEF-023` |
| "Duplicate as template" | owned, `DEF-004` |
| Markdown preview | owned, `DEF-110` |
| Per-entry colour labels | owned, `DEF-113` |
| "Peek" inject preview | owned, `DEF-109` |
| Bulk tag assignment | owned, `DEF-009` |
| Suggest trigger keys | owned, `DEF-008` |
| Configurable new-entry defaults | owned, `DEF-108` |
| Entry links `[[Title]]` | owned, `DEF-007` |
| Character card containers (PNG/CHARX) | owned and split, `DEF-012` -> `DEF-084` to `DEF-091` |
| JSON/YAML plain export | owned, `DEF-017` |
| Schema reference page | owned, `DEF-106` |
| Drag-and-drop import | owned, `DEF-019` |
| Print/PDF export | owned, `DEF-107` |
| Pinned or recent entries | owned and split, `DEF-092` + `DEF-093` |
| Regex search mode | owned, `DEF-094` |
| `.lwproj` extension | shipped, `DEF-025` |
| Full UI state in project files | owned, `DEF-105` |
| Opt-in cloud sync | owned, `DEF-011` |
| Encrypted local projects | owned, `DEF-010` |
| "What changed since your last session" | shipped, `DEF-024` |
| Mobile library drawer | owned, `DEF-030` |
| Lorebook properties dropdown | owned, `DEF-003` |
| Hide field hints while filled | owned, `DEF-095` |
| Hover hint popups | owned, `DEF-036` |
| Light theme | owned, `DEF-031` |
| Density options | owned, `DEF-032` |
| Resizable text areas | owned, `DEF-033` |
| Empty, error and loading states | owned and split, `DEF-002` + `DEF-104` |
| Keyboard shortcuts dialog | owned, `DEF-034` |
| Focus mode | owned, `DEF-035` |
| Toast timing and dedupe | owned, `DEF-098` |
| Hide Repair when clean | owned, `DEF-097` |
| Multi-select issue filters | owned, `DEF-096` |
| Remember last active entry per book | owned, `DEF-114` |
| `Ctrl/Cmd+D` duplicate | owned, `DEF-103` |
| "Reset filters" action | owned, `DEF-115` |
| "Clear search" affordance | owned, `DEF-116` |
| `aria-keyshortcuts` | owned, `DEF-037` |
| "Copy entry" action | owned, `DEF-101` |
| `Ctrl/Cmd+Enter` simulation | owned, `DEF-102` |
| Truncate long book names | owned, `DEF-099` |
| Version in the tab title | owned, `DEF-100` |
| Changelog link in About | owned, `DEF-038` |
| TypeScript or JSDoc types | owned, `DEF-040` |
| PWA offline support | owned, `DEF-041` |
| Deployment automation | owned, `DEF-042` |
| Primary v1 export target | shipped, `DEF-050` / decision A-7 |
| Product rename to Loreweaver | shipped, decision G-9 |
| App icon set and social assets | owned, `DEF-051`, partial (launcher icon shipped) |
| Small real-user beta | owned, `DEF-052` |
| Collect real round-trip fixtures | owned, `DEF-053` |

## New items this audit added

Complimentary work the old list never named, mostly around the card workstream and the polish gap:

- `DEF-084` to `DEF-091` - the card series (record, PNG, CHARX, validation, extract, bind, library,
  parity).
- `DEF-092` to `DEF-094` - pinned and recent entries, regex search mode.
- `DEF-095` to `DEF-107` - the fine-polish batch, async states, UI-state files, schema page, print.
- `DEF-108` to `DEF-113` - new-entry defaults, inject-peek, markdown, import audit log, token contrast
  check, colour labels.
- `DEF-114` to `DEF-116` - last-entry memory, reset filters, clear search.

## Counts

57 old open items: **9 shipped**, **48 owned or split**, **0 dropped**. 33 new rows added.
