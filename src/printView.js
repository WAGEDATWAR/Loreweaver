/**
 * The print view. Pure: it produces the rows a stylesheet lays out on paper. Nothing here touches the
 * DOM, so the export stays testable and the renderer stays thin.
 */
const CARD_PRINT_FIELDS = [
  ["description", "Description"],
  ["personality", "Personality"],
  ["scenario", "Scenario"],
  ["firstMessage", "First message"],
  ["exampleMessages", "Example messages"],
  ["systemPrompt", "System prompt"],
  ["postHistoryInstructions", "Post-history instructions"],
  ["creatorNotes", "Creator notes"]
];

/** The sections of a character card for paper, with token counts. */
export function buildCardPrint(card, { tokenCount = null, bookName = "" } = {}) {
  const count = (text) => {
    const measured = tokenCount ? tokenCount(text) : null;
    return Number.isFinite(measured) ? measured : Math.ceil(String(text ?? "").length / 4);
  };
  const sections = [];
  const add = (label, text) => {
    const value = String(text ?? "").trim();

    if (value) {
      sections.push({ label, text: value, tokens: count(value) });
    }
  };

  for (const [key, label] of CARD_PRINT_FIELDS.slice(0, 4)) {
    add(label, card[key]);
  }

  (card.alternateGreetings ?? []).forEach((greeting, index) => add(`Alternate greeting ${index + 1}`, greeting));
  (card.groupOnlyGreetings ?? []).forEach((greeting, index) => add(`Group-only greeting ${index + 1}`, greeting));

  for (const [key, label] of CARD_PRINT_FIELDS.slice(4)) {
    add(label, card[key]);
  }

  if (card.depthPrompt?.prompt?.trim()) {
    add(`Depth prompt (${card.depthPrompt.role}, depth ${card.depthPrompt.depth})`, card.depthPrompt.prompt);
  }

  return {
    name: card.name?.trim() || "Untitled card",
    nickname: card.nickname?.trim() ?? "",
    tags: [...(card.tags ?? [])],
    linkedBook: bookName,
    creator: [card.creator, card.characterVersion].map((value) => value?.trim()).filter(Boolean).join(" \u00b7 "),
    totalTokens: sections.reduce((total, section) => total + section.tokens, 0),
    sections
  };
}

export function buildPrintRows(book, { tokenCount = null } = {}) {
  const entries = book?.entries ?? [];
  const rows = [];

  for (const entry of entries) {
    const measured = tokenCount ? tokenCount(entry.content) : null;
    const tokens = Number.isFinite(measured) ? measured : Math.ceil(String(entry.content ?? "").length / 4);

    rows.push({
      title: entry.title.trim() || "Untitled entry",
      keys: entry.keys.join(", "),
      secondaryKeys: entry.selective && entry.secondaryKeys.length ? entry.secondaryKeys.join(", ") : "",
      content: String(entry.content ?? ""),
      notes: String(entry.notes ?? ""),
      enabled: entry.enabled,
      constant: entry.constant === true,
      order: entry.order,
      tokens
    });
  }

  return {
    bookName: book?.name?.trim() || "Untitled Lorebook",
    description: String(book?.description ?? "").trim(),
    totalEntries: entries.length,
    totalTokens: rows.reduce((total, row) => total + row.tokens, 0),
    rows
  };
}
