import assert from "node:assert/strict";
import test from "node:test";
import { buildPrintRows } from "../src/printView.js";
import { createBook } from "../src/schema.js";

test("builds print rows with estimated tokens", () => {
  const book = createBook({
    name: "Print Book",
    description: "A review copy.",
    entries: [
      { title: "Mara", keys: ["mara"], content: "a".repeat(80), notes: "private" },
      { title: "", keys: [], content: "", constant: true, enabled: false }
    ]
  });
  const view = buildPrintRows(book);

  assert.equal(view.bookName, "Print Book");
  assert.equal(view.totalEntries, 2);
  assert.equal(view.totalTokens, 20);
  assert.equal(view.rows[0].keys, "mara");
  assert.equal(view.rows[0].notes, "private");
  assert.equal(view.rows[1].title, "Untitled entry");
  assert.equal(view.rows[1].constant, true);
});

test("uses the real counter when given", () => {
  const book = createBook({ entries: [{ title: "A", content: "hello" }] });
  const view = buildPrintRows(book, { tokenCount: () => 7 });
  assert.equal(view.rows[0].tokens, 7);
});

import { buildCardPrint } from "../src/printView.js";
import { createCard } from "../src/schema.js";

test("prints a card as ordered, token-counted sections", () => {
  const card = createCard({ name: "Mara", description: "A smuggler.", firstMessage: "Hello.", alternateGreetings: ["Ahoy."], exampleMessages: "<START>", creator: "Sam", characterVersion: "2" });
  const view = buildCardPrint(card, { tokenCount: (text) => text.length, bookName: "Aurora" });

  assert.deepEqual(view.sections.map((section) => section.label), ["Description", "First message", "Alternate greeting 1", "Example messages"]);
  assert.equal(view.linkedBook, "Aurora");
  assert.equal(view.creator, "Sam \u00b7 2");
  assert.equal(view.totalTokens, view.sections.reduce((total, section) => total + section.tokens, 0));
});

test("a card with no text prints no sections", () => {
  assert.deepEqual(buildCardPrint(createCard({ name: "" })).sections, []);
});
