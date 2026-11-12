/**
 * The shared lorebook interchange package (Y-17).
 *
 * One canonical model and one adapter set, owned here and read by Loreweaver and by any frontend
 * that vendors it. Pure and dependency-free so it runs in a browser, in Node and in a build.
 */
export { FORMAT_ID, FORMAT_VERSION, POSITIONS, isRecord, normalizeKeyList, normalizeTagList } from "./model.js";
export { normalizeLorebook, normalizeEntry, resolveLorebook } from "./model.js";
export { BOOK_ADAPTERS, EXPORT_FORMATS, adapterById, characterBookAdapter, chubAdapter, contentFormatAdapter, sillyTavernAdapter } from "./adapters.js";

import { BOOK_ADAPTERS, adapterById } from "./adapters.js";

/** The adapter that would read this input, or null. */
export function detectLorebook(input) {
  let best = null;
  let score = 0;
  for (const adapter of BOOK_ADAPTERS) {
    const candidate = adapter.detect(input);
    if (candidate > score) {
      best = adapter;
      score = candidate;
    }
  }
  return best;
}

/**
 * Read any supported file into canonical books.
 * Returns `{ ok, books, book, format, formatId, warnings }` or `{ ok: false, error }`.
 */
export function parseLorebook(input, options = {}) {
  const adapter = options.adapterId ? adapterById(options.adapterId) : detectLorebook(input);
  if (!adapter) return { ok: false, error: "That file isn't a supported lorebook." };
  const parsed = adapter.parse(input, options);
  if (!parsed.ok) return parsed;
  const books = parsed.books ?? (parsed.book ? [parsed.book] : []);
  return { ...parsed, books, book: books[0] ?? null, formatId: adapter.id, format: parsed.format ?? adapter.label };
}

/** Write a canonical book in a format (`serializeBook(book, formatId)`). */
export function serializeBook(book, formatId = "content-format") {
  const adapter = adapterById(formatId);
  if (!adapter) return { ok: false, error: `no lorebook format "${formatId}"` };
  return adapter.serialize(book);
}
