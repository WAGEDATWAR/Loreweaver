import assert from "node:assert/strict";
import test from "node:test";
import { buildBookReview, buildCardReview } from "../src/review.js";
import { createBook, createCard, createEntry } from "../src/schema.js";

const count = (text) => String(text).split(/\s+/).filter(Boolean).length;

test("a book review carries overview, issues and limits", () => {
  const book = createBook({ name: "B", tokenBudget: 2, entries: [createEntry({ content: "one two three", keys: [] })] });
  const review = buildBookReview(book, { count, contextWindow: 100 });

  assert.equal(review.kind, "book");
  assert.equal(review.overview.entries, 1);
  assert.equal(review.budget.over, true);
  assert.equal(review.context.over, false);
  assert.ok(review.issues.length > 0);
});

test("a book without a budget or window reports neither limit", () => {
  const review = buildBookReview(createBook({ name: "B", entries: [] }), { count });

  assert.equal(review.budget, null);
  assert.equal(review.context, null);
});

test("a card review sorts errors first and flags heavy permanent text", () => {
  const card = createCard({ name: "", description: "word ".repeat(2000), firstMessage: "Hi" });
  const review = buildCardReview(card, { count });

  assert.equal(review.issues[0].severity, "error");
  assert.equal(review.permanentOver, true);
  assert.equal(review.tokens.opening, 1);
});
