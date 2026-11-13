import { SCHEMA_VERSION } from "./schema.js";

// Ordered, append-only list of schema migrations. Each entry upgrades project
// data from `from` to `to`. Never edit a released migration; add a new one.
const MIGRATIONS = [
  {
    from: 1,
    to: 2,
    description: "Backfill entry notes and tags plus book tags and token budget.",
    migrate(data) {
      return {
        ...data,
        version: 2,
        books: (Array.isArray(data.books) ? data.books : []).map(migrateBook)
      };
    }
  },
  {
    from: 2,
    to: 3,
    description: "Add the character card collection.",
    migrate(data) {
      return {
        ...data,
        version: 3,
        cards: Array.isArray(data.cards) ? data.cards : []
      };
    }
  },
  {
    from: 3,
    to: 4,
    description: "Add card description, nickname, group greetings, depth prompt and talkativeness.",
    migrate(data) {
      return {
        ...data,
        version: 4,
        cards: (Array.isArray(data.cards) ? data.cards : []).map(migrateCard)
      };
    }
  }
];

function migrateCard(card) {
  const source = card && typeof card === "object" ? card : {};
  const fields = source.extensions?.sourceFields;
  const legacyDescription = fields && typeof fields.description === "string" ? fields.description : "";
  const rest = { ...(fields && typeof fields === "object" ? fields : {}) };
  delete rest.description;
  delete rest.nickname;
  delete rest.group_only_greetings;

  return {
    ...source,
    description: typeof source.description === "string" ? source.description : legacyDescription,
    nickname: typeof source.nickname === "string"
      ? source.nickname
      : typeof fields?.nickname === "string" ? fields.nickname : "",
    groupOnlyGreetings: Array.isArray(source.groupOnlyGreetings)
      ? source.groupOnlyGreetings
      : Array.isArray(fields?.group_only_greetings) ? fields.group_only_greetings : [],
    extensions: fields ? { ...source.extensions, sourceFields: rest } : source.extensions
  };
}

function migrateBook(book) {
  const source = book && typeof book === "object" ? book : {};
  const entries = Array.isArray(source.entries) ? source.entries.map(migrateEntry) : [];

  return {
    ...source,
    tags: Array.isArray(source.tags) ? source.tags : [],
    tokenBudget: Number.isFinite(source.tokenBudget) ? source.tokenBudget : 0,
    entries
  };
}

function migrateEntry(entry) {
  const source = entry && typeof entry === "object" ? entry : {};

  return {
    ...source,
    notes: typeof source.notes === "string" ? source.notes : "",
    tags: Array.isArray(source.tags) ? source.tags : []
  };
}

export function isMigratableProject(data) {
  return Boolean(data)
    && typeof data === "object"
    && !Array.isArray(data)
    && Array.isArray(data.books);
}

function readVersion(data) {
  return Number.isFinite(data?.version) ? Math.max(1, Math.floor(data.version)) : 1;
}

export function migrateProjectData(data) {
  if (!isMigratableProject(data)) {
    return { data, applied: [], from: null, newer: false, isProject: false };
  }

  const from = readVersion(data);
  let current = data;
  const applied = [];

  for (const migration of MIGRATIONS) {
    if (readVersion(current) === migration.from) {
      current = migration.migrate(current);
      applied.push({ from: migration.from, to: migration.to, description: migration.description });
    }
  }

  return {
    data: { ...current, version: SCHEMA_VERSION },
    applied,
    from,
    newer: from > SCHEMA_VERSION,
    isProject: true
  };
}
