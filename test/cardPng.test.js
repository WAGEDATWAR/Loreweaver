import assert from "node:assert/strict";
import test from "node:test";
import { isPng, readCardChunk, readChunks, writeCardChunk } from "../src/cardPng.js";

function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  return out;
}

function pngWithCard(text, { legacy = false } = {}) {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = chunk("IHDR", new Uint8Array(13));
  const keyword = legacy ? "chara" : "ccv3";
  const payload = new TextEncoder().encode(`${keyword}\u0000${btoa(text)}`);
  const card = chunk("tEXt", payload);
  const idat = chunk("IDAT", new Uint8Array([1, 2, 3]));
  const iend = chunk("IEND", new Uint8Array(0));
  const total = new Uint8Array(signature.length + ihdr.length + card.length + idat.length + iend.length);
  let offset = 0;

  for (const part of [signature, ihdr, card, idat, iend]) {
    total.set(part, offset);
    offset += part.length;
  }

  return total;
}

test("recognizes a png signature", () => {
  assert.equal(isPng(pngWithCard("{}")), true);
  assert.equal(isPng(new Uint8Array([1, 2, 3])), false);
});

test("walks the chunk table", () => {
  const parsed = readChunks(pngWithCard("{}"));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.chunks.map((item) => item.type), ["IHDR", "tEXt", "IDAT", "IEND"]);
});

test("reads a ccv3 card chunk", () => {
  const result = readCardChunk(pngWithCard('{"name":"Mara"}'));
  assert.equal(result.ok, true);
  assert.equal(result.text, '{"name":"Mara"}');
});

test("reads the legacy chara chunk", () => {
  const result = readCardChunk(pngWithCard('{"name":"Old"}', { legacy: true }));
  assert.equal(result.ok, true);
  assert.equal(result.text, '{"name":"Old"}');
});

test("reports a png with no card", () => {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = chunk("IDAT", new Uint8Array([1]));
  const bytes = new Uint8Array(signature.length + idat.length);
  bytes.set(signature, 0);
  bytes.set(idat, signature.length);
  const result = readCardChunk(bytes);
  assert.equal(result.ok, false);
  assert.match(result.error, /no character card/);
});

test("rejects a non-png", () => {
  assert.equal(readCardChunk(new Uint8Array([1, 2, 3])).ok, false);
  assert.equal(writeCardChunk(new Uint8Array([1, 2, 3]), "{}").ok, false);
});

test("replaces an existing card chunk and drops the stale key", () => {
  const original = pngWithCard('{"name":"Old"}', { legacy: true });
  const result = writeCardChunk(original, '{"name":"New"}');
  assert.equal(result.ok, true);

  const read = readCardChunk(result.bytes);
  assert.equal(read.text, '{"name":"New"}');
  const types = readChunks(result.bytes).chunks.filter((item) => item.type === "tEXt");
  assert.equal(types.length, 1);
});

test("inserts a card chunk before IDAT when none exists", () => {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = chunk("IHDR", new Uint8Array(13));
  const idat = chunk("IDAT", new Uint8Array([1]));
  const iend = chunk("IEND", new Uint8Array(0));
  const bytes = new Uint8Array(signature.length + ihdr.length + idat.length + iend.length);
  let offset = 0;

  for (const part of [signature, ihdr, idat, iend]) {
    bytes.set(part, offset);
    offset += part.length;
  }

  const result = writeCardChunk(bytes, '{"name":"Fresh"}');
  assert.equal(result.ok, true);
  const types = readChunks(result.bytes).chunks.map((item) => item.type);
  assert.ok(types.indexOf("tEXt") < types.indexOf("IDAT"));
  assert.equal(readCardChunk(result.bytes).text, '{"name":"Fresh"}');
});

test("decodes a card with the ccv3 chunk taking priority", () => {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = chunk("IHDR", new Uint8Array(13));
  const legacy = chunk("tEXt", new TextEncoder().encode(`chara\u0000${btoa('{"name":"Old"}')}`));
  const modern = chunk("tEXt", new TextEncoder().encode(`ccv3\u0000${btoa('{"name":"New"}')}`));
  const iend = chunk("IEND", new Uint8Array(0));
  const bytes = new Uint8Array(signature.length + ihdr.length + legacy.length + modern.length + iend.length);
  let offset = 0;

  for (const part of [signature, ihdr, legacy, modern, iend]) {
    bytes.set(part, offset);
    offset += part.length;
  }

  assert.equal(readCardChunk(bytes).text, '{"name":"New"}');
});

test("reports bad base64", () => {
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = chunk("IHDR", new Uint8Array(13));
  const bad = chunk("tEXt", new TextEncoder().encode("ccv3\u0000not base64!!"));
  const iend = chunk("IEND", new Uint8Array(0));
  const bytes = new Uint8Array(signature.length + ihdr.length + bad.length + iend.length);
  let offset = 0;

  for (const part of [signature, ihdr, bad, iend]) {
    bytes.set(part, offset);
    offset += part.length;
  }

  assert.match(readCardChunk(bytes).error, /not valid base64|no character card/);
});
