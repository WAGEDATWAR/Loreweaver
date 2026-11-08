import assert from "node:assert/strict";
import test from "node:test";
import { parseProject, serializeLorebook } from "../src/format.js";
import { LEGACY_APP_ID, createProject } from "../src/schema.js";
import { migrateLegacyLocalStorage } from "../src/storage/legacy.js";
import { legacyKeyToCurrent, storageKey } from "../src/storage/namespace.js";

function createMemoryStorage(entries = {}) {
  const storage = { ...entries };

  storage.getItem = (key) => (Object.hasOwn(storage, key) ? storage[key] : null);
  storage.setItem = (key, value) => {
    storage[key] = String(value);
  };
  storage.removeItem = (key) => {
    delete storage[key];
  };

  return storage;
}

test("maps legacy storage keys to the current namespace", async () => {
  assert.equal(storageKey("project:v1"), "loreweaver:project:v1");
  assert.equal(legacyKeyToCurrent("lorebook-studio:project:v1"), "loreweaver:project:v1");
  assert.equal(legacyKeyToCurrent("loreweaver:project:v1"), null);
  assert.equal(legacyKeyToCurrent("unrelated"), null);
});

test("migrates legacy localStorage keys without overwriting current ones", async () => {
  const storage = createMemoryStorage({
    "lorebook-studio:sort:v1": "title",
    "lorebook-studio:onboarded:v1": "1",
    "loreweaver:onboarded:v1": "0",
    "unrelated:key": "keep"
  });

  const result = migrateLegacyLocalStorage(storage);

  assert.equal(result.migrated, 1);
  assert.equal(storage.getItem("loreweaver:sort:v1"), "title");
  assert.equal(storage.getItem("loreweaver:onboarded:v1"), "0");
  assert.equal(storage.getItem("lorebook-studio:sort:v1"), null);
  assert.equal(storage.getItem("lorebook-studio:onboarded:v1"), null);
  assert.equal(storage.getItem("unrelated:key"), "keep");
});

test("still imports legacy native project files", async () => {
  const parsed = await parseProject(JSON.stringify({
    app: LEGACY_APP_ID,
    version: 2,
    books: [{
      name: "Legacy Book",
      entries: [{ title: "Legacy Entry", keys: ["legacy"], content: "Old content" }]
    }]
  }));

  assert.equal(parsed.ok, true);
  assert.equal(parsed.formatId, "native");
  assert.equal(parsed.project.books[0].name, "Legacy Book");
});

test("serializes native projects with the current app id and filename", async () => {
  const book = createProject({
    books: [{ name: "Harbor Secrets", entries: [{ title: "Harbor", content: "Content" }] }]
  }).books[0];

  const exported = serializeLorebook("native", book);

  assert.equal(exported.ok, true);
  assert.equal(exported.data.app, "loreweaver");
  assert.equal(exported.filename, "harbor-secrets-loreweaver.json");
});
