import assert from "node:assert/strict";
import test from "node:test";
import { detectCardSpec, parseCard, serializeCard, validateCard } from "../src/cardCodec.js";

const v3 = {
  spec: "chara_card_v3",
  spec_version: "3.0",
  data: {
    name: "Mara Voss",
    personality: "Gruff, careful",
    scenario: "The harbor",
    first_mes: "Tide's turning.",
    alternate_greetings: ["You again."],
    mes_example: "{{user}}: Hi\n{{char}}: Hm.",
    creator: "someone",
    creator_notes: "A harbormaster.",
    tags: ["npc"],
    character_book: { entries: {} },
    unknown_card_field: "kept"
  }
};

test("detects a V3 wrapper", () => {
  const result = detectCardSpec(v3);
  assert.equal(result.ok, true);
  assert.equal(result.wrapped, true);
});

test("detects a bare legacy card", () => {
  const result = detectCardSpec({ name: "Old", first_mes: "Hi" });
  assert.equal(result.ok, true);
  assert.equal(result.spec, "chara_card_v2");
  assert.equal(result.wrapped, false);
});

test("rejects an unknown spec", () => {
  const result = detectCardSpec({ spec: "chara_card_v9", data: {} });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unknown-spec");
});

test("rejects unrelated JSON", () => {
  assert.equal(detectCardSpec({ hello: "world" }).ok, false);
  assert.equal(validateCard({ hello: "world" }).ok, false);
});

test("parses a card and keeps unknown fields", () => {
  const result = parseCard(v3);
  assert.equal(result.ok, true);
  assert.equal(result.card.name, "Mara Voss");
  assert.deepEqual(result.card.alternateGreetings, ["You again."]);
  assert.deepEqual(result.card.tags, ["npc"]);
  assert.equal(result.card.extensions.sourceFields.unknown_card_field, "kept");
  assert.match(result.warnings.join(" "), /embedded lorebook/);
});

test("warns on a nameless card", () => {
  const result = validateCard({ spec: "chara_card_v3", data: { first_mes: "Hi" } });
  assert.equal(result.ok, true);
  assert.ok(result.warnings.some((warning) => /no name/.test(warning)));
});

test("round-trips through serialize and parse", () => {
  const parsed = parseCard(v3);
  const out = serializeCard(parsed.card);
  const again = parseCard(out);
  assert.equal(again.ok, true);
  assert.equal(again.card.name, "Mara Voss");
  assert.equal(again.card.extensions.sourceFields.unknown_card_field, "kept");
});
