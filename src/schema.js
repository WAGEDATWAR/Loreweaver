import { clamp, createId } from "./utils.js";

export const APP_ID = "loreweaver";
export const LEGACY_APP_ID = "lorebook-studio";
export const SCHEMA_VERSION = 3;

export const POSITIONS = [
  { value: "before_char", label: "Before character" },
  { value: "after_char", label: "After character" },
  { value: "before_an", label: "Before author's note" },
  { value: "after_an", label: "After author's note" },
  { value: "at_depth", label: "At depth" }
];

const POSITION_VALUES = new Set(POSITIONS.map((position) => position.value));

function normalizeExtensions(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function normalizeKeyList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((key) => String(key).trim())
    .filter(Boolean);
}

export function normalizeTagList(value) {
  const seen = new Set();
  const tags = [];

  for (const tag of normalizeKeyList(value)) {
    const normalized = tag.toLocaleLowerCase();

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    tags.push(tag);
  }

  return tags;
}

export function createEntry(patch = {}) {
  const now = Date.now();

  return {
    id: typeof patch.id === "string" && patch.id ? patch.id : createId("entry"),
    title: typeof patch.title === "string" ? patch.title : "",
    keys: normalizeKeyList(patch.keys),
    secondaryKeys: normalizeKeyList(patch.secondaryKeys),
    tags: normalizeTagList(patch.tags),
    content: typeof patch.content === "string" ? patch.content : "",
    notes: typeof patch.notes === "string" ? patch.notes : "",
    enabled: patch.enabled !== false,
    constant: patch.constant === true,
    selective: patch.selective === true,
    caseSensitive: patch.caseSensitive === true,
    matchWholeWords: patch.matchWholeWords === true,
    order: Number.isFinite(patch.order) ? clamp(Math.round(patch.order), 0, 9999) : 100,
    position: POSITION_VALUES.has(patch.position) ? patch.position : "before_char",
    probability: Number.isFinite(patch.probability) ? clamp(Math.round(patch.probability), 0, 100) : 100,
    tokenLimit: Number.isFinite(patch.tokenLimit) ? clamp(Math.round(patch.tokenLimit), 0, 1_000_000) : 0,
    charLimit: Number.isFinite(patch.charLimit) ? clamp(Math.round(patch.charLimit), 0, 1_000_000) : 0,
    createdAt: Number.isFinite(patch.createdAt) ? patch.createdAt : now,
    updatedAt: Number.isFinite(patch.updatedAt) ? patch.updatedAt : now,
    extensions: normalizeExtensions(patch.extensions)
  };
}

export function createBook(patch = {}) {
  const now = Date.now();

  return {
    id: typeof patch.id === "string" && patch.id ? patch.id : createId("book"),
    name: typeof patch.name === "string" ? patch.name : "Untitled Lorebook",
    description: typeof patch.description === "string" ? patch.description : "",
    tags: normalizeTagList(patch.tags),
    tokenBudget: Number.isFinite(patch.tokenBudget) ? clamp(Math.round(patch.tokenBudget), 0, 10_000_000) : 0,
    entries: Array.isArray(patch.entries) ? patch.entries.map((entry) => createEntry(entry)) : [],
    createdAt: Number.isFinite(patch.createdAt) ? patch.createdAt : now,
    updatedAt: Number.isFinite(patch.updatedAt) ? patch.updatedAt : now,
    extensions: normalizeExtensions(patch.extensions)
  };
}

export function createCard(patch = {}) {
  const now = Date.now();

  return {
    id: typeof patch.id === "string" && patch.id ? patch.id : createId("card"),
    name: typeof patch.name === "string" ? patch.name : "",
    personality: typeof patch.personality === "string" ? patch.personality : "",
    scenario: typeof patch.scenario === "string" ? patch.scenario : "",
    firstMessage: typeof patch.firstMessage === "string" ? patch.firstMessage : "",
    alternateGreetings: Array.isArray(patch.alternateGreetings)
      ? patch.alternateGreetings.map((greeting) => String(greeting)).filter(Boolean)
      : [],
    exampleMessages: typeof patch.exampleMessages === "string" ? patch.exampleMessages : "",
    systemPrompt: typeof patch.systemPrompt === "string" ? patch.systemPrompt : "",
    postHistoryInstructions: typeof patch.postHistoryInstructions === "string"
      ? patch.postHistoryInstructions
      : "",
    creator: typeof patch.creator === "string" ? patch.creator : "",
    creatorNotes: typeof patch.creatorNotes === "string" ? patch.creatorNotes : "",
    characterVersion: typeof patch.characterVersion === "string" ? patch.characterVersion : "",
    tags: normalizeTagList(patch.tags),
    avatarDataUrl: typeof patch.avatarDataUrl === "string" ? patch.avatarDataUrl : "",
    bookId: typeof patch.bookId === "string" && patch.bookId ? patch.bookId : null,
    createdAt: Number.isFinite(patch.createdAt) ? patch.createdAt : now,
    updatedAt: Number.isFinite(patch.updatedAt) ? patch.updatedAt : now,
    extensions: normalizeExtensions(patch.extensions)
  };
}

export function createProject(patch = {}) {
  const books = Array.isArray(patch.books) ? patch.books.map((book) => createBook(book)) : [];
  const activeBook = books.find((book) => book.id === patch.activeBookId) ?? books[0] ?? null;
  const activeEntry = activeBook?.entries.find((entry) => entry.id === patch.activeEntryId)
    ?? activeBook?.entries[0]
    ?? null;
  const cards = Array.isArray(patch.cards) ? patch.cards.map((card) => createCard(card)) : [];

  return {
    version: SCHEMA_VERSION,
    activeBookId: activeBook?.id ?? null,
    activeEntryId: activeEntry?.id ?? null,
    ui: { searchQuery: "" },
    books,
    cards
  };
}
