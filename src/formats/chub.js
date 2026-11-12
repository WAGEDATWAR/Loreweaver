import { chubAdapter as shared } from "../content-format/adapters.js";
import { toProject } from "./helpers.js";

/** Chub lorebook (the shared adapter, adapted to Loreweaver's project result). */
export const chubAdapter = {
  ...shared,
  parse(input, options = {}) {
    const parsed = shared.parse(input, options);
    if (!parsed.ok) {
      return parsed;
    }
    return { ...parsed, project: toProject(parsed.books), warnings: parsed.warnings ?? [] };
  },
};
