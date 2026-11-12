import { characterBookAdapter as shared } from "../content-format/adapters.js";
import { toProject } from "./helpers.js";

/** A standalone character_book (export-first; import is handled by the Chub adapter). */
export const characterBookAdapter = {
  ...shared,
  parse(input, options = {}) {
    const parsed = shared.parse(input, options);
    if (!parsed.ok) {
      return parsed;
    }
    return { ...parsed, project: toProject(parsed.books), warnings: parsed.warnings ?? [] };
  },
};
