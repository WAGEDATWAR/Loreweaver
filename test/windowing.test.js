import assert from "node:assert/strict";
import test from "node:test";
import {
  computeWindow,
  shouldVirtualize,
  VIRTUAL_OVERSCAN,
  VIRTUAL_ROW_HEIGHT,
  VIRTUAL_THRESHOLD
} from "../src/windowing.js";

test("virtualizes only past the threshold", () => {
  assert.equal(shouldVirtualize(0), false);
  assert.equal(shouldVirtualize(VIRTUAL_THRESHOLD), false);
  assert.equal(shouldVirtualize(VIRTUAL_THRESHOLD + 1), true);
});

test("renders every row when below the threshold", () => {
  const window = computeWindow({ total: 40, scrollTop: 300, viewport: 600 });
  assert.equal(window.virtual, false);
  assert.equal(window.start, 0);
  assert.equal(window.end, 40);
  assert.equal(window.offsetTop, 0);
  assert.equal(window.totalHeight, 40 * VIRTUAL_ROW_HEIGHT);
});

test("windows a large list around the viewport", () => {
  const window = computeWindow({ total: 2000, scrollTop: 2800, viewport: 560 });
  assert.equal(window.virtual, true);
  assert.ok(window.start <= 50);
  assert.ok(window.end >= 60);
  assert.ok(window.end - window.start < 30);
  assert.equal(window.offsetTop, window.start * VIRTUAL_ROW_HEIGHT);
  assert.equal(window.totalHeight, 2000 * VIRTUAL_ROW_HEIGHT);
});

test("clamps the start at the top and the end at the bottom", () => {
  const top = computeWindow({ total: 500, scrollTop: 0, viewport: 400 });
  assert.equal(top.start, 0);

  const bottom = computeWindow({ total: 500, scrollTop: 999999, viewport: 400 });
  assert.equal(bottom.end, 500);
  assert.ok(bottom.start > 400);
});

test("keeps an overscan margin so scrolling does not flash", () => {
  const window = computeWindow({ total: 1000, scrollTop: 560, viewport: 560 });
  const firstVisible = Math.floor(560 / VIRTUAL_ROW_HEIGHT);
  assert.equal(window.start, Math.max(0, firstVisible - VIRTUAL_OVERSCAN));
});

test("handles an empty list", () => {
  const window = computeWindow({ total: 0, viewport: 400 });
  assert.deepEqual(window, { virtual: false, start: 0, end: 0, offsetTop: 0, totalHeight: 0 });
});

test("tolerates a missing viewport", () => {
  const window = computeWindow({ total: 2000 });
  assert.equal(window.virtual, true);
  assert.ok(window.end > window.start);
});
