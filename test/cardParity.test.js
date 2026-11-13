import assert from "node:assert/strict";
import test from "node:test";
import { cardLossWarnings, parseCard, serializeCard } from "../src/cardCodec.js";
import { cardAdapter } from "../src/formats/card.js";
import { createBook, createCard, createEntry } from "../src/schema.js";
import { writeCardChunk, readCardChunk } from "../src/cardPng.js";

const v3 = {
  spec: "chara_card_v3",
  spec_version: "3.0",
  data: {
    name: "Mara Voss",
    description: "A smuggler with a silver tongue.",
    personality: "wry",
    scenario: "A dockside bar.",
    first_mes: "Keep your voice down.",
    mes_example: "<START>\n{{user}}: Hi\n{{char}}: Hm.",
    creator_notes: "Notes",
    system_prompt: "",
    post_history_instructions: "",
    alternate_greetings: ["You again."],
    group_only_greetings: ["Evening, all."],
    nickname: "Mara",
    tags: ["npc"],
    creator: "me",
    character_version: "1.2",
    extensions: { talkativeness: "0.8", world: "Aurora Vale", depth_prompt: { prompt: "Stay in voice", depth: 3, role: "system" }, custom_vendor: { keep: true } },
    assets: [{ type: "icon", uri: "ccdefault:", name: "main", ext: "png" }],
    creation_date: 1700000000,
    mystery: "kept"
  }
};

test("reads description, nickname, group greetings and extensions", () => {
  const { card } = parseCard(v3);

  assert.equal(card.description, "A smuggler with a silver tongue.");
  assert.equal(card.nickname, "Mara");
  assert.deepEqual(card.groupOnlyGreetings, ["Evening, all."]);
  assert.equal(card.talkativeness, 0.8);
  assert.deepEqual(card.depthPrompt, { prompt: "Stay in voice", depth: 3, role: "system" });
  assert.deepEqual(card.extensions.cardExtensions.custom_vendor, { keep: true });
  assert.equal(card.extensions.cardExtensions.world, "Aurora Vale");
  assert.equal(card.extensions.sourceFields.mystery, "kept");
  assert.ok(card.extensions.sourceFields.assets);
});

test("a V3 card round-trips every field including vendor extensions", () => {
  const { card } = parseCard(v3);
  const out = serializeCard(card, { now: 1800000000000 });
  const again = parseCard(out).card;

  assert.equal(out.spec, "chara_card_v3");
  assert.equal(out.data.description, v3.data.description);
  assert.deepEqual(out.data.extensions.custom_vendor, { keep: true });
  assert.equal(out.data.extensions.world, "Aurora Vale");
  assert.deepEqual(out.data.assets, v3.data.assets);
  assert.equal(out.data.creation_date, 1700000000);
  assert.equal(out.data.modification_date, 1800000000);
  assert.equal(out.data.mystery, "kept");
  assert.deepEqual(again.alternateGreetings, ["You again."]);
  assert.equal(again.depthPrompt.depth, 3);
});

test("a V2 export drops V3-only fields and says so", () => {
  const { card } = parseCard(v3);
  const out = serializeCard(card, { spec: "v2" });

  assert.equal(out.spec, "chara_card_v2");
  assert.equal(out.spec_version, "2.0");
  assert.equal("nickname" in out.data, false);
  assert.equal("group_only_greetings" in out.data, false);
  assert.equal("assets" in out.data, false);
  assert.equal(out.data.description, v3.data.description);
  assert.match(cardLossWarnings(card, "v2").join(" "), /nickname.*group-only greetings.*assets/);
  assert.deepEqual(cardLossWarnings(card, "v3"), []);
});

test("a V3 card without a first message or personality still imports", () => {
  const result = parseCard({ spec: "chara_card_v3", data: { name: "Bare", description: "Only a description." } });

  assert.equal(result.ok, true);
  assert.equal(result.card.description, "Only a description.");
});

test("a flat V1 card imports and upgrades on export", () => {
  const result = parseCard({ name: "Old", description: "d", personality: "p", scenario: "s", first_mes: "hi", mes_example: "e", avatar: "none" });

  assert.equal(result.ok, true);
  assert.equal(result.card.avatarDataUrl, "");
  assert.equal(serializeCard(result.card).spec, "chara_card_v3");
});

test("lorebooks are not mistaken for cards", () => {
  assert.equal(parseCard({ name: "A book", description: "lore", entries: {} }).ok, false);
});

test("exports an embedded book through the character book adapter", () => {
  const book = createBook({
    name: "Aurora Vale",
    entries: [createEntry({ title: "Harbor", keys: ["harbor"], content: "Bells.", probability: 80, order: 7 })]
  });
  const card = createCard({ name: "Mara", firstMessage: "Hi" });
  const out = cardAdapter.exportCard(card, { format: "json-v3", book });
  const parsed = JSON.parse(out.json);
  const entry = parsed.data.character_book.entries[0];

  assert.equal(out.ok, true);
  assert.equal(entry.name, "Harbor");
  assert.equal(entry.insertion_order, 7);
  assert.deepEqual(entry.keys, ["harbor"]);
  assert.equal(out.filename, "mara.v3.json");
});

test("a PNG export carries both ccv3 and chara", () => {
  const png = new Uint8Array(Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"
  ));
  const dataUrl = `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
  const card = createCard({ name: "Mara", description: "d", avatarDataUrl: dataUrl });
  const out = cardAdapter.exportCard(card, { format: "png" });
  const text = Buffer.from(out.bytes).toString("latin1");

  assert.equal(out.ok, true);
  assert.ok(text.includes("ccv3\u0000"));
  assert.ok(text.includes("chara\u0000"));
  assert.equal(JSON.parse(readCardChunk(out.bytes).text).spec, "chara_card_v3");
  assert.equal(writeCardChunk(png, "{}").ok, true);
});

test("a PNG export without an image falls back to JSON with a warning", () => {
  const out = cardAdapter.exportCard(createCard({ name: "Mara" }), { format: "png" });

  assert.equal(out.ok, true);
  assert.ok(out.json);
  assert.match(out.warnings.join(" "), /no PNG image/);
});

test("a PNG export re-imports with description, extensions and the embedded book", async () => {
  const png = new Uint8Array(Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"
  ));
  const dataUrl = `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
  const { card } = parseCard(v3);
  card.avatarDataUrl = dataUrl;
  const book = createBook({ name: "Aurora Vale", entries: [createEntry({ title: "Harbor", keys: ["harbor"], content: "Bells." })] });
  const out = cardAdapter.exportCard(card, { format: "png", book });
  const again = await cardAdapter.parse(out.bytes);

  assert.equal(again.ok, true);
  assert.equal(again.project.cards[0].description, v3.data.description);
  assert.deepEqual(again.project.cards[0].extensions.cardExtensions.custom_vendor, { keep: true });
  assert.equal(again.project.books[0].entries[0].title, "Harbor");
  assert.ok(again.project.cards[0].avatarDataUrl.startsWith("data:image/png"));
});
