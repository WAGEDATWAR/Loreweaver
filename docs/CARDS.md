# CARDS - character card records and containers

> **Scope.** This document owns the character card record, its PNG and CHARX containers, card field
> mapping and the card-to-book link. The adapter contract is `docs/INTEROP.md` 2; the canonical model is
> `docs/ARCHITECTURE.md` 5; the surface is `docs/UI.md`.

**Status:** designed, unscheduled. Owned by `DEFERRALS.md` K. Decided by G-16 (a card is a record) and
A-8 (a container is an adapter).

---

## 1. Why cards are a record

A card is not a lorebook with extra fields. It is what a frontend loads a character *from*, and its book
is one field of it. Modelling a card as a book variant would force card fields into the book model and
break the schema-as-hub rule (G-1).

So: **a card is a sibling record to a book.** A card may link a book, own no book, or carry an embedded
book that extracts on import. The book model never learns a card field (A-8).

## 2. The record

```text
Card {
  id
  name, personality, scenario
  firstMessage, alternateGreetings[]
  exampleMessages, systemPrompt, postHistoryInstructions
  creator, creatorNotes, characterVersion
  tags[], avatarBytes, avatarType
  bookId | null
  source          { format, unknownFields }
  createdAt, updatedAt
}
```

`avatarBytes` holds the container image as bytes, imported only; the card artwork is never edited
(G-16, charter non-goal). `bookId` is a link, not an embed: the book lives once and both the card and the
library point at it.

## 3. Containers

Both containers are adapters at the rim:

- **PNG** - the card JSON rides in a `tEXt` chunk keyed `ccv3` (and the legacy `chara`), base64-encoded.
  Read and write both keys; prefer `ccv3` on write. Every other chunk and the pixel data are preserved
  verbatim.
- **CHARX** - a zip holding the card and its assets. It is read as a container and rewritten from scratch
  on export, preserving unknown entries in the archive.

A malformed or absent chunk warns and falls back rather than guessing a format (DEF-087).

## 4. The book link

- Import: an embedded book is detected, previewed, and extracted into a lorebook on confirm; the card is
  then linked to it (DEF-088). Nothing extracts silently.
- Export: a linked book writes back into the card (DEF-089), so a card and its book always travel
  together.
- A card with no book is valid; the link is optional.

## 5. Field mapping

Card fields map onto the container's JSON keys one to one and are recorded in
`docs/reference/PARITY.md` with the rest of the parity audit. A card field the app does not understand
lands in `source.unknownFields` and round-trips unchanged (I-2).

## 6. Invariants

- A card round-trips its fixture with unknown fields and image bytes intact, or the adapter does not
  ship (G-5).
- Extraction never drops an existing book; it creates or merges, previewed.
- A linked book is written once; unlinking never deletes the book.
- A malformed card warns; it never half-imports.
- `avatarBytes` is preserved even when the app cannot render the type.

## 7. Known gaps

- No card library or avatar preview yet (DEF-090).
- Card field parity is not audited yet (DEF-091).
- Artwork editing stays out of scope.

## 8. Definition of done

An adapter ships with its PNG and CHARX fixtures round-tripping unknown fields and bytes, a warning for
every lossy field, a browser scenario for import, extract and export, and the card in `e2e/a11y.mjs` when
its surface lands.
