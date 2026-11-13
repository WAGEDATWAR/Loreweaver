import assert from "node:assert/strict";
import test from "node:test";
import { buildCardTokenReport } from "../src/cardTokens.js";
import { validateCardRecord } from "../src/cardValidation.js";
import { createCard } from "../src/schema.js";

const count = (text) => String(text).split(/\s+/).filter(Boolean).length;
const codes = (card, options) => validateCardRecord(card, options).map((issue) => issue.code);

test("a complete card has no issues", () => {
  const card = createCard({
    name: "Mara",
    description: "A smuggler.",
    firstMessage: "Hi",
    exampleMessages: "<START>\n{{user}}: Hi"
  });

  assert.deepEqual(codes(card, { count }), []);
});

test("flags the essentials", () => {
  assert.deepEqual(codes(createCard()), ["missing-name", "missing-description", "missing-first-message"]);
  assert.equal(validateCardRecord(createCard())[0].severity, "error");
});

test("flags duplicate greetings across first and alternates", () => {
  const card = createCard({ name: "M", description: "d", firstMessage: "Hello", alternateGreetings: ["Hi", "Hello"] });
  assert.ok(codes(card).includes("duplicate-greeting"));
});

test("flags legacy macros and examples without START", () => {
  const card = createCard({ name: "M", description: "<USER> meets <BOT>", firstMessage: "x", exampleMessages: "hello there" });
  const found = codes(card);

  assert.ok(found.includes("legacy-macro"));
  assert.ok(found.includes("missing-example-start"));
});

test("flags a missing linked lorebook", () => {
  const card = createCard({ name: "M", description: "d", firstMessage: "x", bookId: "book_gone" });
  assert.ok(codes(card, { bookExists: () => false }).includes("missing-book"));
  assert.ok(!codes(card, { bookExists: () => true }).includes("missing-book"));
});

test("warns when the always-sent text is heavy", () => {
  const card = createCard({ name: "M", description: "word ".repeat(1600), firstMessage: "x" });
  assert.ok(codes(card, { count }).includes("heavy-permanent"));
});

test("the token report separates always-sent, examples and the opening", () => {
  const card = createCard({
    description: "a b c",
    personality: "d e",
    scenario: "f",
    exampleMessages: "g h",
    firstMessage: "i j k l",
    alternateGreetings: ["m", "n o"],
    depthPrompt: { prompt: "p q", depth: 2, role: "system" }
  });
  const report = buildCardTokenReport(card, count);

  assert.equal(report.always, 3 + 2 + 1 + 2);
  assert.equal(report.examples, 2);
  assert.equal(report.opening, 4);
  assert.equal(report.total, 8 + 2 + 4);
  assert.equal(report.fields.alternateGreetings, 3);
});
