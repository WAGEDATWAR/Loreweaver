import assert from "node:assert/strict";
import test from "node:test";
import { parseLorebook, serializeBook } from "../src/content-format/index.js";
import { parseProject, serializeLorebook } from "../src/format.js";

/** The interchange fixture another frontend writes and reads (see Synthesis's copy). */
const INTERCHANGE = {
  app: "content-format",
  version: 1,
  books: [
    {
      name: "Ashfall",
      description: "Notes on the town.",
      tags: ["town"],
      entries: [
        {
          id: "entry.1",
          title: "The gate",
          keys: ["gate"],
          secondaryKeys: ["wall"],
          content: "Iron, and older than the wall.",
          position: "before_char",
          order: 100,
          enabled: true,
          constant: false,
          selective: false,
          caseSensitive: false,
          matchWholeWords: false,
          probability: 100,
          notes: "",
          extensions: {},
        },
      ],
    },
  ],
};

test("reads the interchange file another frontend writes", () => {
  const parsed = parseLorebook(INTERCHANGE);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.formatId, "content-format");
  const entry = parsed.books[0].entries[0];
  assert.equal(entry.title, "The gate");
  assert.deepEqual(entry.keys, ["gate"]);
  assert.equal(entry.content, "Iron, and older than the wall.");
});

test("keeps the author's entry title (not just the first key)", () => {
  const parsed = parseLorebook(INTERCHANGE);
  assert.notEqual(parsed.books[0].entries[0].title, "gate");
});

test("a Loreweaver project reads the interchange file and writes it back", async () => {
  const imported = await parseProject(JSON.stringify(INTERCHANGE));
  assert.equal(imported.ok, true);
  const book = imported.project.books[0];
  assert.equal(book.entries[0].title, "The gate");

  const exported = serializeLorebook("content-format", book);
  assert.equal(exported.ok, true);
  const reparsed = parseLorebook(exported.data);
  assert.equal(reparsed.ok, true);
  assert.equal(reparsed.books[0].entries[0].title, "The gate");
  assert.deepEqual(reparsed.books[0].entries[0].keys, ["gate"]);
});

test("every book format round-trips an entry title and keys", () => {
  const canonical = parseLorebook(INTERCHANGE).books[0];
  for (const formatId of ["content-format", "sillytavern", "chub", "characterbook"]) {
    const out = serializeBook(canonical, formatId);
    assert.equal(out.ok, true, formatId);
    const back = parseLorebook(out.data, { adapterId: formatId === "characterbook" ? "chub" : formatId });
    assert.equal(back.ok, true, formatId);
    assert.equal(back.books[0].entries[0].title, "The gate", formatId);
    assert.deepEqual(back.books[0].entries[0].keys, ["gate"], formatId);
  }
});
