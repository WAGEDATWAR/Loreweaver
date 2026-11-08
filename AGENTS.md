# AGENTS.md - working notes for automated agents

Project: **Loreweaver** - a local-first web editor for lorebooks used by LLM roleplay frontends. A typed
entry schema is the hub, every frontend format is an isolated adapter, and the browser's own storage is
the database. SillyTavern World Info v2, Chub, character books and native projects all round-trip.

## Read first

1. `DOCUMENTATION-INDEX.md` - ownership and precedence.
2. `docs/LOREWEAVER.md` - the charter, pillars, constraints and P phases.
3. `TODO.md` - the current phase. Do not work outside it without a reason.
4. `PLAN.md` - workflow and gate discipline.
5. The owning doc for whatever you touch (`ARCHITECTURE`, `EDITOR`, `INTEROP`, `PERSISTENCE`, `CONTEXT`,
   `UI`).

## Golden rules

- **Spec first.** Code and spec disagree: stop and fix one, or record a decision.
- **One writer.** The store mutates; the UI renders; the UI holds no state.
- **Render as text.** `textContent` only; `innerHTML` is a lint error.
- **The schema is the hub.** A frontend quirk lands in an adapter or an extension bucket.
- **Pure core.** The pure modules never import the DOM, storage or `main.js`.
- **Everything is data**, validated.
- **Tests and a browser scenario ship with every component.**
- **Destructive is guarded** by a confirmation and, for imports, a backup.

## Stack

- Native ES modules, zero runtime dependencies, no build step.
- Node tests for the pure modules; headless Chrome scenarios for the surface.
- IndexedDB primary with a `localStorage` fallback, behind `src/storage.js`.
- `ui/` renders; it never derives state and never imports `main.js`.

## Commands

`npm run check`, `npm run lint`, `npm run format`, `npm test`, `npm run test:e2e`, `npm run a11y`,
`npm run deferrals`, `npm run deferral-scan`, `npm run release:check`.

`npm test` is the fast tier; a filename always runs that file. `npm start` serves the app on
`http://localhost:4173`.

## Conventions

- Do not commit unless asked. No comments unless asked.
- LF endings; 2-space JS/JSON/CSS.
- `textContent` only; imported markup never executes.
- Ids are strings with `entry_`/`book_` prefixes and are never reused.
- Entry matching rules live once and are shared by validation and simulation (C-4).
- A new dialog joins `e2e/a11y.mjs` in the same change.

## Workflow for a request

Follow `PLAN.md`. Record choices in `DECISIONS.md` (owning series), progress in `TODO.md`, runs in
`CHANGELOG.md`, and the design in the owning doc. A "later" is a `DEFERRALS.md` row in the same change.

## Definition of done

The gate holds twice, the tests and scenario ship, the owning doc is updated, the deferrals are closed
or re-owned, and `TODO.md` says true.

## Prior art

`docs/reference/PRIOR-ART.md` records what the sibling projects proved and what is refused. Read it
before copying a pattern.
