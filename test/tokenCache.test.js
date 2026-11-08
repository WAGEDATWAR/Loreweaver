import assert from "node:assert/strict";
import test from "node:test";
import { createTokenCache, hashText } from "../src/tokenCache.js";

test("hashes equal text equally and different text differently", () => {
  assert.equal(hashText("hello"), hashText("hello"));
  assert.notEqual(hashText("hello"), hashText("world"));
  assert.match(hashText("hello"), /^[0-9a-f]+:5$/);
});

test("stores and returns counts", () => {
  const cache = createTokenCache();
  cache.set("a", 1);
  assert.equal(cache.get("a"), 1);
  assert.equal(cache.has("a"), true);
  assert.equal(cache.get("missing"), null);
});

test("counts hits and misses", () => {
  const cache = createTokenCache();
  cache.get("x");
  cache.set("x", 3);
  cache.get("x");
  assert.deepEqual(cache.stats(), { hits: 1, misses: 1, evictions: 0, size: 1 });
});

test("ignores non-finite counts", () => {
  const cache = createTokenCache();
  cache.set("a", Number.NaN);
  cache.set("b", null);
  assert.equal(cache.size, 0);
});

test("evicts oldest entries past the limit", () => {
  const cache = createTokenCache(3);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3);
  cache.set("d", 4);
  assert.equal(cache.has("a"), false);
  assert.equal(cache.has("d"), true);
  assert.equal(cache.stats().evictions, 1);
});

test("re-setting refreshes recency", () => {
  const cache = createTokenCache(2);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.get("a");
  cache.set("c", 3);
  assert.equal(cache.has("a"), true);
  assert.equal(cache.has("b"), false);
});
