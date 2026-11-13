import assert from "node:assert/strict";
import test from "node:test";

const { requestPersistence } = await import("../src/storage.js");

function withNavigator(storage, run) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { value: { storage }, configurable: true });

  return Promise.resolve(run()).finally(() => {
    if (original) {
      Object.defineProperty(globalThis, "navigator", original);
    } else {
      delete globalThis.navigator;
    }
  });
}

test("reports unsupported without the persist API", async () => {
  await withNavigator({}, async () => {
    assert.deepEqual(await requestPersistence(), { supported: false, persisted: false });
  });
});

test("does not ask again when storage is already persisted", async () => {
  let asked = false;

  await withNavigator({ persisted: async () => true, persist: async () => { asked = true; return true; } }, async () => {
    assert.deepEqual(await requestPersistence(), { supported: true, persisted: true });
  });
  assert.equal(asked, false);
});

test("requests persistence and reports a denial", async () => {
  await withNavigator({ persisted: async () => false, persist: async () => false }, async () => {
    assert.deepEqual(await requestPersistence(), { supported: true, persisted: false });
  });
});

test("survives a throwing persist call", async () => {
  await withNavigator({ persist: async () => { throw new Error("blocked"); } }, async () => {
    assert.deepEqual(await requestPersistence(), { supported: true, persisted: false });
  });
});
