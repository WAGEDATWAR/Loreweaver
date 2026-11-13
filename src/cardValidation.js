import { CARD_PERMANENT_WARN_TOKENS, buildCardTokenReport } from "./cardTokens.js";

export const CARD_ISSUE_LABELS = Object.freeze({
  "missing-name": "Missing name",
  "missing-description": "Missing description",
  "missing-first-message": "Missing first message",
  "duplicate-greeting": "Duplicate greeting",
  "legacy-macro": "Legacy macro",
  "missing-example-start": "Example without <START>",
  "missing-book": "Linked lorebook missing",
  "heavy-permanent": "Heavy always-sent text",
  "bad-depth": "Invalid depth prompt",
  "orphan-depth-prompt": "Depth prompt has no text"
});

const LEGACY_MACRO = /<(user|bot|char)>/i;
const TEXT_FIELDS = [
  ["description", "Description"],
  ["personality", "Personality"],
  ["scenario", "Scenario"],
  ["firstMessage", "First message"],
  ["exampleMessages", "Example messages"],
  ["systemPrompt", "System prompt"],
  ["postHistoryInstructions", "Post-history instructions"]
];

/**
 * Check a card against what frontends expect. Returns issues of `{ code, severity, field, message }`;
 * severity is "error" (will not export), "warning" or "info". `bookExists(id)` and `count(text)` are
 * injected so this module stays pure.
 */
export function validateCardRecord(card, { bookExists = () => true, count = null } = {}) {
  const issues = [];
  const add = (code, severity, field, message) => issues.push({ code, severity, field, message });

  if (!card.name?.trim()) {
    add("missing-name", "error", "name", "Give the card a name; frontends list and export it by name.");
  }

  if (!card.description?.trim()) {
    add("missing-description", "warning", "description", "The description is the main character definition frontends send every turn; it is empty.");
  }

  if (!card.firstMessage?.trim()) {
    add("missing-first-message", "warning", "firstMessage", "Without a first message the chat opens blank.");
  }

  const seen = new Set();

  for (const greeting of [card.firstMessage ?? "", ...(card.alternateGreetings ?? [])]) {
    const key = greeting.trim();

    if (!key) {
      continue;
    }

    if (seen.has(key)) {
      add("duplicate-greeting", "warning", "alternateGreetings", "A greeting repeats another; swiping would show the same text twice.");
      break;
    }

    seen.add(key);
  }

  for (const [field, label] of TEXT_FIELDS) {
    if (LEGACY_MACRO.test(card[field] ?? "")) {
      add("legacy-macro", "info", field, `${label} uses <USER>/<BOT> style macros; {{user}} and {{char}} are what current frontends expect.`);
    }
  }

  if (card.exampleMessages?.trim() && !/<START>/i.test(card.exampleMessages)) {
    add("missing-example-start", "info", "exampleMessages", "Example messages usually start each conversation with <START> so frontends can separate them.");
  }

  if (card.bookId && !bookExists(card.bookId)) {
    add("missing-book", "warning", "bookId", "The linked lorebook no longer exists; relink or clear it.");
  }

  const depth = card.depthPrompt;

  if (depth) {
    if (!Number.isInteger(depth.depth) || depth.depth < 0) {
      add("bad-depth", "warning", "depthPrompt", "The depth prompt depth must be zero or more.");
    }

    if (!depth.prompt?.trim() && (depth.depth !== 4 || depth.role !== "system")) {
      add("orphan-depth-prompt", "info", "depthPrompt", "The depth prompt has settings but no text, so it is not exported.");
    }
  }

  if (count) {
    const report = buildCardTokenReport(card, count);

    if (report.always > CARD_PERMANENT_WARN_TOKENS) {
      add("heavy-permanent", "warning", "description", `About ${report.always} tokens are sent every turn (advised limit ${CARD_PERMANENT_WARN_TOKENS}); long definitions crowd out the chat.`);
    }
  }

  return issues;
}
