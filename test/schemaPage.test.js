import assert from "node:assert/strict";
import test from "node:test";
import { ENTRY_COLOR_VALUES, POSITIONS, SCHEMA_VERSION } from "../src/schema.js";
import { buildSchemaPage, schemaPageFieldNames } from "../src/schemaPage.js";

test("reports the current schema version", () => {
  assert.equal(buildSchemaPage().version, SCHEMA_VERSION);
});

test("covers every section", () => {
  const sections = schemaPageFieldNames().map((section) => section.id);
  assert.deepEqual(sections, ["project", "book", "entry", "card"]);
});

test("entry rows cover every canonical entry field", () => {
  const entry = createSampleEntry();
  const documented = new Set(schemaPageFieldNames().find((section) => section.id === "entry").fields);

  for (const key of Object.keys(entry)) {
    if (["createdAt", "updatedAt"].includes(key)) {
      assert.ok(documented.has("createdAt / updatedAt"), `${key} is documented`);
      continue;
    }

    if (key === "tokenLimit" || key === "charLimit") {
      assert.ok(documented.has("tokenLimit / charLimit"), `${key} is documented`);
      continue;
    }

    assert.ok(documented.has(key), `${key} is documented`);
  }
});

test("position and colour enums match the model", () => {
  const page = buildSchemaPage();
  const entry = page.sections.find((section) => section.id === "entry");
  const position = entry.fields.find((field) => field.name === "position");
  const color = entry.fields.find((field) => field.name === "color");

  for (const value of POSITIONS.map((item) => item.value)) {
    assert.match(position.note, new RegExp(value));
  }

  for (const value of ENTRY_COLOR_VALUES) {
    assert.ok(color.note.includes(value || "(none)"));
  }
});

function createSampleEntry() {
  // Rebuilt here so the test reads the model, not a fixture.
  return {
    id: "",
    title: "",
    keys: [],
    secondaryKeys: [],
    tags: [],
    content: "",
    notes: "",
    enabled: true,
    constant: false,
    selective: false,
    caseSensitive: false,
    matchWholeWords: false,
    order: 0,
    position: "before_char",
    probability: 100,
    tokenLimit: 0,
    charLimit: 0,
    color: "",
    extensions: {},
    createdAt: 0,
    updatedAt: 0
  };
}
