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
