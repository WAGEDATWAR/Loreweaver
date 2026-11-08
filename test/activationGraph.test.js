import assert from "node:assert/strict";
import test from "node:test";
import { buildActivationGraph, MAX_GRAPH_ROWS } from "../src/activationGraph.js";

function result() {
  return {
    activated: [
      { entry: { id: "entry_a", title: "Aurora Vale", order: 100 }, reason: "key" },
      { entry: { id: "entry_b", title: "Mara", order: 110 }, reason: "alwaysOn" }
    ],
    skipped: [
      { entry: { id: "entry_c", title: "Tidebinding", order: 120 }, reason: "noMatch" }
    ]
  };
}

test("ranks activated entries and keeps reasons", () => {
  const graph = buildActivationGraph(result());
  assert.equal(graph.activated.length, 2);
  assert.equal(graph.activated[0].rank, 1);
  assert.equal(graph.activated[0].title, "Aurora Vale");
  assert.equal(graph.activated[1].reason, "alwaysOn");
});

test("scales width between the shortest and longest title", () => {
  const graph = buildActivationGraph(result());
  const longest = graph.activated[0];
  const shortest = graph.activated[1];
  assert.equal(longest.width, 100);
  assert.ok(shortest.width < longest.width);
});

test("caps rows", () => {
  const many = {
    activated: Array.from({ length: 50 }, (_, index) => ({
      entry: { id: `entry_${index}`, title: `Title ${index}`, order: index },
      reason: "key"
    })),
    skipped: []
  };
  const graph = buildActivationGraph(many);
  assert.equal(graph.activated.length, MAX_GRAPH_ROWS);
  assert.equal(graph.activatedTotal, 50);
});

test("handles an empty result", () => {
  const graph = buildActivationGraph({ activated: [], skipped: [] });
  assert.deepEqual(graph.activated, []);
  assert.equal(graph.activatedTotal, 0);
});

test("falls back to a label for an untitled entry", () => {
  const graph = buildActivationGraph({
    activated: [{ entry: { id: "entry_x", title: "  ", order: 1 }, reason: "key" }],
    skipped: []
  });
  assert.equal(graph.activated[0].title, "Untitled entry");
});
