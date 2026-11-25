import assert from "node:assert/strict";
import test from "node:test";
import { cardRestorePatch, cardTemplateFromCard, compareCardVersion, matchCardInProject } from "../src/cardHistory.js";
import { createCard, createProject } from "../src/schema.js";
import { CARD_TEMPLATES, getCardTemplate } from "../src/templates.js";

test("finds a card in a snapshot by id, then by a unique name", () => {
  const project = createProject({ cards: [createCard({ id: "card_a", name: "Mara" }), createCard({ id: "card_b", name: "Kest" })] });

  assert.equal(matchCardInProject(project, createCard({ id: "card_b", name: "Renamed" })).name, "Kest");
  assert.equal(matchCardInProject(project, createCard({ id: "card_x", name: "mara" })).id, "card_a");
  assert.equal(matchCardInProject(project, createCard({ id: "card_y", name: "Nobody" })), null);
});

test("an ambiguous name never matches", () => {
  const project = createProject({ cards: [createCard({ id: "card_a", name: "Mara" }), createCard({ id: "card_b", name: "Mara" })] });

  assert.equal(matchCardInProject(project, createCard({ id: "card_x", name: "Mara" })), null);
});

test("compares a snapshot version with the current card", () => {
  const past = createCard({ id: "card_a", name: "Mara", description: "old" });
  const current = createCard({ id: "card_a", name: "Mara", description: "new", tags: ["npc"] });
  const result = compareCardVersion(current, past);

  assert.equal(result.same, false);
  assert.deepEqual(result.labels, ["Description", "Tags"]);
  assert.equal(compareCardVersion(past, { ...past }).same, true);
});

test("a restore patch keeps identity, link and timestamps out", () => {
  const patch = cardRestorePatch(createCard({ id: "card_a", name: "Mara", bookId: "book_x", description: "d" }));

  assert.equal(patch.description, "d");
  assert.equal("id" in patch, false);
  assert.equal("bookId" in patch, false);
  assert.equal("createdAt" in patch, false);
});

test("a card template carries text and settings but not identity", () => {
  const patch = cardTemplateFromCard(createCard({ name: "Mara", description: "d", tags: ["npc"], avatarDataUrl: "data:x", bookId: "book_x" }));

  assert.equal(patch.description, "d");
  assert.deepEqual(patch.tags, ["npc"]);
  assert.equal("name" in patch, false);
  assert.equal("avatarDataUrl" in patch, false);
  assert.equal("bookId" in patch, false);
});

test("built-in card templates produce valid cards", () => {
  assert.ok(CARD_TEMPLATES.length >= 3);

  for (const template of CARD_TEMPLATES) {
    assert.equal(getCardTemplate(template.id), template);
    assert.ok(createCard(template.patch).description.length > 0);
  }
});
