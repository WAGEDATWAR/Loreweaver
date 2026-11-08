import { createBook, createEntry } from "./schema.js";
import { createId } from "./utils.js";

function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function uniqueId(preferred, used, prefix) {
  let id = typeof preferred === "string" && preferred && !used.has(preferred)
    ? preferred
    : createId(prefix);

  while (used.has(id)) {
    id = createId(prefix);
  }

  used.add(id);
  return id;
}

function copyName(name) {
  const base = String(name ?? "").trim() || "Untitled Lorebook";
  return `${base} (copy)`;
}

export function duplicateBook(book) {
  const usedEntryIds = new Set();
  const entries = (book?.entries ?? []).map((entry) => createEntry({
    ...clone(entry),
    id: uniqueId(createId("entry"), usedEntryIds, "entry")
  }));

  return createBook({
    ...clone(book),
    id: createId("book"),
    name: copyName(book?.name),
    entries
  });
}

export function splitPoint(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const half = Math.ceil(list.length / 2);
  return list.slice(half).map((entry) => entry.id);
}

export function splitBook(book, entryIds) {
  const move = new Set(entryIds);
  const keptEntries = (book?.entries ?? []).filter((entry) => !move.has(entry.id));
  const movedEntries = (book?.entries ?? []).filter((entry) => move.has(entry.id));
  const name = String(book?.name ?? "").trim() || "Untitled Lorebook";

  return {
    kept: createBook({ ...clone(book), entries: keptEntries }),
    moved: createBook({ ...clone(book), id: createId("book"), name: `${name} (split)`, entries: movedEntries })
  };
}

export function mergeBookEntries(target, source) {
  const usedEntryIds = new Set((target?.entries ?? []).map((entry) => entry.id));
  const usedSourceIds = new Set(
    (target?.entries ?? [])
      .map((entry) => entry.extensions?.sourceId)
      .filter((value) => value !== undefined && value !== null && String(value).trim())
      .map(String)
  );
  const appended = (source?.entries ?? []).map((entry) => {
    const extensions = { ...(entry.extensions ?? {}) };
    const sourceId = extensions.sourceId;

    if (sourceId !== undefined && sourceId !== null && String(sourceId).trim()) {
      const original = String(sourceId);
      let next = original;

      if (usedSourceIds.has(next)) {
        const parsed = Number(original);

        if (Number.isInteger(parsed) && parsed >= 0) {
          let numeric = parsed;

          while (usedSourceIds.has(String(numeric))) {
            numeric += 1;
          }

          next = String(numeric);
        } else {
          let suffix = 2;

          while (usedSourceIds.has(next)) {
            next = `${original}~${suffix}`;
            suffix += 1;
          }
        }

        extensions.sourceIdRemappedFrom = original;
      }

      usedSourceIds.add(next);
      extensions.sourceId = next;
    }

    return createEntry({
      ...clone(entry),
      id: uniqueId(entry.id, usedEntryIds, "entry"),
      extensions
    });
  });

  return createBook({
    ...clone(target),
    entries: [...(target?.entries ?? []), ...appended]
  });
}
