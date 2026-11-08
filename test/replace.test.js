import assert from "node:assert/strict";
import test from "node:test";
import {
  applyReplace,
  countReplacements,
  parseReplaceQuery,
  planReplace,
  replaceInText
} from "../src/replace.js";
import { createBook } from "../src/schema.js";

function book(entries) {
  return createBook({ id: "book_replace", name: "Book", entries });
}

test("rejects an empty find", () => {
  assert.equal(parseReplaceQuery({ find: "" }).ok, false);
});

test("rejects an invalid regex", () => {
  const result = parseReplaceQuery({ find: "(", regex: true });
  assert.equal(result.ok, false);
  assert.match(result.error, /regular expression/i);
});

test("replaces plain text case-insensitively by default", () => {
  const { query } = parseReplaceQuery({ find: "harbor", replacement: "port" });
  assert.equal(replaceInText("Harbor and harbor", query), "port and port");
});

test("honours case sensitivity", () => {
  const { query } = parseReplaceQuery({ find: "Harbor", replacement: "Port", caseSensitive: true });
  assert.equal(replaceInText("Harbor and harbor", query), "Port and harbor");
});

test("supports regex captures", () => {
  const { query } = parseReplaceQuery({ find: "(\\w+) Vale", replacement: "$1 Reach", regex: true });
  assert.equal(replaceInText("Aurora Vale", query), "Aurora Reach");
});

test("counts matches per mode", () => {
  const plain = parseReplaceQuery({ find: "a", replacement: "b" }).query;
  assert.equal(countReplacements("aaa", plain), 3);
  const regex = parseReplaceQuery({ find: "a+", replacement: "b", regex: true }).query;
  assert.equal(countReplacements("aa bb aaa", regex), 2);
});

test("plans only affected entries and fields", () => {
  const target = book([
    { id: "entry_1", title: "One", content: "the harbor", notes: "harbor note" },
    { id: "entry_2", title: "Two", content: "inland" }
  ]);
  const { query } = parseReplaceQuery({ find: "harbor", replacement: "port" });
  const plan = planReplace(target, query, { fields: ["content", "notes"] });

  assert.equal(plan.entryCount, 1);
  assert.equal(plan.totalMatches, 2);
  assert.deepEqual(plan.changes[0].fields.sort(), ["content", "notes"]);
});

test("restricts to a selected set", () => {
  const target = book([
    { id: "entry_1", title: "One", content: "harbor" },
    { id: "entry_2", title: "Two", content: "harbor" }
  ]);
  const { query } = parseReplaceQuery({ find: "harbor", replacement: "port" });
  const plan = planReplace(target, query, { onlySelected: ["entry_2"] });

  assert.equal(plan.entryCount, 1);
  assert.equal(plan.changes[0].entryId, "entry_2");
});

test("applies a plan and bumps timestamps", () => {
  const target = book([{ id: "entry_1", title: "One", content: "harbor" }]);
  const { query } = parseReplaceQuery({ find: "harbor", replacement: "port" });
  const plan = planReplace(target, query);
  const touched = applyReplace(target, plan);

  assert.equal(touched, 1);
  assert.equal(target.entries[0].content, "port");
  assert.ok(target.updatedAt > 0);
});
