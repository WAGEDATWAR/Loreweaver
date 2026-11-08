import assert from "node:assert/strict";
import test from "node:test";
import { buildZip, isZip, listZip } from "../src/zip.js";

function entry(name, text) {
  return { name, bytes: new TextEncoder().encode(text) };
}

test("builds a zip and lists its entries", async () => {
  const zip = buildZip([entry("card.json", '{"a":1}'), entry("assets/one.txt", "hi")]);
  assert.equal(isZip(zip), true);

  const parsed = listZip(zip);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.entries.map((item) => item.name), ["card.json", "assets/one.txt"]);
  assert.equal(new TextDecoder().decode(await parsed.entries[0].read()), '{"a":1}');
});

test("skips directory entries", () => {
  const zip = buildZip([entry("assets/", ""), entry("card.json", "{}")]);
  const parsed = listZip(zip);
  assert.deepEqual(parsed.entries.map((item) => item.name), ["card.json"]);
});

test("rejects a non-zip", () => {
  assert.equal(isZip(new Uint8Array([1, 2, 3])), false);
  assert.equal(listZip(new Uint8Array([1, 2, 3])).ok, false);
});

test("reads a deflated entry", async () => {
  const data = new TextEncoder().encode('{"name":"Mara"}'.repeat(20));
  const compressed = new Uint8Array(await new Response(
    new Blob([data]).stream().pipeThrough(new CompressionStream("deflate-raw"))
  ).arrayBuffer());

  const name = new TextEncoder().encode("card.json");
  const crc = 0;
  const header = new Uint8Array(30 + name.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 8, true);
  view.setUint32(18, compressed.length, true);
  view.setUint32(22, data.length, true);
  view.setUint16(26, name.length, true);
  header.set(name, 30);

  const zip = new Uint8Array(header.length + compressed.length);
  zip.set(header, 0);
  zip.set(compressed, header.length);

  const parsed = listZip(zip);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.entries[0].name, "card.json");
  assert.equal(new TextDecoder().decode(await parsed.entries[0].read()), new TextDecoder().decode(data));
  void crc;
});
