# LOREWEAVER - the charter

> **Scope.** This document owns product intent: pillars, constraints, non-goals and phase order. The
> shape is `docs/ARCHITECTURE.md`, authoring is `docs/EDITOR.md`, formats are `docs/INTEROP.md`, storage
> is `docs/PERSISTENCE.md`, tokens are `docs/CONTEXT.md`, the surface is `docs/UI.md`.

**Status:** P0-P3 complete at v0.7.x. P4 (scale and durability) is the current phase.

---

## 1. Summary

Loreweaver is a local-first web utility for writing, organizing, and exchanging lorebooks used by LLM
roleplay frontends such as SillyTavern and Chub. It should feel quiet and fast: a readable dark
workspace, no account, no backend, and no ceremony between opening the tool and editing an entry.

The current build is a working multi-book editor with frontend-targeted exchange and local recovery. It
can import native projects, SillyTavern World Info, Chub lorebooks, and `lorebook_v3` character books;
export the active book as native, SillyTavern World Info v2, Chub, or a standalone character book;
preview imports; create a local pre-import backup before replacement; and keep automatic local
snapshots that can be restored.

## 2. The one idea

> Structure the book now, so it survives the frontend later.

A lorebook entry is a record with a stable id and typed fields, not text with punctuation. Every
operation - import, export, duplicate, split, merge, repair, diff - works on that meaning. The canonical
schema is the hub and each frontend format is a thin, isolated adapter at the rim.

This buys the two properties the tool exists for: **lossless interchange** and **recoverable
authoring**. It costs a schema, migrations and a discipline about adapters. The trade is worth it
because the alternative - editing blobs - makes both properties accidental.

## 3. Pillars

- **Authoring comfort.** Long sessions, keyboard first, fast entry creation, undo everywhere.
- **Semantic fidelity.** Import and export preserve what a frontend meant, not just what it printed.
- **Local by default.** The browser is the database; files in, files out; nothing phones home.
- **Legibility.** Strong contrast, clear focus, restrained noise, honest counts.
- **Recovery.** No destructive step without a confirmation, a snapshot, or a backup.
- **Small surface.** Vanilla modules, no build, no framework, every behavior auditable.

## 4. Constraints

- Static hosting; no server, no account, no runtime dependency.
- `textContent` rendering only; `innerHTML` is a lint error, so no imported markup executes.
- The canonical schema never learns a frontend quirk; quirks live in adapters and extension buckets.
- Released schema migrations are append-only.
- Every gate in `PLAN.md` runs in CI on `main` and on every pull request.
- Pre-1.0 semantic versioning, changelog per release, tagged `vX.Y.Z` (`RELEASING.md`).

## 5. Non-goals for v1

- Replacing a roleplay frontend or running model inference.
- Embedding a chat client.
- Account systems, cloud sync, or collaboration.
- Image generation or character card artwork editing (the card image is imported, never painted).
- Emulating every activation rule at runtime. The editor captures settings; consumers apply them.
- A reusable embedded component. v1 is the standalone tool; the component is extracted after v1 in its
  own repository (G-14).

## 6. Users and jobs

An author prepares a book before or between scenes and needs it to arrive intact in their frontend. Three
jobs recur:

1. **Draft.** Create an entry, give it keys, write the content, set injection rules, and not lose it.
2. **Audit.** Find dead entries, colliding keys, invalid regex, missing keys and budget overruns.
3. **Move.** Bring a book in from, or ship it out to, a specific frontend without silent loss.

Phase order follows those jobs: P1 serves drafting, P2 serves moving, P3 serves audit, and P4 keeps all
three working at size.

## 7. Phase order

Each phase in `TODO.md` has a gate in `PLAN.md`. A regression blocks the next phase.

- **P0 - Foundation.** Shell, design system, schema, persistence, native CRUD, responsive layout.
- **P1 - Authoring depth.** Duplication, ordering, multi-select, undo, templates, validation, filters,
  book actions.
- **P2 - Interoperability.** Adapter contract, SillyTavern, Chub, character books, preview, merge,
  backup, round-trip fixtures.
- **P3 - Context intelligence.** Real tokenizer, budget, collision and coverage detection, simulation,
  regex keys.
- **P4 - Scale and durability.** IndexedDB, project files, longer retention, virtualization, export diff.
- **P5 - Release.** Character cards, onboarding, themes, guide, a11y audit, browser suite, deployment.
- **P6 - Component (post-v1, separate repo).** Extract the pure core and a headless surface so a consumer
  can embed the editor (G-14, G-15). It tracks v1; it does not gate it.

## 8. Success criteria

- A 100-entry book is maintainable without leaving the keyboard.
- Real SillyTavern and Chub books round-trip with unknown fields intact and warnings for the rest.
- A 2,000-entry book stays responsive and an accidental import is recoverable.
- A new user creates and exports a first lorebook without external documentation.
- A card imports, round-trips through PNG and CHARX, and exports with its book.
- Every gate is green on `main`; `npm run a11y` reports zero serious violations.
- The pure modules still import no DOM, storage or `main.js` at v1, so extraction stays a lift.

## 9. Measurement

Gates measure the product, not effort. Interaction latency, round-trip fidelity, unit and browser test
counts, a11y violations and export warnings are all recorded in `CHANGELOG.md` per release. A claim in
these docs without a gate is a claim to remove or instrument.

## 10. Backlog (untriaged)

Ideas with no phase step and no `DEFERRALS.md` row yet. Triage moves each into `TODO.md`, a phase, or
the ledger; the ledger is the source of truth once a row exists, so this list stays short.

- A shared key dictionary across a project, to audit collisions before they ship.
- Importable lorebook "style guides" that prefill entry defaults.
- A side-by-side compare of two books in the same project.
- A reading mode that hides all chrome.

