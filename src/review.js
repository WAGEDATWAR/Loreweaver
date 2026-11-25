import { CARD_PERMANENT_WARN_TOKENS, buildCardTokenReport } from "./cardTokens.js";
import { validateCardRecord } from "./cardValidation.js";
import { buildBookOverview } from "./overview.js";
import { validateBook } from "./validation.js";

export const CARD_FIELD_TARGETS = Object.freeze({
  name: "card-name",
  description: "card-description",
  personality: "card-personality",
  scenario: "card-scenario",
  firstMessage: "card-first-message",
  alternateGreetings: "card-alt-add",
  exampleMessages: "card-example-messages",
  systemPrompt: "card-system-prompt",
  postHistoryInstructions: "card-post-history",
  bookId: "card-link-book",
  depthPrompt: "card-depth-prompt"
});

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };

/** One review shape for a lorebook: the overview figures plus its validation issues. */
export function buildBookReview(book, { count, contextWindow = 0 }) {
  const overview = buildBookOverview(book, count);
  const issues = validateBook(book, count);
  const used = overview.enabledTotals.tokens;

  return {
    kind: "book",
    overview,
    issues,
    budget: book.tokenBudget > 0 ? { limit: book.tokenBudget, used, over: used > book.tokenBudget } : null,
    context: contextWindow > 0 ? { limit: contextWindow, used, over: used > contextWindow } : null
  };
}

/** One review shape for a card: sent-every-turn, examples and opening buckets, plus its checks. */
export function buildCardReview(card, { count, bookExists = () => true }) {
  const tokens = buildCardTokenReport(card, count);
  const issues = validateCardRecord(card, { bookExists, count })
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return {
    kind: "card",
    tokens,
    issues,
    permanentLimit: CARD_PERMANENT_WARN_TOKENS,
    permanentOver: tokens.always > CARD_PERMANENT_WARN_TOKENS
  };
}
