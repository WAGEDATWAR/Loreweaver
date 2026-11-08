# External asks audit

> **Scope.** Reference only: what the sibling projects on this machine want from Loreweaver, what we
> already have, and where each ask would land. `DECISIONS.md` and `DEFERRALS.md` own the final call; the
> decision this audit fed is **G-14** (standalone first, component after v1 in its own repo).

**Status:** audited, v0.7.4+. Dispositioned by G-14/G-15; component-only asks are owned by the post-v1
phase and do not move a P4 or P5 gate.

---

## 0. How to read this

Between `C:\Dev` projects, Loreweaver is cited three ways: **a bar to equal**, **an editor to vendor**,
and **a tool to release**. Those are different kinds of ask with different costs, so each row is
classified:

| Kind | Meaning | Reversibility |
|---|---|---|
| **Capability** | a feature they need that we would want anyway | cheap; lands as a phase step |
| **Integration** | how a consumer loads, vendors or embeds our code | expensive; constrains our module layout |
| **Schema bridge** | they want our model to become a projection of theirs | expensive; touches the hub |
| **Distribution** | packaging, licensing, releases, repo hygiene | cheap to schedule, easy to over-promise |

**The blunt summary:** almost none of the asks are for lorebook features we lack. They are asks for
Loreweaver to become an **embeddable editor component**, which is a different product shape than the
standalone tool the charter describes. That is the real decision below, not the individual rows.

Sources audited: `chimera-core/docs/AUTHORING-SUITE.md`,
`chimera-core/docs/ENGINE-ROADMAP.md` E6, `chimera-core/docs/HANDOVER-synthesis.md`,
`chimera-core/docs/REFERENCE-NOTES.md`,
`Synthesis Frontend + Story Generator/docs/SYNTHESIS.md` + `DECISIONS.md` (Y-series) + `TODO.md` Y3/Y6,
`Synthesis Frontend + Story Generator/DEFERRALS.md` DEF-087,
`LLM Story Generator/docs/LOREBOOKS.md` + `DECISIONS.md` (F/G-series) + `DEFERRALS.md` F-series,
`Chrysalis/SUGGESTIONS.md` S70 + `TODO.md`, `Chrysalis/reference-old/Lorebook Tool`.

---

## 1. The asks, ranked by cost

### 1.1 Integration (the expensive ones)

| # | Ask | Source | What exactly | Gap today |
|---|---|---|---|---|
| A-1 | **Be vendored as `app/studio/`** | `Synthesis…/docs/SYNTHESIS.md:146`, `README.md:36`, Y-8 | copy our tree in with licence and history, loaded without their bundle | no vendoring guide, no stable entry module, `main.js` is the only entry |
| A-2 | **Be a sibling app, not a module** | `chimera-core/docs/ENGINE-ROADMAP.md:294` | the suite is "a visual frontend is a sibling app" driven by their engine core | no engine-agnostic API; our schema is ours alone |
| A-3 | **Keep zero dependencies so it loads outside a bundle** | `SYNTHESIS.md:150` | already true | nothing to do; state it as a guarantee |
| A-4 | **Stay local-first and never upload** | `AUTHORING-SUITE.md:191`, `SYNTHESIS.md:167` | already true | nothing to do |
| A-5 | **Lose our own schema to their descriptors** | `SYNTHESIS.md:149`, `AUTHORING-SUITE.md:2, 85`, Y-8 | our canonical model becomes a projection of a `TypeDescriptor` registry | our schema is hand-written per entry field, not descriptor-driven |
| A-6 | **Be driven headless** | `HANDOVER-synthesis.md:189-190` | "the engine only owes the descriptors and the JSON-Schema export" | every mutation lives behind `store.js` + `main.js`; no headless seam |

### 1.2 Capability (we want these anyway)

