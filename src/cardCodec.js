import { DEPTH_PROMPT_ROLES, createCard } from "./schema.js";
import { isRecord } from "./formats/helpers.js";

export const CARD_SPEC = "chara_card_v3";
export const LEGACY_CARD_SPEC = "chara_card_v2";
export const CARD_SPECS = Object.freeze({ v3: CARD_SPEC, v2: LEGACY_CARD_SPEC });

export const CARD_FIELDS = Object.freeze({
  name: "name",
  description: "description",
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

const V3_ONLY_KEYS = Object.freeze([
  "nickname",
  "group_only_greetings",
  "assets",
  "source",
  "creator_notes_multilingual",
  "creation_date",
  "modification_date"
]);

const KNOWN_KEYS = new Set([
  "spec",
  "spec_version",
  "data",
  ...Object.values(CARD_FIELDS),
  "alternate_greetings",
  "group_only_greetings",
  "nickname",
  "tags",
  "character_book",
  "extensions",
  "avatar"
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

function readAvatar(value) {
  return typeof value === "string" && /^data:image\/[a-z0-9.+-]+;base64,/i.test(value) ? value : "";
}

function readTalkativeness(value) {
  const number = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : undefined;
}

function looksLikeFlatCard(input) {
  return typeof input.name === "string"
    && ["first_mes", "personality", "scenario", "mes_example"].some((key) => typeof input[key] === "string");
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
    return { ok: false, reason: "not-a-card" };
  }

  if (isRecord(input.data) && looksLikeFlatCard(input.data)) {
    return { ok: true, spec: CARD_SPEC, wrapped: true, guessed: true };
  }

  if (looksLikeFlatCard(input)) {
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

  if (!readString(body.name).trim()) {
    warnings.push("This card has no name.");
  }

  if (!readString(body.first_mes).trim()) {
    warnings.push("This card has no first message.");
  }

  if (detection.guessed) {
    warnings.push("The card has no spec marker; it was read as a V3 card by its fields.");
  }

  if (!detection.wrapped) {
    warnings.push("This is a flat V1-style card; it is upgraded to V3 on export.");
  }

  return { ok: true, raw: input, body, warnings, spec: detection.spec, wrapped: detection.wrapped };
}

export function parseCard(input) {
  const validation = input?.ok === true && input.body ? input : validateCard(input);

  if (!validation.ok) {
    return validation;
  }

  const { body } = validation;
  const warnings = [...validation.warnings];
  const cardExtensions = isRecord(body.extensions) ? structuredClone(body.extensions) : {};
  const depth = isRecord(cardExtensions.depth_prompt) ? cardExtensions.depth_prompt : null;
  const talkativeness = readTalkativeness(cardExtensions.talkativeness);
  const sourceFields = collectUnknown(body);
  const outerAvatar = validation.wrapped && isRecord(validation.raw) ? readAvatar(validation.raw.avatar) : "";

  if (isRecord(body.character_book)) {
    warnings.push("The card carries an embedded lorebook; import it separately.");
  }

  const card = createCard({
    name: readString(body.name),
    nickname: readString(body.nickname),
    description: readString(body.description),
    personality: readString(body.personality),
    scenario: readString(body.scenario),
    firstMessage: readString(body.first_mes),
    alternateGreetings: readStringList(body.alternate_greetings),
    groupOnlyGreetings: readStringList(body.group_only_greetings),
    exampleMessages: readString(body.mes_example),
    systemPrompt: readString(body.system_prompt),
    postHistoryInstructions: readString(body.post_history_instructions),
    creator: readString(body.creator),
    creatorNotes: readString(body.creator_notes),
    characterVersion: readString(body.character_version),
    tags: readStringList(body.tags),
    talkativeness,
    depthPrompt: depth
      ? { prompt: readString(depth.prompt), depth: depth.depth, role: DEPTH_PROMPT_ROLES.includes(depth.role) ? depth.role : "system" }
      : undefined,
    avatarDataUrl: readAvatar(body.avatar) || outerAvatar,
    extensions: {
      spec: validation.spec,
      cardExtensions,
      sourceFields
    }
  });

  return { ok: true, card, warnings };
}

function buildExtensions(card) {
  const extensions = isRecord(card.extensions?.cardExtensions) ? structuredClone(card.extensions.cardExtensions) : {};
  const depth = card.depthPrompt ?? { prompt: "", depth: 4, role: "system" };

  if (depth.prompt.trim() || isRecord(extensions.depth_prompt)) {
    extensions.depth_prompt = { prompt: depth.prompt, depth: depth.depth, role: depth.role };
  }

  if (Number.isFinite(card.talkativeness) && (card.talkativeness !== 0.5 || "talkativeness" in extensions)) {
    extensions.talkativeness = card.talkativeness;
  }

  return extensions;
}

/**
 * Serialize a card to a V3 (default) or V2 payload. `characterBook` is an already-serialized character_book
 * object. V3-only fields are dropped from a V2 payload; `cardLossWarnings` reports them.
 */
export function serializeCard(card, { spec = "v3", characterBook = null, now = Date.now() } = {}) {
  const sourceFields = isRecord(card.extensions?.sourceFields) ? { ...card.extensions.sourceFields } : {};
  const data = {
    name: card.name,
    description: card.description ?? "",
    personality: card.personality,
    scenario: card.scenario,
    first_mes: card.firstMessage,
    mes_example: card.exampleMessages,
    creator_notes: card.creatorNotes,
    system_prompt: card.systemPrompt,
    post_history_instructions: card.postHistoryInstructions,
    alternate_greetings: [...(card.alternateGreetings ?? [])],
    tags: [...(card.tags ?? [])],
    creator: card.creator,
    character_version: card.characterVersion,
    extensions: buildExtensions(card),
    ...sourceFields
  };

  if (characterBook) {
    data.character_book = characterBook;
  }

  if (spec === "v2") {
    for (const key of V3_ONLY_KEYS) {
      delete data[key];
    }

    return { spec: LEGACY_CARD_SPEC, spec_version: "2.0", data };
  }

  data.nickname = card.nickname ?? "";
  data.group_only_greetings = [...(card.groupOnlyGreetings ?? [])];
  data.creation_date = Number.isFinite(sourceFields.creation_date) ? sourceFields.creation_date : Math.floor(card.createdAt / 1000 || now / 1000);
  data.modification_date = Math.floor(now / 1000);

  return { spec: CARD_SPEC, spec_version: "3.0", data };
}

export function cardLossWarnings(card, spec = "v3") {
  if (spec !== "v2") {
    return [];
  }

  const sourceFields = isRecord(card.extensions?.sourceFields) ? card.extensions.sourceFields : {};
  const dropped = [];

  if (card.nickname) {
    dropped.push("nickname");
  }

  if ((card.groupOnlyGreetings ?? []).length) {
    dropped.push("group-only greetings");
  }

  for (const key of ["assets", "source", "creator_notes_multilingual"]) {
    if (key in sourceFields) {
      dropped.push(key.replace(/_/g, " "));
    }
  }

  return dropped.length ? [`The V2 card format has no place for: ${dropped.join(", ")}. They are left out of this export.`] : [];
}
