import { createProject } from "../schema.js";
import { normalizeLorebook as normalizeBook } from "../content-format/model.js";

/**
 * Adapter primitives. The model itself lives in `../content-format/model.js` — the one copy shared
 * with any frontend that vendors it (Y-17); this file only adapts it to Loreweaver's project shape.
 */
export {
  isRecord,
  hasOwn,
  readString,
  readNumber,
  readBoolean,
  readKeyList,
  mapPosition,
  mapPositionToNumber,
  copyPreservedFields,
  createUidAllocator,
  createSourceIdAllocator,
  resolveLorebook,
  isEntryCollection,
  getEntryItems,
  collectSourceFields,
  buildLossyWarnings,
} from "../content-format/model.js";

/** Wrap canonical books as a Loreweaver project. */
export function toProject(books) {
  return createProject({ books });
}

/** Normalise any input into a one-book Loreweaver project (the adapter contract). */
export function normalizeLorebook(input, options) {
  const parsed = normalizeBook(input, options);
  if (!parsed.ok) {
    return parsed;
  }
  return { ...parsed, project: createProject({ books: [parsed.book] }) };
}
