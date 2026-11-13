/**
 * The print view. Pure: it produces the rows a stylesheet lays out on paper. Nothing here touches the
 * DOM, so the export stays testable and the renderer stays thin.
 */
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
