import assert from "node:assert/strict";
import test from "node:test";
import { filterCommands } from "../src/commands.js";

const commands = [
  { title: "New entry", hint: "Alt+N", keywords: ["add", "create"] },
  { title: "Export…", keywords: ["download", "save"] },
  { title: "Overview", keywords: ["stats", "tokens"] }
];

test("returns all commands for an empty query", () => {
  assert.equal(filterCommands(commands, "").length, 3);
});

test("matches by title, hint, and keywords", () => {
  assert.deepEqual(filterCommands(commands, "over").map((command) => command.title), ["Overview"]);
  assert.deepEqual(filterCommands(commands, "alt+n").map((command) => command.title), ["New entry"]);
  assert.deepEqual(filterCommands(commands, "download").map((command) => command.title), ["Export…"]);
});

test("is case-insensitive and trims the query", () => {
  assert.deepEqual(filterCommands(commands, "  EXPORT  ").map((command) => command.title), ["Export…"]);
});

test("returns an empty list when nothing matches", () => {
  assert.deepEqual(filterCommands(commands, "zzz"), []);
});

import { applyScopes, orderByRecent, pushRecent, scopeOf } from "../src/commands.js";

test("scopes entry and card commands to their pages but keeps global ones everywhere", () => {
  const list = [{ title: "New entry" }, { title: "Review" }, { title: "Sort: title" }, { title: "Export…" }];
  const onLibrary = applyScopes(list, "library");
  const onBook = applyScopes(list, "book");
  const onSettings = applyScopes(list, "book-settings");

  assert.deepEqual(filterCommands(onLibrary, "").map((command) => command.title), ["Export…"]);
  assert.deepEqual(filterCommands(onBook, "").map((command) => command.title), ["New entry", "Review", "Sort: title", "Export…"]);
  assert.deepEqual(filterCommands(onSettings, "").map((command) => command.title), ["Review", "Export…"]);
  assert.equal(scopeOf({ title: "Filter: enabled entries" }), "entries");
});

test("typing still finds out-of-scope commands, listed after the ones that apply", () => {
  const list = applyScopes([{ title: "New entry", keywords: ["add"] }, { title: "New lorebook", keywords: ["add"] }], "library");

  assert.deepEqual(filterCommands(list, "new").map((command) => command.title), ["New lorebook", "New entry"]);
});

test("recent commands lead the empty palette and are capped", () => {
  const list = [{ title: "A" }, { title: "B" }, { title: "C" }];

  assert.deepEqual(orderByRecent(list, ["C", "B"]).map((command) => command.title), ["C", "B", "A"]);
  assert.deepEqual(pushRecent(["a", "b", "c"], "b", 3), ["b", "a", "c"]);
  assert.equal(pushRecent(["a", "b", "c", "d", "e"], "f").length, 5);
});