| # | Ask | Source | What exactly | Our state |
|---|---|---|---|---|
| B-1 | Real BPE tokenizer in a worker | `LLM…/DEFERRALS.md:38` (DEF-016, N7) | swap their `length/4` estimate for ours | **done** (`src/tokenizer/*`, C-1) |
| B-2 | Import preview + diff | `AUTHORING-SUITE.md:131`, `LLM…/DEFERRALS.md:99` (DEF-052) | preview, counts, warnings, changed/added/removed | **done** (`src/diff.js`, `ui/diff.js`) |
| B-3 | Revision history + pre-import backup | `AUTHORING-SUITE.md:131, 309` | snapshots, compare, restore, backup first | **done** (P-5 to P-8) |
| B-4 | Validation panel with jump-to-field | `AUTHORING-SUITE.md:131` | grouped, clickable counts | **done** (`validation.js`) but jump is to entry, not field |
| B-5 | Integrity check + repair | `AUTHORING-SUITE.md:141` | dangling refs, duplicate ids | **done** (`integrity.js`) |
| B-6 | Command palette, keyboard list nav | `AUTHORING-SUITE.md:211` | keyboard-first surface | **done** |
| B-7 | Global cross-book search | `LLM…/DEFERRALS.md:101` (DEF-053) | search every book | **done** (`Ctrl/Cmd+Shift+F`) |
| B-8 | Multi-book attach with weights | `LLM…/DEFERRALS.md:102` (DEF-054), `LOREBOOKS.md:96` | per-run attachment, weight, priority | **not built**; we have multi-book storage but a single active book |
| B-9 | Per-run budget arbitration | `LLM…/DEFERRALS.md:103` (DEF-055) | budget across attached books, run budget outer bound | **partial**; per-book budget only (`CONTEXT.md` 2) |
| B-10 | Activation at runtime | `LOREBOOKS.md` 3 | probability, cooldown, sticky, secondary keys | **partial**; simulation only, we do not emulate (G-11) |
| B-11 | A facts/conflict tab | `LOREBOOKS.md:82` | entries contradicted by a canon ledger | **not built**, needs a ledger we do not have |
| B-12 | Adaptor breadth: Risu, Agnai, generic JSON | `LLM…/DECISIONS.md:131` (F-10), `DEFERRALS.md:99` | every popular format | **open** (DEF-014, DEF-017) |
| B-13 | Character-card containers (PNG/CHARX) | `DEFERRALS.md:34` (DEF-012) | read/write embedded books | **open** (DEF-012) |
| B-14 | 5,000-entry responsiveness | `LOREBOOKS.md:106` | a 5,000-entry book stays responsive | **partial**; 2,000 bounded (DEF-023), 5,000 untested |
| B-15 | Entry descriptors driving forms + JSON Schema | `AUTHORING-SUITE.md:2`, `HANDOVER-synthesis.md:184-190` | one descriptor generates form, validation, schema | **not built** |
| B-16 | Three-way merge | `AUTHORING-SUITE.md:131`, (`docs/ARCHITECTURE.md` note) | semantic merge of two versions | **partial**; we have strategy merge (I-7), not three-way |

### 1.3 Distribution

| # | Ask | Source | What exactly |
|---|---|---|---|
| C-1 | A Windows release decision | `Chrysalis/SUGGESTIONS.md:399-400` | decide what a Windows build is and ship it |
| C-2 | Repository sanitization before import | same | the reference copy is stale and unlicensed for reuse there |
| C-3 | Licence clarity for vendoring | `SYNTHESIS.md:146` | MIT exists; a vendoring note does not |
| C-4 | Freeze a public integration surface | implied everywhere | there is no versioned API: `main.js`, `store.js` and the DOM ids are the de-facto contract |

---

## 2. What is already satisfied

Nine of the fourteen capability asks are shipped, plus both hard invariants (zero dependencies,
local-first). That matters for the decision: **the asks are not evidence that Loreweaver is behind.**
Our own ledger already owns most of the rest:

- B-8, B-9, B-12, B-13 are open ledger rows (DEF-012, DEF-014, DEF-017, DEF-054, DEF-055).
- B-14 landed this pass for 2,000 entries (DEF-023) with the 500,000-character profile split to DEF-054.
- B-4's field-level jump and B-16's three-way merge are genuine gaps with no row.

The asks that have **no owner anywhere** today are A-1 to A-6 and B-15. Those are the interesting ones.

---

## 3. Conflicts with our own charter

These are worth deciding explicitly, because a consumer's ask can silently overrule a locked choice.

1. **Embeds vs. standalone.** Resolved by G-14: the standalone tool ships first and the component is a
   separate post-v1 repository, so G-2 and G-8 are untouched during v1. The cost is that consumers wait
   for v1 and then target a new repo.
2. **G-11 says we do not emulate activation.** `LOREBOOKS.md` 3 asks us to. Accepting means either
   amending G-11 or telling the consumer to keep its own runtime (they already plan to). **Still open.**
3. **Our schema is the hub (G-1). A-5 wants their descriptors to be the hub.** Two hubs is the classic
   failure; `SYNTHESIS.md:158` already names the risk. G-14 defers the whole question to the component
   repo, where the descriptor registry becomes the component's hub and our schema the standalone hub.
4. **Entry-level adapters vs. record kinds.** Y-11 makes lorebooks one of six record kinds and Y-2 makes
   packs the unit. Our adapter contract assumes a book file. The component owns the mapping; the app does
   not bend for it.
