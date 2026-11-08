# Loreweaver - Documentation Index

**The live document set for Loreweaver.** One topic, one document, one owner. A question about
storage has exactly one place to be answered, and a UI note cannot overrule it.

**Rule 0:** a document under `docs/reference/` never wins over one at the root. Reference material is
prior art and research; it explains where an idea came from and has no authority here.

---

## 1. Why the set is shaped this way

Loreweaver has one hard problem wrapped in several surfaces: **a lorebook must round-trip through
foreign frontend formats without quietly losing meaning, while staying fast and quiet to author in.**

Every topic below exists because it either protects that property or spends it. Splitting by owner
(rather than by screen) keeps the answer single-sourced: the interop rules cannot be edited away by a
convenience note in the editor doc.

## 2. The document set

### Product

| Doc | Job | Status |
|---|---|---|
| `README.md` | What Loreweaver is, the one idea, how to read the set | active |
| `docs/LOREWEAVER.md` | **The charter.** Pillars, constraints, non-goals, phases P0-P6 | active |
| `TODO.md` | Live phase status and what is next | active |
| `PLAN.md` | Workflow, gate discipline, the deferral rule | active |
| `DECISIONS.md` | Locked choices, by series (G, A, E, I, P, C, U) | active |
| `CHANGELOG.md` | What each revision changed | active |
| `DEFERRALS.md` | The deferral ledger; every "later" has a row | active |
| `RELEASING.md` | Versioning and the release checklist | active |

### Design (one owner per topic)

| Doc | Owns | Status |
|---|---|---|
| `docs/ARCHITECTURE.md` | Application shape, data flow, canonical model, module boundaries | built |
| `docs/EDITOR.md` | Entry authoring, keys, templates, selection, bulk actions, book actions, history | built |
| `docs/INTEROP.md` | Format adapters, detection, field mapping, round-trip requirements, limits | built |
| `docs/PERSISTENCE.md` | Storage backends, migration, integrity, backups, revisions, recovery | built |
| `docs/CONTEXT.md` | Tokenizer, budgets, overview metrics, context simulation | built |
| `docs/UI.md` | Layout, design tokens, interaction patterns, accessibility, responsive rules | built |

### Reference (no authority)

`docs/getting-started.md` is the in-app guide, so it targets the same voice as `docs/UI.md`. Prior-art
notes, the parity audit against SillyTavern and Chub, and the audit of what the sibling projects want
from Loreweaver (`docs/reference/EXTERNAL-ASKS.md`) live under `docs/reference/`.

`docs/MOBILE-PREVIEW.md` owns the milestone APK build and is owned by `PLAN.md`.

## 3. Precedence (highest wins)

1. `DECISIONS.md`
2. `docs/LOREWEAVER.md`
3. the owning topic document (`ARCHITECTURE`, `EDITOR`, `INTEROP`, `PERSISTENCE`, `CONTEXT`, `UI`)
4. `README.md` and `PLAN.md`
5. `docs/getting-started.md` and `docs/reference/`

A decision beats a design. If they disagree, the design has a bug, not the decision.

## 4. Topic ownership (one owner each)

| Topic | Owner |
|---|---|
| Product intent, pillars, constraints, phase order | `docs/LOREWEAVER.md` || Shape, data flow, canonical model, module boundaries | `docs/ARCHITECTURE.md` |
| Entry fields, keys, templates, selection, bulk and book actions, history | `docs/EDITOR.md` |
| Formats, detection, field mapping, round-trip, import limits | `docs/INTEROP.md` |
| Storage, migration, integrity, backup, revision, recovery | `docs/PERSISTENCE.md` |
| Tokenizer, budgets, overview, simulation | `docs/CONTEXT.md` |
| Layout, tokens, interaction, accessibility, responsive | `docs/UI.md` |
| Phase status | `TODO.md` |
| Every choice | `DECISIONS.md` |
| Every deferral | `DEFERRALS.md` |

## 5. Reading order

**New here:** `README.md` -> `docs/LOREWEAVER.md` 1-5 -> `docs/ARCHITECTURE.md` 1-4 -> `TODO.md`.

**Touching authoring:** `docs/EDITOR.md`, then `docs/ARCHITECTURE.md` 2.
**Touching a format:** `docs/INTEROP.md`, then `docs/reference/PARITY.md`.
**Touching storage:** `docs/PERSISTENCE.md`, then `DEFERRALS.md` P.
**Touching tokens or simulation:** `docs/CONTEXT.md`, then `DECISIONS.md` C.
**Touching the surface:** `docs/UI.md`, then `DECISIONS.md` U.

## 6. Change process

| Change | Goes to | Then |
|---|---|---|
| New idea | `docs/LOREWEAVER.md` 10 backlog | triage into a phase or a deferral row |
| Accepted choice | `DECISIONS.md` (owning series) | update the owning doc in the same change |
| Phase progress | `TODO.md` and `CHANGELOG.md` | - |
| Something put off | `DEFERRALS.md` row with an owner | - |
| A storage or adapter seam | `DECISIONS.md` P- or I-series | record before designing around it |

**Revision convention:** every pass records itself in `CHANGELOG.md`, however small.

**The stale-doc rule:** a doc that no longer matches the decision log is a bug of the same severity as
broken code.
