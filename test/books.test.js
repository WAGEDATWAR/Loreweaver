import assert from "node:assert/strict";
import test from "node:test";
import { duplicateBook, mergeBookEntries, splitBook, splitPoint } from "../src/books.js";
import { createBook } from "../src/schema.js";

function book(name, entries = []) {
  return createBook({ id: `book_${name}`, name, entries });
}

test("duplicates a book with new ids and a copy name", () => {
  const source = book("Alpha", [{ id: "entry_a", title: "A", content: "x" }]);
  const copy = duplicateBook(source);

  assert.notEqual(copy.id, source.id);
  assert.equal(copy.name, "Alpha (copy)");
  assert.equal(copy.entries.length, 1);
  assert.notEqual(copy.entries[0].id, source.entries[0].id);
  assert.equal(copy.entries[0].title, "A");
  assert.equal(copy.entries[0].content, "x");
});

test("splits entries into a moved book", () => {
  const source = book("Alpha", [
    { id: "entry_a", title: "A" },
    { id: "entry_b", title: "B" },
    { id: "entry_c", title: "C" }
  ]);
  const { kept, moved } = splitBook(source, ["entry_b", "entry_c"]);

  assert.equal(kept.id, source.id);
  assert.deepEqual(kept.entries.map((entry) => entry.id), ["entry_a"]);
  assert.notEqual(moved.id, source.id);
  assert.equal(moved.name, "Alpha (split)");
  assert.deepEqual(moved.entries.map((entry) => entry.id), ["entry_b", "entry_c"]);
});

test("computes a split point at the midpoint", () => {
  const entries = [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }];

  assert.deepEqual(splitPoint(entries), ["3", "4"]);
  assert.deepEqual(splitPoint([{ id: "1" }]), []);
});

test("merges entries with id and source UID remapping", () => {
  const target = book("Target", [{ id: "entry_x", title: "X", extensions: { sourceId: "5" } }]);
  const source = book("Source", [
    { id: "entry_x", title: "X2", extensions: { sourceId: "5" } },
    { id: "entry_y", title: "Y", extensions: { sourceId: "6" } }
  ]);
  const merged = mergeBookEntries(target, source);

  assert.equal(merged.entries.length, 3);
  assert.equal(merged.entries[0].id, "entry_x");

  const ids = merged.entries.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);

  const sourceIds = merged.entries.map((entry) => entry.extensions.sourceId);
  assert.equal(new Set(sourceIds).size, sourceIds.length);
  assert.equal(merged.entries[1].extensions.sourceIdRemappedFrom, "5");
});
