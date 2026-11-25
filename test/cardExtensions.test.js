import assert from "node:assert/strict";
import test from "node:test";
import { applyCardExtras, checkCardExtras, compileFindRegex, createAsset, createRegexScript, hasCardExtras, readCardExtras } from "../src/cardExtensions.js";
import { parseCard, serializeCard } from "../src/cardCodec.js";

const sample = () => ({
  spec: "chara_card_v3",
  cardExtensions: {
    world: "Aurora Vale",
    fav: true,
    talkativeness: 0.4,
    regex_scripts: [{ id: "r1", scriptName: "Trim", findRegex: "/\*+/g", replaceString: "", trimStrings: ["*"], placement: [2], disabled: false, markdownOnly: true, substituteRegex: 1, minDepth: 1, maxDepth: null }],
    unknown_ext: { keep: "me" }
  },
  sourceFields: {
    assets: [{ type: "icon", uri: "ccdefault:", name: "main", ext: "png", extra: 1 }],
    source: ["https://example.com/a"],
    creator_notes_multilingual: { en: "Hi", fr: "Salut" }
  }
});

test("reads every extra from the preserved buckets", () => {
  const extras = readCardExtras(sample());

  assert.equal(extras.world, "Aurora Vale");
  assert.equal(extras.fav, true);
  assert.equal(extras.regexScripts[0].scriptName, "Trim");
  assert.deepEqual(extras.regexScripts[0].placement, [2]);
  assert.equal(extras.assets[0].uri, "ccdefault:");
  assert.deepEqual(extras.notes, [{ lang: "en", text: "Hi" }, { lang: "fr", text: "Salut" }]);
  assert.equal(hasCardExtras(extras), true);
  assert.equal(hasCardExtras(readCardExtras({})), false);
});

test("an untouched round trip changes nothing", () => {
  const before = sample();
  const after = applyCardExtras(before, readCardExtras(before));

  assert.deepEqual(after.cardExtensions, { ...before.cardExtensions, regex_scripts: [{ ...before.cardExtensions.regex_scripts[0] }] });
  assert.deepEqual(after.sourceFields, before.sourceFields);
  assert.equal(after.spec, "chara_card_v3");
});

test("editing keeps the fields the editor does not show", () => {
  const extras = readCardExtras(sample());
  extras.regexScripts[0].replaceString = "x";
  extras.regexScripts[0].maxDepth = 3;
  extras.assets[0].name = "avatar";
  const after = applyCardExtras(sample(), extras);

  assert.equal(after.cardExtensions.regex_scripts[0].substituteRegex, 1);
  assert.equal(after.cardExtensions.regex_scripts[0].maxDepth, 3);
  assert.equal(after.cardExtensions.regex_scripts[0].replaceString, "x");
  assert.equal(after.sourceFields.assets[0].extra, 1);
  assert.equal(after.sourceFields.assets[0].name, "avatar");
  assert.deepEqual(after.cardExtensions.unknown_ext, { keep: "me" });
});

test("clearing an extra removes its key; adding creates it", () => {
  const extras = readCardExtras(sample());
  extras.world = "";
  extras.regexScripts = [];
  extras.sources = [];
  extras.notes = [];
  const cleared = applyCardExtras(sample(), extras);

  assert.equal("world" in cleared.cardExtensions, false);
  assert.equal("regex_scripts" in cleared.cardExtensions, false);
  assert.equal("source" in cleared.sourceFields, false);
  assert.equal("creator_notes_multilingual" in cleared.sourceFields, false);

  const added = readCardExtras({});
  added.regexScripts.push(createRegexScript(() => "id_1"));
  added.assets.push(createAsset());
  const created = applyCardExtras({}, added);

  assert.equal(created.cardExtensions.regex_scripts[0].id, "id_1");
  assert.equal(created.sourceFields.assets[0].type, "icon");
});

test("flags broken regex scripts and assets", () => {
  const extras = readCardExtras({});
  extras.regexScripts = [
    { ...createRegexScript(), findRegex: "(" },
    { ...createRegexScript(), findRegex: "" },
    { ...createRegexScript(), findRegex: "ok", placement: [] }
  ];
  extras.assets = [{ ...createAsset(), uri: "" }, { ...createAsset(), uri: "javascript:alert(1)" }];

  assert.deepEqual(checkCardExtras(extras).map((issue) => issue.code), ["bad-regex-script", "empty-regex-script", "regex-script-no-placement", "asset-no-uri", "asset-unsafe-uri"]);
  assert.equal(compileFindRegex("/a+/gi").ok, true);
  assert.equal(compileFindRegex("/(/").ok, false);
});

test("edited extras survive a V3 card export and re-import", () => {
  const card = parseCard({ spec: "chara_card_v3", spec_version: "3.0", data: { name: "Mara", extensions: { world: "W" }, assets: [{ type: "icon", uri: "u", name: "main", ext: "png" }] } }).card;
  const extras = readCardExtras(card.extensions);
  extras.world = "Aurora";
  extras.regexScripts.push(createRegexScript(() => "r9"));
  card.extensions = applyCardExtras(card.extensions, extras);

  const again = parseCard(serializeCard(card, { spec: "v3" })).card;
  const read = readCardExtras(again.extensions);

  assert.equal(read.world, "Aurora");
  assert.equal(read.regexScripts[0].raw.id, "r9");
  assert.equal(read.assets[0].uri, "u");
});
