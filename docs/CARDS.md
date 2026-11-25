# CARDS - character card records and containers

> **Scope.** This document owns the character card record, its PNG and CHARX containers, card field
> mapping and the card-to-book link. The adapter contract is `docs/INTEROP.md` 2; the canonical model is
> `docs/ARCHITECTURE.md` 5; the surface is `docs/UI.md`.

**Status:** built. Decided by G-16 (a card is a record) and A-8 (a container is an adapter). Modules:
`cardCodec.js`, `cardTokens.js`, `cardValidation.js`, `cardPng.js`, `zip.js`, `formats/card.js`, `ui/cards.js`.
The flow is in `docs/ARCHITECTURE.md` 9.

---

## 1. Why cards are a record

A card is not a lorebook with extra fields. It is what a frontend loads a character *from*, and its book
is one field of it. Modelling a card as a book variant would force card fields into the book model and
break the schema-as-hub rule (G-1).

So: **a card is a sibling record to a book.** A card may link a book, own no book, or carry an embedded
book that extracts on import. The book model never learns a card field (A-8).

## 2. The record

The full field table lives in `docs/ARCHITECTURE.md` 5 (Card). In short:

```text
Card {
  id, name, nickname, description, personality, scenario
  firstMessage, alternateGreetings[], groupOnlyGreetings[]
  exampleMessages, systemPrompt, postHistoryInstructions
  creator, creatorNotes, characterVersion, tags[]
  depthPrompt { prompt, depth, role }, talkativeness
  avatarDataUrl, bookId | null
  extensions { spec, cardExtensions, sourceFields }
  createdAt, updatedAt
}
```

`avatarDataUrl` holds the container image as a data URL, imported only; the card artwork is never edited
(G-16, charter non-goal). `bookId` is a link, not an embed: the book lives once and both the card and the
library point at it. `extensions.cardExtensions` and `extensions.sourceFields` keep what the editor does not
understand (I-2).

## 3. Containers

Both containers are adapters at the rim:

- **PNG** - the card JSON rides in `tEXt` chunks, base64-encoded: `ccv3` holds the V3 payload and
  `chara` the V2 payload. Both are written so a V2-only frontend still opens the card; V3 wins on read.
  Every other chunk and the pixel data are preserved verbatim, in order.
- **CHARX** - a zip holding `card.json` and the avatar. It is rewritten from scratch on export.
- **JSON** - the bare payload, V3 (`chara_card_v3`) or V2 (`chara_card_v2`). JSON carries no image.

A malformed or absent chunk warns and falls back rather than guessing a format (DEF-087).

## 4. The book link

- Import: an embedded book is detected, previewed, and extracted into a lorebook on confirm; the card is
  then linked to it (DEF-088). Nothing extracts silently.
- Export: a linked book writes back into the card (DEF-089), so a card and its book always travel
  together.
- A card with no book is valid; the link is optional.

## 5. Field mapping

Card fields map onto the container's JSON keys one to one and are recorded in
`docs/reference/PARITY.md` with the rest of the parity audit. A V2 export drops the V3-only fields
(`nickname`, `group_only_greetings`, `assets`, `source`, `creator_notes_multilingual`, the dates) and
warns about each one that held data. A card key the app does not understand lands in
`extensions.sourceFields`, and the card's `data.extensions` object in `extensions.cardExtensions`; both
round-trip unchanged (I-2). The export stamps `modification_date` and keeps the original `creation_date`.

## 5.1 Authoring

The card editor is a page (`#/card/<id>`) that autosaves, like a lorebook. It gives a card the same care a
lorebook gets:

- **Token cost**: a live report of text sent every turn, example messages and the opening message,
  with a per-field badge. Always-sent text above 1,500 tokens is flagged.
- **Checks** (`cardValidation.js`): missing name (error), missing description or first message, duplicate
  greetings, legacy `<USER>`/`<BOT>` macros, examples without `<START>`, a missing linked lorebook, heavy
  always-sent text, and an invalid or empty depth prompt.
- **Greetings**: alternate and group-only greetings are ordered lists with add, remove and move.
- **Library**: cards sit beside lorebooks on the Library hub with an avatar thumbnail, token size, linked
  lorebook, tags and an issue count; duplicate and delete (confirmed) from the tile or the card page. A
  card left blank is discarded when you leave it.
- **Export**: PNG (V3 + V2), CHARX, JSON V3 and JSON V2, each from the card dialog or the export dialog.

## 6. Invariants

- A card round-trips its fixture with unknown fields and image bytes intact, or the adapter does not
  ship (G-5).
- Extraction never drops an existing book; it creates or merges, previewed.
- A linked book is written once; unlinking never deletes the book.
- A malformed card warns; it never half-imports.
- `avatarBytes` is preserved even when the app cannot render the type.

## 7. Known gaps

- Artwork editing stays out of scope (G-16, charter non-goal).
- `zTXt`/`iTXt` card chunks are read only when uncompressed; a compressed chunk falls back to `tEXt`
  or reports the card unreadable.
- CHARX entries are written uncompressed (stored) rather than deflated.
- Re-importing a card: the import review diffs cards by id, then by unique name, field by field (greetings
  and long text line by line). "Merge by title" updates the card with the same name in place (identity and
  creation date kept) and is the default when a card file matches an existing card; "Append" always adds a new
  card with a fresh id. A card follows its lorebook when that lorebook merges into an existing one.
- Card history: snapshots already store cards. The card page's History dialog lists the snapshots whose
  version of the card differs from the current one (matched by id, then unique name), shows the fields that
  differ, compares them in the diff view and restores a version after saving a snapshot of the current state.
  The lorebook link, id and dates stay with the live card. The lorebook History list also counts cards.
- Card templates: three built-in starters (roleplay character, narrator, companion) plus your own. "Save this
  card as a template" keeps the text fields, greetings and settings, never the name, picture or link. Custom
  templates live with the project beside entry templates, told apart by a `kind` of `card`.
- The card Review page previews the assembled prompt with the linked lorebook (CONTEXT section 4.1). Extension editors are scheduled (DEF-123). Search, filter and sort come from the shared Library hub (DEF-117).

## 8. Definition of done

An adapter ships with its PNG and CHARX fixtures round-tripping unknown fields and bytes, a warning for
every lossy field, a browser scenario for import, extract and export, and the card in `e2e/a11y.mjs` when
its surface lands.

