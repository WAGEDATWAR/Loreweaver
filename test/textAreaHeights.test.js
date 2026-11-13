import assert from "node:assert/strict";
import test from "node:test";
import { applyHeight, clampHeight, readHeights, serializeHeights } from "../src/textAreaHeights.js";

test("clamps heights to a sane range", () => {
  assert.equal(clampHeight(20), 60);
  assert.equal(clampHeight(5000), 720);
  assert.equal(clampHeight(200), 200);
  assert.equal(clampHeight("junk"), 60);
});

test("reads persisted heights and drops junk", () => {
  const heights = readHeights(JSON.stringify({ "entry-content": 300, "x<": 100, junk: "no" }));
  assert.equal(heights["entry-content"], 300);
  assert.ok(!("x<" in heights));
  assert.ok(!("junk" in heights));
  assert.deepEqual(readHeights("not json"), {});
});

test("serializes and applies", () => {
  assert.equal(serializeHeights({ a: 120 }), '{"a":120}');

  const element = { style: {} };
  applyHeight(element, 240);
  assert.equal(element.style.height, "240px");
  applyHeight(null, 240);
});
