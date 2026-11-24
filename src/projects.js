import { buildCardTokenReport } from "./cardTokens.js";

export const PROJECT_KINDS = Object.freeze(["all", "book", "card"]);
export const PROJECT_SORTS = Object.freeze(["updated", "name", "size"]);

/** Books larger than this skip the issue count on the library so rendering it stays instant. */
export const ISSUE_COUNT_ENTRY_LIMIT = 500;

function bookName(book) {
  return book.name.trim() || "Untitled Lorebook";
}

function cardName(card) {
  return card.name.trim() || "Untitled card";
}

/**
 * Turn a project's lorebooks and character cards into library items of one shape. `estimate(text)` returns a
 * token estimate; `countBookIssues(book)` and `countCardIssues(card)` return counts or null.
 */
export function buildProjectItems(project, { estimate, countBookIssues = () => null, countCardIssues = () => null }) {
  const books = Array.isArray(project?.books) ? project.books : [];
  const cards = Array.isArray(project?.cards) ? project.cards : [];
  const bookById = new Map(books.map((book) => [book.id, book]));

  const bookItems = books.map((book) => {
    const enabled = book.entries.filter((entry) => entry.enabled);

    return {
      kind: "book",
      id: book.id,
      name: bookName(book),
      description: book.description,
      tags: [...book.tags],
      entries: book.entries.length,
      enabledEntries: enabled.length,
      tokens: enabled.reduce((total, entry) => total + estimate(entry.content), 0),
      budget: book.tokenBudget,
      issues: book.entries.length <= ISSUE_COUNT_ENTRY_LIMIT ? countBookIssues(book) : null,
      updatedAt: book.updatedAt
    };
  });

  const cardItems = cards.map((card) => ({
    kind: "card",
    id: card.id,
    name: cardName(card),
    nickname: card.nickname,
    description: card.description,
    tags: [...card.tags],
    tokens: buildCardTokenReport(card, estimate).total,
    linkedBook: card.bookId ? (bookById.get(card.bookId) ? bookName(bookById.get(card.bookId)) : "Linked lorebook missing") : "",
    avatarDataUrl: card.avatarDataUrl,
    issues: countCardIssues(card),
    updatedAt: card.updatedAt
  }));

  return [...bookItems, ...cardItems];
}

export function filterProjects(items, { query = "", kind = "all" } = {}) {
  const needle = query.trim().toLowerCase();

  return items.filter((item) => {
    if (kind !== "all" && item.kind !== kind) {
      return false;
    }

    if (!needle) {
      return true;
    }

    return [item.name, item.nickname ?? "", item.description ?? "", item.linkedBook ?? "", ...item.tags]
      .some((field) => field.toLowerCase().includes(needle));
  });
}

export function sortProjects(items, mode = "updated") {
  const copy = [...items];

  if (mode === "name") {
    return copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  if (mode === "size") {
    return copy.sort((a, b) => b.tokens - a.tokens || a.name.localeCompare(b.name));
  }

  return copy.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
}
