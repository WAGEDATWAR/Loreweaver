import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_VIEW, VIEWS, getView, isView, parseViewHash, viewForShortcut, viewHref } from "../src/views.js";

test("parses a view from the location hash", () => {
  assert.equal(parseViewHash("#/library"), "library");
  assert.equal(parseViewHash("#data"), "data");
  assert.equal(parseViewHash("#/settings?x=1"), "settings");
});

test("falls back to the default view for anything unknown", () => {
  assert.equal(parseViewHash(""), DEFAULT_VIEW);
  assert.equal(parseViewHash("#/nope"), DEFAULT_VIEW);
  assert.equal(parseViewHash(undefined), DEFAULT_VIEW);
  assert.equal(parseViewHash("#/__proto__"), DEFAULT_VIEW);
});

test("builds hrefs and resolves shortcuts", () => {
  assert.equal(viewHref("data"), "#/data");
  assert.equal(viewHref("bogus"), "#/entries");
  assert.equal(viewForShortcut("2"), "library");
  assert.equal(viewForShortcut("9"), null);
  assert.equal(getView("settings").label, "Settings");
  assert.equal(getView("bogus").id, "entries");
});

test("every view has a unique id and shortcut key", () => {
  assert.equal(new Set(VIEWS.map((view) => view.id)).size, VIEWS.length);
  assert.equal(new Set(VIEWS.map((view) => view.key)).size, VIEWS.length);
  assert.ok(VIEWS.every((view) => isView(view.id) && view.shortcut.endsWith(view.key)));
});
