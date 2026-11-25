import assert from "node:assert/strict";
import test from "node:test";
import { applyMacros, buildPromptPreview } from "../src/promptPreview.js";
import { createBook, createCard, createEntry } from "../src/schema.js";

const count = (text) => String(text).split(/\s+/).filter(Boolean).length;

function sample() {
  const book = createBook({
    tokenBudget: 3,
    entries: [
      createEntry({ title: "Harbour", keys: ["harbour"], content: "salt and rope here", position: "before_char" }),
      createEntry({ title: "Always", constant: true, content: "world rule", position: "after_char" }),
      createEntry({ title: "Off", enabled: false, keys: ["harbour"], content: "hidden" })
    ]
  });
  const card = createCard({
    name: "Mara",
    description: "{{char}} is a smuggler.",
    firstMessage: "Hello {{user}}.",
    exampleMessages: "<START>\n{{user}}: hi",
    systemPrompt: "Stay in character.",
    postHistoryInstructions: "Be brief.",
    depthPrompt: { prompt: "Remember the debt.", depth: 2, role: "system" }
  });

  return { book, card };
}

test("applies the common macros", () => {
  assert.equal(applyMacros("{{char}} greets {{user}} <BOT> <USER>", { char: "Mara", user: "Sam" }), "Mara greets Sam Mara Sam");
  assert.equal(applyMacros("{{user}}", {}), "You");
});

test("assembles segments in frontend order with macros filled", () => {
  const { book, card } = sample();
  const preview = buildPromptPreview(card, book, { scene: "We reach the harbour.", user: "Sam", count });

  assert.deepEqual(preview.segments.map((segment) => segment.id), [
    "system", "lore-before_char", "description", "lore-after_char", "examples", "opening", "chat", "depth", "post-history"
  ]);
  assert.equal(preview.segments.find((segment) => segment.id === "description").text, "Mara is a smuggler.");
  assert.match(preview.text, /Hello Sam\./);
  assert.equal(preview.segments.at(-1).cumulative, preview.total);
});

test("only activated lore appears and the lorebook budget is checked", () => {
  const { book, card } = sample();
  const quiet = buildPromptPreview(card, book, { scene: "Nothing to see.", count });
  const loud = buildPromptPreview(card, book, { scene: "At the harbour.", count });

  assert.equal(quiet.lore.activated, 1);
  assert.equal(loud.lore.activated, 2);
  assert.equal(loud.lore.overBudget, true);
  assert.equal(quiet.segments.some((segment) => segment.id === "lore-before_char"), false);
});

test("scans the opening message for triggers too", () => {
  const { book, card } = sample();
  card.firstMessage = "Welcome to the harbour.";

  assert.equal(buildPromptPreview(card, book, { count }).segments.some((segment) => segment.id === "lore-before_char"), true);
});

test("works without a linked lorebook and reports the context window", () => {
  const { card } = sample();
  const preview = buildPromptPreview(card, null, { count, contextWindow: 10 });

  assert.equal(preview.lore, null);
  assert.equal(preview.window.over, preview.total > 10);
  assert.equal(preview.sections.lore, 0);
});
