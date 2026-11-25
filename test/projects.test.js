import assert from "node:assert/strict";
import test from "node:test";
import { ISSUE_COUNT_ENTRY_LIMIT, buildProjectItems, collectTags, filterProjects, sortProjects } from "../src/projects.js";
import { createBook, createCard, createEntry, createProject } from "../src/schema.js";

const estimate = (text) => String(text).split(/\s+/).filter(Boolean).length;

function sample() {
  return createProject({
    books: [
      createBook({ id: "book_a", name: "Aurora Vale", tags: ["campaign"], description: "A coastal city.", updatedAt: 200, entries: [createEntry({ content: "one two three" }), createEntry({ content: "four five", enabled: false })] }),
      createBook({ id: "book_b", name: "", updatedAt: 100, entries: [] })
    ],
    cards: [
      createCard({ id: "card_a", name: "Mara Voss", tags: ["npc"], description: "A smuggler.", firstMessage: "Hi there", bookId: "book_a", updatedAt: 300 }),
      createCard({ id: "card_b", name: "Orphan", bookId: "book_gone", updatedAt: 50 })
    ]
  });
}

test("builds one item shape for books and cards", () => {
  const items = buildProjectItems(sample(), { estimate, countBookIssues: () => 2, countCardIssues: () => 1 });
  const book = items.find((item) => item.id === "book_a");
  const card = items.find((item) => item.id === "card_a");

  assert.equal(items.length, 4);
  assert.deepEqual([book.kind, book.entries, book.enabledEntries, book.tokens, book.issues], ["book", 2, 1, 3, 2]);
  assert.equal(items.find((item) => item.id === "book_b").name, "Untitled Lorebook");
  assert.deepEqual([card.kind, card.linkedBook, card.issues], ["card", "Aurora Vale", 1]);
  assert.equal(card.tokens, estimate("A smuggler.") + estimate("Hi there"));
  assert.equal(items.find((item) => item.id === "card_b").linkedBook, "Linked lorebook missing");
});

test("skips the issue count for very large books", () => {
  const big = createProject({ books: [createBook({ id: "book_big", entries: Array.from({ length: ISSUE_COUNT_ENTRY_LIMIT + 1 }, () => createEntry({ content: "x" })) })] });
  const [item] = buildProjectItems(big, { estimate, countBookIssues: () => 5 });

  assert.equal(item.issues, null);
});

test("filters by kind and by a query across names, tags and descriptions", () => {
  const items = buildProjectItems(sample(), { estimate });

  assert.deepEqual(filterProjects(items, { kind: "card" }).map((item) => item.id).sort(), ["card_a", "card_b"]);
  assert.deepEqual(filterProjects(items, { query: "campaign" }).map((item) => item.id), ["book_a"]);
  assert.deepEqual(filterProjects(items, { query: "SMUGGLER" }).map((item) => item.id), ["card_a"]);
  assert.deepEqual(filterProjects(items, { query: "aurora", kind: "card" }).map((item) => item.id), ["card_a"]);
  assert.equal(filterProjects(items, { query: "zzz" }).length, 0);
});

test("sorts by recency, name and size without mutating the input", () => {
  const items = buildProjectItems(sample(), { estimate });
  const before = items.map((item) => item.id);

  assert.deepEqual(sortProjects(items, "updated").map((item) => item.id), ["card_a", "book_a", "book_b", "card_b"]);
  assert.deepEqual(sortProjects(items, "name").map((item) => item.name), ["Aurora Vale", "Mara Voss", "Orphan", "Untitled Lorebook"]);
  assert.equal(sortProjects(items, "size")[0].id, "card_a");
  assert.deepEqual(items.map((item) => item.id), before);
});

test("collects tags with counts across books and cards", () => {
  const items = buildProjectItems(sample(), { estimate });

  assert.deepEqual(collectTags(items), [{ tag: "campaign", count: 1 }, { tag: "npc", count: 1 }]);
});

test("filters by tag together with kind and query", () => {
  const items = buildProjectItems(sample(), { estimate });

  assert.deepEqual(filterProjects(items, { tag: "npc" }).map((item) => item.id), ["card_a"]);
  assert.deepEqual(filterProjects(items, { tag: "npc", kind: "book" }), []);
  assert.deepEqual(filterProjects(items, { tag: "campaign", query: "coastal" }).map((item) => item.id), ["book_a"]);
});

test("pinned projects lead every sort order", () => {
  const items = buildProjectItems(sample(), { estimate });
  const pinned = new Set(["card_b"]);

  assert.equal(sortProjects(items, "updated", pinned)[0].id, "card_b");
  assert.equal(sortProjects(items, "name", pinned)[0].id, "card_b");
  assert.equal(sortProjects(items, "updated")[0].id, "card_a");
});

import { thumbHue, thumbInitial } from "../src/projects.js";

test("thumbnail hues are stable, in range and ignore case and padding", () => {
  assert.equal(thumbHue("Aurora Vale"), thumbHue("  aurora vale "));
  assert.notEqual(thumbHue("Aurora Vale"), thumbHue("Mara Voss"));

  for (const name of ["", "A", "日本語", "x".repeat(500)]) {
    const hue = thumbHue(name);
    assert.ok(Number.isInteger(hue) && hue >= 0 && hue < 360);
  }
});

test("thumbnail initials use the first letter, upper-cased", () => {
  assert.equal(thumbInitial("  mara voss"), "M");
  assert.equal(thumbInitial("élan"), "É");
  assert.equal(thumbInitial(""), "?");
});
