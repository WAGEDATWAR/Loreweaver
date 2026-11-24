import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_VIEW,
  VIEWS,
  getView,
  isEditorView,
  isHubView,
  parseRoute,
  routeHref,
  viewForShortcut
} from "../src/views.js";

test("parses hub routes", () => {
  assert.deepEqual(parseRoute("#/library"), { view: "library", id: null });
  assert.deepEqual(parseRoute("#data"), { view: "data", id: null });
  assert.deepEqual(parseRoute("#/settings?x=1"), { view: "settings", id: null });
});

test("parses editor routes with ids", () => {
  assert.deepEqual(parseRoute("#/book/book_abc123"), { view: "book", id: "book_abc123" });
  assert.deepEqual(parseRoute("#/book/book_abc123/settings"), { view: "book-settings", id: "book_abc123" });
  assert.deepEqual(parseRoute("#/card/card_9"), { view: "card", id: "card_9" });
});

test("keeps the entries alias for the active lorebook", () => {
  assert.deepEqual(parseRoute("#/entries"), { view: "book", id: null });
});

test("falls back to the library for anything unknown or malformed", () => {
  for (const hash of ["", "#/", "#/nope", undefined, "#/__proto__", "#/book", "#/book/", "#/book/a b", "#/card", "#/book/x/y", "#/library/extra", "#/book/x/settings/more"]) {
    assert.equal(parseRoute(hash).view, DEFAULT_VIEW, String(hash));
  }
});

test("builds hrefs that parse back", () => {
  for (const [view, id] of [["library", null], ["data", null], ["settings", null], ["book", "book_1"], ["book-settings", "book_1"], ["card", "card_1"]]) {
    assert.deepEqual(parseRoute(routeHref(view, id)), { view, id });
  }

  assert.equal(routeHref("bogus"), "#/library");
  assert.equal(routeHref("book"), "#/library");
});

test("separates hub pages from editor views", () => {
  assert.ok(isHubView("library") && !isHubView("book"));
  assert.ok(isEditorView("card") && isEditorView("book-settings") && !isEditorView("data"));
});

test("hub shortcuts are unique and resolve", () => {
  assert.equal(new Set(VIEWS.map((view) => view.key)).size, VIEWS.length);
  assert.equal(viewForShortcut("1"), "library");
  assert.equal(viewForShortcut("9"), null);
  assert.equal(getView("bogus").id, "library");
  assert.equal(DEFAULT_VIEW, "library");
});