5. **`main.js` owns orchestration.** A-1/A-6 need the store and pure modules to be usable without it.
   Today the pure modules are clean (A-1 in `ARCHITECTURE.md` 4) but nothing composes them headlessly.
   G-15 keeps that boundary a gate until extraction.

---

## 4. The decision

**Decided (G-14):** finish the standalone tool first. The reusable component is a **separate repository**
extracted **after v1**, and it is the thing that satisfies the integration asks. No consumer ask may
delay a standalone phase.

That makes the split mechanical rather than a debate:

- **In scope until v1:** everything that makes the standalone tool complete. The capability rows
  (B-8 to B-16) are P4/P5 work and several are already owned in `DEFERRALS.md`.
- **Out of scope until after v1:** A-1 to A-6. They are extracted with the component, not bolted onto
  the standalone app.
- **Cheap and now:** keep the pure core pure (G-15). Every phase must leave the DOM/storage barrier at
  `ARCHITECTURE.md` 4 intact, because that barrier *is* the extraction seam. A shortcut that leaks
  storage into `validation.js` costs twice: once now and once at extraction.

The one thing worth doing during v1 that only serves the component is **not** an API: it is keeping the
seam clean. A `src/api.js` can wait until the component repo exists and the standalone surface has
stopped moving.

### Sequencing

1. **P4 now:** the open capability rows the consumers name (DEF-012, DEF-014, DEF-017, DEF-054, DEF-055)
   and the rest of the P4 ledger to its gate.
2. **P5:** release work; `TODO.md` P5 gate. Nothing from this audit enters P5.
3. **v1 tag.**
4. **New repo, P6:** extract the pure modules, add the headless surface (A-6), write the vendoring and
   licence guide (A-1, C-3), and publish a versioned contract. Descriptors (A-5, B-15) land there only
   if more than one consumer still wants them after using the component.

### What to tell each project now

| Project | Answer |
|---|---|
| LLM Story Generator | unchanged: cite us, do not fork (their G-14 already says so); give them the tokenizer worker and the diff/backup model as reference |
| Synthesis | "embedded, not wrapped" is right, but the drop-in arrives **after v1** in a new repo; their Y3 can start against a vendored snapshot with no API promise |
| Chimera engine E6 | their descriptor hub is the same work as B-15 and lands in the component repo, not the app |
| Chrysalis S70 | the reference copy stays a reference until C-1/C-2 are decided; a Windows build is not implied by this document |

---

## 5. Cost notes per ask

- **A-1/A-6 (headless/embedding):** moderate. Needs an ownership pass on `refs`, an API test that does
  not boot the DOM, and a rule that `main.js` stays orchestration-only.
- **A-5/B-15 (descriptors):** large. Every entry field becomes data plus a generated form, validator and
  schema export. It collides with G-1 unless `TypeDescriptor` is the *same* single source, not a second.
- **B-8/B-9 (multi-book, budget):** moderate. Store shape and the sidebar both change; the simulation and
  overview must learn a set of books rather than one.
- **B-10 (activation):** moderate and it amends G-11.
- **B-11 (facts tab):** large, because it needs a canon ledger that Loreweaver does not have.
- **B-16 (three-way merge):** moderate; `diff.js` is a good base but a merge needs a common ancestor.
- **C-1/C-2 (Windows, sanitization):** small decisions, an hour each, but they unblock a whole project.

---

## 6. Ledger placement

The decision above maps each ask to an owner. Rows are in `DEFERRALS.md`; the component-only asks are
owned by the post-v1 phase so nothing here moves a P4 or P5 gate.

| Ask | Owner | Row |
|---|---|---|
| B-4 field-level validation jump | P4 | DEF-055 |
| B-14 5,000-entry benchmark profile | P4 | DEF-056 |
| B-16 three-way merge | P5 | DEF-057 |
| B-11 canon-ledger facts tab | post-v1 | DEF-058 |
| B-15 descriptor registry | post-v1 | DEF-059 |
| C-1 Windows build story | P5 | DEF-060 |
| C-4 headless API surface | post-v1 | DEF-061 |
| A-1/C-3 embedding and vendoring guide | post-v1 | DEF-062 |
| A-1 to A-6 component extraction into a new repository | post-v1 | DEF-063 |
| B-8 multi-book attach with weights | P5 | DEF-064 |
| B-9 run-level budget arbitration | post-v1 | DEF-065 |

Already owned elsewhere: B-1 (C-1), B-2/B-12 (DEF-016, DEF-017), B-3 (P-5 to P-8), B-7 (built), B-13
(DEF-012), B-12 Risu (DEF-014), B-14 row scale (DEF-023, done).
