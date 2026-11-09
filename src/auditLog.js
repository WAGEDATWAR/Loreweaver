export const AUDIT_LIMIT = 10;
export const AUDIT_KEY = "import-audit:v1";

export function summarizeAudit(entry) {
  const parts = [];

  if (entry.books) {
    parts.push(`${entry.books} ${entry.books === 1 ? "book" : "books"}`);
  }

  if (entry.entries) {
    parts.push(`${entry.entries} ${entry.entries === 1 ? "entry" : "entries"}`);
  }

  if (entry.cards) {
    parts.push(`${entry.cards} ${entry.cards === 1 ? "card" : "cards"}`);
  }

  return parts.join(", ") || "no content";
}

export function recordAudit(existing, record, { limit = AUDIT_LIMIT, now = Date.now() } = {}) {
  const prior = Array.isArray(existing) ? existing : [];
  const next = [{
    at: now,
    file: String(record.file ?? "").slice(0, 120),
    format: String(record.format ?? "").slice(0, 60),
    books: record.books ?? 0,
    entries: record.entries ?? 0,
    cards: record.cards ?? 0,
    strategy: String(record.strategy ?? "").slice(0, 20),
    warnings: Number.isFinite(record.warnings) ? record.warnings : 0
  }, ...prior];

  return next.slice(0, limit);
}

export function formatAudit(records) {
  const list = Array.isArray(records) ? records : [];

  if (!list.length) {
    return "Nothing imported in this browser yet.";
  }

  const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

  return list.map((entry) => (
    `${formatter.format(entry.at)} \u00b7 ${entry.file} \u00b7 ${entry.format} \u00b7 ${summarizeAudit(entry)}`
  )).join("\n");
}
