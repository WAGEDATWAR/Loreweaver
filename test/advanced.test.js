import assert from "node:assert/strict";
import test from "node:test";
import { advancedFieldsFor, readAdvancedField, writeAdvancedField } from "../src/advanced.js";

test("lists advanced fields only for frontend-sourced entries", () => {
  const st = { extensions: { source: "sillytavern", sourceFields: { depth: 4, role: "system" } } };
  const native = { extensions: {} };

  assert.deepEqual(advancedFieldsFor(st).map((field) => field.key), ["depth", "role"]);
  assert.deepEqual(advancedFieldsFor(native), []);
  assert.deepEqual(advancedFieldsFor(null), []);
});

test("reads and writes an advanced field without touching others", () => {
  const entry = { extensions: { source: "sillytavern", sourceFields: { depth: 4, custom: "keep" } } };
  const updated = writeAdvancedField(entry, "depth", 8);

  assert.equal(readAdvancedField(updated, "depth"), 8);
  assert.equal(readAdvancedField(updated, "custom"), "keep");
  assert.equal(readAdvancedField(entry, "depth"), 4);
});

test("deletes a field when cleared", () => {
  const entry = { extensions: { source: "chub", sourceFields: { sticky: 2 } } };
  const updated = writeAdvancedField(entry, "sticky", "");

  assert.equal(readAdvancedField(updated, "sticky"), undefined);
});

test("maps numeric roles for ST entries", () => {
  const entry = { extensions: { source: "sillytavern", sourceFields: { role: 2 } } };
  assert.equal(readAdvancedField(entry, "role"), "assistant");

  const updated = writeAdvancedField(entry, "role", "user");
  assert.equal(updated.extensions.sourceFields.role, 1);
});
