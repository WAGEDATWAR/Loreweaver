import assert from "node:assert/strict";
import test from "node:test";
import { formatAudit, recordAudit, summarizeAudit } from "../src/auditLog.js";

test("records an import at the front and trims to the limit", () => {
  const existing = [{ at: 1, file: "old.json", format: "Native", books: 1, entries: 2, cards: 0, strategy: "replace", warnings: 0 }];
  const next = recordAudit(existing, { file: "new.json", format: "SillyTavern", books: 2, entries: 5, cards: 1, strategy: "append", warnings: 1 }, { limit: 2, now: 99 });

  assert.equal(next.length, 2);
  assert.equal(next[0].file, "new.json");
  assert.equal(next[0].at, 99);
  assert.equal(next[1].file, "old.json");
});

test("tolerates junk input", () => {
  const next = recordAudit(null, { file: "a.json" }, { now: 5 });
  assert.equal(next.length, 1);
  assert.equal(next[0].books, 0);
});

test("summarizes counts", () => {
  assert.equal(summarizeAudit({ books: 2, entries: 5, cards: 1 }), "2 books, 5 entries, 1 card");
  assert.equal(summarizeAudit({}), "no content");
});

test("formats a readable log", () => {
  const text = formatAudit([{ at: new Date(2026, 0, 15, 9, 30).getTime(), file: "a.json", format: "Native", books: 1, entries: 3, cards: 0, strategy: "replace", warnings: 0 }]);
  assert.match(text, /a\.json/);
  assert.match(text, /Native/);
  assert.match(text, /3 entries/);
});

test("formats an empty log", () => {
  assert.equal(formatAudit([]), "Nothing imported in this browser yet.");
});
