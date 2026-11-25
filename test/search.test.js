import assert from "node:assert/strict";
import test from "node:test";
import { createProject } from "../src/schema.js";
import { analyzeEntryQuery, searchProject } from "../src/search.js";

function project() {
  return createProject({
    books: [
      {
        id: "book_a",
        name: "Alpha",
        entries: [
          { id: "entry_a1", title: "Harbor", keys: ["harbor"], content: "The harbor is quiet." },
          { id: "entry_a2", title: "Mara", keys: ["mara"], content: "A tide-reader." }
        ]
      },
      {
        id: "book_b",
        name: "Beta",
        entries: [
          { id: "entry_b1", title: "Storm", keys: ["storm"], content: "A storm over the harbor." }
        ]
      }
    ]
  });
}

test("analyzes which fields match", () => {
  const entry = { title: "Harbor", content: "The quiet sea", keys: ["harbor"], secondaryKeys: [], tags: [], notes: "" };
  const match = analyzeEntryQuery(entry, "harbor");

  assert.equal(match.matched, true);
  assert.deepEqual(match.fields.sort(), ["keys", "title"]);
  assert.equal(analyzeEntryQuery(entry, "zzz").matched, false);
  assert.equal(analyzeEntryQuery(entry, "").matched, true);
});

test("groups results by lorebook and counts matches", () => {
  const result = searchProject(project(), "harbor");

  assert.equal(result.total, 2);
  assert.deepEqual(result.groups.map((group) => group.book.name), ["Alpha", "Beta"]);
  assert.deepEqual(result.groups[0].entries.map((item) => item.entry.id), ["entry_a1"]);
  assert.deepEqual(result.groups[1].entries.map((item) => item.entry.id), ["entry_b1"]);
});

test("returns no groups for an empty query", () => {
  const result = searchProject(project(), "  ");

  assert.equal(result.total, 0);
  assert.deepEqual(result.groups, []);
});

import { analyzeCardQuery } from "../src/search.js";
import { createCard } from "../src/schema.js";

test("finds character cards by their text fields", () => {
  const card = createCard({ id: "card_a", name: "Mara", description: "A smuggler from the harbor.", alternateGreetings: ["Ahoy"], tags: ["npc"] });

  assert.deepEqual(analyzeCardQuery(card, "harbor").fields, ["description"]);
  assert.deepEqual(analyzeCardQuery(card, "ahoy").fields, ["greetings"]);
  assert.deepEqual(analyzeCardQuery(card, "^mara$", { regex: true }).fields, ["name"]);
  assert.equal(analyzeCardQuery(card, "(", { regex: true }).invalid, true);
});

test("project search returns matching cards beside entry groups", () => {
  const withCards = createProject({ books: project().books, cards: [createCard({ id: "card_a", name: "Mara", description: "Watches the harbor." }), createCard({ id: "card_b", name: "Kest" })] });
  const result = searchProject(withCards, "harbor");

  assert.equal(result.cards.length, 1);
  assert.equal(result.cards[0].card.id, "card_a");
  assert.equal(result.total, 2);
  assert.deepEqual(searchProject(withCards, "").cards, []);
});
