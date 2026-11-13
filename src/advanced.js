/**
 * Advanced SillyTavern/Chub entry fields. They are not canonical fields: an entry only has them if it
 * was imported from a frontend that does, and they round-trip through `extensions.sourceFields`
 * (I-2). Reading and writing them stays source-scoped, so editing them never invents fields for a
 * book imported from a format that lacks them.
 */
export const ADVANCED_FIELDS = [
  { key: "depth", type: "number", label: "Depth", min: 0, max: 1000, step: 1 },
  { key: "role", type: "select", label: "Role", options: ["system", "user", "assistant"] },
  { key: "group", type: "text", label: "Group" },
  { key: "groupWeight", type: "number", label: "Group weight", min: 0, max: 1000000, step: 1 },
  { key: "excludeRecursion", type: "boolean", label: "Exclude recursion" },
  { key: "preventRecursion", type: "boolean", label: "Prevent recursion" },
  { key: "delayUntilRecursion", type: "boolean", label: "Delay until recursion" },
  { key: "sticky", type: "number", label: "Sticky", min: 0, max: 1000000, step: 1 },
  { key: "cooldown", type: "number", label: "Cooldown", min: 0, max: 1000000, step: 1 },
  { key: "scanDepth", type: "number", label: "Scan depth", min: 0, max: 1000, step: 1 }
];

const ROLE_BY_NUMBER = new Map([[0, "system"], [1, "user"], [2, "assistant"]]);
const ROLE_TO_NUMBER = new Map([["system", 0], ["user", 1], ["assistant", 2]]);

export function advancedFieldsFor(entry) {
  const source = entry?.extensions?.source;

  if (source !== "sillytavern" && source !== "chub" && source !== "content-format") {
    return [];
  }

  const fields = entry?.extensions?.sourceFields ?? {};
  return ADVANCED_FIELDS.filter((field) => Object.hasOwn(fields, field.key));
}

export function readAdvancedField(entry, key) {
  const value = entry?.extensions?.sourceFields?.[key];

  if (key === "role" && typeof value === "number" && ROLE_BY_NUMBER.has(value)) {
    return ROLE_BY_NUMBER.get(value);
  }

  return value;
}

export function writeAdvancedField(entry, key, value) {
  const extensions = { ...(entry.extensions ?? {}) };
  const fields = { ...(extensions.sourceFields ?? {}) };

  // Preserve the source's encoding: ST stores role as a number.
  if (key === "role" && typeof value === "string" && ROLE_TO_NUMBER.has(value) && typeof fields.role === "number") {
    fields[key] = ROLE_TO_NUMBER.get(value);
    extensions.sourceFields = fields;
    return { ...entry, extensions };
  }

  if (value === "" || value === undefined || value === null) {
    delete fields[key];
  } else if (typeof value === "number" || typeof value === "boolean") {
    fields[key] = value;
  } else {
    fields[key] = String(value);
  }

  extensions.sourceFields = fields;
  return { ...entry, extensions };
}
