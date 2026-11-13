import { ENTRY_COLOR_VALUES, POSITIONS, SCHEMA_VERSION } from "./schema.js";

/**
 * The schema reference page. Generated from the canonical model's own constants so the page cannot
 * drift: a field added to the model without a row here fails `test/schemaPage.test.js`.
 */
const PROJECT_FIELDS = [
  { name: "version", type: "number", note: "Schema version; migrations upgrade older files." },
  { name: "activeBookId", type: "string", note: "The open lorebook, if any." },
  { name: "activeEntryId", type: "string", note: "The open entry, if any." },
  { name: "ui", type: "object", note: "Session state; never exported to interchange formats." },
  { name: "books", type: "Book[]", note: "Every lorebook in the project." },
  { name: "cards", type: "Card[]", note: "Character cards; a sibling record to books (G-16)." },
  { name: "customTemplates", type: "object[]", note: "Saved entry templates with name and patch." }
];

const BOOK_FIELDS = [
  { name: "id", type: "string", note: "Stable `book_` id, never reused (A-5)." },
  { name: "name", type: "string", note: "Author-facing name." },
  { name: "description", type: "string", note: "Shown in the sidebar and kept in native backups." },
  { name: "tags", type: "string[]", note: "App-only labels; dropped by interchange adapters." },
  { name: "tokenBudget", type: "number", note: "0 disables the over-budget warning." },
  { name: "entries", type: "Entry[]", note: "Ordered entries." },
  { name: "extensions", type: "object", note: "Source metadata and preserved book fields (I-2)." },
  { name: "createdAt / updatedAt", type: "number", note: "Epoch milliseconds." }
];

const ENTRY_FIELDS = [
  { name: "id", type: "string", note: "Stable `entry_` id, never reused (A-5)." },
  { name: "title", type: "string", note: "Maps to ST `comment` / character book `name`." },
  { name: "keys", type: "string[]", note: "Primary trigger keys; slash-delimited means regex (E-2)." },
  { name: "secondaryKeys", type: "string[]", note: "AND-ed secondary keys when `selective`." },
  { name: "tags", type: "string[]", note: "App-only labels; dropped by interchange adapters." },
  { name: "content", type: "string", note: "Injected text." },
  { name: "notes", type: "string", note: "Author-only; never exported." },
  { name: "enabled", type: "boolean", note: "Inverse of ST `disable`." },
  { name: "constant", type: "boolean", note: "Always-on entry; skips key matching." },
  { name: "selective", type: "boolean", note: "Require a secondary key." },
  { name: "caseSensitive", type: "boolean", note: "Matching option." },
  { name: "matchWholeWords", type: "boolean", note: "Matching option." },
  { name: "order", type: "number", note: "Insertion order 0-9999." },
  { name: "position", type: "enum", note: `One of ${POSITIONS.map((position) => position.value).join(", ")}.` },
  { name: "probability", type: "number", note: "Trigger chance 0-100." },
  { name: "tokenLimit / charLimit", type: "number", note: "0 disables the per-entry limit check." },
  { name: "color", type: "enum", note: `One of ${ENTRY_COLOR_VALUES.map((value) => value || "(none)").join(", ")}.` },
  { name: "extensions", type: "object", note: "Source id plus preserved unknown fields (I-2)." },
  { name: "createdAt / updatedAt", type: "number", note: "Epoch milliseconds." }
];

const CARD_FIELDS = [
  { name: "id", type: "string", note: "Stable `card_` id, never reused (A-5)." },
  { name: "name / personality / scenario", type: "string", note: "Core character fields." },
  { name: "firstMessage", type: "string", note: "Maps to card `first_mes`." },
  { name: "alternateGreetings", type: "string[]", note: "Maps to `alternate_greetings`." },
  { name: "exampleMessages", type: "string", note: "Maps to `mes_example`." },
  { name: "systemPrompt / postHistoryInstructions", type: "string", note: "Prompt overrides." },
  { name: "creator / creatorNotes / characterVersion", type: "string", note: "Credit fields." },
  { name: "tags", type: "string[]", note: "Card tags; round-trip through containers." },
  { name: "avatarDataUrl", type: "string", note: "Imported image bytes; never painted (G-16)." },
  { name: "bookId", type: "string | null", note: "A linked lorebook; optional." }
];

const SECTIONS = [
  { id: "project", title: "Project", fields: PROJECT_FIELDS },
  { id: "book", title: "Book", fields: BOOK_FIELDS },
  { id: "entry", title: "Entry", fields: ENTRY_FIELDS },
  { id: "card", title: "Card", fields: CARD_FIELDS }
];

export function buildSchemaPage() {
  return {
    version: SCHEMA_VERSION,
    sections: SECTIONS.map((section) => ({ ...section, fields: section.fields.map((field) => ({ ...field })) }))
  };
}

export function schemaPageFieldNames() {
  return SECTIONS.map((section) => ({
    id: section.id,
    fields: section.fields.map((field) => field.name)
  }));
}
