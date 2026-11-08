import assert from "node:assert/strict";
import test from "node:test";
import {
  HISTORY_PERSIST_LIMIT,
  parseHistory,
  serializeHistory,
  trimHistory
} from "../src/history.js";

function snapshot(title) {
  return {
    activeBookId: "book_1",
    activeEntryId: "entry_1",
    books: [{ id: "book_1", name: "Book", entries: [{ id: "entry_1", title }] }]
  };
}

test("trims to the limit keeping the newest entries", () => {
  const entries = Array.from({ length: 40 }, (_, index) => snapshot(`t${index}`));
  const trimmed = trimHistory(entries);
  assert.equal(trimmed.length, HISTORY_PERSIST_LIMIT);
  assert.equal(trimmed.at(-1).books[0].entries[0].title, "t39");
});

test("drops malformed snapshots", () => {
  const trimmed = trimHistory([snapshot("good"), null, { activeBookId: "x" }, snapshot("also good")]);
  assert.equal(trimmed.length, 2);
});

test("keeps an empty-but-valid snapshot", () => {
  const trimmed = trimHistory([{ activeBookId: null, activeEntryId: null, books: [] }]);
  assert.equal(trimmed.length, 1);
});

test("trims by the character budget", () => {
  const entries = Array.from({ length: 10 }, (_, index) => snapshot(`t${index}`));
  const trimmed = trimHistory(entries, { limit: 10, charBudget: 250 });
  assert.ok(trimmed.length < 10);
  assert.equal(trimmed.at(-1).books[0].entries[0].title, "t9");
});

test("round-trips past and future", () => {
  const parsed = parseHistory(serializeHistory({ past: [snapshot("a")], future: [snapshot("b")] }));
  assert.equal(parsed.past.length, 1);
  assert.equal(parsed.future.length, 1);
  assert.equal(parsed.past[0].books[0].entries[0].title, "a");
});

test("returns empty for junk or a version mismatch", () => {
  assert.deepEqual(parseHistory(""), { past: [], future: [] });
  assert.deepEqual(parseHistory("not json"), { past: [], future: [] });
  assert.deepEqual(parseHistory('{"version":99,"past":[{"books":[]}]}'), { past: [], future: [] });
});
