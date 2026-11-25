import { diffProjects } from "./diff.js";

function normalizeName(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

/** Find the version of `card` inside a snapshot: the same id, else the only card with the same name. */
export function matchCardInProject(project, card) {
  const cards = Array.isArray(project?.cards) ? project.cards : [];
  const byId = cards.find((item) => item.id === card.id);

  if (byId) {
    return byId;
  }

  const name = normalizeName(card.name);

  if (!name) {
    return null;
  }

  const byName = cards.filter((item) => normalizeName(item.name) === name);
  return byName.length === 1 ? byName[0] : null;
}

/** How a snapshot's version of a card differs from the current one: field labels plus the diff. */
export function compareCardVersion(current, past) {
  const diff = diffProjects({ books: [], cards: [past] }, { books: [], cards: [current] });
  const changes = diff.cards[0]?.changes ?? [];

  return {
    same: changes.length === 0,
    labels: changes.map((change) => change.label),
    diff
  };
}

/** The editable fields a restore copies back; identity, link and timestamps stay with the live card. */
export function cardRestorePatch(past) {
  const { id, createdAt, updatedAt, bookId, ...fields } = past;
  void id;
  void createdAt;
  void updatedAt;
  void bookId;
  return structuredClone(fields);
}

/** Fields a card template carries; the name, picture and lorebook link are never templated. */
const TEMPLATE_FIELDS = [
  "description",
  "personality",
  "scenario",
  "firstMessage",
  "alternateGreetings",
  "groupOnlyGreetings",
  "exampleMessages",
  "systemPrompt",
  "postHistoryInstructions",
  "creatorNotes",
  "tags",
  "talkativeness",
  "depthPrompt"
];

export function cardTemplateFromCard(card) {
  const patch = {};

  for (const field of TEMPLATE_FIELDS) {
    patch[field] = structuredClone(card[field]);
  }

  return patch;
}
