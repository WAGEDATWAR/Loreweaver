import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseProject } from "../src/format.js";
import { CARD_ADAPTER } from "../src/formats/index.js";

function fixture(name) {
  return new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
}

test("imports a PNG card with its embedded book, linked together", async () => {
  const result = await parseProject(fixture("card-mara.png"), { filename: "card-mara.png" });

  assert.equal(result.ok, true);
  assert.equal(result.formatId, "card");

  const card = result.project.cards[0];
  const book = result.project.books[0];

  assert.equal(card.name, "Mara Voss");
  assert.equal(card.personality, "Gruff");
  assert.match(card.avatarDataUrl, /^data:image\/png;base64,/);
  assert.equal(book.name, "Mara Book");
  assert.equal(card.bookId, book.id);
  assert.ok(result.warnings.some((warning) => /embedded lorebook/.test(warning)));
});

test("imports a CHARX card with its avatar", async () => {
  const result = await parseProject(fixture("card-mara.charx"), { filename: "card-mara.charx" });

  assert.equal(result.ok, true);
  assert.equal(result.project.cards[0].name, "Mara Voss");
  assert.match(result.project.cards[0].avatarDataUrl, /^data:image\/png;base64,/);
});

test("rejects a png with no card chunk", async () => {
  const empty = new Uint8Array(0);
  const result = await parseProject(empty.buffer.slice(0), { filename: "x.png" });
  assert.equal(result.ok, false);
});

test("round-trips a card through PNG, book included", async () => {
  const imported = await parseProject(fixture("card-mara.png"));
  const card = imported.project.cards[0];
  const book = imported.project.books[0];

  const exported = CARD_ADAPTER.serialize(card, { book });
  assert.equal(exported.ok, true);
  assert.equal(exported.type, "image/png");

  const again = await parseProject(exported.bytes.buffer.slice(0), { filename: exported.filename });
  assert.equal(again.ok, true);
  assert.equal(again.project.cards[0].name, "Mara Voss");
  assert.equal(again.project.books[0].entries[0].content, "Mara content");
});

test("exports a CHARX with the book inside", async () => {
  const imported = await parseProject(fixture("card-mara.png"));
  const card = imported.project.cards[0];
  const book = imported.project.books[0];

  const exported = CARD_ADAPTER.serializeCharx(card, { book });
  assert.equal(exported.ok, true);
  assert.equal(exported.type, "application/zip");
});

test("refuses to export a nameless card", () => {
  const exported = CARD_ADAPTER.serialize({ name: "  " });
  assert.equal(exported.ok, false);
});
