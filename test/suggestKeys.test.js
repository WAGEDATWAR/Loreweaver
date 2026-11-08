import assert from "node:assert/strict";
import test from "node:test";
import { suggestKeys } from "../src/suggestKeys.js";

test("suggests title words before content words", () => {
  const keys = suggestKeys({ title: "Mara Voss", content: "The harbor is quiet near Mara." });
  assert.equal(keys[0], "mara");
  assert.equal(keys[1], "voss");
});

test("skips short words and stop words", () => {
  const keys = suggestKeys({ title: "The City of Glass", content: "" });
  assert.ok(!keys.includes("the"));
  assert.ok(!keys.includes("of"));
  assert.ok(keys.includes("city"));
});

test("excludes existing keys", () => {
  const keys = suggestKeys({ title: "Mara Voss", content: "", existing: ["mara"] });
  assert.equal(keys[0], "voss");
  assert.ok(!keys.includes("mara"));
});

test("ranks a repeated content word above a single one", () => {
  const keys = suggestKeys({ title: "Aurora", content: "lanterns glow. lanterns fall. lanterns fade." });
  assert.ok(keys.indexOf("lanterns") < keys.indexOf("glow"));
});

test("respects the limit and tolerates empty input", () => {
  assert.equal(suggestKeys({ title: "one two three four five six", limit: 3 }).length, 3);
  assert.deepEqual(suggestKeys({}), []);
});

test("normalizes case and punctuation", () => {
  const keys = suggestKeys({ title: "Mara's Harbor!", content: "" });
  assert.ok(keys.includes("mara") || keys.includes("mara's"));
});
