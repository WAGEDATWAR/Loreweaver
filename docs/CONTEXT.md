# CONTEXT - tokens, budgets, overview, simulation

> **Scope.** This document owns the tokenizer, tokenizer and context presets, per-book budget, overview
> metrics and the context simulation. Entry matching fields are `docs/EDITOR.md`; the render is
> `docs/UI.md`.

**Status:** P3 complete at v0.7.x. The estimate is replaced by a real worker tokenizer.

---

## 1. Tokenizer

- Counts use a vendored BPE encoder (`src/tokenizer/bpe.js`) with cl100k_base and o200k_base ranks
  loaded on demand inside a web worker (`src/tokenizer/worker.js`).
- The main thread talks to a client (`src/tokenizer/client.js`) that falls back to the `ceil(chars / 4)`
  estimate while the worker loads or when workers are unavailable. Estimated counts are prefixed `~`.
- Both encoders are validated against `gpt-tokenizer` in `test/tokenizer.test.js`.
- Vendored rank data carries source attribution under `src/tokenizer/data/`.

Presets are cl100k_base (GPT-3.5 Turbo, GPT-4) and o200k_base (GPT-4o, GPT-4.1, o1, o3), chosen in the
token settings dialog and persisted locally.

## 2. Context window and budget

- Context window presets run 4K-200K and feed context-window usage in the overview and simulation.
- A per-book token budget drives an over-budget warning in the lorebook-information section and the
  overview.
- The overview reports the active tokenizer, context-window usage and budget usage; the simulation
  reports injected tokens as a percentage of the context window.

## 3. Overview

The overview summarizes the active book: entry counts, total and enabled tokens, unique and shared key
counts, key coverage, missing keys, average size, the longest entry and budget usage.

## 4. Simulation

The simulation evaluates a pasted scene against trigger keys, secondary keys, regex keys, case
sensitivity and whole-word matching. It shows activation order, matched keys, per-entry tokens, the
combined injected text, and the reasons inactive entries stayed inactive. Activating a result jumps to
the entry.

The simulation is a preview, not a runtime: it does not emulate recursion, groups, cooldowns or scan
depth. Those stay preserved settings the consumer applies.

### 4.1 Prompt preview

The card Review page assembles what a frontend would send for one card, its linked lorebook and a pasted
chat excerpt (`src/promptPreview.js`). Segments follow the common order: system prompt, lorebook before the
character, description, personality, scenario, lorebook after the character, example messages, the opening
message, the chat, lorebook at the author's note and at depth, the depth prompt and the post-history
instructions. `{{char}}`, `{{user}}`, `<BOT>` and `<USER>` are filled. Lorebook entries activate through the
same `simulateContext` (C-4), scanning the opening message and the chat. The preview shows tokens per segment,
the running total against the context window, and the lorebook against its own budget, and copies the
assembled text. Like the simulation it is a preview (C-5): each frontend's template, recursion, groups and
scan depth stay with the frontend.

## 5. Validation overlap

`src/validation.js` shares matching rules with the simulation so a key the simulator can hit is the same
key the issue list can flag. A change to matching rules updates both, plus `test/simulation.test.js` and
`test/validation.test.js`.

## 6. Known gaps

- Counts are cached only per render, not per entry revision (DEF-020).
- There is no bulk operation by token size (DEF-021).
- The activation graph is a list, not a visual graph (DEF-022).
- `npm run benchmark` covers a 2,000-entry filter, sort, overview and window pass against a 250 ms
  budget; the 500,000-character content profile is still uncovered (DEF-023).
