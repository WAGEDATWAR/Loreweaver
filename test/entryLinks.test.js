import assert from "node:assert/strict";
import test from "node:test";
import { extractLinks, findBrokenLinks } from "../src/entryLinks.js";
import { createBook } from "../src/schema.js";

test("extracts links with an optional label", () => {
  assert.deepEqual(extractLinks("See [[Mara Voss|her]] and [[Harbor]]."), [
    { target: "Mara Voss", label: "her" },
    { target: "Harbor", label: "" }
  ]);
});

test("ignores empty brackets", () => {
  assert.deepEqual(extractLinks("[[]] [[  ]]"), []);
});

test("reports a link to a missing entry", () => {
  const book = createBook({ entries: [{ id: "entry_a", title: "Mara", content: "See [[Harbor]]." }] });
  const issues = findBrokenLinks(book);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "brokenLink");
  assert.match(issues[0].message, /Harbor/);
});

test("resolves links case-insensitively and de-duplicates", () => {
  const book = createBook({
    entries: [
      { id: "entry_a", title: "Mara", content: "[[harbor]] [[Harbor]]" },
      { id: "entry_b", title: "Harbor", content: "" }
    ]
  });
  assert.deepEqual(findBrokenLinks(book), []);
});

test("clears a self-link", () => {
  const book = createBook({ entries: [{ id: "entry_a", title: "Mara", content: "[[Mara]]" }] });
  assert.deepEqual(findBrokenLinks(book), []);
});
