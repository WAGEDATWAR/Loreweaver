# Loreweaver - Build Plan

How work happens here. Short by design: the charter is `docs/LOREWEAVER.md`, the topics are its
documents, and this file only holds the workflow and the gate discipline.

Status is `TODO.md`. Choices are `DECISIONS.md`. Deferrals are `DEFERRALS.md`, and a deferral without a
row is a bug.

## Workflow ordering

1. Read the current phase in `TODO.md` and the owning doc before touching anything.
2. Run the gates first, so a red baseline is known and not inherited.
3. Implement inside the phase's files; do not widen reach past what its gate measures.
4. Record the choice in `DECISIONS.md` (owning series), the run in `CHANGELOG.md`.
5. Update `TODO.md` to the truth, including a regression.
6. Update the owning doc; a stale doc is a bug.

## Hard rules

- **Spec first.** If code and spec disagree, stop and fix one, or record a decision.
- **One writer.** The store mutates; the UI renders; the UI never holds state.
- **Render as text.** `textContent` only; `innerHTML`, `insertAdjacentHTML` and `document.write` are lint
  errors.
- **The schema is the hub.** A frontend quirk lands in an adapter or an extension bucket, never in the
  canonical model.
- **Everything is data**, validated; no hardcoded special cases.
- **Tests and a browser scenario ship with every component.**
- **Destructive is guarded**: confirmation, and a pre-import backup for imports.
- **Do not commit unless asked.** No comments unless asked. LF, 2-space.
- **Released migrations are never edited.**

## Gates

`PLAN.md` gates are gates, not suggestions. A gate counts only if it re-derives its claim from fixtures
and the real app, not from the code under test.

| Gate | Command | Rule |
|---|---|---|
| `syntax` | `npm run check` | every module parses |
| `lint` | `npm run lint` | whitespace, indentation, no `innerHTML` |
| `format` | `npm run format` | clean whitespace |
| `unit` | `npm test` | all tests pass |
| `browser` | `npm run test:e2e` | all scenarios pass |
| `a11y` | `npm run a11y` | zero critical, serious or moderate violations |
| `deferrals` | `npm run deferrals` | the ledger is well-formed and owned |
| `release` | `npm run release:check` | version, changelog and tag agree |

A regression in any gate blocks the next phase. `npm test` is the fast tier; a filename always runs that
file.

## Deferral discipline

Any time a doc says "later", "for now", "post-v1" or "deferred", the same change adds or cites a
`DEFERRALS.md` row with an owner. An owner phase cannot be called done while its rows are `open`. When a
row lands, mark it `done` and cite the revision; a dropped row says why. `npm run deferrals` fails on a
malformed or ownerless row, and `npm run deferral-scan` reports prose deferrals with no id.

## The interop rule

An adapter change is done only when its fixture round-trips unknown fields intact, detection is proven,
and a lossy field emits a warning. A serializer that drops a field silently is a bug even if its tests
are green.

## Committing

Only when asked. A commit is one step, its docs, and its gates.

## Definition of a phase done

- Its gate holds over the full fixture set, twice.
- Its tools and tests ship.
- Its doc is updated, including a new risk if one appeared.
- Its deferrals are closed or re-owned.
- `TODO.md` says true.
