import { contentFormatAdapter as shared } from "../content-format/adapters.js";
import { toProject } from "./helpers.js";

/** The canonical interchange file, adapted to Loreweaver's project result. */
export const contentFormatAdapter = {
  ...shared,
  parse(input, options = {}) {
    const parsed = shared.parse(input, options);
    if (!parsed.ok) {
      return parsed;
    }
    return { ...parsed, project: toProject(parsed.books), warnings: parsed.warnings ?? [] };
  },
};
