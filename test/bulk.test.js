import assert from "node:assert/strict";
import test from "node:test";
import { measureEntry, selectEntriesByTokenSize, summarizeSizes } from "../src/bulk.js";

function entry(id, content, enabled = true) {
  return { id, content, enabled };
}

const book = {
  entries: [
    entry("entry_a", "aaaa"),
    entry("entry_b", "a".repeat(40)),
    entry("entry_c", "a".repeat(400)),
    entry("entry_d", "a".repeat(40), false)
  ]
};

test("measures with the estimator when no counter is given", () => {
  assert.equal(measureEntry({ content: "a".repeat(40) }), 10);
});

test("uses the counter when available", () => {
  assert.equal(measureEntry({ content: "aaaa" }, () => 7), 7);
});

test("selects entries inside a token range", () => {
  const picked = selectEntriesByTokenSize(book, { min: 5, max: 15 });
  assert.deepEqual(picked.map((item) => item.id).sort(), ["entry_b", "entry_d"]);
});

test("sorts the selection longest first", () => {
  const picked = selectEntriesByTokenSize(book, { min: 0 });
  assert.equal(picked[0].id, "entry_c");
});

test("excludes disabled entries on request", () => {
  const picked = selectEntriesByTokenSize(book, { min: 0, includeDisabled: false });
  assert.ok(!picked.some((item) => item.id === "entry_d"));
});

test("treats an open upper bound as unbounded", () => {
  const picked = selectEntriesByTokenSize(book, { min: 5, max: null });
  assert.equal(picked.length, 3);
});

test("summary reports count and extremes", () => {
  const summary = summarizeSizes(book.entries);
  assert.equal(summary.count, 4);
  assert.equal(summary.longest, 100);
  assert.equal(summary.shortest, 1);
  assert.equal(summary.total, 121);
});
