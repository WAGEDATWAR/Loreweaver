import { createCard } from "./schema.js";
import { isRecord } from "./formats/helpers.js";

export const CARD_SPEC = "chara_card_v3";
export const LEGACY_CARD_SPEC = "chara_card_v2";

export const CARD_FIELDS = Object.freeze({
  name: "name",
  personality: "personality",
  scenario: "scenario",
  firstMessage: "first_mes",
  exampleMessages: "mes_example",
  systemPrompt: "system_prompt",
  postHistoryInstructions: "post_history_instructions",
  creator: "creator",
  creatorNotes: "creator_notes",
  characterVersion: "character_version"
});

const KNOWN_KEYS = new Set([
  "spec",
  "spec_version",
  "data",
  ...Object.values(CARD_FIELDS),
  "alternate_greetings",
  "tags",
  "character_book",
  "avatar",
  "extensions",
  "create_date"
]);

function readString(value) {
  return typeof value === "string" ? value : "";
}

function readStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item)).filter(Boolean);
}

function collectUnknown(source) {
  const unknown = {};

  for (const [key, value] of Object.entries(source)) {
    if (!KNOWN_KEYS.has(key)) {
      unknown[key] = value;
    }
  }

  return unknown;
}

export function detectCardSpec(input) {
  if (!isRecord(input)) {
    return { ok: false, reason: "not-an-object" };
  }

  const isWrapped = isRecord(input.data) && (input.spec === CARD_SPEC || input.spec === LEGACY_CARD_SPEC);

  if (isWrapped) {
    return { ok: true, spec: input.spec, wrapped: true };
  }

  if (typeof input.spec === "string" && input.spec.startsWith("chara_card")) {
    return { ok: false, reason: "unknown-spec", spec: input.spec };
  }

  if (typeof input.spec === "string" && input.spec !== "lorebook_v3") {
    // A lorebook_v3 wrapper is a book, not a card.
    return { ok: false, reason: "not-a-card" };
  }

  if (isRecord(input.data) && (typeof input.data.first_mes === "string" || typeof input.data.personality === "string")) {
    return { ok: true, spec: CARD_SPEC, wrapped: true, guessed: true };
  }

  if (typeof input.name === "string" && (typeof input.first_mes === "string" || typeof input.personality === "string")) {
    return { ok: true, spec: LEGACY_CARD_SPEC, wrapped: false };
  }

  return { ok: false, reason: "not-a-card" };
}

export function validateCard(input) {
  const detection = detectCardSpec(input);

  if (!detection.ok) {
    return {
      ok: false,
      error: detection.reason === "not-a-card"
        ? "That JSON file doesn't look like a character card."
        : "That character card uses an unknown spec.",
      warnings: []
    };
  }

  const body = detection.wrapped ? input.data : input;
  const warnings = [];
  const name = readString(body.name).trim();

  if (!name) {
    warnings.push("This card has no name.");
  }

  if (!readString(body.first_mes).trim()) {
    warnings.push("This card has no first message.");
  }

  if (detection.guessed) {
    warnings.push("The card has no spec marker; it was read as a V3 card by its fields.");
  }

  return { ok: true, body, warnings, spec: detection.spec };
}

export function parseCard(input) {
  const validation = validateCard(input);

  if (!validation.ok) {
    return validation;
  }

  const { body } = validation;
  const greetingList = readStringList(body.alternate_greetings);
  const warnings = [...validation.warnings];

  if (isRecord(body.character_book)) {
    warnings.push("The card carries an embedded lorebook; import it separately.");
  }

  const card = createCard({
    name: readString(body.name),
    personality: readString(body.personality),
    scenario: readString(body.scenario),
    firstMessage: readString(body.first_mes),
    alternateGreetings: greetingList,
    exampleMessages: readString(body.mes_example),
    systemPrompt: readString(body.system_prompt),
    postHistoryInstructions: readString(body.post_history_instructions),
    creator: readString(body.creator),
    creatorNotes: readString(body.creator_notes),
    characterVersion: readString(body.character_version),
    tags: readStringList(body.tags),
    avatarDataUrl: readString(body.avatar),
    extensions: {
      spec: validation.spec,
      sourceFields: collectUnknown(body)
    }
  });

  return { ok: true, card, warnings };
}

export function serializeCard(card) {
  const data = {
    name: card.name,
    personality: card.personality,
    scenario: card.scenario,
    first_mes: card.firstMessage,
    mes_example: card.exampleMessages,
    system_prompt: card.systemPrompt,
    post_history_instructions: card.postHistoryInstructions,
    creator: card.creator,
    creator_notes: card.creatorNotes,
    character_version: card.characterVersion,
    alternate_greetings: [...(card.alternateGreetings ?? [])],
    tags: [...(card.tags ?? [])],
    ...(isRecord(card.extensions?.sourceFields) ? card.extensions.sourceFields : {})
  };

  return {
    spec: CARD_SPEC,
    spec_version: "3.0",
    data,
    ...(card.avatarDataUrl ? { avatar: card.avatarDataUrl } : {})
  };
}
